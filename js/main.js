// main.js
// Canvas Watercolor Diffusion (캔버스 수채화 번짐)
// - 작은 코어에서 시작해 블롭(얼룩)들이 퍼지며 색이 변하는 데모
// - 실무에서 더 리얼하게 하려면 노이즈 텍스처 + 블렌딩 조정 + WebGL/PixiJS로 강화 가능

const canvas = document.getElementById("fx");
const ctx = canvas.getContext("2d");

const coreEl = document.getElementById("core");
const panelEl = document.getElementById("panel");
const hintEl = document.getElementById("hint");

let W, H, DPR;

function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = Math.floor(window.innerWidth * DPR);
  H = Math.floor(window.innerHeight * DPR);
  canvas.width = W;
  canvas.height = H;
}
window.addEventListener("resize", resize);
resize();

// ---- 색 유틸 ----
function hexToRgb(hex) {
  const s = hex.replace("#", "").trim();
  const n = parseInt(s, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function lerp(a, b, t) {
  return a + (b - a) * t;
}
function mixColor(ca, cb, t) {
  const a = hexToRgb(ca),
    b = hexToRgb(cb);
  const r = Math.round(lerp(a.r, b.r, t));
  const g = Math.round(lerp(a.g, b.g, t));
  const bb = Math.round(lerp(a.b, b.b, t));
  return `rgb(${r},${g},${bb})`;
}
function rgbToRgba(rgb, a) {
  // rgb(1,2,3) -> rgba(1,2,3,0.5)
  return rgb.replace("rgb", "rgba").replace(")", `,${a})`);
}

// ---- 블롭(수채화 얼룩) 파티클 ----
const blobs = [];
const MAX_BLOBS = 160;

function spawnBlob(x, y, baseR, color, alpha) {
  blobs.push({
    x,
    y,
    r: baseR,
    vr: lerp(0.6, 2.2, Math.random()) * DPR,
    vx: (Math.random() - 0.5) * 0.9 * DPR,
    vy: (Math.random() - 0.5) * 0.9 * DPR,
    a: alpha,
    va: lerp(0.002, 0.006, Math.random()),
    color,
  });
  if (blobs.length > MAX_BLOBS) blobs.shift();
}

// ---- 점화 상태 ----
let ignited = false;
let startTime = 0;
let showPanel = false;

function ignite() {
  if (ignited) return;
  ignited = true;
  startTime = performance.now();
  if (hintEl) hintEl.style.opacity = "0";
}

// 트리거: 클릭/스크롤/터치
window.addEventListener("click", ignite, { passive: true });
window.addEventListener("wheel", ignite, { passive: true });
window.addEventListener("touchstart", ignite, { passive: true });

function animate(now) {
  // 잔상으로 번짐 느낌 만들기 (완전 클리어 X)
  ctx.fillStyle = "rgba(5, 7, 12, 0.10)";
  ctx.fillRect(0, 0, W, H);

  const cx = W * 0.5;
  const cy = H * 0.45;

  // CSS 변수에서 컬러 읽기
  const css = getComputedStyle(document.documentElement);
  const c1 = css.getPropertyValue("--c1").trim();
  const c2 = css.getPropertyValue("--c2").trim();
  const c3 = css.getPropertyValue("--c3").trim();

  if (!ignited) {
    // 대기 상태: 푸른 글로우만 살짝
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 70 * DPR);
    g.addColorStop(0, "rgba(118,194,230,0.18)");
    g.addColorStop(1, "rgba(118,194,230,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, 72 * DPR, 0, Math.PI * 2);
    ctx.fill();

    requestAnimationFrame(animate);
    return;
  }

  // 진행도 t: 0~1
  const elapsed = now - startTime;
  const t = Math.min(elapsed / 3200, 1);

  // 색 변화: c1 -> c2 -> c3
  let flameColor;
  if (t < 0.55) flameColor = mixColor(c1, c2, t / 0.55);
  else flameColor = mixColor(c2, c3, (t - 0.55) / 0.45);

  // 코어(점) 스타일 업데이트
  coreEl.style.background = flameColor;
  coreEl.style.boxShadow = `
    0 0 ${lerp(10, 20, t)}px rgba(255,255,255,0.08),
    0 0 ${lerp(26, 70, t)}px ${rgbToRgba(flameColor, 0.55)},
    0 0 ${lerp(60, 160, t)}px ${rgbToRgba(flameColor, 0.28)}
  `;

  // 퍼지는 반경
  const radius = lerp(8, Math.max(W, H) * 0.42, t);

  // 중심 글로우
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  glow.addColorStop(0, rgbToRgba(flameColor, lerp(0.35, 0.22, t)));
  glow.addColorStop(0.45, rgbToRgba(flameColor, lerp(0.22, 0.12, t)));
  glow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  // 블롭 생성 (t 커질수록 많아짐)
  const spawnCount = Math.floor(lerp(1, 6, Math.min(t * 1.2, 1)));
  for (let i = 0; i < spawnCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * radius * 0.35;

    const x = cx + Math.cos(angle) * dist;
    const y = cy + Math.sin(angle) * dist;

    // 따뜻한 쪽으로 편향
    const warmBias = Math.min(Math.max((t - 0.25) / 0.75, 0), 1);
    const mixed = mixColor(flameColor, c3, warmBias * 0.5);

    spawnBlob(
      x,
      y,
      lerp(10, 46, t) * (0.6 + Math.random() * 0.7),
      mixed,
      lerp(0.16, 0.1, t)
    );
  }

  // 블롭 업데이트/드로우
  for (const b of blobs) {
    b.x += b.vx;
    b.y += b.vy;
    b.r += b.vr;
    b.a = Math.max(0, b.a - b.va);

    const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
    grad.addColorStop(0, rgbToRgba(b.color, b.a));
    grad.addColorStop(0.65, rgbToRgba(b.color, b.a * 0.35));
    grad.addColorStop(1, "rgba(0,0,0,0)");

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 패널 등장
  if (!showPanel && t > 0.78) {
    showPanel = true;
    panelEl.classList.add("show");
  }

  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);
