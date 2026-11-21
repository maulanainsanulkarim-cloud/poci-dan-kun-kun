import { resolveSpeakerToCharacterId } from '../data/characters';
import {
  AudioSlotData,
  CharacterProfile,
  DialogueLine,
  EpisodeConfig,
  PopupColor,
  SceneConfig,
} from '../types/studio';
import {
  drawBackgroundScene,
  drawLightingOverlay,
  drawVolumetricStageDepth,
  drawWeatherParticles,
} from './backgrounds';
import { drawArticulatedCharacter } from './characterRenderer';
import {
  CharacterSpringRig,
  createCharacterSpringRig,
  evaluateCharacterMotion,
} from './ikPhysics';
import {
  detectStoryPropsFromScript,
  drawScriptStoryProps,
  evaluateScriptChoreography,
} from './scriptChoreographer';

const defaultRigPool = new Map<string, CharacterSpringRig>();

function getSpringRig(
  charId: string,
  pool: Map<string, CharacterSpringRig> = defaultRigPool
): CharacterSpringRig {
  let rig = pool.get(charId);
  if (!rig) {
    rig = createCharacterSpringRig();
    pool.set(charId, rig);
  }
  return rig;
}

export interface CompositorOptions {
  episode: EpisodeConfig;
  characters: CharacterProfile[];
  audioSlots: [AudioSlotData, AudioSlotData, AudioSlotData, AudioSlotData];
  globalTime: number; // 0..60
  showWatermark: boolean;
  cameraAutoZoom: boolean;
  rigPoolOverride?: Map<string, CharacterSpringRig>;
}

