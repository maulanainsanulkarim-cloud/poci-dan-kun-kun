import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { AIDirectorPanel } from './components/AIDirectorPanel';
import { CanvasStage } from './components/CanvasStage';
import { CharacterScenePanel } from './components/CharacterScenePanel';
import { DubbingPanel } from './components/DubbingPanel';
import { EpisodeScriptPanel } from './components/EpisodeScriptPanel';
import { StudioTabId, TopBar } from './components/TopBar';
import { INITIAL_CHARACTERS } from './data/characters';
import { PRESET_EPISODES } from './data/episodes';
import { studioAudio } from './engine/audioEngine';
import {
  AIDirectiveResponse,
  AudioSlotData,
  CharacterProfile,
  EpisodeConfig,
  SceneConfig,
} from './types/studio';

function makeEmptySlot(sceneIndex: 0 | 1 | 2 | 3): AudioSlotData {
  return {
    sceneIndex,
    fileName: null,
    duration: 0,
    buffer: null,
    envelope30Fps: [],
    waveformPeaks: [],
  };
}

function createEmptyAudioSlots(): [
  AudioSlotData,
  AudioSlotData,
  AudioSlotData,
  AudioSlotData,
] {
  return [
    makeEmptySlot(0),
    makeEmptySlot(1),
    makeEmptySlot(2),
    makeEmptySlot(3),
  ];
}

