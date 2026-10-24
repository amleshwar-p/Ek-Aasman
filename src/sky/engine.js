
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// The whole 3D sky: scene, fireworks, sound, panels and the rangoli studio.
// Started once from SkyUI after React has put the page markup on screen.
export function startSky() {
  if (window.__ekStarted) return;
  window.__ekStarted = true;

const $ = (s) => document.querySelector(s);
const rand = Math.random;
const R = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const clamp = THREE.MathUtils.clamp;
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const SMALL = Math.min(innerWidth, innerHeight) < 620;
const fmt = (n) => Math.round(n).toLocaleString('en-IN');
const LIN = THREE.LinearSRGBColorSpace;
function fmtLeft(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  if (s < 3600) return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h + 'h ' + String(m).padStart(2, '0') + 'm';
}

/* ---------------- free kit + game state (no money anywhere) ---------------- */
const ITEMS = [
  { key: 'rocket', name: 'Rocket', pts: 4, where: 'sky', hint: 'Click anywhere in the sky to launch your rocket' },
  { key: 'named', name: 'Named rocket', pts: 20, where: 'sky', hint: 'Click the sky. Your name goes up for all of India' },
  { key: 'skyshot', name: 'Sky shot', pts: 12, where: 'ground', hint: 'Click your terrace floor to place the sky shot' },
  { key: 'anar', name: 'Anar', pts: 3, where: 'ground', hint: 'Click your terrace floor to place the anar' },
  { key: 'chakri', name: 'Chakri', pts: 2, where: 'ground', hint: 'Click your terrace floor to set the chakri spinning' },
  { key: 'phuljhadi', name: 'Phuljhadi', pts: 1, where: 'hand', hint: 'Click to light it, then move your mouse to draw with it' },
  { key: 'bomb', name: 'Sutli bomb', pts: 3, where: 'ground', hint: 'Click the floor, then cover your ears' },
  { key: 'ladi', name: 'Ladi', pts: 8, where: 'ground', hint: 'Click to lay the 100-wala along your terrace' },
  { key: 'diya', name: 'Diya', pts: 1, where: 'auto', hint: 'Click to light a diya. When your parapet is full, each light rises into the sky' }
];
const ITEM = Object.fromEntries(ITEMS.map((i) => [i.key, i]));
const KIT = {
  rocket: { cap: 5, every: 30, amt: 1, rule: '1 every 30 seconds, hold up to 5' },
  diya: { cap: 51, every: 600, amt: 11, rule: '11 every 10 minutes, save up to 51' },
  anar: { cap: 3, every: 45, amt: 1, rule: '1 every 45 seconds, hold up to 3' },
  chakri: { cap: 3, every: 45, amt: 1, rule: '1 every 45 seconds, hold up to 3' },
  phuljhadi: { cap: 3, every: 45, amt: 1, rule: '1 every 45 seconds, hold up to 3' },
  bomb: { cap: 3, every: 45, amt: 1, rule: '1 every 45 seconds, hold up to 3' },
  ladi: { cap: 2, every: 60, amt: 1, rule: '1 every minute, hold up to 2' },
  skyshot: { cap: 1, every: 90, amt: 1, rule: '1 every 90 seconds' },
  named: { earned: true, rule: '+1 for each friend who joins, +1 per day of streak' }
};
const MILESTONES = [11000, 51000, 101000, 501000, 1100000, 2617000];
const S = {
  mode: 'landing', view: 'roof', pts: 0, rank: null, sel: 'rocket', times: [], lit: 0, online: 0, myLights: 0, user: null, anon: '', feed: [], mine: new Set(), joining: false,
  inv: { rocket: 5, named: 1, skyshot: 1, anar: 3, chakri: 3, phuljhadi: 3, bomb: 3, ladi: 2, diya: 11 },
  next: {}, skyName: '', tpl: 0, sound: true, drawer: null, tab: 'today', nudged: false, studio: false
};
function startRefill(k) {
  const r = KIT[k];
  if (!r || r.earned) return;
  if (S.inv[k] < r.cap && !S.next[k]) S.next[k] = Date.now() + r.every * 1000;
}
startRefill('diya');

const ICONS = {
  rocket: '<path d="M14.5 4.5h5v5l-6 6-5-5z"/><path d="M8.5 15.5 4 20M11 18l-1.5 1.5M6 13l-1.5 1.5"/>',
  named: '<path d="M14.5 4.5h5v5l-6 6-5-5z"/><path d="M8.5 15.5 4 20"/><path d="M5.5 4v4M3.5 6h4"/>',
  skyshot: '<path d="M8 21h8v-6H8z"/><path d="M10 15v-3M14 15v-3M12 12V8.5"/><circle cx="12" cy="5.5" r="1.6"/><circle cx="6.5" cy="8.5" r="1.2"/><circle cx="17.5" cy="8.5" r="1.2"/>',
  anar: '<path d="M8.5 20h7l-1.8-8.5h-3.4z"/><path d="M12 9V4.5M9.2 8.2 7 5.2M14.8 8.2 17 5.2M7 10 4.5 9M17 10l2.5-1"/>',
  chakri: '<circle cx="12" cy="12" r="7.5"/><path d="M12 8.5a3.5 3.5 0 1 1-3.5 3.5"/><path d="M20.5 4.5l-1.6 1.6M3.5 19.5l1.6-1.6"/>',
  phuljhadi: '<path d="M5 20 14.5 10.5"/><path d="M17 3.5v3M20.5 7h-3M19.6 4.4l-1.8 1.8M14.4 4.4l1.6 1.6M20 10.8l-1.9-.9"/>',
  bomb: '<circle cx="10" cy="14" r="6"/><path d="M14.2 9.8 16.5 7.5"/><path d="M18 3.5v2M21 6.5h-2M20.2 4.3l-1.4 1.4"/>',
  ladi: '<path d="M3 4.5c4 1 7.5 4 9.5 8s5 6.5 8.5 6.5"/><rect x="4.5" y="6.5" width="2.6" height="4" rx=".6"/><rect x="10" y="10" width="2.6" height="4" rx=".6"/><rect x="15.5" y="14.5" width="2.6" height="4" rx=".6"/>',
  diya: '<path d="M3.5 13.5h17c0 3.3-3.8 5.5-8.5 5.5s-8.5-2.2-8.5-5.5z"/><path d="M12 4.5c1.7 1.9 2.4 3.3 2.4 4.5a2.4 2.4 0 0 1-4.8 0c0-1.2.7-2.6 2.4-4.5z"/>'
};
const svg = (k, s = 24) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[k]}</svg>`;

/* ---------------- renderer ---------------- */
const canvas = $('#scene');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
} catch (e) {
  document.body.insertAdjacentHTML('beforeend', '<div class="nogl">This browser could not start the 3D sky. Try Chrome, Edge or Safari with hardware acceleration on.</div>');
  throw e;
}
const DPR = Math.min(window.devicePixelRatio || 1, 1.5);
renderer.setPixelRatio(DPR);
renderer.setSize(innerWidth, innerHeight, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.0062);
const camera = new THREE.PerspectiveCamera(SMALL ? 64 : 52, innerWidth / innerHeight, 0.1, 4000);
const CAM = new THREE.Vector3(0, 1.75, 7.5);
const LOOK = new THREE.Vector3(0, 5.6, -40);
camera.position.copy(CAM);
camera.lookAt(LOOK);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.95, 0.55, 0.22);
composer.addPass(bloom);
composer.addPass(new OutputPass());

/* ---------------- sun, sky light, Indian time ---------------- */
const sun = new THREE.DirectionalLight(0xffffff, 0);
sun.castShadow = true;
sun.shadow.mapSize.set(SMALL ? 2048 : 4096, SMALL ? 2048 : 4096);
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
scene.add(sun); scene.add(sun.target);
const hemi = new THREE.HemisphereLight(0xffffff, 0x000000, 0.05);
scene.add(hemi);
const duskBack = new THREE.DirectionalLight(0xff6633, 0);
duskBack.position.set(0, 20, -200); scene.add(duskBack);

const D2R = Math.PI / 180, LAT = 23.5 * D2R, LON = 78;
function istNow() { const d = new Date(Date.now() + 330 * 60000); return { min: d.getUTCHours() * 60 + d.getUTCMinutes() + d.getUTCSeconds() / 60, y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate() }; }
function sunDirection(minIST, y, m, d) {
  const N = Math.floor((Date.UTC(y, m, d) - Date.UTC(y, 0, 0)) / 864e5);
  const utcMin = minIST - 330;
  const g = 2 * Math.PI / 365 * (N - 1 + (utcMin / 60 - 12) / 24);
  const eq = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const tst = utcMin + eq + 4 * LON;
  const ha = (tst / 4 - 180) * D2R;
  const el = Math.asin(clamp(Math.sin(LAT) * Math.sin(decl) + Math.cos(LAT) * Math.cos(decl) * Math.cos(ha), -1, 1));
  const az = Math.atan2(Math.sin(ha), Math.cos(ha) * Math.sin(LAT) - Math.tan(decl) * Math.cos(LAT)) + Math.PI;
  // scene axes: north = +x, east = +z, west = -z (you face west from your terrace)
  return { dir: new THREE.Vector3(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)), el: el / D2R };
}
const TIME = { mode: 'live', min: 720, play: null, day: null };
const ENV = { night: 1, glow: 0, dayF: 0, sunDir: new THREE.Vector3(0, -1, 0), el: -30, fogCol: new THREE.Color() };

/* ---------------- shared lighting uniforms ---------------- */
const MAXF = 8, MAXL = 12;
const flashPos = Array.from({ length: MAXF }, () => new THREE.Vector4(0, -999, 0, 1));
const flashCol = Array.from({ length: MAXF }, () => new THREE.Vector3());
const flashSt = Array.from({ length: MAXF }, () => ({ i: 0, decay: 3, hold: 0, c: new THREE.Color() }));
const lampPos = Array.from({ length: MAXL }, () => new THREE.Vector3(0, -999, 0));
const lampCol = Array.from({ length: MAXL }, () => new THREE.Vector3());
const U = {
  uTime: { value: 0 }, uNight: { value: 1 },
  uFlashPos: { value: flashPos }, uFlashCol: { value: flashCol },
  uLampPos: { value: lampPos }, uLampCol: { value: lampCol },
  uFog: { value: new THREE.Vector3(0.024, 0.007, 0.013) }, uFogD: { value: 0.0062 }
};
let flashCursor = 0;
function addFlash(p, r, g, b, inten, k = 0.004, decay = 3.2, hold = 0) {
  const s = flashCursor++ % MAXF;
  flashPos[s].set(p.x, p.y, p.z, k);
  flashSt[s].i = inten; flashSt[s].decay = decay; flashSt[s].hold = hold; flashSt[s].c.setRGB(r, g, b, LIN);
  return s;
}
function setFlash(s, p, r, g, b, inten, k) {
  flashPos[s].set(p.x, p.y, p.z, k); flashSt[s].i = inten; flashSt[s].hold = 0.05; flashSt[s].c.setRGB(r, g, b, LIN);
}
const skyFlash = new THREE.Vector3();
function updateFlashes(dt) {
  for (let s = 0; s < MAXF; s++) {
    const f = flashSt[s];
    if (f.hold > 0) f.hold -= dt; else f.i *= Math.exp(-f.decay * dt);
    flashCol[s].set(f.c.r * f.i, f.c.g * f.i, f.c.b * f.i);
  }
  skyFlash.multiplyScalar(Math.exp(-2.2 * dt));
  sky.material.uniforms.uSkyFlash.value.copy(skyFlash);
}

/* ---------------- materials: lit by sun + sky, plus firework flashes, lit windows, shop fronts ---------------- */
const G0 = -14;
function litMat(r, g, b, opts = {}) {
  const m = new THREE.MeshStandardMaterial({
    color: new THREE.Color().setRGB(r, g, b, LIN), roughness: opts.rough ?? 0.92, metalness: 0,
    map: opts.map || null, transparent: !!opts.transparent, alphaTest: opts.alphaTest || 0, side: opts.side || THREE.FrontSide,
    depthWrite: opts.depthWrite ?? true, polygonOffset: !!opts.polyOff, polygonOffsetFactor: opts.polyOff ? -2 : 0, polygonOffsetUnits: opts.polyOff ? -2 : 0
  });
  if (opts.emis) { m.emissive = new THREE.Color().setRGB(...opts.emis, LIN); }
  if (opts.emisMap) { m.emissiveMap = opts.map; m.emissive = new THREE.Color(1, 1, 1); m.emissiveIntensity = opts.emisMap; }
  const win = opts.win ? 1 : 0;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uFlashPos = U.uFlashPos; sh.uniforms.uFlashCol = U.uFlashCol;
    sh.uniforms.uLampPos = U.uLampPos; sh.uniforms.uLampCol = U.uLampCol;
    sh.uniforms.uTime = U.uTime; sh.uniforms.uNight = U.uNight; sh.uniforms.uWin = { value: win };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aSeed;\nvarying vec3 vWP2; varying vec3 vWN2; varying float vSeed2;')
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
        vec4 wp2 = vec4(transformed, 1.0);
        vec3 wn2 = objectNormal;
        #ifdef USE_INSTANCING
          wp2 = instanceMatrix * wp2; wn2 = mat3(instanceMatrix) * wn2;
        #endif
        wp2 = modelMatrix * wp2; vWP2 = wp2.xyz; vWN2 = normalize(mat3(modelMatrix) * wn2); vSeed2 = aSeed;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('void main() {', `uniform vec4 uFlashPos[${MAXF}]; uniform vec3 uFlashCol[${MAXF}];
        uniform vec3 uLampPos[${MAXL}]; uniform vec3 uLampCol[${MAXL}];
        uniform float uTime; uniform float uNight; uniform float uWin;
        varying vec3 vWP2; varying vec3 vWN2; varying float vSeed2;
        float hh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
        void main() {`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 gEmis = vec3(0.0);
        vec3 n2 = normalize(vWN2);
        if (uWin > 0.5) {
          float lh = vWP2.y - (${G0.toFixed(1)});
          if (n2.y > 0.5) {
            diffuseColor.rgb = vec3(0.50, 0.47, 0.43) * (0.82 + 0.3 * hh(floor(vWP2.xz * 0.7) + vSeed2));
          } else if (abs(n2.y) < 0.5) {
            float u = abs(n2.x) > 0.5 ? vWP2.z : vWP2.x;
            if (lh < 3.2) {
              float bay = floor(u / 3.3);
              float rib = 0.75 + 0.25 * step(0.5, fract(lh * 7.0));
              float shut = step(0.12, fract(u / 3.3)) * step(fract(u / 3.3), 0.92) * step(lh, 2.6);
              vec3 shopC = mix(vec3(0.45, 0.47, 0.5), vec3(0.62, 0.22, 0.18), step(0.7, hh(vec2(bay, vSeed2))));
              diffuseColor.rgb = mix(diffuseColor.rgb * 0.8, shopC * rib, shut);
              float open = step(0.55, hh(vec2(bay * 3.1, vSeed2 * 7.0)));
              gEmis += shut * open * vec3(1.0, 0.62, 0.3) * 0.09 * uNight * (0.6 + 0.4 * hh(vec2(bay, 2.0)));
            } else {
              float v = vWP2.y + 40.0;
              vec2 cell = floor(vec2(u / 1.15, v / 1.4));
              vec2 f = fract(vec2(u / 1.15, v / 1.4));
              float inWin = step(0.24, f.x) * step(f.x, 0.76) * step(0.3, f.y) * step(f.y, 0.8);
              float frame = step(0.19, f.x) * step(f.x, 0.81) * step(0.25, f.y) * step(f.y, 0.85) - inWin;
              diffuseColor.rgb *= 1.0 - 0.16 * step(f.y, 0.08) + 0.06 * step(0.08, f.y) * step(f.y, 0.12);
              diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.86, 0.84, 0.8), frame * 0.55);
              float h = hh(cell + vSeed2 * 17.3);
              vec3 glass = mix(vec3(0.035, 0.045, 0.06), vec3(0.14, 0.17, 0.21), hh(cell + 9.1));
              diffuseColor.rgb = mix(diffuseColor.rgb, glass, inWin);
              float lit = step(0.64, h);
              vec3 warm = mix(vec3(1.0, 0.42, 0.12), vec3(1.0, 0.66, 0.32), hh(cell + 2.3));
              float flick = 0.9 + 0.1 * sin(uTime * 1.7 + h * 50.0);
              gEmis += inWin * lit * warm * (0.022 + 0.07 * hh(cell + 5.1)) * flick * uNight;
              float rowY = fract(v / 4.2);
              float band = step(0.86, hh(vec2(vSeed2 * 91.0, floor(v / 4.2)))) * smoothstep(0.09, 0.0, abs(rowY - 0.5));
              float dotm = step(0.5, fract(u * 1.6));
              vec3 bc = mix(vec3(1.0, 0.25, 0.4), vec3(1.0, 0.6, 0.1), step(0.5, fract(u * 0.8 + floor(uTime * 1.3) * 0.5)));
              gEmis += band * dotm * bc * 0.22 * uNight;
              vec3 marigold = mix(vec3(0.95, 0.42, 0.03), vec3(0.98, 0.72, 0.05), step(0.5, fract(u * 2.3)));
              marigold = mix(marigold, vec3(0.15, 0.42, 0.1), step(0.82, fract(u * 0.45)));
              diffuseColor.rgb = mix(diffuseColor.rgb, marigold, band * (1.0 - uNight) * 0.95);
            }
          }
          diffuseColor.rgb *= mix(0.6, 1.0, smoothstep(0.0, 6.0, lh));
        }
        for (int i = 0; i < ${MAXF}; i++) {
          vec3 L = uFlashPos[i].xyz - vWP2; float d2 = dot(L, L);
          float ndl = max(dot(n2, L * inversesqrt(d2 + 1e-4)), 0.0);
          gEmis += diffuseColor.rgb * uFlashCol[i] * (ndl * 0.85 + 0.15) / (1.0 + d2 * uFlashPos[i].w) * 0.42;
        }
        for (int i = 0; i < ${MAXL}; i++) {
          vec3 L = uLampPos[i] - vWP2; float d2 = dot(L, L);
          float ndl = max(dot(n2, L * inversesqrt(d2 + 1e-4)), 0.0);
          gEmis += diffuseColor.rgb * uLampCol[i] * (ndl * 0.8 + 0.2) / (1.0 + d2 * 3.0) * 0.42;
        }`)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += gEmis;');
  };
  return m;
}
const shadowy = (o, cast = true, recv = true) => { o.castShadow = cast; o.receiveShadow = recv; return o; };

