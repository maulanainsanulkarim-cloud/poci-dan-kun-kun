import { BackgroundPresetId, LightingPreset, WeatherType } from '../types/studio';

export const BACKGROUND_PRESETS: Array<{ id: BackgroundPresetId; label: string }> = [
  { id: 'kantor_bocor', label: 'Kantor Kelurahan Bocor' },
  { id: 'meja_lpj', label: 'Meja Arsip & LPJ' },
  { id: 'ruang_server', label: 'Ruang Server SI-GENTAYANGAN' },
  { id: 'kuburan_berkabut', label: 'Halaman Kuburan Berkabut' },
  { id: 'gerbang_syuting', label: 'Gerbang Karpet Merah / Pers' },
  { id: 'ruang_sidang_mkk', label: 'Ruang Sidang MKK' },
  { id: 'vila_puncak', label: 'Ruang Rapat Vila Puncak' },
  { id: 'jalan_berlubang', label: 'Jalan Kuburan Berlubang' },
  { id: 'bukit_tambang', label: 'Bukit Tambang Batu Nisan' },
  { id: 'gudang_buzzer', label: 'Gudang Tuyul Buzzer' },
  { id: 'istana_mewah', label: 'Istana Mewah / Sel VIP' },
  { id: 'bilik_suara', label: 'Bilik Suara & Layar Tabulasi' },
  { id: 'custom', label: 'Gambar Latar Kustom' },
];

export const WEATHER_OPTIONS: Array<{ id: WeatherType; label: string }> = [
  { id: 'none', label: 'Tanpa Cuaca' },
  { id: 'rain', label: 'Hujan Deras' },
  { id: 'snow', label: 'Salju Gaib' },
  { id: 'petals', label: 'Kelopak Bunga Tabur' },
  { id: 'sparkles', label: 'Kilau Emas / Mistis' },
  { id: 'ash', label: 'Abu & Kabut Asap' },
];

export const LIGHTING_OPTIONS: Array<{ id: LightingPreset; label: string }> = [
  { id: 'normal', label: 'Pencahayaan Standar' },
  { id: 'moonlight', label: 'Cahaya Bulan Purnama' },
  { id: 'dramatic_red', label: 'Merah Dramatis / Darurat' },
  { id: 'neon_dark', label: 'Neon Gelap / Siber' },
  { id: 'golden', label: 'Emas Hangat / Mewah' },
  { id: 'storm', label: 'Badai Mendung Kelam' },
];

const imageCache = new Map<string, HTMLImageElement>();

export function getCachedImage(url: string): HTMLImageElement | null {
  if (!url) return null;
  const existing = imageCache.get(url);
  if (existing) {
    return existing.complete && existing.naturalWidth > 0 ? existing : null;
  }
  const img = new Image();
  img.src = url;
  imageCache.set(url, img);
  return null;
}

