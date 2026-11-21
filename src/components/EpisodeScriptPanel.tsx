import React, { useState } from 'react';
import { FileText, Link2, Plus, Sparkles, Trash2, Upload } from 'lucide-react';
import {
  autoHighlightWords,
  inferActionCue,
  parseRawScriptToEpisode,
} from '../data/episodes';
import {
  AudioSlotData,
  CharacterActionCue,
  EpisodeConfig,
  PopupColor,
  SceneConfig,
} from '../types/studio';

interface EpisodeScriptPanelProps {
  episodes: EpisodeConfig[];
  selectedEpisodeId: string;
  activeSceneIdx: 0 | 1 | 2 | 3;
  audioSlots: [AudioSlotData, AudioSlotData, AudioSlotData, AudioSlotData];
  onSelectEpisode: (epId: string) => void;
  onCreateEpisode: (newEp: EpisodeConfig) => void;
  onUpdateScene: (sceneIdx: 0 | 1 | 2 | 3, updated: SceneConfig) => void;
  onJumpToScene: (sceneIdx: 0 | 1 | 2 | 3) => void;
  onSyncSceneToAudio: (sceneIndex: 0 | 1 | 2 | 3) => void;
}

const ACTION_CUE_OPTIONS: Array<{ value: CharacterActionCue; label: string }> = [
  { value: 'point', label: 'Menunjuk / Bicara' },
  { value: 'idle', label: 'Diam Bernapas' },
  { value: 'hop', label: 'Melompat (Boing)' },
  { value: 'plank', label: 'Tengkurap / Lemas' },
  { value: 'sip_coffee', label: 'Menyeruput Kopi' },
  { value: 'laugh', label: 'Tertawa / Cekikikan' },
  { value: 'inhale_smoke', label: 'Mengisap Cerutu' },
  { value: 'sneak', label: 'Mengendap / Lari' },
  { value: 'shock', label: 'Kaget / Melongo' },
  { value: 'gavel_slam', label: 'Ketok Palu / Meja' },
  { value: 'dance', label: 'Joget Gemoy' },
  { value: 'rub_eyes', label: 'Mengucek Mata' },
  { value: 'type_fast', label: 'Mengetik Cepat HP' },
  { value: 'wave_smug', label: 'Melambai Anggun' },
];

