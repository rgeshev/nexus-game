import './background-fx.css';

const PALETTE = ['#00f6ff', '#ff2fd0', '#ffcc33', '#8a5cff'];
const FLOATER_TYPES = ['dollar', 'percent', 'question', 'chart', 'trend', 'hex', 'spark'];

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function random(min, max) {
  return min + Math.random() * (max - min);
}

class BackgroundFx {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.nodes = [];
    this.floaters = [];
    this.width = 0;
    this.height = 0;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.rafId = null;
    this.running = false;
    this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.handleResize = this.handleResize.bind(this);
    this.handleVisibility = this.handleVisibility.bind(this);
    this.tick = this.tick.bind(this);
  }

  init() {
    this.handleResize();
    window.addEventListener('resize', this.handleResize);
    document.addEventListener('visibilitychange', this.handleVisibility);

    if (this.reduceMotion) {
      this.drawFrame(0);
      return;
    }

    this.start();
  }

  destroy() {
    this.stop();
    window.removeEventListener('resize', this.handleResize);
    document.removeEventListener('visibilitychange', this.handleVisibility);
  }

  handleVisibility() {
    if (document.hidden) {
      this.stop();
    } else if (!this.reduceMotion) {
      this.start();
    }
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.tick);
  }

  stop() {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = null;
  }

  handleResize() {
    const { innerWidth, innerHeight } = window;
    this.width = innerWidth;
    this.height = innerHeight;
    this.canvas.width = innerWidth * this.dpr;
    this.canvas.height = innerHeight * this.dpr;
    this.canvas.style.width = `${innerWidth}px`;
    this.canvas.style.height = `${innerHeight}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    this.seedNodes();
    this.seedFloaters();

    if (this.reduceMotion) this.drawFrame(0);
  }

  seedNodes() {
    const count = Math.round((this.width * this.height) / 26000);
    this.nodes = Array.from({ length: count }, () => ({
      x: random(0, this.width),
      y: random(0, this.height),
      vx: random(-0.12, 0.12),
      vy: random(-0.12, 0.12),
      r: random(1, 2.4),
    }));
  }

  seedFloaters() {
    const count = Math.round((this.width * this.height) / 55000);
    this.floaters = Array.from({ length: Math.max(count, 10) }, () => this.createFloater(true));
  }

  createFloater(randomY = false) {
    return {
      type: pick(FLOATER_TYPES),
      color: pick(PALETTE),
      x: random(0, this.width),
      y: randomY ? random(0, this.height) : this.height + random(20, 120),
      size: random(14, 30),
      speed: random(6, 16),
      drift: random(-0.4, 0.4),
      phase: random(0, Math.PI * 2),
      rotation: random(-0.3, 0.3),
      opacity: random(0.35, 0.85),
    };
  }

  tick(now) {
    if (!this.running) return;
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;
    this.update(dt, now);
    this.drawFrame(now);
    this.rafId = requestAnimationFrame(this.tick);
  }

  update(dt, now) {
    this.nodes.forEach((node) => {
      node.x += node.vx * dt * 60;
      node.y += node.vy * dt * 60;
      if (node.x < 0) node.x = this.width;
      if (node.x > this.width) node.x = 0;
      if (node.y < 0) node.y = this.height;
      if (node.y > this.height) node.y = 0;
    });

    this.floaters.forEach((floater) => {
      floater.y -= floater.speed * dt;
      floater.x += Math.sin(now / 1000 + floater.phase) * floater.drift;
      if (floater.y < -60) Object.assign(floater, this.createFloater(false));
    });
  }

  drawFrame(now) {
    const { ctx, width, height } = this;
    ctx.clearRect(0, 0, width, height);
    this.drawGrid();
    this.drawNetwork();
    this.floaters.forEach((floater) => this.drawFloater(floater, now));
  }

  drawGrid() {
    const { ctx, width, height } = this;
    const spacing = 64;
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 246, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += spacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += spacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawNetwork() {
    const { ctx, nodes } = this;
    const maxDist = 130;

    ctx.save();
    for (let i = 0; i < nodes.length; i += 1) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j += 1) {
        const b = nodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.hypot(dx, dy);
        if (dist < maxDist) {
          ctx.strokeStyle = `rgba(0, 246, 255, ${0.12 * (1 - dist / maxDist)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    nodes.forEach((node) => {
      ctx.fillStyle = 'rgba(0, 246, 255, 0.5)';
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  drawFloater(floater, now) {
    const { ctx } = this;
    const t = now / 1000;
    const fadeIn = Math.min(1, (this.height - floater.y) / 80);
    const alpha = floater.opacity * Math.max(0, Math.min(1, fadeIn));

    ctx.save();
    ctx.translate(floater.x, floater.y);
    ctx.rotate(floater.rotation * Math.sin(t + floater.phase));
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = floater.color;
    ctx.fillStyle = floater.color;
    ctx.shadowColor = floater.color;
    ctx.shadowBlur = 10;
    ctx.lineWidth = 2;

    switch (floater.type) {
      case 'dollar':
        this.drawGlyph('$', floater.size);
        break;
      case 'percent':
        this.drawGlyph('%', floater.size * 0.9);
        break;
      case 'question':
        this.drawGlyph('?', floater.size);
        break;
      case 'chart':
        this.drawChart(floater.size, t + floater.phase);
        break;
      case 'trend':
        this.drawTrend(floater.size);
        break;
      case 'hex':
        this.drawHex(floater.size * 0.5);
        break;
      case 'spark':
      default:
        this.drawSpark(floater.size * 0.5);
        break;
    }

    ctx.restore();
  }

  drawGlyph(char, size) {
    const { ctx } = this;
    ctx.font = `700 ${size}px 'Share Tech Mono', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(char, 0, 0);
  }

  drawChart(size, phase) {
    const { ctx } = this;
    const bars = 4;
    const barWidth = size / bars - 2;
    for (let i = 0; i < bars; i += 1) {
      const h = size * (0.35 + 0.5 * Math.abs(Math.sin(phase + i)));
      const x = -size / 2 + i * (barWidth + 2);
      ctx.globalAlpha *= 1;
      ctx.fillRect(x, size / 2 - h, barWidth, h);
    }
  }

  drawTrend(size) {
    const { ctx } = this;
    const points = [
      [-size / 2, size / 4],
      [-size / 6, -size / 8],
      [size / 6, size / 8],
      [size / 2, -size / 2],
    ];
    ctx.beginPath();
    points.forEach(([x, y], index) => {
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    const [ex, ey] = points[points.length - 1];
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex - 6, ey + 2);
    ctx.lineTo(ex - 2, ey + 7);
    ctx.closePath();
    ctx.fill();
  }

  drawHex(radius) {
    const { ctx } = this;
    ctx.beginPath();
    for (let i = 0; i < 6; i += 1) {
      const angle = (Math.PI / 3) * i;
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.18, 0, Math.PI * 2);
    ctx.fill();
  }

  drawSpark(radius) {
    const { ctx } = this;
    ctx.beginPath();
    for (let i = 0; i < 8; i += 1) {
      const angle = (Math.PI / 4) * i;
      const r = i % 2 === 0 ? radius : radius * 0.4;
      const x = r * Math.cos(angle);
      const y = r * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }
}

export function renderBackgroundFx() {
  return `
    <div class="bg-fx-layer" aria-hidden="true">
      <canvas class="bg-fx-canvas"></canvas>
      <div class="bg-fx-scanlines"></div>
      <div class="bg-fx-vignette"></div>
    </div>
  `;
}

export function initBackgroundFx(root = document) {
  const canvas = root.querySelector('.bg-fx-canvas');
  if (!canvas) return null;

  const fx = new BackgroundFx(canvas);
  fx.init();
  return fx;
}
