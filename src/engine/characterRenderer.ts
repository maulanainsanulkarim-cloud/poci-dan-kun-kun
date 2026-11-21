import { CharacterProfile, VisemeType } from '../types/studio';
import { getCachedImage } from './backgrounds';
import { EvaluatedMotionPose, solveTwoBoneIK } from './ikPhysics';

const INK = '#1e1b18';

export function drawArticulatedCharacter(
  ctx: CanvasRenderingContext2D,
  profile: CharacterProfile,
  pose: EvaluatedMotionPose,
  anchorX: number,
  groundY: number,
  scale = 1,
  globalTime = 0
) {
  // 1. Ground Contact Shadow (stays planted on groundY, scales with hopHeight)
  const heightRatio = Math.max(0.35, 1 - pose.hopHeight / 260);
  const shadowRx = 74 * scale * heightRatio * (pose.plankAngle > 0.4 ? 1.8 : 1);
  const shadowRy = 18 * scale * heightRatio;
  ctx.save();
  ctx.fillStyle = `rgba(0, 0, 0, ${(0.48 * heightRatio).toFixed(2)})`;
  ctx.beginPath();
  ctx.ellipse(anchorX + pose.offsetX, groundY + 6, shadowRx, shadowRy, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

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

  for (const ik of [
    { rootX: -18, ...ikL, dir: -1 },
    { rootX: 18, ...ikR, dir: 1 },
  ]) {
    // Ink outline pass
    ctx.strokeStyle = INK;
    ctx.lineWidth = furryCalf ? 30 : 24;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(ik.rootX, hipY);
    ctx.lineTo(ik.jointX, ik.jointY);
    ctx.lineTo(ik.endX, ik.endY);
    ctx.stroke();

    // Fill pass
    ctx.strokeStyle = pantColor;
    ctx.lineWidth = furryCalf ? 24 : 18;
    ctx.beginPath();
    ctx.moveTo(ik.rootX, hipY);
    ctx.lineTo(ik.jointX, ik.jointY);
    ctx.lineTo(ik.endX, ik.endY);
    ctx.stroke();

    // Foot / Shoe planted flat on ground
    ctx.fillStyle = footColor;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (barefoot) {
      ctx.ellipse(ik.endX + ik.dir * 5, ik.endY + 5, 19, 8.5, 0, 0, Math.PI * 2);
    } else {
      ctx.ellipse(ik.endX + 4, ik.endY + 6, 20, 10, 0, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.stroke();
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
    // Ink outline
    ctx.strokeStyle = INK;
    ctx.lineWidth = limbWidth + 5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(side.rootX, shoulderY);
    ctx.lineTo(side.ik.jointX, side.ik.jointY);
    ctx.lineTo(side.ik.endX, side.ik.endY);
    ctx.stroke();

    // Inner limb fill
    ctx.strokeStyle = sleeveColor;
    ctx.lineWidth = limbWidth;
    ctx.beginPath();
    ctx.moveTo(side.rootX, shoulderY);
    ctx.lineTo(side.ik.jointX, side.ik.jointY);
    ctx.lineTo(side.ik.endX, side.ik.endY);
    ctx.stroke();

    // Hand
    ctx.fillStyle = handColor;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.arc(side.ik.endX, side.ik.endY, 11.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Held Props matched to reference sheets!
    if (!side.isRight && profile.hasClipboard) {
      // Kun-Kun's left hand holds clipboard: JADWAL RAPAT & KOPI
      ctx.save();
      ctx.translate(side.ik.endX, side.ik.endY);
      ctx.rotate(-0.15 + pose.armGestureL * 0.2);
      ctx.fillStyle = '#78563a';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(-22, -30, 44, 58, 5);
      ctx.fill();
      ctx.stroke();
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
      // Tuyul's left hand holds EDC MACHINE
      ctx.save();
      ctx.translate(side.ik.endX, side.ik.endY);
      ctx.rotate(-0.12 + pose.armGestureL * 0.2);
      ctx.fillStyle = '#334155';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(-15, -26, 30, 48, 6);
      ctx.fill();
      ctx.stroke();
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
        ctx.fillStyle = '#78350f';
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2.5;
        ctx.fillRect(-5, -52, 10, 56);
        ctx.strokeRect(-5, -52, 10, 56);
        ctx.fillStyle = '#b45309';
        ctx.beginPath();
        ctx.roundRect(-22, -62, 44, 22, 6);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      } else if (profile.hasClipboard) {
        // Kun-Kun's right hand holds KOPI SABAR takeaway cup
        ctx.save();
        ctx.translate(side.ik.endX, side.ik.endY - 4);
        ctx.fillStyle = '#a67c52';
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
        ctx.fillStyle = '#f8fafc';
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
        // Pak Gendu's green cigar with burning red ember
        ctx.save();
        ctx.translate(side.ik.endX, side.ik.endY);
        ctx.rotate(-0.35);
        ctx.fillStyle = '#4d7c0f';
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(0, -5, 36, 10, 4);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.arc(36, 0, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (profile.hasCoinBag) {
        // Tuyul's right hand holds '$' Sack overflowing with gold coins
        ctx.save();
        ctx.translate(side.ik.endX, side.ik.endY + 12);
        ctx.fillStyle = '#b49a78';
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 14, 24, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Gold coins sticking out top
        ctx.fillStyle = '#facc15';
        for (const cx of [-8, 0, 8]) {
          ctx.beginPath();
          ctx.arc(cx, -9, 6, 0, Math.PI * 2);
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
 * POCI — Matched directly to poci_4de02c5c.jpg puppet sheet
 */
function drawPocongRig(
  ctx: CanvasRenderingContext2D,
  profile: CharacterProfile,
  pose: EvaluatedMotionPose,
  _globalTime: number
) {
  ctx.save();
  ctx.rotate(pose.bodyLean);

  // Peeking left/right pale-blue arm from side of shroud (matching sheet!)
  ctx.save();
  const armWave = Math.sin(pose.armGestureR) * 14;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 20;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(46, -155);
  ctx.quadraticCurveTo(64, -120, 62 + armWave * 0.4, -84);
  ctx.stroke();
  ctx.strokeStyle = profile.skinColor;
  ctx.lineWidth = 14;
  ctx.stroke();
  ctx.restore();

  // Main rounded-capsule white shroud (#F2EFE9 with #D8D2C5 cel-shadow)
  const bodyGrad = ctx.createLinearGradient(-58, -300, 58, 0);
  bodyGrad.addColorStop(0, profile.primaryColor);
  bodyGrad.addColorStop(0.75, profile.primaryColor);
  bodyGrad.addColorStop(1, profile.secondaryColor);

  ctx.fillStyle = bodyGrad;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(-58, -288, 116, 282, [58, 58, 54, 54]);
  ctx.fill();
  ctx.stroke();

  // Flared cloth Top-Knot ('KEPAK') swaying with spring physics
  ctx.save();
  ctx.translate(0, -288);
  ctx.rotate(pose.hairAngle1 * 1.35 + pose.headTilt);
  ctx.fillStyle = profile.primaryColor;
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
  // Top rope tie
  ctx.fillStyle = '#d4c5b0';
  ctx.beginPath();
  ctx.roundRect(-16, -8, 32, 10, 5);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Crossed messenger bag strap + worn brown satchel holding RED 'REVISI' folder
  ctx.strokeStyle = INK;
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(-52, -172);
  ctx.lineTo(42, -96);
  ctx.stroke();
  ctx.strokeStyle = '#6e553d';
  ctx.lineWidth = 7;
  ctx.stroke();

  // Blue lanyard strap + slanted ID Card ('PEGAWAI HONORER POCI')
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
  ctx.restore();

  // Brown messenger satchel + bright red REVISI folder on left hip
  ctx.save();
  ctx.translate(-34, -104);
  ctx.rotate(0.08 + pose.scarfAngle * 0.25);
  // Red REVISI folder sticking out of bag
  ctx.fillStyle = '#dc2626';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.roundRect(-24, -46, 46, 42, 3);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('REVISI', -1, -24);

  // Leather bag body & flap
  ctx.fillStyle = '#6e553d';
  ctx.beginPath();
  ctx.roundRect(-28, -14, 56, 48, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#57422e';
  ctx.beginPath();
  ctx.roundRect(-28, -14, 56, 22, 6);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Neck rope tie with bow knot right below chin
  ctx.fillStyle = '#d4c5b0';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(-58, -172, 116, 11, 5);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, -166, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Hood opening & 2.5D Round Pale-Blue Face
  ctx.save();
  ctx.translate(pose.headYaw * 12, -225 + pose.headBobY * 0.55);
  ctx.rotate(pose.headTilt);

  // Inner hood shadow rim
  ctx.fillStyle = '#3f3b36';
  ctx.beginPath();
  ctx.ellipse(0, 0, 44, 46, 0, 0, Math.PI * 2);
  ctx.fill();

  // Pale icy-blue face (#CBE2EE)
  ctx.fillStyle = profile.skinColor;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(0, 2, 39 * Math.cos(pose.headYaw * 0.3), 42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  const fx = pose.headYaw * 11;
  // Wispy messy black forehead hair strands
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

  // Heavy dark under-eye bags (tired overtime!) or X-X dizzy eyes if planked!
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
    ctx.fillStyle = 'rgba(100, 116, 139, 0.45)';
    ctx.beginPath();
    ctx.ellipse(-14 + fx, 1, 11, 7.5, 0, 0, Math.PI * 2);
    ctx.ellipse(14 + fx, 1, 11, 7.5, 0, 0, Math.PI * 2);
    ctx.fill();
    drawFaceFeatures(ctx, pose, profile, fx, -4, 0.94, true);
  }

  ctx.restore();
  ctx.restore();
}

/**
 * KUN-KUN — Matched directly to kun_kun_de0d64c1.jpg puppet sheet
 */
function drawKuntiRig(
  ctx: CanvasRenderingContext2D,
  profile: CharacterProfile,
  pose: EvaluatedMotionPose,
  globalTime: number
) {
  ctx.save();
  ctx.rotate(pose.bodyLean);

  // Back layer of jet-black hair (Secondary Motion spring chain)
  ctx.save();
  ctx.translate(0, -258 + pose.headBobY * 0.5);
  ctx.fillStyle = profile.hairColor;
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

  // Flowing ghost-tail skirt + fitted long-sleeve blouse (no feet!)
  const hemWave = Math.sin(globalTime * 3.2) * 9 + pose.scarfAngle * 22;
  ctx.fillStyle = profile.primaryColor;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.5;

  // Flared pleated skirt + ghostly wisp tail at bottom right
  ctx.beginPath();
  ctx.moveTo(-30, -148);
  ctx.quadraticCurveTo(-56, -78, -68 + hemWave, -18);
  ctx.quadraticCurveTo(-36, -6, -12 + hemWave * 0.6, -20);
  ctx.quadraticCurveTo(8, -10, 12 + hemWave * 0.8, 8); // ghostly wisp curl!
  ctx.quadraticCurveTo(28, -4, 30 + hemWave * 0.7, -22);
  ctx.quadraticCurveTo(52, -8, 68 + hemWave, -18);
  ctx.quadraticCurveTo(54, -78, 30, -148);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Fitted blouse torso
  ctx.beginPath();
  ctx.roundRect(-34, -220, 68, 76, 16);
  ctx.fill();
  ctx.stroke();
  // V-neck collar detail
  ctx.fillStyle = profile.skinColor;
  ctx.beginPath();
  ctx.moveTo(-14, -220);
  ctx.lineTo(0, -196);
  ctx.lineTo(14, -220);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // IK Arms holding Clipboard (left) & Kopi Sabar (right)
  drawTwoBoneArms(ctx, pose, -204, profile.primaryColor, profile.skinColor, 50, 46, profile, 14);

  // Head + 2.5D Turn
  ctx.save();
  ctx.translate(pose.headYaw * 15, -264 + pose.headBobY * 0.58);
  ctx.rotate(pose.headTilt);

  // Hair crown
  ctx.fillStyle = profile.hairColor;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.arc(0, -8, 50, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Pale blue-gray face (#C8D6E5)
  ctx.fillStyle = profile.skinColor;
  ctx.beginPath();
  ctx.ellipse(pose.headYaw * 6, 4, 41 * Math.cos(pose.headYaw * 0.35), 45, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  const fx = pose.headYaw * 13;
  drawFaceFeatures(ctx, pose, profile, fx, 0, 0.98, false);

  // Sleek Cat-Eye Glasses
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 3.5;
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
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

  // Asymmetrical long front bangs sweeping over left eye (matching sheet!)
  ctx.fillStyle = profile.hairColor;
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

  ctx.restore();
  ctx.restore();
}

/**
 * PAK GENDU — Matched directly to gendu_5b968460.jpg puppet sheet
 */
function drawGenderuwoRig(
  ctx: CanvasRenderingContext2D,
  profile: CharacterProfile,
  pose: EvaluatedMotionPose,
  globalTime: number
) {
  const hipY = -102;
  // Dark shorts/pants + furry bare feet planted with 2-Bone IK
  drawTwoBoneLegs(ctx, pose, hipY, '#231f20', profile.primaryColor, 54, 52, true, true);

  ctx.save();
  ctx.translate(0, hipY);
  ctx.rotate(pose.bodyLean);
  ctx.scale(pose.breathScale, 1 + (pose.breathScale - 1) * 0.5);

  // Big furry oval pot-belly body (#4A3B31)
  ctx.fillStyle = profile.primaryColor;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(0, -84, 80, 96, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Dark waist brief/shorts
  ctx.fillStyle = '#231f20';
  ctx.beginPath();
  ctx.ellipse(0, -10, 62, 24, 0, 0, Math.PI);
  ctx.fill();
  ctx.stroke();

  // Open-front Brown & Gold Batik Shirt (leaving furry chest/belly exposed in center!)
  ctx.fillStyle = profile.secondaryColor;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.5;
  // Left shirt panel
  ctx.beginPath();
  ctx.moveTo(-18, -162);
  ctx.lineTo(-76, -138);
  ctx.lineTo(-82, -28);
  ctx.lineTo(-26, -24);
  ctx.quadraticCurveTo(-18, -95, -18, -162);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Right shirt panel
  ctx.beginPath();
  ctx.moveTo(18, -162);
  ctx.lineTo(76, -138);
  ctx.lineTo(82, -28);
  ctx.lineTo(26, -24);
  ctx.quadraticCurveTo(18, -95, 18, -162);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Classic gold Batik motifs on shirt panels
  ctx.strokeStyle = '#d4a76a';
  ctx.lineWidth = 2.2;
  for (const bx of [-52, -40, 40, 52]) {
    for (const by of [-115, -80, -48]) {
      ctx.beginPath();
      ctx.arc(bx, by, 7, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // Golden horn-like official pin on chest
  ctx.fillStyle = profile.accentColor;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(38, -112, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Furry 2-Bone IK arms holding green cigar
  drawTwoBoneArms(ctx, pose, -135, profile.primaryColor, profile.primaryColor, 58, 52, profile, 22);

  // Pale green cigar smoke wisps
  if (profile.hasCigar) {
    for (let s = 0; s < 3; s++) {
      const sy = -140 - ((globalTime * 45 + s * 26) % 85);
      const sx = 98 + Math.sin(globalTime * 3 + s) * 14;
      ctx.fillStyle = `rgba(167, 215, 184, ${(0.52 - s * 0.12).toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(sx, sy, 10 + s * 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Furry Head with glowing red eyes & fangs
  ctx.save();
  ctx.translate(pose.headYaw * 16, -186 + pose.headBobY * 0.5);
  ctx.rotate(pose.headTilt);

  ctx.fillStyle = profile.primaryColor;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, 55, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Furry cheek/crown tufts
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
  // Glowing red eyes
  drawGlowingEyes(ctx, pose, fx, -10, '#ef4444', true);
  // Broad flat nose
  ctx.fillStyle = '#2c221e';
  ctx.beginPath();
  ctx.ellipse(fx, 8, 10, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Mouth with fangs!
  ctx.save();
  ctx.translate(fx, 26);
  drawVisemeMouth(ctx, pose.viseme, pose.mouthOpen, '#1c1917', 1.12, true);
  ctx.restore();

  ctx.restore();
  ctx.restore();
}

/**
 * TUYUL & GUS TUYUL MUDA — Matched directly to tuyul_de6ed773.jpg puppet sheet
 */
function drawTuyulRig(
  ctx: CanvasRenderingContext2D,
  profile: CharacterProfile,
  pose: EvaluatedMotionPose,
  _globalTime: number
) {
  const hipY = -88;
  // Warm peach bare legs & feet (2-Bone IK!)
  drawTwoBoneLegs(ctx, pose, hipY, profile.skinColor, profile.skinColor, 46, 46, true, false);

  ctx.save();
  ctx.translate(0, hipY);
  ctx.rotate(pose.bodyLean);
  ctx.scale(pose.breathScale, 1 + (pose.breathScale - 1) * 0.5);

  // Bare-chested peach torso (or dark suit if Gus Tuyul Muda)
  ctx.fillStyle = profile.primaryColor;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.roundRect(-34, -96, 68, 92, 22);
  ctx.fill();
  ctx.stroke();

  // White boxer shorts (#F8FAFC)
  ctx.fillStyle = profile.secondaryColor;
  ctx.beginPath();
  ctx.roundRect(-36, -28, 72, 34, 8);
  ctx.fill();
  ctx.stroke();

  // Subtle belly button for bare-chested Tuyul
  if (!profile.hasTie) {
    ctx.fillStyle = '#b4785b';
    ctx.beginPath();
    ctx.arc(0, -40, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Tie if Gus Tuyul Muda
  if (profile.hasTie) {
    ctx.save();
    ctx.translate(0, -82);
    ctx.rotate(pose.scarfAngle * 0.7);
    ctx.fillStyle = '#dc2626';
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

  // IK Arms holding EDC machine + Coin Sack
  drawTwoBoneArms(ctx, pose, -82, profile.primaryColor, profile.skinColor, 40, 38, profile, 14);

  // Big shiny bald round head (#E3AF95) with ears
  ctx.save();
  ctx.translate(pose.headYaw * 14, -142 + pose.headBobY * 0.55);
  ctx.rotate(pose.headTilt);

  // Ears
  ctx.fillStyle = profile.skinColor;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(-49, 4, 10, 14, -0.2, 0, Math.PI * 2);
  ctx.ellipse(49, 4, 10, 14, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Head
  ctx.fillStyle = profile.skinColor;
  ctx.beginPath();
  ctx.arc(0, 0, 50, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Bald shine highlight
  ctx.fillStyle = 'rgba(255, 255, 255, 0.42)';
  ctx.beginPath();
  ctx.ellipse(-18, -26, 15, 7, -0.45, 0, Math.PI * 2);
  ctx.fill();

  const fx = pose.headYaw * 12;
  // Mischievous green eyes + dark lower-lid shadow
  ctx.fillStyle = 'rgba(100, 116, 139, 0.32)';
  ctx.beginPath();
  ctx.ellipse(-16 + fx, 4, 12, 6, 0, 0, Math.PI * 2);
  ctx.ellipse(16 + fx, 4, 12, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  const eyeScaleY = Math.max(0.1, 1 - pose.blinkAmount);
  for (const ex of [-16 + fx, 16 + fx]) {
    ctx.save();
    ctx.translate(ex, -4);
    ctx.scale(1, eyeScaleY);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.ellipse(0, 0, 10, 9.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (eyeScaleY > 0.25) {
      ctx.fillStyle = '#2e8b57';
      ctx.beginPath();
      ctx.arc(pose.lookAtX * 3.5, pose.lookAtY * 3.5, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.arc(pose.lookAtX * 3.5, pose.lookAtY * 3.5, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Mischievous angled eyebrows
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

  // Pacifier (Dot bayi) for Gus Tuyul Muda
  if (profile.hasPacifier && !pose.isSpeaking) {
    ctx.fillStyle = '#fbbf24';
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

  // Secondary Motion: Undulating golden snake tail
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
  ctx.strokeStyle = profile.secondaryColor;
  ctx.lineWidth = 40;
  ctx.stroke();
  ctx.strokeStyle = '#fef08a';
  ctx.lineWidth = 10;
  ctx.stroke();
  ctx.restore();

  // Emerald Kebaya torso
  ctx.fillStyle = profile.primaryColor;
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

  ctx.fillStyle = profile.hairColor;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, -10, 44, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Golden crown ornament
  ctx.fillStyle = profile.secondaryColor;
  ctx.beginPath();
  ctx.moveTo(-26, -42);
  ctx.lineTo(-14, -68);
  ctx.lineTo(0, -48);
  ctx.lineTo(14, -68);
  ctx.lineTo(26, -42);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = profile.skinColor;
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

  ctx.fillStyle = profile.primaryColor;
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
    ctx.fillStyle = profile.accentColor;
    ctx.fillRect(-5, 0, 10, 56);
    ctx.restore();
  }

  drawTwoBoneArms(ctx, pose, -104, profile.primaryColor, profile.skinColor, 52, 48, profile, 16);

  ctx.save();
  ctx.translate(pose.headYaw * 15, -162 + pose.headBobY * 0.5);
  ctx.rotate(pose.headTilt);

  ctx.fillStyle = profile.skinColor;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.ellipse(0, 0, 38 * Math.cos(pose.headYaw * 0.3), 42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = profile.hairColor;
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
    ctx.fillStyle = '#ffffff';
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
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(pose.lookAtX * 3.5 - 1.5, pose.lookAtY * 3.5 - 1.5, 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Half-drooped tired upper eyelids for Poci!
      if (droopyLids && pose.actionCue !== 'shock') {
        ctx.fillStyle = profile.skinColor;
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
      ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
      ctx.beginPath();
      ctx.arc(0, 0, 15, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = glowColor;
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
 * 6-Viseme Mouth Renderer: closed | smile | o | wide | teeth | tongue
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
      ctx.fillStyle = '#450a0a';
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
      ctx.fillStyle = '#450a0a';
      ctx.strokeStyle = lipColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(0, 2, 8 + 3 * o, 10 + 5 * o, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'wide': {
      ctx.fillStyle = '#450a0a';
      ctx.strokeStyle = lipColor;
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.ellipse(0, 3, 16, 8 + 9 * o, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-10, -4 - 4 * o, 20, 4);
      ctx.fillStyle = '#fb7185';
      ctx.beginPath();
      ctx.ellipse(0, 7 + 3 * o, 9, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'teeth': {
      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = lipColor;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.roundRect(-14, -4, 28, 10 + 4 * o, 5);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'tongue': {
      ctx.fillStyle = '#450a0a';
      ctx.strokeStyle = lipColor;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.ellipse(0, 2, 13, 8 + 5 * o, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f43f5e';
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