export function renderStudioFrame(
  ctx: CanvasRenderingContext2D,
  options: CompositorOptions
) {
  const W = 1080;
  const H = 1920;
  const GROUND_Y = 1275;

  const {
    episode,
    characters,
    audioSlots,
    globalTime,
    showWatermark,
    cameraAutoZoom,
    rigPoolOverride,
  } = options;
  const activePool = rigPoolOverride ?? defaultRigPool;

  const clampedTime = Math.max(0, Math.min(59.999, globalTime));
  const sceneIndex = Math.min(3, Math.floor(clampedTime / 15)) as 0 | 1 | 2 | 3;
  const sceneTime = clampedTime - sceneIndex * 15;
  const scene: SceneConfig = episode.scenes[sceneIndex];
  const slot = audioSlots[sceneIndex];
  const envelope = slot?.buffer ? slot.envelope30Fps : null;
  const dubbingOffset = scene.dubbingOffsetSec ?? 0;
  const audioSampleTime = Math.max(0, sceneTime - dubbingOffset);

  // Determine active dialogue line (already aligned to audio when MP3 is present)
  const activeDialogue: DialogueLine | null =
    scene.dialogues.find((d) => sceneTime >= d.startSec && sceneTime <= d.endSec) ?? null;

  const activeSpeakerId = activeDialogue
    ? resolveSpeakerToCharacterId(activeDialogue.speaker)
    : null;

  // Cast positions across stage (1..4 characters)
  const castIds = scene.cast.length > 0 ? scene.cast.slice(0, 4) : ['poci', 'kunkun'];
  const stageAnchors = computeStageAnchors(castIds.length, W);
  const speakerIdx = activeSpeakerId ? castIds.indexOf(activeSpeakerId) : -1;

  // Script-driven Choreography (reads live edited visualDesc + dialogues!)
  const choreographyMap = evaluateScriptChoreography(
    scene,
    castIds,
    stageAnchors,
    sceneTime,
    activeDialogue,
    activeSpeakerId,
    speakerIdx
  );

  // Speaker world X for cinematic 2.5D camera pan/zoom
  const speakerChoreo = activeSpeakerId ? choreographyMap.get(activeSpeakerId) : undefined;
  const targetFocusX = speakerChoreo
    ? speakerChoreo.x
    : speakerIdx >= 0
    ? stageAnchors[speakerIdx].x
    : W / 2;

  // Camera transform (Zoom + Pan + Shock Shake)
  let camZoom = 1.0;
  let camOffsetX = 0;
  let camOffsetY = 0;

  if (cameraAutoZoom && scene.cameraAction !== 'wide') {
    if (
      scene.cameraAction === 'zoom_speaker' ||
      (scene.cameraAction === 'auto' && speakerIdx >= 0)
    ) {
      camZoom = 1.09 + 0.03 * Math.sin(sceneTime * 0.8);
      camOffsetX = (W / 2 - targetFocusX) * 0.28;
      camOffsetY = -28;
    } else if (scene.cameraAction === 'slow_pan') {
      camZoom = 1.06;
      camOffsetX = Math.sin(sceneTime * 0.42) * 45;
    }
  }

  // Camera Shake on shock/gavel/dramatic_shake
  const isShockBeat =
    activeDialogue?.actionCue === 'shock' ||
    activeDialogue?.actionCue === 'gavel_slam' ||
    activeDialogue?.actionCue === 'plank' ||
    scene.cameraAction === 'dramatic_shake';
  const shakeAmt = isShockBeat ? Math.max(4, scene.cameraShakeIntensity * 18) : 0;
  const shakeX = shakeAmt > 0 ? Math.sin(clampedTime * 57) * shakeAmt : 0;
  const shakeY = shakeAmt > 0 ? Math.cos(clampedTime * 71) * shakeAmt * 0.7 : 0;

  ctx.save();
  ctx.clearRect(0, 0, W, H);

  // Transition transform (slide_left / zoom_whip)
  const transDur = 0.45;
  const transProgress = Math.min(1, sceneTime / transDur);
  const easeOut = 1 - Math.pow(1 - transProgress, 3);

  if (scene.transitionIn === 'slide_left' && transProgress < 1) {
    ctx.translate((1 - easeOut) * W * 0.35, 0);
  } else if (scene.transitionIn === 'zoom_whip' && transProgress < 1) {
    const z = 1.25 - 0.25 * easeOut;
    ctx.translate(W / 2, H / 2);
    ctx.scale(z, z);
    ctx.translate(-W / 2, -H / 2);
  }

  // 1. Far Background Layer with 2.5D parallax (moves slightly slower than foreground!)
  ctx.save();
  ctx.translate(W / 2 + camOffsetX * 0.65 + shakeX * 0.7, H / 2 + camOffsetY * 0.7 + shakeY * 0.7);
  ctx.scale(1.04 + (camZoom - 1) * 0.55, 1.04 + (camZoom - 1) * 0.55);
  ctx.translate(-W / 2, -H / 2);
  drawBackgroundScene(
    ctx,
    W,
    H,
    GROUND_Y,
    scene.backgroundId,
    scene.customBackgroundUrl,
    clampedTime,
    sceneTime
  );
  ctx.restore();

  // Apply Cinematic Foreground Camera (Characters + Midground Props)
  ctx.translate(W / 2 + camOffsetX + shakeX, H / 2 + camOffsetY + shakeY);
  ctx.scale(camZoom, camZoom);
  ctx.translate(-W / 2, -H / 2);

  // 2. Script-matched Animated Story Props Layer
  const storyProps = detectStoryPropsFromScript(scene);
  drawScriptStoryProps(ctx, storyProps, W, GROUND_Y, sceneTime);

  // 3. Characters Layer (3D Volumetric Rigs)
  const windStrength =
    scene.weather === 'rain' || scene.lighting === 'storm'
      ? 1.4
      : scene.weather === 'petals' || scene.weather === 'ash'
      ? 0.8
      : 0.25;

  castIds.forEach((cid, idx) => {
    const profile = characters.find((c) => c.id === cid) ?? characters[0];
    if (!profile) return;

    const rig = getSpringRig(cid, activePool);
    const choreo = choreographyMap.get(cid) ?? {
      ...stageAnchors[idx],
      actionCue: 'idle' as const,
      lookDir: 0,
    };
    const isSpeaking = activeSpeakerId === cid;

    // Only sample envelope if audio is actually active (sceneTime >= dubbingOffset)
    const activeEnvelope = sceneTime >= dubbingOffset ? envelope : null;

    const pose = evaluateCharacterMotion(
      rig,
      cid,
      profile.motionEnergy,
      clampedTime,
      audioSampleTime,
      isSpeaking,
      choreo.actionCue,
      activeEnvelope,
      activeDialogue,
      choreo.lookDir,
      windStrength,
      idx * 1.37 + 0.5
    );

    drawArticulatedCharacter(
      ctx,
      profile,
      pose,
      choreo.x,
      GROUND_Y + choreo.yOffset,
      choreo.scale,
      clampedTime
    );
  });

  // 4. 3D Volumetric Beams, Bokeh Depth, Weather & Lighting Grade
  drawVolumetricStageDepth(ctx, W, H, clampedTime, camOffsetX);
  drawWeatherParticles(ctx, W, H, GROUND_Y, scene.weather, clampedTime);
  drawLightingOverlay(ctx, W, H, scene.lighting, clampedTime);

  ctx.restore(); // Exit camera space for crisp UI overlays (Subtitles, Popups, Watermark)

  // 5. Optional Series Watermark (Top Left)
  if (showWatermark && episode.watermarkText.trim()) {
    ctx.save();
    ctx.fillStyle = 'rgba(9, 9, 11, 0.58)';
    ctx.beginPath();
    ctx.roundRect(48, 56, 405, 62, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#F59E0B';
    ctx.font = '800 22px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(episode.watermarkText.toUpperCase(), 72, 95);

    ctx.fillStyle = '#A1A1AA';
    ctx.font = '600 18px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(
      `EP ${String(episode.episodeNumber).padStart(2, '0')} · S${scene.sceneNumber}`,
      W - 54,
      93
    );
    ctx.restore();
  }

  // 6. Pop-Up UI Banner / Stamp
  const popupStart = scene.popup.startSec ?? 1.8;
  const popupEnd = scene.popup.endSec ?? 12.5;
  if (scene.popup.text && sceneTime >= popupStart && sceneTime <= popupEnd) {
    const enterP = Math.min(1, (sceneTime - popupStart) / 0.25);
    const scalePop = 0.8 + 0.2 * Math.sin(enterP * Math.PI * 0.5);
    drawPopupBanner(
      ctx,
      W,
      scene.popup.text,
      scene.popup.color,
      scalePop,
      scene.popup.color === 'stamp'
    );
  }

  // 7. Optional AI Director Info Card Pop-Up
  if (scene.infoCard && scene.infoCard.title) {
    const cStart = scene.infoCard.startSec ?? 1.5;
    const cEnd = scene.infoCard.endSec ?? 11.0;
    if (sceneTime >= cStart && sceneTime <= cEnd) {
      drawInfoCardOverlay(ctx, W, scene.infoCard.title, scene.infoCard.body);
    }
  }

  // 8. 4-second "ARSIP KELAM INDIS" Editorial Box (Scene 4 or AI triggered)
  if (scene.arsipBoxText && sceneTime >= 3.5 && sceneTime <= 9.2) {
    drawArsipKelamBox(ctx, W, scene.arsipBoxText);
  }

  // 9. Dynamic Bottom-Center Subtitle (Safe Zone above TikTok/Reels controls)
  if (activeDialogue) {
    drawDynamicSubtitle(ctx, W, activeDialogue);
  }

  // 10. Scene Transition Overlay (Fade / Flash White)
  if (transProgress < 1) {
    if (scene.transitionIn === 'flash_white') {
      ctx.fillStyle = `rgba(255, 255, 255, ${(1 - transProgress).toFixed(3)})`;
      ctx.fillRect(0, 0, W, H);
    } else if (scene.transitionIn === 'fade') {
      ctx.fillStyle = `rgba(9, 9, 11, ${(1 - transProgress).toFixed(3)})`;
      ctx.fillRect(0, 0, W, H);
    }
  }
}

