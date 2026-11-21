/**
 * 3D Volumetric Shading, Extrusion & Perspective Helpers for HTML5 Canvas 2D.
 * Gives 2D puppet rigs and stages true spherical volume, rim light, specular sheen,
 * extruded 3D props, and multi-plane perspective depth.
 */

function parseHex(hex: string): [number, number, number] {
  const clean = hex.trim().replace('#', '');
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return [r || 0, g || 0, b || 0];
  }
  if (clean.length >= 6) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return [isNaN(r) ? 128 : r, isNaN(g) ? 128 : g, isNaN(b) ? 128 : b];
  }
  return [128, 128, 128];
}

export function shadeHex(hex: string, percent: number): string {
  const [r, g, b] = parseHex(hex);
  const f = percent / 100;
  const adj = (c: number) => {
    const v = f >= 0 ? c + (255 - c) * f : c * (1 + f);
    return Math.max(0, Math.min(255, Math.round(v)));
  };
  return `rgb(${adj(r)}, ${adj(g)}, ${adj(b)})`;
}

export function mixHex(hexA: string, hexB: string, t: number): string {
  const [r1, g1, b1] = parseHex(hexA);
  const [r2, g2, b2] = parseHex(hexB);
  const k = Math.max(0, Math.min(1, t));
  const r = Math.round(r1 + (r2 - r1) * k);
  const g = Math.round(g1 + (g2 - g1) * k);
  const b = Math.round(b1 + (b2 - b1) * k);
  return `rgb(${r}, ${g}, ${b})`;
}