/* ---------------- sky dome + stars ---------------- */
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(2500, 48, 24),
  new THREE.ShaderMaterial({
    uniforms: { uSkyFlash: { value: new THREE.Vector3() }, uSun: { value: new THREE.Vector3(0, -1, 0) }, uNight: U.uNight, uGlow: { value: 0 }, uFogCol: { value: new THREE.Color() } },
    vertexShader: `varying vec3 vDir; void main(){ vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }`,
    fragmentShader: `varying vec3 vDir; uniform vec3 uSkyFlash; uniform vec3 uSun; uniform float uNight; uniform float uGlow; uniform vec3 uFogCol;
      void main(){ vec3 d = normalize(vDir); float h = d.y;
        vec3 zen = vec3(0.0012,0.0012,0.0042); vec3 mid = vec3(0.006,0.0035,0.014); vec3 hor = vec3(0.034,0.009,0.016);
        vec3 nc = mix(hor, mid, smoothstep(-0.02, 0.16, h)); nc = mix(nc, zen, smoothstep(0.16, 0.75, h));
        nc += vec3(0.10, 0.022, 0.008) * exp(-max(h + 0.02, 0.0) * 16.0) * 0.5;
        vec3 dz = vec3(0.075, 0.2, 0.52);
        vec3 dc = mix(uFogCol, dz, pow(smoothstep(-0.02, 0.7, h), 0.75));
        vec2 sh = normalize(uSun.xz + vec2(1e-4)); vec2 dh = normalize(d.xz + vec2(1e-4));
        float toward = max(dot(sh, dh), 0.0);
        vec3 setc = mix(vec3(0.62, 0.22, 0.2), vec3(1.0, 0.5, 0.16), toward);
        dc = mix(dc, setc, uGlow * exp(-max(h, 0.0) * (6.0 - 3.0 * toward)) * (0.35 + 0.65 * toward));
        dc = mix(dc, dc * vec3(0.5, 0.45, 0.8), uGlow * smoothstep(0.08, 0.6, h) * 0.55);
        float cs = max(dot(d, normalize(uSun)), 0.0);
        dc += vec3(1.0, 0.8, 0.52) * (pow(cs, 1800.0) * 14.0 + pow(cs, 80.0) * 0.45 + pow(cs, 7.0) * 0.1 * (0.5 + uGlow)) * step(-0.05, uSun.y);
        vec3 c = mix(dc, nc, uNight);
        c = mix(c, mix(uFogCol, nc, uNight * 0.6), smoothstep(0.0, -0.06, h));
        c += uSkyFlash * exp(-max(h, 0.0) * 2.5) * 0.04 * uNight;
        gl_FragColor = vec4(c, 1.0); }`,
    side: THREE.BackSide, depthWrite: false
  })
);
sky.renderOrder = -2;
scene.add(sky);
(function stars() {
  const n = SMALL ? 1600 : 2800;
  const pos = new Float32Array(n * 3), size = new Float32Array(n), seed = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const z = R(0.03, 1), a = R(0, Math.PI * 2), s = Math.sqrt(1 - z * z);
    pos.set([s * Math.cos(a) * 2200, z * 2200, s * Math.sin(a) * 2200], i * 3);
    size[i] = rand() < 0.06 ? R(2.2, 3.2) : R(0.8, 1.7);
    seed[i] = rand();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const m = new THREE.ShaderMaterial({
    uniforms: { uTime: U.uTime, uPx: { value: DPR }, uNight: U.uNight },
    vertexShader: `attribute float aSize; attribute float aSeed; uniform float uTime; uniform float uPx; uniform float uNight; varying float vA;
      void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = aSize * uPx;
        vA = (0.55 + 0.45 * sin(uTime * (0.5 + aSeed * 2.0) + aSeed * 40.0)) * smoothstep(0.02, 0.3, normalize(position).y) * uNight * uNight;
        gl_Position = projectionMatrix * mv; gl_Position.z = gl_Position.w * 0.9999; }`,
    fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); if(d > 0.5) discard;
      gl_FragColor = vec4(vec3(0.9, 0.85, 0.78) * exp(-d * d * 22.0) * vA * 0.9, 1.0); }`,
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true
  });
  const p = new THREE.Points(g, m); p.frustumCulled = false; p.renderOrder = -1;
  sky.add(p);
})();

/* ---------------- glowing points (rooftop diyas, string lights, street lamps) ---------------- */
const glowMat = new THREE.ShaderMaterial({
  uniforms: { uTime: U.uTime, uLit: { value: 0.42 }, uWaveR: { value: -50 }, uScale: { value: 1 }, uBoost: { value: 1 }, uGain: { value: 1 }, uFogD: U.uFogD, uNight: U.uNight },
  vertexShader: `attribute float aSeed; attribute vec3 aCol; attribute float aSize; attribute float aKind;
    uniform float uTime, uLit, uWaveR, uScale, uBoost, uGain, uFogD, uNight; varying vec3 vC; varying float vA;
    void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); float dist = -mv.z;
      float d = length(position.xz);
      float on = step(aSeed, uLit);
      float passed = step(d, uWaveR);
      float ring = exp(-pow((d - uWaveR) / 12.0, 2.0)) * step(aKind, 0.5);
      float lit = aKind < 0.5 ? max(on, passed) : 1.0;
      float fl = aKind < 0.5 ? 0.7 + 0.3 * sin(uTime * 8.0 + aSeed * 91.0) * sin(uTime * 2.3 + aSeed * 17.0)
               : aKind < 1.5 ? 0.45 + 0.55 * step(0.5, fract(uTime * 0.8 + aSeed * 3.0)) : 0.8;
      vA = lit * fl + ring * 2.0;
      float fog = 1.0 - exp(-pow(uFogD * dist, 2.0)); vA *= (1.0 - fog * 0.8) * uGain * mix(0.18, 1.0, uNight);
      vC = aCol;
      gl_PointSize = clamp(aSize * uScale * uBoost / dist * (1.0 + ring * 1.5), 1.3, 38.0);
      gl_Position = projectionMatrix * mv; }`,
  fragmentShader: `varying vec3 vC; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); if(d > 0.5) discard;
      float core = exp(-d * d * 70.0); float halo = exp(-d * d * 14.0) * 0.35;
      gl_FragColor = vec4(vC * (core * 1.6 + halo * 0.6) * vA, 1.0); }`,
  blending: THREE.AdditiveBlending, depthWrite: false, transparent: true
});
const glowBuf = { pos: [], seed: [], col: [], size: [], kind: [] };
function addGlow(x, y, z, c, size, kind, seed = rand()) {
  glowBuf.pos.push(x, y, z); glowBuf.seed.push(seed); glowBuf.col.push(c[0], c[1], c[2]); glowBuf.size.push(size); glowBuf.kind.push(kind);
}
const DIYA_COLS = [[1, 0.42, 0.1], [1, 0.55, 0.18], [1, 0.34, 0.07]];
const BULB_COLS = [[1, 0.6, 0.12], [1, 0.22, 0.38], [0.35, 0.65, 1], [0.5, 1, 0.45], [1, 0.85, 0.5]];

/* ---------------- the city, all the way around you ---------------- */
const GROUND = G0;
const roofs = [];
const TEMPLES = [[-38, -70], [52, -118], [-90, -160], [18, -210], [-120, 70], [130, -30], [110, 90]];
const PAINT = ['#EFE3C8', '#E9C3BE', '#EBD58F', '#A9C7DA', '#B9D8C0', '#C98A68', '#C6B9D8', '#E8E6E1', '#EDB98D', '#F1D9A7', '#D6E3E8'];
(function city() {
  const box = new THREE.BoxGeometry(1, 1, 1); box.translate(0, 0.5, 0);
  const N = SMALL ? 2600 : 4300;
  const mesh = shadowy(new THREE.InstancedMesh(box.clone(), litMat(1, 1, 1, { win: 1 }), N));
  const seeds = new Float32Array(N);
  const rimParts = [];
  const t = 0.035;
  [[1, 0.9, t, 0, 0.45, 0.5 - t / 2], [1, 0.9, t, 0, 0.45, -0.5 + t / 2], [t, 0.9, 1, -0.5 + t / 2, 0.45, 0], [t, 0.9, 1, 0.5 - t / 2, 0.45, 0]].forEach(([w, h, d, x, y, z]) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); rimParts.push(g); });
  const rimGeo = mergeGeometries(rimParts);
  const rims = shadowy(new THREE.InstancedMesh(rimGeo, litMat(1, 1, 1), N));
  const tops = shadowy(new THREE.InstancedMesh(box.clone(), litMat(1, 1, 1, { win: 1 }), N));
  const topSeeds = new Float32Array(N);
  const tanks = shadowy(new THREE.InstancedMesh((() => { const g = new THREE.CylinderGeometry(0.62, 0.62, 1.15, 16); g.translate(0, 0.575, 0); return g; })(), litMat(1, 1, 1, { rough: 0.6 }), N));
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3(), col = new THREE.Color();
  const treeSpots = [];
  let i = 0, nt = 0, nk = 0;
  for (let z = 150; z > -385 && i < N;) {
    const d = R(4, 7.5), rowZ = z - d / 2;
    let x = -300 + R(0, 4);
    while (x < 300 && i < N) {
      const w = R(4, 9), cx = x + w / 2;
      x += w + R(0.8, 3.5);
      if (Math.abs(cx) < 11 + w / 2 && rowZ > -10.5 && rowZ < 12) continue;
      if (TEMPLES.some(([tx, tz]) => Math.abs(cx - tx) < 9 && Math.abs(rowZ - tz) < 9)) continue;
      if (SMALL && rand() < 0.3) continue;
      const dist = Math.hypot(cx, rowZ);
      let h = R(5, 12) + Math.max(0, dist - 40) * 0.028;
      if (rand() < 0.07 && dist > 60) h += R(10, 26);
      if (dist < 45) h = R(6, 12.5);
      h = Math.round(h / 1.4) * 1.4 + 0.2;
      p.set(cx, GROUND, rowZ); sc.set(w, h, d);
      m.compose(p, q, sc); mesh.setMatrixAt(i, m); seeds[i] = rand();
      col.set(pick(PAINT)); col.offsetHSL(0, R(-0.05, 0.05), R(-0.05, 0.03)); mesh.setColorAt(i, col);
      p.set(cx, GROUND + h, rowZ); sc.set(w, 1, d); m.compose(p, q, sc); rims.setMatrixAt(i, m);
      rims.setColorAt(i, col);
      roofs.push({ x: cx, y: GROUND + h, z: rowZ, w, d, dist });
      if (rand() < 0.62) {
        const tw = Math.min(w * 0.42, 3), td = Math.min(d * 0.48, 2.8), th = 2.6;
        const tx = cx + (rand() < 0.5 ? -1 : 1) * (w / 2 - tw / 2 - 0.3), tz = rowZ + (rand() < 0.5 ? -1 : 1) * (d / 2 - td / 2 - 0.3);
        p.set(tx, GROUND + h, tz); sc.set(tw, th, td); m.compose(p, q, sc); tops.setMatrixAt(nt, m); tops.setColorAt(nt, col); topSeeds[nt] = rand(); nt++;
        if (rand() < 0.75) { p.set(tx, GROUND + h + th, tz); sc.set(1, 1, 1); m.compose(p, q, sc); tanks.setMatrixAt(nk, m); tanks.setColorAt(nk, col.set(rand() < 0.8 ? '#1b1b1d' : (rand() < 0.5 ? '#2d63a8' : '#e9e4d8'))); nk++; }
      } else if (rand() < 0.5) {
        p.set(cx + R(-w / 4, w / 4), GROUND + h, rowZ + R(-d / 4, d / 4)); sc.set(1, 1, 1); m.compose(p, q, sc); tanks.setMatrixAt(nk, m); tanks.setColorAt(nk, col.set('#1b1b1d')); nk++;
      }
      i++;
      if (rand() < 0.08) addGlow(cx, GROUND + 4.5, rowZ + d / 2 + 1.4, [1, 0.55, 0.2], 0.45, 2, 0.1);
    }
    const gap = rand() < 0.22 ? R(5, 8) : R(1.2, 3);
    if (gap > 4.5) for (let tx = -300 + R(0, 8); tx < 300; tx += R(7, 13)) if (rand() < 0.55 && !(Math.abs(tx) < 12 && z > -12 && z < 14)) treeSpots.push([tx, z - d - gap / 2]);
    z -= d + gap;
  }
  mesh.count = i; rims.count = i; tops.count = nt; tanks.count = nk;
  mesh.geometry.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1));
  tops.geometry.setAttribute('aSeed', new THREE.InstancedBufferAttribute(topSeeds, 1));
  [mesh, rims, tops, tanks].forEach((o) => { o.frustumCulled = false; scene.add(o); });

  // trees: neem and ashoka along the streets
  const nT = Math.min(treeSpots.length, SMALL ? 260 : 520);
  const crowns = shadowy(new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 2), litMat(1, 1, 1, { rough: 1 }), nT));
  const trunks = shadowy(new THREE.InstancedMesh((() => { const g = new THREE.CylinderGeometry(0.16, 0.24, 1, 6); g.translate(0, 0.5, 0); return g; })(), litMat(0.22, 0.15, 0.09), nT));
  const greens = ['#3f6b2e', '#4d7a32', '#2f5a28', '#5c8a3a', '#466f30'];
  const e = new THREE.Euler();
  for (let k = 0; k < nT; k++) {
    const [tx, tz] = treeSpots[k];
    const r = R(1.5, 2.6), th = R(2.2, 3.4);
    q.identity(); p.set(tx, GROUND, tz); sc.set(1, th, 1); m.compose(p, q, sc); trunks.setMatrixAt(k, m);
    e.set(0, rand() * 6, 0); q.setFromEuler(e); p.set(tx, GROUND + th + r * 0.6, tz); sc.set(r, r * R(0.8, 1), r); m.compose(p, q, sc); crowns.setMatrixAt(k, m);
    crowns.setColorAt(k, col.set(pick(greens)));
  }
  q.identity();
  [crowns, trunks].forEach((o) => { o.frustumCulled = false; scene.add(o); });

  for (const r of roofs) {
    const y = r.y + 0.95;
    const k = rand() < 0.15 ? 0 : Math.floor(R(3, 9));
    for (let j = 0; j < k; j++) {
      const side = j % 4, tt = rand();
      let x = r.x, z = r.z;
      if (side === 0) { x = r.x - r.w / 2 + tt * r.w; z = r.z + r.d / 2; }
      else if (side === 1) { x = r.x - r.w / 2 + tt * r.w; z = r.z - r.d / 2; }
      else if (side === 2) { x = r.x - r.w / 2; z = r.z - r.d / 2 + tt * r.d; }
      else { x = r.x + r.w / 2; z = r.z - r.d / 2 + tt * r.d; }
      addGlow(x, y, z, pick(DIYA_COLS), 0.2, 0);
    }
    if (rand() < 0.13) {
      const n = 14, x0 = r.x - r.w / 2, y0 = r.y + 2.1, z0 = r.z + r.d / 2;
      for (let j = 0; j <= n; j++) {
        const tt = j / n;
        addGlow(x0 + tt * r.w, y0 - Math.sin(tt * Math.PI) * 0.8, z0, BULB_COLS[j % BULB_COLS.length], 0.14, 1);
      }
    }
  }
  const tm = litMat(0.78, 0.62, 0.45);
  TEMPLES.forEach(([tx, tz]) => {
    const h = R(16, 24);
    const base = shadowy(new THREE.Mesh(new THREE.BoxGeometry(9, 8, 9), tm)); base.position.set(tx, GROUND + 4, tz); scene.add(base);
    const plinth = shadowy(new THREE.Mesh(new THREE.BoxGeometry(11, 1.2, 11), tm)); plinth.position.set(tx, GROUND + 0.6, tz); scene.add(plinth);
    const spire = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.4, 4.2, h, 8, 6), tm)); spire.position.set(tx, GROUND + 8 + h / 2, tz); scene.add(spire);
    const kalash = shadowy(new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 8), litMat(0.9, 0.55, 0.1, { rough: 0.4 }))); kalash.position.set(tx, GROUND + 8 + h + 0.5, tz); scene.add(kalash);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1), litMat(0.95, 0.35, 0.05, { side: THREE.DoubleSide })); flag.position.set(tx + 0.8, GROUND + 8 + h + 2.4, tz); scene.add(flag);
    for (let j = 0; j < 26; j++) {
      const tt = j / 25, ry = GROUND + 8 + tt * h, rr = 4.2 * (1 - tt) + 0.4 * tt;
      for (let a = 0; a < 4; a++) {
        const ang = a * Math.PI / 2 + Math.PI / 4;
        addGlow(tx + Math.cos(ang) * rr, ry, tz + Math.sin(ang) * rr, [1, 0.55, 0.15], 0.26, 1, 0.2);
      }
    }
    addGlow(tx, GROUND + 8 + h + 0.8, tz, [1, 0.8, 0.4], 0.8, 2, 0.1);
  });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1500, 1300), litMat(0.26, 0.24, 0.22));
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, GROUND, -110); ground.receiveShadow = true; scene.add(ground);
})();
const frontRoofs = roofs.filter((r) => r.z < -50 && Math.abs(r.x) < 0.75 * -r.z + 30);
const nearFront = frontRoofs.filter((r) => r.z > -170);
const farRoofs = roofs.filter((r) => r.dist > 28);
const midRoofs = roofs.filter((r) => r.dist > 28 && r.dist < 230);

/* ---------------- your house + terrace ---------------- */
const house = shadowy(new THREE.Mesh(new THREE.BoxGeometry(14.3, 13.97, 13.3), litMat(0.92, 0.72, 0.42, { win: 1 })));
house.position.set(0, GROUND + 13.97 / 2, 1); scene.add(house);
const floorMat = litMat(0.5, 0.45, 0.4);
const floor = shadowy(new THREE.Mesh(new THREE.PlaneGeometry(14, 13), floorMat), false, true);
floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, 1); scene.add(floor);
const parapetMat = litMat(0.92, 0.72, 0.42);
const par = shadowy(new THREE.Mesh(new THREE.BoxGeometry(14, 1.05, 0.3), parapetMat)); par.position.set(0, 0.525, -5.6); scene.add(par);
const cap = shadowy(new THREE.Mesh(new THREE.BoxGeometry(14.3, 0.08, 0.42), litMat(0.85, 0.82, 0.76))); cap.position.set(0, 1.09, -5.6); scene.add(cap);
[-7, 7].forEach((x) => { const s = shadowy(new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.05, 13), parapetMat)); s.position.set(x, 0.525, 1); scene.add(s); });
const back = shadowy(new THREE.Mesh(new THREE.BoxGeometry(14, 1.05, 0.3), parapetMat)); back.position.set(0, 0.525, 7.5); scene.add(back);
const myTank = shadowy(new THREE.Mesh((() => { const g = new THREE.CylinderGeometry(0.62, 0.62, 1.2, 18); g.translate(0, 0.6, 0); return g; })(), litMat(0.03, 0.03, 0.035, { rough: 0.5 })));
myTank.position.set(-5.7, 0, 6.2); scene.add(myTank);
const plantMat = litMat(0.18, 0.4, 0.12, { rough: 1 }), potMat = litMat(0.55, 0.22, 0.1);
[[5.9, -4.6], [-5.9, -4.6], [5.9, 2.5]].forEach(([x, z]) => {
  const pot = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.2, 0.42, 12), potMat)); pot.position.set(x, 0.21, z); scene.add(pot);
  const pl = shadowy(new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 1), plantMat)); pl.position.set(x, 0.7, z); pl.scale.set(1, 1.2, 1); scene.add(pl);
});
const poleMat = litMat(0.3, 0.22, 0.14);
[[-6.6, -5.3], [6.6, -5.3]].forEach(([x, z]) => { const p = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 3.4, 6), poleMat)); p.position.set(x, 1.7, z); scene.add(p); });

function strand(a, b, sag, n, size) {
  const pts = [];
  for (let j = 0; j <= n; j++) {
    const t = j / n;
    const x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t - Math.sin(t * Math.PI) * sag, z = a[2] + (b[2] - a[2]) * t;
    pts.push(new THREE.Vector3(x, y, z));
    addGlow(x, y - 0.03, z, BULB_COLS[j % BULB_COLS.length], size, 1, j / n);
  }
  scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x0c0a12 })));
  return pts;
}
const STRAND = { start: glowBuf.seed.length, end: 0 };
strand([-6.6, 3.3, -5.3], [6.6, 3.3, -5.3], 0.75, 46, 0.07);
strand([-6.6, 3.3, -5.3], [6.8, 3.6, 7], 0.9, 40, 0.07);
strand([6.6, 3.3, -5.3], [-6.8, 3.6, 7], 0.9, 40, 0.07);
STRAND.end = glowBuf.seed.length;

const garland = (function () {
  const n = 160;
  const g = shadowy(new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 8, 6), litMat(1, 1, 1, { emis: [0.012, 0.004, 0] }), n), true, false);
  const m = new THREE.Matrix4(), c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const t = i / n, x = -6.6 + t * 13.2, loop = (t * 11) % 1;
    m.makeTranslation(x, 1.0 - Math.sin(loop * Math.PI) * 0.32, -5.43);
    g.setMatrixAt(i, m);
    c.setRGB(...(i % 7 === 3 ? [0.18, 0.5, 0.15] : (i % 2 ? [1, 0.55, 0.08] : [1, 0.78, 0.15])), LIN);
    g.setColorAt(i, c);
  }
  scene.add(g);
  return g;
})();

const kandils = [];
function kandil(x, color, lampIdx) {
  const sag = 0.75 * Math.sin((x + 6.6) / 13.2 * Math.PI);
  const pivot = new THREE.Group(); pivot.position.set(x, 3.3 - sag, -5.3); scene.add(pivot);
  const string = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.45, 4), new THREE.MeshBasicMaterial({ color: 0x241c2e }));
  string.position.y = -0.22; pivot.add(string);
  const body = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(...color, LIN) }));
  body.scale.set(1, 1.35, 1); body.position.y = -0.72; pivot.add(body);
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.005, 0.38, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(color[0] * 0.6, color[1] * 0.6, color[2] * 0.6, LIN) }));
  tail.position.y = -1.18; pivot.add(tail);
  kandils.push({ pivot, body, tail, color, lampIdx, ph: rand() * 6 });
}
kandil(2.7, [2.4, 0.45, 0.8], 10);
kandil(-3.6, [2.6, 1.1, 0.2], 11);

const DIYA_X = [-4.6, -3.45, -2.3, -1.15, 0, 1.15, 2.3, 3.45, 4.6];
const bowlGeo = new THREE.LatheGeometry([0, 0.05, 0.075, 0.087, 0.083, 0.06, 0].map((r, i) => new THREE.Vector2(r, [0, 0, 0.02, 0.045, 0.052, 0.034, 0.034][i])), 18);
const bowlMat = litMat(0.62, 0.27, 0.12, { side: THREE.DoubleSide });
const flameGeo = new THREE.SphereGeometry(1, 10, 8);
const diyas = DIYA_X.map((x, i) => {
  const bowl = new THREE.Mesh(bowlGeo, bowlMat); bowl.position.set(x, 1.13, -5.55); scene.add(bowl);
  const flame = new THREE.Mesh(flameGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(4, 1.8, 0.45, LIN) }));
  flame.position.set(x, 1.13 + 0.085, -5.55); flame.scale.set(0.02, 0.05, 0.02); flame.visible = false; scene.add(flame);
  lampPos[i].set(x, 1.32, -5.45);
  return { x, flame, lit: false, ph: rand() * 10, age: 0 };
});
function lightDiya(i) {
  const d = diyas[i]; if (!d || d.lit) return false;
  d.lit = true; d.age = 0; d.flame.visible = true;
  for (let k = 0; k < 18; k++) { const v = sph(); sparks.spawn(d.x, 1.22, -5.55, v[0] * 1.2, Math.abs(v[1]) * 1.6, v[2] * 1.2, [1, 0.7, 0.3], 0.05, R(0.3, 0.6), 0.9, 2, 0); }
  return true;
}
function updateDiyas(t, dt) {
  diyas.forEach((d, i) => {
    if (!d.lit) { lampCol[i].set(0, 0, 0); return; }
    d.age = Math.min(1, d.age + dt * 2.5);
    const f = 0.82 + 0.18 * Math.sin(t * 11 + d.ph) * Math.sin(t * 3.7 + d.ph * 2);
    d.flame.scale.set(0.02 * d.age, 0.05 * f * d.age, 0.02 * d.age);
    const k = lerp(0.35, 1, ENV.night);
    lampCol[i].set(1.1 * f * d.age * k, 0.48 * f * d.age * k, 0.14 * f * d.age * k);
  });
}

/* the rangoli on your terrace floor, drawn in the studio */
const rgTexCanvas = document.createElement('canvas'); rgTexCanvas.width = rgTexCanvas.height = 1024;
const rgTex = new THREE.CanvasTexture(rgTexCanvas);
rgTex.colorSpace = THREE.SRGBColorSpace; rgTex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
const rgPlane = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.6), litMat(1, 1, 1, { map: rgTex, transparent: true, alphaTest: 0.03, depthWrite: false, polyOff: true, emisMap: 0.16, rough: 1 }));
rgPlane.rotation.x = -Math.PI / 2; rgPlane.position.set(0, 0.012, -1.7); rgPlane.receiveShadow = true; rgPlane.renderOrder = 1;
scene.add(rgPlane);

// a soft beam that marks your home in Sky view
const beam = new THREE.Mesh(
  new THREE.CylinderGeometry(0.35, 1.5, 80, 24, 1, true),
  new THREE.ShaderMaterial({
    uniforms: { uA: { value: 0 }, uTime: U.uTime },
    vertexShader: `varying float vY; void main(){ vY = position.y / 80.0 + 0.5; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform float uA; uniform float uTime; varying float vY;
      void main(){ float a = pow(1.0 - vY, 2.2) * uA * (0.8 + 0.2 * sin(uTime * 2.0)); gl_FragColor = vec4(vec3(1.0, 0.58, 0.16) * a * 0.5, 1.0); }`,
    blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide
  })
);
beam.position.set(0, 48, 1); beam.visible = false; scene.add(beam);

/* ---------------- particles ---------------- */
const TRAIL = 1, GLIT = 2, CROSS = 4, BRANCH = 8, BOUNCE = 16, STROBE = 32, EMBER = 64, HEAVY = 128, GROW = 256, DONE = 512, STREAK = 1024, PAPER = 2048;
const EMB = [1, 0.36, 0.08];
function sph() { const z = 2 * rand() - 1, a = 6.2831853 * rand(), s = Math.sqrt(1 - z * z); return [s * Math.cos(a), z, s * Math.sin(a)]; }
function onTerrace(x, z) { return x > -6.8 && x < 6.8 && z > -5.42 && z < 7.4; }
class Particles {
  constructor(max, smoke) {
    this.max = max; this.smoke = smoke;
    this.pos = new Float32Array(max * 3); this.vel = new Float32Array(max * 3);
    this.col = new Float32Array(max * 3); this.c0 = new Float32Array(max * 3);
    this.size = new Float32Array(max); this.base = new Float32Array(max); this.alpha = new Float32Array(max);
    this.life = new Float32Array(max); this.ml = new Float32Array(max); this.lnd = new Float32Array(max); this.grav = new Float32Array(max);
    this.flags = new Uint16Array(max); this.alive = new Uint8Array(max); this.cur = 0;
    const g = new THREE.BufferGeometry();
    const att = (arr, n) => { const a = new THREE.BufferAttribute(arr, n); a.setUsage(THREE.DynamicDrawUsage); return a; };
    g.setAttribute('position', att(this.pos, 3)); g.setAttribute('aColor', att(this.col, 3));
    g.setAttribute('aSize', att(this.size, 1)); g.setAttribute('aAlpha', att(this.alpha, 1));
    this.geo = g;
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 1 } },
      vertexShader: `attribute float aSize; attribute float aAlpha; attribute vec3 aColor; uniform float uScale; varying vec3 vC; varying float vA;
        void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); float dist = max(-mv.z, 0.1);
          gl_PointSize = aSize > 0.0 ? clamp(aSize * uScale / dist, 1.0, ${smoke ? '260.0' : '72.0'}) : 0.0;
          vC = aColor; vA = aAlpha; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: smoke
        ? `varying vec3 vC; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); if(d > 0.5) discard; gl_FragColor = vec4(vC, min(1.0, vA * smoothstep(0.5, 0.0, d) * 0.3)); }`
        : `varying vec3 vC; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); if(d > 0.5) discard;
            float core = exp(-d * d * 60.0); float halo = exp(-d * d * 11.0) * 0.4; gl_FragColor = vec4(vC * (core * 2.6 + halo) * vA, 1.0); }`,
      blending: smoke ? THREE.NormalBlending : THREE.AdditiveBlending, depthWrite: false, transparent: true
    });
    this.points = new THREE.Points(g, this.mat); this.points.frustumCulled = false;
    if (smoke) this.points.renderOrder = 2;
    scene.add(this.points);
  }
  spawn(x, y, z, vx, vy, vz, c, size, life, drag, grav, flags) {
    let i = this.cur;
    for (let k = 0; k < 96; k++) { if (!this.alive[i]) break; i = (i + 1) % this.max; }
    this.cur = (i + 1) % this.max;
    const i3 = i * 3;
    this.pos[i3] = x; this.pos[i3 + 1] = y; this.pos[i3 + 2] = z;
    this.vel[i3] = vx; this.vel[i3 + 1] = vy; this.vel[i3 + 2] = vz;
    this.col[i3] = this.c0[i3] = c[0]; this.col[i3 + 1] = this.c0[i3 + 1] = c[1]; this.col[i3 + 2] = this.c0[i3 + 2] = c[2];
    this.size[i] = this.base[i] = size; this.alpha[i] = 1;
    this.life[i] = this.ml[i] = life; this.lnd[i] = Math.log(drag); this.grav[i] = grav; this.flags[i] = flags; this.alive[i] = 1;
    return i;
  }
  update(dt) {
    const P = this.pos, V = this.vel, C = this.col, C0 = this.c0;
    for (let i = 0; i < this.max; i++) {
      if (!this.alive[i]) continue;
      const l = this.life[i] - dt;
      if (l <= 0) { this.alive[i] = 0; this.size[i] = 0; this.alpha[i] = 0; continue; }
      this.life[i] = l;
      const t = 1 - l / this.ml[i], i3 = i * 3, f = this.flags[i];
      const dr = Math.exp(this.lnd[i] * dt * 60);
      if ((f & PAPER) && P[i3 + 1] > 0.02) { V[i3] += R(-1, 1) * dt * 9; V[i3 + 2] += R(-1, 1) * dt * 9; }
      V[i3] *= dr; V[i3 + 1] = V[i3 + 1] * dr - this.grav[i] * dt; V[i3 + 2] *= dr;
      P[i3] += V[i3] * dt; P[i3 + 1] += V[i3 + 1] * dt; P[i3 + 2] += V[i3 + 2] * dt;
      if ((f & BOUNCE) && P[i3 + 1] < 0.01 && V[i3 + 1] < 0 && onTerrace(P[i3], P[i3 + 2])) {
        const pp = (f & PAPER) ? 0 : 1;
        P[i3 + 1] = 0.01; V[i3 + 1] *= -0.3 * pp; V[i3] *= 0.55 * pp; V[i3 + 2] *= 0.55 * pp;
      }
      if (this.smoke) {
        if (f & GROW) { this.alpha[i] = Math.sin(Math.min(1, t * 1.2) * Math.PI) * 0.9; this.size[i] = this.base[i] * (1 + t * 2.4); }
        else this.alpha[i] = 3.2 * (t < 0.85 ? 1 : (1 - t) / 0.15);
        continue;
      }
      let a = t < 0.72 ? 1 : 1 - (t - 0.72) / 0.28;
      if ((f & GLIT) && t > 0.35) a *= rand() < 0.45 ? 0.08 : 1.6;
      if ((f & STROBE) && t > 0.3) a *= Math.sin(l * 55 + i) > 0.2 ? 1.8 : 0;
      this.alpha[i] = a;
      this.size[i] = this.base[i] * (1 - 0.45 * t);
      if (f & EMBER) { const k = Math.min(1, t * 1.6); C[i3] = C0[i3] + (EMB[0] - C0[i3]) * k; C[i3 + 1] = C0[i3 + 1] + (EMB[1] - C0[i3 + 1]) * k; C[i3 + 2] = C0[i3 + 2] + (EMB[2] - C0[i3 + 2]) * k; }
      if ((f & TRAIL) && rand() < ((f & HEAVY) ? 26 : 9) * dt) {
        this.spawn(P[i3], P[i3 + 1], P[i3 + 2], V[i3] * 0.05 + R(-0.3, 0.3), V[i3 + 1] * 0.05 + R(-0.3, 0.3), V[i3 + 2] * 0.05 + R(-0.3, 0.3),
          [C[i3] * 0.9 + 0.1, C[i3 + 1] * 0.75 + 0.1, C[i3 + 2] * 0.5], this.base[i] * 0.6, R(0.35, (f & HEAVY) ? 1.2 : 0.7), 0.9, (f & HEAVY) ? 3.5 : 2, EMBER);
      }
      if ((f & STREAK) && t < 0.8 && rand() < 22 * dt) {
        this.spawn(P[i3], P[i3 + 1], P[i3 + 2], V[i3] * 0.15, V[i3 + 1] * 0.15, V[i3 + 2] * 0.15, [C[i3] * 0.8, C[i3 + 1] * 0.8, C[i3 + 2] * 0.8], this.base[i] * 0.55, R(0.16, 0.3), 0.9, 1, 0);
      }
      if ((f & CROSS) && t > 0.46) {
        this.alive[i] = 0; this.size[i] = 0;
        const vx = V[i3], vy = V[i3 + 1], vz = V[i3 + 2];
        const vl = Math.hypot(vx, vy, vz) || 1;
        const ax = new THREE.Vector3(vx / vl, vy / vl, vz / vl);
        const p1 = new THREE.Vector3(-ax.y, ax.x, 0.3).normalize(), p2 = new THREE.Vector3().crossVectors(ax, p1);
        for (let k = 0; k < 4; k++) {
          const ang = k * Math.PI / 2;
          const d = p1.clone().multiplyScalar(Math.cos(ang)).add(p2.clone().multiplyScalar(Math.sin(ang)));
          this.spawn(P[i3], P[i3 + 1], P[i3 + 2], d.x * 7 + vx * 0.2, d.y * 7 + vy * 0.2, d.z * 7 + vz * 0.2, [C[i3], C[i3 + 1], C[i3 + 2]], this.base[i] * 0.8, R(0.8, 1.1), 0.96, 4, TRAIL | GLIT);
        }
        continue;
      }
      if ((f & BRANCH) && t > 0.5 && !(f & DONE)) {
        this.flags[i] = f | DONE;
        for (let k = 0; k < 3; k++) { const d = sph(); this.spawn(P[i3], P[i3 + 1], P[i3 + 2], d[0] * 2.4, d[1] * 2.4, d[2] * 2.4, [1, 0.95, 0.8], this.base[i] * 0.7, R(0.06, 0.13), 0.85, 0, 0); }
      }
    }
    const a = this.geo.attributes;
    a.position.needsUpdate = true; a.aSize.needsUpdate = true; a.aAlpha.needsUpdate = true; a.aColor.needsUpdate = true;
  }
}
const sparks = new Particles(SMALL ? 28000 : 48000, false);
const smoke = new Particles(3200, true);
function puff(x, y, z, n, big = 1) {
  const k = ENV.night, c = [lerp(0.42, 0.07, k), lerp(0.41, 0.06, k), lerp(0.43, 0.08, k)];
  for (let j = 0; j < n; j++) smoke.spawn(x + R(-0.1, 0.1) * big, y + R(0, 0.2), z + R(-0.1, 0.1) * big, R(-0.25, 0.25), R(0.25, 0.7), R(-0.25, 0.25),
    c, R(0.3, 0.5) * big, R(2.5, 4.5), 0.985, -0.05, GROW);
}

