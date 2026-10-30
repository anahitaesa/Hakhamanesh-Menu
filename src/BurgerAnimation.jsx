import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import "./BurgerAnimation.css";

/* ------------------------------------------------------------------ */
/*  ارتفاع هر لایه در حالت بسته و باز (واحد صحنه)                      */
/* ------------------------------------------------------------------ */
const LAYER_POSITIONS = {
  bottom: { closed: 0.0, open: 0.0 },
  sauce: { closed: 0.36, open: 0.65 },
  patty: { closed: 0.42, open: 1.1 },
  cheese: { closed: 0.78, open: 1.75 },
  pickle: { closed: 0.84, open: 2.2 },
  onion: { closed: 0.86, open: 2.65 },
  tomato: { closed: 0.91, open: 3.1 },
  lettuce: { closed: 1.0, open: 3.6 },
  top: { closed: 1.1, open: 4.25 },
};
const CENTER_CLOSED = 0.9;
const CENTER_OPEN = 2.5;

const { damp, lerp } = THREE.MathUtils;
const ss = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const mix = (a, b, t) => a + (b - a) * t;

function mulberry32(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------ */
/*  تولید بافت‌های رویه‌ای (بدون هیچ فایل تصویری)                      */
/* ------------------------------------------------------------------ */

// نویز fBm قابل تکرار (tileable) با مقادیر ۰ تا ۱
function fbm(size, seed, period, octaves, gain = 0.5) {
  const rnd = mulberry32(seed);
  const out = new Float32Array(size * size);
  let amp = 1;
  let total = 0;
  for (let o = 0; o < octaves; o++) {
    const p = period * 2 ** o;
    const grid = new Float32Array(p * p);
    for (let i = 0; i < grid.length; i++) grid[i] = rnd();
    for (let y = 0; y < size; y++) {
      const gy = (y / size) * p;
      const y0 = Math.floor(gy);
      const fy = gy - y0;
      const sy = fy * fy * (3 - 2 * fy);
      const ya = (y0 % p) * p;
      const yb = ((y0 + 1) % p) * p;
      for (let x = 0; x < size; x++) {
        const gx = (x / size) * p;
        const x0 = Math.floor(gx);
        const fx = gx - x0;
        const sx = fx * fx * (3 - 2 * fx);
        const xa = x0 % p;
        const xb = (x0 + 1) % p;
        const top = grid[ya + xa] + (grid[ya + xb] - grid[ya + xa]) * sx;
        const bot = grid[yb + xa] + (grid[yb + xb] - grid[yb + xa]) * sx;
        out[y * size + x] += (top + (bot - top) * sy) * amp;
      }
    }
    total += amp;
    amp *= gain;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}

function pixelTexture(size, pixel, srgb = false) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  const img = ctx.createImageData(size, size);
  const o = [0, 0, 0];
  for (let i = 0; i < size * size; i++) {
    pixel(i, o);
    img.data[i * 4] = o[0];
    img.data[i * 4 + 1] = o[1];
    img.data[i * 4 + 2] = o[2];
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function canvasTexture(size, draw, srgb = true) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  draw(c.getContext("2d"), size);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function withRepeat(tex, x, y) {
  const t = tex.clone();
  t.repeat.set(x, y);
  t.needsUpdate = true;
  return t;
}

// نان: طلایی طبیعی، لکه‌های برشته‌ی قهوه‌ای، منافذ ریز
function bakeBread(kind) {
  const size = 512;
  const top = kind === "top";
  const lo = fbm(size, top ? 11 : 21, 2, 3);
  const mid = fbm(size, top ? 12 : 22, 8, 4);
  const hi = fbm(size, top ? 13 : 23, 32, 3);
  const base = top ? [196, 128, 56] : [206, 150, 82];
  const brown = top ? [118, 60, 22] : [150, 90, 40];
  const map = pixelTexture(size, (i, o) => {
    const k = ss(0.42, 0.72, lo[i] * 0.55 + mid[i] * 0.45) * (top ? 0.85 : 0.55);
    const pore = ss(0.36, 0.2, hi[i]);
    const f = 1 - 0.28 * pore + (mid[i] - 0.5) * 0.12;
    o[0] = mix(base[0], brown[0], k) * f;
    o[1] = mix(base[1], brown[1], k) * f;
    o[2] = mix(base[2], brown[2], k) * f;
  }, true);
  const bump = pixelTexture(size, (i, o) => {
    const h = mid[i] * 0.45 + hi[i] * 0.55 - 0.35 * ss(0.36, 0.2, hi[i]);
    o[0] = o[1] = o[2] = h * 255;
  });
  const rough = pixelTexture(size, (i, o) => {
    o[0] = o[1] = o[2] = (0.55 + 0.35 * hi[i]) * 255;
  });
  return { map, bump, rough };
}

// گوشت: قهوه‌ای طبیعی، لکه‌های برشته، ترک‌های ریز، لکه‌های چربی براق
function bakePatty() {
  const size = 512;
  const lo = fbm(size, 31, 3, 3);
  const mid = fbm(size, 32, 10, 4);
  const hi = fbm(size, 33, 48, 2);
  const base = [74, 41, 24];
  const char = [28, 16, 10];
  const red = [98, 55, 33];
  const fat = [138, 96, 62];
  const map = pixelTexture(size, (i, o) => {
    const t = ss(0.5, 0.75, lo[i] * 0.5 + mid[i] * 0.5);
    const rd = ss(0.5, 0.25, lo[i]) * 0.45;
    const ft = ss(0.8, 0.9, hi[i]) * 0.55;
    const fis = ss(0.3, 0.15, mid[i]);
    for (let c = 0; c < 3; c++) {
      let v = mix(base[c], char[c], t);
      v = mix(v, red[c], rd);
      v = mix(v, fat[c], ft);
      o[c] = v * (1 - 0.12 * fis);
    }
  }, true);
  const bump = pixelTexture(size, (i, o) => {
    const h = mid[i] * 0.3 + hi[i] * 0.7 - 0.1 * ss(0.3, 0.15, mid[i]);
    o[0] = o[1] = o[2] = h * 255;
  });
  const rough = pixelTexture(size, (i, o) => {
    const ft = ss(0.8, 0.9, hi[i]);
    const ch = ss(0.5, 0.75, lo[i] * 0.5 + mid[i] * 0.5);
    o[0] = o[1] = o[2] = mix(mix(0.8, 0.92, ch), 0.35, ft) * 255;
  });
  return { map, bump, rough };
}

// پنیر: زرد ملایم، لکه‌های روشن‌تر و تیره‌تر، سطح نرم
function bakeCheese() {
  const size = 256;
  const lo = fbm(size, 41, 3, 3);
  const mid = fbm(size, 42, 12, 3);
  const map = pixelTexture(size, (i, o) => {
    const t = ss(0.35, 0.65, lo[i]);
    const bl = ss(0.62, 0.78, mid[i]) * 0.5;
    o[0] = mix(mix(208, 224, t), 176, bl);
    o[1] = mix(mix(146, 168, t), 110, bl);
    o[2] = mix(mix(46, 66, t), 28, bl);
  }, true);
  const bump = pixelTexture(size, (i, o) => {
    o[0] = o[1] = o[2] = (lo[i] * 0.5 + mid[i] * 0.5) * 255;
  });
  return { map, bump };
}

function bakeNoise() {
  const n = fbm(256, 51, 8, 4);
  return pixelTexture(256, (i, o) => {
    o[0] = o[1] = o[2] = n[i] * 255;
  });
}

function drawTomato(ctx, s) {
  const c = s / 2;
  const g = ctx.createRadialGradient(c, c, s * 0.05, c, c, c);
  g.addColorStop(0, "#c9422d");
  g.addColorStop(0.8, "#b5301f");
  g.addColorStop(1, "#8a2013");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(c, c, c, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#7f1d12";
  ctx.lineWidth = s * 0.05;
  ctx.beginPath();
  ctx.arc(c, c, c * 0.96, 0, Math.PI * 2);
  ctx.stroke();
  const rnd = mulberry32(5);
  const n = 4;
  for (let k = 0; k < n; k++) {
    const a0 = (k / n) * Math.PI * 2 + 0.4;
    const a1 = ((k + 1) / n) * Math.PI * 2 + 0.4;
    const am = (a0 + a1) / 2;
    ctx.fillStyle = "#c4452b";
    ctx.beginPath();
    ctx.ellipse(c + Math.cos(am) * c * 0.5, c + Math.sin(am) * c * 0.5, c * 0.3, c * 0.2, am, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#d8c78e";
    for (let j = 0; j < 5; j++) {
      const rr = c * (0.35 + rnd() * 0.3);
      const aa = am + (rnd() - 0.5) * 0.7;
      ctx.beginPath();
      ctx.ellipse(c + Math.cos(aa) * rr, c + Math.sin(aa) * rr, c * 0.04, c * 0.025, aa + 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = "#d49a82";
    ctx.lineWidth = s * 0.022;
    ctx.beginPath();
    ctx.moveTo(c, c);
    ctx.lineTo(c + Math.cos(a0) * c * 0.92, c + Math.sin(a0) * c * 0.92);
    ctx.stroke();
  }
  ctx.fillStyle = "#d9aa94";
  ctx.beginPath();
  ctx.arc(c, c, c * 0.1, 0, Math.PI * 2);
  ctx.fill();
}

function drawPickle(ctx, s) {
  const c = s / 2;
  const g = ctx.createRadialGradient(c, c, 0, c, c, c);
  g.addColorStop(0, "#a2a862");
  g.addColorStop(0.55, "#86913f");
  g.addColorStop(0.86, "#647630");
  g.addColorStop(0.93, "#3f5420");
  g.addColorStop(1, "#33481a");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(c, c, c, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#a9b46c";
  ctx.lineWidth = s * 0.03;
  ctx.beginPath();
  ctx.arc(c, c, c * 0.3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#c3ca8e";
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.ellipse(c + Math.cos(a) * c * 0.42, c + Math.sin(a) * c * 0.42, c * 0.05, c * 0.028, a, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawLettuce(ctx, s, bump) {
  const c = s / 2;
  if (bump) {
    ctx.fillStyle = "#555";
    ctx.fillRect(0, 0, s, s);
  } else {
    const g = ctx.createRadialGradient(c, c, 0, c, c, c);
    g.addColorStop(0, "#9aa762");
    g.addColorStop(0.35, "#6f8d3a");
    g.addColorStop(1, "#46661f");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  }
  ctx.lineCap = "round";
  const rnd = mulberry32(9);
  for (let k = 0; k < 26; k++) {
    const a = (k / 26) * Math.PI * 2 + rnd() * 0.1;
    const main = k % 5 === 0;
    ctx.strokeStyle = bump ? (main ? "#fff" : "#bbb") : main ? "rgba(176,196,120,0.7)" : "rgba(150,175,95,0.4)";
    ctx.lineWidth = main ? s * 0.018 : s * 0.007;
    const r = c * 0.92;
    const bend = (rnd() - 0.5) * 0.3;
    ctx.beginPath();
    ctx.moveTo(c, c);
    ctx.quadraticCurveTo(c + Math.cos(a + bend) * r * 0.5, c + Math.sin(a + bend) * r * 0.5, c + Math.cos(a) * r, c + Math.sin(a) * r);
    ctx.stroke();
  }
}

let TEX = null;
function getTextures() {
  if (TEX) return TEX;
  TEX = {
    topBun: bakeBread("top"),
    bottomBun: bakeBread("bottom"),
    patty: bakePatty(),
    cheese: bakeCheese(),
    noise: bakeNoise(),
    tomato: canvasTexture(256, drawTomato),
    pickle: canvasTexture(256, drawPickle),
    lettuce: canvasTexture(256, (c, s) => drawLettuce(c, s, false)),
    lettuceBump: canvasTexture(256, (c, s) => drawLettuce(c, s, true), false),
  };
  return TEX;
}

/* ------------------------------------------------------------------ */
/*  هندسه‌ها                                                            */
/* ------------------------------------------------------------------ */
function latheRounded(rim, seg = 96, samples = 32) {
  const curve = new THREE.SplineCurve(rim.map(([x, y]) => new THREE.Vector2(x, y)));
  const pts = curve.getPoints(samples);
  pts.unshift(new THREE.Vector2(0, pts[0].y));
  pts.push(new THREE.Vector2(0, pts[pts.length - 1].y));
  return new THREE.LatheGeometry(pts, seg);
}

// تکرار بافت روی دیواره‌ی جانبی با همان تراکم سطح بالایی
function setSideUV(geo, tiles, size) {
  const p = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, uv.getX(i) * tiles, p.getY(i) / size);
}

const radialNoise = (a) =>
  1 + 0.03 * Math.sin(a * 5 + 1) + 0.02 * Math.sin(a * 11 + 2) + 0.012 * Math.sin(a * 23);

function makeTopBunGeometry() {
  const a = 1.04;
  const b = 0.7;
  const pts = [new THREE.Vector2(0, 0), new THREE.Vector2(0.98, 0), new THREE.Vector2(1.03, 0.035)];
  const start = (80 / 180) * Math.PI;
  for (let i = 0; i <= 18; i++) {
    const th = start * (1 - i / 18);
    pts.push(new THREE.Vector2(a * Math.sin(th), b * Math.cos(th)));
  }
  const g = new THREE.LatheGeometry(pts, 96);
  const p = g.attributes.position;
  const uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    uv.setXY(i, x * 0.5 + 0.5, z * 0.5 + 0.5); // نگاشت تخت از بالا برای بافت یکنواخت
    if (y > 0.04) {
      const n = 1 + 0.012 * Math.sin(x * 5.1 + z * 3.3) + 0.01 * Math.sin(z * 6.7 - x * 2.9 + y * 4);
      p.setXYZ(i, x * n, y * (1 + 0.02 * Math.sin(x * 4 + z * 5)), z * n);
    }
  }
  return g;
}

function makeBottomBunGeometry() {
  const g = latheRounded(
    [[0.8, 0], [0.97, 0.04], [1.03, 0.17], [1.0, 0.3], [0.9, 0.372], [0.8, 0.38]], 96, 40,
  );
  setSideUV(g, 3, 2.1);
  return g;
}

function makeSauceGeometry() {
  const g = latheRounded([[0.8, 0], [0.95, 0.01], [1.0, 0.05], [0.97, 0.1], [0.88, 0.12]], 96, 24);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const z = p.getZ(i);
    const f = radialNoise(Math.atan2(z, x) * 1.3);
    p.setX(i, x * f);
    p.setZ(i, z * f);
  }
  return g;
}

const pattyNoise = (a) => 1 + 0.008 * Math.sin(a * 3 + 1) + 0.005 * Math.sin(a * 7 + 2);

// پتی منسجم و ضخیم: دیواره‌ی گرد، سطح بالای تقریباً صاف با برجستگی خیلی ظریف
function makePattyGeometry() {
  const H = 0.36;
  const curve = new THREE.SplineCurve(
    [[0.93, 0], [0.99, 0.04], [1.01, 0.16], [1.0, 0.29], [0.96, H]].map(([x, y]) => new THREE.Vector2(x, y)),
  );
  const side = new THREE.LatheGeometry(curve.getPoints(28), 128);
  setSideUV(side, 3, 1.96);

  const top = new THREE.RingGeometry(0.001, 0.96, 128, 24);
  top.rotateX(-Math.PI / 2);
  top.translate(0, H, 0);
  const bottom = new THREE.RingGeometry(0.001, 0.93, 64, 2);
  bottom.rotateX(Math.PI / 2);

  const tp = top.attributes.position;
  for (let i = 0; i < tp.count; i++) {
    const x = tp.getX(i);
    const z = tp.getZ(i);
    const w = 1 - ss(0.84, 0.96, Math.hypot(x, z));
    const bump = Math.sin(x * 13 + z * 9) * 0.5 + Math.sin(x * 21 - z * 17) * 0.35 + Math.sin(z * 29 + x * 7) * 0.25;
    tp.setY(i, H + 0.011 * bump * w);
  }
  top.computeVertexNormals();

  // رنگ رأس‌ها: لبه‌ی برشته‌تر و ردهای بسیار ملایم گریل روی سطح بالا
  const paint = (geo, fn) => {
    const p = geo.attributes.position;
    const c = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const v = fn(p.getX(i), p.getY(i), p.getZ(i));
      c[i * 3] = c[i * 3 + 1] = c[i * 3 + 2] = v;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(c, 3));
  };
  paint(side, () => 0.6);
  paint(bottom, () => 0.5);
  paint(top, (x, y, z) => {
    const crust = 1 - 0.4 * ss(0.68, 0.96, Math.hypot(x, z));
    const grill = 1 - 0.16 * ss(0.55, 0.9, Math.sin((x + z) * 9));
    return crust * grill;
  });

  const merged = mergeGeometries([side, top, bottom]);
  const p = merged.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const z = p.getZ(i);
    const f = pattyNoise(Math.atan2(z, x));
    p.setX(i, x * f);
    p.setZ(i, z * f);
  }
  return merged;
}

// پنیر: ورقه‌ی نرم با گوشه‌های گرد که به‌آرامی روی لبه‌ی گوشت آویزان می‌شود
function makeCheeseGeometry() {
  const g = new THREE.PlaneGeometry(1.96, 1.96, 56, 56);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i);
    let z = p.getZ(i);
    const ax = Math.abs(x) - 0.76;
    const az = Math.abs(z) - 0.76;
    if (ax > 0 && az > 0) {
      const l = Math.hypot(ax, az);
      if (l > 0.22) {
        const k = 0.22 / l;
        x = Math.sign(x) * (0.76 + ax * k);
        z = Math.sign(z) * (0.76 + az * k);
      }
    }
    const ang = Math.atan2(z, x);
    const over = Math.max(0, Math.hypot(x, z) - 0.9);
    const wob = 0.9 + 0.2 * Math.sin(ang * 5 + 1) * Math.cos(ang * 3);
    const ripple = 0.008 * Math.sin(x * 7) * Math.sin(z * 6);
    p.setXYZ(i, x, 0.03 + ripple - 0.55 * Math.pow(over, 1.25) * wob, z);
  }
  g.rotateY(Math.PI / 4);
  g.computeVertexNormals();
  return g;
}

function makeLettuceGeometry(radius, phase) {
  const g = new THREE.RingGeometry(0.12, radius, 160, 16);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const r = Math.hypot(x, y);
    const a = Math.atan2(y, x);
    const w = r / radius;
    const ruffle = 1 + 0.05 * Math.sin(a * 12 + phase) * w;
    p.setX(i, x * ruffle);
    p.setY(i, y * ruffle);
    p.setZ(
      i,
      w * w * (0.09 * Math.sin(a * 9 + phase) + 0.05 * Math.sin(a * 17) + 0.02 * Math.sin(a * 29)) + 0.03,
    );
  }
  g.rotateX(-Math.PI / 2);
  g.computeVertexNormals();
  return g;
}

function useDisposable(factory) {
  const obj = useMemo(factory, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => obj.dispose?.(), [obj]);
  return obj;
}

/* ------------------------------------------------------------------ */
/*  لایه‌ها                                                             */
/* ------------------------------------------------------------------ */
function Seeds() {
  const ref = useRef();
  useLayoutEffect(() => {
    const rnd = mulberry32(7);
    const n = 56;
    const A = 1.04;
    const B = 0.7;
    const up = new THREE.Vector3(0, 1, 0);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const roll = new THREE.Quaternion();
    const pos = new THREE.Vector3();
    const nrm = new THREE.Vector3();
    const scl = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      const th = 0.1 + 0.98 * Math.sqrt((i + 0.5) / n) + (rnd() - 0.5) * 0.05;
      const ph = i * 2.39996;
      pos.set(A * Math.sin(th) * Math.cos(ph), B * Math.cos(th), A * Math.sin(th) * Math.sin(ph));
      nrm.set(pos.x / (A * A), pos.y / (B * B), pos.z / (A * A)).normalize();
      q.setFromUnitVectors(up, nrm);
      roll.setFromAxisAngle(nrm, rnd() * Math.PI);
      q.premultiply(roll);
      const s = 0.85 + rnd() * 0.35;
      scl.set(s * 1.25, s * 0.45, s * 0.6);
      pos.addScaledVector(nrm, -0.006);
      m.compose(pos, q, scl);
      ref.current.setMatrixAt(i, m);
    }
    ref.current.instanceMatrix.needsUpdate = true;
  }, []);
  return (
    <instancedMesh ref={ref} args={[null, null, 56]}>
      <sphereGeometry args={[0.06, 12, 8]} />
      <meshStandardMaterial color="#d6bb82" roughness={0.5} />
    </instancedMesh>
  );
}

function TopBun() {
  const geo = useDisposable(makeTopBunGeometry);
  const t = useMemo(() => getTextures().topBun, []);
  const noise = useMemo(() => withRepeat(getTextures().noise, 6, 6), []);
  return (
    <group>
      <mesh geometry={geo}>
        {/* روی نان کمی براقیت ملایم (رنگ تخم‌مرغ/کره) دارد، نه پلاستیکی */}
        <meshPhysicalMaterial map={t.map} bumpMap={t.bump} bumpScale={1.6} roughnessMap={t.rough}
          roughness={1} clearcoat={0.1} clearcoatRoughness={0.5} sheen={0.2}
          sheenColor="#ffb870" sheenRoughness={0.8} />
      </mesh>
      <mesh position-y={-0.004} rotation-x={Math.PI / 2}>
        <circleGeometry args={[0.98, 64]} />
        <meshStandardMaterial color="#c9a870" roughness={1} bumpMap={noise} bumpScale={2} />
      </mesh>
      <Seeds />
    </group>
  );
}

function BottomBun() {
  const geo = useDisposable(makeBottomBunGeometry);
  const t = useMemo(() => getTextures().bottomBun, []);
  const noise = useMemo(() => withRepeat(getTextures().noise, 6, 6), []);
  return (
    <group>
      <mesh geometry={geo}>
        <meshPhysicalMaterial map={t.map} bumpMap={t.bump} bumpScale={1.4} roughnessMap={t.rough}
          roughness={1} sheen={0.25} sheenColor="#ffb870" sheenRoughness={0.8} />
      </mesh>
      <mesh position-y={0.382} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.9, 64]} />
        <meshStandardMaterial color="#cfae78" roughness={1} bumpMap={noise} bumpScale={2} />
      </mesh>
    </group>
  );
}

