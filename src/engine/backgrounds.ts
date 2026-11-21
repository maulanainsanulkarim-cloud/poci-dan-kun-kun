import { BackgroundPresetId, LightingPreset, WeatherType } from '../types/studio';
import {
  create3DSphereGradient,
  draw3DExtrudedBox,
  draw3DPerspectiveRoom,
  shadeHex,
} from './volumetric3D';

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
  if (bgId === 'custom' && customBgUrl) {
    const img = getCachedImage(customBgUrl);
    if (img) {
      const scale = Math.max(w / img.width, h / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
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
      draw3DPerspectiveRoom(ctx, w, h, groundY, '#161b24', '#272f3b', '#14181f');
      // 3D Volumetric ceiling leak hole + beam
      ctx.fillStyle = '#070a0f';
      ctx.beginPath();
      ctx.ellipse(310, 125, 125, 42, -0.06, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#3f4b5e';
      ctx.lineWidth = 6;
      ctx.stroke();

      // Shaft of dim ceiling light
      const shaft = ctx.createLinearGradient(310, 125, 310, groundY);
      shaft.addColorStop(0, 'rgba(186, 230, 253, 0.14)');
      shaft.addColorStop(1, 'rgba(186, 230, 253, 0)');
      ctx.fillStyle = shaft;
      ctx.beginPath();
      ctx.moveTo(220, 125);
      ctx.lineTo(400, 125);
      ctx.lineTo(470, groundY);
      ctx.lineTo(150, groundY);
      ctx.closePath();
      ctx.fill();

      // Animated 3D water drips into bucket
      for (let i = 0; i < 4; i++) {
        const dropY = 140 + ((globalTime * 520 + i * 280) % (groundY - 190));
        const dropX = 270 + i * 26;
        ctx.fillStyle = 'rgba(125, 211, 252, 0.82)';
        ctx.beginPath();
        ctx.ellipse(dropX, dropY, 4, 13, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // 3D Red plastic bucket with rim highlight
      const bGrad = ctx.createLinearGradient(255, groundY - 75, 355, groundY);
      bGrad.addColorStop(0, '#ef4444');
      bGrad.addColorStop(0.45, '#b91c1c');
      bGrad.addColorStop(1, '#7f1d1d');
      ctx.fillStyle = bGrad;
      ctx.beginPath();
      ctx.moveTo(255, groundY - 75);
      ctx.lineTo(355, groundY - 75);
      ctx.lineTo(340, groundY);
      ctx.lineTo(270, groundY);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fca5a5';
      ctx.beginPath();
      ctx.ellipse(305, groundY - 75, 50, 9, 0, 0, Math.PI * 2);
      ctx.fill();

      // 3D Extruded Golden Tombstone Monument
      draw3DExtrudedBox(ctx, 685, groundY - 310, 175, 270, 26, -16, '#eab308', '#854d0e', '#fef08a');
      ctx.fillStyle = create3DSphereGradient(ctx, 772, groundY - 310, 88, '#eab308', -0.35, -0.4, 48, -32);
      ctx.beginPath();
      ctx.arc(772, groundY - 310, 88, Math.PI, 0);
      ctx.fill();
      draw3DExtrudedBox(ctx, 665, groundY - 45, 215, 45, 26, -12, '#422006', '#271203', '#713f12');
      ctx.fillStyle = '#fef9c3';
      ctx.font = '800 22px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('NISAN EMAS', 772, groundY - 220);
      ctx.fillText('PEJABAT', 772, groundY - 190);
      const sp = 0.5 + 0.5 * Math.sin(globalTime * 4);
      drawStarSparkle(ctx, 835, groundY - 310, 18 * sp + 6, '#ffffff');
      break;
    }

    case 'meja_lpj': {
      draw3DPerspectiveRoom(ctx, w, h, groundY, '#191720', '#2a2632', '#17151c');
      drawPaperStack(ctx, 125, groundY - 260, 145, 260);
      drawPaperStack(ctx, 805, groundY - 310, 155, 310);
      // 3D Extruded Mahogany Desk
      draw3DExtrudedBox(ctx, 260, groundY - 190, 560, 28, 18, -18, '#6b3e21', '#3b2110', '#8b542f');
      draw3DExtrudedBox(ctx, 290, groundY - 162, 32, 162, 12, 0, '#452715', '#29170c');
      draw3DExtrudedBox(ctx, 758, groundY - 162, 32, 162, 12, 0, '#452715', '#29170c');
      // 3D Recessed Wall Board
      draw3DExtrudedBox(ctx, 220, 310, 640, 260, 14, -10, '#18181b', '#09090b', '#27272a', '#52525b');
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
      draw3DPerspectiveRoom(
        ctx,
        w,
        h,
        groundY,
        '#090c14',
        '#141c2b',
        '#090d16',
        'rgba(56, 189, 248, 0.12)',
        'rgba(56, 189, 248, 0.2)'
      );
      // 3D Extruded Server Racks with side depth
      for (let r = 0; r < 2; r++) {
        const rx = r === 0 ? 110 : 735;
        const depthX = r === 0 ? 28 : -28;
        draw3DExtrudedBox(ctx, rx, 360, 235, groundY - 360, depthX, -18, '#1e293b', '#0f172a', '#334155', '#334155');
        for (let row = 0; row < 10; row++) {
          const ry = 390 + row * 72;
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(rx + 20, ry, 195, 48);
          const blink = Math.sin(globalTime * 9 + row * 1.7 + r * 3) > 0;
          ctx.fillStyle = blink ? '#ef4444' : '#f59e0b';
          ctx.beginPath();
          ctx.arc(rx + 42, ry + 24, 6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // 3D Giant Central Monitor
      draw3DExtrudedBox(ctx, 280, 390, 520, 330, 16, -12, '#020617', '#0f172a', '#334155', '#475569');
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
      const sky = ctx.createLinearGradient(0, 0, 0, groundY);
      sky.addColorStop(0, '#050811');
      sky.addColorStop(0.5, '#131d31');
      sky.addColorStop(1, '#24324a');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, groundY);

      // Volumetric 3D Full Moon with atmospheric halo
      const moonHalo = ctx.createRadialGradient(820, 290, 40, 820, 290, 240);
      moonHalo.addColorStop(0, 'rgba(254, 249, 195, 0.28)');
      moonHalo.addColorStop(0.5, 'rgba(186, 230, 253, 0.12)');
      moonHalo.addColorStop(1, 'rgba(186, 230, 253, 0)');
      ctx.fillStyle = moonHalo;
      ctx.beginPath();
      ctx.arc(820, 290, 240, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = create3DSphereGradient(ctx, 820, 290, 90, '#fef3c7', -0.25, -0.3, 25, -20);
      ctx.beginPath();
      ctx.arc(820, 290, 88, 0, Math.PI * 2);
      ctx.fill();

      // Parallax layered distant silhouettes
      ctx.fillStyle = '#0c1322';
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      ctx.quadraticCurveTo(280, groundY - 260, 560, groundY - 140);
      ctx.quadraticCurveTo(840, groundY - 280, w, groundY - 100);
      ctx.lineTo(w, groundY);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#121b2d';
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      ctx.quadraticCurveTo(220, groundY - 120, 480, groundY - 75);
      ctx.quadraticCurveTo(780, groundY - 150, w, groundY - 50);
      ctx.lineTo(w, groundY);
      ctx.closePath();
      ctx.fill();

      // 3D Extruded Tombstones
      drawTombstone(ctx, 130, groundY, 0.9);
      drawTombstone(ctx, 310, groundY, 0.72);
      drawTombstone(ctx, 790, groundY, 0.85);
      drawTombstone(ctx, 940, groundY, 1.0);

      // 3D Perspective Cemetery Ground
      const gGrad = ctx.createLinearGradient(0, groundY, 0, h);
      gGrad.addColorStop(0, '#1e293b');
      gGrad.addColorStop(0.2, '#141a24');
      gGrad.addColorStop(1, '#090c12');
      ctx.fillStyle = gGrad;
      ctx.fillRect(0, groundY, w, h - groundY);

      if (bgId === 'jalan_berlubang') {
        const holeGrad = ctx.createRadialGradient(540, groundY + 60, 20, 540, groundY + 60, 185);
        holeGrad.addColorStop(0, '#020408');
        holeGrad.addColorStop(0.85, '#0f172a');
        holeGrad.addColorStop(1, '#334155');
        ctx.fillStyle = holeGrad;
        ctx.beginPath();
        ctx.ellipse(540, groundY + 60, 180, 36, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Volumetric drifting ground mist
      for (let i = 0; i < 4; i++) {
        const fx = ((globalTime * 35 + i * 320) % (w + 400)) - 200;
        const grad = ctx.createRadialGradient(fx, groundY - 20, 20, fx, groundY - 20, 280);
        grad.addColorStop(0, 'rgba(203, 213, 225, 0.18)');
        grad.addColorStop(1, 'rgba(203, 213, 225, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, groundY - 240, w, 320);
      }
      break;
    }

    case 'gerbang_syuting': {
      draw3DPerspectiveRoom(
        ctx,
        w,
        h,
        groundY,
        '#141418',
        '#27272a',
        '#141417',
        'rgba(255,255,255,0.05)',
        'rgba(250,204,21,0.18)'
      );
      // Volumetric Spotlight Cones
      ctx.save();
      ctx.globalAlpha = 0.2;
      for (const beam of [
        [140, 280, 440, 660],
        [920, 800, 460, 720],
      ]) {
        const bg = ctx.createLinearGradient(beam[0], 0, (beam[2] + beam[3]) / 2, groundY);
        bg.addColorStop(0, '#fef08a');
        bg.addColorStop(1, 'rgba(254, 240, 138, 0)');
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.moveTo(beam[0], 0);
        ctx.lineTo(beam[2], groundY);
        ctx.lineTo(beam[3], groundY);
        ctx.lineTo(beam[1], 0);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      draw3DExtrudedBox(ctx, 140, 340, 800, 170, 14, -10, '#7f1d1d', '#450a0a', '#b91c1c', '#fbbf24');
      ctx.fillStyle = '#fef9c3';
      ctx.font = '800 36px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('KELURAHAN INDIS — SIAP SIDAK ✔', 540, 440);

      // Perspective 3D Red Carpet with golden trim
      const carpGrad = ctx.createLinearGradient(0, groundY, 0, h);
      carpGrad.addColorStop(0, '#991b1b');
      carpGrad.addColorStop(1, '#450a0a');
      ctx.fillStyle = carpGrad;
      ctx.beginPath();
      ctx.moveTo(320, groundY);
      ctx.lineTo(760, groundY);
      ctx.lineTo(940, h);
      ctx.lineTo(140, h);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 4;
      ctx.stroke();
      break;
    }

    case 'ruang_sidang_mkk': {
      draw3DPerspectiveRoom(
        ctx,
        w,
        h,
        groundY,
        '#1e1010',
        '#331c1c',
        '#180d0d',
        'rgba(251,191,36,0.08)',
        'rgba(251,191,36,0.16)'
      );
      // 3D Cylindrical Marble Pillars
      for (const px of [125, 875]) {
        const pGrad = ctx.createLinearGradient(px, 0, px + 80, 0);
        pGrad.addColorStop(0, '#78716c');
        pGrad.addColorStop(0.3, '#a8a29e');
        pGrad.addColorStop(0.7, '#44403c');
        pGrad.addColorStop(1, '#292524');
        ctx.fillStyle = pGrad;
        ctx.fillRect(px, 140, 80, groundY - 140);
      }
      // 3D Extruded Judge Bench
      draw3DExtrudedBox(ctx, 260, groundY - 220, 560, 220, 22, -16, '#78350f', '#451a03', '#b45309');
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(260, groundY - 228, 560, 12);
      ctx.fillStyle = '#fde047';
      ctx.font = '800 30px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('MAHKAMAH KONSTITUSI KUBURAN', 540, 340);
      break;
    }

    case 'vila_puncak': {
      draw3DPerspectiveRoom(ctx, w, h, groundY, '#181c1a', '#29302c', '#141715');
      draw3DExtrudedBox(ctx, 150, 240, 780, 450, 14, -10, '#0f172a', '#020617', '#1e293b', '#78350f');
      // 3D Glowing Chandelier
      const chand = ctx.createRadialGradient(540, 170, 8, 540, 170, 180);
      chand.addColorStop(0, 'rgba(254, 240, 138, 0.75)');
      chand.addColorStop(1, 'rgba(254, 240, 138, 0)');
      ctx.fillStyle = chand;
      ctx.beginPath();
      ctx.arc(540, 170, 180, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = create3DSphereGradient(ctx, 540, 170, 36, '#fbbf24', -0.3, -0.3, 45, -35);
      ctx.beginPath();
      ctx.arc(540, 170, 36, 0, Math.PI * 2);
      ctx.fill();
      // 3D Buffet Table
      draw3DExtrudedBox(ctx, 180, groundY - 150, 720, 150, 20, -14, '#e7e5e4', '#a8a29e', '#fafaf9');
      ctx.fillStyle = '#d97706';
      ctx.fillRect(180, groundY - 160, 720, 20);
      break;
    }

    case 'bukit_tambang': {
      const sky = ctx.createLinearGradient(0, 0, 0, groundY);
      sky.addColorStop(0, '#291d16');
      sky.addColorStop(1, '#68452c');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, groundY);

      const hillGrad = ctx.createLinearGradient(0, groundY - 380, w, groundY);
      hillGrad.addColorStop(0, '#5e3b24');
      hillGrad.addColorStop(1, '#2b1a10');
      ctx.fillStyle = hillGrad;
      ctx.beginPath();
      ctx.moveTo(0, groundY - 380);
      ctx.lineTo(360, groundY - 260);
      ctx.lineTo(680, groundY - 120);
      ctx.lineTo(w, groundY - 40);
      ctx.lineTo(w, groundY);
      ctx.lineTo(0, groundY);
      ctx.closePath();
      ctx.fill();

      const fg = ctx.createLinearGradient(0, groundY, 0, h);
      fg.addColorStop(0, '#3b2416');
      fg.addColorStop(1, '#1c1009');
      ctx.fillStyle = fg;
      ctx.fillRect(0, groundY, w, h - groundY);
      break;
    }

    case 'gudang_buzzer': {
      draw3DPerspectiveRoom(
        ctx,
        w,
        h,
        groundY,
        '#07070d',
        '#131320',
        '#06060b',
        'rgba(14, 165, 233, 0.14)',
        'rgba(14, 165, 233, 0.2)'
      );
      for (let col = 0; col < 5; col++) {
        for (let row = 0; row < 7; row++) {
          const px = 120 + col * 175;
          const py = 260 + row * 105;
          const active = Math.sin(globalTime * 12 + col * 3 + row) > -0.3;
          draw3DExtrudedBox(
            ctx,
            px,
            py,
            115,
            70,
            8,
            -6,
            active ? '#0ea5e9' : '#1e293b',
            '#0f172a',
            active ? '#7dd3fc' : '#334155'
          );
        }
      }
      break;
    }

    case 'istana_mewah': {
      draw3DPerspectiveRoom(
        ctx,
        w,
        h,
        groundY,
        '#20170b',
        '#3d2c14',
        '#1c1409',
        'rgba(251, 191, 36, 0.14)',
        'rgba(251, 191, 36, 0.25)'
      );
      draw3DExtrudedBox(ctx, 130, 220, 820, groundY - 240, 14, -10, '#2b1e0e', '#171007', '#78350f', '#fbbf24');
      ctx.fillStyle = create3DSphereGradient(ctx, 540, 150, 46, '#fef08a', -0.3, -0.3, 45, -35);
      ctx.beginPath();
      ctx.arc(540, 150, 44, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = create3DSphereGradient(ctx, 880, groundY, 125, '#eab308', -0.35, -0.4, 48, -42);
      ctx.beginPath();
      ctx.arc(880, groundY, 120, Math.PI, 0);
      ctx.fill();
      break;
    }

    case 'bilik_suara': {
      draw3DPerspectiveRoom(
        ctx,
        w,
        h,
        groundY,
        '#0d121c',
        '#1b2436',
        '#0d111a',
        'rgba(56, 189, 248, 0.12)',
        'rgba(56, 189, 248, 0.2)'
      );
      draw3DExtrudedBox(ctx, 150, 280, 780, 320, 16, -12, '#020617', '#0f172a', '#1e293b', '#38bdf8');
      ctx.fillStyle = '#38bdf8';
      ctx.font = '700 30px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('REKAPITULASI SUARA DIGITAL', 540, 360);
      const bigNum = sceneTime > 4 ? '10.000' : '00.010';
      ctx.fillStyle = sceneTime > 4 ? '#f87171' : '#34d399';
      ctx.font = '800 96px "JetBrains Mono", monospace';
      ctx.fillText(bigNum, 540, 495);

      // 3D Extruded Ballot Box
      draw3DExtrudedBox(ctx, 450, groundY - 170, 180, 170, 26, -18, '#e2e8f0', '#94a3b8', '#f8fafc', '#475569');
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(505, groundY - 182, 90, 8);
      break;
    }

    default: {
      draw3DPerspectiveRoom(ctx, w, h, groundY, '#141418', '#27272a', '#09090b');
      break;
    }
  }
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
    draw3DExtrudedBox(
      ctx,
      x + jitter,
      sy,
      width,
      11,
      10,
      -4,
      i % 3 === 0 ? '#e2e8f0' : '#cbd5e1',
      '#94a3b8',
      '#f8fafc'
    );
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
  // 3D Side depth
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.roundRect(-33, -146, 90, 140, [45, 45, 0, 0]);
  ctx.fill();
  // Front stone face with volumetric gradient
  const stGrad = ctx.createLinearGradient(-45, -140, 45, 0);
  stGrad.addColorStop(0, shadeHex('#475569', 22));
  stGrad.addColorStop(0.5, '#334155');
  stGrad.addColorStop(1, '#1e293b');
  ctx.fillStyle = stGrad;
  ctx.beginPath();
  ctx.roundRect(-45, -140, 90, 140, [45, 45, 0, 0]);
  ctx.fill();
  draw3DExtrudedBox(ctx, -55, -18, 110, 18, 12, -6, '#1e293b', '#0f172a', '#475569');
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

/**
 * Renders foreground 3D floating bokeh dust motes & volumetric atmosphere depth
 */
export function drawVolumetricStageDepth(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  globalTime: number,
  parallaxX = 0
) {
  ctx.save();
  // Soft top-left volumetric studio key-light beam
  const beam = ctx.createRadialGradient(w * 0.18, h * 0.08, 40, w * 0.45, h * 0.42, h * 0.65);
  beam.addColorStop(0, 'rgba(254, 243, 199, 0.14)');
  beam.addColorStop(0.45, 'rgba(254, 243, 199, 0.04)');
  beam.addColorStop(1, 'rgba(254, 243, 199, 0)');
  ctx.fillStyle = beam;
  ctx.fillRect(0, 0, w, h);

  // Foreground out-of-focus bokeh dust motes moving with 1.35x camera parallax
  for (let i = 0; i < 16; i++) {
    const seed = i * 89.4;
    const x = ((seed * 37 + parallaxX * 1.35 + Math.sin(globalTime * 0.6 + i) * 32) % w + w) % w;
    const y = ((seed * 53 - globalTime * (18 + (i % 4) * 6)) % h + h) % h;
    const r = 7 + (i % 5) * 3.5;
    const bokeh = ctx.createRadialGradient(x, y, 1, x, y, r);
    bokeh.addColorStop(0, 'rgba(255, 251, 235, 0.22)');
    bokeh.addColorStop(1, 'rgba(255, 251, 235, 0)');
    ctx.fillStyle = bokeh;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
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
    if (Math.sin(globalTime * 1.7) > 0.985) {
      ctx.fillStyle = 'rgba(241, 245, 249, 0.35)';
      ctx.fillRect(0, 0, w, h);
    }
  }

  const vig = ctx.createRadialGradient(w / 2, h / 2, w * 0.32, w / 2, h / 2, h * 0.65);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.48)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}