/* ---------------- sound (synthesised, no files) ---------------- */
const A = { ctx: null, out: null, noise: null, muffle: null, master: null };
function audioInit() {
  if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume(); return; }
  try { const C = window.AudioContext || window.webkitAudioContext; A.ctx = new C(); } catch (e) { return; }
  const ctx = A.ctx, sr = ctx.sampleRate;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 6; comp.attack.value = 0.002; comp.release.value = 0.25;
  A.master = ctx.createGain(); A.master.gain.value = S.sound ? 1 : 0;
  A.muffle = ctx.createBiquadFilter(); A.muffle.type = 'lowpass'; A.muffle.frequency.value = 20000; A.muffle.Q.value = 0.5;
  A.out = ctx.createGain(); A.out.gain.value = 0.85;
  A.out.connect(A.muffle); A.muffle.connect(comp); comp.connect(A.master); A.master.connect(ctx.destination);
  // city echo: early reflections off buildings and a long tail
  const len = Math.floor(sr * 2.8), ir = ctx.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.4) * 0.5;
    [0.09, 0.17, 0.31, 0.47].forEach((t, k) => { const s = Math.floor((t + ch * 0.013) * sr); for (let j = 0; j < 220; j++) d[s + j] += (Math.random() * 2 - 1) * (0.55 - k * 0.1) * (1 - j / 220); });
  }
  A.verb = ctx.createConvolver(); A.verb.buffer = ir;
  A.send = ctx.createGain(); A.send.gain.value = 0.32;
  A.out.connect(A.send); A.send.connect(A.verb); A.verb.connect(A.muffle);
  const nb = ctx.createBuffer(1, sr * 2, sr), nd = nb.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  A.noise = nb;
  const curve = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; curve[i] = Math.tanh(x * 6); }
  A.curve = curve;
}
const live = () => A.ctx && S.sound && A.ctx.state === 'running';
function nsrc(t, dur) { const s = A.ctx.createBufferSource(); s.buffer = A.noise; s.loop = true; s.start(t, rand() * 1.5); s.stop(t + dur + 0.05); return s; }
function env(g, t, peak, att, dec) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + att); g.gain.exponentialRampToValueAtTime(0.0001, t + att + dec); }
function sBoom(dist, big = 1) {
  if (!live()) return; const ctx = A.ctx, t = ctx.currentTime + Math.min(dist, 400) / 343;
  const vol = Math.min(1.2, big * 1.5 / (1 + dist / 50));
  if (vol < 0.03) return;
  const s = nsrc(t, 2.2), lp = ctx.createBiquadFilter(), g = ctx.createGain();
  lp.type = 'lowpass'; lp.frequency.setValueAtTime(2600 / (1 + dist / 200), t); lp.frequency.exponentialRampToValueAtTime(160, t + 1.3);
  env(g, t, vol, 0.006, 1.9); s.connect(lp).connect(g).connect(A.out);
  const o = ctx.createOscillator(), g2 = ctx.createGain(); o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(30, t + 0.55);
  env(g2, t, vol * 0.9, 0.005, 0.75); o.connect(g2).connect(A.out); o.start(t); o.stop(t + 0.9);
}
function sBigBomb(near) {
  if (!live()) return; const ctx = A.ctx, t = ctx.currentTime + (near ? 0 : 0.18);
  const v = near ? 1 : 0.45;
  const s1 = nsrc(t, 0.3), hp = ctx.createBiquadFilter(), ws = ctx.createWaveShaper(), g1 = ctx.createGain();
  hp.type = 'highpass'; hp.frequency.value = 700; ws.curve = A.curve;
  env(g1, t, 1.7 * v, 0.0008, 0.2); s1.connect(hp).connect(ws).connect(g1).connect(A.out);
  const s2 = nsrc(t, 2), lp = ctx.createBiquadFilter(), g2 = ctx.createGain();
  lp.type = 'lowpass'; lp.frequency.setValueAtTime(3200, t); lp.frequency.exponentialRampToValueAtTime(120, t + 1.4);
  env(g2, t, 1.5 * v, 0.003, 1.7); s2.connect(lp).connect(g2).connect(A.out);
  const o = ctx.createOscillator(), g3 = ctx.createGain(); o.type = 'sine';
  o.frequency.setValueAtTime(78, t); o.frequency.exponentialRampToValueAtTime(22, t + 0.9);
  env(g3, t, 2.0 * v, 0.003, 1.1); o.connect(g3).connect(A.out); o.start(t); o.stop(t + 1.3);
  for (let k = 0; k < 14; k++) {
    const tt = t + 0.35 + rand() * 1.2, s = nsrc(tt, 0.04), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'bandpass'; f.frequency.value = R(1500, 4000); env(g, tt, 0.1 * v * R(0.3, 1), 0.001, 0.03); s.connect(f).connect(g).connect(A.out);
  }
  if (near) {
    const fr = A.muffle.frequency; fr.cancelScheduledValues(t); fr.setValueAtTime(20000, t); fr.exponentialRampToValueAtTime(520, t + 0.04); fr.setValueAtTime(520, t + 0.35); fr.exponentialRampToValueAtTime(20000, t + 2.2);
    const ring = ctx.createOscillator(), gr = ctx.createGain(); ring.frequency.value = 3900;
    gr.gain.setValueAtTime(0.0001, t); gr.gain.exponentialRampToValueAtTime(0.035, t + 0.15); gr.gain.exponentialRampToValueAtTime(0.0001, t + 2.0);
    ring.connect(gr).connect(A.master); ring.start(t); ring.stop(t + 2.1);
  }
}
function sCrackle(dist, dur, dens, delay = 0.35) {
  if (!live() || dist > 260) return; const ctx = A.ctx, t0 = ctx.currentTime + dist / 343 + delay;
  const n = Math.min(70, Math.floor(dur * dens)), vol = 0.6 / (1 + dist / 60);
  for (let k = 0; k < n; k++) {
    const t = t0 + rand() * dur, s = nsrc(t, 0.05), hp = ctx.createBiquadFilter(), g = ctx.createGain();
    hp.type = 'highpass'; hp.frequency.value = R(2200, 6000); env(g, t, vol * R(0.3, 1), 0.001, R(0.015, 0.04)); s.connect(hp).connect(g).connect(A.out);
  }
}
function sWhoosh(dur, vol = 0.22) {
  if (!live()) return; const ctx = A.ctx, t = ctx.currentTime, s = nsrc(t, dur + 0.2), bp = ctx.createBiquadFilter(), g = ctx.createGain();
  bp.type = 'bandpass'; bp.Q.value = 2.5; bp.frequency.setValueAtTime(500, t); bp.frequency.exponentialRampToValueAtTime(2800, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.08); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.1);
  s.connect(bp).connect(g).connect(A.out);
}
function sHiss(dur, freq = 4200, vol = 0.18) {
  if (!live()) return; const ctx = A.ctx, t = ctx.currentTime, s = nsrc(t, dur + 0.3), bp = ctx.createBiquadFilter(), g = ctx.createGain();
  bp.type = 'bandpass'; bp.Q.value = 0.7; bp.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.25); g.gain.setValueAtTime(vol, t + Math.max(0.3, dur - 0.6)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(bp).connect(g).connect(A.out);
}
function sPop(vol = 0.5) {
  if (!live()) return; const ctx = A.ctx, t = ctx.currentTime, s = nsrc(t, 0.12), hp = ctx.createBiquadFilter(), g = ctx.createGain();
  hp.type = 'highpass'; hp.frequency.value = R(700, 1400); env(g, t, vol, 0.001, 0.08); s.connect(hp).connect(g).connect(A.out);
}

