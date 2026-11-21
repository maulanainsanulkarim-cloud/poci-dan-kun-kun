import { resolveSpeakerToCharacterId } from '../data/characters';
import {
  CharacterActionCue,
  DialogueLine,
  SceneConfig,
} from '../types/studio';

export interface CharacterStageChoreography {
  x: number;
  yOffset: number;
  scale: number;
  actionCue: CharacterActionCue;
  lookDir: number; // -1..1
}

export type StoryPropId =
  | 'papers_to_smoke'
  | 'server_smoke_sparks'
  | 'camera_flash_tofu'
  | 'sealed_letter'
  | 'flying_coins'
  | 'social_comments'
  | 'voter_numbers';

export function detectStoryPropsFromScript(scene: SceneConfig): StoryPropId[] {
  const combined = `${scene.title} ${scene.visualDesc} ${scene.dialogues.map((d) => d.text).join(' ')}`.toLowerCase();
  const props: StoryPropId[] = [];

  if (combined.includes('asap hijau') || (combined.includes('kertas') && combined.includes('asap'))) {
    props.push('papers_to_smoke');
  }
  if (combined.includes('layar') && (combined.includes('asap') || combined.includes('berkedip') || combined.includes('kesurupan'))) {
    props.push('server_smoke_sparks');
  }
  if (combined.includes('ayam') || combined.includes('tahu') || combined.includes('cekrek')) {
    props.push('camera_flash_tofu');
  }
  if (combined.includes('surat') || combined.includes('amplop')) {
    props.push('sealed_letter');
  }
  if (combined.includes('uang') || combined.includes('koin') || combined.includes('emas') || combined.includes('berlian')) {
    props.push('flying_coins');
  }
  if (combined.includes('komentar') || combined.includes('viral') || combined.includes('#indisgelap') || combined.includes('buzzer')) {
    props.push('social_comments');
  }
  if (combined.includes('10.000') || combined.includes('rekapitulasi') || combined.includes('angka')) {
    props.push('voter_numbers');
  }

  return props;
}

/**
 * Computes script-driven per-character staging, entrance slide, action cue, and eye look-at
 * directly from scene.visualDesc + activeDialogue + sceneTime.
 */