function Sauce() {
  const geo = useDisposable(makeSauceGeometry);
  const noise = useMemo(() => withRepeat(getTextures().noise, 8, 2), []);
  return (
    <mesh geometry={geo}>
      <meshPhysicalMaterial color="#c49a6e" roughness={0.5} clearcoat={0.15} clearcoatRoughness={0.5}
        bumpMap={noise} bumpScale={0.6} />
    </mesh>
  );
}

function Patty() {
  const geo = useDisposable(makePattyGeometry);
  const t = useMemo(() => getTextures().patty, []);
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial map={t.map} bumpMap={t.bump} bumpScale={2} roughnessMap={t.rough} roughness={1} vertexColors />
    </mesh>
  );
}

function Cheese() {
  const geo = useDisposable(makeCheeseGeometry);
  const t = useMemo(() => getTextures().cheese, []);
  return (
    <mesh geometry={geo}>
      {/* پنیر نرم و مات‌تر؛ فقط یک درخشش خیلی ملایم از رطوبت سطح */}
      <meshPhysicalMaterial map={t.map} bumpMap={t.bump} bumpScale={0.4} roughness={0.62}
        sheen={0.25} sheenColor="#e0a850" sheenRoughness={0.5} clearcoat={0.05} clearcoatRoughness={0.55}
        side={THREE.DoubleSide} />
    </mesh>
  );
}

