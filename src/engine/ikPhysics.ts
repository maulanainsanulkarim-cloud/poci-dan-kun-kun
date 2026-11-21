import {
  CharacterActionCue,
  CharacterMotionEnergy,
  DialogueLine,
  VisemeType,
} from '../types/studio';

export interface IKJointResult {
  jointX: number;
  jointY: number;
  endX: number;
  endY: number;
}

/**
 * Analytical 2-Bone Inverse Kinematics solver using the law of cosines.
 * Keeps feet firmly planted on the floor plane and arms reaching exact prop targets.
 */
export function solveTwoBoneIK(
  rootX: number,
  rootY: number,
  targetX: number,
  targetY: number,
  len1: number,
  len2: number,
  bendDirection: 1 | -1 = 1
): IKJointResult {
  const dx = targetX - rootX;
  const dy = targetY - rootY;
  const maxReach = Math.max(0.001, len1 + len2 - 0.5);
  const minReach = Math.abs(len1 - len2) + 0.5;
  const distRaw = Math.hypot(dx, dy);
  const dist = Math.max(minReach, Math.min(maxReach, distRaw));

  const baseAngle = Math.atan2(dy, dx);
  const cosAngle1 = Math.max(
    -1,
    Math.min(1, (len1 * len1 + dist * dist - len2 * len2) / (2 * len1 * dist))
  );
  const angle1 = baseAngle + bendDirection * Math.acos(cosAngle1);

  const jointX = rootX + Math.cos(angle1) * len1;
  const jointY = rootY + Math.sin(angle1) * len1;

  const endX = rootX + (dx / Math.max(0.001, distRaw)) * dist;
  const endY = rootY + (dy / Math.max(0.001, distRaw)) * dist;

  return { jointX, jointY, endX, endY };
}

export class Spring1D {
  value: number;
  velocity: number;
  stiffness: number;
  damping: number;

  constructor(initial = 0, stiffness = 180, damping = 16) {
    this.value = initial;
    this.velocity = 0;
    this.stiffness = stiffness;
    this.damping = damping;
  }

  step(target: number, dt: number): number {
    const safeDt = Math.min(0.05, Math.max(0.001, dt));
    const force = (target - this.value) * this.stiffness;
    const dampForce = this.velocity * this.damping;
    const accel = force - dampForce;
    this.velocity += accel * safeDt;
    this.value += this.velocity * safeDt;
    return this.value;
  }

  reset(val = 0) {
    this.value = val;
    this.velocity = 0;
  }
}

export interface CharacterSpringRig {
  headLagX: Spring1D;
  headLagY: Spring1D;
  headYawSpring: Spring1D;
  squashY: Spring1D;
  hairAngle1: Spring1D;
  hairAngle2: Spring1D;
  hairAngle3: Spring1D;
  scarfAngle: Spring1D;
  armGestureL: Spring1D;
  armGestureR: Spring1D;
  lastUpdateTime: number;
}

export function createCharacterSpringRig(): CharacterSpringRig {
  return {
    headLagX: new Spring1D(0, 140, 14),
    headLagY: new Spring1D(0, 160, 13),
    headYawSpring: new Spring1D(0, 110, 15),
    squashY: new Spring1D(1, 220, 14),
    hairAngle1: new Spring1D(0, 95, 9),
    hairAngle2: new Spring1D(0, 75, 8),
    hairAngle3: new Spring1D(0, 58, 7),
    scarfAngle: new Spring1D(0, 82, 8),
    armGestureL: new Spring1D(0, 130, 12),
    armGestureR: new Spring1D(0, 130, 12),
    lastUpdateTime: -1,
  };
}

/**
 * Volume-preserving Squash & Stretch: scaleX = 1 / scaleY
 */
export function computeVolumeSquashStretch(rawScaleY: number): { scaleX: number; scaleY: number } {
  const scaleY = Math.max(0.76, Math.min(1.3, rawScaleY));
  const scaleX = 1 / scaleY;
  return { scaleX, scaleY };
}

/**
 * Deterministic natural blink + occasional double-blink pattern
 */