/* ---------------- shells and explosions ---------------- */
const PAL = [
  [[1, 0.62, 0.18], [1, 0.86, 0.5]], [[1, 0.25, 0.42], [1, 0.7, 0.78]], [[0.25, 0.75, 1], [0.8, 0.93, 1]],
  [[0.35, 1, 0.45], [0.88, 1, 0.75]], [[1, 0.38, 0.06], [1, 0.75, 0.3]], [[0.65, 0.35, 1], [0.95, 0.78, 1]], [[1, 1, 1], [1, 0.8, 0.5]]
];
const TYPES = ['peony', 'chrys', 'willow', 'ring', 'crossette', 'palm', 'double', 'kamuro', 'strobe', 'peony', 'chrys', 'willow'];
const shells = [];
const GRAV_SHELL = 9;
function launchShell(o, tgt, opts = {}) {
  const T = opts.T || clamp(o.distanceTo(tgt) / 62, 1.0, 2.1);
  const v = new THREE.Vector3((tgt.x - o.x) / T, (tgt.y - o.y) / T + 0.5 * GRAV_SHELL * T, (tgt.z - o.z) / T);
  shells.push({ p: o.clone(), v, t: 0, T, type: opts.type || pick(TYPES), pal: opts.pal || pick(PAL), sc: opts.sc || 1, name: opts.name || null, mine: !!opts.mine, small: !!opts.small, onBurst: opts.onBurst });
  if (opts.mine) sWhoosh(T, 0.2);
}
function updateShells(dt) {
  for (let i = shells.length - 1; i >= 0; i--) {
    const s = shells[i];
    s.t += dt; s.v.y -= GRAV_SHELL * dt; s.p.addScaledVector(s.v, dt);
    const n = s.small ? 2 : 4;
    for (let k = 0; k < n; k++) {
      sparks.spawn(s.p.x + R(-0.1, 0.1), s.p.y, s.p.z + R(-0.1, 0.1), -s.v.x * 0.06 + R(-0.8, 0.8), -s.v.y * 0.06 + R(-0.8, 0.4), -s.v.z * 0.06 + R(-0.8, 0.8),
        [1, 0.6, 0.22], (s.small ? 0.1 : 0.14) * s.sc, R(0.35, 0.8), 0.92, 3, EMBER | (rand() < 0.3 ? GLIT : 0));
    }
    sparks.spawn(s.p.x, s.p.y, s.p.z, 0, 0, 0, [1, 0.9, 0.7], (s.small ? 0.18 : 0.26) * s.sc, 0.05, 1, 0, 0);
    if (s.t >= s.T) { shells.splice(i, 1); explode(s.p, s.type, s.pal, s.sc * (s.small ? 0.55 : 1), s); }
  }
}
function explode(p, type, pal, sc, s = {}) {
  const [c1, c2] = pal, spd = 14 * sc, sz = 0.6 * sc;
  const one = (d, v, c, size, life, drag, grav, flags) => sparks.spawn(p.x, p.y, p.z, d[0] * v, d[1] * v, d[2] * v, c, size, life, drag, grav, (flags & (TRAIL | STROBE)) ? flags : flags | STREAK);
  const rep = (n, f) => { const m = SMALL ? Math.ceil(n * 0.7) : n; for (let i = 0; i < m; i++) f(i, m); };
  switch (type) {
    case 'chrys': rep(150, () => one(sph(), spd * R(0.88, 1.08), c1, sz, R(1.8, 2.3), 0.962, 4, TRAIL | EMBER)); break;
    case 'willow': rep(120, () => one(sph(), spd * R(0.7, 0.85), [1, 0.62, 0.22], sz * 0.8, R(3.2, 4.3), 0.952, 7, TRAIL | HEAVY | EMBER)); break;
    case 'ring': {
      const nrm = new THREE.Vector3(...sph()), a1 = new THREE.Vector3(-nrm.y, nrm.x, 0.2).normalize(), a2 = new THREE.Vector3().crossVectors(nrm, a1);
      rep(110, (i, m) => { const a = i / m * Math.PI * 2; const d = a1.clone().multiplyScalar(Math.cos(a)).add(a2.clone().multiplyScalar(Math.sin(a))); one([d.x, d.y, d.z], spd, c1, sz, R(1.6, 2), 0.962, 3, GLIT); });
      rep(40, () => one(sph(), spd * 0.3, c2, sz * 0.8, R(1.2, 1.6), 0.95, 3, 0));
      break;
    }
    case 'crossette': rep(42, () => one(sph(), spd * 0.95, c1, sz * 1.1, R(1.3, 1.5), 0.965, 4, CROSS | TRAIL)); break;
    case 'palm':
      rep(14, () => { const d = sph(); d[1] = Math.abs(d[1]) * 0.6 + 0.2; one(d, spd * R(0.8, 0.95), [1, 0.6, 0.2], sz * 1.6, R(2.4, 2.8), 0.975, 6, TRAIL | HEAVY | EMBER); });
      rep(50, () => one(sph(), spd * 0.4, c1, sz * 0.8, R(1, 1.5), 0.95, 3, GLIT));
      break;
    case 'double':
      rep(130, () => one(sph(), spd * R(0.95, 1.05), c1, sz, R(1.6, 2.1), 0.962, 4, 0));
      rep(80, () => one(sph(), spd * R(0.45, 0.55), c2, sz * 0.85, R(1.4, 1.8), 0.962, 4, GLIT));
      break;
    case 'kamuro': rep(190, () => one(sph(), spd * R(0.8, 1), [1, 0.78, 0.4], sz * 0.75, R(2.6, 3.4), 0.955, 5, GLIT | TRAIL | EMBER)); break;
    case 'strobe': rep(150, () => one(sph(), spd * R(0.85, 1), [1, 0.97, 0.92], sz * 0.8, R(1.8, 2.4), 0.962, 4, STROBE)); break;
    default: rep(170, () => one(sph(), spd * R(0.88, 1.1), rand() < 0.55 ? c1 : c2, sz, R(1.5, 2.1), 0.962, 4, rand() < 0.3 ? GLIT : 0));
  }
  rep(30, () => one(sph(), spd * 0.12, [1, 0.95, 0.85], sz * 1.3, 0.12, 0.9, 0, 0));
  const dist = p.distanceTo(camera.position);
  addFlash(p, c1[0] * 0.7 + 0.3, c1[1] * 0.6 + 0.25, c1[2] * 0.45 + 0.15, (S.view === 'aerial' ? 20 : 34) * sc * (s.small ? 0.4 : 1) * lerp(0.3, 1, ENV.night), 0.03, 2.8);
  skyFlash.add(new THREE.Vector3(c1[0], c1[1], c1[2]).multiplyScalar(Math.min(1.5, 140 / dist)));
  sBoom(dist, s.small ? 0.5 : 1);
  if (type === 'kamuro' || type === 'strobe' || type === 'willow' || type === 'crossette') sCrackle(dist, 1.6, 34);
  if (s.name) {
    if (s.mine || S.view === 'roof') showLabel(p, s.name, s.mine ? 'mine' : '', 4.2);
    else if (dist < 380) showLabel(p, s.name, dist > 200 ? 'far' : '', 3.6);
  }
  if (s.onBurst) s.onBurst(p);
}

/* ---------------- the rest of India: rockets from rooftops, crackers on terraces ---------------- */
let ambT = 0.6, fxT = 2, mdRush = 0;
function launchAmbient(named) {
  const pool = S.view === 'aerial' ? farRoofs : frontRoofs;
  const r = pick(pool);
  const o = new THREE.Vector3(r.x + R(-r.w / 3, r.w / 3), r.y + 0.4, r.z + R(-r.d / 3, r.d / 3));
  const t = new THREE.Vector3(o.x + R(-10, 10), Math.max(r.y + R(30, 58), 22), o.z + R(-10, 10));
  const nm = named || null;
  launchShell(o, t, { sc: 1.55, name: nm });
  addFlash(o, 1, 0.65, 0.3, 6 * ENV.night, 0.08, 6);
}
class RoofFx {
  constructor(r, kind) {
    this.p = new THREE.Vector3(r.x + R(-r.w / 3, r.w / 3), r.y + 0.1, r.z + R(-r.d / 3, r.d / 3));
    this.kind = kind; this.t = 0; this.dur = R(3.5, 5.5); this.carry = 0; this.ang = 0;
  }
  update(dt) {
    this.t += dt; const t = this.t, p = this.p;
    const k = t < 0.4 ? t / 0.4 : t < this.dur - 0.8 ? 1 : Math.max(0, (this.dur - t) / 0.8);
    this.carry += (SMALL ? 150 : 240) * k * dt;
    if (this.kind === 'anar') {
      while (this.carry >= 1) {
        this.carry -= 1;
        const a = R(0, 6.283), sp = R(0, 0.3), v = R(9, 17);
        sparks.spawn(p.x, p.y + 0.3, p.z, Math.sin(sp) * Math.cos(a) * v, Math.cos(sp) * v, Math.sin(sp) * Math.sin(a) * v, rand() < 0.65 ? [1, 0.66, 0.26] : [1, 0.93, 0.8], R(0.11, 0.16), R(0.9, 1.5), 0.976, 13, EMBER);
      }
    } else {
      this.ang += 30 * k * dt;
      while (this.carry >= 1) {
        this.carry -= 1;
        const a = this.ang + R(0, 6.283), rx = Math.cos(a), rz = Math.sin(a), v = R(5, 9) * k;
        sparks.spawn(p.x + rx * 0.3, p.y + 0.1, p.z + rz * 0.3, -rz * v + rx * R(0, 2), R(0.4, 2.4), rx * v + rz * R(0, 2), rand() < 0.7 ? [0.4, 1, 0.5] : [1, 0.85, 0.4], R(0.1, 0.14), R(0.35, 0.7), 0.93, 6, EMBER);
      }
    }
    return t < this.dur;
  }
}
function roofFx() {
  const pool = S.view === 'aerial' ? midRoofs : nearFront;
  const r = pick(pool), kind = rand() < 0.55 ? 'anar' : 'chakri';
  emitters.push(new RoofFx(r, kind));
}
function ambientTick(dt) {
  ambT -= dt; fxT -= dt;
  const dayCalm = lerp(3.2, 1, ENV.night);
  if (ambT <= 0) {
    const base = mdRush > 0 ? 0.12 : (S.view === 'aerial' ? 0.42 : (S.mode === 'landing' ? 0.85 : 1.25)) * dayCalm;
    ambT = base * R(0.5, 1.6) * (REDUCED ? 2 : 1);
    launchAmbient();
  }
  if (fxT <= 0) {
    fxT = (S.view === 'aerial' ? 0.8 : 3.8) * R(0.6, 1.4) * (REDUCED ? 2 : 1) * dayCalm;
    if (emitters.filter((e) => e instanceof RoofFx).length < (SMALL ? 4 : 7)) roofFx();
  }
}

/* ---------------- ground fireworks on your terrace ---------------- */
const emitters = [];
const propMat = (r, g, b) => litMat(r, g, b);
class Anar {
  constructor(p, fizz) {
    this.p = p; this.t = 0; this.dur = 5; this.carry = 0; this.fizz = fizz;
    this.mesh = shadowy(new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.36, 18), propMat(0.6, 0.07, 0.06)));
    this.mesh.position.set(p.x, 0.18, p.z); scene.add(this.mesh);
    this.band = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.11, 0.06, 18), propMat(0.9, 0.62, 0.12));
    this.band.position.set(p.x, 0.12, p.z); scene.add(this.band);
    this.fl = addFlash(p, 1, 0.6, 0.25, 0, 0.5, 6);
    if (!fizz) sHiss(this.dur, 3800, 0.22);
  }
  update(dt) {
    this.t += dt; const t = this.t, p = this.p;
    if (this.fizz) { if (t < 1.2 && rand() < 0.3) sparks.spawn(p.x, 0.37, p.z, R(-0.5, 0.5), R(1, 2), R(-0.5, 0.5), [1, 0.6, 0.2], 0.04, 0.3, 0.9, 3, 0); if (t > 0.6 && t < 0.7) puff(p.x, 0.4, p.z, 6, 0.8); return t < 3 || this.remove(); }
    const k = t < 0.5 ? t / 0.5 : t < this.dur - 1.2 ? 1 : Math.max(0, (this.dur - t) / 1.2);
    const surge = 0.8 + 0.4 * Math.sin(t * 9) * Math.sin(t * 3.3);
    this.carry += 520 * k * surge * dt * (SMALL ? 0.7 : 1);
    while (this.carry >= 1) {
      this.carry -= 1;
      const a = R(0, Math.PI * 2), sp = R(0, 0.26) * (0.7 + 0.3 * k), spd = R(8, 14) * (0.55 + 0.45 * k);
      const d = [Math.sin(sp) * Math.cos(a), Math.cos(sp), Math.sin(sp) * Math.sin(a)];
      const r = rand(), c = r < 0.62 ? [1, 0.68, 0.28] : r < 0.88 ? [1, 0.93, 0.8] : [0.85, 0.9, 1];
      sparks.spawn(p.x, 0.37, p.z, d[0] * spd, d[1] * spd, d[2] * spd, c, R(0.045, 0.075), R(0.9, 1.6), 0.978, 9.8, BOUNCE | EMBER | (r > 0.88 ? GLIT : 0) | (rand() < 0.05 ? BRANCH : 0));
    }
    if (k > 0) setFlash(this.fl, { x: p.x, y: 1.0, z: p.z }, 1, 0.62, 0.28, 3.2 * k * surge, 1.0);
    if (rand() < 0.25 * k) puff(p.x, 0.5, p.z, 1, 0.7);
    if (t > this.dur) { this.mesh.material = propMat(0.06, 0.05, 0.05); }
    return t < this.dur + 2.5 || this.remove();
  }
  remove() { scene.remove(this.mesh); scene.remove(this.band); return false; }
}
class Chakri {
  constructor(p, fizz) {
    this.p = p.clone(); this.t = 0; this.dur = 4.6; this.ang = 0; this.carry = 0; this.fizz = fizz; this.drift = new THREE.Vector3();
    this.mesh = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.032, 8, 26), propMat(0.1, 0.45, 0.18)); ring.rotation.x = -Math.PI / 2;
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.05, 10), propMat(0.75, 0.12, 0.1));
    this.mesh.add(ring, hub); this.mesh.position.set(p.x, 0.035, p.z); scene.add(this.mesh);
    this.fl = addFlash(p, 1, 0.7, 0.3, 0, 0.6, 6);
    if (!fizz) sHiss(this.dur, 5200, 0.2);
  }
  update(dt) {
    this.t += dt; const t = this.t;
    if (this.fizz) { if (t > 0.5 && t < 0.6) puff(this.p.x, 0.1, this.p.z, 5, 0.6); return t < 2.5 || this.remove(); }
    const k = t < 0.4 ? t / 0.4 : t < this.dur - 0.8 ? 1 : Math.max(0, (this.dur - t) / 0.8);
    this.ang += 32 * k * dt;
    this.drift.add(new THREE.Vector3(R(-1, 1), 0, R(-1, 1)).multiplyScalar(dt * 1.4)).multiplyScalar(0.97);
    this.p.addScaledVector(this.drift, dt);
    this.p.x = clamp(this.p.x, -6, 6); this.p.z = clamp(this.p.z, -5, 6);
    this.mesh.position.set(this.p.x, 0.035, this.p.z); this.mesh.rotation.y = -this.ang;
    const phase = t < 1.6 ? 0 : t < 3.1 ? 1 : 2;
    const cols = [[[1, 0.66, 0.22], [1, 0.9, 0.6]], [[0.35, 1, 0.45], [0.85, 1, 0.7]], [[1, 0.25, 0.45], [1, 0.8, 0.85]]][phase];
    this.carry += 700 * k * dt * (SMALL ? 0.7 : 1);
    while (this.carry >= 1) {
      this.carry -= 1;
      const a = this.ang + R(0, Math.PI * 2), rx = Math.cos(a), rz = Math.sin(a), spd = R(3.5, 7) * k;
      sparks.spawn(this.p.x + rx * 0.15, 0.05, this.p.z + rz * 0.15, -rz * spd + rx * R(0, 1.5), R(0.3, 1.8), rx * spd + rz * R(0, 1.5),
        rand() < 0.75 ? cols[0] : cols[1], R(0.04, 0.065), R(0.3, 0.65), 0.93, 6, BOUNCE | EMBER);
    }
    sparks.spawn(this.p.x, 0.06, this.p.z, 0, 0, 0, cols[1], 0.22 * k, 0.05, 1, 0, 0);
    if (k > 0) setFlash(this.fl, { x: this.p.x, y: 0.6, z: this.p.z }, cols[0][0], cols[0][1], cols[0][2], 2.6 * k, 1.0);
    if (rand() < 0.15 * k) puff(this.p.x, 0.15, this.p.z, 1, 0.6);
    return t < this.dur + 1.5 || this.remove();
  }
  remove() { scene.remove(this.mesh); return false; }
}
const shockMat = () => new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(2.4, 1.5, 0.7, LIN), transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
class Bomb {
  constructor(p, fizz) {
    this.p = p; this.t = 0; this.fuse = 1.8; this.done = false; this.fizz = fizz; this.bt = 0;
    this.mesh = new THREE.Group();
    const ball = shadowy(new THREE.Mesh(new THREE.SphereGeometry(0.13, 18, 12), propMat(0.5, 0.36, 0.2))); ball.position.y = 0.13;
    const tw = propMat(0.85, 0.78, 0.6);
    for (let k = 0; k < 4; k++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.132, 0.008, 4, 24), tw); r.position.y = 0.13; r.rotation.set(rand() * 3, rand() * 3, 0); this.mesh.add(r); }
    const fz = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.14, 5), propMat(0.4, 0.4, 0.4)); fz.position.set(0.03, 0.3, 0); fz.rotation.z = -0.4;
    this.mesh.add(ball, fz); this.mesh.position.set(p.x, 0, p.z); scene.add(this.mesh);
    this.fl = addFlash(p, 1, 0.7, 0.3, 0, 0.8, 8);
    sHiss(this.fuse, 6000, 0.14);
  }
  update(dt) {
    this.t += dt; const p = this.p;
    if (this.t < this.fuse) {
      const k = this.t / this.fuse;
      const tip = { x: p.x + 0.05 - 0.04 * k, y: 0.36 - 0.12 * k, z: p.z };
      for (let j = 0; j < 5; j++) sparks.spawn(tip.x, tip.y, tip.z, R(-1.4, 1.4), R(0.3, 2.2), R(-1.4, 1.4), [1, 0.75, 0.35], 0.03, R(0.1, 0.3), 0.85, 4, 0);
      setFlash(this.fl, { x: tip.x, y: 0.5, z: tip.z }, 1, 0.7, 0.3, 1.6 + rand(), 1.2);
      if (rand() < 0.25) puff(tip.x, tip.y, tip.z, 1, 0.3);
      return true;
    }
    if (!this.done) {
      this.done = true; scene.remove(this.mesh);
      if (this.fizz) { puff(p.x, 0.15, p.z, 10, 1); return this.t < 3; }
      const near = S.view === 'roof';
      addFlash({ x: p.x, y: 1.2, z: p.z }, 1, 0.85, 0.6, 120, 0.6, 6);
      skyFlash.add(new THREE.Vector3(1, 0.7, 0.4).multiplyScalar(2));
      for (let k = 0; k < (SMALL ? 260 : 420); k++) { const d = sph(); const v = R(12, 30); sparks.spawn(p.x, 0.18, p.z, d[0] * v, Math.abs(d[1]) * v * 0.85, d[2] * v, rand() < 0.7 ? [1, 0.88, 0.62] : [1, 0.5, 0.15], R(0.045, 0.09), R(0.15, 0.6), 0.87, 9, BOUNCE | EMBER); }
      for (let k = 0; k < 140; k++) { const d = sph(); const v = R(2, 9); smoke.spawn(p.x, 0.2, p.z, d[0] * v, Math.abs(d[1]) * v + 2, d[2] * v, rand() < 0.75 ? [0.62, 0.05, 0.04] : [0.85, 0.78, 0.6], R(0.035, 0.07), R(5, 9), 0.9, 1.4, PAPER | BOUNCE); }
      puff(p.x, 0.25, p.z, 40, 2.2);
      this.ring = new THREE.Mesh(new THREE.RingGeometry(0.82, 1, 64), shockMat()); this.ring.rotation.x = -Math.PI / 2; this.ring.position.set(p.x, 0.04, p.z); scene.add(this.ring);
      this.ball = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), shockMat()); this.ball.position.set(p.x, 0.2, p.z); scene.add(this.ball);
      shake = near ? 0.55 : 0; kick = near ? 1 : 0; veil(near ? 0.6 : 0.12);
      sBigBomb(near);
      const scorch = new THREE.Mesh(new THREE.CircleGeometry(0.6, 32), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.6, depthWrite: false }));
      scorch.rotation.x = -Math.PI / 2; scorch.position.set(p.x, 0.005, p.z); scene.add(scorch);
      setTimeout(() => scene.remove(scorch), 25000);
    }
    if (this.ring) {
      this.bt += dt; const b = this.bt;
      const k1 = Math.min(1, b / 0.55); this.ring.scale.setScalar(0.3 + 9 * (1 - Math.pow(1 - k1, 3))); this.ring.material.opacity = 1 - k1;
      const k2 = Math.min(1, b / 0.28); this.ball.scale.setScalar(0.2 + 1.9 * Math.sqrt(k2)); this.ball.material.opacity = (1 - k2) * 0.9;
      if (b > 0.6 && this.ring.parent) { scene.remove(this.ring); scene.remove(this.ball); }
    }
    return this.t < this.fuse + 1.6;
  }
}
class Ladi {
  constructor() {
    this.t = 0; this.n = 70; this.i = 0; this.rate = 24;
    const g = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.014, 0.014, 0.08, 6), propMat(0.65, 0.05, 0.05), this.n);
    this.pts = [];
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1);
    for (let k = 0; k < this.n; k++) {
      const t = k / (this.n - 1), x = 3.4 - t * 6.8, z = -4.35 + Math.sin(t * Math.PI * 3) * 0.25;
      const pt = new THREE.Vector3(x, 0.016, z); this.pts.push(pt);
      q.setFromEuler(new THREE.Euler(0, rand() * 3, Math.PI / 2 + R(-0.4, 0.4)));
      m.compose(pt, q, s); g.setMatrixAt(k, m);
    }
    this.mesh = g; scene.add(g);
    this.fl = addFlash(this.pts[0], 1, 0.8, 0.5, 0, 0.7, 14);
  }
  update(dt) {
    this.t += dt;
    const want = Math.min(this.n, Math.floor(this.t * this.rate));
    while (this.i < want) {
      const p = this.pts[this.i];
      this.mesh.setMatrixAt(this.i, new THREE.Matrix4().makeScale(0, 0, 0)); this.mesh.instanceMatrix.needsUpdate = true;
      for (let k = 0; k < 14; k++) { const d = sph(); const v = R(4, 10); sparks.spawn(p.x, 0.05, p.z, d[0] * v, Math.abs(d[1]) * v, d[2] * v, rand() < 0.6 ? [1, 0.9, 0.7] : [1, 0.55, 0.2], R(0.025, 0.045), R(0.08, 0.22), 0.85, 8, BOUNCE); }
      if (rand() < 0.6) smoke.spawn(p.x, 0.05, p.z, R(-2, 2), R(2, 4), R(-2, 2), [0.62, 0.05, 0.04], 0.03, R(4, 7), 0.9, 1.4, PAPER | BOUNCE);
      setFlash(this.fl, { x: p.x, y: 0.5, z: p.z }, 1, 0.85, 0.6, R(2, 3.5), 1.4); flashSt[this.fl].decay = 16;
      if (this.i % 4 === 0) puff(p.x, 0.08, p.z, 1, 0.6);
      sPop(R(0.35, 0.6)); if (S.view === 'roof') shake = Math.max(shake, 0.03);
      this.i++;
    }
    if (this.i >= this.n && this.t > this.n / this.rate + 2) { scene.remove(this.mesh); return false; }
    return true;
  }
}
class SkyShot {
  constructor(p) {
    this.p = p; this.t = 0; this.shots = 9; this.fired = 0;
    this.mesh = shadowy(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.3, 0.34), propMat(0.55, 0.08, 0.12))); this.mesh.position.set(p.x, 0.15, p.z); scene.add(this.mesh);
    this.top = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.03, 0.36), propMat(0.9, 0.65, 0.15)); this.top.position.set(p.x, 0.31, p.z); scene.add(this.top);
  }
  update(dt) {
    this.t += dt;
    while (this.fired < this.shots && this.t > 0.6 + this.fired * 0.42) {
      const o = new THREE.Vector3(this.p.x, 0.35, this.p.z);
      const tg = new THREE.Vector3(this.p.x * 3 + R(-14, 14), R(18, 30), this.p.z - R(30, 55));
      launchShell(o, tg, { T: R(0.9, 1.15), small: true, sc: 1, type: pick(['peony', 'ring', 'double', 'strobe']), pal: PAL[this.fired % PAL.length], mine: true });
      sPop(0.6); puff(o.x, 0.4, o.z, 2, 0.6);
      addFlash({ x: o.x, y: 0.8, z: o.z }, 1, 0.7, 0.4, 6, 1.0, 9);
      this.fired++;
    }
    if (this.fired >= this.shots && this.t > 0.6 + this.shots * 0.42 + 2) { scene.remove(this.mesh); scene.remove(this.top); return false; }
    return true;
  }
}
class Sparkler {
  constructor() {
    this.t = 0; this.dur = 9; this.pos = new THREE.Vector3(0.6, 1.4, 3); this.carry = 0;
    this.stick = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.7, 5), propMat(0.4, 0.38, 0.36)); scene.add(this.stick);
    this.fl = addFlash(this.pos, 1, 0.9, 0.7, 0, 0.8, 10);
    sHiss(this.dur, 7000, 0.12); sCrackle(4, this.dur - 0.5, 18, 0.1);
  }
  update(dt) {
    this.t += dt;
    if (S.view !== 'roof') this.t = this.dur + 1;
    this.pos.lerp(sparkTarget(), Math.min(1, dt * 14));
    const burnt = this.t / this.dur, len = 0.7 * (1 - burnt * 0.75);
    this.stick.position.set(this.pos.x + 0.1, this.pos.y - 0.32, this.pos.z + 0.08); this.stick.rotation.set(0.2, 0, -0.3);
    const tip = new THREE.Vector3(this.pos.x + 0.1 - Math.sin(0.3) * (len - 0.35), this.pos.y - 0.32 + Math.cos(0.3) * (len - 0.35), this.pos.z + 0.08);
    const k = this.t < 0.3 ? this.t / 0.3 : this.t < this.dur - 0.5 ? 1 : Math.max(0, (this.dur - this.t) / 0.5);
    this.carry += 420 * k * dt;
    while (this.carry >= 1) {
      this.carry -= 1; const d = sph(), v = R(2.5, 6.5);
      sparks.spawn(tip.x, tip.y, tip.z, d[0] * v, d[1] * v, d[2] * v, rand() < 0.7 ? [1, 0.95, 0.85] : [1, 0.7, 0.35], R(0.022, 0.036), R(0.14, 0.36), 0.88, 2, BRANCH);
    }
    sparks.spawn(tip.x, tip.y, tip.z, 0, 0, 0, [1, 0.85, 0.6], 0.12 * k, 0.04, 1, 0, 0);
    setFlash(this.fl, tip, 1, 0.9, 0.75, 1.6 * k * R(0.7, 1.3), 1.0);
    if (this.t > this.dur) { scene.remove(this.stick); activeSparkler = null; return false; }
    return true;
  }
}
let activeSparkler = null;