const PICKLES = [[0.55, 0, -0.3], [-0.5, 0.02, 0.35], [0.05, 0, 0.62]];
function Pickles() {
  const geo = useDisposable(() => {
    const g = new THREE.CylinderGeometry(0.27, 0.27, 0.06, 64, 1);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const z = p.getZ(i);
      const f = 1 + 0.02 * Math.sin(Math.atan2(z, x) * 30); // لبه‌ی موجدار خیارشور
      p.setX(i, x * f);
      p.setZ(i, z * f);
    }
    return g;
  });
  const mats = useMemo(() => {
    const tx = getTextures();
    const side = new THREE.MeshPhysicalMaterial({
      color: "#3b5120", roughness: 0.4, clearcoat: 0.35, clearcoatRoughness: 0.35,
      bumpMap: withRepeat(tx.noise, 8, 1), bumpScale: 1.5,
    });
    const face = new THREE.MeshPhysicalMaterial({
      map: tx.pickle, roughness: 0.35, clearcoat: 0.3, clearcoatRoughness: 0.35,
    });
    return [side, face, face];
  }, []);
  return (
    <group>
      {PICKLES.map((p, i) => (
        <mesh key={i} geometry={geo} material={mats} position={p} rotation={[0.04 * i, i, 0.03]} />
      ))}
    </group>
  );
}