function computeStageAnchors(count: number, w: number) {
  if (count === 1) {
    return [{ x: w * 0.5, yOffset: 0, scale: 1.45 }];
  }
  if (count === 2) {
    return [
      { x: w * 0.31, yOffset: 0, scale: 1.32 },
      { x: w * 0.69, yOffset: 10, scale: 1.32 },
    ];
  }
  if (count === 3) {
    return [
      { x: w * 0.22, yOffset: 8, scale: 1.18 },
      { x: w * 0.51, yOffset: -12, scale: 1.24 },
      { x: w * 0.8, yOffset: 10, scale: 1.18 },
    ];
  }
  return [
    { x: w * 0.17, yOffset: 10, scale: 1.06 },
    { x: w * 0.39, yOffset: -12, scale: 1.12 },
    { x: w * 0.61, yOffset: -8, scale: 1.12 },
    { x: w * 0.83, yOffset: 12, scale: 1.06 },
  ];
}

function drawPopupBanner(
  ctx: CanvasRenderingContext2D,
  w: number,
  text: string,
  color: PopupColor,
  scale: number,
  isStamp: boolean
) {
  ctx.save();
  if (isStamp) {
    ctx.translate(w / 2, 540);
    ctx.rotate(-0.12);
    ctx.scale(scale, scale);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 10;
    ctx.fillStyle = 'rgba(127, 29, 29, 0.86)';
    ctx.beginPath();
    ctx.roundRect(-290, -72, 580, 144, 18);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fef2f2';
    ctx.font = '800 44px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text.slice(0, 26), 0, 16);
    ctx.restore();
    return;
  }

  const palette: Record<
    Exclude<PopupColor, 'stamp'>,
    { bg: string; border: string; fg: string }
  > = {
    red: { bg: 'rgba(153, 27, 27, 0.92)', border: '#f87171', fg: '#ffffff' },
    yellow: { bg: 'rgba(180, 83, 9, 0.94)', border: '#facc15', fg: '#fef9c3' },
    blue: { bg: 'rgba(30, 58, 138, 0.92)', border: '#60a5fa', fg: '#eff6ff' },
    green: { bg: 'rgba(6, 95, 70, 0.92)', border: '#34d399', fg: '#ecfdf5' },
  };
  const pal = palette[color as Exclude<PopupColor, 'stamp'>] ?? palette.yellow;

  ctx.translate(w / 2, 225);
  ctx.scale(scale, scale);

  ctx.fillStyle = pal.bg;
  ctx.strokeStyle = pal.border;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(-475, -52, 950, 104, 18);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = pal.fg;
  ctx.font = '800 30px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(text, 0, 10, 900);
  ctx.restore();
}

