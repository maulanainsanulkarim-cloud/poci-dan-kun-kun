import {
  ArrayBufferTarget as Mp4ArrayBufferTarget,
  Muxer as Mp4Muxer,
} from 'mp4-muxer';
import {
  ArrayBufferTarget as WebmArrayBufferTarget,
  Muxer as WebmMuxer,
} from 'webm-muxer';
import { AudioSlotData, CharacterProfile, EpisodeConfig } from '../types/studio';
import { createCharacterSpringRig, CharacterSpringRig } from './ikPhysics';
import { renderStudioFrame } from './sceneCompositor';

export interface ExportVideoOptions {
  episode: EpisodeConfig;
  characters: CharacterProfile[];
  audioSlots: [AudioSlotData, AudioSlotData, AudioSlotData, AudioSlotData];
  exportScope: 'full60' | 'scene15';
  activeSceneIdx: 0 | 1 | 2 | 3;
  showWatermark: boolean;
  cameraAutoZoom: boolean;
  sfxMuted: boolean;
  onProgress: (percent: number, stageLabel: string) => void;
  signal?: AbortSignal;
}

export interface ExportVideoResult {
  blob: Blob;
  mimeType: string;
  extension: 'mp4' | 'webm';
  formatLabel: string;
  durationSec: number;
}

const WIDTH = 1080;
const HEIGHT = 1920;
const FPS = 30;
const SAMPLE_RATE = 48000;

function yieldToMain(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Schedules a synthesized Web Audio SFX at an exact offline timestamp
 */
function scheduleOfflineSfx(
  ctx: BaseAudioContext,
  dest: AudioNode,
  type: string,
  when: number,
  noiseBuffer: AudioBuffer
) {
  if (when < 0) return;

  switch (type) {
    case 'boing': {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(175, when);
      osc.frequency.exponentialRampToValueAtTime(480, when + 0.14);
      osc.frequency.exponentialRampToValueAtTime(220, when + 0.28);
      gain.gain.setValueAtTime(0.0001, when);
      gain.gain.linearRampToValueAtTime(0.22, when + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.3);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(when);
      osc.stop(when + 0.32);
      break;
    }
    case 'pop': {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, when);
      osc.frequency.exponentialRampToValueAtTime(1040, when + 0.08);
      gain.gain.setValueAtTime(0.0001, when);
      gain.gain.linearRampToValueAtTime(0.18, when + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.12);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(when);
      osc.stop(when + 0.14);
      break;
    }
    case 'giggle': {
      [520, 620, 560, 680].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        const t = when + i * 0.085;
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.linearRampToValueAtTime(0.11, t + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
        osc.connect(gain);
        gain.connect(dest);
        osc.start(t);
        osc.stop(t + 0.09);
      });
      break;
    }
    case 'gavel':
    case 'stamp': {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(type === 'stamp' ? 140 : 190, when);
      osc.frequency.exponentialRampToValueAtTime(48, when + 0.18);
      gain.gain.setValueAtTime(0.0001, when);
      gain.gain.linearRampToValueAtTime(0.24, when + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.22);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(when);
      osc.stop(when + 0.24);
      break;
    }
    case 'error': {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, when);
      osc.frequency.setValueAtTime(125, when + 0.12);
      gain.gain.setValueAtTime(0.0001, when);
      gain.gain.linearRampToValueAtTime(0.16, when + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.28);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(when);
      osc.stop(when + 0.3);
      break;
    }
    case 'coin': {
      [988, 1319].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        const t = when + i * 0.07;
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.linearRampToValueAtTime(0.15, t + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
        osc.connect(gain);
        gain.connect(dest);
        osc.start(t);
        osc.stop(t + 0.2);
      });
      break;
    }
    case 'whoosh':
    case 'camera':
    case 'rain': {
      const dur = type === 'rain' ? 0.65 : 0.22;
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = type === 'whoosh' ? 'bandpass' : 'highpass';
      filter.frequency.setValueAtTime(type === 'camera' ? 2800 : 750, when);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, when);
      gain.gain.linearRampToValueAtTime(type === 'rain' ? 0.06 : 0.16, when + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(dest);
      noise.start(when, 0, dur);
      break;
    }
  }
}

