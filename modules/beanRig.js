import * as THREE from 'three';

/** Stubby limb mesh for the code-side bean skeleton. */
function makeLimb({ color, radius = 0.11, length = 0.34, name }) {
  const geo = new THREE.CapsuleGeometry(radius, Math.max(0.01, length - radius * 2), 3, 6);
  geo.translate(0, -length * 0.5, 0); // pivot at top (shoulder / hip)
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.78,
    metalness: 0.04,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = name;
  mesh.castShadow = mesh.receiveShadow = true;
  const pivot = new THREE.Group();
  pivot.name = name + 'Pivot';
  pivot.add(mesh);
  pivot.userData.mesh = mesh;
  return pivot;
}

/**
 * Wrap an existing static visual (GLB group or capsule) in a code skeleton:
 *   tumble → hips → { torso(visual), armL, armR, legL, legR }
 * Animations (walk / push / fall) drive these Object3Ds — no skinned GLB required.
 */
export function attachBeanRig(root, visual, { color = 0x7ec8ff, hero = false } = {}) {
  const cream = hero ? 0xf5e6c8 : 0xffd7c2;
  const limbColor = cream;

  const tumble = new THREE.Group();
  tumble.name = 'tumble';
  const hips = new THREE.Group();
  hips.name = 'hips';
  const torso = new THREE.Group();
  torso.name = 'torso';

  if (visual.parent) visual.parent.remove(visual);
  torso.add(visual);

  // Approximate attachment points for a ~1.4-tall fitted bean.
  const armL = makeLimb({ color: limbColor, radius: 0.1, length: 0.36, name: 'armL' });
  const armR = makeLimb({ color: limbColor, radius: 0.1, length: 0.36, name: 'armR' });
  const legL = makeLimb({ color: limbColor, radius: 0.11, length: 0.38, name: 'legL' });
  const legR = makeLimb({ color: limbColor, radius: 0.11, length: 0.38, name: 'legR' });

  armL.position.set(-0.38, 0.95, 0.05);
  armR.position.set(0.38, 0.95, 0.05);
  legL.position.set(-0.16, 0.42, 0.02);
  legR.position.set(0.16, 0.42, 0.02);

  hips.add(torso, armL, armR, legL, legR);
  tumble.add(hips);
  root.add(tumble);

  const rig = {
    tumble,
    hips,
    torso,
    armL,
    armR,
    legL,
    legR,
    visual,
    clip: 'idle',
    phase: 0,
    pushT: 0,
    fallFlail: null,
  };
  root.userData.visual = torso; // lean / squash target (compat with death cam)
  root.userData.rig = rig;
  return rig;
}

export function triggerBeanPush(bean, duration = 0.38) {
  if (!bean) return;
  bean.pushAnimT = duration;
  const rig = bean.m?.userData?.rig;
  if (rig) {
    rig.clip = 'push';
    rig.pushT = duration;
  }
}

/**
 * Drive the code skeleton from bean physics state.
 * Skinned mixer clips (future Tripo drop-in) short-circuit limb posing but fall tumble still uses tumble root.
 */
export function updateBeanRig(b, dt, { reduceMotion = false } = {}) {
  const root = b?.m;
  const rig = root?.userData?.rig;
  if (!rig) return;

  if (b.fallingDeath) {
    updateFallRig(b, rig, dt, reduceMotion);
    return;
  }

  // Reset tumble root when alive.
  rig.tumble.rotation.set(0, 0, 0);
  if (rig.fallFlail) rig.fallFlail = null;

  if (b.mixer) {
    // Skinned path owns torso; keep hips level.
    rig.hips.position.y = 0;
    return;
  }

  if (reduceMotion) {
    resetLimbPose(rig);
    rig.torso.rotation.x = b.leanPitch || 0;
    rig.torso.rotation.z = b.leanRoll || 0;
    return;
  }

  const spd = Math.hypot(b.v.x, b.v.z);
  b.pushAnimT = Math.max(0, (b.pushAnimT || 0) - dt);
  if (b.pushAnimT > 0) {
    posePush(rig, 1 - b.pushAnimT / 0.38);
    rig.clip = 'push';
  } else if (b.ground && spd > 0.25) {
    poseWalk(b, rig, dt, spd);
    rig.clip = 'walk';
  } else {
    poseIdle(b, rig, dt, spd);
    rig.clip = b.ground ? 'idle' : 'air';
  }

  // Shared lean / bob (also mirrored onto bean lean* for tests).
  const targetPitch = b.ground ? clamp(spd * 0.035, 0, 0.28) : clamp(-b.v.y * 0.02, -0.35, 0.2);
  const targetRoll = clamp(-(b.steerX || 0) * 0.28, -0.32, 0.32);
  b.leanPitch += (targetPitch - b.leanPitch) * Math.min(1, 12 * dt);
  b.leanRoll += (targetRoll - b.leanRoll) * Math.min(1, 12 * dt);
  b.bobT = (b.bobT || 0) + dt * (5 + spd * 2.5);
  const bob = (b.ground && spd > 0.25) ? Math.sin(b.bobT) * 0.05 : 0;
  rig.hips.position.y = bob;
  rig.torso.rotation.x = b.leanPitch + (rig.clip === 'push' ? -0.35 : 0);
  rig.torso.rotation.z = b.leanRoll;
  const sy = 1 - bob * 0.55 + (b.ground ? 0 : Math.min(0.18, Math.abs(b.v.y) * 0.012));
  const s = 1 / Math.sqrt(Math.max(0.75, sy));
  rig.torso.scale.set(s, sy, s);
}

