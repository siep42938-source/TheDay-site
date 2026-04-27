// ===== SPACE CANVAS (Stars background) =====
(function initSpace() {
  const canvas = document.getElementById('spaceCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, stars = [], floatParticles = [];
  let isVisible = true;
  let rafId = null;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  // Stars
  for (let i = 0; i < 220; i++) {
    stars.push({
      x: Math.random(), y: Math.random(),
      r: Math.random() * 1.4 + 0.2,
      a: Math.random(),
      da: (Math.random() - 0.5) * 0.006,
      speed: Math.random() * 0.00006 + 0.00001
    });
  }

  // Floating ambient particles
  for (let i = 0; i < 18; i++) {
    floatParticles.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.2 + 0.3,
      vy: -(Math.random() * 0.3 + 0.1),
      vx: (Math.random() - 0.5) * 0.15,
      a: Math.random() * 0.4 + 0.1,
      life: Math.random()
    });
  }

  function draw() {
    if (!isVisible) { rafId = null; return; }
    ctx.clearRect(0, 0, W, H);

    // Subtle deep space gradient
    const bg = ctx.createRadialGradient(W * 0.5, H * 0.4, 0, W * 0.5, H * 0.4, W * 0.9);
    bg.addColorStop(0, 'rgba(5,5,15,0)');
    bg.addColorStop(1, 'rgba(2,2,8,0.3)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Stars
    stars.forEach(s => {
      s.y -= s.speed;
      if (s.y < 0) { s.y = 1; s.x = Math.random(); }
      s.a += s.da;
      if (s.a > 1 || s.a < 0) s.da *= -1;
      const alpha = Math.max(0, Math.min(1, s.a));
      ctx.beginPath();
      ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200,225,255,${alpha})`;
      ctx.fill();
    });

    // Floating ambient particles
    floatParticles.forEach(p => {
      p.y += p.vy;
      p.x += p.vx;
      p.life += 0.003;
      if (p.y < -10 || p.life > 1) {
        p.y = H + 10;
        p.x = Math.random() * W;
        p.life = 0;
      }
      const alpha = p.a * Math.sin(p.life * Math.PI);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(135,206,235,${alpha})`;
      ctx.fill();
    });

    rafId = requestAnimationFrame(draw);
  }

  // Visibility API — останавливаем анимацию когда вкладка неактивна
  document.addEventListener('visibilitychange', () => {
    isVisible = !document.hidden;
    if (isVisible && !rafId) rafId = requestAnimationFrame(draw);
  });

  draw();
})();

