import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Download,
  Film,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { studioAudio } from '../engine/audioEngine';
import { renderStudioFrame } from '../engine/sceneCompositor';
import { AudioSlotData, CharacterProfile, EpisodeConfig } from '../types/studio';

interface CanvasStageProps {
  episode: EpisodeConfig;
  characters: CharacterProfile[];
  audioSlots: [AudioSlotData, AudioSlotData, AudioSlotData, AudioSlotData];
  currentTime: number;
  isPlaying: boolean;
  showWatermark: boolean;
  cameraAutoZoom: boolean;
  onTogglePlay: () => void;
  onSeek: (sec: number) => void;
  onReplay: () => void;
  onToggleWatermark: () => void;
  onToggleAutoZoom: () => void;
  exportModalOpen: boolean;
  onCloseExportModal: () => void;
  isExporting: boolean;
  setIsExporting: (v: boolean) => void;
}

export const CanvasStage: React.FC<CanvasStageProps> = ({
  episode,
  characters,
  audioSlots,
  currentTime,
  isPlaying,
  showWatermark,
  cameraAutoZoom,
  onTogglePlay,
  onSeek,
  onReplay,
  onToggleWatermark,
  onToggleAutoZoom,
  exportModalOpen,
  onCloseExportModal,
  isExporting,
  setIsExporting,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [vuLevel, setVuLevel] = useState(0);
  const [sfxMuted, setSfxMuted] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportScope, setExportScope] = useState<'full60' | 'scene15'>('full60');
  const [exportedVideoUrl, setExportedVideoUrl] = useState<string | null>(null);
  const [exportedMimeLabel, setExportedMimeLabel] = useState('video/webm');
  const [exportError, setExportError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const exportTimerRef = useRef<number | null>(null);

  const activeSceneIdx = Math.min(3, Math.floor(currentTime / 15)) as 0 | 1 | 2 | 3;
  const activeScene = episode.scenes[activeSceneIdx];

  // Render canvas frame whenever dependencies or currentTime update
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    renderStudioFrame(ctx, {
      episode,
      characters,
      audioSlots,
      globalTime: currentTime,
      showWatermark,
      cameraAutoZoom,
    });
  }, [episode, characters, audioSlots, currentTime, showWatermark, cameraAutoZoom]);

  // Live VU meter polling while playing
  useEffect(() => {
    if (!isPlaying && !isExporting) {
      setVuLevel(0);
      return;
    }
    let rafId = 0;
    const tick = () => {
      setVuLevel(studioAudio.getLiveVuLevel());
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, isExporting]);

  // Trigger SFX when crossing scene transitions or popups during playback
  const lastSfxKeyRef = useRef<string>('');
  useEffect(() => {
    if (!isPlaying || sfxMuted) return;
    const sceneTime = currentTime - activeSceneIdx * 15;
    if (sceneTime < 0.15) {
      const key = `trans_${activeSceneIdx}`;
      if (lastSfxKeyRef.current !== key) {
        lastSfxKeyRef.current = key;
        studioAudio.triggerSfx('whoosh');
      }
    }
    const popupStart = activeScene.popup.startSec ?? 1.8;
    if (Math.abs(sceneTime - popupStart) < 0.08) {
      const key = `pop_${activeSceneIdx}`;
      if (lastSfxKeyRef.current !== key) {
        lastSfxKeyRef.current = key;
        studioAudio.triggerSfx(activeScene.popup.color === 'stamp' ? 'stamp' : 'pop');
      }
    }
    if (activeScene.weather === 'rain' && Math.floor(sceneTime) % 3 === 0 && sceneTime % 1 < 0.07) {
      studioAudio.triggerSfx('rain');
    }
  }, [currentTime, isPlaying, sfxMuted, activeSceneIdx, activeScene]);

  const formatTimecode = (sec: number) => {
    const clamped = Math.max(0, Math.min(60, sec));
    const mins = Math.floor(clamped / 60);
    const secs = Math.floor(clamped % 60);
    const frames = Math.floor((clamped % 1) * 30);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(frames).padStart(2, '0')}`;
  };

  const handleStartExport = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setExportError(null);
    if (exportedVideoUrl) {
      URL.revokeObjectURL(exportedVideoUrl);
      setExportedVideoUrl(null);
    }

    try {
      studioAudio.ensureContext();
      const audioDest = studioAudio.getMediaStreamDestination();
      const canvasStream = canvas.captureStream(30);
      const combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...audioDest.stream.getAudioTracks(),
      ]);

      const preferredTypes = [
        'video/mp4;codecs=avc1,mp4a.40.2',
        'video/mp4',
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
      ];
      const chosenType =
        preferredTypes.find((t) => MediaRecorder.isTypeSupported(t)) || '';

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

      recorder.onstop = () => {
        const mime = recorder.mimeType || chosenType || 'video/webm';
        const blob = new Blob(chunks, { type: mime });
        const url = URL.createObjectURL(blob);
        setExportedVideoUrl(url);
        setExportedMimeLabel(mime.includes('mp4') ? 'MP4 (H.264)' : 'WebM (VP9/Opus)');
        setIsExporting(false);
        setExportProgress(100);
        studioAudio.stopDubbing();
      };

      mediaRecorderRef.current = recorder;
      setIsExporting(true);
      setExportProgress(0);

      const startSec = exportScope === 'scene15' ? activeSceneIdx * 15 : 0;
      const totalSec = exportScope === 'scene15' ? 15 : 60;
      const endSec = startSec + totalSec;

      recorder.start(250);
      const startPerf = performance.now();
      let lastScheduledScene = -1;
      let lastPopupKey = '';

      const renderLoop = () => {
        const elapsed = (performance.now() - startPerf) / 1000;
        const simTime = startSec + elapsed;
        if (simTime >= endSec) {
          if (recorder.state === 'recording') {
            recorder.stop();
          }
          return;
        }

        const scIdx = Math.min(3, Math.floor(simTime / 15)) as 0 | 1 | 2 | 3;
        const scTime = simTime - scIdx * 15;

        // Play dubbing buffer per scene boundary
        if (scIdx !== lastScheduledScene) {
          lastScheduledScene = scIdx;
          const slotBuf = audioSlots[scIdx]?.buffer;
          if (slotBuf) {
            studioAudio.playDubbingSlot(slotBuf, 0);
          } else {
            studioAudio.stopDubbing();
          }
          if (!sfxMuted) studioAudio.triggerSfx('whoosh');
        }

        // Trigger scene popup / SFX cues cleanly during render
        const sc = episode.scenes[scIdx];
        const popStart = sc.popup.startSec ?? 1.8;
        if (!sfxMuted && Math.abs(scTime - popStart) < 0.06 && lastPopupKey !== `exp_pop_${scIdx}`) {
          lastPopupKey = `exp_pop_${scIdx}`;
          studioAudio.triggerSfx(sc.popup.color === 'stamp' ? 'stamp' : 'pop');
        }

        const ctx = canvas.getContext('2d');
        if (ctx) {
          renderStudioFrame(ctx, {
            episode,
            characters,
            audioSlots,
            globalTime: simTime,
            showWatermark,
            cameraAutoZoom,
          });
        }
        onSeek(simTime);
        setExportProgress(Math.min(99, Math.round((elapsed / totalSec) * 100)));
        exportTimerRef.current = requestAnimationFrame(renderLoop);
      };

      exportTimerRef.current = requestAnimationFrame(renderLoop);
    } catch (err: unknown) {
      setIsExporting(false);
      setExportError(
        err instanceof Error
          ? err.message
          : 'Browser tidak mendukung perekaman kanvas MediaRecorder.'
      );
    }
  };

  const handleCancelExport = () => {
    if (exportTimerRef.current) cancelAnimationFrame(exportTimerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    studioAudio.stopDubbing();
    setIsExporting(false);
  };

  return (
    <section className="flex-1 flex flex-col bg-[#0B0B0E] min-w-0 overflow-hidden">
      {/* Stage Sub-toolbar */}
      <div className="h-11 px-4 border-b border-zinc-800/80 flex items-center justify-between gap-4 bg-[#111114] shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xs font-mono text-amber-400 font-semibold shrink-0">
            1080×1920 · 30 FPS
          </span>
          <span className="text-zinc-600" aria-hidden="true">
            ·
          </span>
          <span className="text-xs text-zinc-300 truncate">
            Scene {activeScene.sceneNumber}: {activeScene.title}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onToggleAutoZoom}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              cameraAutoZoom
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-zinc-200'
            }`}
          >
            <Camera className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
            Auto-Cam
          </button>
          <button
            type="button"
            onClick={onToggleWatermark}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              showWatermark
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-zinc-200'
            }`}
          >
            Watermark
          </button>
          <button
            type="button"
            onClick={() => setSfxMuted((m) => !m)}
            aria-label={sfxMuted ? 'Aktifkan SFX' : 'Bisukan SFX'}
            className="p-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white cursor-pointer"
          >
            {sfxMuted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Center 9:16 Canvas Viewport */}
      <div className="flex-1 flex items-center justify-center p-4 min-h-0 relative overflow-hidden">
        <div
          className="relative h-full max-h-[calc(100vh-235px)] aspect-[9/16] rounded-xl overflow-hidden border border-zinc-800 bg-black shadow-2xl"
        >
          <canvas
            ref={canvasRef}
            width={1080}
            height={1920}
            className="w-full h-full object-contain block"
          />
        </div>
      </div>

      {/* Bottom Transport & 60s Scrubber Bar */}
      <div className="border-t border-zinc-800 bg-[#111114] px-4 py-3 space-y-2.5 shrink-0">
        {/* Top Row: Play/Pause, Replay, Scene Jump 1-4, Timecode & Live VU Meter */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onTogglePlay}
              disabled={isExporting}
              className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {isPlaying ? 'Jeda' : 'Putar'}
            </button>
            <button
              type="button"
              onClick={onReplay}
              disabled={isExporting}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Ulang
            </button>

            <div className="h-5 w-px bg-zinc-800 mx-1" aria-hidden="true" />

            {/* Jump to Scene 1–4 */}
            <div className="flex items-center gap-1 bg-zinc-950 p-0.5 rounded-lg border border-zinc-800">
              {([0, 1, 2, 3] as const).map((idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={isExporting}
                  onClick={() => onSeek(idx * 15)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    activeSceneIdx === idx
                      ? 'bg-zinc-800 text-amber-400'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  S{idx + 1}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Live VU Meter */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-zinc-400">VU</span>
              <div className="w-24 h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-red-500 transition-[width] duration-75"
                  style={{ width: `${Math.round(vuLevel * 100)}%` }}
                />
              </div>
            </div>

            {/* Tabular Timecode */}
            <div className="font-mono text-xs text-zinc-200 tabular-nums">
              <span className="text-amber-400">{formatTimecode(currentTime)}</span>
              <span className="text-zinc-600 mx-1">/</span>
              <span className="text-zinc-400">01:00.00</span>
            </div>
          </div>
        </div>

        {/* 60-Second Timeline Scrubber */}
        <div className="relative pt-1">
          <input
            type="range"
            min={0}
            max={59.96}
            step={1 / 30}
            value={currentTime}
            disabled={isExporting}
            onChange={(e) => onSeek(parseFloat(e.target.value))}
            aria-label="Timeline scrubber 60 detik"
            className="w-full h-2 accent-amber-500 bg-zinc-900 rounded-lg cursor-pointer"
          />
          <div className="grid grid-cols-4 gap-1 mt-1.5 text-[11px] font-mono text-zinc-500">
            {episode.scenes.map((sc, idx) => {
              const hasDub = Boolean(audioSlots[idx]?.buffer);
              return (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => onSeek(idx * 15)}
                  className={`text-left px-2 py-1 rounded border text-[11px] truncate cursor-pointer transition-colors ${
                    activeSceneIdx === idx
                      ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                      : 'border-zinc-800/80 bg-zinc-950/60 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <span className="font-semibold">0:{String(idx * 15).padStart(2, '0')}</span>
                  <span className="mx-1 text-zinc-600">·</span>
                  <span>{hasDub ? 'MP3 Siap' : 'Teks'}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Export Video Modal */}
      {exportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-xl border border-zinc-800 bg-[#111114] p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Film className="w-5 h-5 text-amber-500" />
                <h2 className="font-display text-base font-bold text-zinc-100">
                  Export Video 9:16 (1080×1920 · 30 FPS)
                </h2>
              </div>
              {!isExporting && (
                <button
                  type="button"
                  onClick={onCloseExportModal}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="space-y-3 text-sm text-zinc-300">
              <p className="text-xs text-zinc-400 leading-relaxed">
                Merekam kanvas 1080×1920 @ 30 FPS bersama dubbing MP3 dan SFX Web Audio API secara sinkron melalui{' '}
                <code className="font-mono text-amber-400">captureStream(30)</code> +{' '}
                <code className="font-mono text-amber-400">MediaRecorder</code>.
              </p>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={() => setExportScope('full60')}
                  className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                    exportScope === 'full60'
                      ? 'border-amber-500 bg-amber-500/10 text-zinc-100'
                      : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <div className="text-xs font-semibold">Episode Penuh (60s)</div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">Scene 1 – 4 lengkap</div>
                </button>
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={() => setExportScope('scene15')}
                  className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                    exportScope === 'scene15'
                      ? 'border-amber-500 bg-amber-500/10 text-zinc-100'
                      : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <div className="text-xs font-semibold">Scene Aktif ({activeScene.sceneNumber} · 15s)</div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">Tes cepat 1 scene</div>
                </button>
              </div>
            </div>

            {isExporting && (
              <div className="space-y-2 p-4 rounded-lg border border-zinc-800 bg-zinc-950">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-amber-400 font-medium">Merekam kanvas & audio real-time...</span>
                  <span className="font-mono text-zinc-200">{exportProgress}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-amber-500 transition-[width] duration-150"
                    style={{ width: `${exportProgress}%` }}
                  />
                </div>
                <p className="text-[11px] text-zinc-400">
                  Jangan tutup tab ini selama proses perekaman berlangsung.
                </p>
              </div>
            )}

            {exportError && (
              <div className="p-3 rounded-lg border border-red-500/40 bg-red-950/40 text-xs text-red-200">
                {exportError}
              </div>
            )}

            {exportedVideoUrl && !isExporting && (
              <div className="space-y-3 p-3 rounded-lg border border-emerald-500/30 bg-emerald-950/20">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-emerald-300 font-semibold">
                    Render selesai ({exportedMimeLabel})
                  </span>
                  <a
                    href={exportedVideoUrl}
                    download={`indis-ep${episode.episodeNumber}-${exportScope}.${
                      exportedMimeLabel.includes('MP4') ? 'mp4' : 'webm'
                    }`}
                    className="px-3 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Video
                  </a>
                </div>
                <video
                  src={exportedVideoUrl}
                  controls
                  className="w-full max-h-64 rounded-lg bg-black border border-zinc-800"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              {isExporting ? (
                <button
                  type="button"
                  onClick={handleCancelExport}
                  className="px-4 py-2 rounded-lg border border-red-500/40 bg-red-950/40 text-red-200 text-xs font-semibold hover:bg-red-900/50 cursor-pointer"
                >
                  Batalkan Render
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onCloseExportModal}
                    className="px-4 py-2 rounded-lg border border-zinc-800 text-zinc-300 text-xs font-medium hover:bg-zinc-900 cursor-pointer"
                  >
                    Tutup
                  </button>
                  <button
                    type="button"
                    onClick={handleStartExport}
                    className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-semibold cursor-pointer"
                  >
                    Mulai Render & Rekam
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