/**
 * Sample-accurate offline audio master mixing all MP3 dubbing slots + SFX
 */
async function renderEpisodeAudioMix(options: ExportVideoOptions): Promise<AudioBuffer> {
  const { episode, audioSlots, exportScope, activeSceneIdx, sfxMuted } = options;
  const startSec = exportScope === 'scene15' ? activeSceneIdx * 15 : 0;
  const totalSec = exportScope === 'scene15' ? 15 : 60;
  const totalSamples = SAMPLE_RATE * totalSec;

  const offCtx = new OfflineAudioContext(2, totalSamples, SAMPLE_RATE);
  const master = offCtx.createGain();
  master.gain.value = 0.95;
  master.connect(offCtx.destination);

  // Pre-build white-noise buffer for offline SFX
  const noiseBuf = offCtx.createBuffer(1, SAMPLE_RATE, SAMPLE_RATE);
  const nd = noiseBuf.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

  const sceneIndices = exportScope === 'scene15' ? [activeSceneIdx] : ([0, 1, 2, 3] as const);

  for (const scIdx of sceneIndices) {
    const sc = episode.scenes[scIdx];
    const relStart = scIdx * 15 - startSec;

    // 1. Dubbing MP3 slot aligned cleanly with dubbingOffsetSec
    const slotBuf = audioSlots[scIdx]?.buffer;
    if (slotBuf) {
      const dubOffset = sc.dubbingOffsetSec ?? 0;
      const when = relStart + Math.max(0, dubOffset);
      const bufOffset = dubOffset < 0 ? Math.abs(dubOffset) : 0;
      const maxPlay = Math.max(0, 15 - Math.max(0, dubOffset));
      const playDur = Math.min(slotBuf.duration - bufOffset, maxPlay);
      if (playDur > 0.02) {
        const src = offCtx.createBufferSource();
        src.buffer = slotBuf;
        src.connect(master);
        src.start(when, bufOffset, playDur);
      }
    }

    // 2. Scene SFX (transition whoosh, popup, dialogue cues, rain)
    if (!sfxMuted) {
      scheduleOfflineSfx(offCtx, master, 'whoosh', relStart + 0.02, noiseBuf);
      const popStart = sc.popup.startSec ?? 1.8;
      if (sc.popup.text) {
        scheduleOfflineSfx(
          offCtx,
          master,
          sc.popup.color === 'stamp' ? 'stamp' : 'pop',
          relStart + popStart,
          noiseBuf
        );
      }

      for (const line of sc.dialogues) {
        const t = relStart + line.startSec;
        const lower = line.text.toLowerCase();
        if (line.actionCue === 'hop') scheduleOfflineSfx(offCtx, master, 'boing', t, noiseBuf);
        else if (line.actionCue === 'laugh') scheduleOfflineSfx(offCtx, master, 'giggle', t, noiseBuf);
        else if (line.actionCue === 'gavel_slam') scheduleOfflineSfx(offCtx, master, 'gavel', t, noiseBuf);
        else if (lower.includes('cekrek') || lower.includes('foto'))
          scheduleOfflineSfx(offCtx, master, 'camera', t, noiseBuf);
        else if (lower.includes('saldo') || lower.includes('koin') || lower.includes('miliar'))
          scheduleOfflineSfx(offCtx, master, 'coin', t, noiseBuf);
        else if (lower.includes('error') || lower.includes('down'))
          scheduleOfflineSfx(offCtx, master, 'error', t, noiseBuf);
      }

      if (sc.weather === 'rain') {
        for (let r = 0; r < 15; r += 3) {
          scheduleOfflineSfx(offCtx, master, 'rain', relStart + r, noiseBuf);
        }
      }
    }
  }

  return await offCtx.startRendering();
}

async function findSupportedVideoConfig(): Promise<
  | { mode: 'mp4'; videoCodec: string; audioCodec: string }
  | { mode: 'webm'; videoCodec: string; webmVideoCodec: string; audioCodec: string }
  | null