// ===== BLACK HOLE — Realistic (как на скрине) =====
(function initBlackHole() {
  const canvas = document.getElementById('blackHoleCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() {
    const parent = canvas.parentElement;
    if (!parent) return;
    const w = Math.min(parent.clientWidth, 560);
    canvas.width = w;
    canvas.height = Math.round(w * 0.98);
  }
  resize();
  window.addEventListener('resize', resize);

  // Рассеянные пиксельные звёзды (как на скрине — прямоугольные точки)
  const pixelStars = [];
  for (let i = 0; i < 180; i++) {
    pixelStars.push({
      x: Math.random(),
      y: Math.random(),
      w: Math.random() * 3 + 0.5,
      h: Math.random() * 2 + 0.5,
      alpha: Math.random() * 0.7 + 0.1,
      hue: Math.random() > 0.7 ? 200 + Math.random() * 40 : 30 + Math.random() * 20,
      twinkle: Math.random() * Math.PI * 2,
      twinkleSpeed: 0.02 + Math.random() * 0.04,
    });
  }

  // Аккреционный диск — тонкие дуги (как на скрине — золотисто-коричневый)
  const diskArcs = [];
  for (let i = 0; i < 8; i++) {
    diskArcs.push({
      radiusMult: 1.0 + i * 0.018,
      startAngle: Math.random() * Math.PI * 2,
      arcLen: Math.PI * (0.3 + Math.random() * 1.4),
      speed: (0.0008 + Math.random() * 0.0015) * (i % 2 === 0 ? 1 : -1),
      alpha: 0.15 + Math.random() * 0.35,
      width: 0.8 + Math.random() * 1.8,
      // Цвета как на скрине: золотисто-коричневые
      r: 180 + Math.floor(Math.random() * 60),
      g: 120 + Math.floor(Math.random() * 60),
      b: 40 + Math.floor(Math.random() * 40),
    });
  }

  // Внешние рассеянные частицы (пиксели вокруг диска)
  const scatterPx = [];
  for (let i = 0; i < 120; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 1.15 + Math.random() * 1.2;
    scatterPx.push({
      angle, dist,
      speed: (0.0003 + Math.random() * 0.0008) * (Math.random() > 0.5 ? 1 : -1),
      w: Math.random() * 3 + 0.5,
      h: Math.random() * 1.5 + 0.5,
      alpha: Math.random() * 0.6 + 0.1,
      hue: Math.random() > 0.6 ? 200 + Math.random() * 40 : 30 + Math.random() * 30,
    });
  }

  let frame = 0, pulse = 0;

  function draw() {
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    const cx = W * 0.5, cy = H * 0.5;
    const R = Math.min(W, H) * 0.32; // крупнее как на скрине
    pulse += 0.015;

    // --- Фон: тёмно-синий как на скрине ---
    const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.75);
    bg.addColorStop(0, 'rgba(8,12,28,1)');
    bg.addColorStop(0.4, 'rgba(5,8,20,1)');
    bg.addColorStop(0.8, 'rgba(3,5,14,1)');
    bg.addColorStop(1, 'rgba(1,2,8,1)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // --- Пиксельные звёзды фона ---
    pixelStars.forEach(s => {
      s.twinkle += s.twinkleSpeed;
      const a = s.alpha * (0.5 + 0.5 * Math.sin(s.twinkle));
      ctx.fillStyle = `hsla(${s.hue},60%,80%,${a})`;
      ctx.fillRect(s.x * W, s.y * H, s.w, s.h);
    });

    // --- Гравитационное линзирование (синеватое свечение вокруг) ---
    const lens = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 2.8);
    lens.addColorStop(0, 'rgba(0,0,0,0)');
    lens.addColorStop(0.15, 'rgba(10,20,60,0.25)');
    lens.addColorStop(0.4, 'rgba(8,15,45,0.15)');
    lens.addColorStop(0.7, 'rgba(5,10,30,0.08)');
    lens.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = lens;
    ctx.beginPath(); ctx.arc(cx, cy, R * 2.8, 0, Math.PI * 2); ctx.fill();

    // --- Рассеянные пиксели вокруг диска ---
    scatterPx.forEach(p => {
      p.angle += p.speed;
      const r = R * p.dist;
      const px = cx + Math.cos(p.angle) * r;
      const py = cy + Math.sin(p.angle) * r * 0.35; // сплющено
      ctx.fillStyle = `hsla(${p.hue},55%,75%,${p.alpha})`;
      ctx.fillRect(px - p.w/2, py - p.h/2, p.w, p.h);
    });

    // --- Аккреционный диск — тонкие дуги (золотисто-коричневый) ---
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, 0.22); // сильно сплющен как на скрине

    // Основное свечение диска
    const diskGlow = ctx.createRadialGradient(0, 0, R * 0.95, 0, 0, R * 1.35);
    diskGlow.addColorStop(0, 'rgba(0,0,0,0)');
    diskGlow.addColorStop(0.3, 'rgba(160,100,30,0.4)');
    diskGlow.addColorStop(0.6, 'rgba(120,75,20,0.25)');
    diskGlow.addColorStop(0.85, 'rgba(80,50,15,0.12)');
    diskGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = diskGlow;
    ctx.beginPath(); ctx.arc(0, 0, R * 1.35, 0, Math.PI * 2); ctx.fill();

    // Тонкие дуги диска
    diskArcs.forEach(a => {
      a.startAngle += a.speed;
      ctx.beginPath();
      ctx.arc(0, 0, R * a.radiusMult, a.startAngle, a.startAngle + a.arcLen);
      ctx.strokeStyle = `rgba(${a.r},${a.g},${a.b},${a.alpha})`;
      ctx.lineWidth = a.width;
      ctx.stroke();
    });

    // Яркая полоса диска (нижняя часть — ближе к наблюдателю)
    const brightArc = ctx.createLinearGradient(-R * 1.2, 0, R * 1.2, 0);
    brightArc.addColorStop(0, 'rgba(0,0,0,0)');
    brightArc.addColorStop(0.2, 'rgba(200,140,50,0.5)');
    brightArc.addColorStop(0.5, 'rgba(240,180,80,0.7)');
    brightArc.addColorStop(0.8, 'rgba(200,140,50,0.5)');
    brightArc.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.arc(0, 0, R * 1.04, Math.PI * 0.1, Math.PI * 0.9);
    ctx.strokeStyle = brightArc;
    ctx.lineWidth = 3.5;
    ctx.stroke();

    // Верхняя дуга (тоньше — дальняя сторона)
    const topArc = ctx.createLinearGradient(-R * 1.1, 0, R * 1.1, 0);
    topArc.addColorStop(0, 'rgba(0,0,0,0)');
    topArc.addColorStop(0.3, 'rgba(160,110,40,0.3)');
    topArc.addColorStop(0.5, 'rgba(180,130,50,0.45)');
    topArc.addColorStop(0.7, 'rgba(160,110,40,0.3)');
    topArc.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.arc(0, 0, R * 1.02, Math.PI * 1.1, Math.PI * 1.9);
    ctx.strokeStyle = topArc;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();

    // --- Фотонное кольцо (тонкое, как на скрине) ---
    const pls = 0.5 + 0.5 * Math.sin(pulse);
    for (let i = 0; i < 3; i++) {
      const rr = R * (1.005 + i * 0.012);
      const ra = (0.18 - i * 0.05) * (0.7 + 0.3 * pls);
      const rg = ctx.createRadialGradient(cx, cy, rr - 1, cx, cy, rr + 1.5);
      rg.addColorStop(0, `rgba(220,180,100,0)`);
      rg.addColorStop(0.5, `rgba(220,180,100,${ra})`);
      rg.addColorStop(1, `rgba(220,180,100,0)`);
      ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2);
      ctx.strokeStyle = rg; ctx.lineWidth = 2.5; ctx.stroke();
    }

    // --- Внутреннее свечение горизонта событий ---
    const innerGlow = ctx.createRadialGradient(cx, cy, R * 0.88, cx, cy, R * 1.06);
    innerGlow.addColorStop(0, 'rgba(0,0,0,0)');
    innerGlow.addColorStop(0.5, `rgba(180,120,40,${0.15 + 0.08 * pls})`);
    innerGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = innerGlow;
    ctx.beginPath(); ctx.arc(cx, cy, R * 1.06, 0, Math.PI * 2); ctx.fill();

    // --- Абсолютно чёрное ядро ---
    const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    core.addColorStop(0, 'rgba(0,0,0,1)');
    core.addColorStop(0.82, 'rgba(0,0,0,1)');
    core.addColorStop(0.92, 'rgba(0,1,5,0.95)');
    core.addColorStop(0.98, 'rgba(0,2,8,0.4)');
    core.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = core; ctx.fill();

    frame++;
    requestAnimationFrame(draw);
  }
  draw();
