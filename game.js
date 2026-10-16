import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clamp, tileOverlapsFoot, collapseDelay } from './modules/arena.js';
import { createBeanState, humanInputBindings } from './modules/beans.js';
import { createInputState, readPlayerInput } from './modules/input.js';
import { formatShareText, randomRoast, setText } from './modules/ui.js';

const PLAY_URL = 'https://blockbean-collapse.vercel.app';
const VERSION = '1.1.0';
const BALANCE = {
  push: {
    easy: { force: 9, cooldown: 1.05 },
    default: { force: 12, cooldown: 0.8 },
    spicy: { force: 16, cooldown: 0.58 }
  },
  pace: { 'slow-rush': 1, steady: 0.78 },
  ai: { calm: 0.45, default: 0.78, aggressive: 1.15 },
  roundSeconds: [30, 45, 60]
};
const LOCAL_FLAGS = { maintenance: false, forceFallbackAssets: false, remoteFlagsUrl: './flags.json' };
const MAPS = {
  classic: { name: 'Classic', hidden: () => false },
  pit: { name: 'Center pit', hidden: t => Math.abs(t.i - 3.5) < 1.1 && Math.abs(t.j - 3.5) < 1.1 },
  ring: { name: 'Ring', hidden: t => (t.i + t.j) % 2 === 0 && Math.max(Math.abs(t.i - 3.5), Math.abs(t.j - 3.5)) > 2.5 }
};
const THEMES = {
  grass: { tile: 0x6bbf3b, warn: 0xffa62b, sky: 0x87ceeb, fog: 0x87ceeb },
  ice: { tile: 0xa7d8f0, warn: 0xffb703, sky: 0xbde0fe, fog: 0x8ecae6 },
  neon: { tile: 0x3a86ff, warn: 0xff006e, sky: 0x10132f, fog: 0x15183d }
};
const __va = (name, data = {}) => {
  try { window.va && window.va('event', { name, data }); } catch (_) {}
};
const $ = id => document.getElementById(id);
addEventListener('error', e => __va('client_error', { message: String(e.message || 'error').slice(0, 120) }));
const showFallback = message => {
  setText($('fallbackText'), message);
  if ($('fallback')) $('fallback').hidden = false;
  if ($('start')) $('start').disabled = true;
  __va('runtime_fallback', { reason: String(message).slice(0, 120) });
};
let renderer = null;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  if (renderer) renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);
} catch (err) {
  showFallback('当前浏览器没有可用的 WebGL，已进入可读回退页。请开启硬件加速后再试。');
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 30, 90);
const baseFov = 60;
const cam = new THREE.PerspectiveCamera(baseFov, innerWidth / innerHeight, 0.1, 220);
scene.add(new THREE.HemisphereLight(0xffffff, 0x446688, 1.25));
const sun = new THREE.DirectionalLight(0xffffff, 1.55);
sun.position.set(10, 22, 8);
sun.castShadow = true;
Object.assign(sun.shadow.camera, { left: -25, right: 25, top: 25, bottom: -25 });
scene.add(sun);

addEventListener('resize', () => {
  cam.aspect = innerWidth / innerHeight;
  cam.updateProjectionMatrix();
  if (renderer) renderer.setSize(innerWidth, innerHeight);
});

const A = {};
let flags = { ...LOCAL_FLAGS };
async function loadFlags() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1200);
    const response = await fetch(LOCAL_FLAGS.remoteFlagsUrl, { cache: 'no-store', signal: controller.signal });
    clearTimeout(timeout);
    if (response.ok) flags = { ...flags, ...(await response.json()) };
  } catch (_) {
    __va('flags_fallback', { source: 'local' });
  }
  if (flags.maintenance) {
    const node = $('maintenance');
    if (node) { node.textContent = flags.maintenanceMessage || '维护提示：当前为安全演示模式。'; node.classList.add('show'); }
  }
  if (flags.forceFallbackAssets) __va('asset_kill_switch', { enabled: true });
}
await loadFlags();
const manager = new THREE.LoadingManager();
manager.onProgress = (_url, loaded, total) => {
  const pct = total ? Math.round(100 * loaded / total) : 0;
  if ($('loadbar')) {
    $('loadbar').style.width = pct + '%';
    $('loadbar').setAttribute('aria-valuenow', String(pct));
  }
  if ($('load')) $('load').textContent = `加载模型中… ${pct}% (${loaded}/${total})`;
};
manager.onError = url => { console.warn('Load error', url); setText($('load'), '部分模型加载失败，使用方块替代'); __va('asset_error', { url }); };
const loader = new GLTFLoader(manager);
const loadAsset = name => flags.forceFallbackAssets ? Promise.resolve(null) : loader.loadAsync('assets/' + name + '/model.glb')
  .then(g => { A[name] = g.scene; return g.scene; })
  .catch(err => { console.warn('GLB fail: ' + name, err); __va('asset_error', { asset: name }); return null; });
await Promise.all(['hero', 'tile', 'spikebox'].map(loadAsset));
if ($('loadbar')) {
  $('loadbar').style.width = '100%';
  $('loadbar').setAttribute('aria-valuenow', '100');
}
if ($('load')) $('load').textContent = Object.keys(A).length >= 1 ? '关键模型就绪 ✔' : '模型缺失，使用方块替代';
if ($('start') && renderer) $('start').disabled = false;
__va('game_load_ready', { loaded_assets: Object.keys(A).length });

