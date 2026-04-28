/* ============================================================
   Steve3D — Minecraft 3D character renderer
   Pure Canvas 2D — no external libraries
   ============================================================ */

class Steve3D {
  constructor(canvas, skinUrl) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.skinUrl = skinUrl || null;
    this.skinImg = null;
    this.angle = 0;
    this.animFrame = null;
    this.dragging = false;
    this.lastX = 0;
    this.scale = canvas.width / 120;
    this.bobTime = 0;
    this.armAngle = 0;
    this.legAngle = 0;
    this.equippedItems = {};

    this._initEvents();
    this._loadSkin();
  }

  _initEvents() {
    const c = this.canvas;
    c.addEventListener('mousedown', e => { this.dragging = true; this.lastX = e.clientX; });
    c.addEventListener('mousemove', e => {
      if (this.dragging) { this.angle += (e.clientX - this.lastX) * 0.8; this.lastX = e.clientX; }
    });
    c.addEventListener('mouseup', () => this.dragging = false);
    c.addEventListener('mouseleave', () => this.dragging = false);
    c.addEventListener('touchstart', e => { this.dragging = true; this.lastX = e.touches[0].clientX; });
    c.addEventListener('touchmove', e => {
      if (this.dragging) { this.angle += (e.touches[0].clientX - this.lastX) * 0.8; this.lastX = e.touches[0].clientX; }
      e.preventDefault();
    }, { passive: false });
    c.addEventListener('touchend', () => this.dragging = false);
  }

  _loadSkin() {
    if (!this.skinUrl) { this._startRender(); return; }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { this.skinImg = img; this._startRender(); };
    img.onerror = () => { this.skinImg = null; this._startRender(); };
    img.src = this.skinUrl;
  }

  setSkin(url) {
    this.skinUrl = url;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { this.skinImg = img; };
    img.onerror = () => { this.skinImg = null; };
    img.src = url;
  }

  setEquipped(slot, item) {
    this.equippedItems[slot] = item;
  }

  _startRender() {
    const loop = () => {
      this.bobTime += 0.04;
      if (!this.dragging) this.angle += 0.4;
      this.armAngle = Math.sin(this.bobTime) * 18;
      this.legAngle = Math.sin(this.bobTime) * 22;
      this._draw();
      this.animFrame = requestAnimationFrame(loop);
    };
    if (this.animFrame) cancelAnimationFrame(this.animFrame);
    loop();
  }

  stop() {
    if (this.animFrame) cancelAnimationFrame(this.animFrame);
  }

  // Получить цвет пикселя из скина
  _skinColor(u, v, fallback) {
    if (!this.skinImg) return fallback;
    try {
      const offscreen = document.createElement('canvas');
      offscreen.width = this.skinImg.width;
      offscreen.height = this.skinImg.height;
      const octx = offscreen.getContext('2d');
      octx.drawImage(this.skinImg, 0, 0);
      const px = octx.getImageData(u, v, 1, 1).data;
      if (px[3] < 10) return fallback;
      return `rgb(${px[0]},${px[1]},${px[2]})`;
    } catch { return fallback; }
  }

  // Получить среднй цвет региона скина
  _skinRegionColor(u, v, w, h, fallback) {
    if (!this.skinImg) return fallback;
    try {
      const offscreen = document.createElement('canvas');
      offscreen.width = this.skinImg.width;
      offscreen.height = this.skinImg.height;
      const octx = offscreen.getContext('2d');
      octx.drawImage(this.skinImg, 0, 0);
      const data = octx.getImageData(u, v, w, h).data;
      let r=0,g=0,b=0,count=0;
      for(let i=0;i<data.length;i+=4){
        if(data[i+3]>10){r+=data[i];g+=data[i+1];b+=data[i+2];count++;}
      }
      if(!count) return fallback;
      return `rgb(${Math.round(r/count)},${Math.round(g/count)},${Math.round(b/count)})`;
    } catch { return fallback; }
  }

  _draw() {
    const ctx = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const s = this.scale;
    ctx.clearRect(0, 0, W, H);

    // Фон
    const grad = ctx.createRadialGradient(W/2, H*0.85, 5, W/2, H*0.85, W*0.5);
    grad.addColorStop(0, 'rgba(135,206,235,0.12)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Тень под персонажем
    ctx.save();
    ctx.translate(W/2, H*0.88);
    ctx.scale(1, 0.3);
    const shadowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 22*s);
    shadowGrad.addColorStop(0, 'rgba(0,0,0,0.4)');
    shadowGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 22*s, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();

    const rad = this.angle * Math.PI / 180;
    const cosA = Math.cos(rad);
    const sinA = Math.sin(rad);

    // Цвета из скина или дефолтные (Steve)
    const skinColor  = this._skinRegionColor(8, 8, 8, 8, '#c8a882');
    const hairColor  = this._skinRegionColor(8, 0, 8, 8, '#5c3d1e');
    const shirtColor = this._skinRegionColor(20, 20, 8, 12, '#4a7fc1');
    const pantsColor = this._skinRegionColor(4, 20, 8, 12, '#1a3a6b');
    const shoeColor  = this._skinRegionColor(4, 28, 8, 4, '#3d2b1a');

    // Центр персонажа
    const cx = W / 2;
    const cy = H * 0.42;
    const bob = Math.sin(this.bobTime * 0.5) * 1.5 * s;

    // Перспективная проекция
    const proj = (x, z) => ({
      x: cx + (x * cosA - z * sinA) * s,
      y: cy + bob + (x * sinA + z * cosA) * s * 0.15
    });

    const drawBox = (x, y, z, w, h, d, colors) => {
      // 6 граней куба: front, back, left, right, top, bottom
      const hw = w/2, hd = d/2;
      const corners = [
        proj(x-hw, z-hd), proj(x+hw, z-hd),
        proj(x+hw, z+hd), proj(x-hw, z+hd)
      ];

      // Определяем видимые грани по углу
      const showRight = cosA > 0;
      const showFront = sinA < 0;

      // Нижняя грань
      ctx.beginPath();
      ctx.moveTo(corners[0].x, corners[0].y + h*s);
      ctx.lineTo(corners[1].x, corners[1].y + h*s);
      ctx.lineTo(corners[2].x, corners[2].y + h*s);
      ctx.lineTo(corners[3].x, corners[3].y + h*s);
      ctx.closePath();
      ctx.fillStyle = colors.bottom || colors.front;
      ctx.fill();

      // Верхняя грань
      ctx.beginPath();
      ctx.moveTo(corners[0].x, corners[0].y);
      ctx.lineTo(corners[1].x, corners[1].y);
      ctx.lineTo(corners[2].x, corners[2].y);
      ctx.lineTo(corners[3].x, corners[3].y);
      ctx.closePath();
      ctx.fillStyle = colors.top || colors.front;
      ctx.fill();

      // Боковые грани
      if (showFront) {
        ctx.beginPath();
        ctx.moveTo(corners[0].x, corners[0].y);
        ctx.lineTo(corners[1].x, corners[1].y);
        ctx.lineTo(corners[1].x, corners[1].y + h*s);
        ctx.lineTo(corners[0].x, corners[0].y + h*s);
        ctx.closePath();
        ctx.fillStyle = colors.front;
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(corners[2].x, corners[2].y);
        ctx.lineTo(corners[3].x, corners[3].y);
        ctx.lineTo(corners[3].x, corners[3].y + h*s);
        ctx.lineTo(corners[2].x, corners[2].y + h*s);
        ctx.closePath();
        ctx.fillStyle = colors.back || colors.front;
        ctx.fill();
      }

      if (showRight) {
        ctx.beginPath();
        ctx.moveTo(corners[1].x, corners[1].y);
        ctx.lineTo(corners[2].x, corners[2].y);
        ctx.lineTo(corners[2].x, corners[2].y + h*s);
        ctx.lineTo(corners[1].x, corners[1].y + h*s);
        ctx.closePath();
        ctx.fillStyle = colors.right || colors.side;
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(corners[0].x, corners[0].y);
        ctx.lineTo(corners[3].x, corners[3].y);
        ctx.lineTo(corners[3].x, corners[3].y + h*s);
        ctx.lineTo(corners[0].x, corners[0].y + h*s);
        ctx.closePath();
        ctx.fillStyle = colors.left || colors.side;
        ctx.fill();
      }
    };

    // Затемнение для граней
    const darken = (color, amount) => {
      const m = ctx.createLinearGradient(0,0,0,1);
      return color; // упрощённо
    };

    const shade = (hex, factor) => {
      // Затемняем цвет
      const r = parseInt(hex.slice(1,3)||'0',16);
      const g = parseInt(hex.slice(3,5)||'0',16);
      const b = parseInt(hex.slice(5,7)||'0',16);
      return `rgb(${Math.round(r*factor)},${Math.round(g*factor)},${Math.round(b*factor)})`;
    };

    const mkColors = (base) => ({
      front: base,
      back: base,
      side: base,
      left: base,
      right: base,
      top: base,
      bottom: base,
    });

    // Ноги с анимацией
    const legL = this.legAngle;
    const legR = -this.legAngle;

    // Левая нога
    ctx.save();
    ctx.translate(cx - 4*s, cy + 12*s + bob);
    ctx.rotate(legL * Math.PI / 180);
    ctx.translate(-(cx - 4*s), -(cy + 12*s + bob));
    drawBox(-4, cy + 12*s - cy, 0, 4, 12, 4, {
      front: pantsColor, back: pantsColor, side: pantsColor,
      left: pantsColor, right: pantsColor, top: pantsColor, bottom: shoeColor
    });
    ctx.restore();

    // Правая нога
    ctx.save();
    ctx.translate(cx + 4*s, cy + 12*s + bob);
    ctx.rotate(legR * Math.PI / 180);
    ctx.translate(-(cx + 4*s), -(cy + 12*s + bob));
    drawBox(4, cy + 12*s - cy, 0, 4, 12, 4, {
      front: pantsColor, back: pantsColor, side: pantsColor,
      left: pantsColor, right: pantsColor, top: pantsColor, bottom: shoeColor
    });
    ctx.restore();

    // Тело
    drawBox(0, cy - cy, 0, 8, 12, 4, mkColors(shirtColor));

    // Руки с анимацией
    const armL = this.armAngle;
    const armR = -this.armAngle;

    // Левая рука
    ctx.save();
    ctx.translate(cx - 8*s, cy + 2*s + bob);
    ctx.rotate(armL * Math.PI / 180);
    ctx.translate(-(cx - 8*s), -(cy + 2*s + bob));
    drawBox(-8, cy + 2*s - cy, 0, 4, 12, 4, mkColors(skinColor));
    ctx.restore();

    // Правая рука
    ctx.save();
    ctx.translate(cx + 8*s, cy + 2*s + bob);
    ctx.rotate(armR * Math.PI / 180);
    ctx.translate(-(cx + 8*s), -(cy + 2*s + bob));
    drawBox(8, cy + 2*s - cy, 0, 4, 12, 4, mkColors(skinColor));
    ctx.restore();

    // Голова
    drawBox(0, cy - 8*s - cy, 0, 8, 8, 8, {
      front: skinColor, back: skinColor, side: skinColor,
      left: skinColor, right: skinColor,
      top: hairColor, bottom: skinColor
    });

    // Волосы (второй слой головы — чуть больше)
    ctx.globalAlpha = 0.85;
    drawBox(0, cy - 8.3*s - cy, 0, 8.6, 8.3, 8.6, mkColors(hairColor));
    ctx.globalAlpha = 1;

    // Глаза
    const eyeY = cy - 4*s + bob;
    const eyeOffset = proj(-2, -4.1);
    const eyeOffset2 = proj(2, -4.1);

    ctx.fillStyle = '#fff';
    ctx.fillRect(eyeOffset.x - 1.5*s, eyeY - 1.5*s, 2.5*s, 2*s);
    ctx.fillRect(eyeOffset2.x - 1*s, eyeY - 1.5*s, 2.5*s, 2*s);

    ctx.fillStyle = '#1a6bb5';
    ctx.fillRect(eyeOffset.x - 0.8*s, eyeY - 1*s, 1.5*s, 1.5*s);
    ctx.fillRect(eyeOffset2.x - 0.3*s, eyeY - 1*s, 1.5*s, 1.5*s);

    ctx.fillStyle = '#000';
    ctx.fillRect(eyeOffset.x - 0.3*s, eyeY - 0.7*s, 0.8*s, 0.8*s);
    ctx.fillRect(eyeOffset2.x + 0.2*s, eyeY - 0.7*s, 0.8*s, 0.8*s);

    // Рот
    ctx.fillStyle = '#5c3d1e';
    const mouthP = proj(0, -4.1);
    ctx.fillRect(mouthP.x - 1.5*s, eyeY + 1.5*s, 3*s, 0.8*s);
  }
}

window.Steve3D = Steve3D;