// ===== BLACK HOLE PART 2 — Advanced particles =====
  const disk = [];
  for (let i = 0; i < 400; i++) {
    const layer = i < 120 ? 0 : i < 260 ? 1 : 2;
    const minD = [1.28, 1.65, 2.1][layer];
    const maxD = [1.62, 2.05, 2.9][layer];
    const hues = [[15,45],[185,220],[195,240]]; // inner=orange, mid=blue, outer=cyan
    const h = hues[layer];
    disk.push({
      angle: Math.random() * Math.PI * 2,
      dist: minD + Math.random() * (maxD - minD),
      layer,
      speed: (0.0025 + Math.random() * 0.006) * (Math.random() > 0.45 ? 1 : -1),
      r: Math.random() * 2.5 + 0.3,
      alpha: Math.random() * 0.8 + 0.2,
      hue: h[0] + Math.random() * (h[1] - h[0]),
      sat: 70 + Math.random() * 25,
      bright: 60 + Math.random() * 30,
    });
  }

  // === Gravitational lensing arcs ===
  const arcs = [];
  for (let i = 0; i < 55; i++) {
    arcs.push({
      angle: Math.random() * Math.PI * 2,
      dist: 1.02 + Math.random() * 0.28,
      arcLen: Math.random() * 0.5 + 0.08,
      alpha: Math.random() * 0.55 + 0.08,
      width: Math.random() * 1.8 + 0.2,
      speed: (0.0006 + Math.random() * 0.0012) * (Math.random() > 0.5 ? 1 : -1),
    });
  }

  // === Jet particles (polar jets) ===
  const jets = [];
  for (let i = 0; i < 60; i++) {
    const side = i < 30 ? 1 : -1;
    jets.push({
      t: Math.random(),
      speed: 0.004 + Math.random() * 0.008,
      side,
      spread: (Math.random() - 0.5) * 0.18,
      alpha: Math.random() * 0.6 + 0.1,
      r: Math.random() * 1.5 + 0.3,
    });
  }

  let frame = 0, pulse = 0;

  function draw() {
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    const cx = W * 0.5, cy = H * 0.5;
    const R = Math.min(W, H) * 0.24; // bigger radius
    pulse += 0.02;

    // --- Deep space bg ---
    const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.7);
    bg.addColorStop(0, 'rgba(0,5,20,0.6)');
    bg.addColorStop(0.5, 'rgba(0,2,10,0.3)');
    bg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // --- Nebula wisps ---
    for (let i = 0; i < 4; i++) {
      const nx = cx + Math.cos(frame * 0.002 + i * 1.57) * R * 2.2;
      const ny = cy + Math.sin(frame * 0.0015 + i * 1.57) * R * 1.1;
      const ng = ctx.createRadialGradient(nx, ny, 0, nx, ny, R * 1.6);
      const hue = [200, 220, 185, 240][i];
      ng.addColorStop(0, `hsla(${hue},65%,55%,0.05)`);
      ng.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = ng;
      ctx.beginPath(); ctx.arc(nx, ny, R * 1.6, 0, Math.PI * 2); ctx.fill();
    }

    // --- Gravitational lensing glow ---
    const lg = ctx.createRadialGradient(cx, cy, R * 0.85, cx, cy, R * 3.2);
    lg.addColorStop(0, 'rgba(0,0,0,0)');
    lg.addColorStop(0.2, 'rgba(0,60,120,0.14)');
    lg.addColorStop(0.5, 'rgba(0,100,200,0.07)');
    lg.addColorStop(0.8, 'rgba(2,136,209,0.03)');
    lg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = lg;
    ctx.beginPath(); ctx.arc(cx, cy, R * 3.2, 0, Math.PI * 2); ctx.fill();

    // --- Lensed star arcs ---
    arcs.forEach(a => {
      a.angle += a.speed;
      ctx.beginPath();
      ctx.arc(cx, cy, R * a.dist, a.angle, a.angle + a.arcLen);
      ctx.strokeStyle = `rgba(200,230,255,${a.alpha})`;
      ctx.lineWidth = a.width;
      ctx.stroke();
    });

    // --- Polar jets ---
    jets.forEach(j => {
      j.t += j.speed;
      if (j.t > 1) j.t = 0;
      const dist = j.t * R * 3.5;
      const jx = cx + Math.sin(j.spread) * dist;
      const jy = cy + j.side * (-dist * 0.95);
      const alpha = j.alpha * (1 - j.t) * (j.t < 0.1 ? j.t * 10 : 1);
      ctx.beginPath();
      ctx.arc(jx, jy, j.r * (1 - j.t * 0.5), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(135,206,235,${alpha * 0.5})`;
      ctx.fill();
    });

    // --- Accretion disk (elliptical) ---
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, 0.28);
    disk.forEach(p => {
      p.angle += p.speed;
      const r = R * p.dist;
      const px = Math.cos(p.angle) * r;
      const py = Math.sin(p.angle) * r;
      const behind = (p.angle % (Math.PI * 2)) > 0 && (p.angle % (Math.PI * 2)) < Math.PI;
      const bf = behind ? 0.3 : 1.0;
      const df = Math.min(1, (r - R * 1.1) / (R * 0.4));
      const a = p.alpha * df * bf;
      ctx.beginPath();
      ctx.arc(px, py, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue},${p.sat}%,${p.bright}%,${a})`;
      ctx.fill();
    });
    ctx.restore();

    // --- Photon rings (5 rings) ---
    const pls = 0.5 + 0.5 * Math.sin(pulse);
    for (let i = 0; i < 5; i++) {
      const rr = R * (1.06 + i * 0.065);
      const ra = (0.28 - i * 0.045) * (i === 0 ? 0.65 + 0.35 * pls : 1);
      const rw = i === 0 ? 3 : Math.max(0.5, 2 - i * 0.35);
      const rg = ctx.createRadialGradient(cx, cy, rr - rw, cx, cy, rr + rw);
      const col = i < 2 ? '135,206,235' : '100,180,255';
      rg.addColorStop(0, `rgba(${col},0)`);
      rg.addColorStop(0.5, `rgba(${col},${ra})`);
      rg.addColorStop(1, `rgba(${col},0)`);
      ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2);
      ctx.strokeStyle = rg; ctx.lineWidth = rw * 2; ctx.stroke();
    }

    // --- Inner hot glow (orange/white) ---
    const ig = ctx.createRadialGradient(cx, cy, R * 0.92, cx, cy, R * 1.22);
    ig.addColorStop(0, 'rgba(255,220,120,0)');
    ig.addColorStop(0.35, `rgba(255,190,80,${0.18 + 0.08 * pls})`);
    ig.addColorStop(0.65, `rgba(255,140,50,${0.12 + 0.05 * pls})`);
    ig.addColorStop(1, 'rgba(255,80,20,0)');
    ctx.fillStyle = ig;
    ctx.beginPath(); ctx.arc(cx, cy, R * 1.22, 0, Math.PI * 2); ctx.fill();

    // --- Event horizon shimmer ---
    const shimmer = 0.5 + 0.5 * Math.sin(pulse * 1.7);
    const sg = ctx.createRadialGradient(cx, cy, R * 0.88, cx, cy, R * 1.05);
    sg.addColorStop(0, 'rgba(0,0,0,0)');
    sg.addColorStop(0.5, `rgba(135,206,235,${0.06 * shimmer})`);
    sg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.arc(cx, cy, R * 1.05, 0, Math.PI * 2); ctx.fill();

    // --- Black hole core (absolute black) ---
    const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    core.addColorStop(0, 'rgba(0,0,0,1)');
    core.addColorStop(0.78, 'rgba(0,0,0,1)');
    core.addColorStop(0.9, 'rgba(0,3,12,0.92)');
    core.addColorStop(0.97, 'rgba(0,8,20,0.5)');
    core.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = core; ctx.fill();

    frame++;
    requestAnimationFrame(draw);
  }
  draw();
})();