export function computeNaturalBlink(globalTime: number, seedOffset: number): number {
  const period = 3.8 + (seedOffset % 1.4);
  const local = (globalTime + seedOffset * 1.73) % period;
  // Primary blink at 0.0..0.14s
  if (local < 0.14) {
    const p = local / 0.14;
    return Math.sin(p * Math.PI); // 0 -> 1 -> 0 (1 = closed)
  }
  // Occasional double-blink (every 2nd cycle)
  const cycleIndex = Math.floor((globalTime + seedOffset * 1.73) / period);
  if (cycleIndex % 2 === 1 && local > 0.22 && local < 0.35) {
    const p = (local - 0.22) / 0.13;
    return Math.sin(p * Math.PI);
  }
  return 0;
}

/**
 * Extract 6 viseme shapes from 30 FPS MP3 amplitude envelope or text phoneme cadence
 */
export function sampleAudioViseme(
  envelope30Fps: number[] | null,
  sceneTime: number,
  activeDialogue: DialogueLine | null,
  isSpeaking: boolean
): { viseme: VisemeType; openness: number; energy: number } {
  if (!isSpeaking) {
    return { viseme: 'closed', openness: 0, energy: 0 };
  }

  let amp = 0;
  if (envelope30Fps && envelope30Fps.length > 0) {
    const frameIdx = Math.min(
      envelope30Fps.length - 1,
      Math.max(0, Math.floor(sceneTime * 30))
    );
    amp = envelope30Fps[frameIdx] ?? 0;
  } else if (activeDialogue) {
    // Synthesize natural syllable cadence from text length & timing
    const rel = Math.max(0, sceneTime - activeDialogue.startSec);
    const dur = Math.max(0.4, activeDialogue.endSec - activeDialogue.startSec);
    const norm = Math.min(1, rel / dur);
    const syllableWave =
      0.55 +
      0.35 * Math.sin(rel * 19.5) +
      0.18 * Math.cos(rel * 31.2);
    const envelopeFade = norm < 0.08 ? norm / 0.08 : norm > 0.92 ? (1 - norm) / 0.08 : 1;
    amp = Math.max(0, Math.min(1, syllableWave * envelopeFade));
  }

  if (amp < 0.07) {
    return { viseme: 'closed', openness: 0.05, energy: amp };
  }

  // Pick phoneme character near current progress in active dialogue for realistic variety
  let charHint = 'a';
  if (activeDialogue && activeDialogue.text.length > 0) {
    const dur = Math.max(0.2, activeDialogue.endSec - activeDialogue.startSec);
    const p = Math.max(0, Math.min(0.999, (sceneTime - activeDialogue.startSec) / dur));
    const idx = Math.floor(p * activeDialogue.text.length);
    charHint = activeDialogue.text[idx]?.toLowerCase() ?? 'a';
  }

  if (amp > 0.72 || charHint === 'a' || charHint === 'h') {
    return { viseme: 'wide', openness: Math.min(1, amp * 1.15), energy: amp };
  }
  if (charHint === 'o' || charHint === 'u') {
    return { viseme: 'o', openness: Math.min(0.9, amp), energy: amp };
  }
  if (charHint === 'i' || charHint === 'e') {
    return { viseme: 'smile', openness: Math.min(0.75, amp * 0.9), energy: amp };
  }
  if (charHint === 's' || charHint === 'f' || charHint === 't' || charHint === 'd' || charHint === 'k') {
    return { viseme: 'teeth', openness: Math.min(0.65, amp * 0.8), energy: amp };
  }
  if (charHint === 'l' || charHint === 'n' || charHint === 'r') {
    return { viseme: 'tongue', openness: Math.min(0.7, amp * 0.85), energy: amp };
  }

  return {
    viseme: amp > 0.45 ? 'wide' : 'teeth',
    openness: amp,
    energy: amp,
  };
}

export interface EvaluatedMotionPose {
  offsetX: number;
  offsetY: number;
  hopHeight: number;
  bodyLean: number; // radians
  headYaw: number; // -1..1 for 2.5D head turn
  headBobY: number;
  headTilt: number;
  scaleX: number;
  scaleY: number;
  breathScale: number;
  weightShiftX: number;
  blinkAmount: number; // 0..1
  lookAtX: number; // -1..1
  lookAtY: number; // -1..1
  hairAngle1: number;
  hairAngle2: number;
  hairAngle3: number;
  scarfAngle: number;
  armGestureL: number;
  armGestureR: number;
  plankAngle: number; // 0 = upright, PI/2 = fallen flat
  viseme: VisemeType;
  mouthOpen: number;
  isSpeaking: boolean;
  actionCue: CharacterActionCue;
}

