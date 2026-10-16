import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const PLAY_URL = 'https://blockbean-collapse.vercel.app';
const __va = (name, data = {}) => {
  try { window.va && window.va('event', { name, data }); } catch (_) {}
};
const $ = id => document.getElementById(id);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 30, 90);
const cam = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 220);
scene.add(new THREE.HemisphereLight(0xffffff, 0x446688, 1.25));
const sun = new THREE.DirectionalLight(0xffffff, 1.55);
sun.position.set(10, 22, 8);
sun.castShadow = true;
Object.assign(sun.shadow.camera, { left: -25, right: 25, top: 25, bottom: -25 });
scene.add(sun);

addEventListener('resize', () => {
  cam.aspect = innerWidth / innerHeight;
  cam.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

const A = {};
const manager = new THREE.LoadingManager();
manager.onProgress = (_url, loaded, total) => {
  const pct = total ? Math.round(100 * loaded / total) : 0;
  if ($('loadbar')) $('loadbar').style.width = pct + '%';
  if ($('load')) $('load').textContent = \`加载模型中… \${pct}% (\${loaded}/\${total})\`;
};
manager.onError = url => console.warn('Load error', url);
const loader = new GLTFLoader(manager);
const loadAsset = name => loader.loadAsync(\`assets/\${name}/model.glb\`)
  .then(g => { A[name] = g.scene; })
  .catch(err => console.warn(\`GLB fail: \${name}\`, err));

await Promise.all(['hero', 'rival', 'spikebox'].map(loadAsset));
if ($('loadbar')) $('loadbar').style.width = '100%';
if ($('load')) $('load').textContent = Object.keys(A).length === 3
  ? '模型就绪 ✔'
  : '部分模型加载失败，使用方块替代';
if ($('start')) $('start').disabled = false;
__va('game_load_ready', { loaded_assets: Object.keys(A).length });

const T = 2;
const GRID = 8;
const TILE_H = 0.6;
const TILE_TOP = 0;
const tileGeometry = new THREE.BoxGeometry(T * 0.96, TILE_H, T * 0.96);
const tileMaterial = new THREE.MeshStandardMaterial({
  color: 0x6bbf3b, roughness: 0.82, metalness: 0.02,
  emissive: 0x000000, emissiveIntensity: 0
});
const tileMesh = new THREE.InstancedMesh(tileGeometry, tileMaterial, GRID * GRID);
tileMesh.castShadow = true;
tileMesh.receiveShadow = true;
tileMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
scene.add(tileMesh);

const tiles = [];
for (let i = 0; i < GRID; i++) {
  for (let j = 0; j < GRID; j++) {
    const x = (i - GRID / 2 + 0.5) * T;
    const z = (j - GRID / 2 + 0.5) * T;
    const ring = Math.max(Math.abs(i - 3.5), Math.abs(j - 3.5));
    tiles.push({ i, j, x, z, y: TILE_TOP - TILE_H / 2, st: 'ok', t: 0, vy: 0,
      crackAt: 4 + (ring - 1) * 2.2 + Math.random() * 5 });
  }
const tileDummy = new THREE.Object3D();
const tileColor = new THREE.Color();
const solidColor = new THREE.Color(0x6bbf3b);
const warnColor = new THREE.Color(0xff7b28);
const goneColor = new THREE.Color(0x111827);
function writeTile(index) {
  const t = tiles[index];
  const scale = t.st === 'gone' ? 0 : 1;
  tileDummy.position.set(t.x + (t.st === 'crack' ? (Math.random() - 0.5) * 0.12 : 0), t.y, t.z);
  tileDummy.scale.set(scale, scale, scale);
  tileDummy.updateMatrix();
  tileMesh.setMatrixAt(index, tileDummy.matrix);
  tileColor.copy(t.st === 'crack' || t.st === 'fall' ? warnColor : t.st === 'gone' ? goneColor : solidColor);
  tileMesh.setColorAt(index, tileColor);
}
tiles.forEach((_, i) => writeTile(i));
tileMesh.instanceMatrix.needsUpdate = true;
tileMesh.instanceColor.needsUpdate = true;

function cloneFitted(source, size = 1.4, color) {
  if (!source) return null;
  const obj = source.clone(true);
  const bounds = new THREE.Box3().setFromObject(obj);
  const dims = bounds.getSize(new THREE.Vector3());
  obj.scale.setScalar(size / Math.max(dims.x, dims.y, dims.z));
  const fitted = new THREE.Group();
  fitted.add(obj);
  const b = new THREE.Box3().setFromObject(fitted);
  const c = b.getCenter(new THREE.Vector3());
  fitted.position.sub(c);
  fitted.position.y += -b.min.y;
  fitted.traverse(node => {
    if (!node.isMesh) return;
    node.castShadow = node.receiveShadow = true;
    if (color !== undefined) {
      node.material = node.material.clone();
      if (node.material.color) node.material.color.lerp(new THREE.Color(color), 0.45);
    }
  });
  return fitted;
}
const HeroProto = cloneFitted(A.hero, 1.4);
const RivalProto = cloneFitted(A.rival, 1.4, 0xff795f);
const SpikeProto = cloneFitted(A.spikebox, 1.5);

function makeBean(isHero, color) {
  const visual = cloneFitted(isHero ? A.hero : A.rival, 1.4, isHero ? undefined : color);
  const group = visual || new THREE.Mesh(
    new THREE.CapsuleGeometry(0.42, 0.62, 4, 8),
    new THREE.MeshStandardMaterial({ color })
  );
  if (!visual) group.geometry.translate(0, 0.72, 0);
  const root = new THREE.Group();
  root.add(group);
  return root;
}
function makeSpike() {
  const visual = SpikeProto ? SpikeProto.clone(true) : new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 1.4, 1.4),
    new THREE.MeshStandardMaterial({ color: 0xf5c542, roughness: 0.65 })
  );
  if (!SpikeProto) visual.geometry.translate(0, 0.7, 0);
  return visual;
}

let beans = [];
let spike = null;
let timer = 60;
let state = 'menu';
let countdown = 3;
let points = {};
let roundStart = 0;
let msgT = 0;
let cameraPunch = 0;
let spectating = false;
let followIndex = 0;
let muted = false;
let audio = null;
const keys = {};
const touch = { x: 0, z: 0, jump: false, push: false };
let mousePush = false;

function unlockAudio() {
  if (!audio) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    audio = new Ctx();
  }
  if (audio.state === 'suspended') audio.resume();
  __va('audio_unlock', {});
}
function tone(freq, duration = 0.08, type = 'sine', gain = 0.045) {
  if (muted || !audio) return;
  const osc = audio.createOscillator();
  const amp = audio.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  amp.gain.setValueAtTime(gain, audio.currentTime);
  amp.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
  osc.connect(amp).connect(audio.destination);
  osc.start();
  osc.stop(audio.currentTime + duration);
}
function noise(duration = 0.12, gain = 0.05) {
  if (muted || !audio) return;
  const buffer = audio.createBuffer(1, audio.sampleRate * duration, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = audio.createBufferSource();
  const amp = audio.createGain();
  amp.gain.value = gain;
  src.buffer = buffer;
  src.connect(amp).connect(audio.destination);
  src.start();
}
function playSfx(kind) {
  if (kind === 'warn') tone(180, 0.09, 'square', 0.03);
  if (kind === 'fall') { tone(90, 0.18, 'sawtooth', 0.04); noise(0.08, 0.025); }
  if (kind === 'push') { tone(420, 0.07, 'triangle', 0.045); tone(620, 0.05, 'triangle', 0.025); }
  if (kind === 'win') { tone(520, 0.12, 'triangle', 0.04); setTimeout(() => tone(780, 0.18, 'triangle', 0.04), 80); }
  if (kind === 'out') { tone(150, 0.24, 'sawtooth', 0.04); noise(0.1, 0.02); }
}

const particles = [];
function burst(pos, color = 0xffdd55, count = 12) {
  for (let i = 0; i < count; i++) {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.055 + Math.random() * 0.05, 5, 5),
      new THREE.MeshBasicMaterial({ color, transparent: true })
    );
    m.position.copy(pos);
    scene.add(m);
    particles.push({ m, v: new THREE.Vector3((Math.random() - 0.5) * 5, Math.random() * 4, (Math.random() - 0.5) * 5), t: 0.45 + Math.random() * 0.3 });
  }
}
function flash(text, duration = 1.2) {
  if ($('msg')) $('msg').textContent = text;
  msgT = duration;
}
function punch(amount = 0.18) { cameraPunch = Math.max(cameraPunch, amount); }

function reset() {
  for (const b of beans) scene.remove(b.m);
  if (spike) scene.remove(spike.m);
  beans = [];
  points = {};
  particles.splice(0).forEach(p => scene.remove(p.m));
  for (const [i, t] of tiles.entries()) {
    t.st = 'ok'; t.t = 0; t.vy = 0; t.y = TILE_TOP - TILE_H / 2;
    t.crackAt = 999;
    writeTile(i);
  }
  const collapseOrder = [...tiles].sort((a, b) => {
    const ar = Math.max(Math.abs(a.i - 3.5), Math.abs(a.j - 3.5));
    const br = Math.max(Math.abs(b.i - 3.5), Math.abs(b.j - 3.5));
    return br - ar || Math.random() - 0.5;
  });
  collapseOrder.forEach((t, index) => { t.crackAt = 1.4 + index * 0.85 + Math.random() * 0.35; });
  const count = 6 + Math.floor(Math.random() * 3);
  const colors = [0xff5555, 0x55aaff, 0xffdd33, 0xaa66ff, 0xff9933, 0x33ddaa, 0xff66cc, 0xc084fc];
  for (let k = 0; k < count; k++) {
    const angle = k / count * Math.PI * 2;
    const m = makeBean(k === 0, colors[k % colors.length]);
    const b = {
      m, p: new THREE.Vector3(Math.cos(angle) * 5, 3, Math.sin(angle) * 5),
      v: new THREE.Vector3(), ai: k > 0, alive: true, ground: false, cd: 0,
      coyote: 0, jumpBuffer: 0, target: null, targetT: 0, name: k ? \`Bot\${k}\` : '你',
      told: false, hazardCd: 0
    };
    m.position.copy(b.p);
    scene.add(m);
    beans.push(b);
    points[b.name] = 0;
  }
  const sm = makeSpike();
  spike = { m: sm, a: 0 };
  sm.position.set(0, TILE_TOP + 0.05, 0);
  scene.add(sm);
  timer = 60;
  countdown = 3;
  state = 'count';
  spectating = false;
  followIndex = 0;
  if ($('result')) $('result').hidden = true;
  flash('3', 1);
  unlockAudio();
  __va('round_reset', {});
}
function tileAt(x, z) {
  const i = Math.floor(x / T + GRID / 2);
  const j = Math.floor(z / T + GRID / 2);
  return i >= 0 && j >= 0 && i < GRID && j < GRID ? tiles[i * GRID + j] : null;
}
function supportingTile(b) {
  const half = 0.52;
  let best = null;
  for (const t of tiles) {
    if (t.st === 'gone' || t.st === 'fall') continue;
    if (Math.abs(b.p.x - t.x) <= T / 2 + half && Math.abs(b.p.z - t.z) <= T / 2 + half) {
      const top = t.y + TILE_H / 2;
      if (!best || top > best.top) best = { t, top };
    }
  }
  return best;
}
function chooseTarget(b) {
  const aliveTiles = tiles.filter(t => t.st === 'ok');
  if (!aliveTiles.length) return null;
  const danger = spike.m.position;
  const ranked = aliveTiles.map(t => {
    const dist = Math.hypot(t.x - b.p.x, t.z - b.p.z);
    const spikeDist = Math.hypot(t.x - danger.x, t.z - danger.z);
    const edge = Math.max(Math.abs(t.x), Math.abs(t.z));
    return { t, score: dist * 0.5 + (spikeDist < 3.2 ? 8 : 0) + edge * 0.2 + Math.random() * 2 };
  }).sort((a, c) => a.score - c.score);
  return ranked[0].t;
}
function inputFor(b) {
  if (!b.ai) {
    const mx = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0) + touch.x;
    const mz = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0) + touch.z;
    return { mx, mz, jump: keys.Space || touch.jump, push: keys.KeyE || keys.KeyF || mousePush || touch.push };
  }
  b.targetT -= frameDt;
  if (b.targetT <= 0 || !b.target || b.target.st !== 'ok') {
    b.target = chooseTarget(b);
    b.targetT = 0.6 + Math.random() * 1.2;
  }
  let tx = b.target?.x ?? 0;
  let tz = b.target?.z ?? 0;
  const nearby = beans.find(o => o !== b && o.alive && o.p.distanceTo(b.p) < 1.8);
  const nearEdge = Math.max(Math.abs(b.p.x), Math.abs(b.p.z)) > 6.2;
  let push = false;
  if (nearby && nearEdge) { tx = nearby.p.x; tz = nearby.p.z; push = true; }
  const fromSpike = b.p.clone().sub(spike.m.position);
  if (fromSpike.y = 0, fromSpike.length() < 3.3) { tx = b.p.x + fromSpike.x * 2; tz = b.p.z + fromSpike.z * 2; }
  const dx = tx - b.p.x;
  const dz = tz - b.p.z;
  const len = Math.hypot(dx, dz) || 1;
  const ahead = tileAt(b.p.x + dx / len * 1.2, b.p.z + dz / len * 1.2);
  const jump = b.ground && (!ahead || ahead.st !== 'ok');
  return { mx: dx / len, mz: dz / len, jump, push };
}
function pushBean(b) {
  const f = new THREE.Vector3(Math.sin(b.m.rotation.y), 0, Math.cos(b.m.rotation.y));
  for (const o of beans) {
    if (o === b || !o.alive) continue;
    const delta = o.p.clone().sub(b.p);
    if (delta.y = 0, delta.length() < 2.0 && delta.normalize().dot(f) > 0.15) {
      o.v.addScaledVector(delta, 12);
      o.v.y = Math.max(o.v.y, 4);
      if (!b.ai) points[b.name] += 1;
      burst(o.p.clone().add(new THREE.Vector3(0, 0.7, 0)), 0xffe066, 16);
      punch(0.22);
      playSfx('push');
      __va('push_hit', { player: b.name, target: o.name });
    }
  }
}
function control(b, dt) {
  const input = inputFor(b);
  const len = Math.hypot(input.mx, input.mz) || 1;
  const speed = 6;
  const accel = b.ground ? 12 : 4;
  const ax = input.mx / len * speed;
  const az = input.mz / len * speed;
  b.v.x += (ax - b.v.x) * Math.min(1, accel * dt);
  b.v.z += (az - b.v.z) * Math.min(1, accel * dt);
  if (input.mx || input.mz) b.m.rotation.y = Math.atan2(input.mx, input.mz);
  if (input.jump) b.jumpBuffer = 0.14;
  if (b.jumpBuffer > 0) b.jumpBuffer -= dt;
  if (b.coyote > 0) b.coyote -= dt;
  if (b.jumpBuffer > 0 && (b.ground || b.coyote > 0)) {
    b.v.y = 8;
    b.ground = false;
    b.coyote = 0;
    b.jumpBuffer = 0;
    tone(340, 0.06, 'triangle', 0.025);
  }
  b.cd -= dt;
  if (input.push && b.cd <= 0) {
    b.cd = 0.8;
    pushBean(b);
    b.m.scale.setScalar(1.2);
    setTimeout(() => b.m.scale.setScalar(1), 120);
  }
}
function physics(b, dt) {
  const wasGround = b.ground;
  b.v.y -= 22 * dt;
  b.p.addScaledVector(b.v, dt);
  const support = b.v.y <= 0 ? supportingTile(b) : null;
  b.ground = false;
  if (support && b.p.y <= support.top + 0.9 && b.p.y >= support.top - 1.6) {
    b.p.y = support.top;
    b.v.y = Math.max(0, b.v.y);
    b.ground = true;
  }
  if (wasGround && !b.ground) b.coyote = 0.14;
  if (b.p.y < -15) {
    b.alive = false;
    scene.remove(b.m);
    if (!b.ai) {
      spectating = true;
      flash('你出局了！观战中', 2);
      playSfx('out');
      __va('player_eliminated', { survival_s: Math.round((performance.now() - roundStart) / 1000), cause: 'fell' });
    } else {
      flash(\`\${b.name} 出局！\`, 0.8);
    }
  }
  b.m.position.copy(b.p);
}
function endRound() {
  const alive = beans.filter(b => b.alive);
  alive.forEach(b => points[b.name] += 10);
  const winner = alive.length === 1 ? alive[0].name : alive.sort((a, c) => points[c.name] - points[a.name])[0]?.name || '无人';
  const meScore = points['你'] || 0;
  state = 'over';
  const won = winner === '你';
  playSfx(won ? 'win' : 'out');
  punch(0.35);
  flash(won ? '🏆 你赢了！' : '你出局了！', 999);
  if ($('result')) {
    $('resultTitle').textContent = won ? '🏆 你赢了！' : '你出局了！';
    $('resultDetail').textContent = \`获胜者：\${winner} · 推人分：\${meScore} · 存活：\${alive.length}/\${beans.length}\`;
    $('shareText').value = \`我在《方块豆人：塌了就出局》拿了 \${meScore} 推人分，\${won ? '最后一豆称王！' : '差一点就赢了！'} \${PLAY_URL}\`;
    $('result').hidden = false;
  }
  __va('round_end', { result: won ? 'win' : 'lose', winner, push_score: meScore, alive: alive.length });
}
function cycleSpectator() {
  const live = beans.filter(b => b.alive);
  if (!live.length) return;
  followIndex = (followIndex + 1) % live.length;
  const target = live[followIndex];
  if ($('spectateLabel')) $('spectateLabel').textContent = \`观战：\${target.name}\`;
  __va('spectate_switch', { target: target.name });
}
function bindTouch() {
  const zone = $('stickZone');
  const knob = $('stickKnob');
  if (!zone || !knob) return;
  let active = false;
  const move = e => {
    if (!active) return;
    const r = zone.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dz = e.clientY - (r.top + r.height / 2);
    const max = r.width * 0.34;
    const x = Math.max(-1, Math.min(1, dx / max));
    const z = Math.max(-1, Math.min(1, dz / max));
    touch.x = x; touch.z = z;
    knob.style.transform = \`translate(\${x * max}px,\${z * max}px)\`;
  };
  const end = () => { active = false; touch.x = touch.z = 0; knob.style.transform = 'translate(0,0)'; };
  zone.addEventListener('pointerdown', e => { active = true; zone.setPointerCapture(e.pointerId); move(e); });
  zone.addEventListener('pointermove', move);
  zone.addEventListener('pointerup', end);
  zone.addEventListener('pointercancel', end);
  $('jumpBtn')?.addEventListener('pointerdown', e => { e.preventDefault(); touch.jump = true; });
  $('jumpBtn')?.addEventListener('pointerup', () => { touch.jump = false; });
  $('jumpBtn')?.addEventListener('pointercancel', () => { touch.jump = false; });
  $('pushBtn')?.addEventListener('pointerdown', e => { e.preventDefault(); touch.push = true; });
  $('pushBtn')?.addEventListener('pointerup', () => { touch.push = false; });
  $('pushBtn')?.addEventListener('pointercancel', () => { touch.push = false; });
  $('spectateBtn')?.addEventListener('click', cycleSpectator);
  $('muteBtn')?.addEventListener('click', () => {
    muted = !muted;
    $('muteBtn').textContent = muted ? '🔇 静音' : '🔊 音效';
  });
}
bindTouch();

addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'Space') e.preventDefault();
  if (e.code === 'Tab' && spectating) { e.preventDefault(); cycleSpectator(); }
  if (e.code === 'KeyR' && state === 'over') reset();
  unlockAudio();
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('mousedown', e => { if (e.button === 0) { mousePush = true; unlockAudio(); } });
addEventListener('mouseup', e => { if (e.button === 0) mousePush = false; });
$('start')?.addEventListener('click', () => { $('splash')?.remove(); reset(); });
$('replayBtn')?.addEventListener('click', reset);
$('copyBtn')?.addEventListener('click', async () => {
  const text = $('shareText')?.value || PLAY_URL;
  try {
    await navigator.clipboard.writeText(text);
    $('copyBtn').textContent = '已复制 ✓';
    setTimeout(() => $('copyBtn').textContent = '复制分享文案', 1400);
    __va('share_copy', {});
  } catch (_) { if ($('shareText')) $('shareText').select(); }
});
$('shareText')?.addEventListener('click', e => e.target.select());

let frameDt = 0.016;
const clock = new THREE.Clock();
function loop() {
  requestAnimationFrame(loop);
  frameDt = Math.min(clock.getDelta(), 0.05);
  const dt = frameDt;
  if (msgT > 0) { msgT -= dt; if (msgT <= 0 && state !== 'over' && $('msg')) $('msg').textContent = ''; }
  if (state === 'count') {
    countdown -= dt;
    if ($('msg')) $('msg').textContent = countdown > 0 ? Math.ceil(countdown) : 'GO!';
    beans.forEach(b => physics(b, dt));
    if (countdown <= 0) {
      state = 'play';
      roundStart = performance.now();
      flash('GO!', 0.5);
      __va('game_start', { players: beans.length });
    }
  } else if (state === 'play' || state === 'over') {
    if (state === 'play') timer -= dt;
    const elapsed = 60 - timer;
    const aliveTiles = tiles.filter(t => t.st === 'ok' || t.st === 'crack');
    const sudden = aliveTiles.length <= 4;
    let warningStarted = false;
    const scheduled = sudden
      ? tiles.filter(t => t.st === 'ok').sort((a, b) => Math.max(Math.abs(a.x), Math.abs(a.z)) - Math.max(Math.abs(b.x), Math.abs(b.z)))
      : tiles.filter(t => t.st === 'ok' && elapsed >= t.crackAt);
    for (const [i, t] of tiles.entries()) {
      if (t.st === 'ok' && !warningStarted && scheduled[0] === t) {
        t.st = 'crack';
        t.t = sudden ? 0.55 : 1.05;
        warningStarted = true;
        writeTile(i);
        burst(new THREE.Vector3(t.x, TILE_TOP + 0.35, t.z), 0xff7b28, 8);
        punch(sudden ? 0.23 : 0.12);
        playSfx('warn');
        __va('tile_warn', { tile: i, sudden });
      } else if (t.st === 'crack') {
        t.t -= dt;
        if (t.t <= 0) {
          t.st = 'fall';
          t.vy = 0;
          writeTile(i);
          punch(sudden ? 0.3 : 0.16);
          playSfx('fall');
          burst(new THREE.Vector3(t.x, TILE_TOP, t.z), 0xffaa44, 12);
          __va('tile_fall', { tile: i });
        } else writeTile(i);
      } else if (t.st === 'fall') {
        t.vy -= 20 * dt;
        t.y += t.vy * dt;
        if (t.y < -30) { t.st = 'gone'; t.y = TILE_TOP - TILE_H / 2; }
        writeTile(i);
      }
    }
    spike.a += dt * (sudden ? 1.15 : 0.7);
    spike.m.position.set(Math.cos(spike.a) * 6, TILE_TOP + 0.05, Math.sin(spike.a * 1.3) * 6);
    spike.m.rotation.y += dt * 2;
    beans.forEach(b => {
      if (!b.alive) return;
      control(b, dt);
      physics(b, dt);
      const d = b.p.clone().sub(spike.m.position);
      d.y = 0;
      b.hazardCd = Math.max(0, b.hazardCd - dt);
      if (d.length() < 1.3 && b.p.y < TILE_TOP + 1.6 && b.hazardCd <= 0) {
        b.v.addScaledVector(d.normalize(), 14);
        b.v.y = Math.max(b.v.y, 6);
        b.hazardCd = 0.8;
        punch(0.12);
        tone(110, 0.1, 'square', 0.025);
      }
    });
    if (state === 'play') {
      const alive = beans.filter(b => b.alive);
      if (alive.length <= 1 || timer <= 0) endRound();
      if (!beans[0].alive && !beans[0].told) { beans[0].told = true; spectating = true; }
    }
  }
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.t -= dt; p.v.y -= 10 * dt; p.m.position.addScaledVector(p.v, dt);
    p.m.material.opacity = Math.max(0, p.t / 0.7);
    if (p.t <= 0) { scene.remove(p.m); particles.splice(i, 1); }
  }
  const live = beans.filter(b => b.alive);
  let target = beans[0];
  if (spectating && live.length) target = live[followIndex % live.length];
  const focus = target?.p || new THREE.Vector3();
  const desired = new THREE.Vector3(focus.x, focus.y + 9, focus.z + 11);
  const shake = cameraPunch > 0 ? new THREE.Vector3((Math.random() - 0.5) * cameraPunch, (Math.random() - 0.5) * cameraPunch, 0) : new THREE.Vector3();
  cam.position.lerp(desired.add(shake), 0.12);
  cam.lookAt(focus.x, focus.y, focus.z);
  cameraPunch = Math.max(0, cameraPunch - dt * 1.7);
  if ($('hud')) {
    const spectateText = spectating && target ? \` · 观战：\${target.name}（Tab/按钮切换）\` : '';
    $('hud').innerHTML = state === 'menu' ? '' : \`⏱ \${Math.max(0, timer).toFixed(0)}s · 存活 \${live.length}/\${beans.length} · 推人分 \${points['你'] || 0}\${spectateText}<br><small>WASD 移动 · Space 跳 · E 推 · R 重开</small>\`;
  }
  renderer.render(scene, cam);
}
window.__game = { get state() { return state; }, get beans() { return beans; }, get tiles() { return tiles; } };
loop();
