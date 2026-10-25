import * as THREE from 'three';
export const createBeanState = ({ name, ai, p, mesh, color, human = 0 }) => ({
  name, ai, human, m: mesh, color, p: p.clone(), v: new THREE.Vector3(),
  alive: true, ground: false, cd: 0, coyote: 0, jumpBuffer: 0,
  target: null, targetT: 0, told: false, hazardCd: 0, combo: 0, comboT: 0,
  lastGround: false,
  // Analog feel: smoothed steer + brief stun/invuln for juice & forgiveness.
  steerX: 0, steerZ: 0, stunT: 0, invulnT: 0,
  // Death tumble watch (see own fall before result) + procedural motion hooks.
  fallingDeath: false, fallingDeathT: 0, tumbleSpin: null,
  leanPitch: 0, leanRoll: 0, bobT: 0,
  // AnimationMixer when skinned/clip GLBs land (Tripo handoff); null today.
  mixer: mesh?.userData?.mixer || null,
  actions: mesh?.userData?.actions || null
});
export const humanInputBindings = {
  1: { left: 'KeyA', right: 'KeyD', up: 'KeyW', down: 'KeyS', jump: 'Space', push: [localStorage.getItem('blockbean_push_key') || 'KeyE', 'KeyF', 'Mouse0'] },
  2: { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown', jump: 'Numpad1', push: ['Numpad0', 'Enter', 'ShiftLeft', 'Mouse1'] }
};