export function evaluateScriptChoreography(
  scene: SceneConfig,
  castIds: string[],
  baseAnchors: Array<{ x: number; yOffset: number; scale: number }>,
  sceneTime: number,
  activeDialogue: DialogueLine | null,
  activeSpeakerId: string | null,
  speakerIdx: number
): Map<string, CharacterStageChoreography> {
  const result = new Map<string, CharacterStageChoreography>();
  const visualLower = `${scene.title} ${scene.visualDesc}`.toLowerCase();
  const activeTextLower = activeDialogue?.text.toLowerCase() ?? '';

  castIds.forEach((cid, idx) => {
    const base = baseAnchors[idx] ?? { x: 540, yOffset: 0, scale: 1.2 };
    let x = base.x;
    let yOffset = base.yOffset;
    const scale = base.scale;
    const isSpeaking = activeSpeakerId === cid;

    // 1. Determine expressive actionCue from dialogue + visual description
    let actionCue: CharacterActionCue = 'idle';

    if (isSpeaking && activeDialogue?.actionCue) {
      actionCue = activeDialogue.actionCue;
    } else if (cid === 'poci') {
      if (
        (visualLower.includes('tengkurap') || visualLower.includes('jatuh') || visualLower.includes('lemas')) &&
        sceneTime > 9.0
      ) {
        actionCue = 'plank';
      } else if (visualLower.includes('melompat') || visualLower.includes('menghindari')) {
        actionCue = 'hop';
      } else if (visualLower.includes('mengucek')) {
        actionCue = 'rub_eyes';
      }
    } else if (cid === 'kunkun') {
      if (activeTextLower.includes('hihihi') || visualLower.includes('tertawa')) {
        actionCue = 'laugh';
      } else if (visualLower.includes('kopi')) {
        actionCue = 'sip_coffee';
      }
    } else if (cid === 'gendu') {
      if (visualLower.includes('asap') || visualLower.includes('menghirup')) {
        actionCue = 'inhale_smoke';
      } else if (visualLower.includes('palu') || visualLower.includes('mengetok')) {
        actionCue = 'gavel_slam';
      }
    } else if (cid === 'tuyul') {
      if (visualLower.includes('mengendap') || visualLower.includes('berlari')) {
        actionCue = 'sneak';
      } else if (visualLower.includes('mengetik') || visualLower.includes('hp')) {
        actionCue = 'type_fast';
      }
    } else if (cid === 'gustuyul') {
      if (visualLower.includes('joget') || activeTextLower.includes('joget')) {
        actionCue = 'dance';
      }
    } else if (cid === 'hakim') {
      if (visualLower.includes('palu') || visualLower.includes('mengetok')) {
        actionCue = 'gavel_slam';
      }
    }

    // 2. Dynamic Spatial Choreography synced to scene script & speaking turns
    if (cid === 'poci' && (visualLower.includes('melompat') || actionCue === 'hop')) {
      // Hop laterally avoiding droplets / moving across stage
      x += Math.sin(sceneTime * 1.45) * 42;
    }

    if (cid === 'tuyul' && (visualLower.includes('mengendap') || visualLower.includes('berlari') || visualLower.includes('panik'))) {
      // Tuyul enters briskly from right edge or sneaks across during middle/late beat
      const firstLine = scene.dialogues.find((d) => resolveSpeakerToCharacterId(d.speaker) === 'tuyul');
      const enterStart = firstLine ? Math.max(0.5, firstLine.startSec - 1.4) : 4.0;
      if (sceneTime < enterStart) {
        x = base.x + 280; // poised near edge before dashing in
      } else {
        const dashP = Math.min(1, (sceneTime - enterStart) / 0.85);
        const ease = 1 - Math.pow(1 - dashP, 3);
        x = base.x + (1 - ease) * 260 + Math.sin(sceneTime * 4.5) * 14;
      }
    }

    if (cid === 'poci' && visualLower.includes('kursi saksi') && sceneTime > 4) {
      // Poci hops onto elevated witness stand
      yOffset -= 44;
    }

    // 3. Look-at direction (toward active speaker, or camera when narrator / 4th wall break)
    let lookDir = 0;
    if (visualLower.includes('menatap langsung') || !activeDialogue || activeSpeakerId === null) {
      lookDir = 0; // look straight at camera!
    } else if (speakerIdx >= 0 && speakerIdx !== idx) {
      const targetAnchor = baseAnchors[speakerIdx];
      if (targetAnchor) {
        lookDir = targetAnchor.x > x ? 0.85 : -0.85;
      }
    } else if (isSpeaking && castIds.length > 1) {
      const otherIdx = idx === 0 ? 1 : 0;
      const otherAnchor = baseAnchors[otherIdx];
      if (otherAnchor) {
        lookDir = otherAnchor.x > x ? 0.35 : -0.35;
      }
    }

    result.set(cid, { x, yOffset, scale, actionCue, lookDir });
  });

  return result;
}

/**
 * Renders animated story props described in the scene's script/visual description
 */
