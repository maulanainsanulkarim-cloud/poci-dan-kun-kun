import {
  BackgroundPresetId,
  CharacterActionCue,
  DialogueLine,
  EpisodeConfig,
  LightingPreset,
  PopupColor,
  SceneConfig,
  TransitionType,
  WeatherType,
} from '../types/studio';

function autoHighlightWords(text: string): string[] {
  const keywords = [
    'tiga miliar',
    'lima miliar',
    'emas',
    'bocor',
    'stroberi',
    'asap',
    'kesurupan',
    'down',
    'audit',
    'sidak',
    'kemenyan',
    'syuting',
    'tahu',
    'ayam',
    'diet',
    'kolesterol',
    'gosip',
    'loket',
    'ordal',
    'koneksi',
    'tahun depan',
    'ibu kota',
    'smart graveyard',
    'gaib',
    'banjir',
    'digusur',
    'vila mewah',
    'tidur',
    'wisata',
    'sewa',
    'pajak udara',
    'lima ribu',
    'ngesot',
    'berlubang',
    'kereta kencana',
    'mahkamah',
    'seratus tahun',
    'dinasti',
    'bisikan',
    'joget gemoy',
    'tambang',
    'longsor',
    'diskon',
    'sesak napas',
    'demo',
    'kemenyan',
    'cctv',
    '#indisgelap',
    'buzzer',
    'copy-paste',
    'antek',
    'potong',
    'roti',
    'nebeng',
    'barang kw',
    'sidang terbuka',
    'selokan',
    'stiker',
    'amplop',
    'sulap',
    'sepuluh ribu',
    'human error',
    'sah',
    'kirim ke publik',
    'bakar',
    'kursi roda',
    'lupa',
    'saksi',
    'minta maaf',
    'vip',
    'lima miliar',
    'berita hari ini',
  ];
  const lower = text.toLowerCase();
  const found: string[] = [];
  for (const kw of keywords) {
    if (lower.includes(kw)) {
      found.push(kw);
    }
  }
  if (found.length === 0) {
    const words = text.split(/\s+/).filter((w) => w.length > 5);
    if (words.length > 0) {
      found.push(words[Math.floor(words.length / 2)].replace(/[.,!?"]/g, ''));
    }
  }
  return found.slice(0, 3);
}

function inferActionCue(speaker: string, text: string): CharacterActionCue {
  const s = speaker.toUpperCase();
  const t = text.toLowerCase();
  if (t.includes('hihihi') || t.includes('tertawa')) return 'laugh';
  if (t.includes('lah,') || t.includes('hah?!') || t.includes('apa?!') || t.includes('gimana'))
    return 'shock';
  if (t.includes('joget')) return 'dance';
  if (t.includes('palu') || t.includes('sah') || t.includes('hukum')) return 'gavel_slam';
  if (t.includes('asap') || t.includes('cerutu')) return 'inhale_smoke';
  if (t.includes('kucek') || t.includes('lupa') || t.includes('bingung')) return 'rub_eyes';
  if (t.includes('hp') || t.includes('ketik') || t.includes('buzzer')) return 'type_fast';
  if (s.includes('POCI') && (t.includes('lompat') || t.includes('boing') || t.includes('berkas')))
    return 'hop';
  if (s.includes('KUN')) return 'sip_coffee';
  if (s.includes('TUYUL')) return 'sneak';
  return 'point';
}

function parseDialogueBlock(rawBlock: string, sceneIndex: number): DialogueLine[] {
  const parts = rawBlock
    .split(/<break[^>]*\/?>/gi)
    .map((p) => p.trim())
    .filter(Boolean);

  const parsed: Array<{ speaker: string; text: string }> = [];
  for (const part of parts) {
    const colonIdx = part.indexOf(':');
    if (colonIdx > 0 && colonIdx < 28) {
      const speaker = part.slice(0, colonIdx).trim();
      const text = part.slice(colonIdx + 1).trim();
      if (text) parsed.push({ speaker, text });
    } else if (part.length > 0) {
      parsed.push({ speaker: 'NARATOR', text: part });
    }
  }

  if (parsed.length === 0) return [];

  // Distribute smoothly across 0.4s..14.4s (with 0.35s breath pause between lines)
  const totalAvailable = 14.0;
  const gap = 0.35;
  const totalGaps = Math.max(0, parsed.length - 1) * gap;
  const usableSpeakTime = totalAvailable - totalGaps;
  const charWeights = parsed.map((p) => Math.max(12, p.text.length));
  const totalWeight = charWeights.reduce((a, b) => a + b, 0);

  let cursor = 0.4;
  return parsed.map((item, idx) => {
    const dur = (charWeights[idx] / totalWeight) * usableSpeakTime;
    const startSec = Number(cursor.toFixed(2));
    const endSec = Number(Math.min(14.7, cursor + dur).toFixed(2));
    cursor = endSec + gap;
    return {
      id: `s${sceneIndex + 1}_d${idx + 1}`,
      speaker: item.speaker,
      text: item.text,
      startSec,
      endSec,
      highlightWords: autoHighlightWords(item.text),
      actionCue: inferActionCue(item.speaker, item.text),
    };
  });
}

interface RawSceneInput {
  title: string;
  locationDesc: string;
  visualDesc: string;
  moodDesc: string;
  backgroundId: BackgroundPresetId;
  weather?: WeatherType;
  lighting?: LightingPreset;
  transitionIn?: TransitionType;
  cast: string[];
  popupText: string;
  popupColor: PopupColor;
  arsipBoxText?: string;
  sfxCues: string[];
  rawDialog: string;
}

function buildEpisode(
  episodeNumber: number,
  title: string,
  inspiration: string,
  rawScenes: [RawSceneInput, RawSceneInput, RawSceneInput, RawSceneInput]
): EpisodeConfig {
  const scenes = rawScenes.map((rs, idx): SceneConfig => ({
    id: `ep${episodeNumber}_s${idx + 1}`,
    sceneNumber: (idx + 1) as 1 | 2 | 3 | 4,
    title: rs.title,
    locationDesc: rs.locationDesc,
    visualDesc: rs.visualDesc,
    moodDesc: rs.moodDesc,
    backgroundId: rs.backgroundId,
    weather: rs.weather ?? 'none',
    lighting: rs.lighting ?? 'normal',
    transitionIn: rs.transitionIn ?? (idx === 0 ? 'fade' : 'flash_white'),
    cameraAction: 'auto',
    cameraShakeIntensity: idx === 3 ? 0.35 : 0.15,
    cast: rs.cast,
    popup: {
      text: rs.popupText,
      color: rs.popupColor,
      startSec: idx === 3 ? 9.5 : 2.2,
      endSec: idx === 3 ? 14.8 : 11.5,
    },
    arsipBoxText: rs.arsipBoxText,
    sfxCues: rs.sfxCues,
    dialogues: parseDialogueBlock(rs.rawDialog, idx),
  })) as [SceneConfig, SceneConfig, SceneConfig, SceneConfig];

  return {
    id: `ep-${episodeNumber}`,
    episodeNumber,
    title,
    inspiration,
    watermarkText: 'ARSIP KELAM INDIS',
    scenes,
  };
}

export const PRESET_EPISODES: EpisodeConfig[] = [
  // EPISODE 1
  buildEpisode(
    1,
    'Misteri Anggaran Kemenyan Tiga Miliar',
    'Penggelembungan (mark-up) anggaran barang tak masuk akal & alasan klasik sesuai prosedur.',
    [
      {
        title: 'Batu Nisan Emas di Kantor Bocor',
        locationDesc: 'Kantor Kelurahan Alam Indis beratap bolong, air hujan menetes, batu nisan berlapis emas di tengah ruangan.',
        visualDesc: 'Kamera tilt down ke Poci melompat menghindari tetesan air sambil memeluk map merah. Kun-Kun melayang santai menyeruput kopi.',
        moodDesc: 'Komedi satir kelam, hujan rintik',
        backgroundId: 'kantor_bocor',
        weather: 'rain',
        lighting: 'storm',
        transitionIn: 'fade',
        cast: ['poci', 'kunkun'],
        popupText: 'ANGGARAN KEMENYAN: Rp 3.000.000.000 (WAJAR ✔)',
        popupColor: 'red',
        sfxCues: ['rain', 'boing', 'giggle', 'pop'],
        rawDialog:
          "NARATOR: Di Republik Alam Indis, atap kantor boleh bocor, tapi batu nisan pejabat wajib berlapis emas. <break time='0.5s'/> POCI: Kun, anggaran kemenyan bulan ini kok tembus tiga miliar? <break time='0.5s'/> KUN-KUN: Hihihi... itu kemenyan import rasa stroberi, Ci. Biar arwah tidak stres.",
      },
      {
        title: 'Dana Terserap di Udara',
        locationDesc: 'Meja kerja Kun-Kun penuh tumpukan kertas Laporan Pertanggungjawaban Gaib (LPJ).',
        visualDesc: 'Poci membuka map merah. Kertas anggaran terbang jadi asap hijau dihirup Pak Gendu. Tuyul mengendap membawa karung kecil.',
        moodDesc: 'Sarkastik, licik',
        backgroundId: 'meja_lpj',
        weather: 'sparkles',
        lighting: 'normal',
        transitionIn: 'slide_left',
        cast: ['poci', 'kunkun', 'gendu', 'tuyul'],
        popupText: 'STATUS DANA: TERSERAP 100% (JADI ASAP)',
        popupColor: 'yellow',
        sfxCues: ['pop', 'coin'],
        rawDialog:
          "POCI: Lah, di gudang kemenyannya cuma sebungkus kecil, sisanya ke mana? <break time='0.5s'/> KUN-KUN: Sudah terserap maksimal, Ci. Dua miliar buat studi banding hantu lokal ke luar negeri. <break time='0.5s'/> NARATOR: Studi banding tentang cara menakuti warga tanpa ketahuan.",
      },
      {
        title: 'Aplikasi SI-GENTAYANGAN Mendadak Kesurupan',
        locationDesc: 'Pojok ruangan dengan komputer tua berdebu bertuliskan Server Aplikasi SI-GENTAYANGAN (Anggaran 500 Miliar).',
        visualDesc: 'Poci melompat mendekati layar untuk mengecek bukti transfer. Layar berkedip merah mengeluarkan asap.',
        moodDesc: 'Absurd, tegang komedi',
        backgroundId: 'ruang_server',
        weather: 'none',
        lighting: 'dramatic_red',
        transitionIn: 'flash_white',
        cast: ['poci', 'kunkun'],
        popupText: 'ERROR 404: BUKTI HILANG (SERVER KESURUPAN)',
        popupColor: 'red',
        sfxCues: ['error', 'pop'],
        rawDialog:
          "POCI: Coba aku cek bukti transfernya di aplikasi SI-GENTAYANGAN. <break time='0.5s'/> KUN-KUN: Percuma, Ci. Servernya lagi down. <break time='0.5s'/> NARATOR: Anehnya, aplikasi ratusan miliar itu selalu lancar saat pencairan, tapi mendadak kesurupan begitu mau diaudit.",
      },
      {
        title: 'Kabar Sidak dari Pusat',
        locationDesc: 'Halaman kuburan berkabut dengan papan pengumuman kelurahan.',
        visualDesc: 'Poci jatuh tengkurap lemas. Tuyul berlari panik membawa surat bersegel.',
        moodDesc: 'Mencekam kocak, cliffhanger',
        backgroundId: 'kuburan_berkabut',
        weather: 'ash',
        lighting: 'moonlight',
        transitionIn: 'zoom_whip',
        cast: ['poci', 'kunkun', 'tuyul'],
        popupText: 'BERSAMBUNG...',
        popupColor: 'stamp',
        arsipBoxText: 'Di alam gaib, hantu paling seram bukanlah pocong, melainkan laporan keuangan tanpa struk.',
        sfxCues: ['bruk', 'stamp'],
        rawDialog:
          "KUN-KUN: Sudahlah Ci, rakyat kuburan juga sudah kebal. <break time='0.6s'/> NARATOR: Namun ketenangan mereka buyar, saat Tuyul bendahara berteriak... besok ada inspeksi mendadak dari pusat! <break time='0.5s'/> POCI: Lah, terus kemenyannya gimana?!",
      },
    ]
  ),

  // EPISODE 2
  buildEpisode(
    2,
    'Sidak Mendadak dan Bansos Sesajen Diet',
    'Pencitraan pejabat saat sidak, pemotongan bantuan sosial (bansos), dan alasan efisiensi gizi.',
    [
      {
        title: 'Kuburan Mendadak Jadi Lokasi Syuting',
        locationDesc: 'Gerbang pemakaman dihias spanduk selamat datang dan karpet merah.',
        visualDesc: 'Poci melompat super cepat menyapu daun kering. Kun-Kun merapikan rambut memasang wajah memelas.',
        moodDesc: 'Sibuk, satir pencitraan',
        backgroundId: 'gerbang_syuting',
        weather: 'petals',
        lighting: 'golden',
        transitionIn: 'fade',
        cast: ['poci', 'kunkun'],
        popupText: 'MODE PENCITRAAN: AKTIF ✔',
        popupColor: 'yellow',
        sfxCues: ['boing', 'pop'],
        rawDialog:
          "NARATOR: Begitu kabar sidak pusat terdengar, kuburan yang tadinya horor mendadak berubah jadi lokasi syuting. <break time='0.5s'/> POCI: Kun, bunga taburnya kurang! <break time='0.5s'/> KUN-KUN: Pakai kertas krep bekas acara tujuh belasan saja!",
      },
      {
        title: 'Bansos Ayam Ingkung Berubah Jadi Tahu',
        locationDesc: 'Meja pembagian paket bantuan bertuliskan BANSOS SESAJEN MALAM JUMAT.',
        visualDesc: 'Pak Gendu berpose di depan kamera menyerahkan keranjang ke warga. Begitu kamera mati, Tuyul menukarnya dengan tahu putih.',
        moodDesc: 'Satir tajam',
        backgroundId: 'meja_lpj',
        weather: 'sparkles',
        lighting: 'normal',
        transitionIn: 'flash_white',
        cast: ['gendu', 'tuyul', 'poci', 'kunkun', 'warga'],
        popupText: 'ISI PAKET: 100% (DI FOTO) → 10% (DI TANGAN)',
        popupColor: 'red',
        sfxCues: ['camera', 'pop', 'giggle'],
        rawDialog:
          "PAK GENDU: Ini bantuan penuh untuk warga kuburan! <break time='0.5s'/> NARATOR: Cekrek. Kamera mati, bantuan pun ikut diet ketat. <break time='0.5s'/> POCI: Loh Pak, ayamnya kok berubah jadi tahu? <break time='0.5s'/> KUN-KUN: Hihihi... sisanya kena pajak gaib, Ci.",
      },
      {
        title: 'Alasan Mencegah Kolesterol Arwah',
        locationDesc: 'Warga hantu berkerumun protes sambil mengacungkan keranjang kosong.',
        visualDesc: 'Pak Gendu naik ke batu nisan besar berbicara lewat mikrofon menunjuk langit. Kun-Kun tertawa sinis.',
        moodDesc: 'Kocak absurd',
        backgroundId: 'kuburan_berkabut',
        weather: 'none',
        lighting: 'normal',
        transitionIn: 'slide_left',
        cast: ['gendu', 'kunkun', 'warga'],
        popupText: 'KLARIFIKASI: INI BUKAN SUNAT, TAPI DIET',
        popupColor: 'blue',
        sfxCues: ['pop', 'giggle'],
        rawDialog:
          "PAK GENDU: Ini bukan pemotongan! Ini efisiensi gizi demi mencegah kolesterol di alam baka! <break time='0.5s'/> KUN-KUN: Betul! Lagipula, siapa suruh kalian meninggal pas harga bahan pokok lagi naik? Hihihi!",
      },
      {
        title: 'Taktik Pengalihan Isu Viral',
        locationDesc: 'Papan pengumuman kelurahan ditempeli poster gosip besar.',
        visualDesc: 'Kun-Kun menempelkan poster gosip baru untuk mengalihkan perhatian warga yang marah.',
        moodDesc: 'Licik, cliffhanger',
        backgroundId: 'kantor_bocor',
        weather: 'none',
        lighting: 'moonlight',
        transitionIn: 'flash_white',
        cast: ['poci', 'kunkun'],
        popupText: 'BERSAMBUNG...',
        popupColor: 'stamp',
        arsipBoxText: 'Yang disunat bukan cuma anak kecil, tapi juga isi paket bantuan.',
        sfxCues: ['pop', 'stamp'],
        rawDialog:
          "POCI: Warga masih marah tuh, Kun! <break time='0.5s'/> KUN-KUN: Gampang, kita sebarkan saja gosip Tuyul selingkuh sama Suster Ngesot! <break time='0.6s'/> NARATOR: Isu bansos pun tenggelam. Tapi warga kini terpaksa antre mengurus surat baru di loket!",
      },
    ]
  ),

  // EPISODE 3
  buildEpisode(
    3,
    'Antrean Panjang dan Keajaiban Jalur Ordal',
    'Birokrasi berbelit, loket tutup saat jam kerja, dan budaya orang dalam (ordal).',
    [
      {
        title: 'Loket Buka Cuma Lima Menit',
        locationDesc: 'Loket kaca buram bertuliskan BUKA 08.00 - 15.00 dengan papan ISTIRAHAT.',
        visualDesc: 'Antrean hantu mengular. Kun-Kun main HP di balik kaca sementara Poci kelelahan menyusun berkas.',
        moodDesc: 'Lesu, menyebalkan',
        backgroundId: 'kantor_bocor',
        weather: 'none',
        lighting: 'normal',
        transitionIn: 'fade',
        cast: ['poci', 'kunkun', 'warga'],
        popupText: 'JAM ISTIRAHAT: 08.05 - 14.55',
        popupColor: 'yellow',
        sfxCues: ['pop'],
        rawDialog:
          "NARATOR: Mengurus surat pindah kavling di Alam Indis butuh kesabaran ekstra. <break time='0.5s'/> POCI: Kun, antrean sudah sampai pohon beringin, loketnya kapan buka? <break time='0.5s'/> KUN-KUN: Sebentar Ci, tanggung lagi nge-push rank. Lagian yang ngantre sudah mati, mau buru-buru ke mana?",
      },
      {
        title: 'Syarat Berkas yang Mustahil',
        locationDesc: 'Meja loket pelayanan penuh map kertas.',
        visualDesc: 'Warga hantu menyerahkan map, Kun-Kun melirik judes lalu melemparkan map kembali.',
        moodDesc: 'Judes, satir birokrasi',
        backgroundId: 'meja_lpj',
        weather: 'none',
        lighting: 'normal',
        transitionIn: 'slide_left',
        cast: ['kunkun', 'poci', 'warga'],
        popupText: 'DITOLAK! KURANG FOTOKOPI KTP 17 RANGKAP',
        popupColor: 'red',
        sfxCues: ['gavel', 'pop'],
        rawDialog:
          "KUN-KUN: Berkasmu kurang lengkap! Mana surat pengantar RT kuburan, fotokopi akta lahir zaman Belanda, sama pas foto latar biru 3x4? <break time='0.5s'/> POCI: Kun, dia meninggalnya kesambar petir, mana sempat foto studio?!",
      },
      {
        title: 'Sakti Mandraguna Jalur Ordal',
        locationDesc: 'Sisi samping loket dengan pintu VIP bertuliskan JALUR KHUSUS.',
        visualDesc: 'Hantu berdasi menyelipkan amplop cokelat tebal. Wajah Kun-Kun mendadak ramah 180 derajat.',
        moodDesc: 'Sindiran tajam',
        backgroundId: 'gerbang_syuting',
        weather: 'sparkles',
        lighting: 'golden',
        transitionIn: 'flash_white',
        cast: ['warga', 'kunkun'],
        popupText: 'JALUR ORDAL: ACC TANPA SYARAT ✔',
        popupColor: 'green',
        sfxCues: ['coin', 'giggle', 'pop'],
        rawDialog:
          "HANTU BERDASI: Salam dari Pak Gendu, Mbak Kun. <break time='0.4s'/> KUN-KUN: Oh, keponakannya Bapak! Silakan lewat belakang, suratnya jadi lima menit! Hihihi... <break time='0.5s'/> NARATOR: Di mana pun alamnya, syarat paling sakti bukanlah fotokopi, melainkan koneksi.",
      },
      {
        title: 'Poci Terkunci di Ruang Arsip Rahasia',
        locationDesc: 'Lampu kantor dimatikan pukul 15.00 tepat.',
        visualDesc: 'Kun-Kun mengunci pintu loket saat Poci masih di dalam dan menemukan maket rahasia.',
        moodDesc: 'Misterius, tegang',
        backgroundId: 'ruang_server',
        weather: 'none',
        lighting: 'neon_dark',
        transitionIn: 'zoom_whip',
        cast: ['poci', 'kunkun'],
        popupText: 'BERSAMBUNG...',
        popupColor: 'stamp',
        arsipBoxText: 'Kalau bisa dipersulit, kenapa harus dipermudah? Motto abadi pelayanan publik.',
        sfxCues: ['gavel', 'stamp'],
        rawDialog:
          "KUN-KUN: Maaf ya, sudah jam tiga, sistem otomatis mati. Silakan balik tahun depan! <break time='0.6s'/> POCI: Lah, aku masih di dalam sini, Kun! <break time='0.5s'/> NARATOR: Terkunci sendirian, Poci justru menemukan dokumen rahasia proyek Ibu Kota Kuburan Baru!",
      },
    ]
  ),

  // EPISODE 4
  buildEpisode(
    4,
    'Megaproyek Ibu Kota Kuburan Baru',
    'Ambisi proyek mercusuar berbiaya fantastis di tengah hutan sementara wilayah lama terbengkalai.',
    [
      {
        title: 'Maket Mewah di Ruang Rahasia',
        locationDesc: 'Ruang arsip gelap dengan maket raksasa bercahaya neon IKN-G: IBU KOTA KUBURAN BARU.',
        visualDesc: 'Poci menatap takjub maket nisan pencakar langit. Kun-Kun menyelinap masuk.',
        moodDesc: 'Futuristik horor',
        backgroundId: 'ruang_server',
        weather: 'sparkles',
        lighting: 'neon_dark',
        transitionIn: 'fade',
        cast: ['poci', 'kunkun'],
        popupText: 'PROYEK STRATEGIS GAIB: Rp 400 TRILIUN',
        popupColor: 'blue',
        sfxCues: ['pop', 'boing'],
        rawDialog:
          "NARATOR: Di balik pintu terkunci, Poci menemukan maket megaproyek Ibu Kota Kuburan Baru di tengah hutan belantara. <break time='0.5s'/> POCI: Wah Kun, kuburan kita mau pindah ke sini? <break time='0.5s'/> KUN-KUN: Iya Ci, konsepnya Smart Graveyard, batu nisannya pakai panel surya!",
      },
      {
        title: 'Investor Asing yang Masih Gaib',
        locationDesc: 'Meja presentasi dengan grafik panah naik bertuliskan INVESTOR ASING.',
        visualDesc: 'Pak Gendu dan Nyi Blorong-X menatap maket. Tuyul menghitung tumpukan uang kas kuburan lama.',
        moodDesc: 'Serakah, satir ekonomi',
        backgroundId: 'istana_mewah',
        weather: 'none',
        lighting: 'golden',
        transitionIn: 'slide_left',
        cast: ['poci', 'kunkun', 'gendu', 'blorong', 'tuyul'],
        popupText: 'INVESTOR: 99% GAIB (MASIH DALAM DOA)',
        popupColor: 'yellow',
        sfxCues: ['coin', 'pop'],
        rawDialog:
          "POCI: Terus dananya dari mana, Kun? Katanya dari investor asing? <break time='0.5s'/> KUN-KUN: Investornya masih gaib banget, Ci—belum kelihatan wujudnya! Jadi sementara pakai uang kas kuburan lama dulu. <break time='0.5s'/> PAK GENDU: Demi masa depan arwah generasi emas!",
      },
      {
        title: 'Kuburan Lama Makin Terbengkalai',
        locationDesc: 'Kuburan lama yang kebanjiran dan penuh rumput liar.',
        visualDesc: 'Hantu warga berenang di genangan air hujan sambil memegang nisan. Poci menatap sedih.',
        moodDesc: 'Prihatin namun satir',
        backgroundId: 'jalan_berlubang',
        weather: 'rain',
        lighting: 'storm',
        transitionIn: 'flash_white',
        cast: ['poci', 'kunkun', 'warga'],
        popupText: 'DANA PERAWATAN LAMA: DIALIHKAN KE PROYEK BARU',
        popupColor: 'red',
        sfxCues: ['rain', 'giggle', 'pop'],
        rawDialog:
          "POCI: Tapi jalan di kuburan lama aja masih banjir kalau hujan, masa bikin kuburan baru? <break time='0.5s'/> KUN-KUN: Hihihi... kan yang penting punya monumen baru buat kenang-kenangan jabatan, Ci!",
      },
      {
        title: 'Lahan Warga Mulai Dipatok',
        locationDesc: 'Hutan beringin tua yang dipasangi patok-patok merah MILIK NEGARA GAIB.',
        visualDesc: 'Penghuni pohon beringin mulai panik melihat patok tanah merah.',
        moodDesc: 'Tegang, konflik lahan',
        backgroundId: 'kuburan_berkabut',
        weather: 'ash',
        lighting: 'dramatic_red',
        transitionIn: 'zoom_whip',
        cast: ['poci', 'kunkun', 'warga'],
        popupText: 'BERSAMBUNG...',
        popupColor: 'stamp',
        arsipBoxText: 'Membangun istana megah di atas tanah sunyi, sementara halaman rumah sendiri dibiarkan tenggelam.',
        sfxCues: ['gavel', 'stamp'],
        rawDialog:
          "NARATOR: Demi membangun ibu kota baru, ratusan pohon beringin tua pun mulai dipatok. <break time='0.5s'/> POCI: Lah, itu kan pohon tempat tinggalnya Mbah Genderuwo dan keluarga?! <break time='0.5s'/> KUN-KUN: Besok mereka bakal digusur halus, Ci!",
      },
    ]
  ),

  // EPISODE 5
  buildEpisode(
    5,
    'Rapat di Vila Mewah dan Penggusuran Pohon Beringin',
    'Pejabat rapat di hotel mewah bahas rakyat susah, tidur saat sidang, dan penggusuran lahan warga.',
    [
      {
        title: 'Rapat Konsinyering di Vila Puncak',
        locationDesc: 'Ruang rapat VIP dengan hidangan prasmanan mewah dan layar proyektor.',
        visualDesc: 'Poci mengintip dari balik tirai. Pak Gendu menyantap hidangan sementara di luar kabut tebal.',
        moodDesc: 'Mewah kontras',
        backgroundId: 'vila_puncak',
        weather: 'none',
        lighting: 'golden',
        transitionIn: 'fade',
        cast: ['poci', 'kunkun', 'gendu'],
        popupText: 'BIAYA RAPAT: Rp 800 JUTA (SNACK DOANG)',
        popupColor: 'yellow',
        sfxCues: ['pop', 'coin'],
        rawDialog:
          "NARATOR: Untuk membahas nasib warga pohon beringin yang tergusur, para pejabat gaib terpaksa rapat jauh-jauh ke vila mewah. <break time='0.5s'/> POCI: Kun, ini rapat bahas warga atau wisata kuliner? <break time='0.5s'/> KUN-KUN: Sst, ini namanya rapat konsinyering, Ci.",
      },
      {
        title: 'Tidur Berjamaah Menyerap Aspirasi',
        locationDesc: 'Meja bundar ruang rapat VIP.',
        visualDesc: 'Pak Gendu mengangguk dengan mata terpejam tidur saat rapat berlangsung.',
        moodDesc: 'Absurd, jenaka',
        backgroundId: 'vila_puncak',
        weather: 'none',
        lighting: 'normal',
        transitionIn: 'slide_left',
        cast: ['poci', 'kunkun', 'gendu', 'tuyul'],
        popupText: 'STATUS RAPAT: Zzz... MENYERAP ASPIRASI',
        popupColor: 'blue',
        sfxCues: ['gavel', 'giggle'],
        rawDialog:
          "NARATOR: Setelah tiga jam pidato pembukaan yang isinya saling memuji, agenda utama pun dimulai. <break time='0.5s'/> POCI: Loh, kok pada tidur semua? <break time='0.5s'/> KUN-KUN: Hihihi... mereka lagi meditasi menyerap aspirasi rakyat, Ci. Jangan diganggu!",
      },
      {
        title: 'Pohon Beringin Jadi Kawasan Wisata',
        locationDesc: 'Papan peta wilayah di layar proyektor ruang rapat.',
        visualDesc: 'Pak Gendu terbangun kaget, mengetok palu dan menunjuk pohon beringin tua untuk Nyi Blorong-X.',
        moodDesc: 'Tegas tapi kejam',
        backgroundId: 'vila_puncak',
        weather: 'none',
        lighting: 'dramatic_red',
        transitionIn: 'flash_white',
        cast: ['gendu', 'blorong', 'poci'],
        popupText: 'LAHAN WARGA RESMI DIPRIVATISASI!',
        popupColor: 'red',
        sfxCues: ['gavel', 'pop'],
        rawDialog:
          "PAK GENDU: Baik! Rapat sepakat! Pohon beringin warga kita serahkan ke Nyi Blorong-X jadi kawasan wisata horor berbayar! <break time='0.5s'/> POCI: Terus warga yang tinggal di dahan mau pindah ke mana, Pak?!",
      },
      {
        title: 'Warga Disuruh Sewa Dahan Sendiri',
        locationDesc: 'Pohon beringin tua dipasangi garis batas kuning.',
        visualDesc: 'Kun-Kun dan Poci menatap warga hantu yang berkumpul marah.',
        moodDesc: 'Kritis, siap demo',
        backgroundId: 'kuburan_berkabut',
        weather: 'ash',
        lighting: 'moonlight',
        transitionIn: 'zoom_whip',
        cast: ['gendu', 'kunkun', 'poci', 'warga'],
        popupText: 'BERSAMBUNG...',
        popupColor: 'stamp',
        arsipBoxText: 'Rapat berjam-jam sering kali tidak menghasilkan solusi, melainkan hanya notulensi dan kuitansi.',
        sfxCues: ['coin', 'stamp'],
        rawDialog:
          "PAK GENDU: Warga bisa menyewa dahan secara mencicil dengan bunga ringan! Rapat ditutup! <break time='0.5s'/> KUN-KUN: Hihihi... pohon tumbuh sendiri, yang narik sewa kelurahan. <break time='0.5s'/> NARATOR: Warga yang marah pun bersiap demo, tapi pejabat sudah menyiapkan aturan baru!",
      },
    ]
  ),

  // EPISODE 6
  buildEpisode(
    6,
    'Pajak Terbang dan Retribusi Lompatan Pocong',
    'Pungutan pajak/retribusi baru yang mencekik rakyat kecil dengan dalih peningkatan fasilitas.',
    [
      {
        title: 'Razia Udara di Malam Jumat',
        locationDesc: 'Langit malam pemakaman dengan pos pemeriksaan melayang.',
        visualDesc: 'Kun-Kun terbang santai dihentikan Tuyul berseragam dinas yang menyodorkan mesin EDC.',
        moodDesc: 'Kocak, mencekik',
        backgroundId: 'kuburan_berkabut',
        weather: 'sparkles',
        lighting: 'moonlight',
        transitionIn: 'fade',
        cast: ['kunkun', 'tuyul'],
        popupText: 'PAJAK UDARA: Rp 50.000 / MENIT TERBANG',
        popupColor: 'red',
        sfxCues: ['pop', 'coin'],
        rawDialog:
          "NARATOR: Untuk menambal kas proyek ibu kota baru, aturan pajak gaib pun resmi diberlakukan. <break time='0.5s'/> TUYUL: Selamat malam, Mbak Kun! Terbang di atas dua meter kena pajak udara! <break time='0.5s'/> KUN-KUN: Apa?! Terbang doang dipajakin?!",
      },
      {
        title: 'Argo Lompatan Pocong',
        locationDesc: 'Jalan setapak kuburan dengan garis ukur seperti lintasan lari.',
        visualDesc: 'Poci melompat mengantar berkas. Tuyul mencatat argometer lompatan.',
        moodDesc: 'Satir retribusi',
        backgroundId: 'jalan_berlubang',
        weather: 'none',
        lighting: 'normal',
        transitionIn: 'slide_left',
        cast: ['poci', 'tuyul'],
        popupText: 'ARGO LOMPATAN: 3x LOMPAT = Rp 15.000',
        popupColor: 'yellow',
        sfxCues: ['boing', 'coin', 'pop'],
        rawDialog:
          "POCI: Untung aku nggak bisa terbang, cuma lompat-lompat. <break time='0.5s'/> TUYUL: Eits, Mas Poci kena retribusi jalan setapak! Satu lompatan lima ribu perak karena merusak kontur tanah! <break time='0.5s'/> POCI: Lah, terus aku harus ngesot?!",
      },
      {
        title: 'Pajak Ditarik, Jalan Tetap Berlubang',
        locationDesc: 'Jalan setapak kuburan yang berlubang besar dan gelap tanpa lampu.',
        visualDesc: 'Poci jatuh terperosok ke lubang jalanan sementara Kun-Kun melayang membaca brosur pajak.',
        moodDesc: 'Ironis',
        backgroundId: 'jalan_berlubang',
        weather: 'rain',
        lighting: 'storm',
        transitionIn: 'flash_white',
        cast: ['poci', 'kunkun'],
        popupText: 'JALAN RUSAK: HARAP MAKLUM (DANA DIALIHKAN)',
        popupColor: 'blue',
        sfxCues: ['bruk', 'giggle', 'rain'],
        rawDialog:
          "POCI: Katanya pajak buat perbaikan jalan kuburan, kok lubangnya makin dalam?! <break time='0.5s'/> KUN-KUN: Hihihi... sabar Ci, uang pajaknya dipakai buat beli kereta kencana baru Pak Gendu, biar beliau nggak capek melayang!",
      },
      {
        title: 'Putusan Mendadak Mahkamah Kuburan',
        locationDesc: 'Gedung Mahkamah Konstitusi Kuburan (MKK) terang di tengah malam.',
        visualDesc: 'Terdengar suara palu sidang dari gedung MKK di tengah malam.',
        moodDesc: 'Dramatis, misteri politik',
        backgroundId: 'ruang_sidang_mkk',
        weather: 'none',
        lighting: 'dramatic_red',
        transitionIn: 'zoom_whip',
        cast: ['poci', 'kunkun', 'hakim'],
        popupText: 'BERSAMBUNG...',
        popupColor: 'stamp',
        arsipBoxText: 'Pajak ditarik secepat kilat, fasilitas diperbaiki sepelan siput.',
        sfxCues: ['gavel', 'stamp'],
        rawDialog:
          "NARATOR: Saat rakyat sibuk membayar pajak lompatan, di gedung Mahkamah Kuburan terjadi sidang kilat tengah malam! <break time='0.5s'/> POCI: Jam segini sidang bahas apa, Kun? <break time='0.5s'/> KUN-KUN: Katanya sih... mau meloloskan keponakan Pak Gendu jadi pejabat!",
      },
    ]
  ),

  // EPISODE 7
  buildEpisode(
    7,
    'Mahkamah Kuburan dan Dinasti Pohon Beringin',
    'Putusan hukum yang diubah demi meloloskan kerabat pejabat (politik dinasti & nepotisme).',
    [
      {
        title: 'Syarat Usia Hantu Diubah Semalam',
        locationDesc: 'Ruang sidang Mahkamah Konstitusi Kuburan (MKK).',
        visualDesc: 'Hakim mengetok palu di samping Gus Tuyul Muda memakai jas dan dot bayi.',
        moodDesc: 'Satir hukum',
        backgroundId: 'ruang_sidang_mkk',
        weather: 'none',
        lighting: 'dramatic_red',
        transitionIn: 'fade',
        cast: ['hakim', 'gustuyul', 'poci', 'kunkun'],
        popupText: 'ATURAN DIUBAH: USIA 1 HARI BOLEH JADI PEJABAT ✔',
        popupColor: 'red',
        sfxCues: ['gavel', 'pop'],
        rawDialog:
          "NARATOR: Demi meloloskan Gus Tuyul Muda menjadi Wakil Kepala Dinas, aturan batas usia hantu pun direvisi dalam semalam. <break time='0.5s'/> POCI: Kun, bukannya syarat jadi pejabat minimal sudah jadi hantu seratus tahun? <break time='0.5s'/> KUN-KUN: Dia baru meninggal kemarin sore, Ci!",
      },
      {
        title: 'Alasan Demokrasi Alam Baka',
        locationDesc: 'Podium konferensi pers di depan gedung MKK.',
        visualDesc: 'Pak Gendu merangkul Gus Tuyul Muda di depan mikrofon. Kun-Kun geleng-geleng kepala.',
        moodDesc: 'Sinis',
        backgroundId: 'gerbang_syuting',
        weather: 'sparkles',
        lighting: 'normal',
        transitionIn: 'flash_white',
        cast: ['gendu', 'gustuyul', 'kunkun'],
        popupText: 'STATUS: NEPOTISME HALAL (SESUAI KONSTITUSI)',
        popupColor: 'blue',
        sfxCues: ['camera', 'giggle', 'pop'],
        rawDialog:
          "PAK GENDU: Ini bukan dinasti! Ini adalah regenerasi hantu muda! Rakyat bebas memilih atau tidak memilih—tapi tetap dia yang menang! <break time='0.5s'/> KUN-KUN: Hihihi... hebat ya, bapaknya yang bikin aturan, pamannya yang ketok palu, anaknya yang daftar!",
      },
      {
        title: 'Wawancara Visi Misi Pejabat Muda',
        locationDesc: 'Studio TV Gaib dengan lampu sorot terang.',
        visualDesc: 'Host Hantu bertanya ke Gus Tuyul Muda yang bingung menoleh ke arah Pak Gendu.',
        moodDesc: 'Canggung kocak',
        backgroundId: 'ruang_server',
        weather: 'none',
        lighting: 'neon_dark',
        transitionIn: 'slide_left',
        cast: ['host', 'gustuyul', 'poci'],
        popupText: 'DEBAT PUBLIK: DIBANTU BISIKAN ORANG TUA',
        popupColor: 'yellow',
        sfxCues: ['pop'],
        rawDialog:
          "HOST HANTU: Apa program kerja Anda untuk mengatasi kemiskinan arwah? <break time='0.5s'/> GUS TUYUL: Eee... kita akan... bagi-bagi susu dan... eee... lanjutkan program Bapak! <break time='0.5s'/> POCI: Lah, jawabannya cuma dua kalimat?",
      },
      {
        title: 'Anggaran Joget & Pencitraan',
        locationDesc: 'Panggung hiburan rakyat di tengah kuburan dengan lampu disko.',
        visualDesc: 'Gus Tuyul Muda berjoget di atas panggung membagikan kaus gratis.',
        moodDesc: 'Meriah satir',
        backgroundId: 'gerbang_syuting',
        weather: 'sparkles',
        lighting: 'golden',
        transitionIn: 'zoom_whip',
        cast: ['gustuyul', 'kunkun', 'poci'],
        popupText: 'BERSAMBUNG...',
        popupColor: 'stamp',
        arsipBoxText: 'Ketika aturan hukum bisa ditekuk seperti kawat, maka keluarga sendiri selalu paling hebat.',
        sfxCues: ['boing', 'stamp'],
        rawDialog:
          "NARATOR: Tanpa pengalaman kerja, Gus Tuyul Muda pun resmi dilantik dengan strategi jitu: joget gemoy di atas panggung. <break time='0.5s'/> KUN-KUN: Warga langsung lupa sama harga kemenyan yang naik! <break time='0.5s'/> POCI: Terus uang buat konser jogetnya dari mana?!",
      },
    ]
  ),

  // EPISODE 8
  buildEpisode(
    8,
    'Skandal Tambang Batu Nisan Triliunan',
    'Korupsi tata niaga tambang bernilai ratusan triliun dengan kerugian ekologis alam yang besar.',
    [
      {
        title: 'Bukit Kuburan yang Gundul',
        locationDesc: 'Bukit pemakaman berlubang menganga penuh debu tambang batu nisan.',
        visualDesc: 'Poci berdiri di tepi jurang tambang memegangi kain kafannya yang tertiup debu.',
        moodDesc: 'Kelam, berdebu',
        backgroundId: 'bukit_tambang',
        weather: 'ash',
        lighting: 'storm',
        transitionIn: 'fade',
        cast: ['poci', 'kunkun'],
        popupText: 'KERUGIAN ALAM GAIB: Rp 271 TRILIUN',
        popupColor: 'red',
        sfxCues: ['pop'],
        rawDialog:
          "NARATOR: Untuk membiayai pesta dan proyek elite, bukit keramat Alam Indis dikeruk habis-habisan demi tambang batu nisan. <break time='0.5s'/> POCI: Kun, bukit ini kan penahan banjir kuburan! Kalau dikeruk semua gimana?! <break time='0.5s'/> KUN-KUN: Tenang Ci, izinnya resmi kok—atas nama yayasan amal!",
      },
      {
        title: 'Rumah Mewah di Balik Tanah Longsor',
        locationDesc: 'Istana megah milik Nyi Blorong-X dan Pak Gendu dengan tumpukan emas.',
        visualDesc: 'Nyi Blorong-X menghitung berlian bersama Tuyul sementara warga tertimbun longsor.',
        moodDesc: 'Kontras tajam',
        backgroundId: 'istana_mewah',
        weather: 'sparkles',
        lighting: 'golden',
        transitionIn: 'slide_left',
        cast: ['blorong', 'tuyul', 'gendu'],
        popupText: 'HUKUMAN KORUPTOR: POTONGAN MASA HUKUMAN + SENYUM MANIS',
        popupColor: 'yellow',
        sfxCues: ['coin', 'pop'],
        rawDialog:
          "NYI BLORONG-X: Lumayan, hasil tambang ilegalnya kita catat sebagai hibah sukarela. <break time='0.5s'/> NARATOR: Sementara pengusaha berpesta menghitung untung, warga kuburan di bawah bukit mulai tertimbun tanah longsor.",
      },
      {
        title: 'Sidang Koruptor yang Penuh Senyum',
        locationDesc: 'Ruang pengadilan Alam Indis yang sejuk ber-AC.',
        visualDesc: 'Tersangka tambang melambai ramah ke kamera wartawan sambil tersenyum santai.',
        moodDesc: 'Ironis menggelikan',
        backgroundId: 'ruang_sidang_mkk',
        weather: 'none',
        lighting: 'normal',
        transitionIn: 'flash_white',
        cast: ['poci', 'kunkun', 'blorong'],
        popupText: 'VONIS: 4 TAHUN (DISKON HARI RAYA JADI 1 TAHUN)',
        popupColor: 'blue',
        sfxCues: ['camera', 'giggle', 'pop'],
        rawDialog:
          "POCI: Kun, kok koruptor dua ratus triliun di sidang malah senyum-senyum dadah ke kamera? <break time='0.5s'/> KUN-KUN: Hihihi... soalnya dia tahu hukumannya cuma sebentar, potong remisi hari raya hantu, keluar-keluar masih kaya raya!",
      },
      {
        title: 'Asap Tambang Menyerang Warga',
        locationDesc: 'Perkampungan hantu diselimuti asap hitam pekat pabrik peleburan.',
        visualDesc: 'Warga hantu berkumpul marah menuju kantor kelurahan di tengah kepulan asap.',
        moodDesc: 'Klimaks kemarahan warga',
        backgroundId: 'bukit_tambang',
        weather: 'ash',
        lighting: 'dramatic_red',
        transitionIn: 'zoom_whip',
        cast: ['poci', 'kunkun', 'warga'],
        popupText: 'BERSAMBUNG...',
        popupColor: 'stamp',
        arsipBoxText: 'Mencuri ayam dihukum babak belur, mencuri gunung dibalas senyuman.',
        sfxCues: ['bruk', 'stamp'],
        rawDialog:
          "NARATOR: Debu tambang membuat para hantu sesak napas. Kesabaran warga Alam Indis pun mencapai batasnya! <break time='0.5s'/> POCI: Kun, warga mulai mengepung kantor kita! <break time='0.5s'/> KUN-KUN: Waduh, kali ini bukan cuma demo biasa, Ci!",
      },
    ]
  ),

  // EPISODE 9
  buildEpisode(
    9,
    'Razia Demo dan Oknum Aparat Alam Baka',
    'Penanganan demonstrasi warga dengan aparat represif, rekayasa kasus, dan pengamanan proyek elite.',
    [
      {
        title: 'Barikade Aparat di Depan Kantor Kelurahan',
        locationDesc: 'Halaman depan Kantor Kelurahan dipasangi barikade kawat.',
        visualDesc: 'Warga hantu berdemo. Poci terjepit di tengah sementara Pak Gendu berseragam aparat berjaga.',
        moodDesc: 'Tegang',
        backgroundId: 'gerbang_syuting',
        weather: 'none',
        lighting: 'dramatic_red',
        transitionIn: 'fade',
        cast: ['poci', 'gendu', 'warga'],
        popupText: 'STATUS DEMO: DILARANG (MENGGANGGU TIDUR PEJABAT)',
        popupColor: 'red',
        sfxCues: ['pop', 'gavel'],
        rawDialog:
          "NARATOR: Alih-alih mendengarkan keluhan warga, pejabat malah mengerahkan pasukan khusus penjaga ketertiban gaib. <break time='0.5s'/> POCI: Pak, warga cuma mau nanya ke mana uang pajaknya! <break time='0.5s'/> APARAT GENDU: Dilarang protes tanpa izin tertulis dari yang diprotes!",
      },
      {
        title: 'Gas Air Mata Kemenyan Kadaluarsa',
        locationDesc: 'Kerumunan warga yang mulai didorong mundur oleh asap kemenyan.',
        visualDesc: 'Asap kemenyan kadaluarsa tertiup angin balik ke kantor membuat Kun-Kun ikut terbatuk.',
        moodDesc: 'Slapstick satir',
        backgroundId: 'kuburan_berkabut',
        weather: 'ash',
        lighting: 'storm',
        transitionIn: 'flash_white',
        cast: ['kunkun', 'warga', 'gendu'],
        popupText: 'ANGGARAN GAS KEMENYAN: Rp 50 MILIAR (KADALUARSA)',
        popupColor: 'yellow',
        sfxCues: ['boing', 'pop'],
        rawDialog:
          "KUN-KUN: Uhuk! Uhuk! Woi, itu asap kemenyannya arah anginnya balik ke kantor! <break time='0.5s'/> NARATOR: Seperti biasa, senjata yang dibeli dengan anggaran mahal itu justru memakan tuan sendiri.",
      },
      {
        title: 'Kamera CCTV Mendadak Rusak',
        locationDesc: 'Tiang CCTV di depan gerbang kelurahan.',
        visualDesc: 'Tuyul diam-diam mencabut kabel CCTV dan menempelkan kertas SEDANG PERBAIKAN.',
        moodDesc: 'Licik',
        backgroundId: 'kantor_bocor',
        weather: 'none',
        lighting: 'moonlight',
        transitionIn: 'slide_left',
        cast: ['poci', 'tuyul', 'kunkun'],
        popupText: 'CCTV: NO SIGNAL (MENDADAK BUTA)',
        popupColor: 'red',
        sfxCues: ['error', 'giggle'],
        rawDialog:
          "POCI: Loh, kok CCTV-nya dicabut?! <break time='0.5s'/> TUYUL: Perintah atasan, Mas! Biar kejadian hari ini tidak terekam sejarah! <break time='0.5s'/> KUN-KUN: Hihihi... di sini CCTV punya mata batin, cuma mati pas lagi ada kejadian penting!",
      },
      {
        title: 'Warga Beralih ke Dunia Maya Gaib',
        locationDesc: 'Kamar terang oleh cahaya layar ponsel warga hantu.',
        visualDesc: 'Video kericuhan menjadi trending nomor satu di media sosial gaib.',
        moodDesc: 'Viral digital',
        backgroundId: 'ruang_server',
        weather: 'sparkles',
        lighting: 'neon_dark',
        transitionIn: 'zoom_whip',
        cast: ['poci', 'kunkun'],
        popupText: 'BERSAMBUNG...',
        popupColor: 'stamp',
        arsipBoxText: 'Suara di jalanan bisa dibubarkan, tapi rekaman di ponsel warga menyebar lebih cepat dari setan.',
        sfxCues: ['pop', 'stamp'],
        rawDialog:
          "NARATOR: Aparat berhasil membubarkan massa di jalan, tapi mereka lupa satu hal: ribuan ponsel warga sudah merekam semuanya! <break time='0.5s'/> POCI: Kun, tagar #IndisGelap jadi trending nomor satu! <break time='0.5s'/> KUN-KUN: Siap-siap, sebentar lagi pasukan buzzer dikerahkan!",
      },
    ]
  ),

  // EPISODE 10
  buildEpisode(
    10,
    'Pabrik Tuyul Buzzer dan Akun Ternakan',
    'Penggunaan pendengung (buzzer) dan bot untuk membelokkan opini publik serta menyerang pengkritik.',
    [
      {
        title: 'Ruang Rahasia Berisi Ribuan Tuyul dan HP',
        locationDesc: 'Gudang bawah tanah kelurahan penuh rak ribuan ponsel menyala.',
        visualDesc: 'Tuyul mengetik super cepat menggunakan jari kaki dan tangan memakai kacamata hitam.',
        moodDesc: 'Cyber-gaib sibuk',
        backgroundId: 'gudang_buzzer',
        weather: 'sparkles',
        lighting: 'neon_dark',
        transitionIn: 'fade',
        cast: ['tuyul', 'poci', 'kunkun'],
        popupText: 'OPERASI CUCI OTAK: 10.000 KOMENTAR / DETIK',
        popupColor: 'blue',
        sfxCues: ['pop'],
        rawDialog:
          "NARATOR: Untuk meredam tagar #IndisGelap, Pak Gendu mengaktifkan divisi paling rahasia: Peternakan Tuyul Buzzer. <break time='0.5s'/> POCI: Kun, ini kok Tuyul-Tuyul pada megang sepuluh HP semua? <break time='0.5s'/> KUN-KUN: Mereka lagi kerja lembur memuji kebijakan Bapak, Ci!",
      },
      {
        title: 'Template Komentar Seragam',
        locationDesc: 'Layar ponsel raksasa menampilkan kolom komentar media sosial gaib.',
        visualDesc: 'Komentar-komentar identik bermunculan serentak di layar.',
        moodDesc: 'Satir media sosial',
        backgroundId: 'gudang_buzzer',
        weather: 'none',
        lighting: 'neon_dark',
        transitionIn: 'slide_left',
        cast: ['poci', 'kunkun', 'tuyul'],
        popupText: 'AKUN ASLI: 0% | AKUN TERNAKAN: 100%',
        popupColor: 'yellow',
        sfxCues: ['pop', 'giggle'],
        rawDialog:
          "POCI: Lah, kok kalimat pujiannya sama semua? Sampai typo-nya aja kembar! <break time='0.5s'/> KUN-KUN: Hihihi... namanya juga sistem copy-paste, Ci. Yang penting kelihatan banyak yang dukung!",
      },
      {
        title: 'Warga yang Kritis Dituduh Antek Asing',
        locationDesc: 'Rumah hantu warga yang mengunggah foto jalan rusak.',
        visualDesc: 'Tuyul Buzzer menyerbu kolom komentar warga kritis dengan cap antek asing.',
        moodDesc: 'Intimidasi siber',
        backgroundId: 'ruang_server',
        weather: 'none',
        lighting: 'dramatic_red',
        transitionIn: 'flash_white',
        cast: ['warga', 'tuyul', 'kunkun'],
        popupText: 'TARGET DIKUNCI: CAP ANTEK ASING ✔',
        popupColor: 'red',
        sfxCues: ['error', 'pop'],
        rawDialog:
          "NARATOR: Siapa pun warga yang mengeluh jalan rusak atau harga kemenyan mahal, langsung dicap tidak bersyukur. <break time='0.5s'/> KUN-KUN: Jurus pamungkas kalau kalah argumen ya nuduh kritik sebagai upaya memecah belah alam gaib!",
      },
      {
        title: 'Anggaran Buzzer Lebih Besar dari Gaji Honorer',
        locationDesc: 'Meja bendahara tempat Poci menerima slip gajinya.',
        visualDesc: 'Poci menatap slip gajinya yang dipotong sementara Tuyul menerima sekarung emas.',
        moodDesc: 'Menyayat hati, titik balik Poci',
        backgroundId: 'meja_lpj',
        weather: 'none',
        lighting: 'moonlight',
        transitionIn: 'zoom_whip',
        cast: ['poci', 'kunkun', 'tuyul'],
        popupText: 'BERSAMBUNG...',
        popupColor: 'stamp',
        arsipBoxText: 'Uang untuk memperbaiki fasilitas selalu kurang, tapi uang untuk memuji diri sendiri selalu tersedia.',
        sfxCues: ['coin', 'stamp'],
        rawDialog:
          "POCI: Kun, gaji honorerku bulan ini kok dipotong lagi? <break time='0.5s'/> KUN-KUN: Buat bayar bonus Tuyul Buzzer, Ci. Kan jasa mereka lebih penting daripada kerjamu! <break time='0.5s'/> NARATOR: Kesal dengan ketidakadilan ini, Poci akhirnya menemukan skandal keuangan yang jauh lebih besar!",
      },
    ]
  ),

  // EPISODE 11
  buildEpisode(
    11,
    'Kereta Kencana Pribadi dan Flexing Keluarga Pejabat',
    'Gaya hidup mewah (flexing) keluarga pejabat di media sosial saat rakyat diminta hidup hemat.',
    [
      {
        title: 'Pamer Naik Kereta Kencana Emas ke Luar Negeri',
        locationDesc: 'Layar ponsel media sosial keluarga pejabat dengan kemewahan emas.',
        visualDesc: 'Poci dan Kun-Kun melihat foto pamer kemewahan roti kemenyan 400 ribu.',
        moodDesc: 'Silau kemewahan',
        backgroundId: 'istana_mewah',
        weather: 'sparkles',
        lighting: 'golden',
        transitionIn: 'fade',
        cast: ['poci', 'kunkun', 'gendu'],
        popupText: 'HARGA ROTI: Rp 400.000 (TEBENG TEMAN ✔)',
        popupColor: 'red',
        sfxCues: ['camera', 'coin', 'pop'],
        rawDialog:
          "NARATOR: Di saat warga diminta berhemat dan membayar pajak lompatan, keluarga Pak Gendu justru rajin pamer kemewahan di media sosial. <break time='0.5s'/> POCI: Kun, ini istri Pak Gendu naik kereta kencana pribadi ke Kuburan Eropa? <break time='0.5s'/> KUN-KUN: Iya Ci, makan rotinya aja seharga gaji honorer kamu sebulan!",
      },
      {
        title: 'Klarifikasi Klasik: Cuma Numpang Teman',
        locationDesc: 'Ruang konferensi pers Kantor Kelurahan.',
        visualDesc: 'Pak Gendu berkeringat dingin di depan wartawan didampingi Tuyul.',
        moodDesc: 'Canggung defensif',
        backgroundId: 'gerbang_syuting',
        weather: 'none',
        lighting: 'normal',
        transitionIn: 'flash_white',
        cast: ['gendu', 'tuyul', 'kunkun'],
        popupText: 'ALASAN RESMI: NEBENG TEMAN (KEBETULAN)',
        popupColor: 'yellow',
        sfxCues: ['camera', 'giggle', 'pop'],
        rawDialog:
          "PAK GENDU: Itu bukan kereta dinas! Anak dan istri saya cuma nebeng kereta kencana punya teman! Kebetulan searah! <break time='0.5s'/> KUN-KUN: Hihihi... enaknya punya teman yang kebetulan searah ke luar negeri dan kebetulan dapat proyek tambang!",
      },
      {
        title: 'Tas Mewah Ratusan Juta Ternyata KW',
        locationDesc: 'Meja pemeriksaan harta kekayaan pejabat (LHKPN Gaib).',
        visualDesc: 'Petugas memeriksa tumpukan tas mewah. Pak Gendu tersenyum percaya diri.',
        moodDesc: 'Satir harta pejabat',
        backgroundId: 'meja_lpj',
        weather: 'none',
        lighting: 'normal',
        transitionIn: 'slide_left',
        cast: ['host', 'gendu', 'poci'],
        popupText: 'LAPORAN HARTA: 100% BARANG KW & WARISAN',
        popupColor: 'blue',
        sfxCues: ['gavel', 'pop'],
        rawDialog:
          "PETUGAS: Bagaimana Bapak bisa membeli tiga puluh tas kulit naga ini dengan gaji kelurahan? <break time='0.5s'/> PAK GENDU: Oh, itu semua barang KW beli di pasar loak kuburan! <break time='0.5s'/> POCI: Lah, barang KW kok ada sertifikat keaslian dari Paris?!",
      },
      {
        title: 'Warga Mulai Menggugat ke Pengadilan',
        locationDesc: 'Gerbang Pengadilan Tinggi Alam Indis dipadati warga.',
        visualDesc: 'Poci menyerahkan map bukti skandal ke Kun-Kun untuk dibongkar di sidang.',
        moodDesc: 'Epik bertekad',
        backgroundId: 'ruang_sidang_mkk',
        weather: 'none',
        lighting: 'dramatic_red',
        transitionIn: 'zoom_whip',
        cast: ['poci', 'kunkun', 'warga'],
        popupText: 'BERSAMBUNG...',
        popupColor: 'stamp',
        arsipBoxText: 'Di depan rakyat berpidato soal kesederhanaan, di belakang layar berlomba pamer kemewahan.',
        sfxCues: ['pop', 'stamp'],
        rawDialog:
          "NARATOR: Amarah rakyat Alam Indis tak lagi terbendung. Bukti-bukti skandal mulai dikumpulkan untuk menyeret para elite ke meja hijau. <break time='0.5s'/> POCI: Kun, berkas rahasia anggaran kemenyan dan tambang sudah aku salin! <break time='0.5s'/> KUN-KUN: Bagus Ci! Saatnya kita bongkar di sidang terbuka!",
      },
    ]
  ),

  // EPISODE 12
  buildEpisode(
    12,
    'Hujan Bansos Jelang Pemilihan Kepala Kuburan',
    'Politisasi bantuan sosial dan serangan fajar menjelang pemilihan umum untuk membeli suara rakyat.',
    [
      {
        title: 'Mendadak Ramah Menjelang Pemilihan',
        locationDesc: 'Jalanan kuburan penuh baliho raksasa wajah Pak Gendu dan Gus Tuyul Muda.',
        visualDesc: 'Pak Gendu turun ke selokan kuburan memeluk warga diikuti kameramen.',
        moodDesc: 'Pencitraan pemilu',
        backgroundId: 'gerbang_syuting',
        weather: 'petals',
        lighting: 'golden',
        transitionIn: 'fade',
        cast: ['gendu', 'poci', 'kunkun', 'warga'],
        popupText: 'MODE MERAKYAT: AKTIF HINGGA HARI-H',
        popupColor: 'yellow',
        sfxCues: ['camera', 'pop'],
        rawDialog:
          "NARATOR: Menjelang Pemilihan Kepala Kuburan, penyakit lupa ingatan pejabat mendadak sembuh total. Mereka turun menyapa rakyat! <break time='0.5s'/> POCI: Tumben Pak Gendu mau masuk selokan kuburan? <break time='0.5s'/> KUN-KUN: Cuma sampai hari pencoblosan, Ci. Besoknya selokannya ditutup lagi!",
      },
      {
        title: 'Bansos Berstiker Wajah Pejabat',
        locationDesc: 'Truk pengangkut paket sembako dan kemenyan di depan balai kuburan.',
        visualDesc: 'Tuyul membagikan amplop dan paket berstiker wajah Pak Gendu.',
        moodDesc: 'Klaim sepihak',
        backgroundId: 'meja_lpj',
        weather: 'none',
        lighting: 'normal',
        transitionIn: 'slide_left',
        cast: ['tuyul', 'poci', 'kunkun'],
        popupText: 'SUMBER DANA: KAS RAKYAT | KLAIM: PRIBADI ✔',
        popupColor: 'red',
        sfxCues: ['coin', 'giggle', 'pop'],
        rawDialog:
          "TUYUL: Ini bantuan dari Bapak ya, jangan lupa coblos nomor urut satu! <break time='0.5s'/> POCI: Loh, itu kan uang kas negara gaib, kok stikernya wajah Pak Gendu pribadi?! <break time='0.5s'/> KUN-KUN: Hihihi... uangnya punya rakyat, jasanya diklaim pejabat!",
      },
      {
        title: 'Serangan Fajar Malam Jumat Kliwon',
        locationDesc: 'Suasana gelap tengah malam di depan rumah-rumah nisan warga.',
        visualDesc: 'Tuyul mengendap menyelipkan amplop receh di bawah batu nisan.',
        moodDesc: 'Gelap mengendap',
        backgroundId: 'kuburan_berkabut',
        weather: 'none',
        lighting: 'moonlight',
        transitionIn: 'flash_white',
        cast: ['tuyul', 'kunkun'],
        popupText: 'HARGA SUARA RAKYAT: DISKON BESAR-BESARAN',
        popupColor: 'blue',
        sfxCues: ['coin', 'pop'],
        rawDialog:
          "NARATOR: Di malam sebelum pemilihan, pasukan serangan fajar bergerak membagikan amplop receh untuk membeli suara lima tahun ke depan. <break time='0.5s'/> KUN-KUN: Murah banget ya harga nasib warga lima tahun, cuma ditukar sebungkus kemenyan dan satu amplop tipis!",
      },
      {
        title: 'Kotak Suara yang Sulap Angka',
        locationDesc: 'Bilik suara pemilihan di balai kelurahan.',
        visualDesc: 'Poci menjaga kotak suara namun layar rekapitulasi berubah angka sendiri.',
        moodDesc: 'Tegang, kecurangan digital',
        backgroundId: 'bilik_suara',
        weather: 'none',
        lighting: 'dramatic_red',
        transitionIn: 'zoom_whip',
        cast: ['poci', 'kunkun'],
        popupText: 'BERSAMBUNG...',
        popupColor: 'stamp',
        arsipBoxText: 'Bantuan yang turun mendadak menjelang pemilihan bukanlah tanda cinta, melainkan uang muka untuk balik modal.',
        sfxCues: ['error', 'stamp'],
        rawDialog:
          "NARATOR: Warga tetap datang mencoblos dengan harapan perubahan. Namun saat penghitungan suara dimulai, layar rekapitulasi mendadak berubah angka sendiri! <break time='0.5s'/> POCI: Loh Kun, kok angkanya lompat jauh banget?! <break time='0.5s'/> KUN-KUN: Wah, aplikasi SI-GENTAYANGAN berulah lagi!",
      },
    ]
  ),

  // EPISODE 13
  buildEpisode(
    13,
    'Sulap Angka Rekapitulasi dan Alasan Salah Baca',
    'Keanehan sistem penghitungan suara digital (OCR/Sirekap) yang menggelembungkan suara dan alasan human error.',
    [
      {
        title: 'Suara 10 Berubah Jadi 10.000',
        locationDesc: 'Layar besar pusat tabulasi suara di Kantor Kelurahan.',
        visualDesc: 'Formulir tertulis 10, tapi di layar digital tertulis 10.000. Poci mengucek matanya.',
        moodDesc: 'Terheran-heran',
        backgroundId: 'bilik_suara',
        weather: 'none',
        lighting: 'neon_dark',
        transitionIn: 'fade',
        cast: ['poci', 'kunkun'],
        popupText: 'DATA KERTAS: 10 | DATA LAYAR: 10.000 (AKURAT ✔)',
        popupColor: 'red',
        sfxCues: ['error', 'pop'],
        rawDialog:
          "NARATOR: Di papan rekapitulasi digital, keajaiban matematika terjadi. Angka sepuluh di kertas mendadak berubah menjadi sepuluh ribu di layar. <break time='0.5s'/> POCI: Kun, ini sistemnya belajar ilmu sulap dari mana?! <break time='0.5s'/> KUN-KUN: Itu namanya teknologi kecerdasan buatan—buatan orang dalam!",
      },
      {
        title: 'Konferensi Pers Alasan Salah Baca Sistem',
        locationDesc: 'Meja komisioner pemilihan gaib.',
        visualDesc: 'Ketua panitia tampil tenang menunjuk diagram membingungkan di depan wartawan.',
        moodDesc: 'Satir klarifikasi',
        backgroundId: 'gerbang_syuting',
        weather: 'none',
        lighting: 'normal',
        transitionIn: 'slide_left',
        cast: ['host', 'kunkun'],
        popupText: 'KLARIFIKASI: HUMAN ERROR (KEBETULAN TERUS)',
        popupColor: 'yellow',
        sfxCues: ['giggle', 'pop'],
        rawDialog:
          "KETUA PANITIA: Ini hanya kesalahan sistem pembacaan tulisan tangan! Tidak ada niat curang, hanya kebetulan salah bacanya selalu menguntungkan nomor satu! <break time='0.5s'/> KUN-KUN: Hihihi... kebetulan yang sangat terstruktur dan sistematis ya, Pak!",
      },
      {
        title: 'Rapat Pleno Tengah Malam Tanpa Saksi',
        locationDesc: 'Ruang rapat tertutup bertirai rapat.',
        visualDesc: 'Tuyul dan panitia mengetok palu pengesahan dalam tiga menit di tengah malam.',
        moodDesc: 'Kilat mencurigakan',
        backgroundId: 'ruang_sidang_mkk',
        weather: 'none',
        lighting: 'moonlight',
        transitionIn: 'flash_white',
        cast: ['poci', 'tuyul', 'hakim'],
        popupText: 'HASIL PEMILIHAN: SAH (TANPA PERLU PROTES)',
        popupColor: 'green',
        sfxCues: ['gavel', 'pop'],
        rawDialog:
          "NARATOR: Ketika warga tertidur lelah menunggu, hasil pemilihan pun disahkan secepat kilat di ruang tertutup. <break time='0.5s'/> POCI: Loh, kok sudah sah aja?! Saksi warga belum tanda tangan! <break time='0.5s'/> TUYUL: Tanda tangannya sudah kami wakili demi efisiensi waktu!",
      },
      {
        title: 'Poci & Kun-Kun Membocorkan Bukti',
        locationDesc: 'Atap Kantor Kelurahan di bawah cahaya bulan purnama.',
        visualDesc: 'Poci dan Kun-Kun menekan tombol Kirim ke Publik untuk menyebar semua bukti.',
        moodDesc: 'Heroik komedi',
        backgroundId: 'kuburan_berkabut',
        weather: 'sparkles',
        lighting: 'moonlight',
        transitionIn: 'zoom_whip',
        cast: ['poci', 'kunkun'],
        popupText: 'BERSAMBUNG...',
        popupColor: 'stamp',
        arsipBoxText: 'Bukan siapa yang mencoblos yang menentukan hasil, melainkan siapa yang menghitung suaranya.',
        sfxCues: ['pop', 'stamp'],
        rawDialog:
          "KUN-KUN: Mereka pikir permainan sudah selesai, Ci. <break time='0.5s'/> POCI: Terus kita harus apa, Kun? <break time='0.5s'/> KUN-KUN: Pencet tombol Kirim ke Publik! Biar seluruh Alam Indis lihat semua rekaman asli dari Episode Satu!",
      },
    ]
  ),

  // EPISODE 14
  buildEpisode(
    14,
    'Panik Berjamaah dan Jurus Amnesia Pejabat',
    'Reaksi pejabat saat skandal terbongkar: mendadak sakit, pakai kursi roda, dan mengaku lupa ingatan.',
    [
      {
        title: 'Video Skandal Tersebar ke Seluruh Kuburan',
        locationDesc: 'Kantor kelurahan dipenuhi kepanikan, Pak Gendu membakar kertas berkas.',
        visualDesc: 'Pak Gendu dan Tuyul panik membakar berkas arsip agar barang bukti hilang.',
        moodDesc: 'Panik chaos',
        backgroundId: 'kantor_bocor',
        weather: 'ash',
        lighting: 'dramatic_red',
        transitionIn: 'fade',
        cast: ['poci', 'gendu', 'tuyul'],
        popupText: 'STATUS DARURAT: BAKAR SEMUA ARSIP!',
        popupColor: 'red',
        sfxCues: ['error', 'pop'],
        rawDialog:
          "NARATOR: Begitu seluruh arsip kelam tersebar, kepanikan melanda istana kuburan. Mesin penghancur kertas bekerja lembur tanpa henti. <break time='0.5s'/> POCI: Pak, berkasnya jangan dibakar, nanti kantornya ikut kebakar! <break time='0.5s'/> PAK GENDU: Biar! Yang penting barang bukti hilang!",
      },
      {
        title: 'Mendadak Sakit dan Pakai Kursi Roda',
        locationDesc: 'Lorong pengadilan Alam Indis.',
        visualDesc: 'Pak Gendu muncul memakai penyangga leher dan masker di atas kursi roda didorong Tuyul.',
        moodDesc: 'Sinetron pejabat sakit',
        backgroundId: 'ruang_sidang_mkk',
        weather: 'none',
        lighting: 'normal',
        transitionIn: 'slide_left',
        cast: ['gendu', 'tuyul', 'kunkun'],
        popupText: 'DIAGNOSA MEDIS: ALERGI PERTANYAAN HAKIM',
        popupColor: 'blue',
        sfxCues: ['giggle', 'pop'],
        rawDialog:
          "NARATOR: Saat surat panggilan sidang tiba, penyakit langka langsung menyerang para pejabat: mendadak lumpuh dan hilang ingatan. <break time='0.5s'/> KUN-KUN: Hihihi... kemarin sehat walafiat pas nerima amplop, hari ini langsung butuh kursi roda!",
      },
      {
        title: 'Jurus Sakti: Saya Lupa dan Tidak Tahu',
        locationDesc: 'Ruang sidang utama dipenuhi warga hantu sebagai saksi.',
        visualDesc: 'Hakim bertanya dengan bukti lengkap, Pak Gendu menggeleng mengaku lupa dan menyalahkan Tuyul.',
        moodDesc: 'Sidang panas kocak',
        backgroundId: 'ruang_sidang_mkk',
        weather: 'none',
        lighting: 'normal',
        transitionIn: 'flash_white',
        cast: ['hakim', 'gendu', 'tuyul'],
        popupText: 'JAWABAN TERDAKWA: 99% LUPA, 1% SALAHKAN BAWAHAN',
        popupColor: 'yellow',
        sfxCues: ['gavel', 'pop'],
        rawDialog:
          "HAKIM: Saudara terdakwa, apakah benar Anda memerintahkan pemotongan bansos dan tambang ilegal? <break time='0.5s'/> PAK GENDU: Yang Mulia... saya lupa... saya tidak tahu... itu inisiatif bawahan saya... <break time='0.5s'/> TUYUL: Loh, kok saya yang ditumbalkan, Pak?!",
      },
      {
        title: 'Poci Menjadi Saksi Kunci',
        locationDesc: 'Kursi saksi di tengah ruang sidang.',
        visualDesc: 'Poci melompat naik ke kursi saksi membawa map merah legendarisnya.',
        moodDesc: 'Klimaks saksi kunci',
        backgroundId: 'ruang_sidang_mkk',
        weather: 'sparkles',
        lighting: 'golden',
        transitionIn: 'zoom_whip',
        cast: ['poci', 'kunkun', 'hakim', 'gendu'],
        popupText: 'BERSAMBUNG...',
        popupColor: 'stamp',
        arsipBoxText: 'Ingatan pejabat sangat tajam saat menghitung proyek, tapi mendadak tumpul saat ditanya tanggung jawab.',
        sfxCues: ['boing', 'giggle', 'stamp'],
        rawDialog:
          "NARATOR: Di saat para pejabat saling lempar tanggung jawab, Poci si kurir honorer melompat ke kursi saksi membawa bukti pamungkas. <break time='0.5s'/> POCI: Permisi Yang Mulia, saya punya catatan lengkap dari hari pertama! <break time='0.5s'/> KUN-KUN: Habis riwayatmu, Pak! Hihihi!",
      },
    ]
  ),

  // EPISODE 15
  buildEpisode(
    15,
    'Vonis Ringan dan Siklus Baru Alam Indis',
    'Akhir drama korupsi: hukuman ringan bagi elite, ganti wajah pejabat baru, namun sistem lama tetap berulang.',
    [
      {
        title: 'Vonis yang Mengejutkan Warga',
        locationDesc: 'Ruang sidang Pengadilan Alam Indis.',
        visualDesc: 'Hakim mengetok palu membacakan vonis ringan. Wajah Poci dan warga langsung melongo.',
        moodDesc: 'Antiklimaks satir',
        backgroundId: 'ruang_sidang_mkk',
        weather: 'none',
        lighting: 'normal',
        transitionIn: 'fade',
        cast: ['hakim', 'poci', 'gendu', 'warga'],
        popupText: 'VONIS AKHIR: MINTA MAAF + POTONGAN REMISI ✔',
        popupColor: 'red',
        sfxCues: ['gavel', 'pop'],
        rawDialog:
          "NARATOR: Setelah sidang maraton yang melelahkan, palu keadilan akhirnya diketok. <break time='0.5s'/> HAKIM: Terdakwa Pak Gendu dinyatakan bersalah merugikan alam gaib triliunan rupiah, dan dijatuhi hukuman... satu tahun percobaan serta wajib meminta maaf! <break time='0.5s'/> POCI: Hah?! Cuma minta maaf?!",
      },
      {
        title: 'Sel Tahanan Rasa Hotel Bintang Lima',
        locationDesc: 'Penjara Khusus Koruptor Gaib dengan kasur empuk, AC, TV besar, dan prasmanan.',
        visualDesc: 'Pak Gendu melepas penyangga leher dan melompat bugar bersama Nyi Blorong-X.',
        moodDesc: 'Mewah satir',
        backgroundId: 'istana_mewah',
        weather: 'sparkles',
        lighting: 'golden',
        transitionIn: 'flash_white',
        cast: ['gendu', 'blorong', 'kunkun'],
        popupText: 'SEL TAHANAN VIP: FASILITAS FULL SERVICE',
        popupColor: 'yellow',
        sfxCues: ['boing', 'giggle', 'pop'],
        rawDialog:
          "PAK GENDU: Aduh, pegal juga akting sakit! Ayo lanjutkan rapat proyek berikutnya dari dalam sel! <break time='0.5s'/> KUN-KUN: Hihihi... penjara di sini cuma pindah kamar tidur doang, Ci. Fasilitasnya lebih mewah dari rumah rakyat!",
      },
      {
        title: 'Pejabat Baru, Gaya Lama',
        locationDesc: 'Kantor Kelurahan dicat ulang dengan spanduk ERA BARU ALAM INDIS BERSIH.',
        visualDesc: 'Gus Tuyul Muda duduk di kursi Kepala Dinas memakai pin emas baru menandatangani anggaran 5 miliar.',
        moodDesc: 'Siklus berulang',
        backgroundId: 'meja_lpj',
        weather: 'none',
        lighting: 'normal',
        transitionIn: 'slide_left',
        cast: ['gustuyul', 'poci', 'kunkun'],
        popupText: 'ANGGARAN BARU: Rp 5.000.000.000 (REKOR BARU ✔)',
        popupColor: 'blue',
        sfxCues: ['gavel', 'pop'],
        rawDialog:
          "NARATOR: Pak Gendu memang masuk sel VIP, namun kursi jabatan kini diduduki oleh Gus Tuyul Muda dengan semangat baru. <break time='0.5s'/> POCI: Kun, ini anggaran kemenyan bulan depan kok naik jadi lima miliar?! <break time='0.5s'/> KUN-KUN: Namanya juga pejabat baru, Ci—targetnya harus lebih tinggi!",
      },
      {
        title: 'Pesan Terakhir untuk Penonton di Alam Nyata',
        locationDesc: 'Halaman depan Kantor Kelurahan di bawah bulan purnama.',
        visualDesc: 'Poci dan Kun-Kun menatap langsung ke kamera memecah dinding keempat.',
        moodDesc: 'Reflektif satir penutup',
        backgroundId: 'kuburan_berkabut',
        weather: 'petals',
        lighting: 'moonlight',
        transitionIn: 'fade',
        cast: ['poci', 'kunkun'],
        popupText: 'TAMAT... (UNTUK SEMENTARA)',
        popupColor: 'stamp',
        arsipBoxText:
          'Wajah pemimpin boleh berganti, spanduk boleh diperbarui, tapi selama sistemnya sama, cerita ini akan terus berulang.',
        sfxCues: ['giggle', 'stamp'],
        rawDialog:
          "POCI: Jadi perjuangan kita kemarin sia-sia dong, Kun? <break time='0.5s'/> KUN-KUN: Nggak sia-sia, Ci. Minimal penonton di alam nyata jadi sadar... kalau cerita horor paling seram itu bukan di kuburan, tapi di berita hari ini! Hihihi... <break time='0.5s'/> NARATOR: Terima kasih sudah menonton. Sampai jumpa di musim berikutnya!",
      },
    ]
  ),
];

export function parseRawScriptToEpisode(
  title: string,
  rawText: string,
  episodeNumber = 16
): EpisodeConfig {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // Try splitting by explicit "Scene 1..4" headers if present
  const sceneBuckets: string[][] = [[], [], [], []];
  let currentBucket = 0;
  let foundSceneMarkers = false;

  for (const line of lines) {
    const m = line.match(/^scene\s*([1-4])\b/i);
    if (m) {
      foundSceneMarkers = true;
      currentBucket = Math.min(3, Math.max(0, Number(m[1]) - 1));
      const rest = line.replace(/^scene\s*[1-4][^a-zA-Z0-9]*/i, '').trim();
      if (rest) sceneBuckets[currentBucket].push(rest);
    } else {
      sceneBuckets[currentBucket].push(line);
    }
  }

  if (!foundSceneMarkers) {
    // Evenly distribute lines across 4 scenes
    sceneBuckets[0] = [];
    sceneBuckets[1] = [];
    sceneBuckets[2] = [];
    sceneBuckets[3] = [];
    const chunkSize = Math.max(1, Math.ceil(lines.length / 4));
    for (let i = 0; i < lines.length; i++) {
      const idx = Math.min(3, Math.floor(i / chunkSize));
      sceneBuckets[idx].push(lines[i]);
    }
  }

  const defaultBgs: BackgroundPresetId[] = [
    'kantor_bocor',
    'meja_lpj',
    'ruang_server',
    'kuburan_berkabut',
  ];

  const scenes = sceneBuckets.map((bucket, idx): SceneConfig => {
    const joined = bucket.join(" <break time='0.4s'/> ");
    const dialogues = parseDialogueBlock(
      joined || `NARATOR: Adegan ${idx + 1} dari ${title}.`,
      idx
    );
    const detectedCast = new Set<string>(['poci', 'kunkun']);
    for (const d of dialogues) {
      const sp = d.speaker.toUpperCase();
      if (sp.includes('GENDU')) detectedCast.add('gendu');
      if (sp.includes('GUS TUYUL')) detectedCast.add('gustuyul');
      else if (sp.includes('TUYUL')) detectedCast.add('tuyul');
      if (sp.includes('BLORONG')) detectedCast.add('blorong');
      if (sp.includes('HAKIM')) detectedCast.add('hakim');
      if (sp.includes('WARGA')) detectedCast.add('warga');
    }

    return {
      id: `custom_ep${episodeNumber}_s${idx + 1}`,
      sceneNumber: (idx + 1) as 1 | 2 | 3 | 4,
      title: `Scene ${idx + 1}: ${title}`,
      locationDesc: 'Latar Kustom Kelurahan Indis',
      visualDesc: bucket[0] || 'Adegan animasi kustom 2D.',
      moodDesc: 'Satir komedi',
      backgroundId: defaultBgs[idx],
      weather: idx === 3 ? 'ash' : 'none',
      lighting: idx === 3 ? 'moonlight' : 'normal',
      transitionIn: idx === 0 ? 'fade' : 'flash_white',
      cameraAction: 'auto',
      cameraShakeIntensity: 0.15,
      cast: Array.from(detectedCast),
      popup: {
        text: idx === 3 ? 'BERSAMBUNG...' : `${title.toUpperCase()} — BAGIAN ${idx + 1}`,
        color: idx === 3 ? 'stamp' : 'yellow',
        startSec: idx === 3 ? 9.5 : 2.0,
        endSec: idx === 3 ? 14.5 : 11.0,
      },
      arsipBoxText:
        idx === 3 ? 'Setiap naskah baru di Kelurahan Indis selalu menyimpan kejutan birokrasi.' : undefined,
      sfxCues: ['pop'],
      dialogues,
    };
  }) as [SceneConfig, SceneConfig, SceneConfig, SceneConfig];

  return {
    id: `custom-${Date.now()}`,
    episodeNumber,
    title: title || 'Episode Baru Kelurahan Indis',
    inspiration: 'Naskah kustom buatan kreator.',
    isCustom: true,
    watermarkText: 'ARSIP KELAM INDIS',
    scenes,
  };
}