const T = 2;
const GRID = 8;
const TILE_H = 0.6;
const TILE_TOP = 0;
function tileMeshParts() {
  const source = A.tile?.getObjectByProperty('isMesh', true);
  if (!source?.geometry) {
    return {
      geometry: new THREE.BoxGeometry(T * 0.96, TILE_H, T * 0.96),
      material: new THREE.MeshStandardMaterial({
        color: 0x6bbf3b, roughness: 0.82, metalness: 0.02,
        emissive: 0x000000, emissiveIntensity: 0,
        vertexColors: true
      })
    };
  }
  const geometry = source.geometry.clone();
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox;
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  geometry.translate(-center.x, -center.y, -center.z);
  geometry.scale(
    size.x ? (T * 0.96) / size.x : 1,
    size.y ? TILE_H / size.y : 1,
    size.z ? (T * 0.96) / size.z : 1
  );
  const material = Array.isArray(source.material)
    ? source.material[0].clone()
    : source.material.clone();
  material.vertexColors = true;
  return { geometry, material };
}
const { geometry: tileGeometry, material: tileMaterial } = tileMeshParts();
tileMaterial.color ||= new THREE.Color(0x6bbf3b);
tileMaterial.roughness = tileMaterial.roughness ?? 0.82;
tileMaterial.metalness = tileMaterial.metalness ?? 0.02;
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
}
const tileDummy = new THREE.Object3D();
const tileColor = new THREE.Color();
const solidColor = new THREE.Color(0x6bbf3b);
const warnColor = new THREE.Color(0xffa62b);
const goneColor = new THREE.Color(0x111827);
let theme = localStorage.getItem('blockbean_theme') || 'grass';
let mapVariant = localStorage.getItem('blockbean_map') || 'classic';
function applyTheme(next = theme) {
  theme = THEMES[next] ? next : 'grass';
  const spec = THEMES[theme];
  scene.background.setHex(spec.sky);
  scene.fog.color.setHex(spec.fog);
  tileMaterial.color.setHex(spec.tile);
  solidColor.setHex(spec.tile);
  warnColor.setHex(spec.warn);
  localStorage.setItem('blockbean_theme', theme);
  $('themeSelect') && ($('themeSelect').value = theme);
  tiles.forEach((_, i) => writeTile(i));
}
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
applyTheme(theme);

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
let RivalProto = cloneFitted(A.rival, 1.4, 0xff795f);
const SpikeProto = cloneFitted(A.spikebox, 1.5);
let SkinProto = null;

function makeBean(isHero, color) {
  const visual = cloneFitted(isHero && skin === 'mint' && SkinProto ? SkinProto : (isHero ? A.hero : (RivalProto || A.rival)), 1.4, isHero ? undefined : color);
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
let timer = 30;
let state = 'menu';
let countdown = 3;
let points = {};
let roundStart = 0;
let msgT = 0;
let cameraPunch = 0;
let spectating = false;
let followIndex = 0;
let muted = localStorage.getItem('blockbean_muted') === '1';
let audio = null;
const input = createInputState();
const keys = input.keys;
const touch = input.touch;
let language = localStorage.getItem('blockbean_language') || 'zh';
let paused = false;
let reduceMotion = localStorage.getItem('blockbean_reduce_motion') === '1' ||
  matchMedia('(prefers-reduced-motion: reduce)').matches;
let slowMo = 0;
let cameraPullback = 0;
let pushCount = 0;
let roundDuration = 0;
let hookSeen = false;
let heartbeatT = 0;
let bestStreak = Number(localStorage.getItem('blockbean_best_streak') || 0);
let currentStreak = Number(localStorage.getItem('blockbean_current_streak') || 0);
let bestPush = Number(localStorage.getItem('blockbean_best_push') || 0);
let bestSurvival = Number(localStorage.getItem('blockbean_best_survival') || 0);
let playCount = Number(localStorage.getItem('blockbean_play_count') || 0);
let mode = localStorage.getItem('blockbean_mode') || 'classic';
let pushLevel = localStorage.getItem('blockbean_push') || 'default';
let paceLevel = localStorage.getItem('blockbean_pace') || 'slow-rush';
let aiLevel = localStorage.getItem('blockbean_ai') || 'default';
let botCount = Number(localStorage.getItem('blockbean_bots') || 6);
let roundSeconds = Number(localStorage.getItem('blockbean_round') || 30);
let skin = localStorage.getItem('blockbean_skin') || 'starter';
let hudPreset = localStorage.getItem('blockbean_hud') || 'normal';
let volume = Number(localStorage.getItem('blockbean_volume') || 0.65);
let tipSuppressed = localStorage.getItem('blockbean_tip_never') === '1';
let returnVisit = false;
let roundEvents = [];
let lastEventAt = 0;
let clipReady = false;
let clipHandle = localStorage.getItem('blockbean_handle') || '';
let hazardRainT = 3;
let ghostT = 0;
let titleIdleT = 0;
let ghostDemoShown = false;
let freeLook = false;
let bgm = null;
let bgmGain = null;
// O2: soften the first round so new players can learn movement, jumping, and pushing.
let practiceRound = localStorage.getItem('blockbean_practice_done') !== '1';

const dayKey = (date = new Date()) => date.toISOString().slice(0, 10);
function dailyStats(key = dayKey()) {
  try { return JSON.parse(localStorage.getItem('blockbean_daily_' + key) || '{"rounds":0,"pushes":0}'); } catch (_) { return { rounds: 0, pushes: 0 }; }
}
function saveDailyStats(resultPushes = 0) {
  const key = dayKey();
  const stats = dailyStats(key);
  stats.rounds += 1;
  stats.pushes += resultPushes;
  localStorage.setItem('blockbean_daily_' + key, JSON.stringify(stats));
  return stats;
}
function yesterdayStats() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return dailyStats(dayKey(date));
}
function setHudPreset(next = hudPreset) {
  hudPreset = next;
  document.documentElement.dataset.hud = hudPreset;
  document.documentElement.style.setProperty('--hud-scale', hudPreset === 'large' ? '1.22' : '1');
  document.documentElement.style.setProperty('--hud-contrast', hudPreset === 'high-contrast' ? '1' : '.82');
  localStorage.setItem('blockbean_hud', hudPreset);
  if ($('hudSelect')) $('hudSelect').value = hudPreset;
}
function syncSettings() {
  ['modeSelect','mapSelect','themeSelect','pushSelect','paceSelect','aiSelect','botSelect','roundSelect','hudSelect'].forEach(id => { const n = $(id); if (n) n.value = ({ mode, map: mapVariant, theme, push: pushLevel, pace: paceLevel, ai: aiLevel, bot: String(botCount), round: String(roundSeconds), hud: hudPreset })[id.replace('Select','')] ?? n.value; });
  const mint = $('skinSelect')?.querySelector('option[value="mint"]');
  if (mint) { mint.disabled = bestStreak < 3; if (skin === 'mint' && mint.disabled) skin = 'starter'; }
  if ($('skinSelect')) $('skinSelect').value = skin;
  if ($('volumeSelect')) $('volumeSelect').value = String(volume);
  if ($('pushKey')) $('pushKey').value = (localStorage.getItem('blockbean_push_key') || 'KeyE').replace(/^Key/, '');
  setHudPreset(hudPreset);
}
function readSettings() {
  mode = $('modeSelect')?.value || mode;
  mapVariant = $('mapSelect')?.value || mapVariant;
  if (mapVariant === 'random') mapVariant = Object.keys(MAPS)[Math.floor(Math.random() * Object.keys(MAPS).length)];
  theme = $('themeSelect')?.value || theme;
  pushLevel = $('pushSelect')?.value || pushLevel;
  paceLevel = $('paceSelect')?.value || paceLevel;
  aiLevel = $('aiSelect')?.value || aiLevel;
  botCount = Number($('botSelect')?.value || botCount);
  roundSeconds = Number($('roundSelect')?.value || roundSeconds);
  skin = $('skinSelect')?.value || skin;
  hudPreset = $('hudSelect')?.value || hudPreset;
  volume = Number($('volumeSelect')?.value || volume);
  const pushKey = $('pushKey')?.value?.trim().toUpperCase();
  if (pushKey && /^[A-Z0-9]$/.test(pushKey)) { localStorage.setItem('blockbean_push_key', 'Key' + pushKey); humanInputBindings[1].push[0] = 'Key' + pushKey; }
  localStorage.setItem('blockbean_mode', mode); localStorage.setItem('blockbean_map', mapVariant);
  localStorage.setItem('blockbean_push', pushLevel); localStorage.setItem('blockbean_pace', paceLevel);
  localStorage.setItem('blockbean_ai', aiLevel); localStorage.setItem('blockbean_bots', String(botCount));
  localStorage.setItem('blockbean_round', String(roundSeconds)); localStorage.setItem('blockbean_skin', skin);
  localStorage.setItem('blockbean_volume', String(volume)); localStorage.setItem('blockbean_handle', $('clipHandle')?.value || clipHandle);
  applyTheme(theme); setHudPreset(hudPreset);
}
syncSettings();
const lastVisit = Number(localStorage.getItem('blockbean_last_visit') || 0);
returnVisit = lastVisit > 0 && Date.now() - lastVisit >= 2 * 86400000;
localStorage.setItem('blockbean_last_visit', String(Date.now()));
if (returnVisit && $('returnBanner')) { $('returnBanner').hidden = false; $('returnBanner').textContent = '欢迎回来！今天的方块岛给你留了一次轻松回归。'; }