/* ---------------- labels projected from 3D ---------------- */
const labelsEl = $('#labels');
const labels = [];
function showLabel(p, text, cls = '', life = 3, rise = 6) {
  if (labels.length > 22) { const old = labels.shift(); old.el.remove(); }
  const el = document.createElement('div');
  el.className = 'lbl ' + cls;
  if (Array.isArray(text)) { el.textContent = text[0]; const sm = document.createElement('small'); sm.textContent = text[1]; el.appendChild(sm); } else el.textContent = text;
  labelsEl.appendChild(el);
  labels.push({ el, p: new THREE.Vector3(p.x, p.y, p.z), t: 0, life, rise });
}
function floatText(p, text, cls) { showLabel(p, text, cls, 1.6, -1); }
const _v = new THREE.Vector3();
function project(p) {
  _v.copy(p).project(camera);
  if (_v.z > 1 || _v.z < -1) return null;
  return [(_v.x * 0.5 + 0.5) * innerWidth, (-_v.y * 0.5 + 0.5) * innerHeight];
}
function updateLabels(dt) {
  for (let i = labels.length - 1; i >= 0; i--) {
    const L = labels[i]; L.t += dt;
    if (L.t > L.life) { L.el.remove(); labels.splice(i, 1); continue; }
    const p = L.p.clone(); p.y += L.rise > 0 ? -L.t * 0.9 : L.rise < 0 ? L.t * 0.55 : 0;
    const xy = project(p);
    if (!xy) { L.el.style.opacity = 0; continue; }
    const a = Math.min(1, L.t / 0.35) * Math.min(1, (L.life - L.t) / 0.9);
    L.el.style.opacity = a.toFixed(3);
    L.el.style.transform = `translate(${xy[0].toFixed(1)}px, ${xy[1].toFixed(1)}px) translate(-50%, -50%)`;
  }
  const pin = $('#pin');
  if (viewBlend > 0.05) {
    const xy = project(new THREE.Vector3(0, 9, 1));
    if (xy) { pin.style.opacity = Math.min(1, viewBlend * 1.4).toFixed(2); pin.style.transform = `translate(${xy[0].toFixed(1)}px, ${xy[1].toFixed(1)}px) translate(-50%, -130%)`; }
    else pin.style.opacity = 0;
  } else pin.style.opacity = 0;
}

/* ---------------- camera: rooftop view and free-flying sky view ---------------- */
const controls = new OrbitControls(camera, canvas);
controls.enabled = false;
controls.enableDamping = true; controls.dampingFactor = 0.07;
controls.minDistance = 35; controls.maxDistance = 520;
controls.minPolarAngle = 0.18; controls.maxPolarAngle = 1.42;
controls.screenSpacePanning = false; controls.rotateSpeed = 0.55; controls.zoomSpeed = 0.9; controls.autoRotateSpeed = 0.35;
let lastTouch = 0;
controls.addEventListener('start', () => { controls.autoRotate = false; lastTouch = performance.now(); });
const AER_POS = new THREE.Vector3(70, 85, 115), AER_TGT = new THREE.Vector3(0, -6, -70);
let camTw = null, viewBlend = 0, peekHold = 0;
const curLook = LOOK.clone();
function setView(v) {
  if (S.view === v || camTw) return;
  S.view = v;
  document.body.classList.toggle('view-aerial', v === 'aerial');
  $('#vRoof').setAttribute('aria-pressed', v === 'roof'); $('#vSky').setAttribute('aria-pressed', v === 'aerial');
  if (v === 'aerial') camTw = { fp: camera.position.clone(), fl: curLook.clone(), tp: AER_POS.clone(), tl: AER_TGT.clone(), t: 0, dur: 2.4, to: 'aerial', arc: 28 };
  else { controls.enabled = false; controls.autoRotate = false; camTw = { fp: camera.position.clone(), fl: controls.target.clone(), tp: CAM.clone(), tl: LOOK.clone(), t: 0, dur: 2.1, to: 'roof', arc: 16 }; }
  updateHint();
}
function peekAtRangoli() {
  if (S.view !== 'roof' || camTw) return;
  camTw = { fp: camera.position.clone(), fl: curLook.clone(), tp: new THREE.Vector3(0.6, 4.6, 2.6), tl: new THREE.Vector3(0, 0, -1.9), t: 0, dur: 1.6, to: 'peek', arc: 0.6 };
}
$('#vRoof').addEventListener('click', () => setView('roof'));
$('#vSky').addEventListener('click', () => { audioInit(); setView('aerial'); });

/* ---------------- interaction ---------------- */
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const pointer = { x: innerWidth / 2, y: innerHeight / 2, nx: 0, ny: 0 };
const PL_FLOOR = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const PL_SKY = new THREE.Plane(new THREE.Vector3(0, 0, 1), 110);
const PL_HAND = new THREE.Plane(new THREE.Vector3(0, 0, 1), -3);
const PL_HIGH = new THREE.Plane(new THREE.Vector3(0, 1, 0), -48);
function rayAt(cx, cy) { ndc.set(cx / innerWidth * 2 - 1, -(cy / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera); return ray.ray; }
function skyPoint(cx, cy) {
  const r = rayAt(cx, cy), p = new THREE.Vector3();
  if (S.view === 'aerial') {
    if (!r.intersectPlane(PL_HIGH, p) || p.distanceTo(camera.position) > 700) r.at(240, p);
    p.x = clamp(p.x, -200, 200); p.z = clamp(p.z, -300, 120); p.y = clamp(p.y, 28, 90);
    return p;
  }
  if (!r.intersectPlane(PL_SKY, p)) p.set(0, 40, -110);
  p.x = clamp(p.x, -85, 85);
  if (p.y < 26) p.y = R(26, 34);
  p.y = Math.min(p.y, 80);
  return p;
}
function floorPoint(cx, cy) {
  const r = rayAt(cx, cy), p = new THREE.Vector3();
  const hit = r.intersectPlane(PL_FLOOR, p);
  if (S.view === 'aerial') {
    if (hit && Math.abs(p.x) < 6.2 && p.z > -5.1 && p.z < 6.8) return p;
    return new THREE.Vector3(R(-3, 3), 0, R(-3.8, 0.5));
  }
  if (!hit || p.z < -5.25 || p.z > 2.2) return new THREE.Vector3(R(-2.5, 2.5), 0, R(-3.8, -2));
  p.x = clamp(p.x, -6, 6); p.z = clamp(p.z, -5.1, 1.5);
  return p;
}
function sparkTarget() {
  const r = rayAt(pointer.x, pointer.y), p = new THREE.Vector3();
  if (!r.intersectPlane(PL_HAND, p)) p.set(0, 1.5, 3);
  p.x = clamp(p.x, -2.6, 2.6); p.y = clamp(p.y, 0.5, 3.1);
  return p;
}
let lastGain = 0;
function myRocket(target, name) {
  const o = new THREE.Vector3(clamp(target.x * 0.03, -2.5, 2.5) + R(-0.4, 0.4), 1.2, -5.75);
  addFlash({ x: o.x, y: 1.4, z: o.z }, 1, 0.7, 0.35, 4, 0.8, 7);
  for (let k = 0; k < 30; k++) sparks.spawn(o.x, o.y, o.z, R(-1.5, 1.5), R(-0.5, 2), R(-1.5, 1.5), [1, 0.7, 0.3], 0.05, R(0.2, 0.5), 0.9, 6, BOUNCE);
  puff(o.x, o.y, o.z, 4, 0.7);
  const showPts = S.mode === 'play';
  launchShell(o, target, {
    mine: true, sc: name ? 1.4 : 1.15, type: name ? 'double' : pick(TYPES), pal: name ? PAL[0] : pick(PAL),
    name: name ? [name, 'You · just now'] : null,
    onBurst: (p) => { if (showPts) floatText(p, '+' + lastGain, 'pts'); }
  });
}
function addLights(n) {
  const before = S.lit, next = MILESTONES.find((m) => m > before);
  S.lit += n;
  if (next && S.lit >= next) { toast(`${fmt(next)} lights across India. Shagun goal reached!`); mdRush = 6; }
  if (Math.floor(S.lit / 100000) > Math.floor(before / 100000)) toast(`${fmt(Math.floor(S.lit / 100000) * 100000)} lights! Another 100 real diyas for families and mandirs.`);
  renderLive();
}
function award(key, send = true) {
  const now = performance.now();
  S.times = S.times.filter((t) => now - t < 5000); S.times.push(now);
  const combo = S.times.length >= 3;
  const gain = Math.round(ITEM[key].pts * (combo ? 1.5 : 1));
  S.pts += gain; lastGain = gain; S.myLights++; if (send) queueLight(key);
  if (combo) { const c = $('#combo'); c.classList.add('on'); clearTimeout(award.ct); award.ct = setTimeout(() => c.classList.remove('on'), 1600); }
  addLights(1); renderHud();
  if (S.myLights === 10 && !S.nudged) showNudge();
  return gain;
}
function groundBusy() { return emitters.filter((e) => e instanceof Anar || e instanceof Chakri || e instanceof Bomb || e instanceof Ladi || e instanceof SkyShot).length >= 5; }
function outOf(k) {
  const it = ITEM[k], r = KIT[k];
  if (r.earned) { toast('Invite a friend to earn another named rocket'); return; }
  toast(`Next ${it.name.toLowerCase()} in ${fmtLeft((S.next[k] || Date.now()) - Date.now())}. It's free, hang on.`);
}
function useItem(cx, cy) {
  const k = S.sel, it = ITEM[k];
  if ((S.inv[k] || 0) <= 0) { outOf(k); return; }
  if (it.where === 'ground' && groundBusy()) { toast('Let the others finish first'); return; }
  if (k === 'phuljhadi' && S.view !== 'roof') { toast('Switch to Rooftop view to hold a phuljhadi'); return; }
  if (k === 'phuljhadi' && activeSparkler) { toast('Your phuljhadi is still burning'); return; }
  const fizz = it.where === 'ground' && k !== 'skyshot' && k !== 'ladi' && rand() < 0.07;
  if (!fizz) { S.inv[k]--; startRefill(k); }
  bumpSlot(k);
  let gain = 0;
  switch (k) {
    case 'rocket': gain = award('rocket'); myRocket(skyPoint(cx, cy)); break;
    case 'named': {
      const pt = skyPoint(cx, cy);
      API.post('/api/named', { token: S.user.token, tpl: S.tpl, name: S.skyName })
        .then((r) => {
          // the server already counted this rocket's points, so don't send it again with the lights
          S.mine.add(r.text); award('named', false); myRocket(pt, r.text); S.feed.unshift({ text: r.text, where: S.user.city, ts: Date.now() }); renderFeed(); renderDock();
          if (r.today != null) { S.pts = Math.max(S.pts, r.today); S.rank = r.rank; renderHud(); }
        })
        .catch((e) => { S.inv.named = e.status === 403 ? 0 : (S.inv.named || 0) + 1; renderDock(); toast(e.message); });
      break;
    }
    case 'anar': { const p = floorPoint(cx, cy); emitters.push(new Anar(p, fizz)); if (!fizz) { gain = award('anar'); floatText({ x: p.x, y: 1.6, z: p.z }, '+' + gain, 'pts'); } break; }
    case 'chakri': { const p = floorPoint(cx, cy); emitters.push(new Chakri(p, fizz)); if (!fizz) { gain = award('chakri'); floatText({ x: p.x, y: 0.9, z: p.z }, '+' + gain, 'pts'); } break; }
    case 'bomb': { const p = floorPoint(cx, cy); emitters.push(new Bomb(p, fizz)); if (!fizz) { gain = award('bomb'); setTimeout(() => floatText({ x: p.x, y: 1.4, z: p.z }, '+' + gain, 'pts'), 1800); } break; }
    case 'skyshot': { const p = floorPoint(cx, cy); emitters.push(new SkyShot(p)); gain = award('skyshot'); floatText({ x: p.x, y: 1.2, z: p.z }, '+' + gain, 'pts'); break; }
    case 'ladi': emitters.push(new Ladi()); gain = award('ladi'); floatText({ x: 0, y: 1.4, z: -4.3 }, '+' + gain, 'pts'); break;
    case 'phuljhadi': activeSparkler = new Sparkler(); emitters.push(activeSparkler); gain = award('phuljhadi'); break;
    case 'diya': {
      gain = award('diya'); sPop(0.15);
      const i = diyas.findIndex((d) => !d.lit);
      if (i >= 0) { lightDiya(i); floatText({ x: diyas[i].x, y: 1.5, z: -5.5 }, '+' + gain, 'pts'); }
      else {
        const d = pick(diyas);
        for (let n = 0; n < 3; n++) sparks.spawn(d.x + R(-0.05, 0.05), 1.3, -5.55, R(-0.25, 0.25), R(1.1, 1.6), R(-0.25, 0.25), [1, 0.62, 0.22], 0.13, R(6, 8), 0.996, -0.06, TRAIL);
        floatText({ x: d.x, y: 1.6, z: -5.5 }, '+' + gain + '  your light joins the sky', 'pts');
      }
      break;
    }
  }
  if (fizz) {
    const p = floorPoint(cx, cy);
    setTimeout(() => floatText({ x: p.x, y: 0.9, z: p.z }, 'Phuss! It fizzled. You keep it.', 'note'), 700);
  }
  renderDock();
}
function act(cx, cy) {
  if (S.mode === 'landing') { myRocket(skyPoint(cx, cy)); return; }
  useItem(cx, cy);
}
let down = null;
canvas.addEventListener('pointerdown', (e) => {
  audioInit();
  pointer.x = e.clientX; pointer.y = e.clientY;
  if (!$('#timepop').hidden) closeTime();
  if (S.drawer) { closeDrawer(); down = null; return; }
  if (camTw || peekHold > 0) { down = null; return; }
  if (S.view === 'roof') { act(e.clientX, e.clientY); down = null; return; }
  down = { x: e.clientX, y: e.clientY, t: performance.now() };
});
canvas.addEventListener('pointerup', (e) => {
  if (!down) return;
  const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
  if (moved < 7 && performance.now() - down.t < 450 && S.view === 'aerial' && !camTw) act(e.clientX, e.clientY);
  down = null;
});
addEventListener('pointermove', (e) => { pointer.x = e.clientX; pointer.y = e.clientY; pointer.nx = e.clientX / innerWidth * 2 - 1; pointer.ny = e.clientY / innerHeight * 2 - 1; });
addEventListener('keydown', (e) => {
  if (S.joining) { if (e.key === 'Escape') closeJoin(); return; }
  if (S.studio) { if (e.key === 'Escape') closeStudio(); if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); rgUndo(); } return; }
  if (e.target.tagName === 'INPUT') return;
  if (e.key === 'Escape') { closeDrawer(); closeTime(); }
  if (e.key === 'v' || e.key === 'V') setView(S.view === 'roof' ? 'aerial' : 'roof');
  if (S.mode !== 'play') return;
  const n = parseInt(e.key, 10);
  if (n >= 1 && n <= ITEMS.length) select(ITEMS[n - 1].key);
});