export function evaluateCharacterMotion(
  rig: CharacterSpringRig,
  charId: string,
  energy: CharacterMotionEnergy,
  globalTime: number,
  sceneTime: number,
  isSpeaking: boolean,
  actionCue: CharacterActionCue,
  envelope30Fps: number[] | null,
  activeDialogue: DialogueLine | null,
  targetLookX: number,
  windStrength: number,
  seed: number
): EvaluatedMotionPose {
  // Deterministic spring stepping from globalTime
  const dt =
    rig.lastUpdateTime < 0 || globalTime < rig.lastUpdateTime || globalTime - rig.lastUpdateTime > 0.25
      ? 1 / 30
      : Math.max(0.001, globalTime - rig.lastUpdateTime);
  rig.lastUpdateTime = globalTime;

  // 1. Living Idle: Chest breathing + Weight shift + Blink
  const breathSpeed = energy === 'energetic' ? 2.8 : energy === 'graceful' ? 1.8 : 2.1;
  const breathScale = 1 + Math.sin(globalTime * breathSpeed + seed) * 0.022;
  const weightShiftX = Math.sin(globalTime * 1.15 + seed * 2) * (energy === 'graceful' ? 3 : 7);
  const blinkAmount = computeNaturalBlink(globalTime, seed);

  // 2. Anticipation + Action Choreography
  let targetOffsetY = 0;
  let targetHopHeight = 0;
  let targetBodyLean = 0;
  let targetSquashY = 1;
  let plankAngle = 0;
  let targetArmL = 0;
  let targetArmR = 0;

  if (actionCue === 'hop' || (charId === 'poci' && isSpeaking)) {
    // Anticipation crouch (0..0.22) -> Launch stretch -> Air peak -> Landing squash
    const cycle = (globalTime * 1.65 + seed * 0.4) % 1;
    if (cycle < 0.22) {
      // Anticipation (ancang-ancang)
      const p = cycle / 0.22;
      targetSquashY = 1 - 0.18 * Math.sin(p * Math.PI * 0.5);
      targetBodyLean = -0.06;
    } else if (cycle < 0.78) {
      // Airborne arc
      const airP = (cycle - 0.22) / 0.56;
      const arc = Math.sin(airP * Math.PI);
      targetHopHeight = arc * (charId === 'poci' ? 68 : 44);
      targetSquashY = 1 + 0.15 * Math.sin(airP * Math.PI);
      targetBodyLean = 0.07 * Math.cos(airP * Math.PI);
    } else {
      // Follow-through landing squash
      const landP = (cycle - 0.78) / 0.22;
      targetSquashY = 1 - 0.16 * Math.sin((1 - landP) * Math.PI);
    }
  } else if (actionCue === 'plank') {
    // Anticipation recoil then fall flat
    const beat = (sceneTime % 4) / 4;
    if (beat < 0.15) {
      targetSquashY = 1.18;
      targetBodyLean = -0.18;
    } else if (beat < 0.75) {
      plankAngle = Math.min(Math.PI * 0.46, ((beat - 0.15) / 0.15) * Math.PI * 0.46);
      targetSquashY = 0.88;
    } else {
      plankAngle = (1 - (beat - 0.75) / 0.25) * Math.PI * 0.46;
    }
  } else if (actionCue === 'shock') {
    const shockWave = Math.sin(globalTime * 18);
    targetSquashY = 1.14 + shockWave * 0.06;
    targetBodyLean = -0.12 + shockWave * 0.04;
    targetArmL = -1.2;
    targetArmR = -1.2;
  } else if (actionCue === 'laugh') {
    // Kun-Kun shoulder shake + squash laugh
    const chuckle = Math.sin(globalTime * 22);
    targetOffsetY = chuckle * 6;
    targetSquashY = 1 + chuckle * 0.07;
    targetArmR = 0.65; // cover mouth / gesture
  } else if (actionCue === 'dance') {
    const groove = Math.sin(globalTime * 8.5);
    targetHopHeight = Math.abs(groove) * 24;
    targetBodyLean = groove * 0.16;
    targetSquashY = 1 - Math.abs(groove) * 0.1;
    targetArmL = groove * 1.1;
    targetArmR = -groove * 1.1;
  } else if (actionCue === 'gavel_slam') {
    const beat = (globalTime * 1.4) % 1;
    if (beat < 0.3) {
      // Anticipation raise high
      targetArmR = -1.35;
      targetBodyLean = -0.08;
    } else if (beat < 0.45) {
      // Slam down
      targetArmR = 0.75;
      targetBodyLean = 0.12;
      targetSquashY = 0.87;
    } else {
      targetArmR = 0.2;
    }
  } else if (actionCue === 'rub_eyes') {
    targetArmL = -0.9 + Math.sin(globalTime * 10) * 0.15;
    targetBodyLean = 0.05;
  } else if (actionCue === 'type_fast') {
    targetArmL = 0.35 + Math.sin(globalTime * 28) * 0.22;
    targetArmR = 0.35 + Math.cos(globalTime * 28) * 0.22;
    targetBodyLean = 0.12;
  }

  // Kun-Kun gentle sine levitation
  if (charId === 'kunkun' || charId === 'blorong') {
    targetHopHeight += 22 + Math.sin(globalTime * 2.2 + seed) * 14;
  }

  // Speaking hand gestures
  if (isSpeaking) {
    targetArmL += Math.sin(globalTime * 6.5 + seed) * 0.38;
    targetArmR += Math.cos(globalTime * 5.8 + seed) * 0.45;
  }

  // 3. 2.5D Head Turn & Follow-through Springs
  const headYaw = rig.headYawSpring.step(targetLookX * 0.65, dt);
  const headLagX = rig.headLagX.step(targetBodyLean * 18, dt);
  const headLagY = rig.headLagY.step(-targetHopHeight * 0.12 + targetOffsetY * 0.4, dt);
  const smoothSquashY = rig.squashY.step(targetSquashY, dt);
  const { scaleX, scaleY } = computeVolumeSquashStretch(smoothSquashY);

  // 4. Secondary Motion (Hair, Jambul, Scarf, Snake Tail)
  const velDrag = -targetBodyLean * 0.8 + (windStrength * 0.35);
  const hairAngle1 = rig.hairAngle1.step(velDrag + Math.sin(globalTime * 2.6 + seed) * 0.14, dt);
  const hairAngle2 = rig.hairAngle2.step(hairAngle1 * 1.25 + Math.sin(globalTime * 2.6 - 0.6 + seed) * 0.18, dt);
  const hairAngle3 = rig.hairAngle3.step(hairAngle2 * 1.25 + Math.sin(globalTime * 2.6 - 1.2 + seed) * 0.22, dt);
  const scarfAngle = rig.scarfAngle.step(velDrag * 1.15 + Math.cos(globalTime * 3.1 + seed) * 0.16, dt);

  const armGestureL = rig.armGestureL.step(targetArmL, dt);
  const armGestureR = rig.armGestureR.step(targetArmR, dt);

  // 5. Lip-Sync 6-Viseme Sampling
  const { viseme, openness } = sampleAudioViseme(
    envelope30Fps,
    sceneTime,
    activeDialogue,
    isSpeaking
  );

  // Eye look-at tracking speaker / camera
  const lookAtX = Math.max(-1, Math.min(1, targetLookX + Math.sin(globalTime * 0.9 + seed) * 0.12));
  const lookAtY = isSpeaking ? -0.05 : Math.sin(globalTime * 0.7 + seed) * 0.1;

  return {
    offsetX: headLagX * 0.25,
    offsetY: targetOffsetY,
    hopHeight: targetHopHeight,
    bodyLean: targetBodyLean,
    headYaw,
    headBobY: headLagY,
    headTilt: -targetBodyLean * 0.45 + (isSpeaking ? Math.sin(globalTime * 4.5) * 0.05 : 0),
    scaleX,
    scaleY,
    breathScale,
    weightShiftX,
    blinkAmount,
    lookAtX,
    lookAtY,
    hairAngle1,
    hairAngle2,
    hairAngle3,
    scarfAngle,
    armGestureL,
    armGestureR,
    plankAngle,
    viseme,
    mouthOpen: openness,
    isSpeaking,
    actionCue,
  };
}
