import { CharacterProfile } from '../types/studio';

export const INITIAL_CHARACTERS: CharacterProfile[] = [
  {
    id: 'poci',
    name: 'POCI',
    role: 'Si Pocong — Staf Honorer & Kurir Berkas',
    rigStyle: 'pocong',
    visualDescription:
      'Kapsul kain kafan putih tulang (#F2EFE9) bergaris outline komik rapi dengan ikatan tali pita di leher dan jambul atas membal. Wajah bulat biru pucat (#CBE2EE), poni rambut hitam acak tipis, mata sayu berkantung tebal akibat lembur. Membawa tas selempang cokelat lusuh berisi map merah REVISI dan ID Card Pegawai Honorer miring.',
    personalityMotion: 'Lugu, pekerja keras, energi tinggi namun sering kaget melihat kenyataan pahit.',
    motionEnergy: 'energetic',
    signatureQuirk: 'Melompat kecil membal (boing), mengucek mata saat bingung, dan jatuh tengkurap kaku (plank) dengan mata X-X saat kaget.',
    primaryColor: '#F2EFE9',
    secondaryColor: '#D8D2C5',
    accentColor: '#DC2626',
    skinColor: '#CBE2EE',
    hairColor: '#1E242B',
    hasRedFolder: true,
    referenceSheetUrl: '/assets/aistudio/poci_4de02c5c.jpg',
  },
  {
    id: 'kunkun',
    name: 'KUN-KUN',
    role: 'Si Kunti — Sekretaris & Admin Loket',
    rigStyle: 'kunti',
    visualDescription:
      'Blus putih keabuan lengan panjang (#E8EEF2) dengan rok panjang berkibar berujung ekor arwah melayang tanpa kaki. Kulit biru-abu pucat (#C8D6E5), rambut hitam legam bervolume dengan poni miring menutupi sebelah mata. Kacamata cat-eye gelap, lipstik merah tua, memegang clipboard JADWAL RAPAT & KOPI dan gelas KOPI SABAR.',
    personalityMotion: 'Judes, sarkastik, tenang mengambang (sine wave), ratu gosip alam gaib.',
    motionEnergy: 'graceful',
    signatureQuirk: 'Melayang naik-turun perlahan, menyeruput Kopi Sabar, dan bahu bergetar saat tertawa cekikikan (Hihihi...).',
    primaryColor: '#E8EEF2',
    secondaryColor: '#CBD5E1',
    accentColor: '#991B1B',
    skinColor: '#C8D6E5',
    hairColor: '#1B2028',
    hasGlasses: true,
    hasClipboard: true,
    referenceSheetUrl: '/assets/aistudio/kun_kun_de0d64c1.jpg',
  },
  {
    id: 'gendu',
    name: 'PAK GENDU',
    role: 'Genderuwo — Kepala Dinas',
    rigStyle: 'genderuwo',
    visualDescription:
      'Tubuh kekar berbulu cokelat tua (#4A3B31) dengan perut buncit dan taring tajam. Mata merah menyala (#EF4444), mengenakan kemeja batik cokelat-emas terbuka dengan pin emas bertanduk di kerah, celana gelap, dan cerutu berasap hijau.',
    personalityMotion: 'Berwibawa semu, langkah berat mantap, ekspresif menunjuk langit saat berpidato.',
    motionEnergy: 'heavy',
    signatureQuirk: 'Mengisap cerutu asap hijau dan mengeluarkan istilah rumit seperti efisiensi gizi.',
    primaryColor: '#4A3B31',
    secondaryColor: '#422C1D',
    accentColor: '#FBBF24',
    skinColor: '#4A3B31',
    hairColor: '#2C221E',
    hasCigar: true,
    referenceSheetUrl: '/assets/aistudio/gendu_5b968460.jpg',
  },
  {
    id: 'tuyul',
    name: 'TUYUL',
    role: 'Bendahara & Staf Ahli',
    rigStyle: 'tuyul',
    visualDescription:
      'Tubuh mini berkulit sawo-peach (#E3AF95) tanpa baju, kepala botak bulat mengilap, mata hijau licik (#2E8B57) dengan lingkar mata gelap, celana pendek putih (#F8FAFC), bertelanjang kaki. Membawa karung koin emas ($) dan mesin EDC.',
    personalityMotion: 'Lincah, mengendap cepat, gesit mengutil anggaran dan mengoperasikan mesin EDC/ponsel.',
    motionEnergy: 'sneaky',
    signatureQuirk: 'Melirik kiri-kanan licik sambil memeluk karung koin atau mesin EDC retribusi.',
    primaryColor: '#E3AF95',
    secondaryColor: '#F8FAFC',
    accentColor: '#10B981',
    skinColor: '#E3AF95',
    hairColor: '#E3AF95',
    hasCoinBag: true,
    referenceSheetUrl: '/assets/aistudio/tuyul_de6ed773.jpg',
  },
  {
    id: 'blorong',
    name: 'NYI BLORONG-X',
    role: 'Pengusaha Tambang Nisan (Oligarki)',
    rigStyle: 'blorong',
    visualDescription:
      'Kebaya hijau zamrud elegan berkilau dengan ekor ular emas melambai, perhiasan berlian, tatapan tajam penuh perhitungan.',
    personalityMotion: 'Anggun namun mengintimidasi, gerakan ekor gemulai mengikuti fisika pegas.',
    motionEnergy: 'graceful',
    signatureQuirk: 'Mengibas berlian sambil ekor ular emasnya bergoyang lembut.',
    primaryColor: '#059669',
    secondaryColor: '#F59E0B',
    accentColor: '#FDE047',
    skinColor: '#F1E2D3',
    hairColor: '#1C1917',
  },
  {
    id: 'gustuyul',
    name: 'GUS TUYUL MUDA',
    role: 'Pejabat Muda Jalur Dinasti',
    rigStyle: 'tuyul',
    visualDescription:
      'Tuyul mini berkulit peach (#E3AF95) mengenakan jas pejabat gelap dan dasi merah kebesaran, memakai dot bayi berkilau di mulut/leher.',
    personalityMotion: 'Polos tapi sok berkuasa, suka berjoget gemoy di panggung dan menoleh ke orang tua saat ditanya.',
    motionEnergy: 'energetic',
    signatureQuirk: 'Menyedot dot bayi sebelum berjoget gemoy di depan kamera.',
    primaryColor: '#1E293B',
    secondaryColor: '#F8FAFC',
    accentColor: '#EF4444',
    skinColor: '#E3AF95',
    hairColor: '#E3AF95',
    hasTie: true,
    hasPacifier: true,
  },
  {
    id: 'hakim',
    name: 'HAKIM',
    role: 'Hakim Mahkamah Kuburan (MKK)',
    rigStyle: 'human',
    visualDescription:
      'Toga hitam pengadilan berkerah merah emas, kacamata baca bulat, palu sidang kayu besar di tangan kanan.',
    personalityMotion: 'Formal, kaku penuh wibawa palsu, cepat mengetok palu tengah malam.',
    motionEnergy: 'formal',
    signatureQuirk: 'Mengetok palu sidang keras sambil melirik amplop/keluarga pejabat.',
    primaryColor: '#18181B',
    secondaryColor: '#B91C1C',
    accentColor: '#FBBF24',
    skinColor: '#D6D3D1',
    hairColor: '#E5E7EB',
    hasGlasses: true,
    hasGavel: true,
  },
  {
    id: 'warga',
    name: 'WARGA HANTU',
    role: 'Rakyat Alam Indis & Saksi',
    rigStyle: 'human',
    visualDescription:
      'Baju lusuh sederhana warna abu-biru pudar, ikat kepala kain kusam, membawa keranjang bansos atau spanduk protes.',
    personalityMotion: 'Lelah, antre panjang, sesekali bersorak protes atau terbatuk oleh asap.',
    motionEnergy: 'formal',
    signatureQuirk: 'Mengangkat tangan bingung atau memegang keranjang kosong.',
    primaryColor: '#475569',
    secondaryColor: '#94A3B8',
    accentColor: '#F59E0B',
    skinColor: '#CBD5E1',
    hairColor: '#334155',
  },
  {
    id: 'host',
    name: 'HOST HANTU',
    role: 'Pembawa Berita / Petugas Verifikasi',
    rigStyle: 'human',
    visualDescription:
      'Setelan jas penyiar TV abu arang dengan dasi neon dan kartu pers / mikrofon siaran.',
    personalityMotion: 'Tegas, cepat berbicara, gestur tangan profesional mengarah ke narasumber.',
    motionEnergy: 'formal',
    signatureQuirk: 'Mengangkat mikrofon mendekati narasumber dengan tatapan kritis.',
    primaryColor: '#27272A',
    secondaryColor: '#38BDF8',
    accentColor: '#F59E0B',
    skinColor: '#E2E8F0',
    hairColor: '#0F172A',
    hasTie: true,
  },
];

export function resolveSpeakerToCharacterId(speaker: string): string | null {
  const s = speaker.trim().toUpperCase();
  if (s.includes('NARATOR')) return null; // voiceover narrator
  if (s.includes('POCI')) return 'poci';
  if (s.includes('KUN')) return 'kunkun';
  if (s.includes('GUS TUYUL')) return 'gustuyul';
  if (s.includes('TUYUL')) return 'tuyul';
  if (s.includes('BLORONG')) return 'blorong';
  if (s.includes('GENDU') || s.includes('APARAT')) return 'gendu';
  if (s.includes('HAKIM')) return 'hakim';
  if (s.includes('HOST') || s.includes('PETUGAS') || s.includes('KETUA')) return 'host';
  if (s.includes('WARGA') || s.includes('BERDASI') || s.includes('HANTU')) return 'warga';
  return 'poci';
}