/* ---------------- UI ---------------- */
function templ(i, n) { n = (n || '').trim() || 'Your name'; return [n + ' ki Rocket', 'Happy Diwali, ' + n, n + ' + family'][i]; }
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2800); }
function veil(a) { if (!a) return; const v = $('#veil'); v.style.transition = 'none'; v.style.opacity = a; requestAnimationFrame(() => { v.style.transition = 'opacity .7s'; v.style.opacity = 0; }); }
function esc(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function renderHud() {
  $('#hudPts').textContent = fmt(S.pts);
  $('#hudRank').textContent = S.rank ? '#' + fmt(S.rank) : '–';
}
function renderLive() {
  const next = MILESTONES.find((m) => m > S.lit) || MILESTONES[MILESTONES.length - 1];
  const prev = [0, ...MILESTONES].filter((m) => m <= S.lit).pop() || 0;
  $('#liveNum').textContent = fmt(S.lit);
  $('#goalN').textContent = fmt(next);
  $('#goalBar').style.width = Math.min(100, (S.lit - prev) / (next - prev) * 100).toFixed(1) + '%';
  const done = Math.floor(S.lit / 100000), inLakh = S.lit % 100000;
  $('#pledgeBar').style.width = (inLakh / 1000).toFixed(1) + '%';
  $('#pledgeTxt').innerHTML = done === 0
    ? 'Every <b>1,00,000 lights</b> here becomes <b>100 real diyas</b> for families and mandirs.'
    : `<b>${fmt(done * 100)} real diyas</b> pledged so far. The next 100 come at <b>${fmt((done + 1) * 100000)}</b> lights.`;
  if (S.drawer === 'support') { const pg = $('#supPg'); if (pg) pg.textContent = `${fmt(inLakh)} / 1,00,000`; const b = $('#supBar'); if (b) b.style.width = (inLakh / 1000).toFixed(1) + '%'; }
}
function renderOnline() { $('#onlineN').textContent = fmt(S.online); }
function ago(ts) { const s = Math.max(0, (Date.now() - ts) / 1000); return s < 60 ? 'just now' : s < 3600 ? Math.floor(s / 60) + ' min ago' : Math.floor(s / 3600) + ' h ago'; }
function renderFeed() {
  const f = $('#feed');
  const items = (S.feed || []).slice(0, 3);
  if (!items.length) { f.innerHTML = '<li class="empty">No named rockets yet. Yours could be the first.</li>'; return; }
  f.innerHTML = '';
  items.forEach((it) => {
    const li = document.createElement('li'); if (S.mine.has(it.text)) li.className = 'mine';
    li.innerHTML = '<span class="who"></span><span class="where"></span>';
    li.querySelector('.who').textContent = it.text; li.querySelector('.where').textContent = (it.where ? it.where + ' · ' : '') + ago(it.ts);
    f.appendChild(li);
  });
}
function renderDock() {
  const d = $('#dock');
  d.innerHTML = ITEMS.map((it, idx) => {
    const c = S.inv[it.key] || 0;
    return `<button type="button" class="slot${c ? '' : ' empty'}" data-k="${it.key}" aria-pressed="${it.key === S.sel}" aria-label="${it.name}, ${c} left">
      <span class="key">${idx + 1}</span><span class="ct">${c}</span>${svg(it.key, 26)}<span class="nm">${it.name}</span><span class="tm"></span></button>`;
  }).join('');
  d.querySelectorAll('.slot').forEach((b) => b.addEventListener('click', () => select(b.dataset.k)));
  updateTimers(); saveKit();
}
function updateTimers() {
  const now = Date.now();
  document.querySelectorAll('.slot').forEach((b) => {
    const k = b.dataset.k, r = KIT[k], t = S.next[k];
    const tm = b.querySelector('.tm');
    if (t && r && !r.earned) {
      const left = t - now;
      b.classList.add('charging'); b.style.setProperty('--p', clamp(1 - left / (r.every * 1000), 0, 1).toFixed(3));
      tm.textContent = (k === 'diya' ? '+11 ' : '+1 ') + fmtLeft(left);
    } else { b.classList.remove('charging'); tm.textContent = ''; }
  });
  document.querySelectorAll('[data-tm]').forEach((el) => {
    const k = el.dataset.tm, t = S.next[k];
    el.textContent = KIT[k].earned ? 'Earned' : t ? 'Next in ' + fmtLeft(t - now) : 'Full';
  });
}
function tickRefills() {
  const now = Date.now(); let changed = false;
  for (const k in S.next) {
    if (S.next[k] && now >= S.next[k]) {
      S.inv[k] = Math.min(KIT[k].cap, S.inv[k] + KIT[k].amt); S.next[k] = 0; changed = true; startRefill(k);
    }
  }
  if (changed) { renderDock(); if (S.drawer === 'kit') renderDrawer(); }
  else updateTimers();
}
setInterval(tickRefills, 250);
function bumpSlot(k) { const b = document.querySelector(`.slot[data-k="${k}"]`); if (b) { b.classList.add('bump'); setTimeout(() => b.classList.remove('bump'), 120); } }
function updateHint() {
  const t = $('#hintText'), it = ITEM[S.sel];
  if (S.view === 'aerial') {
    if (S.mode === 'landing') t.textContent = 'Drag to fly around · scroll to zoom · click to send a rocket from your home';
    else if (it.key === 'phuljhadi') t.textContent = 'Switch to Rooftop view to hold a phuljhadi';
    else if (it.where === 'ground') t.textContent = `Click to light the ${it.name.toLowerCase()} on your terrace · drag to fly around`;
    else if (it.key === 'diya') t.textContent = 'Click to light a diya at home · drag to fly around';
    else t.textContent = 'Click the sky to launch from your home · drag to fly around';
  } else t.textContent = S.mode === 'landing' ? 'Click anywhere in the sky to send up a rocket' : it.hint;
}
function select(k) { S.sel = k; renderDock(); updateHint(); }
function startPlay() {
  if (S.mode === 'play') return;
  if (!S.user) { openJoin(); return; }
  audioInit();
  S.mode = 'play'; document.body.classList.add('mode-play');
  $('#hud').hidden = false; $('#btnRanks').hidden = false; $('#btnKit').hidden = false; $('#dock').hidden = false;
  $('#btnSignin').textContent = S.user.name;
  renderHud(); select('rocket');
  toast('Your free kit is ready. Crackers refill every 45 seconds.');
}
$('#btnStart').addEventListener('click', startPlay);
$('#btnSignin').addEventListener('click', () => { if (!S.user) openJoin(); else if (S.mode === 'landing') startPlay(); else toast(`You're in as ${S.user.name} from ${S.user.city}`); });
$('#btnSound').addEventListener('click', () => {
  audioInit(); S.sound = !S.sound;
  if (A.master) A.master.gain.value = S.sound ? 1 : 0;
  $('#btnSound').setAttribute('aria-pressed', S.sound);
  $('#btnSound').setAttribute('aria-label', S.sound ? 'Sound on' : 'Sound off');
  $('#sndWave').style.opacity = S.sound ? 1 : 0.15;
});
function showNudge() {
  S.nudged = true;
  try { if (localStorage.getItem('ek-nudge')) return; localStorage.setItem('ek-nudge', '1'); } catch (e) { /* storage blocked: still show once */ }
  const n = $('#nudge'); n.hidden = false;
  clearTimeout(showNudge.t); showNudge.t = setTimeout(() => { n.hidden = true; }, 11000);
}
$('#nudgeX').addEventListener('click', () => { $('#nudge').hidden = true; });

/* drawer: ranks, my kit, support */
const RANK_TABS = { today: 'Today', overall: 'Overall', diyas: 'Most diyas', cities: 'Cities', states: 'States' };
const RANK_SUBS = { today: 'Points today, India time. Resets at midnight.', overall: 'Points across all of Diwali', diyas: 'Only diyas count here', cities: 'Every player in a city, combined (lights)', states: 'Every player in a state, combined (lights)' };
const AVC = ['#F6A93B', '#FF8DA3', '#8EC5FF', '#7FD9A4', '#FFD99A', '#C9B6FF', '#FFC9A3', '#A3E4F0'];
function openDrawer(kind) {
  closeTime();
  S.drawer = kind; const dr = $('#drawer');
  $('#drTitle').textContent = kind === 'kit' ? 'My kit' : kind === 'support' ? 'Real diyas' : 'Ranks';
  renderDrawer();
  dr.classList.add('open'); dr.removeAttribute('inert'); dr.setAttribute('aria-hidden', 'false'); $('#scrim').classList.add('on');
  setTimeout(() => $('#drClose').focus(), 50);
}
function closeDrawer() {
  if (!S.drawer) return; S.drawer = null; const dr = $('#drawer');
  dr.classList.remove('open'); dr.setAttribute('inert', ''); dr.setAttribute('aria-hidden', 'true'); $('#scrim').classList.remove('on');
}
function renderDrawer() {
  const box = $('#drContent');
  if (S.drawer === 'ranks') {
    const tabs = Object.entries(RANK_TABS).map(([k, v]) => `<button type="button" role="tab" class="tab" data-tab="${k}" aria-selected="${k === S.tab}">${v}</button>`).join('');
    const you = S.user ? `<div class="youcard"><div class="t"><span>${esc(S.user.name)} · ${fmt(S.pts)} pts today</span><b>${S.rank ? '#' + fmt(S.rank) + ' today' : 'Not ranked yet'}</b></div><div class="s">Points reach the board within a few seconds. A rangoli on your terrace is worth 15.</div></div>` : '';
    box.innerHTML = `<div class="tabs" role="tablist" aria-label="Leaderboards">${tabs}</div><div class="dr-body" id="rkBody"><p class="sub">${RANK_SUBS[S.tab]}</p><p class="sub">Loading…</p></div>${you}`;
    box.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => { S.tab = b.dataset.tab; renderDrawer(); }));
    const tab = S.tab;
    API.get('/api/ranks?board=' + tab).then((d) => {
      const el = $('#rkBody'); if (!el || S.drawer !== 'ranks' || S.tab !== tab) return;
      const rows = d.rows || [], bars = tab === 'cities' || tab === 'states', max = rows[0]?.score || 1;
      const html = rows.length ? rows.map((r, i) => {
        const me = !bars && S.user && r.name === S.user.name && r.sub === S.user.city;
        const ini = r.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
        return `<div class="row${me ? ' me' : ''}"><span class="rk${i < 3 ? ' g' : ''}">${i + 1}</span><span class="av" style="background:${AVC[i % AVC.length]}">${esc(ini)}</span>
          <span class="nmc"><b>${esc(r.name)}</b>${bars ? `<span class="bar2"><i style="width:${Math.round(r.score / max * 100)}%"></i></span>` : `<span>${esc(r.sub)}</span>`}</span><span class="val">${fmt(r.score)}</span></div>`;
      }).join('') : '<p class="sub">Nobody here yet. Light something to be first on this board.</p>';
      el.innerHTML = `<p class="sub">${RANK_SUBS[tab]}</p>${html}<p class="note">Everyone gets the same free kit, so ranks come from showing up: diyas, combos, rangolis and coming back each day. Nothing can be bought.</p>`;
    }).catch(() => { const el = $('#rkBody'); if (el) el.innerHTML = '<p class="sub">Could not load the leaderboard. Check your connection and try again.</p>'; });
  } else if (S.drawer === 'kit') {
    const list = ITEMS.filter((i) => i.key !== 'named').map((i) => {
      const r = KIT[i.key];
      return `<div class="item"><span class="ic">${svg(i.key, 22)}</span>
      <span><b>${i.name}</b><span class="d">+${i.pts} pts · ${r.rule}</span></span>
      <span class="kitstat"><b>${S.inv[i.key] || 0}${r.cap ? ' / ' + r.cap : ''}</b><span data-tm="${i.key}"></span></span></div>`;
    }).join('');
    const nn = S.inv.named || 0;
    box.innerHTML = `<div class="dr-body" style="padding-top:8px">
      <p class="sub">Everything here is free. Your kit refills on its own.</p>
      <h3 class="shop-h">Named rocket · you have ${nn}</h3>
      <div class="named">
        <div class="preview" aria-hidden="true"><span id="pv">${esc(templ(S.tpl, S.skyName))}</span></div>
        <div class="field"><label for="skyName">Name in the sky</label>
          <input id="skyName" type="text" maxlength="20" autocomplete="off" value="${esc(S.skyName)}">
          <span class="msg" id="nameMsg">Up to 20 letters. Every name is checked before it goes up.</span></div>
        <div class="tpls" role="group" aria-label="Message style">${[0, 1, 2].map((k) => `<button type="button" class="tpl" data-tpl="${k}" aria-pressed="${k === S.tpl}">${['{name} ki Rocket', 'Happy Diwali, {name}', '{name} + family'][k]}</button>`).join('')}</div>
        <button type="button" class="btn btn--primary" id="useNamed" style="height:48px"${nn ? '' : ' disabled'}>${nn ? 'Get it ready to launch' : 'No named rockets left'}</button>
        <p class="earn">Earn more: +1 for each friend who joins with your link, +1 for each day you come back.</p>
        <button type="button" class="btn btn--ghost" id="invite" style="height:44px;font-size:15px">Invite a friend</button>
      </div>
      <h3 class="shop-h">Your kit</h3>${list}
      <p class="note">Nothing is for sale. Points and ranks can't be bought.</p>
      <p class="note"><button type="button" class="linkbtn" id="kitSupport">How every lakh lights becomes real diyas</button><br>
        <a href="/privacy" target="_blank" style="color:var(--marigold-soft)">Privacy</a></p></div>`;
    $('#kitSupport').addEventListener('click', () => openDrawer('support'));
    const inp = $('#skyName'), msg = $('#nameMsg');
    const bad = () => /\d|https?|www|\.com|\.in|@/i.test(S.skyName) || !S.skyName.trim();
    const sync = () => { $('#pv').textContent = templ(S.tpl, S.skyName); const b = bad(); msg.textContent = b ? 'Use letters only. No numbers, links or handles.' : 'Up to 20 letters. Every name is checked before it goes up.'; msg.classList.toggle('err', b); };
    inp.addEventListener('input', () => { S.skyName = inp.value.slice(0, 20); sync(); });
    box.querySelectorAll('.tpl').forEach((b) => b.addEventListener('click', () => { S.tpl = +b.dataset.tpl; box.querySelectorAll('.tpl').forEach((x) => x.setAttribute('aria-pressed', x === b)); sync(); }));
    $('#useNamed').addEventListener('click', () => {
      if (bad()) { toast('Fix the name first'); return; }
      closeDrawer(); select('named');
      toast('Named rocket ready. Click the sky to send it up.');
    });
    $('#invite').addEventListener('click', () => toast('Invite links go live at launch. Each friend who joins gives you +1 named rocket.'));
    updateTimers();
  } else {
    const inLakh = S.lit % 100000;
    box.innerHTML = `<div class="dr-body" style="padding-top:8px">
      <p class="bigline">Every 1,00,000 lights here becomes 100 real diyas</p>
      <p class="para">Each time this sky crosses another lakh lights, 100 real clay diyas get lit at a mandir or given, with mithai, to families who can't afford Diwali. Photos go up on Instagram after Diwali.</p>
      <div class="pg"><span>Towards the next 100 diyas</span><b id="supPg">${fmt(inLakh)} / 1,00,000</b></div>
      <div class="meter"><span id="supBar" style="width:${(inLakh / 1000).toFixed(1)}%"></span></div>
      <h3 class="shop-h">Want to add more diyas?</h3>
      <p class="para">Support is completely optional and Ek Aasmaan stays free. Supporting does not change your points, kit or rank.</p>
      <div class="upi">Support details are coming soon.</div>
      <p class="note">Every rupee received and every diya given will be posted publicly after Diwali.</p>
      <p class="note"><a href="/privacy" target="_blank" style="color:var(--marigold-soft)">Privacy: what we keep and how to remove your name</a></p></div>`;
  }
}
$('#btnRanks').addEventListener('click', () => openDrawer('ranks'));
$('#btnKit').addEventListener('click', () => openDrawer('kit'));
document.querySelectorAll('[data-support]').forEach((b) => b.addEventListener('click', () => { $('#nudge').hidden = true; openDrawer('support'); }));
$('#drClose').addEventListener('click', closeDrawer);
$('#scrim').addEventListener('click', closeDrawer);