function unlockAudio() {
  if (!audio) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    audio = new Ctx();
  }
  if (audio.state === 'suspended') audio.resume();
  if (!bgm && audio) {
    bgm = audio.createOscillator();
    bgmGain = audio.createGain();
    bgm.type = 'sine'; bgm.frequency.value = 110;
    bgmGain.gain.value = muted ? 0 : volume * 0.018;
    bgm.connect(bgmGain).connect(audio.destination);
    bgm.start();
  }
  __va('audio_unlock', {});
}
function tone(freq, duration = 0.08, type = 'sine', gain = 0.045, pan = 0) {
  if (muted || !audio) return;
  const osc = audio.createOscillator();
  const amp = audio.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  amp.gain.setValueAtTime(gain * volume, audio.currentTime);
  amp.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
  const output = audio.createStereoPanner ? audio.createStereoPanner() : null;
  if (output) { output.pan.value = clamp(pan, -1, 1); amp.connect(output).connect(audio.destination); } else amp.connect(audio.destination);
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
  amp.gain.value = gain * volume;
  src.buffer = buffer;
  src.connect(amp).connect(audio.destination);
  src.start();
}
function playSfx(kind, pan = 0) {
  const caption = { warn: '⚠️ 预警砖', fall: '⬇️ 地块塌陷', push: '💥 推击命中', heartbeat: '💓 最后平台', win: '🏆 胜利', out: '❌ 出局' }[kind];
  if (caption && $('captions')) { $('captions').textContent = caption; $('captions').classList.add('show'); setTimeout(() => $('captions')?.classList.remove('show'), 900); }
  if (bgmGain && audio) bgmGain.gain.setTargetAtTime(kind === 'warn' ? 0.004 : (muted ? 0 : volume * 0.018), audio.currentTime, 0.08);
  if (kind === 'warn') { tone(180, 0.09, 'square', 0.03); tone(110, 0.05, 'square', 0.015); }
  if (kind === 'fall') { tone(90, 0.18, 'sawtooth', 0.04); noise(0.14, 0.04); }
  if (kind === 'push') { tone(420, 0.07, 'triangle', 0.045, pan); tone(620, 0.05, 'triangle', 0.025, pan); }
  if (kind === 'heartbeat') tone(90, 0.11, 'sine', 0.035);
  if (kind === 'win') { tone(520, 0.12, 'triangle', 0.04); setTimeout(() => tone(780, 0.18, 'triangle', 0.04), 80); }
  if (kind === 'out') { tone(150, 0.24, 'sawtooth', 0.04); noise(0.1, 0.02); }
}

