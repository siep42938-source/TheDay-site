/* ============================================================
   TheDay Client — Theme & Personalization System
   ============================================================ */

const TD = {
  // Дефолтные настройки
  defaults: {
    theme: 'space',
    accentColor: null, // null = использовать цвет темы
    particlesEnabled: true,
    particleIntensity: 50,
    avatarData: null,
    username: null,
  },

  // Все доступные темы
  themes: [
    { id: 'space',   name: 'Космос',   bg: '#0a0a0f', accent: '#87CEEB', dot1: '#87CEEB', dot2: '#0288d1', dot3: '#0a0a0f' },
    { id: 'violet',  name: 'Фиолет',   bg: '#0c0a14', accent: '#a78bfa', dot1: '#a78bfa', dot2: '#7c3aed', dot3: '#0c0a14' },
    { id: 'emerald', name: 'Изумруд',  bg: '#080f0c', accent: '#34d399', dot1: '#34d399', dot2: '#059669', dot3: '#080f0c' },
    { id: 'sunset',  name: 'Закат',    bg: '#0f0a08', accent: '#fb923c', dot1: '#fb923c', dot2: '#ea580c', dot3: '#0f0a08' },
    { id: 'pink',    name: 'Неон',     bg: '#0f080e', accent: '#f472b6', dot1: '#f472b6', dot2: '#db2777', dot3: '#0f080e' },
    { id: 'light',   name: 'Светлая',  bg: '#f0f4f8', accent: '#0288d1', dot1: '#0288d1', dot2: '#01579b', dot3: '#e8edf2' },
  ],

  // Пресеты цветов акцента
  colorPresets: [
    '#87CEEB', '#4fc3f7', '#a78bfa', '#34d399',
    '#fb923c', '#f472b6', '#fbbf24', '#f87171',
    '#60a5fa', '#2dd4bf', '#c084fc', '#4ade80',
  ],

  // Загрузить настройки из localStorage
  load() {
    try {
      const saved = JSON.parse(localStorage.getItem('td_settings') || '{}');
      return { ...this.defaults, ...saved };
    } catch { return { ...this.defaults }; }
  },

  // Сохранить настройки
  save(settings) {
    localStorage.setItem('td_settings', JSON.stringify(settings));
  },

  // Применить тему
  applyTheme(themeId) {
    document.documentElement.setAttribute('data-theme', themeId);
    // Обновить цвет meta theme-color
    let meta = document.querySelector('meta[name=theme-color]');
    if (!meta) { meta = document.createElement('meta'); meta.name = 'theme-color'; document.head.appendChild(meta); }
    const t = this.themes.find(t => t.id === themeId);
    if (t) meta.content = t.bg;
  },

  // Применить кастомный цвет акцента
  applyAccent(color) {
    if (!color) {
      document.documentElement.style.removeProperty('--accent');
      document.documentElement.style.removeProperty('--a2');
      document.documentElement.style.removeProperty('--a3');
      document.documentElement.style.removeProperty('--glass-border');
      document.documentElement.style.removeProperty('--glow');
      return;
    }
    document.documentElement.style.setProperty('--accent', color);
    document.documentElement.style.setProperty('--a2', color);
    document.documentElement.style.setProperty('--a3', adjustColor(color, -30));
    document.documentElement.style.setProperty('--glass-border', hexToRgba(color, 0.12));
    document.documentElement.style.setProperty('--glow', hexToRgba(color, 0.15));
  },

  // Применить аватар везде на странице
  applyAvatar(dataUrl) {
    if (!dataUrl) return;
    // Аватар в navbar
    const navIcon = document.querySelector('.nav-user-icon');
    if (navIcon) {
      navIcon.innerHTML = `<img src="${dataUrl}" class="nav-user-avatar" alt="avatar"/>`;
    }
    // Аватар на странице аккаунта
    const accAvatar = document.getElementById('accAvatar');
    if (accAvatar) {
      accAvatar.innerHTML = `<img src="${dataUrl}" class="acc-avatar-img" alt="avatar"/>`;
    }
    // Превью в панели настроек
    const previewWrap = document.getElementById('avatarPreviewWrap');
    if (previewWrap) {
      previewWrap.innerHTML = `<img src="${dataUrl}" class="acc-avatar-img" alt="avatar"/>`;
    }
  },

  // Инициализация
  init() {
    const s = this.load();
    this.applyTheme(s.theme);
    if (s.accentColor) this.applyAccent(s.accentColor);
    if (s.avatarData) this.applyAvatar(s.avatarData);
    this.buildPanel(s);
    this.bindTrigger();
    this.applyParticles(s.particlesEnabled, s.particleIntensity);
    this.addRippleToButtons();
    this.initTooltips();
    return s;
  },

  // Применить настройки частиц
  applyParticles(enabled, intensity) {
    const canvas = document.getElementById('spaceCanvas');
    if (!canvas) return;
    canvas.style.opacity = enabled ? (intensity / 100).toFixed(2) : '0';
  },

  // Построить панель настроек
  buildPanel(settings) {
    // Удалить старую панель если есть
    document.getElementById('settingsPanel')?.remove();
    document.getElementById('settingsOverlay')?.remove();
    document.getElementById('settingsTrigger')?.remove();

    const overlay = document.createElement('div');
    overlay.className = 'settings-overlay';
    overlay.id = 'settingsOverlay';
    overlay.onclick = () => this.closePanel();
    document.body.appendChild(overlay);

    const panel = document.createElement('div');
    panel.className = 'settings-panel';
    panel.id = 'settingsPanel';
    panel.innerHTML = this.renderPanelHTML(settings);
    document.body.appendChild(panel);

    // Toast
    const toast = document.createElement('div');
    toast.className = 'save-toast';
    toast.id = 'saveToast';
    toast.textContent = '✓ Настройки сохранены';
    document.body.appendChild(toast);

    this.bindPanelEvents(settings);
  },

  renderPanelHTML(s) {
    const themeBtns = this.themes.map(t => `
      <button class="theme-btn ${s.theme === t.id ? 'active' : ''}" data-theme-id="${t.id}" onclick="TD.setTheme('${t.id}')">
        <div class="theme-preview" style="background:${t.bg}">
          <div class="theme-dot" style="background:${t.dot1}"></div>
          <div class="theme-dot" style="background:${t.dot2}"></div>
          <div class="theme-dot" style="background:${t.dot3}"></div>
        </div>
        <span class="theme-name">${t.name}</span>
      </button>
    `).join('');

    const colorDots = this.colorPresets.map(c => `
      <div class="color-preset ${s.accentColor === c ? 'active' : ''}"
           style="background:${c}" data-color="${c}"
           onclick="TD.setAccent('${c}')"></div>
    `).join('');

    const avatarContent = s.avatarData
      ? `<img src="${s.avatarData}" class="acc-avatar-img" alt="avatar"/>`
      : `<span id="avatarInitial">${(s.username || '?')[0].toUpperCase()}</span>`;

    return `
      <div class="sp-header">
        <span class="sp-title">⚙ Персонализация</span>
        <button class="sp-close" onclick="TD.closePanel()">✕</button>
      </div>
      <div class="sp-body">

        <div class="sp-section">
          <div class="sp-section-title">🎨 Тема оформления</div>
          <div class="theme-grid">${themeBtns}</div>
        </div>

        <div class="sp-section">
          <div class="sp-section-title">✨ Цвет акцента</div>
          <div class="color-presets">${colorDots}</div>
          <div class="color-custom-row">
            <span class="color-custom-label">Свой цвет:</span>
            <input type="color" class="color-picker" id="customColorPicker"
              value="${s.accentColor || '#87CEEB'}"
              oninput="TD.setAccent(this.value)"/>
            <button onclick="TD.resetAccent()" style="
              background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);
              color:var(--muted);padding:6px 10px;border-radius:8px;font-size:11px;
              cursor:pointer;font-family:inherit;transition:color .2s
            " onmouseover="this.style.color='var(--accent)'" onmouseout="this.style.color='var(--muted)'">
              Сброс
            </button>
          </div>
        </div>

        <div class="sp-section">
          <div class="sp-section-title">👤 Аватар</div>
          <div class="avatar-upload-area" onclick="document.getElementById('avatarFileInput').click()">
            <div class="avatar-preview-wrap" id="avatarPreviewWrap">${avatarContent}</div>
            <div class="avatar-upload-hint">
              <span>Нажмите для загрузки</span><br/>
              JPG, PNG, GIF до 2MB
            </div>
            <input type="file" id="avatarFileInput" accept="image/*" onchange="TD.uploadAvatar(this)"/>
          </div>
          ${s.avatarData ? `<button onclick="TD.removeAvatar()" style="
            width:100%;margin-top:8px;background:rgba(239,83,80,0.08);
            border:1px solid rgba(239,83,80,0.2);color:#ef5350;
            padding:8px;border-radius:8px;font-size:12px;cursor:pointer;font-family:inherit;
            transition:background .2s
          " onmouseover="this.style.background='rgba(239,83,80,0.15)'" onmouseout="this.style.background='rgba(239,83,80,0.08)'">
            Удалить аватар
          </button>` : ''}
        </div>

        <div class="sp-section">
          <div class="sp-section-title">🌌 Фон и частицы</div>
          <div class="particle-toggle-row">
            <div>
              <div class="ptl-label">Звёздный фон</div>
              <div class="ptl-sub">Анимированные звёзды и частицы</div>
            </div>
            <div class="tog ${s.particlesEnabled ? 'on' : ''}" id="particleToggle"
                 onclick="TD.toggleParticles()"></div>
          </div>
          <div class="particle-toggle-row">
            <div>
              <div class="ptl-label">Интенсивность</div>
            </div>
          </div>
          <div class="sp-slider-row">
            <input type="range" min="10" max="100" value="${s.particleIntensity}"
              id="particleSlider"
              oninput="TD.setParticleIntensity(this.value)"/>
            <span class="sp-slider-val" id="particleSliderVal">${s.particleIntensity}%</span>
          </div>
          <div class="particle-toggle-row" style="margin-top:8px">
            <div>
              <div class="ptl-label">Курсорный след</div>
              <div class="ptl-sub">Небесно-голубые частицы за курсором</div>
            </div>
            <div class="tog ${s.cursorTrail !== false ? 'on' : ''}" id="cursorTrailToggle"
                 onclick="TD.toggleCursorTrail()"></div>
          </div>
        </div>

        <div class="sp-section">
          <div class="sp-section-title">ℹ️ О сайте</div>
          <div style="font-size:12px;color:var(--muted);line-height:1.7">
            <div>TheDay Client v2.0</div>
            <div>Minecraft клиент нового поколения</div>
            <div style="margin-top:8px;color:rgba(74,85,104,0.6)">Все настройки сохраняются локально в браузере</div>
          </div>
        </div>

      </div>
    `;
  },

  bindPanelEvents(settings) {
    // Drag-and-drop для аватара
    const uploadArea = document.querySelector('.avatar-upload-area');
    if (uploadArea) {
      uploadArea.addEventListener('dragover', e => { e.preventDefault(); uploadArea.style.borderColor = 'var(--accent)'; });
      uploadArea.addEventListener('dragleave', () => { uploadArea.style.borderColor = ''; });
      uploadArea.addEventListener('drop', e => {
        e.preventDefault();
        uploadArea.style.borderColor = '';
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) this.processAvatarFile(file);
      });
    }
  },

  bindTrigger() {
    const trigger = document.createElement('button');
    trigger.className = 'settings-trigger';
    trigger.id = 'settingsTrigger';
    trigger.title = 'Персонализация';
    trigger.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>`;
    trigger.onclick = () => this.openPanel();
    document.body.appendChild(trigger);
  },

  openPanel() {
    document.getElementById('settingsPanel')?.classList.add('open');
    document.getElementById('settingsOverlay')?.classList.add('open');
  },

  closePanel() {
    document.getElementById('settingsPanel')?.classList.remove('open');
    document.getElementById('settingsOverlay')?.classList.remove('open');
  },

  setTheme(themeId) {
    this.applyTheme(themeId);
    // Обновить активную кнопку
    document.querySelectorAll('.theme-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.themeId === themeId);
    });
    const s = this.load();
    s.theme = themeId;
    this.save(s);
    this.showToast();
  },

  setAccent(color) {
    this.applyAccent(color);
    document.querySelectorAll('.color-preset').forEach(d => {
      d.classList.toggle('active', d.dataset.color === color);
    });
    const picker = document.getElementById('customColorPicker');
    if (picker) picker.value = color;
    const s = this.load();
    s.accentColor = color;
    this.save(s);
    this.showToast();
  },

  resetAccent() {
    this.applyAccent(null);
    document.querySelectorAll('.color-preset').forEach(d => d.classList.remove('active'));
    const s = this.load();
    s.accentColor = null;
    this.save(s);
    this.showToast();
  },

  uploadAvatar(input) {
    const file = input.files[0];
    if (!file) return;
    this.processAvatarFile(file);
  },

  processAvatarFile(file) {
    if (file.size > 2 * 1024 * 1024) {
      alert('Файл слишком большой. Максимум 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      const dataUrl = e.target.result;
      // Сжать изображение
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 200;
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');
        // Crop to square
        const min = Math.min(img.width, img.height);
        const sx = (img.width - min) / 2;
        const sy = (img.height - min) / 2;
        ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
        const compressed = canvas.toDataURL('image/jpeg', 0.85);
        this.saveAvatar(compressed);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  },

  saveAvatar(dataUrl) {
    const s = this.load();
    s.avatarData = dataUrl;
    // Обновить username в настройках
    const user = JSON.parse(localStorage.getItem('td_user') || '{}');
    if (user.username) s.username = user.username;
    this.save(s);
    this.applyAvatar(dataUrl);
    // Перестроить панель
    this.buildPanel(s);
    this.showToast('✓ Аватар обновлён');
  },

  removeAvatar() {
    const s = this.load();
    s.avatarData = null;
    this.save(s);
    // Восстановить инициал
    const user = JSON.parse(localStorage.getItem('td_user') || '{}');
    const initial = (user.username || '?')[0].toUpperCase();
    const navIcon = document.querySelector('.nav-user-icon');
    if (navIcon) navIcon.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
    const accAvatar = document.getElementById('accAvatar');
    if (accAvatar) accAvatar.textContent = initial;
    this.buildPanel(s);
    this.showToast('✓ Аватар удалён');
  },

  toggleParticles() {
    const s = this.load();
    s.particlesEnabled = !s.particlesEnabled;
    this.save(s);
    this.applyParticles(s.particlesEnabled, s.particleIntensity);
    const tog = document.getElementById('particleToggle');
    if (tog) tog.className = 'tog' + (s.particlesEnabled ? ' on' : '');
    this.showToast();
  },

  setParticleIntensity(val) {
    const s = this.load();
    s.particleIntensity = parseInt(val);
    this.save(s);
    this.applyParticles(s.particlesEnabled, s.particleIntensity);
    const valEl = document.getElementById('particleSliderVal');
    if (valEl) valEl.textContent = val + '%';
  },

  toggleCursorTrail() {
    const s = this.load();
    s.cursorTrail = s.cursorTrail === false ? true : false;
    this.save(s);
    const tog = document.getElementById('cursorTrailToggle');
    if (tog) tog.className = 'tog' + (s.cursorTrail !== false ? ' on' : '');
    // Скрыть/показать trail элементы
    document.querySelectorAll('[data-trail]').forEach(el => {
      el.style.display = s.cursorTrail !== false ? '' : 'none';
    });
    this.showToast();
  },

  showToast(msg) {
    const toast = document.getElementById('saveToast');
    if (!toast) return;
    toast.textContent = msg || '✓ Настройки сохранены';
    toast.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
  },

  // Ripple эффект на кнопках (только если smooth.js ещё не добавил)
  addRippleToButtons() {
    document.querySelectorAll('.btn-primary, .btn-ghost, .btn-outline, .acc-btn, .btn-auth').forEach(btn => {
      if (btn.dataset.ripple) return; // уже добавлен через smooth.js
      btn.classList.add('ripple-btn');
      btn.dataset.ripple = '1';
      btn.style.position = 'relative';
      btn.style.overflow = 'hidden';
      btn.addEventListener('click', function(e) {
        const r = document.createElement('span');
        r.className = 'ripple';
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        r.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX-rect.left-size/2}px;top:${e.clientY-rect.top-size/2}px`;
        this.appendChild(r);
        setTimeout(() => r.remove(), 600);
      });
    });
  },

  // Tooltips
  initTooltips() {
    document.querySelectorAll('[data-tooltip]').forEach(el => {
      const wrap = document.createElement('div');
      wrap.className = 'tooltip-wrap';
      el.parentNode.insertBefore(wrap, el);
      wrap.appendChild(el);
      const tip = document.createElement('div');
      tip.className = 'tooltip';
      tip.textContent = el.dataset.tooltip;
      wrap.appendChild(tip);
    });
  },
};

// Утилиты цвета
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${alpha})`;
}
function adjustColor(hex, amount) {
  const r = Math.max(0,Math.min(255,parseInt(hex.slice(1,3),16)+amount));
  const g = Math.max(0,Math.min(255,parseInt(hex.slice(3,5),16)+amount));
  const b = Math.max(0,Math.min(255,parseInt(hex.slice(5,7),16)+amount));
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}

// Автозапуск
document.addEventListener('DOMContentLoaded', () => {
  const settings = TD.init();
  // Применить cursor trail настройку
  if (settings.cursorTrail === false) {
    setTimeout(() => {
      document.querySelectorAll('[data-trail]').forEach(el => el.style.display = 'none');
    }, 100);
  }
});
