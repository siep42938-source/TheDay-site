/* ============================================================
   TheDay — Smooth Scroll & Interaction System
   ============================================================ */

(function () {
  'use strict';

  // ── 1. SMOOTH SCROLL ENGINE ──────────────────────────────
  const scroll = {
    current: 0,
    target: 0,
    ease: 0.085,
    raf: null,
    locked: false,

    init() {
      // Фиксируем body, скроллим через transform
      document.documentElement.style.scrollBehavior = 'auto';

      window.addEventListener('wheel', (e) => {
        if (this.locked) return;
        e.preventDefault();
        const delta = e.deltaMode === 1 ? e.deltaY * 32
                    : e.deltaMode === 2 ? e.deltaY * window.innerHeight
                    : e.deltaY;
        this.target = Math.max(0,
          Math.min(document.body.scrollHeight - window.innerHeight,
            this.target + delta * 0.9));
        this.start();
      }, { passive: false });

      // Touch
      let touchY = 0;
      window.addEventListener('touchstart', e => { touchY = e.touches[0].clientY; }, { passive: true });
      window.addEventListener('touchmove', e => {
        if (this.locked) return;
        const dy = touchY - e.touches[0].clientY;
        touchY = e.touches[0].clientY;
        this.target = Math.max(0,
          Math.min(document.body.scrollHeight - window.innerHeight,
            this.target + dy * 1.5));
        this.start();
      }, { passive: true });

      // Keyboard
      window.addEventListener('keydown', e => {
        if (this.locked) return;
        const map = { ArrowDown: 80, ArrowUp: -80, PageDown: window.innerHeight * 0.85, PageUp: -window.innerHeight * 0.85, End: 99999, Home: -99999, Space: 200 };
        if (map[e.key] !== undefined) {
          e.preventDefault();
          this.target = Math.max(0, Math.min(document.body.scrollHeight - window.innerHeight, this.target + map[e.key]));
          this.start();
        }
      });

      // Anchor links
      document.querySelectorAll('a[href^="#"]').forEach(a => {
        a.addEventListener('click', e => {
          const id = a.getAttribute('href').slice(1);
          const el = document.getElementById(id);
          if (!el) return;
          e.preventDefault();
          this.target = Math.max(0, Math.min(
            document.body.scrollHeight - window.innerHeight,
            el.getBoundingClientRect().top + this.current - 80
          ));
          this.start();
        });
      });

      this.start();
    },

    start() {
      if (!this.raf) this.raf = requestAnimationFrame(() => this.tick());
    },

    tick() {
      const diff = this.target - this.current;
      if (Math.abs(diff) < 0.3) {
        this.current = this.target;
        window.scrollTo(0, this.current);
        this.raf = null;
        return;
      }
      this.current += diff * this.ease;
      window.scrollTo(0, this.current);
      this.raf = requestAnimationFrame(() => this.tick());

      // Обновляем зависимые системы
      parallax.update(this.current);
      scrollProgress.update(this.current);
    },

    scrollTo(y, instant) {
      this.target = Math.max(0, Math.min(document.body.scrollHeight - window.innerHeight, y));
      if (instant) { this.current = this.target; window.scrollTo(0, this.current); }
      else this.start();
    },
  };

  // ── 2. SCROLL PROGRESS BAR ───────────────────────────────
  const scrollProgress = {
    el: null,
    init() {
      this.el = document.createElement('div');
      this.el.style.cssText = `
        position:fixed;top:0;left:0;right:0;height:2px;z-index:9999;
        background:linear-gradient(90deg,var(--a2,#4fc3f7),var(--accent,#87CEEB),var(--a3,#0288d1));
        transform-origin:left;transform:scaleX(0);
        transition:transform .05s linear;pointer-events:none;
      `;
      document.body.appendChild(this.el);
    },
    update(y) {
      if (!this.el) return;
      const max = document.body.scrollHeight - window.innerHeight;
      this.el.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    },
  };

  // ── 3. PARALLAX ──────────────────────────────────────────
  const parallax = {
    items: [],
    init() {
      // Параллакс только на главной странице (не на dashboard)
      if (document.querySelector('.dashboard-layout')) return;
      this.items = [
        { sel: '.hero-content',     speed: 0.12 },
        { sel: '.hero-canvas-side', speed: -0.08 },
        { sel: '.hero-badge',       speed: 0.18 },
        { sel: '.section-tag',      speed: 0.04 },
      ];
    },
    update(scrollY) {
      if (!this.items.length) return;
      this.items.forEach(({ sel, speed }) => {
        document.querySelectorAll(sel).forEach(el => {
          const rect = el.getBoundingClientRect();
          const center = rect.top + rect.height / 2 + scrollY;
          const offset = (scrollY + window.innerHeight / 2 - center) * speed;
          el.style.transform = `translateY(${offset.toFixed(2)}px)`;
        });
      });
    },
  };

  // ── 4. INTERSECTION OBSERVER — stagger reveal ────────────
  const reveal = {
    init() {
      const obs = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          const delay = parseInt(el.dataset.aosDelay || el.dataset.delay || 0);
          setTimeout(() => {
            el.classList.add('is-visible');
            el.style.opacity = '1';
            el.style.transform = 'none';
          }, delay);
          obs.unobserve(el);
        });
      }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

      // Все [data-aos] элементы
      document.querySelectorAll('[data-aos]').forEach(el => {
        if (!el.classList.contains('aos-animate')) obs.observe(el);
      });

      // Stagger для grid-контейнеров (только не на dashboard)
      if (!document.querySelector('.dashboard-layout')) {
        const staggerObs = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const children = [...entry.target.children];
            children.forEach((child, i) => {
              child.style.transitionDelay = `${i * 55}ms`;
              setTimeout(() => {
                child.style.opacity = '1';
                child.style.transform = 'translateY(0) scale(1)';
              }, i * 55);
            });
            staggerObs.unobserve(entry.target);
          });
        }, { threshold: 0.05 });

        document.querySelectorAll(
          '.features-grid, .cloud-grid, .pricing-grid, .feat-cards, .ref-levels, .ref-stats'
        ).forEach(el => {
          [...el.children].forEach(child => {
            child.style.opacity = '0';
            child.style.transform = 'translateY(24px) scale(0.98)';
            child.style.transition = 'opacity .65s cubic-bezier(.16,1,.3,1), transform .65s cubic-bezier(.16,1,.3,1)';
          });
          staggerObs.observe(el);
        });
      }
    },
  };

  // ── 5. HOVER EFFECTS ─────────────────────────────────────
  const hover = {
    init() {
      // Magnetic buttons (только не на dashboard)
      if (!document.querySelector('.dashboard-layout')) {
        document.querySelectorAll('.btn-primary, .btn-ghost, .gnav-btn, .acc-btn').forEach(btn => {
          btn.addEventListener('mousemove', e => {
            const r = btn.getBoundingClientRect();
            const x = (e.clientX - r.left - r.width / 2) * 0.22;
            const y = (e.clientY - r.top - r.height / 2) * 0.22;
            btn.style.transform = `translate(${x}px,${y}px) translateY(-2px)`;
          });
          btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
        });
      }

      // 3D tilt на карточках (только не на dashboard)
      if (!document.querySelector('.dashboard-layout')) {
        document.querySelectorAll('.glass-card, .feature-item, .price-card').forEach(card => {
          card.addEventListener('mousemove', e => {
            const r = card.getBoundingClientRect();
            const x = (e.clientX - r.left) / r.width - 0.5;
            const y = (e.clientY - r.top) / r.height - 0.5;
            card.style.transform = `perspective(600px) rotateX(${-y * 5}deg) rotateY(${x * 5}deg) translateY(-4px)`;
            card.style.transition = 'transform .1s ease';
          });
          card.addEventListener('mouseleave', () => {
            card.style.transform = '';
            card.style.transition = 'transform .5s cubic-bezier(.16,1,.3,1)';
          });
        });
      }

      // Mouse glow на feature items
      document.querySelectorAll('.feature-item').forEach(el => {
        el.addEventListener('mousemove', e => {
          const r = el.getBoundingClientRect();
          el.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
          el.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
        });
      });

      // Ripple на кнопках
      document.querySelectorAll('.btn-primary, .btn-ghost, .btn-auth, .acc-btn, .gnav-btn').forEach(btn => {
        if (btn.dataset.ripple) return;
        btn.dataset.ripple = '1';
        btn.style.position = 'relative';
        btn.style.overflow = 'hidden';
        btn.addEventListener('click', e => {
          const r = btn.getBoundingClientRect();
          const size = Math.max(r.width, r.height) * 2;
          const span = document.createElement('span');
          span.style.cssText = `
            position:absolute;border-radius:50%;pointer-events:none;
            width:${size}px;height:${size}px;
            left:${e.clientX - r.left - size/2}px;
            top:${e.clientY - r.top - size/2}px;
            background:rgba(255,255,255,0.18);
            transform:scale(0);animation:rippleAnim .55s ease-out forwards;
          `;
          btn.appendChild(span);
          setTimeout(() => span.remove(), 600);
        });
      });
    },
  };

  // ── 6. CURSOR TRAIL ──────────────────────────────────────
  const cursor = {
    trail: [],
    mx: -200, my: -200,
    init() {
      if (window.matchMedia('(pointer:coarse)').matches) return;
      for (let i = 0; i < 10; i++) {
        const d = document.createElement('div');
        const s = 7 - i * 0.5;
        d.style.cssText = `
          position:fixed;pointer-events:none;z-index:9998;border-radius:50%;
          width:${s}px;height:${s}px;
          background:rgba(135,206,235,${0.55 - i * 0.05});
          transform:translate(-50%,-50%);will-change:left,top;
        `;
        d.setAttribute('data-trail', '1');
        document.body.appendChild(d);
        this.trail.push({ el: d, x: -200, y: -200 });
      }
      document.addEventListener('mousemove', e => { this.mx = e.clientX; this.my = e.clientY; });
      this.animate();
    },
    animate() {
      this.trail[0].x += (this.mx - this.trail[0].x) * 0.38;
      this.trail[0].y += (this.my - this.trail[0].y) * 0.38;
      for (let i = 1; i < this.trail.length; i++) {
        this.trail[i].x += (this.trail[i-1].x - this.trail[i].x) * 0.42;
        this.trail[i].y += (this.trail[i-1].y - this.trail[i].y) * 0.42;
      }
      this.trail.forEach(t => { t.el.style.left = t.x + 'px'; t.el.style.top = t.y + 'px'; });
      requestAnimationFrame(() => this.animate());
    },
  };

  // ── 7. PAGE TRANSITIONS ──────────────────────────────────
  const pageTransition = {
    overlay: null,
    init() {
      this.overlay = document.getElementById('pageTransition');
      if (!this.overlay) {
        this.overlay = document.createElement('div');
        this.overlay.id = 'pageTransition';
        this.overlay.style.cssText = `
          position:fixed;inset:0;z-index:9000;background:var(--bg,#0a0a0f);
          pointer-events:none;opacity:1;transition:opacity .4s cubic-bezier(.16,1,.3,1);
        `;
        document.body.appendChild(this.overlay);
      }
      // Fade in — убираем overlay сразу
      requestAnimationFrame(() => requestAnimationFrame(() => {
        this.overlay.style.opacity = '0';
        this.overlay.style.pointerEvents = 'none';
      }));

      // Fade out on navigation
      document.querySelectorAll('a[href]').forEach(a => {
        const href = a.getAttribute('href');
        if (!href
          || href === '#'
          || href.startsWith('#')
          || href.startsWith('javascript')
          || href.startsWith('mailto')
          || href.startsWith('tel')
          || a.target === '_blank'
          || a.hasAttribute('data-no-transition')
          || a.closest('.burger-dropdown')  // не перехватываем ссылки в бургер-меню
          || a.closest('.dash-nav')         // не перехватываем ссылки в sidebar
          || a.closest('.modal-overlay')    // не перехватываем ссылки в модалках
        ) return;
        a.addEventListener('click', e => {
          e.preventDefault();
          this.overlay.style.opacity = '1';
          this.overlay.style.pointerEvents = 'all';
          setTimeout(() => { window.location.href = href; }, 380);
        });
      });
    },
  };

  // ── 8. SECTION DIVIDERS ──────────────────────────────────
  function addDividers() {
    document.querySelectorAll('section + section').forEach(s => {
      if (s.previousElementSibling?.tagName === 'SECTION') {
        const d = document.createElement('div');
        d.style.cssText = 'height:1px;background:linear-gradient(90deg,transparent,rgba(135,206,235,0.07),transparent);';
        s.before(d);
      }
    });
  }

  // ── 9. NAVBAR SCROLL ─────────────────────────────────────
  function initNavbar() {
    const nb = document.getElementById('navbar');
    if (!nb) return;
    let lastY = 0;
    const isDashboard = !!document.querySelector('.dashboard-layout');
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      nb.classList.toggle('scrolled', y > 40);
      // На dashboard не скрываем navbar — sidebar sticky зависит от него
      if (!isDashboard) {
        if (y > lastY + 5 && y > 200) nb.style.transform = 'translateX(-50%) translateY(-80px)';
        else nb.style.transform = '';
      }
      lastY = y;
    }, { passive: true });
  }

  // ── 10. ONLINE COUNTER ───────────────────────────────────
  function initOnlineCounter() {
    const el = document.getElementById('onlineCount');
    if (!el) return;
    let base = 847;
    setInterval(() => {
      base += Math.floor(Math.random() * 5) - 2;
      base = Math.max(800, Math.min(950, base));
      el.textContent = base.toLocaleString('ru');
    }, 3000);
  }

  // ── INIT ─────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    scrollProgress.init();
    parallax.init();
    reveal.init();
    hover.init();
    cursor.init();
    pageTransition.init();
    addDividers();
    initNavbar();
    initOnlineCounter();

    // Запускаем smooth scroll только на десктопе и только не на dashboard
    if (!window.matchMedia('(pointer:coarse)').matches && !document.querySelector('.dashboard-layout')) {
      scroll.init();
    }
  });

  // Экспорт для использования в других скриптах
  window.SmoothScroll = scroll;

})();