export const EpisodeScriptPanel: React.FC<EpisodeScriptPanelProps> = ({
  episodes,
  selectedEpisodeId,
  activeSceneIdx,
  audioSlots,
  onSelectEpisode,
  onCreateEpisode,
  onUpdateScene,
  onJumpToScene,
  onSyncSceneToAudio,
}) => {
  const currentEpisode = episodes.find((e) => e.id === selectedEpisodeId) ?? episodes[0];
  const currentScene = currentEpisode.scenes[activeSceneIdx];
  const activeSlot = audioSlots[activeSceneIdx];

  const [showCreator, setShowCreator] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [rawScript, setRawScript] = useState(
    "Scene 1\nNARATOR: Di Kelurahan Indis, rapat dimulai tepat jam karet.\nPOCI: Kun, berkasnya hilang lagi!\nKUN-KUN: Hihihi... santai aja, Ci.\nScene 2\nPAK GENDU: Ini efisiensi anggaran!\nPOCI: Loh, kok jadi tahu putih?\nScene 3\nTUYUL: Saldo sudah nol, Pak.\nKUN-KUN: Servernya kesurupan lagi.\nScene 4\nNARATOR: Warga pun mulai bergerak menuju balai kelurahan.\nPOCI: Bersambung!"
  );

  const handleUploadTxt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setRawScript(text);
    if (!newTitle.trim()) {
      setNewTitle(file.name.replace(/\.txt$/i, ''));
    }
  };

  const handleBuildNewEpisode = (e: React.FormEvent) => {
    e.preventDefault();
    const ep = parseRawScriptToEpisode(
      newTitle.trim() || `Episode Kustom ${episodes.length + 1}`,
      rawScript,
      episodes.length + 1
    );
    onCreateEpisode(ep);
    setShowCreator(false);
    setNewTitle('');
  };

  const updateDialogueField = (
    lineIdx: number,
    field: 'speaker' | 'text' | 'highlightWords' | 'actionCue' | 'startSec' | 'endSec',
    value: string | number
  ) => {
    const nextDialogues = currentScene.dialogues.map((d, idx) => {
      if (idx !== lineIdx) return d;
      if (field === 'highlightWords') {
        return {
          ...d,
          highlightWords: String(value)
            .split(',')
            .map((w) => w.trim())
            .filter(Boolean),
        };
      }
      if (field === 'startSec') {
        const s = Math.max(0, Math.min(14.5, Number(value) || 0));
        return { ...d, startSec: s, endSec: Math.max(s + 0.3, d.endSec) };
      }
      if (field === 'endSec') {
        const e = Math.max(d.startSec + 0.3, Math.min(15, Number(value) || 1));
        return { ...d, endSec: e };
      }
      if (field === 'actionCue') {
        return { ...d, actionCue: value as CharacterActionCue };
      }
      if (field === 'text') {
        const textVal = String(value);
        const autoCue = inferActionCue(d.speaker, textVal);
        const autoHl = d.highlightWords.length === 0 ? autoHighlightWords(textVal) : d.highlightWords;
        return { ...d, text: textVal, actionCue: autoCue, highlightWords: autoHl };
      }
      if (field === 'speaker') {
        const speakerVal = String(value);
        return {
          ...d,
          speaker: speakerVal,
          actionCue: inferActionCue(speakerVal, d.text),
        };
      }
      return d;
    });
    onUpdateScene(activeSceneIdx, { ...currentScene, dialogues: nextDialogues });
  };

  const addDialogueLine = () => {
    const lastEnd =
      currentScene.dialogues.length > 0
        ? currentScene.dialogues[currentScene.dialogues.length - 1].endSec
        : 0.5;
    const startSec = Math.min(13.5, Number((lastEnd + 0.3).toFixed(2)));
    const endSec = Math.min(14.8, Number((startSec + 2.5).toFixed(2)));
    const text = 'Dialog baru di adegan ini...';
    const next = [
      ...currentScene.dialogues,
      {
        id: `s${activeSceneIdx + 1}_d${Date.now()}`,
        speaker: 'POCI',
        text,
        startSec,
        endSec,
        highlightWords: ['baru'],
        actionCue: inferActionCue('POCI', text),
      },
    ];
    onUpdateScene(activeSceneIdx, { ...currentScene, dialogues: next });
  };

  const removeDialogueLine = (lineIdx: number) => {
    if (currentScene.dialogues.length <= 1) return;
    const next = currentScene.dialogues.filter((_, idx) => idx !== lineIdx);
    onUpdateScene(activeSceneIdx, { ...currentScene, dialogues: next });
  };

  return (
    <div className="space-y-5">
      {/* Preset Episode Picker */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <label
            htmlFor="episode-select"
            className="text-xs font-semibold text-zinc-200 tracking-wide"
          >
            Pilih Episode Preset (1–15)
          </label>
          <button
            type="button"
            onClick={() => setShowCreator((s) => !s)}
            className="px-2.5 py-1 rounded-md bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-1 cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            Buat Episode Baru
          </button>
        </div>

        <select
          id="episode-select"
          value={selectedEpisodeId}
          onChange={(e) => onSelectEpisode(e.target.value)}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
        >
          {episodes.map((ep) => (
            <option key={ep.id} value={ep.id}>
              Ep {ep.episodeNumber}: {ep.title}
            </option>
          ))}
        </select>

        <p className="text-xs text-zinc-400 leading-relaxed">
          {currentEpisode.inspiration}
        </p>
      </div>

      {/* Create New / Paste Raw Script (.txt) */}
      {showCreator && (
        <form
          onSubmit={handleBuildNewEpisode}
          className="p-3.5 rounded-xl border border-emerald-500/30 bg-zinc-950 space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              Editor Naskah Baru (.txt / Paste)
            </span>
            <label className="px-2.5 py-1 rounded border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-[11px] text-zinc-200 cursor-pointer flex items-center gap-1">
              <Upload className="w-3 h-3" />
              Impor .txt
              <input
                type="file"
                accept=".txt,text/plain"
                onChange={handleUploadTxt}
                className="hidden"
              />
            </label>
          </div>

          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Judul Episode Baru..."
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500"
          />

          <textarea
            value={rawScript}
            onChange={(e) => setRawScript(e.target.value)}
            rows={6}
            placeholder="Tempel naskah lengkap di sini. Gunakan Scene 1..4 atau biarkan auto-split..."
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 font-mono leading-relaxed placeholder:text-zinc-500"
          />

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCreator(false)}
              className="px-3 py-1.5 rounded-lg border border-zinc-800 text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Auto-Split ke 4 Scene
            </button>
          </div>
        </form>
      )}

      {/* Scene 1-4 Selector Tabs */}
      <div className="border-t border-zinc-800 pt-4 space-y-3">
        <div className="grid grid-cols-4 gap-1.5">
          {([0, 1, 2, 3] as const).map((idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onJumpToScene(idx)}
              className={`py-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                activeSceneIdx === idx
                  ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Scene {idx + 1}
            </button>
          ))}
        </div>

        <div className="space-y-2.5">
          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1">
              Judul Scene {currentScene.sceneNumber}
            </label>
            <input
              type="text"
              value={currentScene.title}
              onChange={(e) =>
                onUpdateScene(activeSceneIdx, { ...currentScene, title: e.target.value })
              }
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-100"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1">
              Pengarahan Visual & Aksi Animasi (Otomatis Menggerakkan Karakter & Properti)
            </label>
            <textarea
              rows={2}
              value={currentScene.visualDesc}
              onChange={(e) =>
                onUpdateScene(activeSceneIdx, { ...currentScene, visualDesc: e.target.value })
              }
              placeholder="Contoh: Poci melompat menghindari tetesan, Tuyul mengendap, asap hijau keluar..."
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-100 leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                Pop-Up UI Banner
              </label>
              <input
                type="text"
                value={currentScene.popup.text}
                onChange={(e) =>
                  onUpdateScene(activeSceneIdx, {
                    ...currentScene,
                    popup: { ...currentScene.popup, text: e.target.value },
                  })
                }
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-100"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                Warna Pop-Up
              </label>
              <select
                value={currentScene.popup.color}
                onChange={(e) =>
                  onUpdateScene(activeSceneIdx, {
                    ...currentScene,
                    popup: { ...currentScene.popup, color: e.target.value as PopupColor },
                  })
                }
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-100"
              >
                <option value="red">Merah</option>
                <option value="yellow">Kuning</option>
                <option value="blue">Biru</option>
                <option value="green">Hijau</option>
                <option value="stamp">Stempel</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1">
              Kotak Editorial “ARSIP KELAM INDIS” (Opsional)
            </label>
            <input
              type="text"
              value={currentScene.arsipBoxText ?? ''}
              placeholder="Kosongkan jika tidak tampil di scene ini..."
              onChange={(e) =>
                onUpdateScene(activeSceneIdx, {
                  ...currentScene,
                  arsipBoxText: e.target.value || undefined,
                })
              }
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600"
            />
          </div>
        </div>
      </div>

      {/* Editable Dialogue Lines, Timing, Gesture Cue & Subtitle Highlighting */}
      <div className="border-t border-zinc-800 pt-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold text-zinc-200">
            Dialog, Timing & Aksi Karakter
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onSyncSceneToAudio(activeSceneIdx)}
              className="px-2 py-1 rounded bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-[11px] text-emerald-300 font-medium flex items-center gap-1 cursor-pointer"
            >
              <Link2 className="w-3 h-3" />
              {activeSlot?.buffer ? 'Kunci ke MP3' : 'Ratakan Waktu'}
            </button>
            <button
              type="button"
              onClick={addDialogueLine}
              className="text-xs text-amber-400 hover:text-amber-300 font-medium cursor-pointer"
            >
              + Baris
            </button>
          </div>
        </div>

        <div className="space-y-2.5">
          {currentScene.dialogues.map((line, idx) => (
            <div
              key={line.id}
              className="p-2.5 rounded-lg border border-zinc-800 bg-zinc-950 space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <input
                  type="text"
                  value={line.speaker}
                  onChange={(e) => updateDialogueField(idx, 'speaker', e.target.value)}
                  className="w-28 rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-[11px] font-semibold text-amber-400"
                />
                <div className="flex items-center gap-1 text-[11px] font-mono text-zinc-400">
                  <input
                    type="number"
                    min={0}
                    max={14.5}
                    step={0.1}
                    value={line.startSec}
                    onChange={(e) => updateDialogueField(idx, 'startSec', e.target.value)}
                    aria-label="Waktu mulai dialog"
                    className="w-14 rounded border border-zinc-800 bg-zinc-900 px-1.5 py-0.5 text-center text-zinc-200 tabular-nums"
                  />
                  <span>–</span>
                  <input
                    type="number"
                    min={0.3}
                    max={15}
                    step={0.1}
                    value={line.endSec}
                    onChange={(e) => updateDialogueField(idx, 'endSec', e.target.value)}
                    aria-label="Waktu selesai dialog"
                    className="w-14 rounded border border-zinc-800 bg-zinc-900 px-1.5 py-0.5 text-center text-zinc-200 tabular-nums"
                  />
                  <span>s</span>
                </div>
                {currentScene.dialogues.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeDialogueLine(idx)}
                    aria-label="Hapus baris dialog"
                    className="p-1 text-zinc-500 hover:text-red-400 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <textarea
                rows={2}
                value={line.text}
                onChange={(e) => updateDialogueField(idx, 'text', e.target.value)}
                className="w-full rounded border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-100 leading-relaxed"
              />

              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-zinc-500 shrink-0">Gerak:</span>
                  <select
                    value={line.actionCue ?? 'point'}
                    onChange={(e) => updateDialogueField(idx, 'actionCue', e.target.value)}
                    className="w-full rounded border border-zinc-800 bg-zinc-900 px-1.5 py-1 text-[11px] text-zinc-200"
                  >
                    {ACTION_CUE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-zinc-500 shrink-0">Sorot:</span>
                  <input
                    type="text"
                    value={line.highlightWords.join(', ')}
                    onChange={(e) => updateDialogueField(idx, 'highlightWords', e.target.value)}
                    placeholder="kata penting..."
                    className="w-full rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-[11px] text-amber-300"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
