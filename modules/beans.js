import * as THREE from 'three';
export const createBeanState = ({ name, ai, p, mesh, color, human = 0 }) => ({
  name, ai, human, m: mesh, color, p: p.clone(), v: new THREE.Vector3(),
  alive: true, ground: false, cd: 0, coyote: 0, jumpBuffer: 0,
  target: null, targetT: 0, told: false, hazardCd: 0, combo: 0, comboT: 0,
  lastGround: false
});
export const humanInputBindings = {
  1: { left: 'KeyA', right: 'KeyD', up: 'KeyW', down: 'KeyS', jump: 'Space', push: ['KeyE', 'KeyF', 'Mouse0'] },
  2: { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown', jump: 'Numpad1', push: ['Numpad0', 'Enter', 'ShiftLeft', 'Mouse1'] }
};
