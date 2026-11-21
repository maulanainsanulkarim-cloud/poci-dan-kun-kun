import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Play, Square, Trash2, UploadCloud } from 'lucide-react';
import { studioAudio } from '../engine/audioEngine';
import { AudioSlotData } from '../types/studio';

interface DubbingPanelProps {
  audioSlots: [AudioSlotData, AudioSlotData, AudioSlotData, AudioSlotData];
  onAssignAudioSlot: (sceneIndex: 0 | 1 | 2 | 3, slot: AudioSlotData) => void;
  onClearAudioSlot: (sceneIndex: 0 | 1 | 2 | 3) => void;
}

export const DubbingPanel: React.FC<DubbingPanelProps> = ({
  audioSlots,
  onAssignAudioSlot,
  onClearAudioSlot,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [testingSlot, setTestingSlot] = useState<number | null>(null);
  const [testVu, setTestVu] = useState(0);
  const [decodeError, setDecodeError] = useState<string | null>(null);

  const emptyCount = audioSlots.filter((s) => !s.buffer).length;

  useEffect(() => {
    if (testingSlot === null) {
      setTestVu(0);
      return;
    }
    let raf = 0;
    const poll = () => {
      setTestVu(studioAudio.getLiveVuLevel());
      raf = requestAnimationFrame(poll);
    };
    raf = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(raf);
  }, [testingSlot]);

  const inferTargetSlotIndex = (fileName: string, fallbackListIdx: number): 0 | 1 | 2 | 3 => {
    const lower = fileName.toLowerCase();
    if (/(?:^|[^0-9])s?1(?:[^0-9]|$)|scene[\s_-]*1/.test(lower)) return 0;
    if (/(?:^|[^0-9])s?2(?:[^0-9]|$)|scene[\s_-]*2/.test(lower)) return 1;
    if (/(?:^|[^0-9])s?3(?:[^0-9]|$)|scene[\s_-]*3/.test(lower)) return 2;
    if (/(?:^|[^0-9])s?4(?:[^0-9]|$)|scene[\s_-]*4/.test(lower)) return 3;
    return Math.min(3, Math.max(0, fallbackListIdx)) as 0 | 1 | 2 | 3;
  };

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setDecodeError(null);
    const files = Array.from(fileList).slice(0, 4);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const targetIdx = inferTargetSlotIndex(file.name, i);
      try {
        const decoded = await studioAudio.decodeAudioFile(file, targetIdx);
        onAssignAudioSlot(targetIdx, decoded);
      } catch (err: unknown) {
        setDecodeError(
          `Gagal membaca ${file.name}: ${
            err instanceof Error ? err.message : 'Format audio tidak didukung.'
          }`
        );
      }
    }
  };

  const handleSingleSlotUpload = async (
    sceneIdx: 0 | 1 | 2 | 3,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDecodeError(null);
    try {
      const decoded = await studioAudio.decodeAudioFile(file, sceneIdx);
      onAssignAudioSlot(sceneIdx, decoded);
    } catch (err: unknown) {
      setDecodeError(
        `Gagal membaca ${file.name}: ${
          err instanceof Error ? err.message : 'Format audio tidak didukung.'
        }`
      );
    }
  };

  const handleToggleTest = (idx: 0 | 1 | 2 | 3) => {
    const slot = audioSlots[idx];
    if (!slot.buffer) return;
    if (testingSlot === idx) {
      studioAudio.stopDubbing();
      setTestingSlot(null);
    } else {
      studioAudio.playDubbingSlot(slot.buffer, 0);
      setTestingSlot(idx);
    }
  };

  return (
    <div className="space-y-4">
      {/* Batch Drag & Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          void handleFiles(e.dataTransfer.files);
        }}
        className={`rounded-xl border border-dashed p-5 text-center transition-colors ${
          isDragging
            ? 'border-amber-400 bg-amber-500/10'
            : 'border-zinc-700 bg-zinc-950 hover:border-zinc-500'
        }`}
      >
        <UploadCloud className="w-7 h-7 text-amber-500 mx-auto mb-2" />
        <p className="text-xs font-semibold text-zinc-100">
          Seret & Lepas 4 File Dubbing Sekaligus (s1.mp3 – s4.mp3)
        </p>
        <p className="text-[11px] text-zinc-400 mt-1">
          Auto-mapping otomatis berdasarkan nama file ke Scene 1–4 & ekstraksi lip-sync 30 FPS.
        </p>
        <label className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-100 cursor-pointer">
          Pilih File MP3 / WAV
          <input
            type="file"
            multiple
            accept="audio/*"
            onChange={(e) => void handleFiles(e.target.files)}
            className="hidden"
          />
        </label>
      </div>

      {/* Empty Slot Warning */}
      {emptyCount > 0 && (
        <div className="p-3 rounded-lg border border-amber-500/35 bg-amber-950/25 flex items-start gap-2.5 text-xs text-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">{emptyCount} slot dubbing masih kosong.</span>{' '}
            <span className="text-amber-300/80">
              Lip-sync akan otomatis menggunakan ritme dialog teks sampai MP3 diunggah.
            </span>
          </div>
        </div>
      )}

      {decodeError && (
        <div className="p-3 rounded-lg border border-red-500/40 bg-red-950/30 text-xs text-red-200">
          {decodeError}
        </div>
      )}

      {/* Individual Slot Cards */}
      <div className="space-y-3">
        {audioSlots.map((slot, idx) => {
          const sceneIdx = idx as 0 | 1 | 2 | 3;
          const isTesting = testingSlot === idx;
          return (
            <div
              key={idx}
              className="p-3 rounded-xl border border-zinc-800 bg-zinc-950 space-y-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {slot.buffer ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-zinc-500 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-zinc-100 truncate">
                      Slot Scene {idx + 1} (s{idx + 1}.mp3)
                    </div>
                    <div className="text-[11px] font-mono text-zinc-400 truncate">
                      {slot.fileName
                        ? `${slot.fileName} · ${slot.duration.toFixed(1)}s`
                        : 'Belum ada audio'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <label className="px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[11px] text-zinc-300 cursor-pointer">
                    Pilih
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={(e) => void handleSingleSlotUpload(sceneIdx, e)}
                      className="hidden"
                    />
                  </label>
                  {slot.buffer && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleToggleTest(sceneIdx)}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer ${
                          isTesting
                            ? 'bg-amber-500 text-zinc-950'
                            : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25'
                        }`}
                      >
                        {isTesting ? (
                          <Square className="w-3 h-3" />
                        ) : (
                          <Play className="w-3 h-3" />
                        )}
                        {isTesting ? 'Stop' : 'Tes'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (isTesting) {
                            studioAudio.stopDubbing();
                            setTestingSlot(null);
                          }
                          onClearAudioSlot(sceneIdx);
                        }}
                        aria-label={`Hapus audio scene ${idx + 1}`}
                        className="p-1.5 rounded bg-zinc-900 hover:bg-red-950/50 border border-zinc-800 text-zinc-400 hover:text-red-300 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Waveform Bars + Live VU during Tes */}
              {slot.buffer && (
                <div className="space-y-1.5">
                  <div className="h-9 bg-zinc-900/90 rounded-lg px-2 flex items-center gap-[2px] overflow-hidden border border-zinc-800/80">
                    {slot.waveformPeaks.slice(0, 64).map((peak, pIdx) => (
                      <div
                        key={pIdx}
                        className="flex-1 bg-amber-500/80 rounded-full"
                        style={{ height: `${Math.max(12, Math.round(peak * 100))}%` }}
                      />
                    ))}
                  </div>
                  {isTesting && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-emerald-400">LIVE VU</span>
                      <div className="flex-1 h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-400 transition-[width] duration-75"
                          style={{ width: `${Math.round(testVu * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
