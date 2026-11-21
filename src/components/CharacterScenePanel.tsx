import React, { useState } from 'react';
import { ImagePlus, Trash2, UserCheck } from 'lucide-react';
import {
  BACKGROUND_PRESETS,
  LIGHTING_OPTIONS,
  WEATHER_OPTIONS,
} from '../engine/backgrounds';
import {
  BackgroundPresetId,
  CameraActionMode,
  CharacterMotionEnergy,
  CharacterProfile,
  CharacterRigStyle,
  LightingPreset,
  SceneConfig,
  TransitionType,
  WeatherType,
} from '../types/studio';

interface CharacterScenePanelProps {
  characters: CharacterProfile[];
  onUpdateCharacter: (char: CharacterProfile) => void;
  activeScene: SceneConfig;
  onUpdateScene: (updated: SceneConfig) => void;
  watermarkText: string;
  onChangeWatermarkText: (text: string) => void;
}

export const CharacterScenePanel: React.FC<CharacterScenePanelProps> = ({
  characters,
  onUpdateCharacter,
  activeScene,
  onUpdateScene,
  watermarkText,
  onChangeWatermarkText,
}) => {
  const [selectedCharId, setSelectedCharId] = useState<string>(characters[0]?.id ?? 'poci');
  const selectedChar =
    characters.find((c) => c.id === selectedCharId) ?? characters[0];

  const handleUploadCharRef = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onUpdateCharacter({ ...selectedChar, referenceImageUrl: reader.result });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUploadCustomBg = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onUpdateScene({
          ...activeScene,
          backgroundId: 'custom',
          customBackgroundUrl: reader.result,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const toggleCastMember = (charId: string) => {
    const exists = activeScene.cast.includes(charId);
    const nextCast = exists
      ? activeScene.cast.filter((id) => id !== charId)
      : [...activeScene.cast, charId].slice(0, 4);
    onUpdateScene({
      ...activeScene,
      cast: nextCast.length > 0 ? nextCast : ['poci'],
    });
  };

  return (
    <div className="space-y-6">
      {/* Section 1: Scene Environment, Weather, Lighting & Transitions */}
      <div className="space-y-3">
        <h3 className="font-display text-xs font-bold text-zinc-200 tracking-wide">
          Latar, Cuaca & Transisi — Scene {activeScene.sceneNumber}
        </h3>

        <div className="space-y-2.5">
          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1">
              Gaya Latar (12+ Preset / Kustom)
            </label>
            <div className="flex gap-2">
              <select
                value={activeScene.backgroundId}
                onChange={(e) =>
                  onUpdateScene({
                    ...activeScene,
                    backgroundId: e.target.value as BackgroundPresetId,
                  })
                }
                className="flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-100"
              >
                {BACKGROUND_PRESETS.map((bg) => (
                  <option key={bg.id} value={bg.id}>
                    {bg.label}
                  </option>
                ))}
              </select>
              <label className="px-2.5 py-1.5 rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-xs text-zinc-200 cursor-pointer flex items-center gap-1 shrink-0">
                <ImagePlus className="w-3.5 h-3.5 text-amber-400" />
                Upload
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUploadCustomBg}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                Efek Cuaca
              </label>
              <select
                value={activeScene.weather}
                onChange={(e) =>
                  onUpdateScene({
                    ...activeScene,
                    weather: e.target.value as WeatherType,
                  })
                }
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-100"
              >
                {WEATHER_OPTIONS.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                Pencahayaan
              </label>
              <select
                value={activeScene.lighting}
                onChange={(e) =>
                  onUpdateScene({
                    ...activeScene,
                    lighting: e.target.value as LightingPreset,
                  })
                }
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-100"
              >
                {LIGHTING_OPTIONS.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                Transisi Masuk
              </label>
              <select
                value={activeScene.transitionIn}
                onChange={(e) =>
                  onUpdateScene({
                    ...activeScene,
                    transitionIn: e.target.value as TransitionType,
                  })
                }
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-100"
              >
                <option value="cut">Potong Langsung (Cut)</option>
                <option value="fade">Fade Hitam Halus</option>
                <option value="flash_white">Flash Putih Sinematik</option>
                <option value="slide_left">Geser Samping</option>
                <option value="zoom_whip">Zoom Whip Cepat</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                Kamera Sinematik
              </label>
              <select
                value={activeScene.cameraAction}
                onChange={(e) =>
                  onUpdateScene({
                    ...activeScene,
                    cameraAction: e.target.value as CameraActionMode,
                  })
                }
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-100"
              >
                <option value="auto">Otomatis (Ikuti Pembicara)</option>
                <option value="zoom_speaker">Zoom Dekat Pembicara</option>
                <option value="wide">Wide Shot Stabil</option>
                <option value="slow_pan">Panning Halus</option>
                <option value="dramatic_shake">Camera Shake Kaget</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">
              Pemeran di Scene {activeScene.sceneNumber} (maks. 4)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {characters.map((ch) => {
                const active = activeScene.cast.includes(ch.id);
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => toggleCastMember(ch.id)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors cursor-pointer ${
                      active
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {active && <UserCheck className="w-3 h-3 inline mr-1 -mt-0.5" />}
                    {ch.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1">
              Teks Watermark Pojok Layar
            </label>
            <input
              type="text"
              value={watermarkText}
              onChange={(e) => onChangeWatermarkText(e.target.value)}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-100"
            />
          </div>
        </div>
      </div>

      {/* Section 2: Flexible Character Sheet Editor */}
      <div className="border-t border-zinc-800 pt-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-display text-xs font-bold text-zinc-200 tracking-wide">
            Editor Karakter Tetap & Rig 2D
          </h3>
          <select
            value={selectedCharId}
            onChange={(e) => setSelectedCharId(e.target.value)}
            className="rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-xs text-amber-400 font-semibold"
          >
            {characters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-950 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">Tipe Rig IK</label>
              <select
                value={selectedChar.rigStyle}
                onChange={(e) =>
                  onUpdateCharacter({
                    ...selectedChar,
                    rigStyle: e.target.value as CharacterRigStyle,
                  })
                }
                className="w-full rounded border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-100"
              >
                <option value="pocong">Pocong (Lompat & Jambul)</option>
                <option value="kunti">Kunti (Melayang & Rambut)</option>
                <option value="genderuwo">Genderuwo (Besar & IK)</option>
                <option value="tuyul">Tuyul (Lincah & IK)</option>
                <option value="blorong">Blorong (Kebaya & Ekor)</option>
                <option value="human">Manusia Penuh (2-Bone IK)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">Energi Gerak</label>
              <select
                value={selectedChar.motionEnergy}
                onChange={(e) =>
                  onUpdateCharacter({
                    ...selectedChar,
                    motionEnergy: e.target.value as CharacterMotionEnergy,
                  })
                }
                className="w-full rounded border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-100"
              >
                <option value="energetic">Energi Tinggi & Ekspresif</option>
                <option value="graceful">Pelan & Anggun</option>
                <option value="heavy">Berat & Berwibawa</option>
                <option value="sneaky">Lincah & Mengendap</option>
                <option value="formal">Formal / Kaku</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-zinc-400 mb-1">Detail Visual</label>
            <textarea
              rows={2}
              value={selectedChar.visualDescription}
              onChange={(e) =>
                onUpdateCharacter({ ...selectedChar, visualDescription: e.target.value })
              }
              className="w-full rounded border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-100"
            />
          </div>

          <div>
            <label className="block text-[11px] text-zinc-400 mb-1">Kebiasaan Khas (Quirk)</label>
            <input
              type="text"
              value={selectedChar.signatureQuirk}
              onChange={(e) =>
                onUpdateCharacter({ ...selectedChar, signatureQuirk: e.target.value })
              }
              className="w-full rounded border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-100"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <label className="flex items-center justify-between rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-300">
              <span>Utama</span>
              <input
                type="color"
                value={selectedChar.primaryColor}
                onChange={(e) =>
                  onUpdateCharacter({ ...selectedChar, primaryColor: e.target.value })
                }
                className="w-5 h-5 bg-transparent cursor-pointer"
              />
            </label>
            <label className="flex items-center justify-between rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-300">
              <span>Sekunder</span>
              <input
                type="color"
                value={selectedChar.secondaryColor}
                onChange={(e) =>
                  onUpdateCharacter({ ...selectedChar, secondaryColor: e.target.value })
                }
                className="w-5 h-5 bg-transparent cursor-pointer"
              />
            </label>
            <label className="flex items-center justify-between rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-300">
              <span>Aksen</span>
              <input
                type="color"
                value={selectedChar.accentColor}
                onChange={(e) =>
                  onUpdateCharacter({ ...selectedChar, accentColor: e.target.value })
                }
                className="w-5 h-5 bg-transparent cursor-pointer"
              />
            </label>
          </div>

          {/* Official Puppet Rigging Sheet Reference Preview */}
          {selectedChar.referenceSheetUrl && (
            <div className="space-y-1.5 pt-1">
              <span className="block text-[11px] font-medium text-zinc-400">
                Referensi Puppet Sheet Aktif
              </span>
              <div className="rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900">
                <img
                  src={selectedChar.referenceSheetUrl}
                  alt={`Referensi puppet ${selectedChar.name}`}
                  className="w-full h-36 object-contain bg-white"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          )}

          {/* Custom Character Reference Image */}
          <div className="flex items-center justify-between pt-1">
            <label className="px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-xs text-zinc-200 cursor-pointer flex items-center gap-1.5">
              <ImagePlus className="w-3.5 h-3.5 text-emerald-400" />
              {selectedChar.referenceImageUrl
                ? 'Ganti Gambar Referensi'
                : 'Upload Gambar Referensi'}
              <input
                type="file"
                accept="image/*"
                onChange={handleUploadCharRef}
                className="hidden"
              />
            </label>

            {selectedChar.referenceImageUrl && (
              <button
                type="button"
                onClick={() =>
                  onUpdateCharacter({ ...selectedChar, referenceImageUrl: undefined })
                }
                className="px-2.5 py-1.5 rounded-lg border border-red-500/30 bg-red-950/30 text-xs text-red-300 hover:bg-red-900/40 flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Reset Rig
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
