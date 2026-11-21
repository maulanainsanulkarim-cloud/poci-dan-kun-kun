import { AudioSlotData } from '../types/studio';

export class StudioAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private streamDest: MediaStreamAudioDestinationNode | null = null;
  private activeSource: AudioBufferSourceNode | null = null;
  private freqData: Uint8Array<ArrayBuffer> = new Uint8Array(new ArrayBuffer(64));

  ensureContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 1.0;

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 128;
      this.freqData = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount));

      this.streamDest = this.ctx.createMediaStreamDestination();
      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
      this.masterGain.connect(this.streamDest);
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  getMediaStreamDestination(): MediaStreamAudioDestinationNode {
    this.ensureContext();
    return this.streamDest!;
  }

  getLiveVuLevel(): number {
    if (!this.analyser) return 0;
    this.analyser.getByteFrequencyData(this.freqData);
    let sum = 0;
    for (let i = 0; i < this.freqData.length; i++) {
      sum += this.freqData[i];
    }
    return Math.min(1, sum / (this.freqData.length * 140));
  }

  async decodeAudioFile(
    file: File,
    sceneIndex: 0 | 1 | 2 | 3
  ): Promise<AudioSlotData> {
    const ctx = this.ensureContext();
    const arrayBuf = await file.arrayBuffer();
    const audioBuf = await ctx.decodeAudioData(arrayBuf);

    const channel = audioBuf.getChannelData(0);
    const sampleRate = audioBuf.sampleRate;
    const targetDuration = 15; // 15 seconds per scene
    const totalFrames = targetDuration * 30; // 450 frames @ 30 FPS
    const envelope30Fps: number[] = new Array(totalFrames).fill(0);

    let maxRms = 0.001;
    for (let f = 0; f < totalFrames; f++) {
      const tStart = (f / 30) * sampleRate;
      const tEnd = ((f + 1) / 30) * sampleRate;
      const startIdx = Math.floor(tStart);
      const endIdx = Math.min(channel.length, Math.floor(tEnd));
      if (startIdx >= channel.length) {
        envelope30Fps[f] = 0;
        continue;
      }
      let sumSq = 0;
      const count = Math.max(1, endIdx - startIdx);
      for (let i = startIdx; i < endIdx; i++) {
        const v = channel[i];
        sumSq += v * v;
      }
      const rms = Math.sqrt(sumSq / count);
      envelope30Fps[f] = rms;
      if (rms > maxRms) maxRms = rms;
    }

    for (let f = 0; f < totalFrames; f++) {
      envelope30Fps[f] = Math.min(1, envelope30Fps[f] / (maxRms * 0.85));
    }

    // 96-bar waveform peaks for UI visualization
    const barCount = 96;
    const waveformPeaks: number[] = [];
    const blockSize = Math.max(1, Math.floor(channel.length / barCount));
    for (let b = 0; b < barCount; b++) {
      const s = b * blockSize;
      const e = Math.min(channel.length, s + blockSize);
      let peak = 0;
      for (let i = s; i < e; i += 4) {
        const a = Math.abs(channel[i]);
        if (a > peak) peak = a;
      }
      waveformPeaks.push(Math.min(1, peak / Math.max(0.05, maxRms * 1.4)));
    }

    return {
      sceneIndex,
      fileName: file.name,
      duration: audioBuf.duration,
      buffer: audioBuf,
      envelope30Fps,
      waveformPeaks,
    };
  }

  stopDubbing() {
    if (this.activeSource) {
      try {
        this.activeSource.stop();
        this.activeSource.disconnect();
      } catch {
        // already stopped
      }
      this.activeSource = null;
    }
  }

  playDubbingSlot(buffer: AudioBuffer, offsetSec = 0) {
    this.stopDubbing();
    const ctx = this.ensureContext();
    if (!this.masterGain || offsetSec >= buffer.duration) return;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.masterGain);
    source.start(0, Math.max(0, offsetSec));
    this.activeSource = source;
  }

  triggerSfx(type: string) {
    const ctx = this.ensureContext();
    if (!this.masterGain) return;
    const now = ctx.currentTime;

    switch (type) {
      case 'boing': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(175, now);
        osc.frequency.exponentialRampToValueAtTime(480, now + 0.14);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.28);
        gain.gain.setValueAtTime(0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.32);
        break;
      }

      case 'pop': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(1040, now + 0.08);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.14);
        break;
      }

      case 'giggle': {
        // Light horror-comedy chuckle arpeggio
        [520, 620, 560, 680].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          const t = now + i * 0.085;
          osc.frequency.setValueAtTime(freq, t);
          gain.gain.setValueAtTime(0.11, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
          osc.connect(gain);
          gain.connect(this.masterGain!);
          osc.start(t);
          osc.stop(t + 0.09);
        });
        break;
      }

      case 'gavel':
      case 'bruk':
      case 'stamp': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(type === 'stamp' ? 140 : 190, now);
        osc.frequency.exponentialRampToValueAtTime(48, now + 0.18);
        gain.gain.setValueAtTime(0.26, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.24);
        break;
      }

      case 'error': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.setValueAtTime(125, now + 0.12);
        gain.gain.setValueAtTime(0.16, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.3);
        break;
      }

      case 'coin': {
        [988, 1319].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          const t = now + i * 0.07;
          osc.frequency.setValueAtTime(freq, t);
          gain.gain.setValueAtTime(0.15, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
          osc.connect(gain);
          gain.connect(this.masterGain!);
          osc.start(t);
          osc.stop(t + 0.2);
        });
        break;
      }

      case 'whoosh':
      case 'camera':
      case 'rain': {
        const dur = type === 'rain' ? 0.65 : 0.22;
        const bufSize = Math.floor(ctx.sampleRate * dur);
        const noiseBuf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
        const data = noiseBuf.getChannelData(0);
        for (let i = 0; i < bufSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuf;
        const filter = ctx.createBiquadFilter();
        filter.type = type === 'whoosh' ? 'bandpass' : 'highpass';
        filter.frequency.setValueAtTime(type === 'camera' ? 2800 : 750, now);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(type === 'rain' ? 0.06 : 0.16, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        noise.start(now);
        break;
      }

      default:
        break;
    }
  }
}

export const studioAudio = new StudioAudioEngine();