export default function App() {
  const [episodes, setEpisodes] = useState<EpisodeConfig[]>(() => PRESET_EPISODES);
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string>(
    PRESET_EPISODES[0].id
  );
  const [characters, setCharacters] = useState<CharacterProfile[]>(() => INITIAL_CHARACTERS);
  const [audioSlots, setAudioSlots] = useState<
    [AudioSlotData, AudioSlotData, AudioSlotData, AudioSlotData]
  >(() => createEmptyAudioSlots());

  const [activeTab, setActiveTab] = useState<StudioTabId>('script');
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [showWatermark, setShowWatermark] = useState<boolean>(true);
  const [cameraAutoZoom, setCameraAutoZoom] = useState<boolean>(true);
  const [exportModalOpen, setExportModalOpen] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const currentEpisode =
    episodes.find((e) => e.id === selectedEpisodeId) ?? episodes[0];
  const activeSceneIdx = Math.min(3, Math.floor(currentTime / 15)) as 0 | 1 | 2 | 3;
  const activeScene = currentEpisode.scenes[activeSceneIdx];
  const sceneLocalTime = currentTime - activeSceneIdx * 15;

  const lastSceneAudioRef = useRef<number>(-1);

  const syncDubbingAudioForTime = useCallback(
    (timeSec: number, shouldPlay: boolean) => {
      if (!shouldPlay) {
        studioAudio.stopDubbing();
        lastSceneAudioRef.current = -1;
        return;
      }
      const scIdx = Math.min(3, Math.floor(timeSec / 15)) as 0 | 1 | 2 | 3;
      const offset = timeSec - scIdx * 15;
      if (lastSceneAudioRef.current !== scIdx) {
        lastSceneAudioRef.current = scIdx;
        const buf = audioSlots[scIdx]?.buffer;
        if (buf) {
          studioAudio.playDubbingSlot(buf, offset);
        } else {
          studioAudio.stopDubbing();
        }
      }
    },
    [audioSlots]
  );

  // 30 FPS playback loop
  useEffect(() => {
    if (!isPlaying || isExporting) return;
    let rafId = 0;
    let lastPerf = performance.now();

    syncDubbingAudioForTime(currentTime, true);

    const tick = (now: number) => {
      const dt = (now - lastPerf) / 1000;
      lastPerf = now;
      setCurrentTime((prev) => {
        const next = prev + dt;
        if (next >= 60) {
          setIsPlaying(false);
          studioAudio.stopDubbing();
          lastSceneAudioRef.current = -1;
          return 0;
        }
        const nextSc = Math.min(3, Math.floor(next / 15));
        if (nextSc !== lastSceneAudioRef.current) {
          syncDubbingAudioForTime(next, true);
        }
        return next;
      });
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      studioAudio.stopDubbing();
      lastSceneAudioRef.current = -1;
    };
  }, [isPlaying, isExporting, syncDubbingAudioForTime]);

  const handleTogglePlay = () => {
    studioAudio.ensureContext();
    setIsPlaying((p) => !p);
  };

  const handleSeek = (sec: number) => {
    const clamped = Math.max(0, Math.min(59.96, sec));
    setCurrentTime(clamped);
    if (isPlaying) {
      lastSceneAudioRef.current = -1;
      syncDubbingAudioForTime(clamped, true);
    }
  };

  const handleReplay = () => {
    studioAudio.ensureContext();
    lastSceneAudioRef.current = -1;
    setCurrentTime(0);
    setIsPlaying(true);
  };

  const handleJumpToScene = (sceneIdx: 0 | 1 | 2 | 3) => {
    handleSeek(sceneIdx * 15);
  };

  const handleSelectEpisode = (epId: string) => {
    setIsPlaying(false);
    setSelectedEpisodeId(epId);
    setCurrentTime(0);
  };

  const handleCreateEpisode = (newEp: EpisodeConfig) => {
    setEpisodes((prev) => [newEp, ...prev]);
    setSelectedEpisodeId(newEp.id);
    setCurrentTime(0);
    setIsPlaying(false);
  };

  const handleUpdateScene = (sceneIdx: 0 | 1 | 2 | 3, updatedScene: SceneConfig) => {
    setEpisodes((prev) =>
      prev.map((ep) => {
        if (ep.id !== selectedEpisodeId) return ep;
        const nextScenes = [...ep.scenes] as [
          SceneConfig,
          SceneConfig,
          SceneConfig,
          SceneConfig,
        ];
        nextScenes[sceneIdx] = updatedScene;
        return { ...ep, scenes: nextScenes };
      })
    );
  };

  const handleUpdateWatermarkText = (text: string) => {
    setEpisodes((prev) =>
      prev.map((ep) =>
        ep.id === selectedEpisodeId ? { ...ep, watermarkText: text } : ep
      )
    );
  };

  const handleUpdateCharacter = (updatedChar: CharacterProfile) => {
    setCharacters((prev) =>
      prev.map((c) => (c.id === updatedChar.id ? updatedChar : c))
    );
  };

  const handleAssignAudioSlot = (sceneIndex: 0 | 1 | 2 | 3, slot: AudioSlotData) => {
    setAudioSlots((prev) => {
      const next = [...prev] as [
        AudioSlotData,
        AudioSlotData,
        AudioSlotData,
        AudioSlotData,
      ];
      next[sceneIndex] = slot;
      return next;
    });
  };

  const handleClearAudioSlot = (sceneIndex: 0 | 1 | 2 | 3) => {
    setAudioSlots((prev) => {
      const next = [...prev] as [
        AudioSlotData,
        AudioSlotData,
        AudioSlotData,
        AudioSlotData,
      ];
      next[sceneIndex] = {
        sceneIndex,
        fileName: null,
        duration: 0,
        buffer: null,
        envelope30Fps: [],
        waveformPeaks: [],
      };
      return next;
    });
  };

  const handleApplyAIDirective = (directive: AIDirectiveResponse) => {
    setEpisodes((prev) =>
      prev.map((ep) => {
        if (ep.id !== selectedEpisodeId) return ep;
        const nextScenes = [...ep.scenes] as [
          SceneConfig,
          SceneConfig,
          SceneConfig,
          SceneConfig,
        ];
        for (const patch of directive.scenePatches || []) {
          const idx = Math.max(0, Math.min(3, patch.sceneIndex)) as 0 | 1 | 2 | 3;
          const sc = { ...nextScenes[idx] };
          if (patch.weather) sc.weather = patch.weather;
          if (patch.lighting) sc.lighting = patch.lighting;
          if (patch.backgroundId) sc.backgroundId = patch.backgroundId;
          if (patch.transitionIn) sc.transitionIn = patch.transitionIn;
          if (patch.cameraAction) sc.cameraAction = patch.cameraAction;
          if (typeof patch.cameraShakeIntensity === 'number') {
            sc.cameraShakeIntensity = patch.cameraShakeIntensity;
          }
          if (patch.popupText || patch.popupColor) {
            sc.popup = {
              ...sc.popup,
              text: patch.popupText ?? sc.popup.text,
              color: patch.popupColor ?? sc.popup.color,
            };
          }
          if (patch.infoCardTitle || patch.infoCardBody) {
            sc.infoCard = {
              title: patch.infoCardTitle || 'INFO KELURAHAN INDIS',
              body: patch.infoCardBody || '',
              startSec: 1.5,
              endSec: 12.0,
            };
          }
          if (patch.arsipBoxText) {
            sc.arsipBoxText = patch.arsipBoxText;
          }
          if (patch.addCastIds && patch.addCastIds.length > 0) {
            const merged = new Set([...sc.cast, ...patch.addCastIds]);
            sc.cast = Array.from(merged).slice(0, 4);
          }
          if (patch.extraDialogueText) {
            sc.dialogues = [
              ...sc.dialogues,
              {
                id: `ai_${Date.now()}`,
                speaker: patch.extraDialogueSpeaker || 'POCI',
                text: patch.extraDialogueText,
                startSec: 11.2,
                endSec: 14.5,
                highlightWords: [],
              },
            ];
          }
          nextScenes[idx] = sc;
        }
        return {
          ...ep,
          watermarkText: directive.watermarkText ?? ep.watermarkText,
          scenes: nextScenes,
        };
      })
    );

    // Jump preview to first patched scene so user immediately sees the change
    if (directive.scenePatches && directive.scenePatches.length > 0) {
      const firstIdx = Math.max(0, Math.min(3, directive.scenePatches[0].sceneIndex));
      handleSeek(firstIdx * 15 + 2.5);
    }
  };

  const handleResetEpisodeToPreset = () => {
    const original = PRESET_EPISODES.find((p) => p.id === selectedEpisodeId);
    if (!original) return;
    setEpisodes((prev) =>
      prev.map((ep) => (ep.id === selectedEpisodeId ? original : ep))
    );
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[#09090B] text-zinc-100 overflow-hidden">
      <TopBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenExport={() => {
          setIsPlaying(false);
          setExportModalOpen(true);
        }}
        isExporting={isExporting}
      />

      {/* Mobile Tab Bar fallback (< md) */}
      <div className="flex md:hidden border-b border-zinc-800 bg-[#111114] px-2 py-1.5 gap-1 overflow-x-auto shrink-0">
        {(
          [
            { id: 'script', label: 'Naskah' },
            { id: 'dubbing', label: 'Dubbing' },
            { id: 'visual', label: 'Karakter & Latar' },
            { id: 'ai', label: 'Sutradara AI' },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={`px-3 py-1 rounded text-xs font-medium whitespace-nowrap ${
              activeTab === t.id
                ? 'bg-amber-500 text-zinc-950'
                : 'text-zinc-400 bg-zinc-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Main 3-Zone Studio Workspace */}
      <main className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* Left Control Panel */}
        <aside className="w-full lg:w-[390px] xl:w-[410px] border-b lg:border-b-0 lg:border-r border-zinc-800 bg-[#111114] overflow-y-auto p-4 shrink-0 max-h-[42vh] lg:max-h-none">
          {activeTab === 'script' && (
            <EpisodeScriptPanel
              episodes={episodes}
              selectedEpisodeId={selectedEpisodeId}
              activeSceneIdx={activeSceneIdx}
              onSelectEpisode={handleSelectEpisode}
              onCreateEpisode={handleCreateEpisode}
              onUpdateScene={handleUpdateScene}
              onJumpToScene={handleJumpToScene}
            />
          )}

          {activeTab === 'dubbing' && (
            <DubbingPanel
              audioSlots={audioSlots}
              onAssignAudioSlot={handleAssignAudioSlot}
              onClearAudioSlot={handleClearAudioSlot}
            />
          )}

          {activeTab === 'visual' && (
            <CharacterScenePanel
              characters={characters}
              onUpdateCharacter={handleUpdateCharacter}
              activeScene={activeScene}
              onUpdateScene={(updated) => handleUpdateScene(activeSceneIdx, updated)}
              watermarkText={currentEpisode.watermarkText}
              onChangeWatermarkText={handleUpdateWatermarkText}
            />
          )}

          {activeTab === 'ai' && (
            <AIDirectorPanel
              episode={currentEpisode}
              onApplyDirective={handleApplyAIDirective}
              onResetEpisodeToPreset={handleResetEpisodeToPreset}
            />
          )}
        </aside>

        {/* Center 9:16 Stage */}
        <CanvasStage
          episode={currentEpisode}
          characters={characters}
          audioSlots={audioSlots}
          currentTime={currentTime}
          isPlaying={isPlaying}
          showWatermark={showWatermark}
          cameraAutoZoom={cameraAutoZoom}
          onTogglePlay={handleTogglePlay}
          onSeek={handleSeek}
          onReplay={handleReplay}
          onToggleWatermark={() => setShowWatermark((w) => !w)}
          onToggleAutoZoom={() => setCameraAutoZoom((z) => !z)}
          exportModalOpen={exportModalOpen}
          onCloseExportModal={() => setExportModalOpen(false)}
          isExporting={isExporting}
          setIsExporting={setIsExporting}
        />

        {/* Right Scene Cue & SFX Inspector (Desktop xl) */}
        <aside className="hidden xl:flex xl:w-[300px] flex-col border-l border-zinc-800 bg-[#111114] p-4 overflow-y-auto shrink-0 space-y-5">
          <div className="space-y-1.5">
            <div className="text-[11px] font-mono text-amber-400">
              EPISODE {String(currentEpisode.episodeNumber).padStart(2, '0')} · SCENE{' '}
              {activeScene.sceneNumber}
            </div>
            <h2 className="font-display text-sm font-bold text-zinc-100 leading-snug">
              {currentEpisode.title}
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {activeScene.locationDesc}
            </p>
          </div>

          <div className="border-t border-zinc-800 pt-4 space-y-2">
            <h3 className="text-xs font-semibold text-zinc-200">
              Cue Sheet Dialog (Scene {activeScene.sceneNumber})
            </h3>
            <div className="space-y-2">
              {activeScene.dialogues.map((d) => {
                const isActive =
                  sceneLocalTime >= d.startSec && sceneLocalTime <= d.endSec;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => handleSeek(activeSceneIdx * 15 + d.startSec + 0.05)}
                    className={`w-full text-left p-2.5 rounded-lg border transition-colors cursor-pointer ${
                      isActive
                        ? 'border-amber-500/50 bg-amber-500/10'
                        : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-semibold text-amber-400">{d.speaker}</span>
                      <span className="font-mono text-zinc-500">
                        {d.startSec.toFixed(1)}s
                      </span>
                    </div>
                    <p className="text-xs text-zinc-200 leading-relaxed">{d.text}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-zinc-800 pt-4 space-y-2">
            <h3 className="text-xs font-semibold text-zinc-200">
              Tes Efek Suara Web Audio (SFX)
            </h3>
            <div className="grid grid-cols-2 gap-1.5">
              {(
                [
                  { id: 'boing', label: 'Boing Lompat' },
                  { id: 'pop', label: 'Pop Notif' },
                  { id: 'giggle', label: 'Tawa Kunti' },
                  { id: 'gavel', label: 'Palu Sidang' },
                  { id: 'coin', label: 'Koin Tuyul' },
                  { id: 'error', label: 'Server Error' },
                  { id: 'camera', label: 'Cekrek Foto' },
                  { id: 'stamp', label: 'Stempel Akhir' },
                ] as const
              ).map((sfx) => (
                <button
                  key={sfx.id}
                  type="button"
                  onClick={() => studioAudio.triggerSfx(sfx.id)}
                  className="px-2.5 py-1.5 rounded-lg border border-zinc-800 bg-zinc-950 hover:border-zinc-700 hover:text-amber-300 text-[11px] text-zinc-300 flex items-center gap-1.5 cursor-pointer"
                >
                  <Volume2 className="w-3 h-3 text-amber-500 shrink-0" />
                  <span className="truncate">{sfx.label}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