// ===== NAVBAR SCROLL — управляется через smooth.js =====

// ===== BURGER MENU =====
function toggleBurger() {
  const dd = document.getElementById('burgerDropdown');
  if (dd) dd.classList.toggle('open');
}
document.addEventListener('click', (e) => {
  const burger = document.getElementById('navBurger');
  const dd = document.getElementById('burgerDropdown');
  if (dd && burger && !burger.contains(e.target)) {
    dd.classList.remove('open');
  }
});

// ===== AOS — управляется через smooth.js =====
// ===== PAGE TRANSITIONS — управляется через smooth.js =====

// ===== CURSOR TRAIL — управляется через smooth.js =====
// (реализация перенесена в smooth.js для избежания дублирования)

// ===== CARD TILT — управляется через smooth.js =====

// ===== PRICE COUNTER =====
const priceObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.querySelectorAll('.price-amount').forEach(el => {
        const val = parseInt(el.dataset.val || el.textContent);
        if (!val) return;
        let t0 = null;
        const dur = 1200;
        const step = ts => {
          if (!t0) t0 = ts;
          const p = Math.min((ts - t0) / dur, 1);
          const ease = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(ease * val) + '₽';
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
      priceObs.unobserve(e.target);
    }
  });
}, { threshold: 0.3 });
const ps = document.querySelector('.pricing');
if (ps) priceObs.observe(ps);