function drawInfoCardOverlay(
  ctx: CanvasRenderingContext2D,
  w: number,
  title: string,
  body: string
) {
  ctx.save();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(70, 320, w - 140, 185, 20);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#38bdf8';
  ctx.font = '800 24px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(title.toUpperCase(), 106, 372, w - 210);

  ctx.fillStyle = '#f8fafc';
  ctx.font = '500 26px "DM Sans", sans-serif';
  wrapCanvasText(ctx, body, 106, 422, w - 212, 36, 3);
  ctx.restore();
}

function drawArsipKelamBox(ctx: CanvasRenderingContext2D, w: number, text: string) {
  ctx.save();
  ctx.fillStyle = 'rgba(9, 9, 11, 0.92)';
  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(76, 305, w - 152, 220, 20);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#F59E0B';
  ctx.font = '800 24px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('ARSIP KELAM INDIS', w / 2, 355);

  ctx.fillStyle = '#f4f4f5';
  ctx.font = '600 29px "Plus Jakarta Sans", sans-serif';
  wrapCanvasText(ctx, `“${text}”`, w / 2, 412, w - 220, 40, 3, 'center');
  ctx.restore();
}

function drawDynamicSubtitle(
  ctx: CanvasRenderingContext2D,
  w: number,
  line: DialogueLine
) {
  ctx.save();
  const boxX = 56;
  const boxY = 1365;
  const boxW = w - 112;
  const boxH = 265;

  ctx.fillStyle = 'rgba(9, 9, 11, 0.84)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxW, boxH, 24);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#FFC400';
  ctx.font = '800 26px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(line.speaker.toUpperCase(), w / 2, boxY + 48);

  ctx.font = '700 36px "DM Sans", sans-serif';
  const words = line.text.split(/\s+/);
  const hlLower = line.highlightWords.map((hw) => hw.toLowerCase());

  const maxWidth = boxW - 88;
  const rows: string[][] = [];
  let currentRow: string[] = [];
  for (const word of words) {
    const testLine = [...currentRow, word].join(' ');
    if (ctx.measureText(testLine).width > maxWidth && currentRow.length > 0) {
      rows.push(currentRow);
      currentRow = [word];
    } else {
      currentRow.push(word);
    }
  }
  if (currentRow.length > 0) rows.push(currentRow);

  const visibleRows = rows.slice(0, 4);
  const startY = boxY + 104;
  const lineHeight = 46;

  visibleRows.forEach((rowWords, rIdx) => {
    const fullStr = rowWords.join(' ');
    const totalRowW = ctx.measureText(fullStr).width;
    let cursorX = w / 2 - totalRowW / 2;
    const y = startY + rIdx * lineHeight;

    rowWords.forEach((word, wIdx) => {
      const clean = word.toLowerCase().replace(/[.,!?"']/g, '');
      const isHighlight = hlLower.some(
        (hw) => hw.includes(clean) && clean.length >= 3
      );
      ctx.fillStyle = isHighlight ? '#FFC400' : '#F8FAFC';
      ctx.textAlign = 'left';
      ctx.fillText(word, cursorX, y);
      cursorX += ctx.measureText(word + (wIdx < rowWords.length - 1 ? ' ' : '')).width;
    });
  });

  ctx.restore();
}

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
  align: CanvasTextAlign = 'left'
) {
  const words = text.split(/\s+/);
  let line = '';
  let row = 0;
  ctx.textAlign = align;
  for (let n = 0; n < words.length; n++) {
    const testLine = line + (line ? ' ' : '') + words[n];
    if (ctx.measureText(testLine).width > maxWidth && n > 0) {
      ctx.fillText(line, x, y + row * lineHeight);
      line = words[n];
      row++;
      if (row >= maxLines - 1) {
        const remaining = [line, ...words.slice(n + 1)].join(' ');
        ctx.fillText(remaining, x, y + row * lineHeight, maxWidth);
        return;
      }
    } else {
      line = testLine;
    }
  }
  if (line) {
    ctx.fillText(line, x, y + row * lineHeight, maxWidth);
  }
}