const particles = [];
const trailGhosts = [];
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
function trailGhost(bean) {
  if (mode !== 'ghost-trail' || !bean?.ai || !bean.alive || reduceMotion) return;
  const mat = new THREE.MeshBasicMaterial({ color: bean.color, transparent: true, opacity: 0.22, depthWrite: false });
  const ghost = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 8), mat);
  ghost.position.copy(bean.p); ghost.position.y += 0.55; scene.add(ghost);
  trailGhosts.push({ m: ghost, t: 0.8 });
}
function flash(text, duration = 1.2) {
  if ($('msg')) $('msg').textContent = text;
  msgT = duration;
}
function punch(amount = 0.18) { if (!reduceMotion) cameraPunch = Math.max(cameraPunch, amount); }
function firstResultTip(kind) {
  if (kind !== 'out' && kind !== 'win') return '';
  if (tipSuppressed) return '';
  const key = `blockbean_tip_${kind}_seen`;
  if (localStorage.getItem(key) === '1') return '';
  localStorage.setItem(key, '1');
  if (language === 'zh') {
    return kind === 'win'
      ? '提示：先找安全砖，再把对手推离落脚点。'
      : '提示：靠近边缘时先看下一块安全砖，别急着推人。';
  }
  return kind === 'win'
    ? 'Tip: find a safe tile first, then push rivals away from your landing spot.'
    : 'Tip: near the edge, find the next safe tile before trying to push.';
}