> {
  if (typeof VideoEncoder === 'undefined' || typeof AudioEncoder === 'undefined') {
    return null;
  }

  // Tier 1: True H.264 + AAC MP4 (fast-start, plays everywhere)
  const h264Candidates = [
    'avc1.64002A',
    'avc1.4D002A',
    'avc1.42002A',
    'avc1.640032',
    'avc1.4D0032',
    'avc1.420032',
    'avc1.640028',
    'avc1.4D0028',
  ];

  let supportedH264: string | null = null;
  for (const codec of h264Candidates) {
    try {
      const check = await VideoEncoder.isConfigSupported({
        codec,
        width: WIDTH,
        height: HEIGHT,
        bitrate: 6_000_000,
        framerate: FPS,
        avc: { format: 'avc' },
      });
      if (check.supported) {
        supportedH264 = codec;
        break;
      }
    } catch {
      // ignore unsupported profile
    }
  }

  if (supportedH264) {
    try {
      const aCheck = await AudioEncoder.isConfigSupported({
        codec: 'mp4a.40.2',
        numberOfChannels: 2,
        sampleRate: SAMPLE_RATE,
        bitrate: 192_000,
      });
      if (aCheck.supported) {
        return { mode: 'mp4', videoCodec: supportedH264, audioCodec: 'mp4a.40.2' };
      }
    } catch {
      // fall through to WebM WebCodecs
    }
  }

  // Tier 2: Deterministic WebCodecs VP9 / VP8 + Opus WebM (with proper Duration + Cues)
  const webmCandidates = [
    { codec: 'vp09.00.41.08', webm: 'V_VP9' },
    { codec: 'vp8', webm: 'V_VP8' },
  ];

  for (const cand of webmCandidates) {
    try {
      const vCheck = await VideoEncoder.isConfigSupported({
        codec: cand.codec,
        width: WIDTH,
        height: HEIGHT,
        bitrate: 5_500_000,
        framerate: FPS,
      });
      const aCheck = await AudioEncoder.isConfigSupported({
        codec: 'opus',
        numberOfChannels: 2,
        sampleRate: SAMPLE_RATE,
        bitrate: 160_000,
      });
      if (vCheck.supported && aCheck.supported) {
        return {
          mode: 'webm',
          videoCodec: cand.codec,
          webmVideoCodec: cand.webm,
          audioCodec: 'opus',
        };
      }
    } catch {
      // ignore
    }
  }

  return null;
}

async function encodeAudioBufferToEncoder(
  audioBuffer: AudioBuffer,
  audioEncoder: AudioEncoder,
  signal?: AbortSignal
) {
  const ch0 = audioBuffer.getChannelData(0);
  const ch1 = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : ch0;
  const totalSamples = audioBuffer.length;
  const chunkFrames = 1024;

  for (let offset = 0; offset < totalSamples; offset += chunkFrames) {
    if (signal?.aborted) throw new DOMException('Render dibatalkan', 'AbortError');
    const frames = Math.min(chunkFrames, totalSamples - offset);
    const planar = new Float32Array(frames * 2);
    planar.set(ch0.subarray(offset, offset + frames), 0);
    planar.set(ch1.subarray(offset, offset + frames), frames);

    const audioData = new AudioData({
      format: 'f32-planar',
      sampleRate: SAMPLE_RATE,
      numberOfFrames: frames,
      numberOfChannels: 2,
      timestamp: Math.round((offset / SAMPLE_RATE) * 1_000_000),
      data: planar,
    });

    audioEncoder.encode(audioData);
    audioData.close();

    while (audioEncoder.encodeQueueSize > 12) {
      await yieldToMain();
    }
  }
}

/**
 * Tier 1 & Tier 2: Deterministic Offline Frame-by-Frame WebCodecs Export
 */