/* ---------------- time-of-day test control ---------------- */
function openTime() { $('#timepop').hidden = false; $('#btnTime').setAttribute('aria-expanded', 'true'); renderTimeUI(); }
function closeTime() { $('#timepop').hidden = true; $('#btnTime').setAttribute('aria-expanded', 'false'); }
$('#btnTime').addEventListener('click', () => { if ($('#timepop').hidden) openTime(); else closeTime(); });
if (!/[?&]test\b/.test(location.search)) $('#btnTime').hidden = true;
function clockText(min) { min = ((min % 1440) + 1440) % 1440; const h = Math.floor(min / 60), m = Math.floor(min % 60); const ap = h >= 12 ? 'pm' : 'am'; const h12 = h % 12 || 12; return `${h12}:${String(m).padStart(2, '0')} ${ap}`; }
function renderTimeUI() {
  if ($('#timepop').hidden) return;
  $('#tpClock').textContent = clockText(TIME.min);
  $('#tpMode').textContent = TIME.mode === 'live' ? 'Live, India time' : TIME.mode === 'play' ? 'Playing' : 'Test time';
  const el = ENV.el;
  $('#tpSun').textContent = el > 10 ? `Sun ${el.toFixed(0)}° up · daylight` : el > 0 ? `Sun ${el.toFixed(1)}° up · golden hour` : el > -8 ? `Sun ${Math.abs(el).toFixed(1)}° down · dusk` : 'Night · lights take over';
  const sl = $('#tpSlider'); if (document.activeElement !== sl) sl.value = Math.round(((TIME.min % 1440) + 1440) % 1440);
  document.querySelectorAll('.tp-btns button').forEach((b) => b.setAttribute('aria-pressed', TIME.mode === 'live' ? b.dataset.t === 'live' : (TIME.mode === 'fixed' && b.dataset.t !== 'live' && Math.abs(+b.dataset.t - TIME.min) < 1)));
}
$('#tpSlider').addEventListener('input', (e) => { TIME.mode = 'fixed'; TIME.min = +e.target.value; renderTimeUI(); });
document.querySelectorAll('.tp-btns button').forEach((b) => b.addEventListener('click', () => {
  if (b.dataset.t === 'live') TIME.mode = 'live'; else { TIME.mode = 'fixed'; TIME.min = +b.dataset.t; }
  renderTimeUI();
}));
$('#tpPlay').addEventListener('click', () => { TIME.mode = 'play'; TIME.min = 16 * 60 + 45; TIME.play = { to: 19 * 60 + 15, rate: 150 / 24 }; audioInit(); });
const TCOL = {
  hazeDay: new THREE.Color().setRGB(0.52, 0.56, 0.62, LIN), hazeSet: new THREE.Color().setRGB(0.55, 0.3, 0.22, LIN), fogNight: new THREE.Color().setRGB(0.024, 0.007, 0.013, LIN),
  skyDay: new THREE.Color().setRGB(0.62, 0.72, 0.95, LIN), skyNight: new THREE.Color().setRGB(0.3, 0.33, 0.8, LIN), skySet: new THREE.Color().setRGB(0.85, 0.55, 0.5, LIN),
  gndDay: new THREE.Color().setRGB(0.45, 0.38, 0.3, LIN), gndNight: new THREE.Color().setRGB(0.35, 0.15, 0.1, LIN),
  sunHigh: new THREE.Color().setRGB(1, 0.95, 0.86, LIN), sunLow: new THREE.Color().setRGB(1, 0.5, 0.22, LIN)
};
const _c1 = new THREE.Color();
let lastShadowKey = '';
function updateEnvironment(dt) {
  if (TIME.mode === 'live') { const n = istNow(); TIME.min = n.min; TIME.day = n; }
  else if (TIME.mode === 'play') { TIME.min += dt * TIME.play.rate; if (TIME.min >= TIME.play.to) { TIME.min = TIME.play.to; TIME.mode = 'fixed'; } }
  if (!TIME.day) TIME.day = istNow();
  const s = sunDirection(TIME.min, TIME.day.y, TIME.day.m, TIME.day.d);
  const sy = s.dir.y;
  ENV.sunDir.copy(s.dir); ENV.el = s.el;
  ENV.night = 1 - sstep(-0.11, 0.07, sy);
  ENV.glow = Math.exp(-Math.pow((sy - 0.03) / 0.13, 2)) * (1 - ENV.night * 0.75);
  ENV.dayF = sstep(-0.02, 0.18, sy);
  U.uNight.value = ENV.night;
  _c1.copy(TCOL.hazeDay).lerp(TCOL.hazeSet, clamp(ENV.glow * 1.1, 0, 1));
  ENV.fogCol.copy(_c1).lerp(TCOL.fogNight, ENV.night);
  scene.fog.color.copy(ENV.fogCol);
  U.uFog.value.set(ENV.fogCol.r, ENV.fogCol.g, ENV.fogCol.b);
  const roofD = lerp(0.0034, 0.0062, ENV.night), aerD = lerp(0.0013, 0.0021, ENV.night);
  const fd = lerp(roofD, aerD, viewBlend);
  scene.fog.density = fd; U.uFogD.value = fd;
  const su = sky.material.uniforms;
  su.uSun.value.copy(s.dir); su.uGlow.value = ENV.glow; su.uFogCol.value.copy(ENV.fogCol);
  sun.intensity = 3.5 * sstep(-0.025, 0.14, sy);
  sun.color.copy(TCOL.sunLow).lerp(TCOL.sunHigh, sstep(0.02, 0.35, sy));
  hemi.color.copy(TCOL.skyDay).lerp(TCOL.skySet, ENV.glow * 0.8).lerp(TCOL.skyNight, ENV.night);
  hemi.groundColor.copy(TCOL.gndDay).lerp(TCOL.gndNight, ENV.night);
  hemi.intensity = lerp(0.6, 0.035, ENV.night) * (1 - ENV.glow * 0.25);
  duskBack.intensity = 0.07 * ENV.night;
  const wantShadow = sy > -0.02;
  sun.castShadow = wantShadow;
  if (wantShadow) {
    const aer = viewBlend > 0.5;
    const ctr = aer ? new THREE.Vector3(0, -8, -90) : new THREE.Vector3(0, -4, -22);
    const half = aer ? 300 : 62;
    sun.target.position.copy(ctr);
    sun.position.copy(ctr).addScaledVector(s.dir.clone().setY(Math.max(s.dir.y, 0.06)).normalize(), 600);
    const key = aer ? 'a' : 'r';
    if (key !== lastShadowKey) {
      const cam = sun.shadow.camera; cam.left = -half; cam.right = half; cam.top = half; cam.bottom = -half; cam.near = 1; cam.far = 1400; cam.updateProjectionMatrix();
      sun.shadow.normalBias = aer ? 0.25 : 0.03; lastShadowKey = key;
    }
  }
  renderer.toneMappingExposure = lerp(0.95, 1.15, ENV.night);
  bloom.strength = lerp(0.32, 0.95, ENV.night);
  bloom.threshold = lerp(0.88, 0.22, ENV.night);
  if (!$('#timepop').hidden && Math.floor(T * 4) !== Math.floor((T - dt) * 4)) renderTimeUI();
}

/* ---------------- Decorate studio: rangoli maker ---------------- */
const RG = { tool: 'powder', color: '#F2B705', size: 18, sym: 8, mirror: true, undo: [], drawing: false, last: null, ringR: 0, placedAt: 0 };
const POWDERS = [['#C8102E', 'Kumkum red'], ['#F2B705', 'Haldi yellow'], ['#F28C28', 'Marigold'], ['#E7548A', 'Gulabi pink'], ['#1F6FB2', 'Peacock blue'], ['#2E9E5B', 'Leaf green'], ['#7A3E9D', 'Jamun purple'], ['#F4F1EA', 'Rice white'], ['#16A3A8', 'Firozi']];
const SYMS = [1, 4, 6, 8, 12, 16];
const rgBg = $('#rgBg'), rgArt = $('#rgArt'), rgGuide = $('#rgGuide');
const bgx = rgBg.getContext('2d'), ax = rgArt.getContext('2d', { willReadFrequently: true }), gx = rgGuide.getContext('2d');
const CX = 512, CY = 512;
function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function shades(hex) {
  const [r, g, b] = hexRgb(hex); const out = [];
  for (let i = 0; i < 7; i++) { const k = R(-0.22, 0.16); out.push(`rgb(${clamp(Math.round(r * (1 + k)), 0, 255)},${clamp(Math.round(g * (1 + k)), 0, 255)},${clamp(Math.round(b * (1 + k)), 0, 255)})`); }
  return out;
}
function paintFloor() {
  const g = bgx.createRadialGradient(CX, CY, 80, CX, CY, 760);
  g.addColorStop(0, '#5a514a'); g.addColorStop(1, '#3a332e');
  bgx.fillStyle = g; bgx.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 26000; i++) { const v = Math.floor(R(40, 120)); bgx.fillStyle = `rgba(${v},${v - 6},${v - 12},${R(0.05, 0.22)})`; bgx.fillRect(R(0, 1024), R(0, 1024), R(1, 2.6), R(1, 2.6)); }
  bgx.strokeStyle = 'rgba(0,0,0,0.18)'; bgx.lineWidth = 2;
  for (let k = 1; k < 4; k++) { bgx.beginPath(); bgx.moveTo(k * 256, 0); bgx.lineTo(k * 256, 1024); bgx.moveTo(0, k * 256); bgx.lineTo(1024, k * 256); bgx.stroke(); }
}
function symPts(x, y, n = RG.sym, mirror = RG.mirror) {
  const dx = x - CX, dy = y - CY, out = [];
  for (let k = 0; k < n; k++) {
    const a = k * 2 * Math.PI / n, c = Math.cos(a), s = Math.sin(a);
    out.push([CX + dx * c - dy * s, CY + dx * s + dy * c]);
    if (mirror && n > 1) out.push([CX + dx * c + dy * s, CY + dx * s - dy * c]);
  }
  return out;
}
function grains(ctx, x, y, r, sh, n) {
  ctx.globalAlpha = 0.16; ctx.fillStyle = sh[0];
  ctx.beginPath(); ctx.arc(x, y, r * 0.62, 0, Math.PI * 2); ctx.fill();
  for (let i = 0; i < n; i++) {
    const a = rand() * 6.2832, d = Math.abs(rand() + rand() + rand() - 1.5) / 1.5 * r;
    const s = R(1, 2.8);
    ctx.globalAlpha = R(0.55, 1); ctx.fillStyle = sh[(Math.random() * sh.length) | 0];
    ctx.fillRect(x + Math.cos(a) * d, y + Math.sin(a) * d, s, s);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  for (let i = 0; i < n * 0.12; i++) { const a = rand() * 6.2832, d = rand() * r * 1.15; ctx.globalAlpha = 0.25; ctx.fillRect(x + Math.cos(a) * d, y + Math.sin(a) * d, 1.2, 1.2); }
  ctx.globalAlpha = 1;
}
function powderSeg(ctx, x0, y0, x1, y1, r, hex, n = RG.sym, mirror = RG.mirror) {
  const sh = shades(hex), dist = Math.hypot(x1 - x0, y1 - y0), steps = Math.max(1, Math.ceil(dist / (r * 0.35)));
  for (let s = 1; s <= steps; s++) {
    const t = s / steps, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
    for (const [px, py] of symPts(x, y, n, mirror)) grains(ctx, px, py, r, sh, Math.round(r * 1.7));
  }
}
function powderRing(ctx, rad, r, hex) {
  const sh = shades(hex), steps = Math.max(12, Math.ceil(2 * Math.PI * rad / (r * 0.35)));
  for (let s = 0; s < steps; s++) { const a = s / steps * 2 * Math.PI; grains(ctx, CX + Math.cos(a) * rad, CY + Math.sin(a) * rad, r, sh, Math.round(r * 1.7)); }
}
function petal(ctx, x, y, ang, len, hex) {
  const [r, g, b] = hexRgb(hex);
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
  const w = len * 0.42;
  const gr = ctx.createLinearGradient(0, 0, len, 0);
  gr.addColorStop(0, `rgb(${r * 0.55 | 0},${g * 0.55 | 0},${b * 0.55 | 0})`); gr.addColorStop(0.55, hex); gr.addColorStop(1, `rgb(${Math.min(255, r * 1.15 + 30) | 0},${Math.min(255, g * 1.15 + 30) | 0},${Math.min(255, b * 1.15 + 30) | 0})`);
  ctx.fillStyle = gr;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(len * 0.3, -w, len * 0.85, -w * 0.7, len, 0); ctx.bezierCurveTo(len * 0.85, w * 0.7, len * 0.3, w, 0, 0); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = Math.max(1, len * 0.03); ctx.beginPath(); ctx.moveTo(len * 0.1, 0); ctx.lineTo(len * 0.88, 0); ctx.stroke();
  ctx.globalAlpha = 0.5; for (let i = 0; i < len * 0.8; i++) { ctx.fillStyle = rand() < 0.5 ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.18)'; ctx.fillRect(R(len * 0.1, len * 0.9), R(-w * 0.5, w * 0.5), 1.4, 1.4); }
  ctx.restore(); ctx.globalAlpha = 1;
}
function petals(ctx, x, y, len, hex, n = RG.sym, mirror = RG.mirror) {
  for (const [px, py] of symPts(x, y, n, mirror)) { const a = Math.atan2(py - CY, px - CX); petal(ctx, px - Math.cos(a) * len * 0.5, py - Math.sin(a) * len * 0.5, a, len, hex); }
}
function riceDot(ctx, x, y, r, hex) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.arc(x + r * 0.15, y + r * 0.2, r, 0, Math.PI * 2); ctx.fill();
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r); g.addColorStop(0, '#ffffff'); g.addColorStop(1, hex);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}
function dots(ctx, x, y, r, hex, n = RG.sym, mirror = RG.mirror) { for (const [px, py] of symPts(x, y, n, mirror)) riceDot(ctx, px, py, r, hex); }
function diyaStamp(ctx, x, y, sz, ang) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang + Math.PI / 2);
  const w = sz, h = sz * 0.5;
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(w * 0.06, h * 0.2, w * 0.55, h * 0.6, 0, 0, Math.PI * 2); ctx.fill();
  const g = ctx.createLinearGradient(0, -h * 0.2, 0, h * 0.8); g.addColorStop(0, '#C8602A'); g.addColorStop(1, '#6E2A10');
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-w * 0.55, 0); ctx.quadraticCurveTo(-w * 0.4, h * 0.85, 0, h * 0.85); ctx.quadraticCurveTo(w * 0.4, h * 0.85, w * 0.62, -h * 0.05); ctx.lineTo(w * 0.75, -h * 0.25); ctx.quadraticCurveTo(0, h * 0.1, -w * 0.55, 0); ctx.fill();
  ctx.fillStyle = '#E8A34A'; ctx.beginPath(); ctx.ellipse(0, 0, w * 0.5, h * 0.18, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#4a2a10'; ctx.beginPath(); ctx.ellipse(0, 0, w * 0.42, h * 0.12, 0, 0, Math.PI * 2); ctx.fill();
  ctx.shadowColor = 'rgba(255,170,60,0.95)'; ctx.shadowBlur = sz * 0.9;
  const fg = ctx.createRadialGradient(w * 0.55, -h * 0.75, 1, w * 0.55, -h * 0.6, h * 0.9); fg.addColorStop(0, '#FFFBE6'); fg.addColorStop(0.45, '#FFD24A'); fg.addColorStop(1, 'rgba(255,120,20,0)');
  ctx.fillStyle = fg; ctx.beginPath(); ctx.moveTo(w * 0.55, -h * 1.6); ctx.quadraticCurveTo(w * 0.85, -h * 0.6, w * 0.55, -h * 0.25); ctx.quadraticCurveTo(w * 0.25, -h * 0.6, w * 0.55, -h * 1.6); ctx.fill();
  ctx.restore();
}
function diyas2D(ctx, x, y, sz, n = RG.sym, mirror = false) { for (const [px, py] of symPts(x, y, n, mirror)) diyaStamp(ctx, px, py, sz, Math.atan2(py - CY, px - CX)); }
function eraseAt(ctx, x, y, r) { ctx.save(); ctx.globalCompositeOperation = 'destination-out'; for (const [px, py] of symPts(x, y)) { ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill(); } ctx.restore(); }

const PATTERNS = {
  kamal: (c) => {
    powderRing(c, 470, 10, '#F4F1EA'); powderRing(c, 448, 14, '#C8102E');
    for (let k = 0; k < 32; k++) { const a = k / 32 * 2 * Math.PI; riceDot(c, CX + Math.cos(a) * 418, CY + Math.sin(a) * 418, 7, '#F4F1EA'); }
    petals(c, CX + 330, CY, 150, '#E7548A', 8, false);
    petals(c, CX + Math.cos(Math.PI / 8) * 250, CY + Math.sin(Math.PI / 8) * 250, 120, '#F28C28', 8, false);
    powderRing(c, 170, 16, '#1F6FB2'); powderRing(c, 140, 10, '#F4F1EA');
    petals(c, CX + 105, CY, 90, '#F2B705', 12, false);
    for (let r = 50; r > 0; r -= 12) powderRing(c, r, 12, r > 30 ? '#C8102E' : '#F2B705');
    diyas2D(c, CX + 395, CY, 46, 8, false);
  },
  surya: (c) => {
    for (let k = 0; k < 4; k++) powderRing(c, 455 - k * 18, 10, ['#F28C28', '#F2B705', '#C8102E', '#F4F1EA'][k]);
    powderSeg(c, CX + 150, CY, CX + 350, CY, 10, '#F2B705', 16, false);
    powderSeg(c, CX + 160, CY + 20, CX + 300, CY + 50, 7, '#F28C28', 16, true);
    petals(c, CX + 330, CY, 70, '#C8102E', 16, false);
    powderRing(c, 140, 18, '#C8102E');
    for (let r = 120; r > 0; r -= 14) powderRing(c, r, 14, r % 28 ? '#F2B705' : '#F28C28');
    dots(c, CX + 395, CY, 6, '#F4F1EA', 32, false);
  },
  mor: (c) => {
    powderRing(c, 470, 12, '#16A3A8'); powderRing(c, 450, 8, '#F2B705');
    petals(c, CX + 360, CY, 160, '#1F6FB2', 12, false);
    petals(c, CX + 360, CY, 110, '#16A3A8', 12, false);
    dots(c, CX + 385, CY, 14, '#2E9E5B', 12, false); dots(c, CX + 385, CY, 7, '#7A3E9D', 12, false);
    petals(c, CX + 200, CY, 110, '#2E9E5B', 12, false);
    powderRing(c, 140, 14, '#7A3E9D'); powderRing(c, 118, 10, '#F2B705');
    for (let r = 100; r > 0; r -= 14) powderRing(c, r, 14, r > 60 ? '#1F6FB2' : '#16A3A8');
  },
  kolam: (c) => {
    const sp = 96;
    for (let i = -4; i <= 4; i++) for (let j = -4; j <= 4; j++) {
      const x = CX + i * sp, y = CY + j * sp;
      if (Math.hypot(i, j) > 4.3) continue;
      riceDot(c, x, y, 7, '#F4F1EA');
      if ((i + j) % 2 === 0 && Math.hypot(i, j) < 3.9) { const sh = shades('#F4F1EA'); for (let s = 0; s < 40; s++) { const a = s / 40 * 2 * Math.PI; grains(c, x + sp / 2 + Math.cos(a) * sp * 0.5, y + Math.sin(a) * sp * 0.5, 7, sh, 12); } }
    }
    powderRing(c, 455, 9, '#F4F1EA');
  }
};
const PAT_NAMES = { kamal: 'Kamal', surya: 'Surya', mor: 'Mor pankh', kolam: 'Kolam' };
function drawGuide() {
  gx.clearRect(0, 0, 1024, 1024);
  gx.strokeStyle = 'rgba(255,240,220,0.09)'; gx.lineWidth = 1.5;
  const lines = RG.sym > 1 ? RG.sym * (RG.mirror ? 2 : 1) : 0;
  for (let k = 0; k < lines; k++) { const a = k * 2 * Math.PI / lines; gx.beginPath(); gx.moveTo(CX, CY); gx.lineTo(CX + Math.cos(a) * 720, CY + Math.sin(a) * 720); gx.stroke(); }
  [150, 300, 450].forEach((r) => { gx.beginPath(); gx.arc(CX, CY, r, 0, Math.PI * 2); gx.stroke(); });
  if (RG.tool === 'ring' && RG.drawing) { gx.strokeStyle = 'rgba(255,217,154,0.8)'; gx.setLineDash([8, 8]); gx.lineWidth = 2; gx.beginPath(); gx.arc(CX, CY, RG.ringR, 0, Math.PI * 2); gx.stroke(); gx.setLineDash([]); }
}
function rgPush() { try { RG.undo.push(ax.getImageData(0, 0, 1024, 1024)); if (RG.undo.length > 18) RG.undo.shift(); } catch (e) { /* ignore */ } }
function rgUndo() { const d = RG.undo.pop(); if (d) ax.putImageData(d, 0, 0); }
function toCanvas(e) { const r = rgGuide.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * 1024, (e.clientY - r.top) / r.height * 1024]; }
rgGuide.addEventListener('pointerdown', (e) => {
  e.preventDefault(); rgGuide.setPointerCapture(e.pointerId);
  const [x, y] = toCanvas(e); rgPush(); RG.drawing = true; RG.last = [x, y];
  const sz = RG.size;
  if (RG.tool === 'powder') powderSeg(ax, x, y, x, y, sz, RG.color);
  else if (RG.tool === 'petal') petals(ax, x, y, sz * 3.2, RG.color);
  else if (RG.tool === 'dots') dots(ax, x, y, sz * 0.4, RG.color);
  else if (RG.tool === 'diya') diyas2D(ax, x, y, sz * 2.3, Math.max(RG.sym, 1), false);
  else if (RG.tool === 'erase') eraseAt(ax, x, y, sz * 1.2);
  else if (RG.tool === 'ring') { RG.ringR = Math.hypot(x - CX, y - CY); drawGuide(); }
});
rgGuide.addEventListener('pointermove', (e) => {
  if (!RG.drawing) return;
  const [x, y] = toCanvas(e), [lx, ly] = RG.last, d = Math.hypot(x - lx, y - ly), sz = RG.size;
  if (RG.tool === 'powder') { powderSeg(ax, lx, ly, x, y, sz, RG.color); RG.last = [x, y]; }
  else if (RG.tool === 'erase') { eraseAt(ax, x, y, sz * 1.2); RG.last = [x, y]; }
  else if (RG.tool === 'ring') { RG.ringR = Math.hypot(x - CX, y - CY); drawGuide(); }
  else {
    const gap = RG.tool === 'petal' ? sz * 2.6 : RG.tool === 'dots' ? sz * 1.4 : sz * 2.8;
    if (d >= gap) {
      if (RG.tool === 'petal') petals(ax, x, y, sz * 3.2, RG.color);
      else if (RG.tool === 'dots') dots(ax, x, y, sz * 0.4, RG.color);
      else diyas2D(ax, x, y, sz * 2.3, Math.max(RG.sym, 1), false);
      RG.last = [x, y];
    }
  }
});
const endDraw = () => { if (!RG.drawing) return; if (RG.tool === 'ring') powderRing(ax, RG.ringR, RG.size, RG.color); RG.drawing = false; drawGuide(); };
rgGuide.addEventListener('pointerup', endDraw); rgGuide.addEventListener('pointercancel', endDraw);