function reset() {
  readSettings();
  if (skin === 'mint' && !SkinProto && !flags.forceFallbackAssets) loadAsset('skin_mint').then(s => { SkinProto = cloneFitted(s, 1.4, 0x9be7c4); });
  for (const b of beans) scene.remove(b.m);
  if (spike) scene.remove(spike.m);
  beans = [];
  points = {};
  pushCount = 0;
  roundDuration = 0;
  practiceRound = localStorage.getItem('blockbean_practice_done') !== '1';
  slowMo = 0;
  cameraPullback = 0;
  particles.splice(0).forEach(p => scene.remove(p.m));
  for (const [i, t] of tiles.entries()) {
    t.st = MAPS[mapVariant]?.hidden(t) ? 'gone' : 'ok'; t.blocked = t.st === 'gone'; t.t = 0; t.vy = 0; t.y = TILE_TOP - TILE_H / 2;
    t.crackAt = 999;
    writeTile(i);
  }
  const collapseOrder = [...tiles].sort((a, b) => {
    const ar = Math.max(Math.abs(a.i - 3.5), Math.abs(a.j - 3.5));
    const br = Math.max(Math.abs(b.i - 3.5), Math.abs(b.j - 3.5));
    return br - ar || Math.random() - 0.5;
  });
  collapseOrder.forEach((t, index) => {
    const ring = Math.max(Math.abs(t.i - 3.5), Math.abs(t.j - 3.5));
    t.crackAt = practiceRound ? Infinity : collapseDelay(index, ring) * BALANCE.pace[paceLevel];
  });
  const count = Math.max(4, Math.min(8, botCount));
  const colors = [0xff5555, 0x55aaff, 0xffdd33, 0xaa66ff, 0xff9933, 0x33ddaa, 0xff66cc, 0xc084fc];
  for (let k = 0; k < count; k++) {
    const angle = k / count * Math.PI * 2;
    const human = k < 2 ? k + 1 : 0;
    const name = human === 1 ? '你' : human === 2 ? '玩家2' : 'Bot' + k;
    const m = makeBean(human === 1, colors[k % colors.length]);
    const pos = new THREE.Vector3(Math.cos(angle) * 5, 3, Math.sin(angle) * 5);
    const b = createBeanState({ name, ai: !human, human, p: pos, mesh: m, color: colors[k % colors.length] });
    m.position.copy(b.p);
    scene.add(m);
    beans.push(b);
    points[b.name] = 0;
  }
  const sm = makeSpike();
  sm.visible = !practiceRound;
  spike = { m: sm, a: 0 };
  sm.position.set(0, TILE_TOP + 0.05, 0);
  scene.add(sm);
  timer = roundSeconds;
  countdown = 3;
  state = 'count';
  paused = false;
  spectating = false;
  followIndex = 0;
  if ($('result')) $('result').hidden = true;
  if ($('contextTip')) { $('contextTip').hidden = true; $('contextTip').textContent = ''; }
  if ($('pauseOverlay')) $('pauseOverlay').hidden = true;
  flash(practiceRound ? (language === 'zh' ? '练习局：先熟悉移动、跳跃和推人' : 'Practice: learn movement, jumping, and pushing') : '3', practiceRound ? 2.2 : 1);
  unlockAudio();
  __va('round_reset', { players: beans.length, local_2p: true, practice: practiceRound });
  roundEvents = [{ at: performance.now(), type: 'round_reset', mode, map: mapVariant, theme }];
  lastEventAt = performance.now();
  clipReady = false;
  hazardRainT = 3;
  ghostT = 0;
  syncSettings();
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
    if (tileOverlapsFoot(b, t, half, T)) {
      const top = t.y + TILE_H / 2;
      if (!best || top > best.top) best = { t, top };
    }
  }
  return best;
}
function chooseTarget(b) {
  const aliveTiles = tiles.filter(t => t.st === 'ok' && !t.blocked);
  if (!aliveTiles.length) return null;
  const danger = spike.m.position;
  const ranked = aliveTiles.map(t => {
    const dist = Math.hypot(t.x - b.p.x, t.z - b.p.z);
    const spikeDist = Math.hypot(t.x - danger.x, t.z - danger.z);
    const edge = Math.max(Math.abs(t.x), Math.abs(t.z));
    return { t, score: dist * 0.5 + (spikeDist < 3.2 ? 8 * BALANCE.ai[aiLevel] : 0) + edge * (0.2 / BALANCE.ai[aiLevel]) + Math.random() * 2 };
  }).sort((a, c) => a.score - c.score);
  return ranked[0].t;
}
function inputFor(b) {
  if (!b.ai) return readPlayerInput(input, humanInputBindings[b.human || 1]);
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
  if (mode !== 'no-push' && nearby && nearEdge && BALANCE.ai[aiLevel] > 0.6) { tx = nearby.p.x; tz = nearby.p.z; push = true; }
  const fromSpike = b.p.clone().sub(spike.m.position);
  if (fromSpike.y = 0, fromSpike.length() < 3.3) { tx = b.p.x + fromSpike.x * 2; tz = b.p.z + fromSpike.z * 2; }
  const dx = tx - b.p.x;
  const dz = tz - b.p.z;
  const len = Math.hypot(dx, dz) || 1;
  const ahead = tileAt(b.p.x + dx / len * 1.2, b.p.z + dz / len * 1.2);
  const jump = b.ground && (!ahead || ahead.st !== 'ok');
  return { mx: dx / len, mz: dz / len, jump, push };
}
function floatText(text, pos, color = '#fff7a8') {
  const el = document.createElement('div');
  el.className = 'float-text';
  el.textContent = text;
  el.style.color = color;
  el.style.left = (50 + pos.x * 2.5) + '%';
  el.style.top = (45 - pos.z * 1.8) + '%';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 850);
}
function pushBean(b) {
  if (mode === 'no-push') return;
  const pushSpec = BALANCE.push[pushLevel] || BALANCE.push.default;
  const f = new THREE.Vector3(Math.sin(b.m.rotation.y), 0, Math.cos(b.m.rotation.y));
  let hit = false;
  for (const o of beans) {
    if (o === b || !o.alive) continue;
    const delta = o.p.clone().sub(b.p);
    delta.y = 0;
    if (delta.length() < 2.0 && delta.normalize().dot(f) > 0.15) {
      o.v.addScaledVector(delta, pushSpec.force);
      o.v.y = Math.max(o.v.y, 4);
      if (!b.ai) {
        points[b.name] += 1;
        pushCount += 1;
        b.combo = b.comboT > 0 ? b.combo + 1 : 1;
        b.comboT = 1.8;
        floatText(b.combo > 1 ? '双推！' : '再推！', o.p, '#ffe066');
      }
      burst(o.p.clone().add(new THREE.Vector3(0, 0.7, 0)), 0xffe066, 16);
      punch(0.22);
      if (o.m) {
        o.m.scale.setScalar(1.16);
        setTimeout(() => o.alive && o.m.scale.setScalar(1), 130);
      }
      hit = true;
      playSfx('push', clamp(o.p.x / 8, -1, 1));
      roundEvents.push({ at: performance.now(), type: 'push', x: o.p.x, z: o.p.z });
      __va('push_hit', { player: b.name, target: o.name, push_count: pushCount });
    }
  }
  if (hit && !reduceMotion) {
    const flash = $('impactFlash');
    if (flash) { flash.classList.remove('flash-now'); void flash.offsetWidth; flash.classList.add('flash-now'); }
  }
}
function control(b, dt) {
  b.comboT = Math.max(0, b.comboT - dt);
  if (!b.comboT) b.combo = 0;
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
  if (input.push && b.cd <= 0 && mode !== 'no-push' && (!practiceRound || !b.ai)) {
    b.cd = (BALANCE.push[pushLevel] || BALANCE.push.default).cooldown;
    pushBean(b);
    b.m.scale.setScalar(1.2);
    setTimeout(() => b.m.scale.setScalar(1), 120);
  }
}
function physics(b, dt) {
  const wasGround = b.ground;
  const previousY = b.p.y;
  b.v.y -= 22 * dt;
  b.p.addScaledVector(b.v, dt);
  const support = b.v.y <= 0 ? supportingTile(b) : null;
  b.ground = false;
  if (support && b.v.y <= 0 && previousY >= support.top - 0.05 && b.p.y <= support.top) {
    b.p.y = support.top;
    b.v.y = Math.max(0, b.v.y);
    b.ground = true;
    if (!wasGround && !reduceMotion) {
      burst(b.p.clone(), 0xd8f5b2, 7);
      b.m.scale.y = 0.82;
      setTimeout(() => b.alive && b.m.scale.set(1, 1, 1), 120);
    }
  }
  if (wasGround && !b.ground) b.coyote = 0.14;
  if (b.p.y < -15) {
    b.alive = false;
    scene.remove(b.m);
    if (!b.ai) {
      spectating = true;
      slowMo = 1.1;
      cameraPullback = 3;
      flash('你出局了！观战中', 2);
      playSfx('out');
      __va('player_eliminated', { survival_s: Math.round((performance.now() - roundStart) / 1000), cause: 'fell' });
    } else {
      flash(`${b.name} 出局！`, 0.8);
    }
  }
  b.m.position.copy(b.p);
}
function endRound() {
  const practiceComplete = practiceRound;
  const alive = beans.filter(b => b.alive);
  alive.forEach(b => points[b.name] += 10);
  const winner = alive.length === 1 ? alive[0].name : alive.sort((a, c) => points[c.name] - points[a.name])[0]?.name || '无人';
  const meScore = points['你'] || 0;
  const won = !practiceComplete && winner === '你';
  roundDuration = Math.max(0, Math.round((performance.now() - roundStart) / 1000));
  const yesterday = yesterdayStats();
  const today = saveDailyStats(meScore);
  if (practiceComplete) {
    localStorage.setItem('blockbean_practice_done', '1');
    practiceRound = false;
  } else {
    playCount += 1;
    localStorage.setItem('blockbean_play_count', String(playCount));
    currentStreak = won ? currentStreak + 1 : 0;
    bestStreak = Math.max(bestStreak, currentStreak);
    bestPush = Math.max(bestPush, meScore);
    bestSurvival = Math.max(bestSurvival, roundDuration);
    localStorage.setItem('blockbean_best_streak', String(bestStreak));
    localStorage.setItem('blockbean_current_streak', String(currentStreak));
    localStorage.setItem('blockbean_best_push', String(bestPush));
    localStorage.setItem('blockbean_best_survival', String(bestSurvival));
  }
  clipReady = true;
  roundEvents = roundEvents.slice(-240);
  state = 'over';
  slowMo = 0.45;
  cameraPullback = 2;
  playSfx(practiceComplete ? 'win' : (won ? 'win' : 'out'));
  punch(0.35);
  if (won) {
    burst(beans.find(b => b.name === winner)?.p || new THREE.Vector3(), 0xffe066, 80);
    const winnerBean = beans.find(b => b.name === winner);
    if (winnerBean) winnerBean.v.y = 7;
  }
  const roast = randomRoast();
  const tip = practiceComplete ? '' : firstResultTip(won ? 'win' : 'out');
  flash(practiceComplete ? (language === 'zh' ? '练习完成！点击再来一局进入正式局' : 'Practice complete! Start again for the real round') : (won ? '🏆 你赢了！' : '你出局了！'), 999);
  if ($('result')) {
    $('resultTitle').textContent = practiceComplete ? (language === 'zh' ? '练习完成！' : 'Practice complete!') : (won ? (language === 'zh' ? '🏆 你赢了！' : '🏆 You win!') : (language === 'zh' ? '你出局了！' : 'You are out'));
    $('resultDetail').textContent = practiceComplete
      ? (language === 'zh' ? '已完成安全练习：下一局将开启真实塌陷和 Bot 推挤。' : 'Safe practice complete: the next round enables collapse and bot pushes.')
      : (language === 'zh' ? '获胜者：' : 'Winner: ') + winner +
        (language === 'zh' ? ' · 推人分：' : ' · Pushes: ') + meScore +
        (language === 'zh' ? ' · 存活：' : ' · Alive: ') + alive.length + '/' + beans.length +
        (language === 'zh' ? ' · 最佳连胜：' : ' · Best streak: ') + bestStreak;
    if ($('contextTip')) {
      $('contextTip').textContent = tip;
      $('contextTip').hidden = !tip;
    }
    const variant = won && roundDuration >= Math.max(25, roundSeconds - 5) ? 'clutch' : (won ? 'win' : 'defeat');
    $('shareText').value = formatShareText({ score: meScore, won, best: bestStreak, roast, url: PLAY_URL, variant, handle: clipHandle });
    $('roast').textContent = roast;
    if ($('bestBoard')) $('bestBoard').textContent = `本地最佳：连胜 ${bestStreak} · 推人 ${bestPush} · 存活 ${bestSurvival}s · 今日 ${today.rounds} 局/${today.pushes} 推 · 昨日 ${yesterday.rounds} 局/${yesterday.pushes} 推`;
    if ($('clipStatus')) $('clipStatus').textContent = '近 10 秒本地事件缓冲已就绪，可下载分享卡。';
    if ($('clipHandle')) $('clipHandle').value = clipHandle;
    if ($('tipActions')) $('tipActions').hidden = !tip;
    $('result').hidden = false;
  }
  __va('round_end', {
    result: practiceComplete ? 'practice' : (won ? 'win' : 'lose'), winner, push_score: meScore, alive: alive.length,
    duration_s: roundDuration, push_count: pushCount, best_streak: bestStreak
  });
  syncSettings();
}
function downloadShareCard() {
  const canvas = $('shareCard');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, theme === 'neon' ? '#111827' : '#0f766e');
  gradient.addColorStop(1, theme === 'ice' ? '#dbeafe' : '#f59e0b');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#fff'; ctx.font = '800 64px system-ui'; ctx.fillText('方块豆人：塌了就出局', 70, 130);
  ctx.font = '700 44px system-ui'; ctx.fillText($('resultTitle')?.textContent || '', 70, 220);
  ctx.font = '500 32px system-ui'; ctx.fillText($('resultDetail')?.textContent || '', 70, 290);
  ctx.font = '600 30px system-ui'; ctx.fillText($('roast')?.textContent || '', 70, 390);
  ctx.font = '500 24px system-ui'; ctx.fillText((clipHandle ? '@' + clipHandle + ' · ' : '') + PLAY_URL, 70, 540);
  const a = document.createElement('a');
  a.download = 'blockbean-collapse-share.png'; a.href = canvas.toDataURL('image/png'); a.click();
  __va('share_card_download', { clip_buffer: clipReady, handle: Boolean(clipHandle) });
}
function cycleSpectator() {
  const live = beans.filter(b => b.alive);
  if (!live.length) return;
  followIndex = (followIndex + 1) % live.length;
  const target = live[followIndex];
  if ($('spectateLabel')) $('spectateLabel').textContent = `观战：${target.name}`;
  __va('spectate_switch', { target: target.name });
}
const dict = {
  zh: { mute: '🔊 音效', muted: '🔇 静音', pause: '已暂停 · 按 Esc 继续', controls: 'P1 WASD/空格/E · P2 方向键/Numpad1/Numpad0', lang: 'EN', motion: '减少动效' },
  en: { mute: '🔊 Sound', muted: '🔇 Muted', pause: 'Paused · press Esc to resume', controls: 'P1 WASD/Space/E · P2 arrows/Numpad1/Numpad0', lang: '中', motion: 'Reduce motion' }
};
const tr = key => dict[language]?.[key] || dict.zh[key];
function applyLanguage() {
  setText($('langBtn'), tr('lang'));
  setText($('motionBtn'), tr('motion'));
  setText($('muteBtn'), muted ? tr('muted') : tr('mute'));
  if ($('controls')) $('controls').textContent = tr('controls');
  if ($('pauseText')) $('pauseText').textContent = tr('pause');
  if ($('pauseOverlay') && !paused) $('pauseOverlay').hidden = true;
  if ($('pushBtn')) $('pushBtn').hidden = mode === 'no-push';
}
function togglePause() {
  if (state === 'menu' || state === 'over') return;
  paused = !paused;
  if ($('pauseOverlay')) {
    $('pauseOverlay').hidden = !paused;
    if ($('pauseText')) $('pauseText').textContent = tr('pause');
  }
  __va('pause_toggle', { paused });
}
function toggleMotion() {
  reduceMotion = !reduceMotion;
  localStorage.setItem('blockbean_reduce_motion', reduceMotion ? '1' : '0');
  applyLanguage();
  __va('reduce_motion_toggle', { enabled: reduceMotion });
}
function toggleLanguage() {
  language = language === 'zh' ? 'en' : 'zh';
  localStorage.setItem('blockbean_language', language);
  applyLanguage();
  __va('language_toggle', { language });
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
    knob.style.transform = `translate(${x * max}px,${z * max}px)`;
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
  $('freeLookBtn')?.addEventListener('click', () => { freeLook = !freeLook; if ($('freeLookBtn')) $('freeLookBtn').textContent = freeLook ? '跟随视角' : '自由视角'; __va('free_look_toggle', { enabled: freeLook }); });
  $('muteBtn')?.addEventListener('click', () => { muted = !muted; localStorage.setItem('blockbean_muted', muted ? '1' : '0'); applyLanguage(); });
}
bindTouch();

addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'Space') e.preventDefault();
  if (e.code === 'Escape') { e.preventDefault(); togglePause(); }
  if (e.code === 'Tab' && spectating) { e.preventDefault(); cycleSpectator(); }
  if (e.code === 'KeyR' && state === 'over') reset();
  unlockAudio();
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('mousedown', e => {
  if (e.button === 0) input.mousePush = true;
  if (e.button === 1) input.mousePush2 = true;
  unlockAudio();
});
addEventListener('mouseup', e => {
  if (e.button === 0) input.mousePush = false;
  if (e.button === 1) input.mousePush2 = false;
});
$('start')?.addEventListener('click', async () => {
  $('splash')?.remove();
  $('ghostDemo')?.classList.remove('show');
  __va('hook_skipped', { seen: hookSeen });
  if (!A.rival) await loadAsset('rival').then(() => { RivalProto = cloneFitted(A.rival, 1.4, 0xff795f); });
  reset();
});
$('hookSkip')?.addEventListener('click', () => {
  hookSeen = true;
  if ($('hookClip')) $('hookClip').hidden = true;
  __va('hook_skip', {});
});
setTimeout(() => {
  hookSeen = true;
  if ($('hookClip')) { $('hookClip').classList.add('hook-done', 'hook-frozen'); }
  __va('hook_view', { duration_s: 3 });
}, 3000);
$('langBtn')?.addEventListener('click', toggleLanguage);
$('motionBtn')?.addEventListener('click', toggleMotion);
applyLanguage();
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
$('cardBtn')?.addEventListener('click', downloadShareCard);
$('clipHandle')?.addEventListener('input', e => { clipHandle = e.target.value; localStorage.setItem('blockbean_handle', clipHandle); });
$('tipSkip')?.addEventListener('click', () => { if ($('contextTip')) $('contextTip').hidden = true; if ($('tipActions')) $('tipActions').hidden = true; });
$('tipNever')?.addEventListener('click', () => { tipSuppressed = true; localStorage.setItem('blockbean_tip_never', '1'); if ($('contextTip')) $('contextTip').hidden = true; if ($('tipActions')) $('tipActions').hidden = true; });
['modeSelect','mapSelect','themeSelect','pushSelect','paceSelect','aiSelect','botSelect','roundSelect','skinSelect','hudSelect','volumeSelect','pushKey'].forEach(id => $(id)?.addEventListener('change', () => { readSettings(); syncSettings(); }));
setTimeout(() => {
  if (state === 'menu' && !$('splash')?.hidden && $('ghostDemo')) { $('ghostDemo').classList.add('show'); ghostDemoShown = true; __va('ghost_demo_show', {}); }
}, 5000);
let quitTimer = null;
const quitToLobby = () => {
  if (!paused) return;
  paused = false; state = 'menu';
  beans.forEach(b => scene.remove(b.m)); beans = [];
  if (spike) scene.remove(spike.m);
  $('pauseOverlay') && ($('pauseOverlay').hidden = true);
  $('splash')?.remove();
  const splash = document.createElement('div');
  splash.id = 'splash'; splash.innerHTML = '<h1>方块豆人：塌了就出局</h1><p>已回到大厅。选择设置后重新开始。</p><button id="startLobby">开始 / Start</button>';
  document.body.appendChild(splash);
  $('startLobby')?.addEventListener('click', () => { splash.remove(); reset(); });
  __va('return_to_lobby', {});
};
$('quitHold')?.addEventListener('pointerdown', () => { quitTimer = setTimeout(quitToLobby, 900); });
['pointerup','pointercancel','pointerleave'].forEach(event => $('quitHold')?.addEventListener(event, () => { if (quitTimer) clearTimeout(quitTimer); quitTimer = null; }));