// ===== REFERRAL STATS COUNTER =====
(function initRefCounters() {
  const totalEl = document.getElementById('totalRefs');
  const paidEl = document.getElementById('paidRefs');
  if (!totalEl && !paidEl) return;
  // They start at 0, animate to 0 (placeholder — real data from API)
  // Animate progress bar
  setTimeout(() => {
    const fill = document.getElementById('refProgressFill');
    if (fill) {
      fill.style.transition = 'width 1.2s cubic-bezier(.16,1,.3,1)';
      fill.style.width = '0%';
    }
  }, 800);
})();

// ===== INTERACTIVE CLIENT MODULES =====
const MODULES = {
  combat: [
    { name: 'KillAura', bind: 'R', enabled: true, settings: [
      { type: 'range', label: 'Дальность', min: 1, max: 6, val: 3.5, step: 0.1 },
      { type: 'range', label: 'CPS', min: 1, max: 20, val: 12, step: 1 },
      { type: 'select', label: 'Режим', options: ['Single', 'Multi', 'Switch'], val: 'Multi' },
      { type: 'toggle', label: 'Через блоки', val: false },
    ]},
    { name: 'Velocity', bind: 'V', enabled: false, settings: [
      { type: 'range', label: 'Горизонталь %', min: 0, max: 100, val: 80, step: 1 },
      { type: 'range', label: 'Вертикаль %', min: 0, max: 100, val: 100, step: 1 },
    ]},
    { name: 'AutoClicker', bind: 'C', enabled: false, settings: [
      { type: 'range', label: 'Min CPS', min: 1, max: 20, val: 8, step: 1 },
      { type: 'range', label: 'Max CPS', min: 1, max: 20, val: 14, step: 1 },
    ]},
    { name: 'Criticals', bind: 'none', enabled: true, settings: [
      { type: 'select', label: 'Режим', options: ['Packet', 'Jump', 'Mini Jump'], val: 'Packet' },
    ]},
    { name: 'AimAssist', bind: 'none', enabled: false, settings: [
      { type: 'range', label: 'Скорость', min: 1, max: 10, val: 3, step: 0.5 },
      { type: 'range', label: 'FOV', min: 10, max: 180, val: 90, step: 5 },
    ]},
    { name: 'Reach', bind: 'none', enabled: false, settings: [
      { type: 'range', label: 'Дальность', min: 3, max: 6, val: 3.8, step: 0.1 },
    ]},
  ],
  visual: [
    { name: 'ESP', bind: 'Z', enabled: true, settings: [
      { type: 'select', label: 'Режим', options: ['Box', 'Outline', '2D'], val: 'Box' },
      { type: 'toggle', label: 'Игроки', val: true },
      { type: 'toggle', label: 'Мобы', val: false },
    ]},
    { name: 'Tracers', bind: 'none', enabled: false, settings: [
      { type: 'select', label: 'Цель', options: ['Players', 'All', 'Hostile'], val: 'Players' },
    ]},
    { name: 'FullBright', bind: 'B', enabled: true, settings: [
      { type: 'range', label: 'Яркость', min: 0, max: 100, val: 100, step: 1 },
    ]},
    { name: 'Chams', bind: 'none', enabled: false, settings: [
      { type: 'select', label: 'Режим', options: ['Flat', 'Textured', 'Wireframe'], val: 'Flat' },
    ]},
  ],
  movement: [
    { name: 'Speed', bind: 'X', enabled: false, settings: [
      { type: 'range', label: 'Скорость', min: 1, max: 5, val: 1.5, step: 0.1 },
      { type: 'select', label: 'Режим', options: ['Strafe', 'Vanilla', 'Custom'], val: 'Strafe' },
    ]},
    { name: 'Fly', bind: 'F', enabled: false, settings: [
      { type: 'range', label: 'Скорость', min: 0.5, max: 5, val: 1, step: 0.1 },
      { type: 'select', label: 'Режим', options: ['Vanilla', 'Creative', 'Packet'], val: 'Vanilla' },
    ]},
    { name: 'Sprint', bind: 'none', enabled: true, settings: [
      { type: 'toggle', label: 'Всегда', val: true },
    ]},
    { name: 'NoFall', bind: 'none', enabled: true, settings: [
      { type: 'select', label: 'Режим', options: ['Packet', 'Vanilla'], val: 'Packet' },
    ]},
  ],
  misc: [
    { name: 'AutoTotem', bind: 'none', enabled: false, settings: [
      { type: 'range', label: 'HP порог', min: 1, max: 20, val: 8, step: 1 },
    ]},
    { name: 'Scaffold', bind: 'G', enabled: false, settings: [
      { type: 'select', label: 'Режим', options: ['Normal', 'Tower', 'Telly'], val: 'Normal' },
      { type: 'toggle', label: 'Безопасный', val: true },
    ]},
    { name: 'FastPlace', bind: 'none', enabled: false, settings: [] },
    { name: 'AntiKB', bind: 'none', enabled: false, settings: [
      { type: 'range', label: 'Горизонталь %', min: 0, max: 100, val: 50, step: 1 },
    ]},
  ]
};

