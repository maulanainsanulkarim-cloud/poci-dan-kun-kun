import { CharacterProfile, VisemeType } from '../types/studio';
import { getCachedImage } from './backgrounds';
import { EvaluatedMotionPose, solveTwoBoneIK } from './ikPhysics';

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
  const shadowRx = 72 * scale * heightRatio * (pose.plankAngle > 0.4 ? 1.8 : 1);
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

  // If user uploaded a custom reference image for this character, allow hybrid sprite / rig or badge
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
  // Use full 2-bone IK limbs with custom reference image mounted on articulated torso/head
  const hipY = -125;
  drawTwoBoneLegs(ctx, pose, hipY, profile.secondaryColor, '#18181b', 64, 62);
  ctx.save();
  ctx.translate(0, hipY);
  ctx.rotate(pose.bodyLean);
  ctx.scale(pose.breathScale, 1 + (pose.breathScale - 1) * 0.6);

  drawTwoBoneArms(ctx, pose, -105, profile.primaryColor, profile.skinColor, 54, 50, profile);

  // Render reference image cleanly clipped inside articulated character portrait capsule
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

  // Overlay lip-sync mouth indicator cleanly at lower third if speaking
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
  shoeColor: string,
  len1 = 62,
  len2 = 62
) {
  const footPlantY = pose.hopHeight > 12 ? 12 : 0; // feet tuck slightly during jump
  const stanceHalf = 28;
  const footLX = -stanceHalf - pose.weightShiftX * 0.35;
  const footRX = stanceHalf - pose.weightShiftX * 0.35;

  const ikL = solveTwoBoneIK(-20, hipY, footLX, footPlantY - 8, len1, len2, 1);
  const ikR = solveTwoBoneIK(20, hipY, footRX, footPlantY - 8, len1, len2, -1);

  for (const ik of [
    { rootX: -20, ...ikL },
    { rootX: 20, ...ikR },
  ]) {
    ctx.strokeStyle = pantColor;
    ctx.lineWidth = 22;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(ik.rootX, hipY);
    ctx.lineTo(ik.jointX, ik.jointY);
    ctx.lineTo(ik.endX, ik.endY);
    ctx.stroke();

    // Shoe planted flat on ground
    ctx.fillStyle = shoeColor;
    ctx.beginPath();
    ctx.ellipse(ik.endX + 4, ik.endY + 6, 20, 10, 0, 0, Math.PI * 2);
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
  profile: CharacterProfile
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
    ctx.strokeStyle = sleeveColor;
    ctx.lineWidth = 18;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(side.rootX, shoulderY);
    ctx.lineTo(side.ik.jointX, side.ik.jointY);
    ctx.lineTo(side.ik.endX, side.ik.endY);
    ctx.stroke();

    // Hand
    ctx.fillStyle = handColor;
    ctx.beginPath();
    ctx.arc(side.ik.endX, side.ik.endY, 12, 0, Math.PI * 2);
    ctx.fill();

    // Held props anchored to IK end-effector hand!
    if (side.isRight) {
      if (profile.hasRedFolder) {
        ctx.save();
        ctx.translate(side.ik.endX, side.ik.endY);
        ctx.rotate(0.2 + pose.armGestureR * 0.25);
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(-18, -26, 44, 58);
        ctx.strokeStyle = '#991b1b';
        ctx.lineWidth = 2;
        ctx.strokeRect(-18, -26, 44, 58);
        ctx.fillStyle = '#fef2f2';
        ctx.font = '700 9px "Plus Jakarta Sans", sans-serif';
        ctx.fillText('REVISI', -12, 4);
        ctx.restore();
      } else if (profile.hasGavel) {
        ctx.save();
        ctx.translate(side.ik.endX, side.ik.endY);
        ctx.rotate(pose.armGestureR);
        ctx.fillStyle = '#78350f';
        ctx.fillRect(-5, -52, 10, 56);
        ctx.fillStyle = '#b45309';
        ctx.beginPath();
        ctx.roundRect(-22, -62, 44, 22, 6);
        ctx.fill();
        ctx.restore();
      } else if (profile.hasClipboard) {
        // Kopi Sabar cup!
        ctx.save();
        ctx.translate(side.ik.endX, side.ik.endY - 6);
        ctx.fillStyle = '#f5f5f4';
        ctx.fillRect(-13, -18, 26, 30);
        ctx.fillStyle = '#78350f';
        ctx.fillRect(-14, -22, 28, 6);
        ctx.fillStyle = '#57534e';
        ctx.font = '700 7px sans-serif';
        ctx.fillText('KOPI', -9, -1);
        ctx.restore();
      } else if (profile.hasCigar) {
        ctx.save();
        ctx.translate(side.ik.endX, side.ik.endY);
        ctx.rotate(-0.4);
        ctx.fillStyle = '#78350f';
        ctx.fillRect(0, -4, 34, 7);
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(36, 0, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (profile.hasCoinBag) {
        ctx.save();
        ctx.translate(side.ik.endX, side.ik.endY + 12);
        ctx.fillStyle = '#b45309';
        ctx.beginPath();
        ctx.arc(0, 12, 24, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fde047';
        ctx.font = '800 18px sans-serif';
        ctx.fillText('$', -5, 19);
        ctx.restore();
      }
    }
  }
}

function drawPocongRig(
  ctx: CanvasRenderingContext2D,
  profile: CharacterProfile,
  pose: EvaluatedMotionPose,
  _globalTime: number
) {
  ctx.save();
  ctx.rotate(pose.bodyLean);

  // Shroud Capsule Body (white bone #F4F1EA with soft gray shading)
  const bodyGrad = ctx.createLinearGradient(-58, -320, 58, 0);
  bodyGrad.addColorStop(0, profile.primaryColor);
  bodyGrad.addColorStop(1, profile.secondaryColor);

  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.roundRect(-56, -290, 112, 282, [56, 56, 34, 34]);
  ctx.fill();
  ctx.strokeStyle = '#a8a29e';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Secondary Motion: Top-knot jambul swaying with spring physics!
  ctx.save();
  ctx.translate(0, -290);
  ctx.rotate(pose.hairAngle1 * 1.4 + pose.headTilt);
  ctx.fillStyle = profile.primaryColor;
  ctx.beginPath();
  ctx.moveTo(-14, 0);
  ctx.quadraticCurveTo(-24, -46, -6, -68);
  ctx.quadraticCurveTo(10, -54, 14, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#a8a29e';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.restore();

  // 3 Rope Ties (top, waist, ankles)
  for (const tieY of [-285, -155, -36]) {
    const w = tieY === -285 ? 24 : 58;
    ctx.fillStyle = '#d6c7b2';
    ctx.beginPath();
    ctx.roundRect(-w, tieY - 6, w * 2, 12, 6);
    ctx.fill();
    ctx.strokeStyle = '#78716c';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Slanted ID Card + Sling Strap for Red Folder 'REVISI'
  ctx.strokeStyle = '#7f1d1d';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(-48, -190);
  ctx.lineTo(48, -110);
  ctx.stroke();

  // Red Folder tucked/held with IK arm hint
  drawTwoBoneArms(ctx, pose, -168, profile.primaryColor, profile.primaryColor, 36, 32, profile);

  // Slanted ID card
  ctx.save();
  ctx.translate(-22, -138);
  ctx.rotate(-0.18 + pose.scarfAngle * 0.4);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-14, 0, 28, 36);
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(-14, 0, 28, 8);
  ctx.restore();

  // 2.5D Face inside hood opening
  ctx.save();
  ctx.translate(pose.headYaw * 14, -228 + pose.headBobY * 0.6);
  ctx.rotate(pose.headTilt);

  // Face oval (bluish pale)
  ctx.fillStyle = profile.skinColor;
  ctx.beginPath();
  ctx.ellipse(0, 0, 38 * Math.cos(pose.headYaw * 0.35), 42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Heavy dark eye bags (overtime lembur!)
  const fx = pose.headYaw * 12;
  ctx.fillStyle = 'rgba(71, 85, 105, 0.45)';
  ctx.beginPath();
  ctx.ellipse(-14 + fx, -2, 11, 7, 0, 0, Math.PI * 2);
  ctx.ellipse(14 + fx, -2, 11, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  drawFaceFeatures(ctx, pose, profile, fx, -6, 0.92);
  ctx.restore();

  ctx.restore();
}

function drawKuntiRig(
  ctx: CanvasRenderingContext2D,
  profile: CharacterProfile,
  pose: EvaluatedMotionPose,
  globalTime: number
) {
  ctx.save();
  ctx.rotate(pose.bodyLean);

  // Flowing dress without feet (levitating sine wave + secondary hem motion)
  const dressGrad = ctx.createLinearGradient(0, -240, 0, -10);
  dressGrad.addColorStop(0, profile.primaryColor);
  dressGrad.addColorStop(1, profile.secondaryColor);
  ctx.fillStyle = dressGrad;

  const hemWave = Math.sin(globalTime * 3.5) * 10 + pose.scarfAngle * 24;
  ctx.beginPath();
  ctx.moveTo(-36, -210);
  ctx.quadraticCurveTo(-52, -110, -68 + hemWave, -16);
  ctx.quadraticCurveTo(-24, -4, 0 + hemWave * 0.5, -18);
  ctx.quadraticCurveTo(32, -4, 68 + hemWave, -16);
  ctx.quadraticCurveTo(50, -110, 36, -210);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Back layer of long jet-black hair (Secondary Motion spring chain)
  ctx.save();
  ctx.translate(0, -255 + pose.headBobY * 0.5);
  ctx.fillStyle = profile.hairColor;
  ctx.beginPath();
  ctx.moveTo(-54, -10);
  ctx.quadraticCurveTo(-68 + pose.hairAngle1 * 35, 95, -52 + pose.hairAngle3 * 65, 210);
  ctx.lineTo(52 + pose.hairAngle3 * 65, 210);
  ctx.quadraticCurveTo(68 + pose.hairAngle1 * 35, 95, 54, -10);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // IK Arms holding Kopi Sabar
  drawTwoBoneArms(ctx, pose, -188, profile.primaryColor, profile.skinColor, 50, 46, profile);

  // Head + 2.5D Turn
  ctx.save();
  ctx.translate(pose.headYaw * 16, -262 + pose.headBobY * 0.6);
  ctx.rotate(pose.headTilt);

  // Hair crown
  ctx.fillStyle = profile.hairColor;
  ctx.beginPath();
  ctx.arc(0, -8, 52, 0, Math.PI * 2);
  ctx.fill();

  // Pale face
  ctx.fillStyle = profile.skinColor;
  ctx.beginPath();
  ctx.ellipse(pose.headYaw * 6, 4, 42 * Math.cos(pose.headYaw * 0.35), 46, 0, 0, Math.PI * 2);
  ctx.fill();

  const fx = pose.headYaw * 14;
  drawFaceFeatures(ctx, pose, profile, fx, 0, 1.0);

  // Cat-eye glasses sliding down the nose
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 3.2;
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath();
  ctx.moveTo(-28 + fx, -2);
  ctx.lineTo(-4 + fx, 0);
  ctx.lineTo(-8 + fx, 12);
  ctx.lineTo(-26 + fx, 10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(4 + fx, 0);
  ctx.lineTo(28 + fx, -2);
  ctx.lineTo(26 + fx, 10);
  ctx.lineTo(8 + fx, 12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Messy bangs covering one eye
  ctx.fillStyle = profile.hairColor;
  ctx.beginPath();
  ctx.moveTo(-44, -22);
  ctx.quadraticCurveTo(-18 + pose.hairAngle2 * 12, 16, -6, -18);
  ctx.quadraticCurveTo(18, -32, 44, -14);
  ctx.quadraticCurveTo(28, -56, 0, -56);
  ctx.quadraticCurveTo(-36, -54, -44, -22);
  ctx.fill();

  ctx.restore();
  ctx.restore();
}

function drawGenderuwoRig(
  ctx: CanvasRenderingContext2D,
  profile: CharacterProfile,
  pose: EvaluatedMotionPose,
  globalTime: number
) {
  const hipY = -105;
  drawTwoBoneLegs(ctx, pose, hipY, '#1c1917', '#09090b', 56, 54);

  ctx.save();
  ctx.translate(0, hipY);
  ctx.rotate(pose.bodyLean);
  ctx.scale(pose.breathScale, 1 + (pose.breathScale - 1) * 0.5);

  // Big oval furry body wearing silk batik + gold pin
  ctx.fillStyle = profile.primaryColor;
  ctx.beginPath();
  ctx.ellipse(0, -82, 82, 98, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1c1917';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Silk Batik sash/shirt pattern
  ctx.fillStyle = '#78350f';
  ctx.beginPath();
  ctx.ellipse(0, -68, 66, 76, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = profile.secondaryColor;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.arc(i * 22, -68 + (i % 2) * 16, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  // Big Gold Official Pin
  ctx.fillStyle = profile.accentColor;
  ctx.beginPath();
  ctx.arc(34, -110, 12, 0, Math.PI * 2);
  ctx.fill();

  // IK Arms with green cigar
  drawTwoBoneArms(ctx, pose, -135, '#78350f', profile.skinColor, 58, 52, profile);

  // Green cigar smoke puff
  if (profile.hasCigar) {
    for (let s = 0; s < 3; s++) {
      const sy = -140 - ((globalTime * 45 + s * 26) % 85);
      const sx = 95 + Math.sin(globalTime * 3 + s) * 14;
      ctx.fillStyle = `rgba(74, 222, 128, ${0.42 - s * 0.1})`;
      ctx.beginPath();
      ctx.arc(sx, sy, 10 + s * 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Head
  ctx.save();
  ctx.translate(pose.headYaw * 16, -186 + pose.headBobY * 0.5);
  ctx.rotate(pose.headTilt);

  ctx.fillStyle = profile.hairColor;
  ctx.beginPath();
  ctx.arc(0, 0, 56, 0, Math.PI * 2);
  ctx.fill();
  // Spiky furry side tufts
  ctx.beginPath();
  ctx.moveTo(-54, -10);
  ctx.lineTo(-70, -28);
  ctx.lineTo(-48, -36);
  ctx.moveTo(54, -10);
  ctx.lineTo(70, -28);
  ctx.lineTo(48, -36);
  ctx.fill();

  const fx = pose.headYaw * 14;
  // Glowing red eyes
  drawGlowingEyes(ctx, pose, fx, -8, '#ef4444');
  // Mouth
  ctx.save();
  ctx.translate(fx, 22);
  drawVisemeMouth(ctx, pose.viseme, pose.mouthOpen, '#fca5a5', 1.15);
  ctx.restore();

  ctx.restore();
  ctx.restore();
}

function drawTuyulRig(
  ctx: CanvasRenderingContext2D,
  profile: CharacterProfile,
  pose: EvaluatedMotionPose,
  _globalTime: number
) {
  const hipY = -88;
  drawTwoBoneLegs(ctx, pose, hipY, profile.secondaryColor, profile.skinColor, 46, 46);

  ctx.save();
  ctx.translate(0, hipY);
  ctx.rotate(pose.bodyLean);
  ctx.scale(pose.breathScale, 1 + (pose.breathScale - 1) * 0.5);

  // Small agile torso
  ctx.fillStyle = profile.primaryColor;
  ctx.beginPath();
  ctx.roundRect(-36, -98, 72, 98, 28);
  ctx.fill();

  // Tie if Gus Tuyul Muda
  if (profile.hasTie) {
    ctx.save();
    ctx.translate(0, -82);
    ctx.rotate(pose.scarfAngle * 0.7);
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.moveTo(-7, 0);
    ctx.lineTo(7, 0);
    ctx.lineTo(11, 52);
    ctx.lineTo(0, 66);
    ctx.lineTo(-11, 52);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  drawTwoBoneArms(ctx, pose, -82, profile.primaryColor, profile.skinColor, 40, 38, profile);

  // Big shiny bald head
  ctx.save();
  ctx.translate(pose.headYaw * 14, -142 + pose.headBobY * 0.55);
  ctx.rotate(pose.headTilt);

  ctx.fillStyle = profile.skinColor;
  ctx.beginPath();
  ctx.arc(0, 0, 50, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#52685a';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Bald shine highlight
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath();
  ctx.ellipse(-18, -26, 14, 7, -0.45, 0, Math.PI * 2);
  ctx.fill();

  const fx = pose.headYaw * 12;
  drawGlowingEyes(ctx, pose, fx, -4, '#22c55e');

  ctx.save();
  ctx.translate(fx, 22);
  drawVisemeMouth(ctx, pose.viseme, pose.mouthOpen, '#14532d', 0.9);
  ctx.restore();

  // Pacifier (Dot bayi) for Gus Tuyul Muda
  if (profile.hasPacifier && !pose.isSpeaking) {
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(fx, 24, 10, 0, Math.PI * 2);
    ctx.fill();
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
  ctx.strokeStyle = profile.secondaryColor;
  ctx.lineWidth = 42;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, -100);
  ctx.bezierCurveTo(-45 + tailWave1, -55, 65 + tailWave2, -18, 95 + tailWave2, -10);
  ctx.stroke();
  ctx.strokeStyle = '#fef08a';
  ctx.lineWidth = 10;
  ctx.stroke();
  ctx.restore();

  // Emerald Kebaya torso
  ctx.fillStyle = profile.primaryColor;
  ctx.beginPath();
  ctx.roundRect(-38, -210, 76, 120, 24);
  ctx.fill();

  drawTwoBoneArms(ctx, pose, -195, profile.primaryColor, profile.skinColor, 48, 44, profile);

  // Head + Crown
  ctx.save();
  ctx.translate(pose.headYaw * 14, -258 + pose.headBobY * 0.5);
  ctx.rotate(pose.headTilt);

  ctx.fillStyle = profile.hairColor;
  ctx.beginPath();
  ctx.arc(0, -10, 44, 0, Math.PI * 2);
  ctx.fill();

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

  ctx.fillStyle = profile.skinColor;
  ctx.beginPath();
  ctx.ellipse(pose.headYaw * 6, 4, 36 * Math.cos(pose.headYaw * 0.35), 40, 0, 0, Math.PI * 2);
  ctx.fill();

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
  drawTwoBoneLegs(ctx, pose, hipY, '#1e293b', '#09090b', 62, 62);

  ctx.save();
  ctx.translate(0, hipY);
  ctx.rotate(pose.bodyLean);
  ctx.scale(pose.breathScale, 1 + (pose.breathScale - 1) * 0.5);

  // Coat / Torso
  ctx.fillStyle = profile.primaryColor;
  ctx.beginPath();
  ctx.roundRect(-44, -118, 88, 122, 22);
  ctx.fill();

  // Collar / Tie
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

  drawTwoBoneArms(ctx, pose, -104, profile.primaryColor, profile.skinColor, 52, 48, profile);

  // 2.5D Head
  ctx.save();
  ctx.translate(pose.headYaw * 15, -162 + pose.headBobY * 0.5);
  ctx.rotate(pose.headTilt);

  ctx.fillStyle = profile.skinColor;
  ctx.beginPath();
  ctx.ellipse(0, 0, 38 * Math.cos(pose.headYaw * 0.3), 42, 0, 0, Math.PI * 2);
  ctx.fill();

  // Hair cap
  ctx.fillStyle = profile.hairColor;
  ctx.beginPath();
  ctx.arc(0, -12, 40, Math.PI, 0);
  ctx.fill();

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
  scale = 1
) {
  ctx.save();
  ctx.translate(fx, fy);
  ctx.scale(scale, scale);

  // Eyes with natural blink + Look-At pupils
  const eyeScaleY = Math.max(0.08, 1 - pose.blinkAmount);
  for (const ex of [-15, 15]) {
    ctx.save();
    ctx.translate(ex, -6);
    ctx.scale(1, eyeScaleY);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(0, 0, 8, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    if (eyeScaleY > 0.25) {
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(pose.lookAtX * 3.5, pose.lookAtY * 3.5, 4.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(pose.lookAtX * 3.5 - 1.5, pose.lookAtY * 3.5 - 1.5, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Expressive eyebrows
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    const browRaise = pose.isSpeaking ? -3 : 0;
    ctx.moveTo(ex - 8, -19 + browRaise);
    ctx.lineTo(ex + 8, -17 + browRaise);
    ctx.stroke();
  }

  // Mouth with 6 Visemes
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
  glowColor: string
) {
  const eyeScaleY = Math.max(0.1, 1 - pose.blinkAmount);
  for (const ex of [-16, 16]) {
    ctx.save();
    ctx.translate(ex + fx, fy);
    ctx.scale(1, eyeScaleY);
    ctx.fillStyle = glowColor;
    ctx.beginPath();
    ctx.ellipse(0, 0, 9, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    if (eyeScaleY > 0.25) {
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.arc(pose.lookAtX * 3, pose.lookAtY * 3, 3.8, 0, Math.PI * 2);
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
  scale = 1
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
      ctx.quadraticCurveTo(0, 3, 12, -2); // subtle smirk
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
      // Upper teeth & tongue inside wide mouth
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
  ctx.restore();
}