export function drawBackgroundScene(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  groundY: number,
  bgId: BackgroundPresetId,
  customBgUrl: string | undefined,
  globalTime: number,
  sceneTime: number
) {
  // Custom uploaded background
  if (bgId === 'custom' && customBgUrl) {
    const img = getCachedImage(customBgUrl);
    if (img) {
      const scale = Math.max(w / img.width, h / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
      // Subtle floor gradient anchor so characters sit solidly
      const floorGrad = ctx.createLinearGradient(0, groundY - 90, 0, h);
      floorGrad.addColorStop(0, 'rgba(9,9,11,0)');
      floorGrad.addColorStop(0.4, 'rgba(9,9,11,0.55)');
      floorGrad.addColorStop(1, 'rgba(9,9,11,0.92)');
      ctx.fillStyle = floorGrad;
      ctx.fillRect(0, groundY - 90, w, h - groundY + 90);
      return;
    }
  }

  switch (bgId) {
    case 'kantor_bocor': {
      drawIndoorRoom(ctx, w, h, groundY, '#1c222b', '#272f3b', '#14181f');
      // Leaky ceiling hole
      ctx.fillStyle = '#090d14';
      ctx.beginPath();
      ctx.ellipse(310, 120, 120, 42, -0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#3f4b5e';
      ctx.lineWidth = 6;
      ctx.stroke();

      // Animated water drips into bucket
      for (let i = 0; i < 4; i++) {
        const dropY = 140 + ((globalTime * 520 + i * 280) % (groundY - 190));
        const dropX = 270 + i * 26;
        ctx.fillStyle = 'rgba(125, 211, 252, 0.75)';
        ctx.beginPath();
        ctx.ellipse(dropX, dropY, 4, 12, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // Red plastic bucket on floor
      ctx.fillStyle = '#b91c1c';
      ctx.beginPath();
      ctx.moveTo(255, groundY - 75);
      ctx.lineTo(355, groundY - 75);
      ctx.lineTo(340, groundY);
      ctx.lineTo(270, groundY);
      ctx.closePath();
      ctx.fill();

      // Golden Tombstone monument inside the leaky office!
      const goldGrad = ctx.createLinearGradient(680, groundY - 380, 860, groundY);
      goldGrad.addColorStop(0, '#fef08a');
      goldGrad.addColorStop(0.5, '#eab308');
      goldGrad.addColorStop(1, '#854d0e');
      ctx.fillStyle = goldGrad;
      ctx.beginPath();
      ctx.roundRect(685, groundY - 350, 175, 310, [88, 88, 8, 8]);
      ctx.fill();
      ctx.fillStyle = '#422006';
      ctx.fillRect(665, groundY - 45, 215, 45);
      ctx.fillStyle = '#fef9c3';
      ctx.font = '700 22px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('NISAN EMAS', 772, groundY - 220);
      ctx.fillText('PEJABAT', 772, groundY - 190);
      // Sparkle on golden tombstone
      const sp = 0.5 + 0.5 * Math.sin(globalTime * 4);
      drawStarSparkle(ctx, 835, groundY - 310, 18 * sp + 6, '#ffffff');
      break;
    }

    case 'meja_lpj': {
      drawIndoorRoom(ctx, w, h, groundY, '#1f1d24', '#2a2632', '#17151c');
      // Tall stacks of LPJ folders
      drawPaperStack(ctx, 110, groundY - 260, 150, 260);
      drawPaperStack(ctx, 820, groundY - 310, 160, 310);
      // Desk in middle
      ctx.fillStyle = '#452715';
      ctx.fillRect(260, groundY - 190, 560, 28);
      ctx.fillStyle = '#331c0f';
      ctx.fillRect(290, groundY - 162, 32, 162);
      ctx.fillRect(758, groundY - 162, 32, 162);
      // Board behind
      ctx.fillStyle = '#18181b';
      ctx.strokeStyle = '#52525b';
      ctx.lineWidth = 6;
      ctx.fillRect(220, 310, 640, 260);
      ctx.strokeRect(220, 310, 640, 260);
      ctx.fillStyle = '#facc15';
      ctx.font = '700 32px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('LAPORAN PERTANGGUNGJAWABAN GAIB', 540, 390);
      ctx.fillStyle = '#34d399';
      ctx.font = '700 54px "JetBrains Mono", monospace';
      ctx.fillText('100% TERSERAP', 540, 470);
      break;
    }

    case 'ruang_server': {
      drawIndoorRoom(ctx, w, h, groundY, '#0d111a', '#161d2b', '#090c12');
      // Server racks with blinking red/green LEDs
      for (let r = 0; r < 2; r++) {
        const rx = r === 0 ? 85 : 755;
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(rx, 360, 240, groundY - 360);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 4;
        ctx.strokeRect(rx, 360, 240, groundY - 360);
        for (let row = 0; row < 10; row++) {
          const ry = 390 + row * 72;
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(rx + 20, ry, 200, 48);
          const blink = Math.sin(globalTime * 9 + row * 1.7 + r * 3) > 0;
          ctx.fillStyle = blink ? '#ef4444' : '#f59e0b';
          ctx.beginPath();
          ctx.arc(rx + 42, ry + 24, 6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // Giant central monitor SI-GENTAYANGAN
      ctx.fillStyle = '#020617';
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 10;
      ctx.fillRect(280, 390, 520, 330);
      ctx.strokeRect(280, 390, 520, 330);
      const glitch = Math.sin(globalTime * 16) > 0.7;
      ctx.fillStyle = glitch ? '#7f1d1d' : '#1e1b4b';
      ctx.fillRect(298, 408, 484, 294);
      ctx.fillStyle = '#f87171';
      ctx.font = '700 30px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('SI-GENTAYANGAN v500M', 540, 495);
      ctx.fillStyle = glitch ? '#ffffff' : '#fbbf24';
      ctx.font = '700 42px "JetBrains Mono", monospace';
      ctx.fillText(glitch ? 'ERROR: KESURUPAN!' : 'AUDIT: LOADING...', 540, 575);
      break;
    }

    case 'kuburan_berkabut':
    case 'jalan_berlubang': {
      // Night cemetery sky
      const sky = ctx.createLinearGradient(0, 0, 0, groundY);
      sky.addColorStop(0, '#070b14');
      sky.addColorStop(0.55, '#131d31');
      sky.addColorStop(1, '#1e293b');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, groundY);

      // Full moon
      ctx.fillStyle = 'rgba(254, 249, 195, 0.14)';
      ctx.beginPath();
      ctx.arc(820, 290, 145, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef3c7';
      ctx.beginPath();
      ctx.arc(820, 290, 88, 0, Math.PI * 2);
      ctx.fill();

      // Distant silhouettes of banyan tree & hills
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      ctx.quadraticCurveTo(280, groundY - 240, 560, groundY - 130);
      ctx.quadraticCurveTo(840, groundY - 260, w, groundY - 90);
      ctx.lineTo(w, groundY);
      ctx.closePath();
      ctx.fill();

      // Tombstones in background
      drawTombstone(ctx, 130, groundY, 0.9);
      drawTombstone(ctx, 310, groundY, 0.72);
      drawTombstone(ctx, 790, groundY, 0.85);
      drawTombstone(ctx, 940, groundY, 1.0);

      // Ground
      ctx.fillStyle = '#141a24';
      ctx.fillRect(0, groundY, w, h - groundY);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, groundY, w, 14);

      if (bgId === 'jalan_berlubang') {
        // Puddle / pothole on path
        ctx.fillStyle = '#090d14';
        ctx.beginPath();
        ctx.ellipse(540, groundY + 60, 180, 36, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 4;
        ctx.stroke();
      }

      // Drifting low fog
      for (let i = 0; i < 4; i++) {
        const fx = ((globalTime * 35 + i * 320) % (w + 400)) - 200;
        const grad = ctx.createRadialGradient(fx, groundY - 20, 20, fx, groundY - 20, 260);
        grad.addColorStop(0, 'rgba(203, 213, 225, 0.14)');
        grad.addColorStop(1, 'rgba(203, 213, 225, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, groundY - 220, w, 300);
      }
      break;
    }

    case 'gerbang_syuting': {
      const sky = ctx.createLinearGradient(0, 0, 0, groundY);
      sky.addColorStop(0, '#18181b');
      sky.addColorStop(1, '#27272a');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, groundY);
      // Spotlight beams
      ctx.save();
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.moveTo(140, 0);
      ctx.lineTo(440, groundY);
      ctx.lineTo(660, groundY);
      ctx.lineTo(280, 0);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(920, 0);
      ctx.lineTo(460, groundY);
      ctx.lineTo(720, groundY);
      ctx.lineTo(800, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Banner backdrop
      ctx.fillStyle = '#7f1d1d';
      ctx.fillRect(140, 340, 800, 170);
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 6;
      ctx.strokeRect(140, 340, 800, 170);
      ctx.fillStyle = '#fef9c3';
      ctx.font = '800 36px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('KELURAHAN INDIS — SIAP SIDAK ✔', 540, 440);

      // Floor + Red Carpet
      ctx.fillStyle = '#18181b';
      ctx.fillRect(0, groundY, w, h - groundY);
      ctx.fillStyle = '#991b1b';
      ctx.beginPath();
      ctx.moveTo(320, groundY);
      ctx.lineTo(760, groundY);
      ctx.lineTo(940, h);
      ctx.lineTo(140, h);
      ctx.closePath();
      ctx.fill();
      break;
    }

    case 'ruang_sidang_mkk': {
      drawIndoorRoom(ctx, w, h, groundY, '#231414', '#331c1c', '#180d0d');
      // Tall marble pillars
      for (const px of [90, 910]) {
        ctx.fillStyle = '#44403c';
        ctx.fillRect(px, 160, 80, groundY - 160);
        ctx.fillStyle = '#78716c';
        ctx.fillRect(px + 12, 160, 14, groundY - 160);
      }
      // Emblem & Judge bench
      ctx.fillStyle = '#78350f';
      ctx.fillRect(260, groundY - 220, 560, 220);
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(260, groundY - 228, 560, 14);
      ctx.fillStyle = '#fde047';
      ctx.font = '800 30px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('MAHKAMAH KONSTITUSI KUBURAN', 540, 340);
      break;
    }

    case 'vila_puncak': {
      drawIndoorRoom(ctx, w, h, groundY, '#1f2421', '#29302c', '#141715');
      // Panoramic mountain mist window
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(140, 240, 800, 460);
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 14;
      ctx.strokeRect(140, 240, 800, 460);
      // Chandelier
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(540, 170, 36, 0, Math.PI * 2);
      ctx.fill();
      // Buffet table
      ctx.fillStyle = '#f5f5f4';
      ctx.fillRect(180, groundY - 150, 720, 150);
      ctx.fillStyle = '#d97706';
      ctx.fillRect(180, groundY - 160, 720, 22);
      break;
    }

    case 'bukit_tambang': {
      const sky = ctx.createLinearGradient(0, 0, 0, groundY);
      sky.addColorStop(0, '#291d16');
      sky.addColorStop(1, '#573b26');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, groundY);
      // Terraced scarred mining hill
      ctx.fillStyle = '#452b1a';
      ctx.beginPath();
      ctx.moveTo(0, groundY - 380);
      ctx.lineTo(360, groundY - 260);
      ctx.lineTo(680, groundY - 120);
      ctx.lineTo(w, groundY - 40);
      ctx.lineTo(w, groundY);
      ctx.lineTo(0, groundY);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#291a10';
      ctx.fillRect(0, groundY, w, h - groundY);
      break;
    }

    case 'gudang_buzzer': {
      drawIndoorRoom(ctx, w, h, groundY, '#09090f', '#131320', '#06060b');
      // Wall of glowing phone racks
      for (let col = 0; col < 5; col++) {
        for (let row = 0; row < 7; row++) {
          const px = 110 + col * 185;
          const py = 260 + row * 105;
          const active = Math.sin(globalTime * 12 + col * 3 + row) > -0.3;
          ctx.fillStyle = active ? '#0ea5e9' : '#1e293b';
          ctx.beginPath();
          ctx.roundRect(px, py, 120, 74, 10);
          ctx.fill();
        }
      }
      break;
    }

    case 'istana_mewah': {
      drawIndoorRoom(ctx, w, h, groundY, '#261c0f', '#3d2c14', '#1c1409');
      // Golden arches & chandelier
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 10;
      ctx.strokeRect(120, 220, 840, groundY - 240);
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(540, 150, 44, 0, Math.PI * 2);
      ctx.fill();
      // Gold coin pile
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.arc(880, groundY, 120, Math.PI, 0);
      ctx.fill();
      break;
    }

    case 'bilik_suara': {
      drawIndoorRoom(ctx, w, h, groundY, '#121824', '#1b2436', '#0d111a');
      // Digital OCR tally board
      ctx.fillStyle = '#020617';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 6;
      ctx.fillRect(150, 280, 780, 320);
      ctx.strokeRect(150, 280, 780, 320);
      ctx.fillStyle = '#38bdf8';
      ctx.font = '700 30px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('REKAPITULASI SUARA DIGITAL', 540, 360);
      const bigNum = sceneTime > 4 ? '10.000' : '00.010';
      ctx.fillStyle = sceneTime > 4 ? '#f87171' : '#34d399';
      ctx.font = '800 96px "JetBrains Mono", monospace';
      ctx.fillText(bigNum, 540, 495);
      // Ballot box
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(450, groundY - 170, 180, 170);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(495, groundY - 155, 90, 14);
      break;
    }

    default: {
      drawIndoorRoom(ctx, w, h, groundY, '#18181b', '#27272a', '#09090b');
      break;
    }
  }
}

function drawIndoorRoom(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  groundY: number,
  topColor: string,
  wallColor: string,
  floorColor: string
) {
  const wallGrad = ctx.createLinearGradient(0, 0, 0, groundY);
  wallGrad.addColorStop(0, topColor);
  wallGrad.addColorStop(1, wallColor);
  ctx.fillStyle = wallGrad;
  ctx.fillRect(0, 0, w, groundY);

  // Baseboard trim
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fillRect(0, groundY - 18, w, 18);

  // Floor
  ctx.fillStyle = floorColor;
  ctx.fillRect(0, groundY, w, h - groundY);
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  ctx.fillRect(0, groundY, w, 4);
}

function drawPaperStack(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number
) {
  const sheets = Math.floor(height / 14);
  for (let i = 0; i < sheets; i++) {
    const sy = y + i * 14;
    const jitter = ((i * 17) % 7) - 3;
    ctx.fillStyle = i % 3 === 0 ? '#e2e8f0' : '#cbd5e1';
    ctx.fillRect(x + jitter, sy, width, 11);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(x + jitter, sy + 11, width, 3);
  }
}

function drawTombstone(
  ctx: CanvasRenderingContext2D,
  x: number,
  groundY: number,
  scale: number
) {
  ctx.save();
  ctx.translate(x, groundY);
  ctx.scale(scale, scale);
  ctx.fillStyle = '#334155';
  ctx.beginPath();
  ctx.roundRect(-45, -140, 90, 140, [45, 45, 0, 0]);
  ctx.fill();
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(-55, -18, 110, 18);
  ctx.restore();
}

function drawStarSparkle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  color: string
) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.translate(cx, cy);
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2;
    ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    ctx.lineTo(
      Math.cos(angle + Math.PI / 4) * (radius * 0.25),
      Math.sin(angle + Math.PI / 4) * (radius * 0.25)
    );
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawWeatherParticles(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  groundY: number,
  weather: WeatherType,
  globalTime: number
) {
  if (weather === 'none') return;

  ctx.save();
  if (weather === 'rain') {
    ctx.strokeStyle = 'rgba(186, 230, 253, 0.42)';
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 85; i++) {
      const seed = i * 137.5;
      const x = ((seed * 19 + globalTime * 180) % (w + 120)) - 60;
      const y = ((seed * 31 + globalTime * 1450) % h);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 14, y + 48);
      ctx.stroke();

      // Ground splash ring
      if (y > groundY - 25 && y < groundY + 45) {
        ctx.strokeStyle = 'rgba(186, 230, 253, 0.32)';
        ctx.beginPath();
        ctx.ellipse(x, groundY + 6, 10, 3, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  } else if (weather === 'snow') {
    ctx.fillStyle = 'rgba(248, 250, 252, 0.78)';
    for (let i = 0; i < 55; i++) {
      const seed = i * 97.3;
      const x = (seed * 23 + Math.sin(globalTime * 1.4 + i) * 45) % w;
      const y = (seed * 41 + globalTime * 165) % h;
      const r = 3 + (i % 5);
      ctx.beginPath();
      ctx.arc(x < 0 ? x + w : x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (weather === 'petals') {
    for (let i = 0; i < 38; i++) {
      const seed = i * 73.1;
      const x = (seed * 37 + Math.sin(globalTime * 1.9 + i) * 70 + globalTime * 60) % w;
      const y = (seed * 29 + globalTime * 190) % h;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(globalTime * 2 + i);
      ctx.fillStyle = i % 2 === 0 ? 'rgba(251, 113, 133, 0.78)' : 'rgba(253, 224, 71, 0.75)';
      ctx.beginPath();
      ctx.ellipse(0, 0, 10, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  } else if (weather === 'sparkles') {
    for (let i = 0; i < 28; i++) {
      const seed = i * 113.7;
      const x = (seed * 43) % w;
      const y = ((seed * 53 - globalTime * 90) % h + h) % h;
      const pulse = Math.max(0.15, Math.sin(globalTime * 4 + i));
      drawStarSparkle(ctx, x, y, 10 * pulse, 'rgba(250, 204, 21, 0.75)');
    }
  } else if (weather === 'ash') {
    for (let i = 0; i < 45; i++) {
      const seed = i * 67.9;
      const x = (seed * 31 + globalTime * 95 + Math.sin(globalTime * 2 + i) * 35) % w;
      const y = ((seed * 47 - globalTime * 110) % h + h) % h;
      ctx.fillStyle = i % 3 === 0 ? 'rgba(251, 146, 60, 0.55)' : 'rgba(161, 161, 170, 0.45)';
      ctx.beginPath();
      ctx.arc(x, y, 3 + (i % 4), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

export function drawLightingOverlay(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  lighting: LightingPreset,
  globalTime: number
) {
  ctx.save();
  if (lighting === 'moonlight') {
    ctx.fillStyle = 'rgba(30, 58, 138, 0.18)';
    ctx.fillRect(0, 0, w, h);
  } else if (lighting === 'dramatic_red') {
    const pulse = 0.14 + 0.08 * Math.sin(globalTime * 6);
    ctx.fillStyle = `rgba(185, 28, 28, ${pulse.toFixed(3)})`;
    ctx.fillRect(0, 0, w, h);
  } else if (lighting === 'neon_dark') {
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, 'rgba(6, 182, 212, 0.12)');
    grad.addColorStop(1, 'rgba(99, 102, 241, 0.16)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  } else if (lighting === 'golden') {
    ctx.fillStyle = 'rgba(245, 158, 11, 0.12)';
    ctx.fillRect(0, 0, w, h);
  } else if (lighting === 'storm') {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.28)';
    ctx.fillRect(0, 0, w, h);
    // Occasional lightning flash
    if (Math.sin(globalTime * 1.7) > 0.985) {
      ctx.fillStyle = 'rgba(241, 245, 249, 0.35)';
      ctx.fillRect(0, 0, w, h);
    }
  }

  // Subtle cinematic vignette
  const vig = ctx.createRadialGradient(w / 2, h / 2, w * 0.32, w / 2, h / 2, h * 0.65);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.48)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}