let currentTab = 'combat';
let selectedMod = null;

function renderModules(tab, filter) {
  const list = document.getElementById('moduleList');
  if (!list) return;
  const mods = MODULES[tab] || [];
  const filtered = filter ? mods.filter(m => m.name.toLowerCase().includes(filter.toLowerCase())) : mods;
  list.innerHTML = filtered.map(m => `
    <div class="mod-item ${m.enabled ? 'enabled' : ''} ${selectedMod === m.name ? 'selected' : ''}"
         onclick="selectModule('${m.name}','${tab}')">
      <div style="display:flex;align-items:flex-start;justify-content:space-between">
        <span class="mod-name">${m.name}</span>
        <span class="mod-dot"></span>
      </div>
      <span class="mod-cat">${tab}</span>
    </div>
  `).join('');
}

function selectModule(name, tab) {
  selectedMod = name;
  const mod = (MODULES[tab] || []).find(m => m.name === name);
  if (!mod) return;
  renderModules(tab, document.getElementById('moduleSearch') ? document.getElementById('moduleSearch').value : '');

  const panel = document.getElementById('modulePanel');
  const mpName = document.getElementById('mpName');
  const mpToggle = document.getElementById('mpToggle');
  const mpBind = document.getElementById('mpBind');
  const mpSettings = document.getElementById('mpSettings');
  if (!panel) return;

  mpName.textContent = mod.name;
  mpBind.textContent = mod.bind === 'none' ? '—' : mod.bind;
  mpToggle.className = 'tog' + (mod.enabled ? ' on' : '');
  mpToggle.onclick = () => {
    mod.enabled = !mod.enabled;
    mpToggle.className = 'tog' + (mod.enabled ? ' on' : '');
    renderModules(currentTab, document.getElementById('moduleSearch') ? document.getElementById('moduleSearch').value : '');
  };

  mpSettings.innerHTML = mod.settings.map((s, i) => {
    if (s.type === 'range') return `
      <div class="mp-setting">
        <div class="mp-setting-row">
          <label>${s.label}</label>
          <span class="mp-val" id="sv${i}">${s.val}</span>
        </div>
        <input type="range" min="${s.min}" max="${s.max}" step="${s.step}" value="${s.val}"
          oninput="document.getElementById('sv${i}').textContent=parseFloat(this.value).toFixed(this.step<1?1:0);MODULES['${tab}'].find(m=>m.name==='${name}').settings[${i}].val=parseFloat(this.value)"/>
      </div>`;
    if (s.type === 'select') return `
      <div class="mp-setting">
        <label>${s.label}</label>
        <select onchange="MODULES['${tab}'].find(m=>m.name==='${name}').settings[${i}].val=this.value">
          ${s.options.map(o => `<option ${o === s.val ? 'selected' : ''}>${o}</option>`).join('')}
        </select>
      </div>`;
    if (s.type === 'toggle') return `
      <div class="mp-setting">
        <div class="mp-setting-row">
          <label>${s.label}</label>
          <div class="tog ${s.val ? 'on' : ''}" onclick="
            var m=MODULES['${tab}'].find(m=>m.name==='${name}');
            m.settings[${i}].val=!m.settings[${i}].val;
            this.className='tog'+(m.settings[${i}].val?' on':'');
          "></div>
        </div>
      </div>`;
    return '';
  }).join('');
}

// Init tabs
document.querySelectorAll('.gw-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.gw-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentTab = btn.dataset.tab;
    selectedMod = null;
    renderModules(currentTab);
    const first = MODULES[currentTab] && MODULES[currentTab][0];
    if (first) selectModule(first.name, currentTab);
  });
});

// Search
const searchInput = document.getElementById('moduleSearch');
if (searchInput) {
  searchInput.addEventListener('input', () => {
    renderModules(currentTab, searchInput.value);
  });
}

// Initial render
if (document.getElementById('moduleList')) {
  renderModules('combat');
  selectModule('KillAura', 'combat');
}

// ============================================================
// SCROLL PROGRESS BAR — управляется через smooth.js
// ============================================================

// ============================================================
// LENIS SMOOTH SCROLL — управляется через smooth.js
// ============================================================

// ============================================================
// PARALLAX — управляется через smooth.js (orbs создаются здесь)
// ============================================================
(function initOrbs() {
  const orbConfigs = [
    { size: 400, x: '10%', y: '20%', color: 'rgba(2,136,209,0.12)', dur: '12s' },
    { size: 300, x: '80%', y: '60%', color: 'rgba(135,206,235,0.08)', dur: '16s' },
    { size: 250, x: '50%', y: '80%', color: 'rgba(99,102,241,0.07)', dur: '20s' },
  ];
  orbConfigs.forEach((o, i) => {
    const orb = document.createElement('div');
    orb.className = 'orb';
    orb.style.cssText = `
      width:${o.size}px; height:${o.size}px;
      left:${o.x}; top:${o.y};
      background:${o.color};
      animation-duration:${o.dur};
      animation-delay:-${i * 4}s;
    `;
    document.body.appendChild(orb);
  });
})();