let frameDt = 0.016;
const clock = new THREE.Clock();
function loop() {
  requestAnimationFrame(loop);
  frameDt = Math.min(clock.getDelta(), 0.05);
  if (state === 'play' && performance.now() - lastEventAt > 250) {
    lastEventAt = performance.now();
    const me = beans[0];
    roundEvents.push({ at: lastEventAt, type: 'snapshot', x: me?.p.x || 0, z: me?.p.z || 0, alive: beans.filter(b => b.alive).length });
    roundEvents = roundEvents.filter(event => lastEventAt - event.at <= 10000);
  }
  if (paused) { if (renderer) renderer.render(scene, cam); return; }
  const dt = frameDt * (slowMo > 0 ? 0.35 : 1);
  if (msgT > 0) { msgT -= dt; if (msgT <= 0 && state !== 'over' && $('msg')) $('msg').textContent = ''; }
  if (state === 'count') {
    countdown -= dt;
    if ($('msg')) $('msg').textContent = countdown > 0 ? Math.ceil(countdown) : 'GO!';
    beans.forEach(b => physics(b, dt));
    // Resolve deterministic test/debug falls during the countdown as well as during play.
    if (beans.length && beans.filter(b => b.alive).length <= 1) endRound();
    if (countdown <= 0) {
      state = 'play';
      roundStart = performance.now();
      flash('GO!', 0.5);
      __va('game_start', { players: beans.length });
    }
  } else if (state === 'play' || state === 'over') {
    if (state === 'play') timer -= dt;
    const elapsed = roundSeconds - timer;
    const aliveTiles = tiles.filter(t => t.st === 'ok' || t.st === 'crack');
    const sudden = !practiceRound && aliveTiles.length <= 4;
    if ($('sudden')) $('sudden').classList.toggle('sudden-on', sudden);
    heartbeatT -= dt;
    if (sudden && heartbeatT <= 0) { heartbeatT = 0.58; playSfx('heartbeat'); }
    let warningStarted = false;
    const scheduled = practiceRound ? [] : (sudden
      ? tiles.filter(t => t.st === 'ok').sort((a, b) => Math.max(Math.abs(a.x), Math.abs(a.z)) - Math.max(Math.abs(b.x), Math.abs(b.z)))
      : tiles.filter(t => t.st === 'ok' && elapsed >= t.crackAt));
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
          burst(new THREE.Vector3(t.x, TILE_TOP, t.z), 0xffaa44, reduceMotion ? 5 : 24);
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
    if (mode === 'hazard-rain' && !practiceRound) {
      hazardRainT -= dt;
      if (hazardRainT <= 0) {
        hazardRainT = 3.2;
        const drop = new THREE.Vector3((Math.random() - 0.5) * 12, 8, (Math.random() - 0.5) * 12);
        burst(drop, 0xff006e, 18);
        beans.forEach(b => { if (b.alive && b.p.distanceTo(drop) < 2.2) { b.v.y = Math.max(b.v.y, 5); b.v.x += (b.p.x - drop.x) * 2; b.v.z += (b.p.z - drop.z) * 2; } });
        __va('hazard_rain', { x: Math.round(drop.x), z: Math.round(drop.z) });
      }
    }
    ghostT -= dt;
    beans.forEach(b => {
      if (!b.alive) return;
      control(b, dt);
      physics(b, dt);
      const d = b.p.clone().sub(spike.m.position);
      d.y = 0;
      b.hazardCd = Math.max(0, b.hazardCd - dt);
      if (!practiceRound && d.length() < 1.3 && b.p.y < TILE_TOP + 1.6 && b.hazardCd <= 0) {
        b.v.addScaledVector(d.normalize(), 14);
        b.v.y = Math.max(b.v.y, 6);
        b.hazardCd = 0.8;
        punch(0.12);
        tone(110, 0.1, 'square', 0.025);
      }
      if (ghostT <= 0) trailGhost(b);
    });
    if (ghostT <= 0) ghostT = 0.22;
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
  for (let i = trailGhosts.length - 1; i >= 0; i--) {
    const ghost = trailGhosts[i]; ghost.t -= frameDt; ghost.m.material.opacity = Math.max(0, ghost.t * 0.28);
    if (ghost.t <= 0) { scene.remove(ghost.m); trailGhosts.splice(i, 1); }
  }
  const live = beans.filter(b => b.alive);
  let target = beans[0];
  if (spectating && live.length) target = live[followIndex % live.length];
  const focus = target?.p || new THREE.Vector3();
  const desired = new THREE.Vector3(focus.x, focus.y + 9, focus.z + 11 + cameraPullback);
  const shake = cameraPunch > 0 ? new THREE.Vector3((Math.random() - 0.5) * cameraPunch, (Math.random() - 0.5) * cameraPunch, 0) : new THREE.Vector3();
  if (!freeLook) { cam.position.lerp(desired.add(shake), reduceMotion ? 0.24 : 0.12); cam.lookAt(focus.x, focus.y, focus.z); }
  cameraPunch = Math.max(0, cameraPunch - dt * 1.7);
  cam.fov = baseFov + cameraPunch * 18;
  cam.updateProjectionMatrix();
  if ($('hud')) {
    const spectateText = spectating && target ? ' · 观战：' + target.name : '';
    const practiceText = practiceRound ? (language === 'zh' ? ' · 练习局（无塌陷/Bot推挤）' : ' · Practice (no collapse / bot pushes)') : '';
    const scores = language === 'zh' ? '推人分 ' : 'Pushes ';
    const modeText = mode === 'no-push' ? ' · No-push' : mode === 'hazard-rain' ? ' · Hazard rain' : mode === 'ghost-trail' ? ' · Ghost trail' : '';
    const specText = spectating ? (language === 'zh' ? ' · 下一块预警：留意橙色裂纹' : ' · Next collapse: watch orange cracks') : '';
    const watermark = spectating && clipHandle ? ' · @' + clipHandle : '';
    $('hud').innerHTML = state === 'menu' ? '' :
      '⏱ ' + Math.max(0, timer).toFixed(0) + 's · 存活 ' + live.length + '/' + beans.length +
      ' · ' + scores + (points['你'] || 0) + ' · 最佳连胜 ' + bestStreak + practiceText + spectateText +
      modeText + specText + watermark + '<br><small id="controls">' + tr('controls') + '</small>';
  }
  if (renderer) renderer.render(scene, cam);
}
window.__game = { get state() { return state; }, get beans() { return beans; }, get tiles() { return tiles; }, get points() { return points; }, get spectating() { return spectating; } };
loop();