export function hexWithAlpha(hex: string, alpha: number): string {
  const [r, g, b] = parseHex(hex);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha)).toFixed(3)})`;
}

/**
 * Multi-stop 3D spherical lighting gradient (Key Highlight -> Midtone -> Core Shadow -> Bounce Rim)
 */
export function create3DSphereGradient(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  baseHex: string,
  lightX = -0.35,
  lightY = -0.4,
  highlightBoost = 42,
  shadowDepth = -44
): CanvasGradient {
  const fx = cx + r * lightX;
  const fy = cy + r * lightY;
  const grad = ctx.createRadialGradient(fx, fy, Math.max(1, r * 0.08), cx, cy, Math.max(2, r * 1.15));
  grad.addColorStop(0, shadeHex(baseHex, highlightBoost));
  grad.addColorStop(0.32, shadeHex(baseHex, Math.round(highlightBoost * 0.38)));
  grad.addColorStop(0.7, baseHex);
  grad.addColorStop(0.92, shadeHex(baseHex, shadowDepth));
  grad.addColorStop(1, shadeHex(baseHex, Math.round(shadowDepth * 0.55))); // subtle bounce rim
  return grad;
}

/**
 * 3D cylindrical gradient across a bone/limb/torso segment
 */
export function create3DCylinderGradient(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  baseHex: string,
  highlightBoost = 34,
  shadowDepth = -42
): CanvasGradient {
  const grad = ctx.createLinearGradient(x1, y1, x2, y2);
  grad.addColorStop(0, shadeHex(baseHex, Math.round(highlightBoost * 0.5)));
  grad.addColorStop(0.24, shadeHex(baseHex, highlightBoost));
  grad.addColorStop(0.55, baseHex);
  grad.addColorStop(0.88, shadeHex(baseHex, shadowDepth));
  grad.addColorStop(1, shadeHex(baseHex, Math.round(shadowDepth * 0.65)));
  return grad;
}

/**
 * Draws a 3D volumetric limb segment (multi-pass cylindrical shading + specular ridge + soft outline)
 */
export function draw3DLimbSegment(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  width: number,
  baseHex: string,
  outlineColor = '#181412'
) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // 1. Soft outer contour
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = width + 5.5;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  // 2. Shadowed base cylinder
  ctx.strokeStyle = shadeHex(baseHex, -36);
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  // 3. Key-lit core body shifted toward top-left light source
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.max(1, Math.hypot(dx, dy));
  // Perpendicular normal biased toward top-left
  let nx = -dy / len;
  let ny = dx / len;
  if (nx + ny > 0) {
    nx = -nx;
    ny = -ny;
  }

  ctx.strokeStyle = baseHex;
  ctx.lineWidth = width * 0.78;
  ctx.beginPath();
  ctx.moveTo(x1 + nx * (width * 0.1), y1 + ny * (width * 0.1));
  ctx.lineTo(x2 + nx * (width * 0.1), y2 + ny * (width * 0.1));
  ctx.stroke();

  // 4. Specular highlight ridge
  ctx.strokeStyle = shadeHex(baseHex, 34);
  ctx.lineWidth = Math.max(2, width * 0.24);
  ctx.beginPath();
  ctx.moveTo(x1 + nx * (width * 0.24), y1 + ny * (width * 0.24));
  ctx.lineTo(x2 + nx * (width * 0.24), y2 + ny * (width * 0.24));
  ctx.stroke();

  ctx.restore();
}

/**
 * Dual-layer 3D ground contact occlusion + angled directional cast shadow
 */
export function draw3DGroundShadow(
  ctx: CanvasRenderingContext2D,
  anchorX: number,
  groundY: number,
  scale: number,
  hopHeight: number,
  isPlanked: boolean
) {
  const heightRatio = Math.max(0.28, 1 - hopHeight / 280);
  const rx = 76 * scale * heightRatio * (isPlanked ? 1.75 : 1);
  const ry = 20 * scale * heightRatio;

  ctx.save();
  // Soft directional elongated shadow toward bottom-right
  const dirGrad = ctx.createRadialGradient(
    anchorX + 22 * scale,
    groundY + 12,
    4,
    anchorX + 22 * scale,
    groundY + 12,
    rx * 1.35
  );
  dirGrad.addColorStop(0, `rgba(0, 0, 0, ${(0.36 * heightRatio).toFixed(3)})`);
  dirGrad.addColorStop(0.65, `rgba(0, 0, 0, ${(0.18 * heightRatio).toFixed(3)})`);
  dirGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = dirGrad;
  ctx.beginPath();
  ctx.ellipse(anchorX + 22 * scale, groundY + 12, rx * 1.35, ry * 1.45, 0.08, 0, Math.PI * 2);
  ctx.fill();

  // Tight ambient-occlusion contact shadow right under feet
  const aoGrad = ctx.createRadialGradient(anchorX, groundY + 4, 2, anchorX, groundY + 4, rx * 0.85);
  aoGrad.addColorStop(0, `rgba(0, 0, 0, ${(0.62 * heightRatio).toFixed(3)})`);
  aoGrad.addColorStop(0.7, `rgba(0, 0, 0, ${(0.25 * heightRatio).toFixed(3)})`);
  aoGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = aoGrad;
  ctx.beginPath();
  ctx.ellipse(anchorX, groundY + 4, rx * 0.85, ry * 0.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Draws a true 3D extruded rectangular object (monitors, server racks, benches, crates)
 */
export function draw3DExtrudedBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  depthX: number,
  depthY: number,
  frontColor: string,
  sideColor?: string,
  topColor?: string,
  strokeColor?: string
) {
  ctx.save();
  const sCol = sideColor ?? shadeHex(frontColor, -34);
  const tCol = topColor ?? shadeHex(frontColor, 24);

  // Side extruded face (left if depthX < 0, right if depthX > 0)
  ctx.fillStyle = sCol;
  ctx.beginPath();
  if (depthX >= 0) {
    ctx.moveTo(x + w, y);
    ctx.lineTo(x + w + depthX, y + depthY);
    ctx.lineTo(x + w + depthX, y + h + depthY);
    ctx.lineTo(x + w, y + h);
  } else {
    ctx.moveTo(x, y);
    ctx.lineTo(x + depthX, y + depthY);
    ctx.lineTo(x + depthX, y + h + depthY);
    ctx.lineTo(x, y + h);
  }
  ctx.closePath();
  ctx.fill();
  if (strokeColor) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }

  // Top extruded face (if depthY < 0, looking slightly down onto top)
  if (depthY !== 0) {
    ctx.fillStyle = tCol;
    ctx.beginPath();
    if (depthY < 0) {
      ctx.moveTo(x, y);
      ctx.lineTo(x + depthX, y + depthY);
      ctx.lineTo(x + w + depthX, y + depthY);
      ctx.lineTo(x + w, y);
    } else {
      ctx.moveTo(x, y + h);
      ctx.lineTo(x + depthX, y + h + depthY);
      ctx.lineTo(x + w + depthX, y + h + depthY);
      ctx.lineTo(x + w, y + h);
    }
    ctx.closePath();
    ctx.fill();
    if (strokeColor) {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
  }

  // Front face with subtle 3D directional sheen
  const fGrad = ctx.createLinearGradient(x, y, x + w, y + h);
  fGrad.addColorStop(0, shadeHex(frontColor, 14));
  fGrad.addColorStop(0.5, frontColor);
  fGrad.addColorStop(1, shadeHex(frontColor, -18));
  ctx.fillStyle = fGrad;
  ctx.fillRect(x, y, w, h);
  if (strokeColor) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(x, y, w, h);
  }

  ctx.restore();
}

/**
 * Draws a true 3D perspective indoor room (angled corner walls, baseboard, vanishing-point floor tiles)
 */
export function draw3DPerspectiveRoom(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  groundY: number,
  ceilingHex: string,
  wallHex: string,
  floorHex: string,
  tileLineColor = 'rgba(255, 255, 255, 0.06)',
  rimAccent = 'rgba(255, 255, 255, 0.08)'
) {
  ctx.save();
  const vanishX = w * 0.5;
  const vanishY = groundY - 260;

  // Back wall gradient with soft ambient studio vignette
  const wallGrad = ctx.createRadialGradient(
    vanishX,
    groundY * 0.48,
    80,
    vanishX,
    groundY * 0.5,
    w * 0.82
  );
  wallGrad.addColorStop(0, shadeHex(wallHex, 16));
  wallGrad.addColorStop(0.65, wallHex);
  wallGrad.addColorStop(1, shadeHex(ceilingHex, -28));
  ctx.fillStyle = wallGrad;
  ctx.fillRect(0, 0, w, groundY);

  // Perspective left & right side walls converging inward for 3D box depth
  const sideW = 105;
  const leftGrad = ctx.createLinearGradient(0, 0, sideW, 0);
  leftGrad.addColorStop(0, shadeHex(ceilingHex, -32));
  leftGrad.addColorStop(1, shadeHex(wallHex, -12));
  ctx.fillStyle = leftGrad;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(sideW, 95);
  ctx.lineTo(sideW, groundY - 12);
  ctx.lineTo(0, groundY + 38);
  ctx.closePath();
  ctx.fill();

  const rightGrad = ctx.createLinearGradient(w - sideW, 0, w, 0);
  rightGrad.addColorStop(0, shadeHex(wallHex, -16));
  rightGrad.addColorStop(1, shadeHex(ceilingHex, -36));
  ctx.fillStyle = rightGrad;
  ctx.beginPath();
  ctx.moveTo(w, 0);
  ctx.lineTo(w - sideW, 95);
  ctx.lineTo(w - sideW, groundY - 12);
  ctx.lineTo(w, groundY + 38);
  ctx.closePath();
  ctx.fill();

  // Perspective ceiling slant
  const ceilGrad = ctx.createLinearGradient(0, 0, 0, 110);
  ceilGrad.addColorStop(0, shadeHex(ceilingHex, -40));
  ceilGrad.addColorStop(1, ceilingHex);
  ctx.fillStyle = ceilGrad;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(w, 0);
  ctx.lineTo(w - sideW, 95);
  ctx.lineTo(sideW, 95);
  ctx.closePath();
  ctx.fill();

  // Baseboard with 3D top bevel
  ctx.fillStyle = shadeHex(wallHex, -34);
  ctx.fillRect(sideW, groundY - 22, w - sideW * 2, 22);
  ctx.fillStyle = rimAccent;
  ctx.fillRect(sideW, groundY - 24, w - sideW * 2, 3);

  // 3D Perspective Floor with depth darkening + reflective sheen
  const floorGrad = ctx.createLinearGradient(0, groundY, 0, h);
  floorGrad.addColorStop(0, shadeHex(floorHex, 14));
  floorGrad.addColorStop(0.25, floorHex);
  floorGrad.addColorStop(1, shadeHex(floorHex, -45));
  ctx.fillStyle = floorGrad;
  ctx.fillRect(0, groundY, w, h - groundY);

  // Perspective radiating tile lines toward vanishing point
  ctx.strokeStyle = tileLineColor;
  ctx.lineWidth = 2;
  for (let i = -5; i <= 5; i++) {
    const topX = vanishX + i * 115;
    const botX = vanishX + i * 265;
    ctx.beginPath();
    ctx.moveTo(topX, groundY);
    ctx.lineTo(botX, h);
    ctx.stroke();
  }
  // Horizontal perspective tile rows (accelerating spacing)
  const rowOffsets = [16, 42, 80, 134, 208, 305, 428, 575];
  for (const dy of rowOffsets) {
    if (groundY + dy > h) break;
    ctx.beginPath();
    ctx.moveTo(0, groundY + dy);
    ctx.lineTo(w, groundY + dy);
    ctx.stroke();
  }

  // Horizon floor specular rim glow
  const rimGrad = ctx.createLinearGradient(0, groundY - 2, 0, groundY + 42);
  rimGrad.addColorStop(0, rimAccent);
  rimGrad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = rimGrad;
  ctx.fillRect(0, groundY - 2, w, 44);

  ctx.restore();
}
