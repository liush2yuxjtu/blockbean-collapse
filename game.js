import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clamp, tileOverlapsFoot, collapseDelay } from './modules/arena.js';
import { createBeanState, humanInputBindings } from './modules/beans.js';
import { attachBeanRig, updateBeanRig, triggerBeanPush } from './modules/beanRig.js';
import { createInputState, readPlayerInput } from './modules/input.js';
import { formatShareText, randomRoast, setText } from './modules/ui.js';

const PLAY_URL = 'https://blockbean-collapse.vercel.app';
const VERSION = '1.1.1';
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
// Parallel clip map so animated/skinned GLBs can swap in without rewrite (Tripo next).
const AssetClips = {};
const loadAsset = name => flags.forceFallbackAssets ? Promise.resolve(null) : loader.loadAsync('assets/' + name + '/model.glb')
  .then(g => {
    A[name] = g.scene;
    AssetClips[name] = Array.isArray(g.animations) ? g.animations : [];
    return g.scene;
  })
  .catch(err => { console.warn('GLB fail: ' + name, err); __va('asset_error', { asset: name }); return null; });
await Promise.all(['hero', 'spikebox'].map(loadAsset));
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
const TILE_ASSETS = { grass: 'tile_grass', ice: 'tile_ice', neon: 'tile_neon' };
let tileLoadToken = 0;
function tileMeshParts(assetName = 'tile') {
  const source = A[assetName]?.getObjectByProperty('isMesh', true);
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
  const srcMat = Array.isArray(source.material) ? source.material[0] : source.material;
  const material = srcMat ? srcMat.clone() : new THREE.MeshStandardMaterial();
  material.vertexColors = !!geometry.attributes.color;
  return { geometry, material };
}
const { geometry: tileGeometry } = tileMeshParts();
let tileMaterial = new THREE.MeshStandardMaterial({ color: 0x6bbf3b, roughness: 0.82, metalness: 0.02, vertexColors: true });
tileMaterial.roughness = tileMaterial.roughness ?? 0.82;
tileMaterial.metalness = tileMaterial.metalness ?? 0.02;
const tileMesh = new THREE.InstancedMesh(tileGeometry, tileMaterial, GRID * GRID);
tileMesh.castShadow = true;
tileMesh.receiveShadow = true;
tileMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
scene.add(tileMesh);
function applyTileAsset(assetName) {
  const replacement = tileMeshParts(assetName);
  tileMesh.geometry.dispose();
  tileMesh.material.dispose();
  tileMesh.geometry = replacement.geometry;
  tileMaterial = replacement.material;
  tileMesh.material = tileMaterial;
  applyTheme(theme);
  __va('tile_asset_swap', { asset: assetName });
}
function loadThemeTile() {
  const token = ++tileLoadToken;
  const names = [TILE_ASSETS[theme] || 'tile'];
  if (names[0] !== 'tile') names.push('tile');
  const next = index => loadAsset(names[index]).then(() => {
    if (token !== tileLoadToken) return;
    if (A[names[index]]) { applyTileAsset(names[index]); return; }
    if (index + 1 < names.length) next(index + 1);
  });
  next(0);
}
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
  // Crack: thicker lift + brighter pulse so warn reads on grass/ice/neon default themes.
  const pulse = t.st === 'crack' ? 0.12 + Math.sin(crackPulseT * 8 + index) * 0.08 : 0;
  const warnBoost = t.st === 'crack' ? 1.14 + Math.sin(crackPulseT * 11 + index * 0.7) * 0.08 : 1;
  tileDummy.position.set(t.x, t.y + pulse, t.z);
  tileDummy.scale.set(scale * warnBoost, scale * (t.st === 'crack' ? 1.22 : 1), scale * warnBoost);
  tileDummy.updateMatrix();
  tileMesh.setMatrixAt(index, tileDummy.matrix);
  if (t.st === 'crack') {
    const flash = 0.35 + 0.65 * Math.max(0, Math.sin(crackPulseT * 12 + index));
    // Hot white-yellow edge so crack is obvious even on warm grass warnColor.
    tileColor.copy(warnColor).lerp(new THREE.Color(0xffffff), 0.45 + flash * 0.5);
    tileColor.lerp(new THREE.Color(0xffee55), 0.25 * flash);
  } else if (t.st === 'fall') {
    tileColor.copy(warnColor).lerp(new THREE.Color(0xff2200), 0.55);
  } else {
    tileColor.copy(t.st === 'gone' ? goneColor : solidColor);
  }
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
  const assetKey = isHero ? (skin === 'mint' && SkinProto ? 'skin_mint' : 'hero') : 'rival';
  const visual = cloneFitted(isHero && skin === 'mint' && SkinProto ? SkinProto : (isHero ? A.hero : (RivalProto || A.rival)), 1.4, isHero ? undefined : color);
  const group = visual || new THREE.Mesh(
    new THREE.CapsuleGeometry(0.42, 0.62, 4, 8),
    new THREE.MeshStandardMaterial({ color })
  );
  if (!visual) group.geometry.translate(0, 0.72, 0);
  const root = new THREE.Group();
  // Code skeleton: tumble→hips→torso(+limbs). Static GLB sits in torso; walk/push/fall drive hierarchy.
  attachBeanRig(root, group, { color, hero: isHero });
  root.userData.assetKey = assetKey;
  // Easy animated-GLB swap: when Tripo ships skinned clips, mixer plays them here.
  const clips = AssetClips[assetKey] || AssetClips[isHero ? 'hero' : 'rival'] || [];
  if (clips.length) {
    const mixer = new THREE.AnimationMixer(group);
    const actions = {};
    for (const clip of clips) {
      const key = (clip.name || 'idle').toLowerCase();
      actions[key] = mixer.clipAction(clip);
    }
    root.userData.mixer = mixer;
    root.userData.actions = actions;
    const start = actions.walk || actions.idle || actions[Object.keys(actions)[0]];
    if (start) start.play();
  }
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
let countDeadline = 0;
let points = {};
let roundStart = 0;
let msgT = 0;
let cameraPunch = 0;
let shakeOffset = new THREE.Vector3();
let shakeVel = new THREE.Vector3();
let crackPulseT = 0;
let lastJuice = { pushAt: 0, pushedAt: 0, warnAt: 0, fallAt: 0, reviveAt: 0, fallDeathAt: 0 };
let camChaseYaw = 0;
// Fall Guys lean: 1 mid-round scramble revive (race-checkpoint pattern), not infinite.
let scrambleRevivesLeft = 1;
let spectating = false;
let followIndex = 0;
let muted = localStorage.getItem('blockbean_muted') === '1';
let audio = null;
const input = createInputState();
const keys = input.keys;
const touch = input.touch;
let language = localStorage.getItem('blockbean_language') || 'zh';
let paused = false;
let reduceMotion = (() => {
  const saved = localStorage.getItem('blockbean_reduce_motion');
  if (saved === '1') return true;
  if (saved === '0') return false;
  return matchMedia('(prefers-reduced-motion: reduce)').matches;
})();
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
let roundEndFired = false;
let matchEndFired = false;
let abandonFired = false;
let watchingAfterLocalOut = false;
let lastEndReason = null;

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
  const caption = {
    warn: '⚠️ 预警砖', fall: '⬇️ 地块塌陷', push: '💥 推击命中', pushed: '💫 被击退',
    revive: '🫘 豆豆复活', heartbeat: '💓 最后平台', win: '🏆 胜利', out: '❌ 出局'
  }[kind];
  if (caption && $('captions')) { $('captions').textContent = caption; $('captions').classList.add('show'); setTimeout(() => $('captions')?.classList.remove('show'), 900); }
  if (bgmGain && audio) bgmGain.gain.setTargetAtTime(kind === 'warn' ? 0.004 : (muted ? 0 : volume * 0.018), audio.currentTime, 0.08);
  if (kind === 'warn') { tone(220, 0.14, 'square', 0.055); tone(140, 0.1, 'square', 0.03); tone(90, 0.06, 'square', 0.02); }
  if (kind === 'fall') { tone(90, 0.18, 'sawtooth', 0.04); noise(0.14, 0.04); }
  if (kind === 'push') { tone(420, 0.07, 'triangle', 0.045, pan); tone(620, 0.05, 'triangle', 0.025, pan); }
  if (kind === 'pushed') { tone(180, 0.09, 'sawtooth', 0.05, pan); tone(90, 0.12, 'triangle', 0.035, pan); noise(0.06, 0.025); }
  if (kind === 'revive') { tone(360, 0.1, 'triangle', 0.045); setTimeout(() => tone(540, 0.14, 'triangle', 0.04), 70); }
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
function punch(amount = 0.18) {
  if (reduceMotion) return;
  // Chase-cam punch: kick in look-local axes (back / up / mild lateral), not dizzy world random.
  cameraPunch = Math.max(cameraPunch, amount);
  shakeVel.x += (Math.random() - 0.5) * amount * 0.55; // mild lateral in cam-right
  shakeVel.y += amount * 0.55; // upward
  shakeVel.z += amount * 0.95; // push camera back along look
}
function lerpAngle(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}
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
  // Formal rounds get 1 scramble revive; practice already has no lethal collapse.
  scrambleRevivesLeft = practiceRound ? 0 : 1;
  slowMo = 0;
  cameraPullback = 0;
  cameraPunch = 0;
  camChaseYaw = 0;
  lastJuice.fallDeathAt = 0;
  shakeOffset.set(0, 0, 0);
  shakeVel.set(0, 0, 0);
  particles.splice(0).forEach(p => scene.remove(p.m));
  for (const [i, t] of tiles.entries()) {
    t.st = MAPS[mapVariant]?.hidden(t) ? 'gone' : 'ok'; t.blocked = t.st === 'gone'; t.t = 0; t.vy = 0; t.y = TILE_TOP - TILE_H / 2;
    t.crackAt = 999;
    writeTile(i);
  }
  tileMesh.instanceMatrix.needsUpdate = true;
  tileMesh.instanceColor.needsUpdate = true;
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
    b.mixer = m.userData?.mixer || null;
    b.actions = m.userData?.actions || null;
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
  countDeadline = performance.now() + 3000;
  state = 'count';
  paused = false;
  spectating = false;
  followIndex = 0;
  roundEndFired = false;
  matchEndFired = false;
  abandonFired = false;
  watchingAfterLocalOut = false;
  lastEndReason = null;
  if ($('result')) $('result').hidden = true;
  if ($('continueSpectateBtn')) $('continueSpectateBtn').hidden = true;
  if ($('resultLeaveBtn')) $('resultLeaveBtn').hidden = true;
  setSpectateExitUi(false);
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
  // Soft ledge cling: slightly larger foot so grazing a tile edge still counts (Fall Guys soft-edge feel).
  const half = 0.68;
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
function pickSafeTileNear(prefer = null) {
  const safe = tiles.filter(t => t.st === 'ok' || t.st === 'crack');
  if (!safe.length) return null;
  if (prefer) {
    safe.sort((a, c) => {
      const da = Math.hypot(a.x - prefer.x, a.z - prefer.z);
      const dc = Math.hypot(c.x - prefer.x, c.z - prefer.z);
      return da - dc;
    });
  } else {
    safe.sort((a, c) => Math.hypot(a.x, a.z) - Math.hypot(c.x, c.z));
  }
  return safe[0];
}
function scrambleRevive(b) {
  const pad = pickSafeTileNear(b.p);
  if (!pad) return false;
  scrambleRevivesLeft = Math.max(0, scrambleRevivesLeft - 1);
  b.alive = true;
  b.told = false;
  b.p.set(pad.x, TILE_TOP + 0.15, pad.z);
  b.v.set(0, 4.5, 0);
  b.ground = false;
  b.coyote = 0.28;
  b.stunT = 0.18;
  b.invulnT = 1.35;
  b.steerX = 0;
  b.steerZ = 0;
  if (b.m.parent !== scene) scene.add(b.m);
  b.m.position.copy(b.p);
  b.m.scale.setScalar(1.35);
  setTimeout(() => { if (b.alive && b.m) b.m.scale.setScalar(1); }, 220);
  burst(b.p.clone().add(new THREE.Vector3(0, 0.8, 0)), 0xfff0a0, reduceMotion ? 8 : 36);
  burst(b.p.clone().add(new THREE.Vector3(0, 0.4, 0)), 0x9be7c4, reduceMotion ? 4 : 18);
  punch(0.28);
  playSfx('revive');
  flash(language === 'zh' ? '豆豆复活！本局最后一次' : 'Bean revive! Last chance this round', 1.8);
  floatText(language === 'zh' ? '复活!' : 'Revive!', b.p, '#9be7c4');
  lastJuice.reviveAt = performance.now();
  const flashEl = $('impactFlash');
  if (flashEl && !reduceMotion) {
    flashEl.classList.remove('flash-now', 'pushed-now', 'revive-now');
    void flashEl.offsetWidth;
    flashEl.classList.add('revive-now');
  }
  __va('scramble_revive', { remaining: scrambleRevivesLeft, survival_s: survivalSeconds() });
  roundEvents.push({ at: performance.now(), type: 'revive', x: b.p.x, z: b.p.z });
  return true;
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
  let localVictim = false;
  for (const o of beans) {
    if (o === b || !o.alive) continue;
    if (o.invulnT > 0) continue;
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
      burst(o.p.clone().add(new THREE.Vector3(0, 0.7, 0)), 0xffe066, reduceMotion ? 6 : 28);
      burst(o.p.clone().add(new THREE.Vector3(0, 0.4, 0)), 0xffffff, reduceMotion ? 3 : 12);
      punch(0.34);
      if (o.m) {
        o.m.scale.setScalar(1.28);
        o.m.traverse(node => {
          if (!node.isMesh || !node.material?.color) return;
          if (!o._flashColor) o._flashColor = node.material.color.clone();
          node.material.color.setHex(0xffffff);
        });
        setTimeout(() => {
          if (!o.alive || !o.m) return;
          o.m.scale.setScalar(1);
          o.m.traverse(node => {
            if (!node.isMesh || !node.material?.color || !o._flashColor) return;
            node.material.color.copy(o._flashColor);
          });
        }, 140);
      }
      // Victim juice: when a human is knocked back, mirror push-hit feedback for the receiver.
      if (!o.ai) {
        localVictim = true;
        o.stunT = Math.max(o.stunT, 0.14);
        floatText(language === 'zh' ? '击退!' : 'Knockback!', o.p, '#ff9aa8');
        punch(0.42);
        playSfx('pushed', clamp(o.p.x / 8, -1, 1));
        lastJuice.pushedAt = performance.now();
        __va('push_received', { player: o.name, from: b.name });
      }
      hit = true;
      lastJuice.pushAt = performance.now();
      playSfx('push', clamp(o.p.x / 8, -1, 1));
      roundEvents.push({ at: performance.now(), type: 'push', x: o.p.x, z: o.p.z });
      __va('push_hit', { player: b.name, target: o.name, push_count: pushCount });
    }
  }
  if (hit && !reduceMotion) {
    const flashEl = $('impactFlash');
    if (flashEl) {
      flashEl.classList.remove('flash-now', 'pushed-now', 'revive-now');
      void flashEl.offsetWidth;
      flashEl.classList.add(localVictim ? 'pushed-now' : 'flash-now');
    }
  }
}
function control(b, dt) {
  b.comboT = Math.max(0, b.comboT - dt);
  if (!b.comboT) b.combo = 0;
  b.stunT = Math.max(0, (b.stunT || 0) - dt);
  b.invulnT = Math.max(0, (b.invulnT || 0) - dt);
  const raw = inputFor(b);
  // Analog-smooth: interpolate input vector so digital WASD / AI seek don't snap to 8 dirs.
  const rawLen = Math.hypot(raw.mx, raw.mz);
  const cap = Math.min(1, rawLen || 0);
  const tx = rawLen > 1e-4 ? (raw.mx / rawLen) * cap : 0;
  const tz = rawLen > 1e-4 ? (raw.mz / rawLen) * cap : 0;
  const steerRate = rawLen > 0.05 ? (b.ai ? 7.5 : 9.5) : (b.ai ? 5.5 : 7);
  b.steerX += (tx - b.steerX) * Math.min(1, steerRate * dt);
  b.steerZ += (tz - b.steerZ) * Math.min(1, steerRate * dt);
  if (Math.hypot(b.steerX, b.steerZ) < 0.02 && rawLen < 0.05) { b.steerX = 0; b.steerZ = 0; }
  const stunned = b.stunT > 0;
  const sx = stunned ? 0 : b.steerX;
  const sz = stunned ? 0 : b.steerZ;
  const speed = 6;
  const accel = b.ground ? (rawLen > 0.05 ? 8.5 : 10) : 3.2;
  const ax = sx * speed;
  const az = sz * speed;
  b.v.x += (ax - b.v.x) * Math.min(1, accel * dt);
  b.v.z += (az - b.v.z) * Math.min(1, accel * dt);
  if (Math.hypot(sx, sz) > 0.08) {
    const face = Math.atan2(sx, sz);
    let dy = face - b.m.rotation.y;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    b.m.rotation.y += dy * Math.min(1, 12 * dt);
  }
  if (!stunned && raw.jump) b.jumpBuffer = 0.14;
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
  if (!stunned && raw.push && b.cd <= 0 && mode !== 'no-push' && (!practiceRound || !b.ai)) {
    b.cd = (BALANCE.push[pushLevel] || BALANCE.push.default).cooldown;
    pushBean(b);
    triggerBeanPush(b);
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
  // Longer coyote + soft ledge (supportingTile half) soften one-mistake deaths (Fall Guys fair-fail pillar).
  if (wasGround && !b.ground) b.coyote = 0.22;
  if (b.p.y < -15 && !b.fallingDeath) {
    const canRevive = !b.ai && !practiceRound && scrambleRevivesLeft > 0 && state === 'play' && !roundEndFired;
    if (canRevive && scrambleRevive(b)) {
      // Fall Guys race-checkpoint pattern, lean: one scramble revive then result-first.
    } else {
      beginFallDeath(b);
    }
  }
  b.m.position.copy(b.p);
}
/** Local (and NPC) fall: watch tumble ~0.8–1.5s, then result / remove — not an instant cut. */
function beginFallDeath(b) {
  if (!b || b.fallingDeath || roundEndFired && !b.ai) return;
  b.alive = false;
  b.fallingDeath = true;
  b.fallingDeathT = reduceMotion ? 0.28 : (0.85 + Math.random() * 0.55);
  b.tumbleSpin = new THREE.Vector3(
    (Math.random() > 0.5 ? 1 : -1) * (5.5 + Math.random() * 4),
    (Math.random() - 0.5) * 3.5,
    (Math.random() > 0.5 ? 1 : -1) * (4.5 + Math.random() * 3.5)
  );
  if (b.v.y > -3) b.v.y = -3;
  b.v.x += (Math.random() - 0.5) * 4;
  b.v.z += (Math.random() - 0.5) * 4;
  if (b.m.parent !== scene) scene.add(b.m);
  const fallAct = b.actions?.fall || b.m?.userData?.actions?.fall;
  if (fallAct) fallAct.reset().setEffectiveWeight(1).fadeIn(0.05).play();
  if (b.m.userData?.rig) b.m.userData.rig.clip = 'fall';
  if (!b.ai) {
    slowMo = Math.max(slowMo, 0.85);
    cameraPullback = Math.max(cameraPullback, 1.5);
    punch(0.22);
    playSfx('out');
    flash(language === 'zh' ? '掉下去了…' : 'Falling…', b.fallingDeathT + 0.2);
    lastJuice.fallDeathAt = performance.now();
    __va('player_eliminated', { survival_s: Math.round((performance.now() - roundStart) / 1000), cause: 'fell' });
  } else {
    flash(`${b.name} 出局！`, 0.8);
  }
}
function updateFallDeath(b, dt) {
  if (!b.fallingDeath) return;
  b.fallingDeathT -= dt;
  b.v.y -= 22 * dt;
  b.p.addScaledVector(b.v, dt);
  b.m.position.copy(b.p);
  // Code rig owns tumble + limb flail; mixer path still ticks if present.
  if (b.m.userData?.rig) {
    updateBeanRig(b, dt, { reduceMotion });
  } else {
    const vis = b.m.userData?.visual || b.m;
    if (b.tumbleSpin) {
      vis.rotation.x += b.tumbleSpin.x * dt;
      vis.rotation.y += b.tumbleSpin.y * dt;
      vis.rotation.z += b.tumbleSpin.z * dt;
    }
    const stretch = 1 + Math.min(0.4, Math.abs(b.v.y) * 0.018);
    vis.scale.set(1 / Math.sqrt(stretch), stretch, 1 / Math.sqrt(stretch));
  }
  if (b.mixer) b.mixer.update(dt);
  if (b.fallingDeathT <= 0) finishFallDeath(b);
}
function finishFallDeath(b) {
  b.fallingDeath = false;
  b.fallingDeathT = 0;
  if (b.m) scene.remove(b.m);
  if (!b.ai) {
    spectating = true;
    slowMo = 1.1;
    cameraPullback = 3;
    // Result-first after the player has watched their own fall.
    endRound({ end_reason: practiceRound ? 'practice_done' : 'local_out' });
  }
}
/** Code-rig walk/push/lean, or AnimationMixer when skinned clips exist. */
function updateBeanMotionFeel(b, dt) {
  if (!b?.m || b.fallingDeath) return;
  if (b.mixer) {
    b.mixer.update(dt);
    const actions = b.actions || b.m.userData?.actions;
    if (actions) {
      const spd = Math.hypot(b.v.x, b.v.z);
      const walk = actions.walk || actions.run;
      const idle = actions.idle;
      const push = actions.push;
      if (b.cd > (BALANCE.push[pushLevel] || BALANCE.push.default).cooldown - 0.2 && push) {
        push.reset().setEffectiveWeight(1).fadeIn(0.05).play();
      } else if (walk && idle) {
        const w = Math.min(1, spd / 4);
        walk.setEffectiveWeight(w);
        idle.setEffectiveWeight(1 - w);
        if (w > 0.08 && !walk.isRunning()) walk.play();
        if (w < 0.92 && !idle.isRunning()) idle.play();
      }
    }
    // Still tick hips/tumble identity via rig when present.
    if (b.m.userData?.rig) updateBeanRig(b, dt, { reduceMotion });
    return;
  }
  if (b.m.userData?.rig) {
    updateBeanRig(b, dt, { reduceMotion });
    return;
  }
  // Legacy single-mesh lean fallback (no rig attached).
  const vis = b.m.userData?.visual;
  if (!vis || reduceMotion) return;
  const spd = Math.hypot(b.v.x, b.v.z);
  const targetPitch = b.ground ? clamp(spd * 0.035, 0, 0.28) : clamp(-b.v.y * 0.02, -0.35, 0.2);
  const targetRoll = clamp(-(b.steerX || 0) * 0.28, -0.32, 0.32);
  b.leanPitch += (targetPitch - b.leanPitch) * Math.min(1, 12 * dt);
  b.leanRoll += (targetRoll - b.leanRoll) * Math.min(1, 12 * dt);
  b.bobT = (b.bobT || 0) + dt * (5 + spd * 2.5);
  const bob = (b.ground && spd > 0.25) ? Math.sin(b.bobT) * 0.05 : 0;
  vis.rotation.x = b.leanPitch;
  vis.rotation.z = b.leanRoll;
  const sy = 1 - bob * 0.55 + (b.ground ? 0 : Math.min(0.18, Math.abs(b.v.y) * 0.012));
  vis.scale.set(1 / Math.sqrt(Math.max(0.75, sy)), sy, 1 / Math.sqrt(Math.max(0.75, sy)));
}
function survivalSeconds() {
  if (!roundStart) return 0;
  return Math.max(0, Math.round((performance.now() - roundStart) / 1000));
}
function maybeAbandonRound() {
  if (roundEndFired || abandonFired) return;
  if (!(state === 'count' || state === 'play' || (spectating && !roundEndFired))) return;
  abandonFired = true;
  __va('round_abandon', { state, survival_s: survivalSeconds(), practice: practiceRound });
}
function setSpectateExitUi(show) {
  if ($('spectateNextBtn')) $('spectateNextBtn').hidden = !show;
  if ($('spectateLeaveBtn')) $('spectateLeaveBtn').hidden = !show;
}
function continueSpectate() {
  if (!roundEndFired) return;
  watchingAfterLocalOut = true;
  spectating = true;
  state = 'play';
  if ($('result')) $('result').hidden = true;
  if ($('continueSpectateBtn')) $('continueSpectateBtn').hidden = true;
  setSpectateExitUi(true);
  flash(language === 'zh' ? '观战中 · R 再来一局 · 可退出大厅' : 'Spectating · R next · Leave available', 2.4);
  __va('spectate_continue', { alive: beans.filter(b => b.alive).length });
  cycleSpectator();
}
function spectateNextRound() {
  __va('spectate_next', {});
  reset();
}
function tearDownToLobby({ event = 'return_to_lobby', data = {} } = {}) {
  maybeAbandonRound();
  paused = false;
  state = 'menu';
  spectating = false;
  watchingAfterLocalOut = false;
  beans.forEach(b => scene.remove(b.m));
  beans = [];
  if (spike) scene.remove(spike.m);
  if ($('result')) $('result').hidden = true;
  if ($('pauseOverlay')) $('pauseOverlay').hidden = true;
  setSpectateExitUi(false);
  $('splash')?.remove();
  const splash = document.createElement('div');
  splash.id = 'splash';
  splash.innerHTML = '<h1>方块豆人：塌了就出局</h1><p>已回到大厅。选择设置后重新开始。</p><button id="startLobby">开始 / Start</button>';
  document.body.appendChild(splash);
  $('startLobby')?.addEventListener('click', () => { splash.remove(); reset(); });
  __va(event, data);
}
function leaveSpectateToLobby() {
  const payload = { survival_s: survivalSeconds() };
  __va('spectate_leave', payload);
  tearDownToLobby({ event: 'return_to_lobby', data: {} });
}
function endRound({ end_reason } = {}) {
  const alive = beans.filter(b => b.alive);
  if (roundEndFired) {
    if (watchingAfterLocalOut && !matchEndFired) {
      matchEndFired = true;
      const winner = alive.length === 1 ? alive[0].name : alive.sort((a, c) => points[c.name] - points[a.name])[0]?.name || '无人';
      __va('match_end', { winner, alive: alive.length, end_reason: end_reason || (timer <= 0 ? 'timer' : 'last_alive') });
      flash(language === 'zh' ? `对局结束 · 获胜者 ${winner}` : `Match over · winner ${winner}`, 2.5);
      setSpectateExitUi(true);
    }
    return;
  }
  const practiceComplete = practiceRound;
  let reason = end_reason;
  if (!reason) {
    if (practiceComplete) reason = 'practice_done';
    else if (timer <= 0) reason = 'timer';
    else reason = 'last_alive';
  }
  lastEndReason = reason;
  roundEndFired = true;
  const earlyLocalOut = reason === 'local_out';
  // Defer survival bonuses until the match fully resolves (not on early local-out).
  if (!earlyLocalOut) alive.forEach(b => points[b.name] += 10);
  const winner = earlyLocalOut
    ? (language === 'zh' ? '对局进行中' : 'in progress')
    : (alive.length === 1 ? alive[0].name : alive.sort((a, c) => points[c.name] - points[a.name])[0]?.name || '无人');
  const meScore = points['你'] || 0;
  const won = !practiceComplete && !earlyLocalOut && winner === '你';
  roundDuration = survivalSeconds();
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
  const canContinueSpectate = earlyLocalOut && alive.length > 0;
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
    if ($('continueSpectateBtn')) $('continueSpectateBtn').hidden = !canContinueSpectate;
    if ($('resultLeaveBtn')) $('resultLeaveBtn').hidden = false;
    $('result').hidden = false;
  }
  setSpectateExitUi(spectating || earlyLocalOut);
  __va('round_end', {
    result: practiceComplete ? 'practice' : (won ? 'win' : 'lose'),
    winner: earlyLocalOut ? 'none' : winner,
    push_score: meScore,
    alive: alive.length,
    duration_s: roundDuration,
    push_count: pushCount,
    best_streak: bestStreak,
    end_reason: reason
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
  if ($('devSummary')) $('devSummary').textContent = language === 'en' ? 'Advanced / Dev settings' : '高级 / 开发设置';
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
    let x = dx / max;
    let z = dz / max;
    const stickLen = Math.hypot(x, z);
    if (stickLen > 1) { x /= stickLen; z /= stickLen; }
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
  if (e.code === 'KeyR' && (state === 'over' || spectating)) {
    if (spectating) __va('spectate_next', {});
    reset();
  }
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
$('start')?.addEventListener('click', () => {
  $('splash')?.remove();
  $('ghostDemo')?.classList.remove('show');
  __va('hook_skipped', { seen: hookSeen });
  reset();
  if (!A.rival) loadAsset('rival').then(() => { RivalProto = cloneFitted(A.rival, 1.4, 0xff795f); });
});
setTimeout(loadThemeTile, 0);
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

(function initDevPanel() {
  const panel = $('devPanel');
  if (!panel) return;
  const params = new URLSearchParams(location.search);
  const wantDev = params.get('dev') === '1' || localStorage.getItem('blockbean_dev') === '1';
  if (params.get('dev') === '1') localStorage.setItem('blockbean_dev', '1');
  if (params.get('dev') === '0') localStorage.removeItem('blockbean_dev');
  // Always keep in DOM but collapsed; only auto-open for explicit dev flag.
  panel.hidden = false;
  if (wantDev) panel.open = true;
  const summary = $('devSummary');
  if (summary) {
    summary.textContent = language === 'en' ? 'Advanced / Dev settings' : '高级 / 开发设置';
  }
  __va('splash_dev_panel', { open: panel.open, want_dev: wantDev });
})();
$('langBtn')?.addEventListener('click', toggleLanguage);
$('motionBtn')?.addEventListener('click', toggleMotion);
applyLanguage();
$('replayBtn')?.addEventListener('click', () => {
  if (spectating || watchingAfterLocalOut) __va('spectate_next', {});
  reset();
});
$('continueSpectateBtn')?.addEventListener('click', continueSpectate);
$('resultLeaveBtn')?.addEventListener('click', leaveSpectateToLobby);
$('spectateNextBtn')?.addEventListener('click', spectateNextRound);
$('spectateLeaveBtn')?.addEventListener('click', leaveSpectateToLobby);
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
['modeSelect','mapSelect','themeSelect','pushSelect','paceSelect','aiSelect','botSelect','roundSelect','skinSelect','hudSelect','volumeSelect','pushKey'].forEach(id => $(id)?.addEventListener('change', () => { readSettings(); syncSettings(); if (id === 'themeSelect') loadThemeTile(); }));
setTimeout(() => {
  if (state === 'menu' && !$('splash')?.hidden && $('ghostDemo')) { $('ghostDemo').classList.add('show'); ghostDemoShown = true; __va('ghost_demo_show', {}); }
}, 5000);
let quitTimer = null;
const quitToLobby = () => {
  if (!paused && !spectating && state !== 'over') return;
  tearDownToLobby({ event: 'return_to_lobby' });
};
$('quitHold')?.addEventListener('pointerdown', () => { quitTimer = setTimeout(quitToLobby, 900); });
['pointerup','pointercancel','pointerleave'].forEach(event => $('quitHold')?.addEventListener(event, () => { if (quitTimer) clearTimeout(quitTimer); quitTimer = null; }));
const abandonBeacon = () => maybeAbandonRound();
addEventListener('pagehide', abandonBeacon);
addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') abandonBeacon();
});

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
    // Wall-clock countdown so main-thread GLB parse stalls don't stretch the 3s gate.
    countdown = Math.max(0, (countDeadline - performance.now()) / 1000);
    if ($('msg')) $('msg').textContent = countdown > 0 ? Math.ceil(countdown) : 'GO!';
    beans.forEach(b => {
      if (b.fallingDeath) updateFallDeath(b, dt);
      else if (b.alive) physics(b, dt);
    });
    // Resolve deterministic test/debug falls during the countdown as well as during play.
    const localTumblingCount = beans.some(b => !b.ai && b.fallingDeath);
    if (!localTumblingCount && beans.length && beans.filter(b => b.alive).length <= 1) {
      endRound({ end_reason: practiceRound ? 'practice_done' : 'last_alive' });
    }
    if (countdown <= 0 && state === 'count') {
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
        t.t = sudden ? 0.85 : 1.55;
        warningStarted = true;
        writeTile(i);
        burst(new THREE.Vector3(t.x, TILE_TOP + 0.35, t.z), 0xff7b28, reduceMotion ? 4 : 22);
        burst(new THREE.Vector3(t.x, TILE_TOP + 0.15, t.z), 0xffee88, reduceMotion ? 2 : 14);
        punch(sudden ? 0.24 : 0.14);
        lastJuice.warnAt = performance.now();
        playSfx('warn');
        const crackFlash = $('crackWarn');
        if (crackFlash && !reduceMotion) {
          crackFlash.classList.remove('warn-now');
          void crackFlash.offsetWidth;
          crackFlash.classList.add('warn-now');
        }
        __va('tile_warn', { tile: i, sudden });
      } else if (t.st === 'crack') {
        t.t -= dt;
        if (t.t <= 0) {
          t.st = 'fall';
          t.vy = 0;
          writeTile(i);
          punch(sudden ? 0.28 : 0.18);
          playSfx('fall');
          burst(new THREE.Vector3(t.x, TILE_TOP, t.z), 0xffaa44, reduceMotion ? 6 : 36);
          burst(new THREE.Vector3(t.x, TILE_TOP - 0.2, t.z), 0x8b5a2b, reduceMotion ? 3 : 16);
          lastJuice.fallAt = performance.now();
          __va('tile_fall', { tile: i });
        } else writeTile(i);
      } else if (t.st === 'fall') {
        t.vy -= 20 * dt;
        t.y += t.vy * dt;
        if (t.y < -30) { t.st = 'gone'; t.y = TILE_TOP - TILE_H / 2; }
        writeTile(i);
      }
    }
    tileMesh.instanceMatrix.needsUpdate = true;
    tileMesh.instanceColor.needsUpdate = true;
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
      if (b.fallingDeath) {
        updateFallDeath(b, dt);
        return;
      }
      if (!b.alive) return;
      control(b, dt);
      physics(b, dt);
      updateBeanMotionFeel(b, dt);
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
      const localTumbling = beans.some(b => !b.ai && b.fallingDeath);
      const practiceElapsed = roundStart ? (performance.now() - roundStart) / 1000 : 0;
      // Hold result while the hero is still watching their own fall.
      if (practiceRound && !roundEndFired && !localTumbling && (pushCount >= 1 || practiceElapsed >= 15)) {
        endRound({ end_reason: 'practice_done' });
      } else if (!localTumbling && (alive.length <= 1 || timer <= 0)) {
        endRound({ end_reason: timer <= 0 ? 'timer' : 'last_alive' });
      }
      // Spectate flag only after tumble finishes (finishFallDeath); don't steal cam mid-fall.
      if (!beans[0]?.alive && beans[0] && !beans[0].fallingDeath && !beans[0].told) {
        beans[0].told = true;
        spectating = true;
      }
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
  crackPulseT += frameDt;
  // Keep crack edge-glow matrices fresh without random floor jitter.
  if (state === 'play' || state === 'over') {
    let crackDirty = false;
    for (let i = 0; i < tiles.length; i++) {
      if (tiles[i].st === 'crack') { writeTile(i); crackDirty = true; }
    }
    if (crackDirty) {
      tileMesh.instanceMatrix.needsUpdate = true;
      tileMesh.instanceColor.needsUpdate = true;
    }
  }
  const live = beans.filter(b => b.alive);
  const localDying = beans.find(b => !b.ai && b.fallingDeath);
  let target = localDying || beans[0];
  if (!localDying && spectating && live.length) target = live[followIndex % live.length];
  const focus = target?.p || new THREE.Vector3();
  const focusLookY = focus.y + (localDying ? 0.4 : 1.1);
  cameraPullback = Math.max(0, cameraPullback - frameDt * 1.8);
  if (slowMo > 0) slowMo = Math.max(0, slowMo - frameDt);
  // Third-person chase yaw: smooth toward hero facing (over-shoulder / behind-bean).
  const targetYaw = target?.m?.rotation?.y ?? camChaseYaw;
  camChaseYaw = lerpAngle(camChaseYaw, targetYaw, reduceMotion ? 0.2 : 0.1);
  // Damped one-shot shake in camera-local space (see punch()); never world-random sway.
  const allowShake = !reduceMotion && (state === 'play' || state === 'over' || Boolean(localDying));
  if (!allowShake) { shakeVel.set(0, 0, 0); shakeOffset.set(0, 0, 0); cameraPunch = 0; }
  else {
    shakeOffset.x += shakeVel.x * frameDt * 60;
    shakeOffset.y += shakeVel.y * frameDt * 60;
    shakeOffset.z += shakeVel.z * frameDt * 60;
    shakeVel.multiplyScalar(Math.exp(-frameDt * 14));
    shakeOffset.multiplyScalar(Math.exp(-frameDt * 10));
    cameraPunch = Math.max(0, cameraPunch - frameDt * 2.6);
    if (cameraPunch < 0.01 && shakeOffset.lengthSq() < 1e-5) {
      cameraPunch = 0;
      shakeOffset.set(0, 0, 0);
      shakeVel.set(0, 0, 0);
    }
  }
  const backDist = (localDying ? 9.5 : 11) + cameraPullback;
  const height = localDying ? 7.2 : 8.6;
  const shoulder = localDying ? 0.55 : 1.15;
  const sinY = Math.sin(camChaseYaw);
  const cosY = Math.cos(camChaseYaw);
  // Behind hero along -forward, slight over-shoulder on right.
  const desired = new THREE.Vector3(
    focus.x - sinY * backDist + cosY * shoulder,
    focus.y + height,
    focus.z - cosY * backDist - sinY * shoulder
  );
  const follow = reduceMotion ? 0.28 : (cameraPunch > 0 || localDying ? 0.18 : 0.22);
  if (!freeLook) {
    cam.position.lerp(desired, follow);
    // Apply punch in chase-cam local axes: right / up / back along look.
    const rightX = cosY, rightZ = -sinY;
    const backX = sinY, backZ = cosY;
    cam.position.x += rightX * shakeOffset.x + backX * shakeOffset.z * 0.55;
    cam.position.y += shakeOffset.y;
    cam.position.z += rightZ * shakeOffset.x + backZ * shakeOffset.z * 0.55;
    cam.lookAt(focus.x, focusLookY, focus.z);
  }
  cam.fov = baseFov + (allowShake ? cameraPunch * 18 : 0);
  cam.updateProjectionMatrix();
  if ($('hud')) {
    const spectateText = spectating && target ? ' · 观战：' + target.name : '';
    const practiceText = practiceRound ? (language === 'zh' ? ' · 练习局（无塌陷/Bot推挤）' : ' · Practice (no collapse / bot pushes)') : '';
    const reviveText = (!practiceRound && scrambleRevivesLeft > 0)
      ? (language === 'zh' ? ' · 复活×' + scrambleRevivesLeft : ' · Revive×' + scrambleRevivesLeft) : '';
    const scores = language === 'zh' ? '推人分 ' : 'Pushes ';
    const modeText = mode === 'no-push' ? ' · No-push' : mode === 'hazard-rain' ? ' · Hazard rain' : mode === 'ghost-trail' ? ' · Ghost trail' : '';
    const specText = spectating ? (language === 'zh' ? ' · 下一块预警：留意橙色裂纹' : ' · Next collapse: watch orange cracks') : '';
    const watermark = spectating && clipHandle ? ' · @' + clipHandle : '';
    $('hud').innerHTML = state === 'menu' ? '' :
      '⏱ ' + Math.max(0, timer).toFixed(0) + 's · 存活 ' + live.length + '/' + beans.length +
      ' · ' + scores + (points['你'] || 0) + ' · 最佳连胜 ' + bestStreak + practiceText + reviveText + spectateText +
      modeText + specText + watermark + '<br><small id="controls">' + tr('controls') + '</small>';
  }
  if (renderer) renderer.render(scene, cam);
}
window.__game = {
  get state() { return state; },
  get beans() { return beans; },
  get tiles() { return tiles; },
  get points() { return points; },
  get spectating() { return spectating; },
  get roundEndFired() { return roundEndFired; },
  get watchingAfterLocalOut() { return watchingAfterLocalOut; },
  get lastEndReason() { return lastEndReason; },
  get practiceRound() { return practiceRound; },
  get reduceMotion() { return reduceMotion; },
  get cameraPunch() { return cameraPunch; },
  get camChaseYaw() { return camChaseYaw; },
  get lastJuice() { return lastJuice; },
  get scrambleRevivesLeft() { return scrambleRevivesLeft; },
  get localFallingDeath() { return beans.find(b => !b.ai && b.fallingDeath) || null; },
  get assetClips() { return AssetClips; },
  get codeRig() { return true; },
  scrambleRevive,
  beginFallDeath,
  debugPush(bean) { triggerBeanPush(bean); pushBean(bean); },
  continueSpectate,
  spectateNextRound,
  leaveSpectateToLobby,
  reset
};
loop();
