import { CharacterProfile } from '../types/studio';

export const INITIAL_CHARACTERS: CharacterProfile[] = [
  {
    id: 'poci',
    name: 'POCI',
    role: 'Si Pocong — Staf Honorer & Kurir Berkas',
    rigStyle: 'pocong',
    visualDescription:
      'Kapsul vertikal putih tulang (#F4F1EA) bergradasi abu lembut, 3 ikatan tali (jambul atas bergoyang membal). Wajah bulat pucat kebiruan, kantung mata hitam tebal akibat lembur. Membawa tas selempang lusuh berisi map merah REVISI dan ID Card miring.',
    personalityMotion: 'Lugu, pekerja keras, energi tinggi namun sering kaget melihat kenyataan pahit.',
    motionEnergy: 'energetic',
    signatureQuirk: 'Melompat kecil membal (boing), mengucek mata saat bingung, dan jatuh tengkurap kaku (plank) saat kaget.',
    primaryColor: '#F4F1EA',
    secondaryColor: '#D6D1C4',
    accentColor: '#DC2626',
    skinColor: '#DCE4EC',
    hairColor: '#E8E3D8',
    hasRedFolder: true,
  },
  {
    id: 'kunkun',
    name: 'KUN-KUN',
    role: 'Si Kunti — Sekretaris & Admin Loket',
    rigStyle: 'kunti',
    visualDescription:
      'Gaun terusan putih keabuan (#EAEFF2) melayang tanpa kaki, rambut hitam legam panjang berponi acak menutupi satu mata. Kacamata cat-eye melorot di hidung, lipstik merah tua dengan senyum miring (smirk), memegang clipboard dan Kopi Sabar.',
    personalityMotion: 'Judes, sarkastik, tenang mengambang (sine wave), ratu gosip alam gaib.',
    motionEnergy: 'graceful',
    signatureQuirk: 'Melayang naik-turun perlahan, menyeruput Kopi Sabar, dan bahu bergetar saat tertawa cekikikan (Hihihi...).',
    primaryColor: '#EAEFF2',
    secondaryColor: '#CBD5E1',
    accentColor: '#991B1B',
    skinColor: '#E2E8F0',
    hairColor: '#111827',
    hasGlasses: true,
    hasClipboard: true,
  },
  {
    id: 'gendu',
    name: 'PAK GENDU',
    role: 'Genderuwo — Kepala Dinas',
    rigStyle: 'genderuwo',
    visualDescription:
      'Badan oval besar berbulu cokelat tua (#2C221E), mata merah menyala, perut buncit, mengenakan batik sutra, pin emas besar, dan cerutu asap hijau.',
    personalityMotion: 'Berwibawa semu, langkah berat mantap, ekspresif menunjuk langit saat berpidato.',
    motionEnergy: 'heavy',
    signatureQuirk: 'Mengisap cerutu asap hijau dan mengeluarkan istilah rumit seperti efisiensi gizi.',
    primaryColor: '#5C3A21',
    secondaryColor: '#D97706',
    accentColor: '#FBBF24',
    skinColor: '#3B2B25',
    hairColor: '#2C221E',
    hasCigar: true,
  },
  {
    id: 'tuyul',
    name: 'TUYUL',
    role: 'Bendahara & Staf Ahli',
    rigStyle: 'tuyul',
    visualDescription:
      'Tubuh mini berkepala botak bulat mengilap, celana pendek putih, mata hijau melirik licik, menyembunyikan karung koin atau mesin EDC di punggung.',
    personalityMotion: 'Lincah, mengendap cepat, gesit mengutil anggaran dan mengetik banyak ponsel.',
    motionEnergy: 'sneaky',
    signatureQuirk: 'Melirik kiri-kanan licik sambil memeluk karung koin atau mesin EDC retribusi.',
    primaryColor: '#84A98C',
    secondaryColor: '#F8FAFC',
    accentColor: '#10B981',
    skinColor: '#94A39B',
    hairColor: '#94A39B',
    hasCoinBag: true,
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
    signatureQuirk: 'Mengibas kipas/berlian sambil ekor ular emasnya bergoyang lembut.',
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
      'Tuyul mini berdasi merah kebesaran, jas pejabat longgar, memakai dot bayi berkilau di mulut atau leher, rambut klimis tipis.',
    personalityMotion: 'Polos tapi sok berkuasa, suka berjoget gemoy di panggung dan menoleh ke orang tua saat ditanya.',
    motionEnergy: 'energetic',
    signatureQuirk: 'Menyedot dot bayi sebelum berjoget gemoy di depan kamera.',
    primaryColor: '#1E293B',
    secondaryColor: '#EF4444',
    accentColor: '#F59E0B',
    skinColor: '#A3B1AA',
    hairColor: '#1E293B',
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