async function exportViaWebCodecs(
  options: ExportVideoOptions,
  mixedAudio: AudioBuffer,
  cfg:
    | { mode: 'mp4'; videoCodec: string; audioCodec: string }
    | { mode: 'webm'; videoCodec: string; webmVideoCodec: string; audioCodec: string }
): Promise<ExportVideoResult> {
  const {
    episode,
    characters,
    audioSlots,
    exportScope,
    activeSceneIdx,
    showWatermark,
    cameraAutoZoom,
    onProgress,
    signal,
  } = options;

  const startSec = exportScope === 'scene15' ? activeSceneIdx * 15 : 0;
  const totalSec = exportScope === 'scene15' ? 15 : 60;
  const totalFrames = totalSec * FPS;

  const offCanvas = document.createElement('canvas');
  offCanvas.width = WIDTH;
  offCanvas.height = HEIGHT;
  const ctx = offCanvas.getContext('2d');
  if (!ctx) throw new Error('Gagal menginisialisasi Canvas 2D untuk export.');

  // Isolated deterministic spring pool for export
  const exportRigPool = new Map<string, CharacterSpringRig>();
  characters.forEach((c) => exportRigPool.set(c.id, createCharacterSpringRig()));

  let encoderError: Error | null = null;

  if (cfg.mode === 'mp4') {
    const target = new Mp4ArrayBufferTarget();
    const muxer = new Mp4Muxer({
      target,
      video: { codec: 'avc', width: WIDTH, height: HEIGHT, frameRate: FPS },
      audio: { codec: 'aac', numberOfChannels: 2, sampleRate: SAMPLE_RATE },
      fastStart: 'in-memory',
      firstTimestampBehavior: 'offset',
    });

    const videoEncoder = new VideoEncoder({
      output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
      error: (e) => {
        encoderError = e instanceof Error ? e : new Error(String(e));
      },
    });
    const audioEncoder = new AudioEncoder({
      output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
      error: (e) => {
        encoderError = e instanceof Error ? e : new Error(String(e));
      },
    });

    videoEncoder.configure({
      codec: cfg.videoCodec,
      width: WIDTH,
      height: HEIGHT,
      bitrate: 6_000_000,
      framerate: FPS,
      avc: { format: 'avc' },
    });
    audioEncoder.configure({
      codec: cfg.audioCodec,
      numberOfChannels: 2,
      sampleRate: SAMPLE_RATE,
      bitrate: 192_000,
    });

    try {
      onProgress(5, 'Mengenkode audio master (AAC 48kHz)...');
      await encodeAudioBufferToEncoder(mixedAudio, audioEncoder, signal);

      const frameDurationUs = Math.round(1_000_000 / FPS);
      for (let f = 0; f < totalFrames; f++) {
        if (signal?.aborted) throw new DOMException('Render dibatalkan', 'AbortError');
        if (encoderError) throw encoderError;

        const simTime = startSec + f / FPS;
        renderStudioFrame(ctx, {
          episode,
          characters,
          audioSlots,
          globalTime: simTime,
          showWatermark,
          cameraAutoZoom,
          rigPoolOverride: exportRigPool,
        });

        const frame = new VideoFrame(offCanvas, {
          timestamp: Math.round((f * 1_000_000) / FPS),
          duration: frameDurationUs,
        });
        videoEncoder.encode(frame, { keyFrame: f % FPS === 0 });
        frame.close();

        while (videoEncoder.encodeQueueSize > 5) {
          await yieldToMain();
        }
        if (f % 6 === 0) {
          const pct = 10 + Math.round((f / totalFrames) * 84);
          onProgress(pct, `Merender frame 3D (${f + 1}/${totalFrames})...`);
          await yieldToMain();
        }
      }

      onProgress(96, 'Menyusun atom fast-start MP4...');
      await Promise.all([videoEncoder.flush(), audioEncoder.flush()]);
      if (encoderError) throw encoderError;
      muxer.finalize();

      const blob = new Blob([target.buffer], { type: 'video/mp4' });
      onProgress(100, 'Render MP4 selesai.');
      return {
        blob,
        mimeType: 'video/mp4',
        extension: 'mp4',
        formatLabel: 'MP4 (H.264 + AAC Fast-Start)',
        durationSec: totalSec,
      };
    } finally {
      if (videoEncoder.state !== 'closed') videoEncoder.close();
      if (audioEncoder.state !== 'closed') audioEncoder.close();
    }
  } else {
    const target = new WebmArrayBufferTarget();
    const muxer = new WebmMuxer({
      target,
      video: { codec: cfg.webmVideoCodec, width: WIDTH, height: HEIGHT, frameRate: FPS },
      audio: { codec: 'A_OPUS', numberOfChannels: 2, sampleRate: SAMPLE_RATE },
      firstTimestampBehavior: 'offset',
    });

    const videoEncoder = new VideoEncoder({
      output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
      error: (e) => {
        encoderError = e instanceof Error ? e : new Error(String(e));
      },
    });
    const audioEncoder = new AudioEncoder({
      output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
      error: (e) => {
        encoderError = e instanceof Error ? e : new Error(String(e));
      },
    });

    videoEncoder.configure({
      codec: cfg.videoCodec,
      width: WIDTH,
      height: HEIGHT,
      bitrate: 5_500_000,
      framerate: FPS,
    });
    audioEncoder.configure({
      codec: cfg.audioCodec,
      numberOfChannels: 2,
      sampleRate: SAMPLE_RATE,
      bitrate: 160_000,
    });

    try {
      onProgress(5, 'Mengenkode audio master (Opus 48kHz)...');
      await encodeAudioBufferToEncoder(mixedAudio, audioEncoder, signal);

      const frameDurationUs = Math.round(1_000_000 / FPS);
      for (let f = 0; f < totalFrames; f++) {
        if (signal?.aborted) throw new DOMException('Render dibatalkan', 'AbortError');
        if (encoderError) throw encoderError;

        const simTime = startSec + f / FPS;
        renderStudioFrame(ctx, {
          episode,
          characters,
          audioSlots,
          globalTime: simTime,
          showWatermark,
          cameraAutoZoom,
          rigPoolOverride: exportRigPool,
        });

        const frame = new VideoFrame(offCanvas, {
          timestamp: Math.round((f * 1_000_000) / FPS),
          duration: frameDurationUs,
        });
        videoEncoder.encode(frame, { keyFrame: f % FPS === 0 });
        frame.close();

        while (videoEncoder.encodeQueueSize > 5) {
          await yieldToMain();
        }
        if (f % 6 === 0) {
          const pct = 10 + Math.round((f / totalFrames) * 84);
          onProgress(pct, `Merender frame 3D (${f + 1}/${totalFrames})...`);
          await yieldToMain();
        }
      }

      onProgress(96, 'Menyusun Cues & Duration WebM...');
      await Promise.all([videoEncoder.flush(), audioEncoder.flush()]);
      if (encoderError) throw encoderError;
      muxer.finalize();

      const blob = new Blob([target.buffer], { type: 'video/webm' });
      onProgress(100, 'Render WebM selesai.');
      return {
        blob,
        mimeType: 'video/webm',
        extension: 'webm',
        formatLabel: 'WebM (VP9/Opus Seekable)',
        durationSec: totalSec,
      };
    } finally {
      if (videoEncoder.state !== 'closed') videoEncoder.close();
      if (audioEncoder.state !== 'closed') audioEncoder.close();
    }
  }
}