export function drawScriptStoryProps(
  ctx: CanvasRenderingContext2D,
  props: StoryPropId[],
  w: number,
  groundY: number,
  sceneTime: number
) {
  if (props.length === 0) return;

  ctx.save();
  for (const prop of props) {
    if (prop === 'papers_to_smoke') {
      // Flying LPJ papers transforming into rising green smoke
      for (let i = 0; i < 4; i++) {
        const cycle = (sceneTime * 0.45 + i * 0.25) % 1;
        const px = 280 + cycle * 480;
        const py = groundY - 260 - Math.sin(cycle * Math.PI) * 160;
        if (cycle < 0.55) {
          ctx.save();
          ctx.translate(px, py);
          ctx.rotate(cycle * 6 + i);
          ctx.fillStyle = '#f8fafc';
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 2;
          ctx.fillRect(-18, -24, 36, 48);
          ctx.strokeRect(-18, -24, 36, 48);
          ctx.restore();
        } else {
          const alpha = (1 - cycle) * 1.4;
          ctx.fillStyle = `rgba(74, 222, 128, ${Math.max(0, alpha).toFixed(2)})`;
          ctx.beginPath();
          ctx.arc(px, py, 20 + cycle * 24, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (prop === 'server_smoke_sparks') {
      // Sparks & gray smoke rising from malfunctioning server monitor
      for (let i = 0; i < 5; i++) {
        const t = (sceneTime * 0.9 + i * 0.2) % 1;
        ctx.fillStyle = `rgba(148, 163, 184, ${(0.55 * (1 - t)).toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(520 + Math.sin(sceneTime * 4 + i) * 45, 420 - t * 180, 16 + t * 22, 0, Math.PI * 2);
        ctx.fill();
      }
      if (Math.sin(sceneTime * 19) > 0.35) {
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(490, 510);
        ctx.lineTo(535, 470);
        ctx.lineTo(525, 505);
        ctx.lineTo(575, 460);
        ctx.stroke();
      }
    } else if (prop === 'camera_flash_tofu') {
      // Camera flash at 4.0s then Chicken turns into small White Tofu block
      if (sceneTime > 3.8 && sceneTime < 4.25) {
        const flashA = 1 - Math.abs(sceneTime - 4.0) / 0.25;
        ctx.fillStyle = `rgba(255, 255, 255, ${(flashA * 0.75).toFixed(2)})`;
        ctx.fillRect(0, 0, w, 1920);
      }
      const isTofu = sceneTime > 4.1;
      ctx.save();
      ctx.translate(w / 2, groundY - 220);
      ctx.fillStyle = '#fef3c7';
      ctx.strokeStyle = '#1e1b18';
      ctx.lineWidth = 3;
      if (!isTofu) {
        // Golden Roasted Chicken (Ayam Ingkung)
        ctx.fillStyle = '#d97706';
        ctx.beginPath();
        ctx.ellipse(0, 0, 42, 28, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else {
        // Tiny White Tofu Cube
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(-18, -14, 36, 28);
        ctx.strokeRect(-18, -14, 36, 28);
      }
      ctx.restore();
    } else if (prop === 'flying_coins') {
      for (let i = 0; i < 6; i++) {
        const cy = (sceneTime * 160 + i * 140) % 700;
        const cx = 180 + ((i * 157) % (w - 360));
        ctx.fillStyle = '#facc15';
        ctx.strokeStyle = '#854d0e';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(cx, 350 + cy, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    } else if (prop === 'social_comments') {
      const msgs = [
        '#IndisGelap Trending #1',
        'Terima kasih Pak Gendu!',
        'Jalan makin estetik!',
      ];
      msgs.forEach((m, i) => {
        const yOff = ((sceneTime * 130 + i * 190) % 520);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(w - 430, 820 - yOff, 370, 52, 14);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#e0f2fe';
        ctx.font = '600 20px "DM Sans", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(m, w - 408, 853 - yOff);
      });
    } else if (prop === 'sealed_letter') {
      const lx = 740 + Math.sin(sceneTime * 4) * 28;
      const ly = groundY - 340 + Math.cos(sceneTime * 5) * 14;
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(-0.14);
      ctx.fillStyle = '#fef3c7';
      ctx.strokeStyle = '#991b1b';
      ctx.lineWidth = 3;
      ctx.fillRect(-38, -24, 76, 48);
      ctx.strokeRect(-38, -24, 76, 48);
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(0, 4, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  ctx.restore();
}