function updateFallRig(b, rig, dt, reduceMotion) {
  if (!rig.fallFlail) {
    rig.fallFlail = {
      armL: (Math.random() > 0.5 ? 1 : -1) * (8 + Math.random() * 6),
      armR: (Math.random() > 0.5 ? 1 : -1) * (8 + Math.random() * 6),
      legL: (Math.random() > 0.5 ? 1 : -1) * (6 + Math.random() * 5),
      legR: (Math.random() > 0.5 ? 1 : -1) * (6 + Math.random() * 5),
    };
    rig.clip = 'fall';
  }
  // World tumble on tumble root (death watch cam follows root position; visual spins here).
  if (b.tumbleSpin && !reduceMotion) {
    rig.tumble.rotation.x += b.tumbleSpin.x * dt;
    rig.tumble.rotation.y += b.tumbleSpin.y * dt;
    rig.tumble.rotation.z += b.tumbleSpin.z * dt;
  }
  const stretch = 1 + Math.min(0.4, Math.abs(b.v.y) * 0.018);
  const sx = 1 / Math.sqrt(stretch);
  rig.torso.scale.set(sx, stretch, sx);
  if (!reduceMotion && rig.fallFlail) {
    const f = rig.fallFlail;
    rig.armL.rotation.x += f.armL * dt;
    rig.armR.rotation.x += f.armR * dt;
    rig.legL.rotation.x += f.legL * dt;
    rig.legR.rotation.x += f.legR * dt;
    rig.armL.rotation.z = Math.sin((b.fallingDeathT || 0) * 14) * 0.6;
    rig.armR.rotation.z = -Math.sin((b.fallingDeathT || 0) * 12) * 0.6;
  }
}

function poseWalk(b, rig, dt, spd) {
  softToward(rig.hips.position, 'z', 0, dt * 12);
  softToward(rig.hips.position, 'x', 0, dt * 12);
  rig.phase = (rig.phase || 0) + dt * (6.5 + spd * 1.8);
  const swing = Math.sin(rig.phase) * Math.min(0.85, 0.35 + spd * 0.08);
  const swingOpp = -swing;
  softToward(rig.armL.rotation, 'x', swing, dt * 14);
  softToward(rig.armR.rotation, 'x', swingOpp, dt * 14);
  softToward(rig.legL.rotation, 'x', swingOpp * 1.05, dt * 14);
  softToward(rig.legR.rotation, 'x', swing * 1.05, dt * 14);
  softToward(rig.armL.rotation, 'z', 0.12, dt * 10);
  softToward(rig.armR.rotation, 'z', -0.12, dt * 10);
  softToward(rig.torso.rotation, 'y', Math.sin(rig.phase) * 0.08, dt * 10);
}

function poseIdle(b, rig, dt) {
  softToward(rig.hips.position, 'z', 0, dt * 10);
  softToward(rig.hips.position, 'x', 0, dt * 10);
  softToward(rig.torso.rotation, 'y', 0, dt * 8);
  rig.phase = (rig.phase || 0) + dt * 2.2;
  const breathe = Math.sin(rig.phase) * 0.04;
  softToward(rig.armL.rotation, 'x', 0.15 + breathe, dt * 8);
  softToward(rig.armR.rotation, 'x', 0.15 - breathe, dt * 8);
  softToward(rig.legL.rotation, 'x', 0.05, dt * 8);
  softToward(rig.legR.rotation, 'x', 0.05, dt * 8);
  softToward(rig.armL.rotation, 'z', 0.18, dt * 8);
  softToward(rig.armR.rotation, 'z', -0.18, dt * 8);
}

function posePush(rig, t01) {
  // Wind-up then lunge: arms forward, torso tips.
  const wind = Math.sin(Math.min(1, t01) * Math.PI);
  rig.armL.rotation.x = -0.9 * wind;
  rig.armR.rotation.x = -1.1 * wind;
  softToward(rig.armL.rotation, 'z', 0.05, 1);
  softToward(rig.armR.rotation, 'z', -0.05, 1);
  rig.legL.rotation.x = 0.25 * wind;
  softToward(rig.legR.rotation, 'x', -0.15 * wind, 1);
  rig.torso.rotation.y = 0.12 * wind;
  rig.hips.position.z = 0.12 * wind;
}

function resetLimbPose(rig) {
  for (const part of [rig.armL, rig.armR, rig.legL, rig.legR]) {
    part.rotation.set(0, 0, 0);
  }
  softToward(rig.hips.position, 'y', 0, 1);
  softToward(rig.hips.position, 'z', 0, 1);
  rig.torso.rotation.y = 0;
  softToward(rig.torso.scale, 'x', 1, 1);
  softToward(rig.torso.scale, 'y', 1, 1);
  softToward(rig.torso.scale, 'z', 1, 1);
}

function softToward(obj, key, target, rate) {
  obj[key] += (target - obj[key]) * Math.min(1, rate);
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}