function buildStudioUI() {
  $('#sws').innerHTML = POWDERS.map(([h, n]) => `<button type="button" class="sw" style="background:${h}" data-c="${h}" aria-label="${n}" aria-pressed="${h === RG.color}"></button>`).join('');
  $('#sws').querySelectorAll('.sw').forEach((b) => b.addEventListener('click', () => { RG.color = b.dataset.c; $('#sws').querySelectorAll('.sw').forEach((x) => x.setAttribute('aria-pressed', x === b)); }));
  $('#symChips').innerHTML = SYMS.map((n) => `<button type="button" data-s="${n}" aria-pressed="${n === RG.sym}">${n === 1 ? 'Off' : '×' + n}</button>`).join('') + `<button type="button" id="mirBtn" aria-pressed="${RG.mirror}">Mirror</button>`;
  $('#symChips').querySelectorAll('[data-s]').forEach((b) => b.addEventListener('click', () => { RG.sym = +b.dataset.s; $('#symChips').querySelectorAll('[data-s]').forEach((x) => x.setAttribute('aria-pressed', x === b)); drawGuide(); }));
  $('#mirBtn').addEventListener('click', (e) => { RG.mirror = !RG.mirror; e.currentTarget.setAttribute('aria-pressed', RG.mirror); drawGuide(); });
  document.querySelectorAll('.tool').forEach((b) => b.addEventListener('click', () => { RG.tool = b.dataset.tool; document.querySelectorAll('.tool').forEach((x) => x.setAttribute('aria-pressed', x === b)); }));
  $('#rgSize').addEventListener('input', (e) => { RG.size = +e.target.value; });
  const pat = $('#patterns');
  pat.innerHTML = Object.keys(PATTERNS).map((k) => `<button type="button" data-p="${k}" aria-label="Start from the ${PAT_NAMES[k]} pattern"><canvas width="160" height="160"></canvas><span>${PAT_NAMES[k]}</span></button>`).join('');
  pat.querySelectorAll('button').forEach((b) => {
    const cv = b.querySelector('canvas'), c = cv.getContext('2d');
    c.fillStyle = '#3e3631'; c.fillRect(0, 0, 160, 160);
    const tmp = document.createElement('canvas'); tmp.width = tmp.height = 1024; PATTERNS[b.dataset.p](tmp.getContext('2d'));
    c.drawImage(tmp, 0, 0, 160, 160);
    b.addEventListener('click', () => { rgPush(); ax.clearRect(0, 0, 1024, 1024); PATTERNS[b.dataset.p](ax); });
  });
  $('#rgUndo').addEventListener('click', rgUndo);
  $('#rgClear').addEventListener('click', () => { rgPush(); ax.clearRect(0, 0, 1024, 1024); });
  $('#rgPlace').addEventListener('click', placeRangoli);
}
function placeRangoli() {
  const c = rgTexCanvas.getContext('2d'); c.clearRect(0, 0, 1024, 1024); c.drawImage(rgArt, 0, 0); rgTex.needsUpdate = true;
  closeStudio();
  if (S.mode === 'play' && S.user && Date.now() - RG.placedAt > 60000) { S.pts += 15; Q.rangoli = true; renderHud(); toast('Rangoli placed on your terrace · +15 pts'); RG.placedAt = Date.now(); }
  else toast('Rangoli placed on your terrace');
  if (S.view === 'roof') setTimeout(peekAtRangoli, 250);
}
function openStudio(tab = 'rangoli') {
  closeDrawer(); closeTime();
  S.studio = true; $('#studio').hidden = false; setStudioTab(tab); drawGuide();
  setTimeout(() => $('#stClose').focus(), 30);
}
function closeStudio() { S.studio = false; $('#studio').hidden = true; }
function setStudioTab(tab) {
  $('#tabRg').setAttribute('aria-selected', tab === 'rangoli'); $('#tabHome').setAttribute('aria-selected', tab === 'home');
  $('#stRangoli').hidden = tab !== 'rangoli'; $('#stHome').hidden = tab !== 'home';
  $('#stTitle').textContent = tab === 'rangoli' ? 'Draw your rangoli' : 'Decorate your home';
}
$('#btnDecor').addEventListener('click', () => openStudio('rangoli'));
$('#stClose').addEventListener('click', closeStudio);
$('#tabRg').addEventListener('click', () => setStudioTab('rangoli'));
$('#tabHome').addEventListener('click', () => setStudioTab('home'));
$('#homeDone').addEventListener('click', () => { closeStudio(); toast('Your home is decorated'); });

/* My home: lights, kandils, paint, parapet garland */
let glowGeo = null;
const HOME = {
  lights: [['Classic', BULB_COLS], ['Warm gold', [[1, 0.62, 0.18], [1, 0.78, 0.4], [1, 0.5, 0.1]]], ['Pink and white', [[1, 0.3, 0.5], [1, 0.88, 0.92], [1, 0.45, 0.65]]], ['Blue and white', [[0.3, 0.6, 1], [0.9, 0.95, 1], [0.45, 0.75, 1]]]],
  kandil: [['Rose and saffron', [[2.4, 0.45, 0.8], [2.6, 1.1, 0.2]]], ['Peacock and gold', [[0.2, 1.2, 1.6], [2.4, 1.6, 0.3]]], ['Red and green', [[2.6, 0.3, 0.25], [0.4, 2.0, 0.5]]], ['Pure white', [[2.2, 2.1, 1.9], [2.2, 2.1, 1.9]]]],
  paint: [['Haldi yellow', '#E9B864'], ['Gulabi pink', '#E5A9A6'], ['Aasmani blue', '#9EC1DA'], ['Mint', '#AFD5BC'], ['Terracotta', '#C9825F'], ['Cream', '#EFE3C8']],
  garland: [['Marigold', [[1, 0.55, 0.08], [1, 0.78, 0.15], [0.18, 0.5, 0.15]]], ['Rose and jasmine', [[0.85, 0.08, 0.18], [1, 0.97, 0.9], [0.18, 0.5, 0.15]]], ['Mogra white', [[1, 0.98, 0.92], [0.95, 0.92, 0.8], [0.18, 0.5, 0.15]]]],
  sel: { lights: 0, kandil: 0, paint: 0, garland: 0 }
};
function applyHome() {
  const L = HOME.lights[HOME.sel.lights][1];
  if (glowGeo) { const a = glowGeo.attributes.aCol; for (let i = STRAND.start, j = 0; i < STRAND.end; i++, j++) { const c = L[j % L.length]; a.array[i * 3] = c[0]; a.array[i * 3 + 1] = c[1]; a.array[i * 3 + 2] = c[2]; } a.needsUpdate = true; }
  const K = HOME.kandil[HOME.sel.kandil][1];
  kandils.forEach((k, i) => { k.color = K[i]; k.body.material.color.setRGB(...K[i], LIN); k.tail.material.color.setRGB(K[i][0] * 0.6, K[i][1] * 0.6, K[i][2] * 0.6, LIN); });
  const P = new THREE.Color(HOME.paint[HOME.sel.paint][1]);
  house.material.color.copy(P); parapetMat.color.copy(P);
  const Gc = HOME.garland[HOME.sel.garland][1], c = new THREE.Color();
  for (let i = 0; i < 160; i++) { const g = i % 7 === 3 ? Gc[2] : (i % 2 ? Gc[0] : Gc[1]); garland.setColorAt(i, c.setRGB(g[0], g[1], g[2], LIN)); }
  garland.instanceColor.needsUpdate = true;
}
function buildHomeUI() {
  const make = (id, key, items, swatch) => {
    const el = $(id);
    el.innerHTML = items.map(([n, v], i) => `<button type="button" data-i="${i}" aria-pressed="${i === HOME.sel[key]}"><span class="dots">${swatch(v)}</span>${n}</button>`).join('');
    el.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { HOME.sel[key] = +b.dataset.i; el.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', x === b)); applyHome(); }));
  };
  const css = (c) => { const m = Math.max(1, ...c); return `rgb(${Math.round(c[0] / m * 255)},${Math.round(c[1] / m * 255)},${Math.round(c[2] / m * 255)})`; };
  make('#optLights', 'lights', HOME.lights, (v) => v.slice(0, 4).map((c) => `<i style="background:${css(c)}"></i>`).join(''));
  make('#optKandil', 'kandil', HOME.kandil, (v) => v.map((c) => `<i style="background:${css(c)}"></i>`).join(''));
  make('#optPaint', 'paint', HOME.paint, (v) => `<i style="background:${v};width:18px;height:18px;border-radius:5px"></i>`);
  make('#optGar', 'garland', HOME.garland, (v) => v.map((c) => `<i style="background:${css(c)}"></i>`).join(''));
}

/* ---------------- Mahadeep preview ---------------- */
let md = { on: false, t: 0 };
function mahadeep() {
  if (md.on) return; audioInit();
  md = { on: true, t: 0 };
  $('#moment').classList.add('on');
  diyas.forEach((d, i) => setTimeout(() => lightDiya(i), 2000 + i * 90));
  mdRush = 9;
  for (let k = 0; k < 8; k++) setTimeout(() => launchAmbient(), 2500 + k * 700);
  setTimeout(() => $('#moment').classList.remove('on'), 9500);
}
$('#btnMahadeep').addEventListener('click', mahadeep);

/* ---------------- countdown, live counters ---------------- */
function countdown() {
  let d = Math.max(0, Date.parse('2026-11-08T18:29:00+05:30') - Date.now());
  const D = Math.floor(d / 864e5); d -= D * 864e5; const H = Math.floor(d / 36e5); d -= H * 36e5; const M = Math.floor(d / 6e4);
  $('#cd').textContent = `${D}d ${String(H).padStart(2, '0')}h ${String(M).padStart(2, '0')}m`;
}
countdown(); setInterval(countdown, 20000);
renderFeed(); renderLive();

/* ---------------- resize + loop ---------------- */
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false); composer.setSize(w, h); bloom.resolution.set(w / 2, h / 2);
  camera.aspect = w / h; camera.fov = w < 700 ? 64 : 52; camera.updateProjectionMatrix();
  const sc = (h * DPR) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
  sparks.mat.uniforms.uScale.value = sc; smoke.mat.uniforms.uScale.value = sc; glowMat.uniforms.uScale.value = sc;
}
(function () {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(glowBuf.pos, 3));
  g.setAttribute('aSeed', new THREE.Float32BufferAttribute(glowBuf.seed, 1));
  g.setAttribute('aCol', new THREE.Float32BufferAttribute(glowBuf.col, 3));
  g.setAttribute('aSize', new THREE.Float32BufferAttribute(glowBuf.size, 1));
  g.setAttribute('aKind', new THREE.Float32BufferAttribute(glowBuf.kind, 1));
  glowGeo = g;
  const p = new THREE.Points(g, glowMat); p.frustumCulled = false; scene.add(p);
})();
addEventListener('resize', resize); resize();
paintFloor(); PATTERNS.kamal(ax); rgTexCanvas.getContext('2d').drawImage(rgArt, 0, 0); rgTex.needsUpdate = true;
buildStudioUI(); buildHomeUI(); applyHome();


/* ---------------- backend: join, shared sky, points ---------------- */
const API = {
  async post(path, body) {
    const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), keepalive: true });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(j.error || 'Something went wrong. Try again.'), { status: r.status });
    return j;
  },
  async get(path) { const r = await fetch(path); if (!r.ok) throw new Error('offline'); return r.json(); }
};
function loadLocal(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
function saveLocal(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode: still works for this visit */ } }
const Q = { counts: {}, n: 0, rangoli: false };
function queueLight(key) { Q.counts[key] = (Q.counts[key] || 0) + 1; Q.n++; }
async function flush() {
  if (!S.user || (!Q.n && !Q.rangoli)) return;
  const body = { token: S.user.token, counts: Q.counts, rangoli: Q.rangoli, anon: S.anon };
  Q.counts = {}; Q.n = 0; Q.rangoli = false;
  try {
    const r = await API.post('/api/lights', body);
    lastSent = Date.now();
    if (r.today != null) { S.pts = Math.max(S.pts, r.today); S.rank = r.rank; renderHud(); }
  } catch (e) { if (e.status === 401) { S.user = null; saveLocal('ek-user', null); toast('Please join again to keep your points'); } }
}
let seenFeed = 0, firstPoll = true;
async function poll() {
  if (document.hidden) return;
  try {
    const d = await API.get('/api/sky');
    S.online = Math.max(1, d.online || 0); renderOnline();
    if (firstPoll) { S.lit = Math.max(S.lit, d.lights || 0); renderLive(); }
    else if (d.lights > S.lit) addLights(d.lights - S.lit);
    const fresh = (d.feed || []).filter((f) => f.ts > seenFeed && !S.mine.has(f.text));
    if (!firstPoll) fresh.slice(0, 4).reverse().forEach((f, i) => setTimeout(() => launchAmbient([f.text, f.where]), i * 800));
    if (d.feed && d.feed.length) seenFeed = Math.max(seenFeed, ...d.feed.map((f) => f.ts));
    S.feed = d.feed || []; renderFeed(); firstPoll = false;
  } catch (e) { /* offline for a moment: the sky keeps going */ }
}
// "I'm here" ping, only while idle: sending lights already marks you as online
let lastSent = 0;
function beat() { if (!document.hidden && Date.now() - lastSent > 25000) API.post('/api/beat', { anon: S.anon }).catch(() => {}); }
function openJoin() { closeDrawer(); closeTime(); S.joining = true; $('#join').hidden = false; $('#joinErr').textContent = ''; setTimeout(() => $('#jName').focus(), 30); }
function closeJoin() { S.joining = false; $('#join').hidden = true; }
$('#joinX').addEventListener('click', closeJoin);
$('#join').addEventListener('pointerdown', (e) => { if (e.target === $('#join')) closeJoin(); });
$('#joinForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('#joinGo'); btn.disabled = true; $('#joinErr').textContent = '';
  try {
    const r = await API.post('/api/join', { name: $('#jName').value, city: $('#jCity').value, state: $('#jState').value });
    S.user = { ...r.user, token: r.token }; saveLocal('ek-user', S.user); S.skyName = S.user.name;
    $('#btnSignin').textContent = S.user.name;
    closeJoin(); startPlay();
  } catch (err) { $('#joinErr').textContent = err.message; }
  finally { btn.disabled = false; }
});
S.user = loadLocal('ek-user');
if (S.user && S.user.token) { S.skyName = S.user.name; $('#btnSignin').textContent = S.user.name; } else S.user = null;
// The kit is kept in the browser so a reload doesn't refill it (the server keeps its own copy too).
// Today's points ride along so the HUD doesn't show 0 after a reload (the server's number wins on the next send).
const today = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
function saveKit() { if (S.user) saveLocal('ek-kit', { uid: S.user.id, inv: S.inv, next: S.next, day: today(), pts: S.pts, rank: S.rank }); }
function restoreKit() {
  const k = loadLocal('ek-kit');
  if (!S.user || !k || k.uid !== S.user.id) return;
  Object.assign(S.inv, k.inv); S.next = k.next || {};
  if (k.day === today()) { S.pts = k.pts || 0; S.rank = k.rank || null; }
  // add whatever refilled while the page was closed
  const now = Date.now();
  for (const key in KIT) {
    const r = KIT[key];
    if (r.earned) continue;
    while (S.next[key] && S.next[key] <= now) {
      S.inv[key] = Math.min(r.cap, (S.inv[key] || 0) + r.amt);
      S.next[key] = S.inv[key] < r.cap ? S.next[key] + r.every * 1000 : 0;
    }
    startRefill(key);
  }
}
restoreKit();
// someone who already joined on this browser goes straight to their rooftop
if (S.user) { startPlay(); toast(`Welcome back, ${S.user.name}. Your kit is where you left it.`); }
S.anon = loadLocal('ek-anon') || (crypto.randomUUID ? crypto.randomUUID() : (Date.now().toString(36) + Math.random().toString(36).slice(2)));
saveLocal('ek-anon', S.anon);
setInterval(flush, 15000);
addEventListener('pagehide', flush);
document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); else { poll(); beat(); } });
setInterval(poll, 10000); poll();
setInterval(beat, 30000); beat();

let shake = 0, kick = 0, T = 0, last = performance.now();
const look = new THREE.Vector3(), cm = { x: 0, y: 0 };
const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
function frame(now) {
  const dt = Math.min(0.033, (now - last) / 1000); last = now; T += dt; U.uTime.value = T;
  if (S.studio) { requestAnimationFrame(frame); return; }
  if (camTw) {
    camTw.t += dt;
    const k = Math.min(1, camTw.t / camTw.dur), e = ease(k);
    camera.position.lerpVectors(camTw.fp, camTw.tp, e);
    camera.position.y += Math.sin(Math.PI * e) * camTw.arc;
    curLook.lerpVectors(camTw.fl, camTw.tl, e);
    camera.lookAt(curLook);
    if (camTw.to === 'aerial') viewBlend = e; else if (camTw.to === 'roof') viewBlend = 1 - e;
    if (k >= 1) {
      if (camTw.to === 'aerial') { controls.target.copy(AER_TGT); controls.enabled = true; controls.autoRotate = !REDUCED; lastTouch = performance.now(); controls.update(); }
      if (camTw.to === 'peek') peekHold = 3.2;
      camTw = null;
    }
  } else if (peekHold > 0) {
    peekHold -= dt;
    if (peekHold <= 0) camTw = { fp: camera.position.clone(), fl: curLook.clone(), tp: CAM.clone(), tl: LOOK.clone(), t: 0, dur: 1.6, to: 'back', arc: 0.4 };
  } else if (S.view === 'aerial') {
    if (!controls.autoRotate && !REDUCED && performance.now() - lastTouch > 8000) controls.autoRotate = true;
    controls.target.x = clamp(controls.target.x, -220, 220); controls.target.z = clamp(controls.target.z, -320, 110);
    controls.update();
    viewBlend = 1;
    if (shake > 0.001) { camera.position.x += R(-1, 1) * shake; camera.position.y += R(-1, 1) * shake; }
  } else {
    const par = REDUCED ? 0 : (activeSparkler ? 0.25 : 1);
    cm.x += (pointer.nx * par - cm.x) * Math.min(1, dt * 1.8); cm.y += (pointer.ny * par - cm.y) * Math.min(1, dt * 1.8);
    camera.position.set(CAM.x + cm.x * 0.35 + (REDUCED ? 0 : Math.sin(T * 0.17) * 0.12), CAM.y - cm.y * 0.12, CAM.z + kick * 0.35);
    look.set(LOOK.x + cm.x * 5, LOOK.y - cm.y * 3 + (REDUCED ? 0 : Math.sin(T * 0.11) * 0.5) + kick * 2.2, LOOK.z);
    camera.lookAt(look); curLook.copy(look);
    viewBlend = 0;
    if (shake > 0.001) { camera.position.x += R(-1, 1) * shake; camera.position.y += R(-1, 1) * shake; camera.rotation.z += R(-1, 1) * shake * 0.04; }
  }
  shake *= Math.exp(-dt * 5); kick *= Math.exp(-dt * 6);
  updateEnvironment(dt);
  glowMat.uniforms.uBoost.value = 1 + viewBlend * 2.4; glowMat.uniforms.uGain.value = 1 + viewBlend * 0.9;
  beam.visible = viewBlend > 0.02; beam.material.uniforms.uA.value = viewBlend * lerp(0.5, 1, ENV.night);
  sky.position.copy(camera.position);
  if (md.on) {
    md.t += dt; glowMat.uniforms.uWaveR.value = md.t < 2 ? -50 : (md.t - 2) * 70;
    if (md.t > 12) { md.on = false; glowMat.uniforms.uLit.value = 1; }
  }
  if (mdRush > 0) mdRush -= dt;
  ambientTick(dt);
  updateShells(dt);
  for (let i = emitters.length - 1; i >= 0; i--) if (!emitters[i].update(dt)) emitters.splice(i, 1);
  sparks.update(dt); smoke.update(dt);
  updateFlashes(dt); updateDiyas(T, dt);
  kandils.forEach((k) => {
    k.pivot.rotation.z = Math.sin(T * 0.9 + k.ph) * 0.12; k.pivot.rotation.x = Math.sin(T * 0.7 + k.ph) * 0.06;
    lampPos[k.lampIdx].copy(k.body.getWorldPosition(_v));
    const f = (0.85 + 0.15 * Math.sin(T * 6 + k.ph)) * lerp(0.3, 1, ENV.night);
    lampCol[k.lampIdx].set(k.color[0] * 0.35 * f, k.color[1] * 0.35 * f, k.color[2] * 0.35 * f);
  });
  updateLabels(dt);
  composer.render();
  requestAnimationFrame(frame);
}
lightDiya(0); lightDiya(8);
requestAnimationFrame(frame);
setTimeout(() => launchAmbient(), 900);
setTimeout(() => myRocket(new THREE.Vector3(-18, 44, -110)), 2200);
}
