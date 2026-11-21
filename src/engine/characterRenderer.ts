import { CharacterProfile, VisemeType } from '../types/studio';
import { getCachedImage } from './backgrounds';
import { EvaluatedMotionPose, solveTwoBoneIK } from './ikPhysics';
import {
  create3DCylinderGradient,
  create3DSphereGradient,
  draw3DExtrudedBox,
  draw3DGroundShadow,
  draw3DLimbSegment,
  shadeHex,
} from './volumetric3D';

const INK = '#161311';

export function drawArticulatedCharacter(
  ctx: CanvasRenderingContext2D,
  profile: CharacterProfile,
  pose: EvaluatedMotionPose,
  anchorX: number,
  groundY: number,
  scale = 1,
  globalTime = 0
) {
  // 1. Dual-Layer 3D Ground Contact AO + Angled Cast Shadow
  draw3DGroundShadow(
    ctx,
    anchorX + pose.offsetX,
    groundY,
    scale,
    pose.hopHeight,
    pose.plankAngle > 0.4
  );

  // 2. Character Root Transform (anchored at feet on groundY - hopHeight)
  ctx.save();
  const rootX = anchorX + pose.offsetX + pose.weightShiftX * 0.35;
  const rootY = groundY - pose.hopHeight + pose.offsetY;
  ctx.translate(rootX, rootY);
  ctx.scale(scale, scale);

  // If Poci falls flat ('plank')
  if (pose.plankAngle > 0.01) {
    ctx.rotate(pose.plankAngle);
  }

  // Volume-preserving Squash & Stretch anchored at feet
  ctx.scale(pose.scaleX, pose.scaleY);

  // Custom user-uploaded character override image (only when explicitly uploaded by user)
  if (profile.referenceImageUrl) {
    const customImg = getCachedImage(profile.referenceImageUrl);
    if (customImg) {
      drawCustomRigWithImage(ctx, profile, pose, customImg, globalTime);
      ctx.restore();
      return;
    }
  }

  switch (profile.rigStyle) {
    case 'pocong':
      drawPocongRig(ctx, profile, pose, globalTime);
      break;
    case 'kunti':
      drawKuntiRig(ctx, profile, pose, globalTime);
      break;
    case 'genderuwo':
      drawGenderuwoRig(ctx, profile, pose, globalTime);
      break;
    case 'tuyul':
      drawTuyulRig(ctx, profile, pose, globalTime);
      break;
    case 'blorong':
      drawBlorongRig(ctx, profile, pose, globalTime);
      break;
    case 'human':
    default:
      drawHumanIKRig(ctx, profile, pose, globalTime);
      break;
  }

  ctx.restore();
}

function drawCustomRigWithImage(
  ctx: CanvasRenderingContext2D,
  profile: CharacterProfile,
  pose: EvaluatedMotionPose,
  img: HTMLImageElement,
  _globalTime: number
) {
  const hipY = -125;
  drawTwoBoneLegs(ctx, pose, hipY, profile.secondaryColor, '#18181b', 64, 62, false);
  ctx.save();
  ctx.translate(0, hipY);
  ctx.rotate(pose.bodyLean);
  ctx.scale(pose.breathScale, 1 + (pose.breathScale - 1) * 0.6);

  drawTwoBoneArms(ctx, pose, -105, profile.primaryColor, profile.skinColor, 54, 50, profile);

  ctx.save();
  ctx.translate(pose.headYaw * 6, -110 + pose.headBobY * 0.5);
  ctx.rotate(pose.headTilt);
  ctx.beginPath();
  ctx.roundRect(-86, -125, 172, 235, 32);
  ctx.clip();
  const scale = Math.max(172 / img.width, 235 / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, -dw / 2, -125 + (235 - dh) / 2, dw, dh);
  // Subtle 3D rim overlay
  const rimGrad = ctx.createLinearGradient(-86, -125, 86, 110);
  rimGrad.addColorStop(0, 'rgba(255,255,255,0.22)');
  rimGrad.addColorStop(0.5, 'rgba(255,255,255,0)');
  rimGrad.addColorStop(1, 'rgba(0,0,0,0.34)');
  ctx.fillStyle = rimGrad;
  ctx.fillRect(-86, -125, 172, 235);
  ctx.restore();

  ctx.strokeStyle = profile.accentColor;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(-86, -235 + pose.headBobY * 0.5, 172, 235, 32);
  ctx.stroke();

  if (pose.isSpeaking) {
    ctx.save();
    ctx.translate(pose.headYaw * 14, -40);
    drawVisemeMouth(ctx, pose.viseme, pose.mouthOpen, '#991b1b', 0.9);
    ctx.restore();
  }
  ctx.restore();
}