const ONION_RINGS = [
  { p: [0.12, 0.04, 0.16], R: 0.66, tilt: [0.05, 0, 0.04] },
  { p: [0.12, 0.04, 0.16], R: 0.46, tilt: [0.05, 0, 0.04] },
  { p: [-0.28, 0.1, -0.2], R: 0.52, tilt: [-0.06, 0, 0.08] },
];
const ONION_LAYERS = [
  { d: 0, c: "#6e2250", t: 0.035 },
  { d: 0.065, c: "#cdb2c6", t: 0.03 },
  { d: 0.125, c: "#8f4571", t: 0.028 },
];
function Onions() {
  return (
    <group>
      {ONION_RINGS.map((o, i) => (
        <group key={i} position={o.p} rotation={o.tilt}>
          {ONION_LAYERS.map((l, j) => (
            <mesh key={j} rotation-x={Math.PI / 2} scale={[1, 1, 1.7]}>
              <torusGeometry args={[o.R - l.d, l.t, 12, 72]} />
              <meshPhysicalMaterial color={l.c} roughness={0.4} clearcoat={0.3} clearcoatRoughness={0.4} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

const TOMATOES = [[-0.4, 0, 0.05, 0.6], [0.4, 0.07, -0.12, 2.1]];
function Tomatoes() {
  const geo = useDisposable(() => new THREE.CylinderGeometry(0.55, 0.55, 0.1, 56, 1));
  const mats = useMemo(() => {
    const tx = getTextures();
    const side = new THREE.MeshPhysicalMaterial({
      color: "#8f2416", roughness: 0.32, clearcoat: 0.5, clearcoatRoughness: 0.25,
    });
    const face = new THREE.MeshPhysicalMaterial({
      map: tx.tomato, roughness: 0.4, clearcoat: 0.3, clearcoatRoughness: 0.35,
      bumpMap: withRepeat(tx.noise, 3, 3), bumpScale: 0.5,
    });
    return [side, face, face];
  }, []);
  return (
    <group>
      {TOMATOES.map(([x, y, z, r], i) => (
        <mesh key={i} geometry={geo} material={mats} position={[x, y + 0.05, z]}
          rotation={[0.03 * i, r, -0.02]} />
      ))}
    </group>
  );
}

function Lettuce() {
  const a = useDisposable(() => makeLettuceGeometry(1.12, 0));
  const b = useDisposable(() => makeLettuceGeometry(0.92, 1.7));
  const mat = useMemo(() => {
    const tx = getTextures();
    return new THREE.MeshPhysicalMaterial({
      map: tx.lettuce, bumpMap: tx.lettuceBump, bumpScale: 1.5, roughness: 0.5,
      clearcoat: 0.12, clearcoatRoughness: 0.5, side: THREE.DoubleSide,
    });
  }, []);
  return (
    <group>
      <mesh geometry={a} material={mat} />
      <mesh geometry={b} material={mat} position-y={0.06} rotation-y={0.8} />
    </group>
  );
}

const LAYERS = [
  { key: "bottom", Comp: BottomBun },
  { key: "sauce", Comp: Sauce },
  { key: "patty", Comp: Patty },
  { key: "cheese", Comp: Cheese },
  { key: "pickle", Comp: Pickles },
  { key: "onion", Comp: Onions },
  { key: "tomato", Comp: Tomatoes },
  { key: "lettuce", Comp: Lettuce },
  { key: "top", Comp: TopBun },
];

function Layer({ index, open, reduced, children }) {
  const { closed, open: openY } = LAYER_POSITIONS[LAYERS[index].key];
  const ref = useRef();
  const t = useRef(0);
  useFrame((state, dt) => {
    const lambda = 2.8 + (open ? index : LAYERS.length - index) * 0.15;
    t.current = damp(t.current, open ? 1 : 0, lambda, dt);
    const time = state.clock.elapsedTime;
    const phase = index * 1.3;
    const float = reduced ? 0 : Math.sin(time * 0.9 + phase) * 0.035 * t.current;
    ref.current.position.y = lerp(closed, openY, t.current) + float;
    if (!reduced) {
      ref.current.rotation.z = Math.sin(time * 0.7 + phase) * 0.02 * t.current;
      ref.current.rotation.x = Math.cos(time * 0.6 + phase) * 0.015 * t.current;
    }
  });
  return (
    <group ref={ref} position-y={closed}>
      {children}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  صحنه                                                                */
/* ------------------------------------------------------------------ */
function Burger({ open, onToggle, reduced, spinSpeed }) {
  const gl = useThree((s) => s.gl);
  const root = useRef();
  const spin = useRef();
  const hit = useRef();
  const p = useRef(0);

  // تمام مش‌ها سایه می‌اندازند و سایه می‌گیرند (سایه‌ی نرم بین لایه‌ها)
  useLayoutEffect(() => {
    root.current.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
  }, []);

  useFrame((state, dt) => {
    p.current = damp(p.current, open ? 1 : 0, 3, dt);
    const s = lerp(1.2, 0.9, p.current);
    const bob = reduced ? 0 : Math.sin(state.clock.elapsedTime * 1.1) * 0.08 * (1 - 0.5 * p.current);
    root.current.scale.setScalar(s);
    root.current.position.y = bob - lerp(CENTER_CLOSED, CENTER_OPEN, p.current) * s;
    if (!reduced) spin.current.rotation.y += dt * spinSpeed;
    hit.current.scale.set(1, lerp(2.1, 4.8, p.current), 1);
  });

  return (
    <group
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      onPointerOver={(e) => { e.stopPropagation(); gl.domElement.style.cursor = "pointer"; }}
      onPointerOut={() => { gl.domElement.style.cursor = "auto"; }}
    >
      <mesh ref={hit}>
        <cylinderGeometry args={[1.3, 1.3, 1, 16]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <group ref={root}>
        <group ref={spin}>
          {LAYERS.map(({ key, Comp }, i) => (
            <Layer key={key} index={i} open={open} reduced={reduced}>
              <Comp />
            </Layer>
          ))}
        </group>
      </group>
    </group>
  );
}

// محیط نورپردازی: اتاق استودیویی خنثی + یک پنل نارنجی گرم که روی سطوح براق بازتاب می‌دهد
function Environment() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const strip = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, 3.2),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(1.0, 0.45, 0.1).multiplyScalar(7),
        side: THREE.DoubleSide,
      }),
    );
    strip.position.set(-3.2, 1.2, -2.6);
    strip.lookAt(0, 1, 0);
    room.add(strip);
    const env = pmrem.fromScene(room, 0.04).texture;
    scene.environment = env;
    if ("environmentIntensity" in scene) scene.environmentIntensity = 0.42;
    return () => {
      scene.environment = null;
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  return null;
}

function Rig() {
  useFrame(({ camera, size }) => {
    const aspect = size.width / size.height;
    camera.position.set(0, 1.7, 9 * Math.max(1, 0.8 / aspect));
    camera.lookAt(0, 0, 0);
  });
  return null;
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const h = (e) => setReduced(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);
  return reduced;
}

function useInView(ref) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    if (!ref.current || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting));
    io.observe(ref.current);
    return () => io.disconnect();
  }, [ref]);
  return visible;
}

/* ------------------------------------------------------------------ */
/*  کامپوننت اصلی                                                       */
/* ------------------------------------------------------------------ */
export default function BurgerAnimation({ className = "", spinSpeed = 0.3 }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const visible = useInView(wrapRef);
  const reduced = useReducedMotion();
  const toggle = useCallback(() => setOpen((o) => !o), []);

  return (
    <div
      ref={wrapRef}
      className={`burger-anim ${className}`.trim()}
      role="button"
      tabIndex={0}
      aria-pressed={open}
      aria-label={open ? "بستن همبرگر" : "باز کردن همبرگر"}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggle();
        }
      }}
    >
      <div className="burger-anim__glow" aria-hidden="true" />
      <Canvas
        style={{ position: "absolute", inset: 0 }}
        shadows
        frameloop={visible ? "always" : "never"}
        dpr={[1, 2]}
        camera={{ fov: 32, position: [0, 1.7, 9] }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        <Environment />
        <Rig />
        <hemisphereLight args={["#ffe9cf", "#3b2412", 0.22]} />
        {/* نور اصلی: سفید گرم و نرم، با سایه */}
        <directionalLight
          position={[3, 6, 4]}
          intensity={1.7}
          color="#fff0dc"
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-3}
          shadow-camera-right={3}
          shadow-camera-top={6}
          shadow-camera-bottom={-3}
          shadow-camera-near={0.5}
          shadow-camera-far={20}
          shadow-bias={-0.0004}
          shadow-normalBias={0.03}
          shadow-radius={4}
        />
        {/* نارنجی ظریف فقط در نور لبه و انعکاس، نه روی رنگ مواد */}
        <directionalLight position={[-4, 2, -3]} intensity={1.3} color="#ff8a2e" />
        <pointLight position={[2, -1.5, 4]} intensity={4} color="#ff9a40" />
        <Burger open={open} onToggle={toggle} reduced={reduced} spinSpeed={spinSpeed} />
      </Canvas>
    </div>
  );
}