/**
 * Tier 3 Fallback: Hardened MediaRecorder with continuous silent carrier audio & zero React re-renders
 */
async function exportViaHardenedMediaRecorder(
  options: ExportVideoOptions,
  mixedAudio: AudioBuffer
): Promise<ExportVideoResult> {
  const {
    episode,
    characters,
    audioSlots,
    exportScope,
    activeSceneIdx,
    showWatermark,
    cameraAutoZoom,
    onProgress,
    signal,
  } = options;

  const startSec = exportScope === 'scene15' ? activeSceneIdx * 15 : 0;
  const totalSec = exportScope === 'scene15' ? 15 : 60;

  const offCanvas = document.createElement('canvas');
  offCanvas.width = WIDTH;
  offCanvas.height = HEIGHT;
  const ctx = offCanvas.getContext('2d');
  if (!ctx) throw new Error('Kanvas 2D tidak tersedia.');

  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const recAudioCtx = new AudioCtx({ sampleRate: SAMPLE_RATE });
  const dest = recAudioCtx.createMediaStreamDestination();

  // Continuous sub-audible carrier prevents Chromium muxer stalls during silent gaps
  const silentOsc = recAudioCtx.createOscillator();
  const silentGain = recAudioCtx.createGain();
  silentGain.gain.value = 0.00001;
  silentOsc.connect(silentGain);
  silentGain.connect(dest);
  silentOsc.start();

  const audioSrc = recAudioCtx.createBufferSource();
  audioSrc.buffer = mixedAudio;
  audioSrc.connect(dest);

  const canvasStream = offCanvas.captureStream(FPS);
  const combinedStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...dest.stream.getAudioTracks(),
  ]);

  // Prefer VP8/VP9 WebM over Chromium's fragmented MediaRecorder MP4
  const preferred = [
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp9,opus',
    'video/webm',
    'video/mp4',
  ];
  const chosenType = preferred.find((t) => MediaRecorder.isTypeSupported(t)) || '';
  const recorder = new MediaRecorder(
    combinedStream,
    chosenType
      ? { mimeType: chosenType, videoBitsPerSecond: 6_000_000 }
      : { videoBitsPerSecond: 6_000_000 }
  );

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  const exportRigPool = new Map<string, CharacterSpringRig>();
  characters.forEach((c) => exportRigPool.set(c.id, createCharacterSpringRig()));

  return await new Promise<ExportVideoResult>((resolve, reject) => {
    let rafId = 0;

    const cleanup = () => {
      cancelAnimationFrame(rafId);
      try {
        silentOsc.stop();
        audioSrc.stop();
        void recAudioCtx.close();
      } catch {
        // ignore
      }
      combinedStream.getTracks().forEach((t) => t.stop());
    };

    if (signal) {
      signal.addEventListener('abort', () => {
        if (recorder.state === 'recording') recorder.stop();
        cleanup();
        reject(new DOMException('Render dibatalkan', 'AbortError'));
      });
    }

    recorder.onstop = () => {
      cleanup();
      if (signal?.aborted) return;
      const mime = recorder.mimeType || chosenType || 'video/webm';
      const isMp4 = mime.includes('mp4');
      const blob = new Blob(chunks, { type: mime });
      onProgress(100, 'Render selesai.');
      resolve({
        blob,
        mimeType: mime,
        extension: isMp4 ? 'mp4' : 'webm',
        formatLabel: isMp4 ? 'MP4' : 'WebM (VP8/Opus)',
        durationSec: totalSec,
      });
    };

    recorder.onerror = () => {
      cleanup();
      reject(new Error('MediaRecorder gagal merekam video.'));
    };

    const startAudioTime = recAudioCtx.currentTime;
    audioSrc.start(startAudioTime);
    recorder.start(1000);

    const loop = () => {
      if (signal?.aborted) return;
      const elapsed = Math.max(0, recAudioCtx.currentTime - startAudioTime);
      const simTime = startSec + elapsed;
      if (elapsed >= totalSec) {
        if (recorder.state === 'recording') recorder.stop();
        return;
      }

      renderStudioFrame(ctx, {
        episode,
        characters,
        audioSlots,
        globalTime: simTime,
        showWatermark,
        cameraAutoZoom,
        rigPoolOverride: exportRigPool,
      });

      const pct = Math.min(99, Math.round((elapsed / totalSec) * 100));
      onProgress(pct, `Merekam stream real-time (${elapsed.toFixed(1)}s / ${totalSec}s)...`);
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
  });
}

/**
 * Main Studio Video Exporter Entry Point:
 * 1) Renders sample-accurate OfflineAudioContext master audio mix
 * 2) Uses WebCodecs + mp4-muxer (H.264+AAC fast-start) or webm-muxer (VP9+Opus seekable)
 * 3) Falls back cleanly to hardened MediaRecorder only if WebCodecs is unavailable
 */
export async function exportStudioVideo(
  options: ExportVideoOptions
): Promise<ExportVideoResult> {
  options.onProgress(2, 'Menyiapkan audio master 48kHz...');
  const mixedAudio = await renderEpisodeAudioMix(options);

  if (options.signal?.aborted) {
    throw new DOMException('Render dibatalkan', 'AbortError');
  }

  const webCodecsCfg = await findSupportedVideoConfig();
  if (webCodecsCfg) {
    try {
      return await exportViaWebCodecs(options, mixedAudio, webCodecsCfg);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw err;
      }
      // Graceful fallback if WebCodecs hardware encoder rejects mid-flight
      options.onProgress(5, 'Mengalihkan ke encoder MediaRecorder stabil...');
    }
  }

  return await exportViaHardenedMediaRecorder(options, mixedAudio);
}
