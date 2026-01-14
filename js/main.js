const canvas = document.getElementById("fx");
const ctx = canvas.getContext("2d");
const coreEl = document.getElementById("core");
const panelEl = document.getElementById("panel");
const hintEl = document.getElementById("hint");

let W, H, DPR;

function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth * DPR;
  H = window.innerHeight * DPR;
  canvas.width = W;
  canvas.height = H;
}
window.addEventListener("resize", resize);
resize();

function hexToRgb(hex) {
  const n = parseInt(hex.replace("#", ""), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function lerp(a, b, t) {
  return a + (b - a) * t;
}
function mixColor(ca, cb, t) {
  const a = hexToRgb(ca),
    b = hexToRgb(cb);
  return `rgb(${Math.round(lerp(a.r, b.r, t))},${Math.round(
    lerp(a.g, b.g, t)
  )},${Math.round(lerp(a.b, b.b, t))})`;
}

const blobs = [];
function spawnBlob(x, y, r, color, a) {
  blobs.push({ x, y, r, color, a, vr: lerp(2, 5, Math.random()), va: 0.003 });
}

let ignited = false;
let startTime = 0;

function ignite() {
  if (ignited) return;
  ignited = true;
  startTime = performance.now();
  if (hintEl) hintEl.style.opacity = "0";
}

window.addEventListener("click", ignite);
window.addEventListener("wheel", ignite);

function animate(now) {
  ctx.fillStyle = "rgba(5, 7, 12, 0.15)";
  ctx.fillRect(0, 0, W, H);

  const cx = W / 2;
  const cy = H * 0.45;
  const css = getComputedStyle(document.documentElement);
  const c1 = css.getPropertyValue("--c1").trim();
  const c2 = css.getPropertyValue("--c2").trim();
  const c3 = css.getPropertyValue("--c3").trim();

  if (!ignited) {
    requestAnimationFrame(animate);
    return;
  }

  const t = Math.min((now - startTime) / 2500, 1); // 2.5초 동안 진행

  // 색상 변화
  let flameColor;
  if (t < 0.5) flameColor = mixColor(c1, c2, t * 2);
  else flameColor = mixColor(c2, c3, (t - 0.5) * 2);

  // 1. 코어(불꽃 점) 효과 및 제거
  if (t < 0.8) {
    coreEl.style.background = flameColor;
    coreEl.style.transform = `translate(-50%, -50%) scale(${1 + t * 15})`;
    coreEl.style.opacity = 1 - t * 1.2; // 점점 투명해짐
  } else {
    coreEl.style.opacity = 0; // 패널 나올 때 완전히 사라짐
  }

  // 2. 화면 전체로 퍼지는 수채화 파티클 생성
  const spawnCount = t < 0.8 ? 5 : 0; // 패널 등장 직전까지만 생성
  for (let i = 0; i < spawnCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    // t가 커질수록 더 먼 거리까지 생성 (폭발 연출)
    const dist = Math.random() * t * Math.max(W, H) * 0.6;
    spawnBlob(
      cx + Math.cos(angle) * dist,
      cy + Math.sin(angle) * dist,
      lerp(30, 150, t),
      flameColor,
      lerp(0.2, 0.05, t)
    );
  }

  // 알갱이 업데이트 및 그리기
  blobs.forEach((b, i) => {
    b.r += b.vr;
    b.a -= b.va;
    if (b.a <= 0) blobs.splice(i, 1);

    ctx.beginPath();
    const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
    const rgba = b.color.replace("rgb", "rgba").replace(")", `,${b.a})`);
    g.addColorStop(0, rgba);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
  });

  // 3. 패널 등장 타이밍 (불꽃이 충분히 퍼진 후)
  if (t > 0.85) {
    panelEl.classList.add("show");
  }

  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