function drawTwoBoneLegs(
  ctx: CanvasRenderingContext2D,
  pose: EvaluatedMotionPose,
  hipY: number,
  pantColor: string,
  footColor: string,
  len1 = 62,
  len2 = 62,
  barefoot = false,
  furryCalf = false
) {
  const footPlantY = pose.hopHeight > 12 ? 12 : 0;
  const stanceHalf = 26;
  const footLX = -stanceHalf - pose.weightShiftX * 0.35;
  const footRX = stanceHalf - pose.weightShiftX * 0.35;

  const ikL = solveTwoBoneIK(-18, hipY, footLX, footPlantY - 8, len1, len2, 1);
  const ikR = solveTwoBoneIK(18, hipY, footRX, footPlantY - 8, len1, len2, -1);

  const w = furryCalf ? 24 : 18;
  for (const ik of [
    { rootX: -18, ...ikL, dir: -1 },
    { rootX: 18, ...ikR, dir: 1 },
  ]) {
    // 3D cylindrical thigh & shin segments
    draw3DLimbSegment(ctx, ik.rootX, hipY, ik.jointX, ik.jointY, w + 2, pantColor, INK);
    draw3DLimbSegment(ctx, ik.jointX, ik.jointY, ik.endX, ik.endY, w - 1, pantColor, INK);

    // 3D spherical knee highlight
    ctx.fillStyle = create3DSphereGradient(ctx, ik.jointX, ik.jointY, w * 0.48, pantColor, -0.3, -0.3, 28, -28);
    ctx.beginPath();
    ctx.arc(ik.jointX, ik.jointY, w * 0.42, 0, Math.PI * 2);
    ctx.fill();

    // 3D sculpted foot / shoe planted flat on ground
    const fx = barefoot ? ik.endX + ik.dir * 5 : ik.endX + 4;
    const fy = barefoot ? ik.endY + 5 : ik.endY + 6;
    const frx = barefoot ? 19 : 21;
    const fry = barefoot ? 9 : 11;
    ctx.fillStyle = create3DSphereGradient(ctx, fx, fy, frx, footColor, -0.35, -0.45, 36, -42);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(fx, fy, frx, fry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Shoe/foot top specular shine
    ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.beginPath();
    ctx.ellipse(fx - 4, fy - 4, frx * 0.45, fry * 0.3, -0.15, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawTwoBoneArms(
  ctx: CanvasRenderingContext2D,
  pose: EvaluatedMotionPose,
  shoulderY: number,
  sleeveColor: string,
  handColor: string,
  len1 = 52,
  len2 = 48,
  profile: CharacterProfile,
  limbWidth = 17
) {
  const targetLX = -68 - Math.sin(pose.armGestureL) * 42;
  const targetLY = shoulderY + 68 - Math.cos(pose.armGestureL) * 32;
  const targetRX = 68 + Math.sin(pose.armGestureR) * 44;
  const targetRY = shoulderY + 66 - Math.cos(pose.armGestureR) * 34;

  const ikL = solveTwoBoneIK(-42, shoulderY, targetLX, targetLY, len1, len2, -1);
  const ikR = solveTwoBoneIK(42, shoulderY, targetRX, targetRY, len1, len2, 1);

  for (const side of [
    { rootX: -42, ik: ikL, isRight: false },
    { rootX: 42, ik: ikR, isRight: true },
  ]) {
    // 3D cylindrical upper arm & forearm
    draw3DLimbSegment(ctx, side.rootX, shoulderY, side.ik.jointX, side.ik.jointY, limbWidth + 1.5, sleeveColor, INK);
    draw3DLimbSegment(ctx, side.ik.jointX, side.ik.jointY, side.ik.endX, side.ik.endY, limbWidth - 1, sleeveColor, INK);

    // 3D spherical hand
    ctx.fillStyle = create3DSphereGradient(ctx, side.ik.endX, side.ik.endY, 12.5, handColor, -0.35, -0.4, 38, -38);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.arc(side.ik.endX, side.ik.endY, 11.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 3D Held Props matched to reference sheets
    if (!side.isRight && profile.hasClipboard) {
      ctx.save();
      ctx.translate(side.ik.endX, side.ik.endY);
      ctx.rotate(-0.15 + pose.armGestureL * 0.2);
      draw3DExtrudedBox(ctx, -22, -30, 44, 58, 5, -4, '#78563a', '#4a3320', '#966c49', INK);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-17, -23, 34, 45);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(-9, -34, 18, 8);
      ctx.fillStyle = '#1e293b';
      ctx.font = '800 6.5px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('JADWAL', 0, -10);
      ctx.fillText('RAPAT', 0, -1);
      ctx.fillText('& KOPI', 0, 8);
      ctx.restore();
    }

    if (!side.isRight && profile.hasCoinBag) {
      // Tuyul's 3D beveled EDC MACHINE
      ctx.save();
      ctx.translate(side.ik.endX, side.ik.endY);
      ctx.rotate(-0.12 + pose.armGestureL * 0.2);
      draw3DExtrudedBox(ctx, -15, -26, 30, 48, 6, -4, '#334155', '#1e293b', '#475569', INK);
      ctx.fillStyle = '#86efac';
      ctx.fillRect(-10, -20, 20, 14);
      ctx.fillStyle = '#cbd5e1';
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          ctx.fillRect(-9 + c * 7, -1 + r * 6, 5, 4);
        }
      }
      ctx.restore();
    }

    if (side.isRight) {
      if (profile.hasGavel) {
        ctx.save();
        ctx.translate(side.ik.endX, side.ik.endY);
        ctx.rotate(pose.armGestureR);
        ctx.fillStyle = create3DCylinderGradient(ctx, -5, -52, 5, 4, '#78350f', 30, -35);
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2.5;
        ctx.fillRect(-5, -52, 10, 56);
        ctx.strokeRect(-5, -52, 10, 56);
        draw3DExtrudedBox(ctx, -22, -62, 44, 22, 6, -5, '#b45309', '#78350f', '#d97706', INK);
        ctx.restore();
      } else if (profile.hasClipboard) {
        // 3D cylindrical KOPI SABAR takeaway cup
        ctx.save();
        ctx.translate(side.ik.endX, side.ik.endY - 4);
        const cupGrad = ctx.createLinearGradient(-13, 0, 13, 0);
        cupGrad.addColorStop(0, '#c2986d');
        cupGrad.addColorStop(0.35, '#a67c52');
        cupGrad.addColorStop(1, '#5e4228');
        ctx.fillStyle = cupGrad;
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-13, -16);
        ctx.lineTo(13, -16);
        ctx.lineTo(10, 18);
        ctx.lineTo(-10, 18);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#e7dfd5';
        ctx.fillRect(-12, -5, 24, 15);
        ctx.strokeRect(-12, -5, 24, 15);
        ctx.fillStyle = create3DCylinderGradient(ctx, -15, -22, 15, -15, '#f8fafc', 15, -22);
        ctx.beginPath();
        ctx.roundRect(-15, -22, 30, 7, 3);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#1e293b';
        ctx.font = '800 5.5px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('KOPI', 0, 2);
        ctx.fillText('SABAR', 0, 8);
        ctx.restore();
      } else if (profile.hasCigar) {
        // 3D cigar with glowing ember bloom
        ctx.save();
        ctx.translate(side.ik.endX, side.ik.endY);
        ctx.rotate(-0.35);
        ctx.fillStyle = create3DCylinderGradient(ctx, 0, -5, 0, 5, '#4d7c0f', 28, -35);
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(0, -5, 36, 10, 4);
        ctx.fill();
        ctx.stroke();
        // Glowing ember
        const emb = ctx.createRadialGradient(36, 0, 1, 36, 0, 14);
        emb.addColorStop(0, '#fef08a');
        emb.addColorStop(0.4, '#ef4444');
        emb.addColorStop(1, 'rgba(239,68,68,0)');
        ctx.fillStyle = emb;
        ctx.beginPath();
        ctx.arc(36, 0, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (profile.hasCoinBag) {
        // 3D volumetric '$' Sack overflowing with metallic 3D gold coins
        ctx.save();
        ctx.translate(side.ik.endX, side.ik.endY + 12);
        ctx.fillStyle = create3DSphereGradient(ctx, 0, 14, 26, '#b49a78', -0.35, -0.4, 34, -40);
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 14, 24, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        for (const cx of [-8, 0, 8]) {
          ctx.fillStyle = create3DSphereGradient(ctx, cx, -9, 7, '#facc15', -0.35, -0.4, 50, -35);
          ctx.beginPath();
          ctx.arc(cx, -9, 6.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        ctx.fillStyle = '#78350f';
        ctx.font = '800 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('$', 0, 20);
        ctx.restore();
      }
    }
  }
}

/**
 * POCI — 3D Volumetric Shroud, Sculpted Face & Satchel
 */
function drawPocongRig(
  ctx: CanvasRenderingContext2D,
  profile: CharacterProfile,
  pose: EvaluatedMotionPose,
  _globalTime: number
) {
  ctx.save();
  ctx.rotate(pose.bodyLean);

  // Peeking pale-blue 3D arm
  ctx.save();
  const armWave = Math.sin(pose.armGestureR) * 14;
  draw3DLimbSegment(ctx, 44, -155, 62 + armWave * 0.4, -86, 15, profile.skinColor, INK);
  ctx.restore();

  // Main 3D cylindrical capsule white shroud
  const bodyGrad = ctx.createLinearGradient(-58, -280, 58, -40);
  bodyGrad.addColorStop(0, shadeHex(profile.primaryColor, 18));
  bodyGrad.addColorStop(0.28, '#ffffff');
  bodyGrad.addColorStop(0.62, profile.primaryColor);
  bodyGrad.addColorStop(0.88, profile.secondaryColor);
  bodyGrad.addColorStop(1, shadeHex(profile.secondaryColor, -22));

  ctx.fillStyle = bodyGrad;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(-58, -288, 116, 282, [58, 58, 54, 54]);
  ctx.fill();
  ctx.stroke();

  // Subtle 3D cloth fold creases
  ctx.strokeStyle = 'rgba(120, 113, 108, 0.25)';
  ctx.lineWidth = 2.2;
  for (const fy of [-130, -82, -45]) {
    ctx.beginPath();
    ctx.moveTo(-42, fy);
    ctx.quadraticCurveTo(0, fy + 10, 44, fy - 4);
    ctx.stroke();
  }

  // Flared cloth Top-Knot ('KEPAK') with 3D shading
  ctx.save();
  ctx.translate(0, -288);
  ctx.rotate(pose.hairAngle1 * 1.35 + pose.headTilt);
  ctx.fillStyle = create3DCylinderGradient(ctx, -24, -48, 24, 0, profile.primaryColor, 20, -30);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(-12, 0);
  ctx.lineTo(-28, -46);
  ctx.quadraticCurveTo(-8, -38, 0, -54);
  ctx.quadraticCurveTo(10, -40, 26, -48);
  ctx.lineTo(12, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = create3DCylinderGradient(ctx, -16, -8, 16, 2, '#d4c5b0', 22, -28);
  ctx.beginPath();
  ctx.roundRect(-16, -8, 32, 10, 5);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Crossed messenger bag strap
  ctx.strokeStyle = INK;
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(-52, -172);
  ctx.lineTo(42, -96);
  ctx.stroke();
  ctx.strokeStyle = '#6e553d';
  ctx.lineWidth = 7;
  ctx.stroke();

  // Blue lanyard strap + glossy 3D Laminated ID Card
  ctx.strokeStyle = '#2563eb';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(48, -175);
  ctx.lineTo(-2, -125);
  ctx.stroke();

  ctx.save();
  ctx.translate(32, -110);
  ctx.rotate(-0.24 + pose.scarfAngle * 0.45);
  ctx.fillStyle = '#f8fafc';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.roundRect(-18, 0, 36, 46, 4);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#3b82f6';
  ctx.fillRect(-15, 4, 30, 8);
  ctx.fillStyle = '#64748b';
  ctx.fillRect(-13, 16, 12, 16);
  ctx.fillStyle = '#1e293b';
  ctx.font = '800 5.5px sans-serif';
  ctx.fillText('POCI', 2, 24);
  // Laminated specular diagonal sheen
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.beginPath();
  ctx.moveTo(-16, 2);
  ctx.lineTo(6, 2);
  ctx.lineTo(-16, 36);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 3D Brown messenger satchel + bright red extruded REVISI folder
  ctx.save();
  ctx.translate(-34, -104);
  ctx.rotate(0.08 + pose.scarfAngle * 0.25);
  draw3DExtrudedBox(ctx, -24, -46, 46, 42, 5, -4, '#dc2626', '#991b1b', '#f87171', INK);
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('REVISI', -1, -24);

  ctx.fillStyle = create3DCylinderGradient(ctx, -28, -14, 28, 34, '#6e553d', 24, -36);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.roundRect(-28, -14, 56, 48, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = create3DCylinderGradient(ctx, -28, -14, 28, 8, '#57422e', 20, -32);
  ctx.beginPath();
  ctx.roundRect(-28, -14, 56, 22, 6);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // 3D Neck rope tie
  ctx.fillStyle = create3DCylinderGradient(ctx, -58, -172, 58, -161, '#d4c5b0', 25, -30);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(-58, -172, 116, 11, 5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = create3DSphereGradient(ctx, 0, -166, 8, '#d4c5b0', -0.35, -0.35, 30, -35);
  ctx.beginPath();
  ctx.arc(0, -166, 7.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 3D Recessed Hood Opening + Spherical 2.5D Pale-Blue Face
  ctx.save();
  ctx.translate(pose.headYaw * 12, -225 + pose.headBobY * 0.55);
  ctx.rotate(pose.headTilt);

  // Recessed dark hood cavity
  const hoodDepth = ctx.createRadialGradient(0, 0, 24, 0, 0, 48);
  hoodDepth.addColorStop(0, '#181614');
  hoodDepth.addColorStop(0.85, '#3f3b36');
  hoodDepth.addColorStop(1, '#57534e');
  ctx.fillStyle = hoodDepth;
  ctx.beginPath();
  ctx.ellipse(0, 0, 45, 47, 0, 0, Math.PI * 2);
  ctx.fill();

  // 3D Spherical Pale-Blue Face
  const faceW = 39 * Math.cos(pose.headYaw * 0.3);
  ctx.fillStyle = create3DSphereGradient(ctx, 0, 2, 42, profile.skinColor, -0.35, -0.38, 36, -38);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(0, 2, faceW, 42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  const fx = pose.headYaw * 11;
  // Messy forehead strands
  ctx.strokeStyle = profile.hairColor;
  ctx.lineWidth = 3.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-18 + fx, -34);
  ctx.quadraticCurveTo(-24 + fx, -18, -14 + fx, -14);
  ctx.moveTo(-4 + fx, -37);
  ctx.quadraticCurveTo(0 + fx, -20, -6 + fx, -12);
  ctx.moveTo(12 + fx, -36);
  ctx.quadraticCurveTo(22 + fx, -18, 14 + fx, -12);
  ctx.stroke();

  if (pose.plankAngle > 0.25) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3.5;
    for (const ex of [-15 + fx, 15 + fx]) {
      ctx.beginPath();
      ctx.moveTo(ex - 6, -12);
      ctx.lineTo(ex + 6, 0);
      ctx.moveTo(ex + 6, -12);
      ctx.lineTo(ex - 6, 0);
      ctx.stroke();
    }
    ctx.save();
    ctx.translate(fx, 18);
    drawVisemeMouth(ctx, 'o', 0.6, '#334155', 0.9);
    ctx.restore();
  } else {
    // 3D recessed dark eye bags
    for (const bx of [-14 + fx, 14 + fx]) {
      const bagGrad = ctx.createRadialGradient(bx, 1, 2, bx, 1, 12);
      bagGrad.addColorStop(0, 'rgba(71, 85, 105, 0.55)');
      bagGrad.addColorStop(1, 'rgba(71, 85, 105, 0)');
      ctx.fillStyle = bagGrad;
      ctx.beginPath();
      ctx.ellipse(bx, 1, 12, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    drawFaceFeatures(ctx, pose, profile, fx, -4, 0.94, true);
  }

  ctx.restore();
  ctx.restore();
}

/**
 * KUN-KUN — 3D Volumetric Hair, Pleated Skirt & Glass Sheen
 */
function drawKuntiRig(
  ctx: CanvasRenderingContext2D,
  profile: CharacterProfile,
  pose: EvaluatedMotionPose,
  globalTime: number
) {
  ctx.save();
  ctx.rotate(pose.bodyLean);

  // Back layer of jet-black hair with 3D sheen gradient
  ctx.save();
  ctx.translate(0, -258 + pose.headBobY * 0.5);
  ctx.fillStyle = create3DCylinderGradient(ctx, -60, 0, 60, 120, profile.hairColor, 26, -32);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(-54, -8);
  ctx.quadraticCurveTo(-72 + pose.hairAngle1 * 38, 100, -56 + pose.hairAngle3 * 70, 215);
  ctx.lineTo(-22 + pose.hairAngle3 * 65, 200);
  ctx.lineTo(0 + pose.hairAngle3 * 60, 218);
  ctx.lineTo(28 + pose.hairAngle3 * 65, 200);
  ctx.lineTo(56 + pose.hairAngle3 * 70, 215);
  ctx.quadraticCurveTo(72 + pose.hairAngle1 * 38, 100, 54, -8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Flowing 3D pleated ghost-tail skirt + blouse
  const hemWave = Math.sin(globalTime * 3.2) * 9 + pose.scarfAngle * 22;
  ctx.fillStyle = create3DCylinderGradient(ctx, -68, -148, 68, 0, profile.primaryColor, 22, -32);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.5;

  ctx.beginPath();
  ctx.moveTo(-30, -148);
  ctx.quadraticCurveTo(-56, -78, -68 + hemWave, -18);
  ctx.quadraticCurveTo(-36, -6, -12 + hemWave * 0.6, -20);
  ctx.quadraticCurveTo(8, -10, 12 + hemWave * 0.8, 8);
  ctx.quadraticCurveTo(28, -4, 30 + hemWave * 0.7, -22);
  ctx.quadraticCurveTo(52, -8, 68 + hemWave, -18);
  ctx.quadraticCurveTo(54, -78, 30, -148);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 3D vertical skirt fold shadows
  ctx.strokeStyle = 'rgba(71, 85, 105, 0.25)';
  ctx.lineWidth = 3;
  for (const fx of [-22, 0, 22]) {
    ctx.beginPath();
    ctx.moveTo(fx * 0.6, -145);
    ctx.quadraticCurveTo(fx, -85, fx * 1.4 + hemWave * 0.5, -24);
    ctx.stroke();
  }

  // 3D Sculpted fitted blouse torso
  ctx.fillStyle = create3DCylinderGradient(ctx, -34, -220, 34, -144, profile.primaryColor, 24, -30);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.roundRect(-34, -220, 68, 76, 16);
  ctx.fill();
  ctx.stroke();

  // V-neck collar detail with 3D neck shadow
  ctx.fillStyle = create3DSphereGradient(ctx, 0, -210, 18, profile.skinColor, -0.3, -0.3, 25, -35);
  ctx.beginPath();
  ctx.moveTo(-14, -220);
  ctx.lineTo(0, -196);
  ctx.lineTo(14, -220);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  drawTwoBoneArms(ctx, pose, -204, profile.primaryColor, profile.skinColor, 50, 46, profile, 14);

  // Head + 2.5D Turn
  ctx.save();
  ctx.translate(pose.headYaw * 15, -264 + pose.headBobY * 0.58);
  ctx.rotate(pose.headTilt);

  // 3D Hair dome
  ctx.fillStyle = create3DSphereGradient(ctx, 0, -8, 50, profile.hairColor, -0.35, -0.4, 34, -38);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.arc(0, -8, 50, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 3D Pale blue-gray face
  ctx.fillStyle = create3DSphereGradient(ctx, pose.headYaw * 6, 4, 44, profile.skinColor, -0.35, -0.38, 34, -36);
  ctx.beginPath();
  ctx.ellipse(pose.headYaw * 6, 4, 41 * Math.cos(pose.headYaw * 0.35), 45, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  const fx = pose.headYaw * 13;
  drawFaceFeatures(ctx, pose, profile, fx, 0, 0.98, false);

  // Sleek Cat-Eye Glasses with 3D specular lens glare
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 3.5;
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.beginPath();
  ctx.moveTo(-32 + fx, -10);
  ctx.lineTo(-4 + fx, -4);
  ctx.lineTo(-8 + fx, 10);
  ctx.lineTo(-27 + fx, 8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(4 + fx, -4);
  ctx.lineTo(32 + fx, -10);
  ctx.lineTo(27 + fx, 8);
  ctx.lineTo(8 + fx, 10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Anisotropic hair crown highlight arc + Asymmetrical bangs
  ctx.fillStyle = create3DSphereGradient(ctx, -10, -28, 48, profile.hairColor, -0.35, -0.4, 36, -32);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-45, -18);
  ctx.quadraticCurveTo(-18 + pose.hairAngle2 * 14, 24, -4, 22);
  ctx.quadraticCurveTo(6, -12, 22, -26);
  ctx.quadraticCurveTo(38, -22, 46, -6);
  ctx.quadraticCurveTo(38, -55, 0, -56);
  ctx.quadraticCurveTo(-40, -52, -45, -18);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Glossy anime/3D hair sheen arc
  ctx.strokeStyle = 'rgba(226, 232, 240, 0.36)';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, -14, 38, -Math.PI * 0.82, -Math.PI * 0.25);
  ctx.stroke();

  ctx.restore();
  ctx.restore();
}

/**
 * PAK GENDU — 3D Volumetric Pot-Belly, Batik Vest & Glowing Red Eyes
 */
function drawGenderuwoRig(
  ctx: CanvasRenderingContext2D,
  profile: CharacterProfile,
  pose: EvaluatedMotionPose,
  globalTime: number
) {
  const hipY = -102;
  drawTwoBoneLegs(ctx, pose, hipY, '#231f20', profile.primaryColor, 54, 52, true, true);

  ctx.save();
  ctx.translate(0, hipY);
  ctx.rotate(pose.bodyLean);
  ctx.scale(pose.breathScale, 1 + (pose.breathScale - 1) * 0.5);

  // 3D Big furry oval pot-belly torso
  ctx.fillStyle = create3DSphereGradient(ctx, 0, -84, 96, profile.primaryColor, -0.32, -0.36, 30, -45);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(0, -84, 80, 96, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Dark waist brief/shorts
  ctx.fillStyle = create3DCylinderGradient(ctx, -62, -10, 62, 14, '#231f20', 22, -35);
  ctx.beginPath();
  ctx.ellipse(0, -10, 62, 24, 0, 0, Math.PI);
  ctx.fill();
  ctx.stroke();

  // Open-front 3D Brown & Gold Batik Shirt panels
  const batikGradL = create3DCylinderGradient(ctx, -82, -162, -18, -24, profile.secondaryColor, 26, -34);
  ctx.fillStyle = batikGradL;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(-18, -162);
  ctx.lineTo(-76, -138);
  ctx.lineTo(-82, -28);
  ctx.lineTo(-26, -24);
  ctx.quadraticCurveTo(-18, -95, -18, -162);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  const batikGradR = create3DCylinderGradient(ctx, 18, -162, 82, -24, profile.secondaryColor, 20, -42);
  ctx.fillStyle = batikGradR;
  ctx.beginPath();
  ctx.moveTo(18, -162);
  ctx.lineTo(76, -138);
  ctx.lineTo(82, -28);
  ctx.lineTo(26, -24);
  ctx.quadraticCurveTo(18, -95, 18, -162);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = '#d4a76a';
  ctx.lineWidth = 2.2;
  for (const bx of [-52, -40, 40, 52]) {
    for (const by of [-115, -80, -48]) {
      ctx.beginPath();
      ctx.arc(bx, by, 7, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // 3D Metallic Golden Horn Pin
  ctx.fillStyle = create3DSphereGradient(ctx, 38, -112, 11, profile.accentColor, -0.35, -0.4, 55, -35);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(38, -112, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  drawTwoBoneArms(ctx, pose, -135, profile.primaryColor, profile.primaryColor, 58, 52, profile, 22);

  // Volumetric 3D green cigar smoke wisps
  if (profile.hasCigar) {
    for (let s = 0; s < 3; s++) {
      const sy = -140 - ((globalTime * 45 + s * 26) % 85);
      const sx = 98 + Math.sin(globalTime * 3 + s) * 14;
      const sr = 12 + s * 6;
      const sg = ctx.createRadialGradient(sx - 3, sy - 3, 2, sx, sy, sr);
      sg.addColorStop(0, `rgba(187, 247, 208, ${(0.58 - s * 0.14).toFixed(2)})`);
      sg.addColorStop(1, 'rgba(167, 215, 184, 0)');
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 3D Furry Head
  ctx.save();
  ctx.translate(pose.headYaw * 16, -186 + pose.headBobY * 0.5);
  ctx.rotate(pose.headTilt);

  ctx.fillStyle = create3DSphereGradient(ctx, 0, 0, 56, profile.primaryColor, -0.35, -0.4, 30, -44);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, 55, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-54, -8);
  ctx.lineTo(-68, -26);
  ctx.lineTo(-46, -36);
  ctx.moveTo(54, -8);
  ctx.lineTo(68, -26);
  ctx.lineTo(46, -36);
  ctx.fill();
  ctx.stroke();

  const fx = pose.headYaw * 14;
  drawGlowingEyes(ctx, pose, fx, -10, '#ef4444', true);
  ctx.fillStyle = create3DSphereGradient(ctx, fx, 8, 10, '#2c221e', -0.3, -0.4, 35, -40);
  ctx.beginPath();
  ctx.ellipse(fx, 8, 10, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(fx, 26);
  drawVisemeMouth(ctx, pose.viseme, pose.mouthOpen, '#1c1917', 1.12, true);
  ctx.restore();

  ctx.restore();
  ctx.restore();
}

/**
 * TUYUL & GUS TUYUL MUDA — 3D Glossy Bald Head, Peach Subsurface Skin & Props
 */
function drawTuyulRig(
  ctx: CanvasRenderingContext2D,
  profile: CharacterProfile,
  pose: EvaluatedMotionPose,
  _globalTime: number
) {
  const hipY = -88;
  drawTwoBoneLegs(ctx, pose, hipY, profile.skinColor, profile.skinColor, 46, 46, true, false);

  ctx.save();
  ctx.translate(0, hipY);
  ctx.rotate(pose.bodyLean);
  ctx.scale(pose.breathScale, 1 + (pose.breathScale - 1) * 0.5);

  // 3D sculpted peach torso (or suit for Gus Tuyul Muda)
  ctx.fillStyle = create3DSphereGradient(ctx, 0, -52, 56, profile.primaryColor, -0.35, -0.4, 34, -38);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.roundRect(-34, -96, 68, 92, 22);
  ctx.fill();
  ctx.stroke();

  // 3D shaded White Boxer Shorts
  ctx.fillStyle = create3DCylinderGradient(ctx, -36, -28, 36, 6, profile.secondaryColor, 20, -32);
  ctx.beginPath();
  ctx.roundRect(-36, -28, 72, 34, 8);
  ctx.fill();
  ctx.stroke();

  if (!profile.hasTie) {
    ctx.fillStyle = '#b4785b';
    ctx.beginPath();
    ctx.arc(0, -40, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  if (profile.hasTie) {
    ctx.save();
    ctx.translate(0, -82);
    ctx.rotate(pose.scarfAngle * 0.7);
    ctx.fillStyle = create3DCylinderGradient(ctx, -11, 0, 11, 62, '#dc2626', 30, -35);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-7, 0);
    ctx.lineTo(7, 0);
    ctx.lineTo(11, 50);
    ctx.lineTo(0, 62);
    ctx.lineTo(-11, 50);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  drawTwoBoneArms(ctx, pose, -82, profile.primaryColor, profile.skinColor, 40, 38, profile, 14);

  // 3D Big Shiny Bald Spherical Head
  ctx.save();
  ctx.translate(pose.headYaw * 14, -142 + pose.headBobY * 0.55);
  ctx.rotate(pose.headTilt);

  // 3D Ears
  for (const ex of [-49, 49]) {
    ctx.fillStyle = create3DSphereGradient(ctx, ex, 4, 15, profile.skinColor, -0.35, -0.4, 30, -35);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(ex, 4, 10, 14, ex < 0 ? -0.2 : 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Spherical 3D skull gradient
  ctx.fillStyle = create3DSphereGradient(ctx, 0, 0, 52, profile.skinColor, -0.38, -0.42, 42, -40);
  ctx.beginPath();
  ctx.arc(0, 0, 50, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Crisp glossy dome specular highlight
  const domeShine = ctx.createRadialGradient(-18, -26, 2, -18, -26, 22);
  domeShine.addColorStop(0, 'rgba(255, 255, 255, 0.72)');
  domeShine.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = domeShine;
  ctx.beginPath();
  ctx.ellipse(-18, -26, 18, 9, -0.45, 0, Math.PI * 2);
  ctx.fill();

  const fx = pose.headYaw * 12;
  ctx.fillStyle = 'rgba(100, 116, 139, 0.34)';
  ctx.beginPath();
  ctx.ellipse(-16 + fx, 4, 12, 6, 0, 0, Math.PI * 2);
  ctx.ellipse(16 + fx, 4, 12, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  const eyeScaleY = Math.max(0.1, 1 - pose.blinkAmount);
  for (const ex of [-16 + fx, 16 + fx]) {
    ctx.save();
    ctx.translate(ex, -4);
    ctx.scale(1, eyeScaleY);
    ctx.fillStyle = create3DSphereGradient(ctx, 0, 0, 10, '#ffffff', -0.3, -0.3, 15, -24);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.ellipse(0, 0, 10, 9.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (eyeScaleY > 0.25) {
      ctx.fillStyle = create3DSphereGradient(ctx, pose.lookAtX * 3.5, pose.lookAtY * 3.5, 5.5, '#2e8b57', -0.3, -0.3, 35, -35);
      ctx.beginPath();
      ctx.arc(pose.lookAtX * 3.5, pose.lookAtY * 3.5, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.arc(pose.lookAtX * 3.5, pose.lookAtY * 3.5, 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(pose.lookAtX * 3.5 - 1.6, pose.lookAtY * 3.5 - 1.6, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(-26 + fx, -18);
  ctx.lineTo(-8 + fx, -12);
  ctx.moveTo(26 + fx, -18);
  ctx.lineTo(8 + fx, -12);
  ctx.stroke();

  ctx.save();
  ctx.translate(fx, 22);
  drawVisemeMouth(ctx, pose.viseme, pose.mouthOpen, '#3f2e26', 0.92);
  ctx.restore();

  if (profile.hasPacifier && !pose.isSpeaking) {
    ctx.fillStyle = create3DSphereGradient(ctx, fx, 24, 11, '#fbbf24', -0.35, -0.4, 48, -32);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(fx, 24, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(fx, 32, 8, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
  ctx.restore();
}

function drawBlorongRig(
  ctx: CanvasRenderingContext2D,
  profile: CharacterProfile,
  pose: EvaluatedMotionPose,
  globalTime: number
) {
  ctx.save();
  ctx.rotate(pose.bodyLean);

  // Secondary Motion: 3D Metallic Golden Snake Tail
  ctx.save();
  const tailWave1 = Math.sin(globalTime * 3.2) * 26 + pose.scarfAngle * 30;
  const tailWave2 = Math.cos(globalTime * 3.2) * 34 + pose.hairAngle2 * 40;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 48;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, -100);
  ctx.bezierCurveTo(-45 + tailWave1, -55, 65 + tailWave2, -18, 95 + tailWave2, -10);
  ctx.stroke();
  ctx.strokeStyle = shadeHex(profile.secondaryColor, -28);
  ctx.lineWidth = 40;
  ctx.stroke();
  ctx.strokeStyle = profile.secondaryColor;
  ctx.lineWidth = 28;
  ctx.stroke();
  ctx.strokeStyle = '#fef08a';
  ctx.lineWidth = 10;
  ctx.stroke();
  ctx.restore();

  // 3D Emerald Kebaya torso
  ctx.fillStyle = create3DCylinderGradient(ctx, -38, -210, 38, -90, profile.primaryColor, 30, -38);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.roundRect(-38, -210, 76, 120, 24);
  ctx.fill();
  ctx.stroke();

  drawTwoBoneArms(ctx, pose, -195, profile.primaryColor, profile.skinColor, 48, 44, profile, 15);

  ctx.save();
  ctx.translate(pose.headYaw * 14, -258 + pose.headBobY * 0.5);
  ctx.rotate(pose.headTilt);

  ctx.fillStyle = create3DSphereGradient(ctx, 0, -10, 46, profile.hairColor, -0.35, -0.4, 34, -36);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, -10, 44, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 3D Golden Crown ornament
  ctx.fillStyle = create3DCylinderGradient(ctx, -26, -68, 26, -42, profile.secondaryColor, 46, -34);
  ctx.beginPath();
  ctx.moveTo(-26, -42);
  ctx.lineTo(-14, -68);
  ctx.lineTo(0, -48);
  ctx.lineTo(14, -68);
  ctx.lineTo(26, -42);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = create3DSphereGradient(ctx, pose.headYaw * 6, 4, 40, profile.skinColor, -0.35, -0.4, 34, -36);
  ctx.beginPath();
  ctx.ellipse(pose.headYaw * 6, 4, 36 * Math.cos(pose.headYaw * 0.35), 40, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  const fx = pose.headYaw * 12;
  drawFaceFeatures(ctx, pose, profile, fx, 0, 0.95);
  ctx.restore();

  ctx.restore();
}

function drawHumanIKRig(
  ctx: CanvasRenderingContext2D,
  profile: CharacterProfile,
  pose: EvaluatedMotionPose,
  _globalTime: number
) {
  const hipY = -124;
  drawTwoBoneLegs(ctx, pose, hipY, '#1e293b', '#09090b', 62, 62, false);

  ctx.save();
  ctx.translate(0, hipY);
  ctx.rotate(pose.bodyLean);
  ctx.scale(pose.breathScale, 1 + (pose.breathScale - 1) * 0.5);

  ctx.fillStyle = create3DCylinderGradient(ctx, -44, -118, 44, 4, profile.primaryColor, 28, -36);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.roundRect(-44, -118, 88, 122, 22);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = profile.secondaryColor;
  ctx.beginPath();
  ctx.moveTo(-18, -118);
  ctx.lineTo(0, -76);
  ctx.lineTo(18, -118);
  ctx.closePath();
  ctx.fill();

  if (profile.hasTie) {
    ctx.save();
    ctx.translate(0, -104);
    ctx.rotate(pose.scarfAngle * 0.6);
    ctx.fillStyle = create3DCylinderGradient(ctx, -5, 0, 5, 56, profile.accentColor, 26, -34);
    ctx.fillRect(-5, 0, 10, 56);
    ctx.restore();
  }

  drawTwoBoneArms(ctx, pose, -104, profile.primaryColor, profile.skinColor, 52, 48, profile, 16);

  ctx.save();
  ctx.translate(pose.headYaw * 15, -162 + pose.headBobY * 0.5);
  ctx.rotate(pose.headTilt);

  ctx.fillStyle = create3DSphereGradient(ctx, 0, 0, 42, profile.skinColor, -0.35, -0.4, 34, -36);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.ellipse(0, 0, 38 * Math.cos(pose.headYaw * 0.3), 42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = create3DSphereGradient(ctx, 0, -12, 40, profile.hairColor, -0.35, -0.4, 30, -35);
  ctx.beginPath();
  ctx.arc(0, -12, 40, Math.PI, 0);
  ctx.fill();
  ctx.stroke();

  const fx = pose.headYaw * 12;
  drawFaceFeatures(ctx, pose, profile, fx, 0, 0.95);

  if (profile.hasGlasses) {
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(-14 + fx, -4, 11, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(14 + fx, -4, 11, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
  ctx.restore();
}

function drawFaceFeatures(
  ctx: CanvasRenderingContext2D,
  pose: EvaluatedMotionPose,
  profile: CharacterProfile,
  fx: number,
  fy: number,
  scale = 1,
  droopyLids = false
) {
  ctx.save();
  ctx.translate(fx, fy);
  ctx.scale(scale, scale);

  const eyeScaleY = Math.max(0.08, 1 - pose.blinkAmount);
  for (const ex of [-15, 15]) {
    ctx.save();
    ctx.translate(ex, -6);
    ctx.scale(1, eyeScaleY);
    // 3D Spherical eyeball gradient
    ctx.fillStyle = create3DSphereGradient(ctx, 0, 0, 9.5, '#ffffff', -0.3, -0.3, 10, -24);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 8.5, 9.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (eyeScaleY > 0.25) {
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(pose.lookAtX * 3.5, pose.lookAtY * 3.5, 4.2, 0, Math.PI * 2);
      ctx.fill();
      // Corneal specular shine
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(pose.lookAtX * 3.5 - 1.5, pose.lookAtY * 3.5 - 1.5, 1.6, 0, Math.PI * 2);
      ctx.fill();

      if (droopyLids && pose.actionCue !== 'shock') {
        ctx.fillStyle = create3DSphereGradient(ctx, 0, -5, 9, profile.skinColor, -0.3, -0.3, 24, -28);
        ctx.beginPath();
        ctx.ellipse(0, -5, 9, 5, 0, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-8.5, -3);
        ctx.lineTo(8.5, -3);
        ctx.stroke();
      }
    }
    ctx.restore();

    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    const browRaise = pose.isSpeaking ? -3 : 0;
    ctx.moveTo(ex - 8, -19 + browRaise);
    ctx.lineTo(ex + 8, -17 + browRaise);
    ctx.stroke();
  }

  ctx.save();
  ctx.translate(0, 20);
  const lipColor = profile.rigStyle === 'kunti' ? '#991b1b' : '#334155';
  drawVisemeMouth(ctx, pose.viseme, pose.mouthOpen, lipColor, 1);
  ctx.restore();

  ctx.restore();
}

function drawGlowingEyes(
  ctx: CanvasRenderingContext2D,
  pose: EvaluatedMotionPose,
  fx: number,
  fy: number,
  glowColor: string,
  fierceGlow = false
) {
  const eyeScaleY = Math.max(0.1, 1 - pose.blinkAmount);
  for (const ex of [-16, 16]) {
    ctx.save();
    ctx.translate(ex + fx, fy);
    ctx.scale(1, eyeScaleY);
    if (fierceGlow) {
      const bloom = ctx.createRadialGradient(0, 0, 2, 0, 0, 18);
      bloom.addColorStop(0, 'rgba(254, 202, 202, 0.85)');
      bloom.addColorStop(0.45, 'rgba(239, 68, 68, 0.45)');
      bloom.addColorStop(1, 'rgba(239, 68, 68, 0)');
      ctx.fillStyle = bloom;
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = create3DSphereGradient(ctx, 0, 0, 9, glowColor, -0.25, -0.3, 45, -30);
    ctx.beginPath();
    ctx.ellipse(0, 0, 9, 7.5, 0, 0, Math.PI * 2);
    ctx.fill();
    if (eyeScaleY > 0.25) {
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.arc(pose.lookAtX * 3, pose.lookAtY * 3, 3.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

/**
 * 3D Volumetric 6-Viseme Mouth Renderer: closed | smile | o | wide | teeth | tongue
 */
function drawVisemeMouth(
  ctx: CanvasRenderingContext2D,
  viseme: VisemeType,
  openness: number,
  lipColor: string,
  scale = 1,
  withFangs = false
) {
  ctx.save();
  ctx.scale(scale, scale);
  const o = Math.max(0.15, Math.min(1, openness));

  const cavityGrad = ctx.createRadialGradient(0, 2, 2, 0, 2, 18);
  cavityGrad.addColorStop(0, '#1f0404');
  cavityGrad.addColorStop(1, '#631010');

  switch (viseme) {
    case 'closed': {
      ctx.strokeStyle = lipColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-12, 0);
      ctx.quadraticCurveTo(0, 3, 12, -2);
      ctx.stroke();
      break;
    }
    case 'smile': {
      ctx.fillStyle = cavityGrad;
      ctx.strokeStyle = lipColor;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-15, -2);
      ctx.quadraticCurveTo(0, 12 * o + 4, 15, -3);
      ctx.quadraticCurveTo(0, 2, -15, -2);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'o': {
      ctx.fillStyle = cavityGrad;
      ctx.strokeStyle = lipColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(0, 2, 8 + 3 * o, 10 + 5 * o, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'wide': {
      ctx.fillStyle = cavityGrad;
      ctx.strokeStyle = lipColor;
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.ellipse(0, 3, 16, 8 + 9 * o, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-10, -4 - 4 * o, 20, 4);
      ctx.fillStyle = create3DSphereGradient(ctx, 0, 7 + 3 * o, 9, '#fb7185', -0.3, -0.4, 30, -35);
      ctx.beginPath();
      ctx.ellipse(0, 7 + 3 * o, 9, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'teeth': {
      ctx.fillStyle = create3DCylinderGradient(ctx, -14, -4, 14, 10, '#f8fafc', 10, -20);
      ctx.strokeStyle = lipColor;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.roundRect(-14, -4, 28, 10 + 4 * o, 5);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'tongue': {
      ctx.fillStyle = cavityGrad;
      ctx.strokeStyle = lipColor;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.ellipse(0, 2, 13, 8 + 5 * o, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = create3DSphereGradient(ctx, 0, 3, 8, '#f43f5e', -0.3, -0.4, 28, -35);
      ctx.beginPath();
      ctx.ellipse(0, 3, 8, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    }
  }

  if (withFangs && viseme !== 'closed') {
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    for (const fx of [-10, 10]) {
      ctx.beginPath();
      ctx.moveTo(fx - 3.5, 4);
      ctx.lineTo(fx, -5);
      ctx.lineTo(fx + 3.5, 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }
  ctx.restore();
}