// ============================================================
// MOUSE GLOW на feature items
// ============================================================
document.querySelectorAll('.feature-item').forEach(el => {
  el.addEventListener('mousemove', (e) => {
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width * 100).toFixed(1);
    const y = ((e.clientY - rect.top) / rect.height * 100).toFixed(1);
    el.style.setProperty('--mx', x + '%');
    el.style.setProperty('--my', y + '%');
  });
});

// ============================================================
// COMPARE SLIDER
// ============================================================
(function initCompare() {
  const slider = document.getElementById('compareSlider');
  if (!slider) return;
  const after = slider.querySelector('.compare-after');
  const handle = document.getElementById('compareHandle');
  let dragging = false;
  let pct = 50;

  function setPos(x) {
    const rect = slider.getBoundingClientRect();
    pct = Math.max(5, Math.min(95, ((x - rect.left) / rect.width) * 100));
    after.style.clipPath = `inset(0 0 0 ${pct}%)`;
    handle.style.left = pct + '%';
  }

  slider.addEventListener('mousedown', (e) => { dragging = true; setPos(e.clientX); });
  slider.addEventListener('touchstart', (e) => { dragging = true; setPos(e.touches[0].clientX); }, { passive: true });
  window.addEventListener('mousemove', (e) => { if (dragging) setPos(e.clientX); });
  window.addEventListener('touchmove', (e) => { if (dragging) setPos(e.touches[0].clientX); }, { passive: true });
  window.addEventListener('mouseup', () => { dragging = false; });
  window.addEventListener('touchend', () => { dragging = false; });

  // Анимация при появлении
  const obs = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) {
      let p = 80, dir = -1;
      const anim = setInterval(() => {
        p += dir * 0.8;
        if (p <= 20) dir = 1;
        if (p >= 80) { clearInterval(anim); }
        after.style.clipPath = `inset(0 0 0 ${p}%)`;
        handle.style.left = p + '%';
        pct = p;
      }, 16);
      obs.disconnect();
    }
  }, { threshold: 0.5 });
  obs.observe(slider);
})();

// ============================================================
// GALLERY SLIDER
// ============================================================
let currentSlide = 0;
const totalSlides = 5;

function goSlide(idx) {
  const slides = document.querySelectorAll('.gallery-slide');
  const dots = document.querySelectorAll('.gdot');
  if (!slides.length) return;

  // Exit current
  slides[currentSlide].classList.remove('active');
  slides[currentSlide].classList.add('exit');
  setTimeout(() => slides[currentSlide]?.classList.remove('exit'), 500);

  currentSlide = ((idx % totalSlides) + totalSlides) % totalSlides;

  // Enter new
  slides[currentSlide].classList.add('active');
  dots.forEach((d, i) => d.classList.toggle('active', i === currentSlide));

  const numEl = document.getElementById('slideNum');
  if (numEl) numEl.textContent = currentSlide + 1;
}

function nextSlide() { goSlide(currentSlide + 1); }
function prevSlide() { goSlide(currentSlide - 1); }

// Автопрокрутка галереи
(function initGalleryAuto() {
  const wrap = document.querySelector('.gallery-wrap');
  if (!wrap) return;
  let timer = setInterval(() => nextSlide(), 4000);
  wrap.addEventListener('mouseenter', () => clearInterval(timer));
  wrap.addEventListener('mouseleave', () => { timer = setInterval(() => nextSlide(), 4000); });

  // Свайп на мобиле
  let startX = 0;
  wrap.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
  wrap.addEventListener('touchend', e => {
    const diff = startX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) diff > 0 ? nextSlide() : prevSlide();
  });
})();

// ============================================================
// STAGGER ANIMATION — управляется через smooth.js
// ============================================================

// ============================================================
// MAGNETIC BUTTONS — управляется через smooth.js
// ============================================================

// ============================================================
// TYPING EFFECT на hero заголовке
// ============================================================
(function initTyping() {
  const hero = document.querySelector('.hero-content h1');
  if (!hero) return;
  const cursor = document.createElement('span');
  cursor.style.cssText = `
    display:inline-block; width:2px; height:.85em;
    background:var(--accent); margin-left:4px;
    vertical-align:middle;
    animation:blink .8s step-end infinite;
  `;
  const style = document.createElement('style');
  style.textContent = '@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}';
  document.head.appendChild(style);
  setTimeout(() => {
    hero.appendChild(cursor);
    setTimeout(() => cursor.remove(), 3000);
  }, 800);
})();

// ============================================================
// SECTION DIVIDERS — управляется через smooth.js
// ============================================================

// ============================================================
// ЧИСЛО ОНЛАЙН — управляется через smooth.js
// ============================================================

