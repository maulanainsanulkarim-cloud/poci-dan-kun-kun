export type VisemeType = 'closed' | 'smile' | 'o' | 'wide' | 'teeth' | 'tongue';

export type CharacterRigStyle =
  | 'pocong'
  | 'kunti'
  | 'genderuwo'
  | 'tuyul'
  | 'blorong'
  | 'human';

export type CharacterMotionEnergy = 'energetic' | 'graceful' | 'heavy' | 'sneaky' | 'formal';

export interface CharacterProfile {
  id: string;
  name: string;
  role: string;
  rigStyle: CharacterRigStyle;
  visualDescription: string;
  personalityMotion: string;
  motionEnergy: CharacterMotionEnergy;
  signatureQuirk: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  skinColor: string;
  hairColor: string;
  hasGlasses?: boolean;
  hasTie?: boolean;
  hasPacifier?: boolean;
  hasCigar?: boolean;
  hasClipboard?: boolean;
  hasRedFolder?: boolean;
  hasCoinBag?: boolean;
  hasGavel?: boolean;
  referenceImageUrl?: string;
}

export type BackgroundPresetId =
  | 'kantor_bocor'
  | 'meja_lpj'
  | 'ruang_server'
  | 'kuburan_berkabut'
  | 'gerbang_syuting'
  | 'ruang_sidang_mkk'
  | 'vila_puncak'
  | 'jalan_berlubang'
  | 'bukit_tambang'
  | 'gudang_buzzer'
  | 'istana_mewah'
  | 'bilik_suara'
  | 'custom';

export type WeatherType = 'none' | 'rain' | 'snow' | 'petals' | 'sparkles' | 'ash';

export type LightingPreset =
  | 'normal'
  | 'moonlight'
  | 'dramatic_red'
  | 'neon_dark'
  | 'golden'
  | 'storm';

export type TransitionType = 'cut' | 'fade' | 'flash_white' | 'slide_left' | 'zoom_whip';

export type CameraActionMode = 'auto' | 'zoom_speaker' | 'wide' | 'dramatic_shake' | 'slow_pan';

export type PopupColor = 'red' | 'yellow' | 'blue' | 'green' | 'stamp';

export interface PopupBanner {
  text: string;
  color: PopupColor;
  startSec?: number;
  endSec?: number;
}

export interface InfoCard {
  title: string;
  body: string;
  startSec?: number;
  endSec?: number;
}

export type CharacterActionCue =
  | 'idle'
  | 'hop'
  | 'plank'
  | 'sip_coffee'
  | 'point'
  | 'laugh'
  | 'inhale_smoke'
  | 'sneak'
  | 'shock'
  | 'gavel_slam'
  | 'dance'
  | 'rub_eyes'
  | 'type_fast'
  | 'wave_smug';

export interface DialogueLine {
  id: string;
  speaker: string; // e.g. "NARATOR", "POCI", "KUN-KUN", "PAK GENDU", etc.
  text: string;
  startSec: number; // relative to scene (0..15)
  endSec: number;
  highlightWords: string[];
  actionCue?: CharacterActionCue;
}

export interface SceneConfig {
  id: string;
  sceneNumber: 1 | 2 | 3 | 4;
  title: string;
  locationDesc: string;
  visualDesc: string;
  moodDesc: string;
  backgroundId: BackgroundPresetId;
  customBackgroundUrl?: string;
  weather: WeatherType;
  lighting: LightingPreset;
  transitionIn: TransitionType;
  cameraAction: CameraActionMode;
  cameraShakeIntensity: number; // 0..1
  cast: string[]; // character IDs appearing in this scene
  popup: PopupBanner;
  arsipBoxText?: string; // 4s "ARSIP KELAM INDIS" box
  infoCard?: InfoCard;
  sfxCues: string[];
  dialogues: DialogueLine[];
}

export interface EpisodeConfig {
  id: string;
  episodeNumber: number;
  title: string;
  inspiration: string;
  isCustom?: boolean;
  watermarkText: string;
  scenes: [SceneConfig, SceneConfig, SceneConfig, SceneConfig];
}

export interface AudioSlotData {
  sceneIndex: 0 | 1 | 2 | 3;
  fileName: string | null;
  duration: number;
  buffer: AudioBuffer | null;
  envelope30Fps: number[]; // 450 normalized amplitude values (0..1)
  waveformPeaks: number[]; // ~100 bars for UI visualization
}

export interface AIDirectiveScenePatch {
  sceneIndex: number;
  weather?: WeatherType;
  lighting?: LightingPreset;
  backgroundId?: BackgroundPresetId;
  transitionIn?: TransitionType;
  cameraAction?: CameraActionMode;
  cameraShakeIntensity?: number;
  popupText?: string;
  popupColor?: PopupColor;
  infoCardTitle?: string;
  infoCardBody?: string;
  arsipBoxText?: string;
  addCastIds?: string[];
  extraDialogueSpeaker?: string;
  extraDialogueText?: string;
}

export interface AIDirectiveResponse {
  summary: string;
  watermarkText?: string;
  scenePatches: AIDirectiveScenePatch[];
}