// ============================================================
// INTERACTIVE CLIENT WINDOW
// ============================================================
const CLIENT_MODS = {
  visuals: [
    { name: 'Aspect Ratio', on: false, key: null },
    { name: 'China Hit',    on: true,  key: null },
    { name: 'Crosshair',   on: false, key: null },
    { name: 'Custom Hand', on: true,  key: null },
    { name: 'Full Bright', on: true,  key: null },
    { name: 'Hit Color',   on: false, key: null },
    { name: 'Hitbox Customizer', on: false, key: null },
    { name: 'Jump Circles', on: false, key: null },
    { name: 'Particles',   on: true,  key: null },
    { name: 'Render Tweaks', on: true, key: null },
  ],
  hud: [
    { name: 'Arraylist',   on: true,  key: 'V' },
    { name: 'Armor HUD',   on: true,  key: null },
    { name: 'FPS Counter', on: true,  key: null },
    { name: 'Coords',      on: false, key: null },
    { name: 'Ping',        on: false, key: null },
    { name: 'Watermark',   on: true,  key: null },
    { name: 'Scoreboard',  on: false, key: null },
    { name: 'Potion HUD',  on: false, key: null },
  ],
  utilities: [
    { name: 'AutoFish',    on: false, key: 'V' },
    { name: 'Brightness',  on: false, key: 'H' },
    { name: 'HUD',         on: true,  key: 'M' },
    { name: 'Music Bar',   on: false, key: 'O' },
    { name: 'AutoRespawn', on: false, key: null },
    { name: 'FastPlace',   on: false, key: null },
    { name: 'NoHurtCam',   on: true,  key: null },
    { name: 'Zoom',        on: false, key: 'Z' },
  ],
};

const HOTKEYS = {
  visuals:   [{ name: 'Full Bright', key: 'F' }, { name: 'Particles', key: 'P' }, { name: 'Render Tweaks', key: 'R' }, { name: 'Custom Hand', key: 'H' }],
  hud:       [{ name: 'Arraylist', key: 'V' }, { name: 'FPS Counter', key: 'F' }, { name: 'Watermark', key: 'W' }, { name: 'Armor HUD', key: 'A' }],
  utilities: [{ name: 'AutoFish', key: 'V' }, { name: 'Brightness', key: 'H' }, { name: 'HUD', key: 'M' }, { name: 'Music Bar', key: 'O' }],
};

let clientTab = 'visuals';
let clientFilter = '';

function renderClientMods() {
  const grid = document.getElementById('clientModsGrid');
  const hkList = document.getElementById('hotkeysList');
  if (!grid) return;

  const mods = CLIENT_MODS[clientTab] || [];
  const filtered = clientFilter
    ? mods.filter(m => m.name.toLowerCase().includes(clientFilter.toLowerCase()))
    : mods;

  grid.innerHTML = filtered.map((m, i) => `
    <div class="cw-mod-row ${m.on ? 'active-mod' : ''}" onclick="toggleClientMod('${clientTab}',${mods.indexOf(m)})">
      <span class="cw-mod-name">${m.name}</span>
      <div class="cw-tog ${m.on ? 'on' : ''}"></div>
    </div>
  `).join('');

  // Hot Keys
  if (hkList) {
    const hks = HOTKEYS[clientTab] || [];
    hkList.innerHTML = hks.map(h => `
      <div class="chk-row">
        <span>${h.name}</span>
        <span class="chk-key">${h.key}</span>
      </div>
    `).join('');
  }
}

function toggleClientMod(tab, idx) {
  if (CLIENT_MODS[tab] && CLIENT_MODS[tab][idx]) {
    CLIENT_MODS[tab][idx].on = !CLIENT_MODS[tab][idx].on;
    renderClientMods();
  }
}

function switchClientTab(btn, tab) {
  document.querySelectorAll('.cw-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  clientTab = tab;
  clientFilter = '';
  const searchEl = document.getElementById('clientSearch');
  if (searchEl) searchEl.value = '';
  renderClientMods();
}

function filterClientMods(val) {
  clientFilter = val;
  renderClientMods();
}

// Инициализация
if (document.getElementById('clientModsGrid')) renderClientMods();

// ============================================================
// MUSIC PLAYER (демо)
// ============================================================
let playerPlaying = false;
let playerPct = 47;
let playerTimer = null;

function playerToggle() {
  playerPlaying = !playerPlaying;
  const icon = document.getElementById('playIcon');
  if (icon) {
    icon.innerHTML = playerPlaying
      ? '<polygon points="5 3 19 12 5 21 5 3"/>'
      : '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';
  }
  if (playerPlaying) {
    playerTimer = setInterval(() => {
      playerPct = Math.min(100, playerPct + 0.1);
      const prog = document.getElementById('playerProgress');
      const thumb = prog?.nextElementSibling;
      if (prog) prog.style.width = playerPct + '%';
      if (thumb) thumb.style.left = playerPct + '%';
      if (playerPct >= 100) { playerPct = 0; playerToggle(); }
    }, 100);
  } else {
    clearInterval(playerTimer);
  }
}
function playerPrev() { playerPct = 0; const p = document.getElementById('playerProgress'); if(p) p.style.width='0%'; }
function playerNext() { playerPct = 0; const p = document.getElementById('playerProgress'); if(p) p.style.width='0%'; }

// Кликабельный прогресс-бар
document.querySelector('.cwp-progress-bar')?.addEventListener('click', function(e) {
  const rect = this.getBoundingClientRect();
  playerPct = ((e.clientX - rect.left) / rect.width) * 100;
  const prog = document.getElementById('playerProgress');
  const thumb = prog?.nextElementSibling;
  if (prog) prog.style.width = playerPct + '%';
  if (thumb) thumb.style.left = playerPct + '%';
});
