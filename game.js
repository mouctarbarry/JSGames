(() => {
  "use strict";

  // ═══════════════════════════════════════
  //  CONFIG
  // ═══════════════════════════════════════
  const COLS = 30;
  const ROWS = 20;
  const BASE_SPEED = 8;
  const SPEED_INC = 0.6;
  const MAX_SPEED = 18;
  const PER_LEVEL = 5;
  const PTS = 10;

  const PAL = {
    bg:       "#0a0e1a",
    grid:     "rgba(100, 200, 255, 0.035)",
    head:     "#00ff88",
    body:     "#00cc66",
    tail:     "#004422",
    eye:      "#ffffff",
    pupil:    "#111111",
    food:     "#ff3355",
    foodHi:   "#ff6680",
    text:     "#ffffff",
    dim:      "rgba(255,255,255,0.4)",
    accent:   "#00ff88",
    overlay:  "rgba(8, 12, 24, 0.88)",
  };

  const DIR = {
    UP:    { x:  0, y: -1 },
    DOWN:  { x:  0, y:  1 },
    LEFT:  { x: -1, y:  0 },
    RIGHT: { x:  1, y:  0 },
  };

  const OPP = { UP: "DOWN", DOWN: "UP", LEFT: "RIGHT", RIGHT: "LEFT" };
  const STATE = { MENU: 0, PLAY: 1, PAUSE: 2, OVER: 3 };

  function lerp(a, b, t) { return a + (b - a) * t; }
  function rand(lo, hi) { return Math.random() * (hi - lo) + lo; }
  function randInt(lo, hi) { return Math.floor(rand(lo, hi + 1)); }

  // ═══════════════════════════════════════
  //  PARTICLE
  // ═══════════════════════════════════════
  class Particle {
    constructor(x, y, color, speed, life, radius) {
      this.x = x;
      this.y = y;
      const a = rand(0, Math.PI * 2);
      const s = speed ?? rand(80, 220);
      this.vx = Math.cos(a) * s;
      this.vy = Math.sin(a) * s;
      this.life = life ?? rand(0.3, 0.7);
      this.max = this.life;
      this.r = radius ?? rand(2, 5);
      this.color = color;
    }
    update(dt) {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.vx *= 0.96;
      this.vy *= 0.96;
      this.life -= dt;
    }
    draw(ctx) {
      const a = Math.max(0, this.life / this.max);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r * a, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    get dead() { return this.life <= 0; }
  }

  // ═══════════════════════════════════════
  //  FLOATING TEXT
  // ═══════════════════════════════════════
  class FloatText {
    constructor(x, y, text, color) {
      this.x = x;
      this.y = y;
      this.text = text;
      this.color = color || PAL.accent;
      this.life = 1;
      this.vy = -70;
    }
    update(dt) {
      this.y += this.vy * dt;
      this.vy *= 0.94;
      this.life -= dt * 1.3;
    }
    draw(ctx, cell) {
      if (this.life <= 0) return;
      ctx.save();
      ctx.globalAlpha = Math.max(0, this.life);
      ctx.fillStyle = this.color;
      ctx.font = `bold ${Math.round(cell * 0.75)}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 8;
      ctx.fillText(this.text, this.x, this.y);
      ctx.restore();
    }
    get dead() { return this.life <= 0; }
  }

  // ═══════════════════════════════════════
  //  AMBIENT PARTICLE
  // ═══════════════════════════════════════
  class Ambient {
    constructor(w, h, init) {
      this.w = w;
      this.h = h;
      this.x = rand(0, w);
      this.y = init ? rand(0, h) : rand(-40, -5);
      this.r = rand(0.8, 2.5);
      this.a = rand(0.04, 0.15);
      this.vy = rand(8, 25);
      this.vx = rand(-4, 4);
    }
    update(dt) {
      this.y += this.vy * dt;
      this.x += this.vx * dt;
      if (this.y > this.h + 10 || this.x < -10 || this.x > this.w + 10) {
        this.x = rand(0, this.w);
        this.y = rand(-40, -5);
      }
    }
    draw(ctx) {
      ctx.save();
      ctx.globalAlpha = this.a;
      ctx.fillStyle = PAL.accent;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // ═══════════════════════════════════════
  //  GAME
  // ═══════════════════════════════════════
  class Game {
    constructor() {
      this.cvs = document.getElementById("game");
      this.ctx = this.cvs.getContext("2d");
      this.hint = document.getElementById("hint");
      this.state = STATE.MENU;

      this.snake = [];
      this.dir = "RIGHT";
      this.nextDir = "RIGHT";
      this.food = { x: 0, y: 0 };
      this.score = 0;
      this.apples = 0;
      this.level = 1;
      this.best = parseInt(localStorage.getItem("snake_hi") || "0", 10);

      this.particles = [];
      this.floats = [];
      this.ambient = [];

      this.lastTick = 0;
      this.tickMs = 1000 / BASE_SPEED;
      this.lastFrame = 0;
      this.foodT = 0;
      this.menuT = 0;
      this.shakeI = 0;
      this.shakeX = 0;
      this.shakeY = 0;

      this.demoSnake = this._demoSnake();
      this.demoDir = "RIGHT";
      this.demoTick = 0;

      this.cell = 0;
      this._resize();
      this._bind();
    }

    // ── Resize ──────────────────────────
    _resize() {
      const pad = 32;
      const maxW = window.innerWidth - pad;
      const maxH = window.innerHeight - pad - 40;
      const cw = Math.floor(maxW / COLS);
      const ch = Math.floor(maxH / ROWS);
      this.cell = Math.max(12, Math.min(cw, ch, 28));
      this.cvs.width = COLS * this.cell;
      this.cvs.height = ROWS * this.cell;

      this.ambient = [];
      const n = Math.round(this.cvs.width * this.cvs.height / 12000);
      for (let i = 0; i < n; i++) {
        this.ambient.push(new Ambient(this.cvs.width, this.cvs.height, true));
      }

      this.hint.textContent = "ontouchstart" in window
        ? "Swipez pour diriger \u2022 Tapez pour pause"
        : "Fl\u00e8ches / WASD \u2022 Espace : jouer \u2022 P : pause";
    }

    // ── Input ───────────────────────────
    _bind() {
      window.addEventListener("resize", () => this._resize());

      document.addEventListener("keydown", (e) => {
        const k = e.code;
        if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space","KeyW","KeyA","KeyS","KeyD","KeyP"].includes(k)) {
          e.preventDefault();
        }

        if (this.state === STATE.MENU || this.state === STATE.OVER) {
          if (k === "Space" || k === "Enter") { this._start(); return; }
        }
        if (this.state === STATE.PLAY && (k === "KeyP" || k === "Escape")) {
          this.state = STATE.PAUSE; return;
        }
        if (this.state === STATE.PAUSE) {
          if (k === "KeyP" || k === "Escape" || k === "Space") {
            this.state = STATE.PLAY; return;
          }
        }

        if (this.state !== STATE.PLAY) return;

        let nd;
        switch (k) {
          case "ArrowUp":    case "KeyW": nd = "UP";    break;
          case "ArrowDown":  case "KeyS": nd = "DOWN";  break;
          case "ArrowLeft":  case "KeyA": nd = "LEFT";  break;
          case "ArrowRight": case "KeyD": nd = "RIGHT"; break;
          default: return;
        }
        if (nd !== OPP[this.dir]) this.nextDir = nd;
      });

      let tx = 0, ty = 0;
      this.cvs.addEventListener("touchstart", (e) => {
        e.preventDefault();
        tx = e.touches[0].clientX;
        ty = e.touches[0].clientY;
      }, { passive: false });

      this.cvs.addEventListener("touchend", (e) => {
        e.preventDefault();
        const dx = e.changedTouches[0].clientX - tx;
        const dy = e.changedTouches[0].clientY - ty;
        const ax = Math.abs(dx), ay = Math.abs(dy);

        if (this.state === STATE.MENU || this.state === STATE.OVER) {
          this._start(); return;
        }
        if (ax < 15 && ay < 15) {
          if (this.state === STATE.PLAY) this.state = STATE.PAUSE;
          else if (this.state === STATE.PAUSE) this.state = STATE.PLAY;
          return;
        }
        if (this.state !== STATE.PLAY) return;
        let nd;
        if (ax > ay) nd = dx > 0 ? "RIGHT" : "LEFT";
        else nd = dy > 0 ? "DOWN" : "UP";
        if (nd !== OPP[this.dir]) this.nextDir = nd;
      }, { passive: false });
    }

    // ── Game state ──────────────────────
    _start() {
      this.snake = [];
      for (let i = 0; i < 4; i++) this.snake.push({ x: 6 - i, y: Math.floor(ROWS / 2) });
      this.dir = "RIGHT";
      this.nextDir = "RIGHT";
      this.score = 0;
      this.apples = 0;
      this.level = 1;
      this.tickMs = 1000 / BASE_SPEED;
      this.particles = [];
      this.floats = [];
      this._spawnFood();
      this.state = STATE.PLAY;
      this.lastTick = performance.now();
    }

    _spawnFood() {
      const occupied = new Set(this.snake.map(s => `${s.x},${s.y}`));
      let fx, fy;
      do {
        fx = randInt(0, COLS - 1);
        fy = randInt(0, ROWS - 1);
      } while (occupied.has(`${fx},${fy}`));
      this.food = { x: fx, y: fy };
    }

    _tick() {
      this.dir = this.nextDir;
      const d = DIR[this.dir];
      const head = this.snake[0];
      const nh = { x: head.x + d.x, y: head.y + d.y };

      if (nh.x < 0 || nh.x >= COLS || nh.y < 0 || nh.y >= ROWS) {
        this._gameOver(); return;
      }
      for (let i = 0; i < this.snake.length; i++) {
        if (this.snake[i].x === nh.x && this.snake[i].y === nh.y) {
          this._gameOver(); return;
        }
      }

      this.snake.unshift(nh);

      if (nh.x === this.food.x && nh.y === this.food.y) {
        this.apples++;
        const pts = PTS * this.level;
        this.score += pts;

        const cx = this.food.x * this.cell + this.cell / 2;
        const cy = this.food.y * this.cell + this.cell / 2;
        this.floats.push(new FloatText(cx, cy, `+${pts}`, PAL.accent));

        const colors = [PAL.food, PAL.foodHi, PAL.accent, "#ffcc00", "#ff66aa"];
        for (let i = 0; i < 14; i++) {
          this.particles.push(new Particle(cx, cy, colors[i % colors.length]));
        }

        if (this.apples % PER_LEVEL === 0) {
          this.level++;
          const speed = Math.min(BASE_SPEED + SPEED_INC * (this.level - 1), MAX_SPEED);
          this.tickMs = 1000 / speed;
          this.floats.push(new FloatText(
            this.cvs.width / 2,
            this.cvs.height / 2,
            `Niveau ${this.level}`,
            "#ffcc00"
          ));
        }

        this._spawnFood();
      } else {
        this.snake.pop();
      }
    }

    _gameOver() {
      this.state = STATE.OVER;
      this.shakeI = 0.4;
      if (this.score > this.best) {
        this.best = this.score;
        localStorage.setItem("snake_hi", String(this.best));
      }

      const cx = this.cvs.width / 2;
      const cy = this.cvs.height / 2;
      for (let i = 0; i < 30; i++) {
        this.particles.push(new Particle(cx, cy, PAL.food, rand(40, 160), rand(0.5, 1.2), rand(2, 6)));
      }
    }

    // ── Demo snake for menu ─────────────
    _demoSnake() {
      const body = [];
      for (let i = 0; i < 12; i++) body.push({ x: 15 - i, y: 10 });
      return body;
    }

    _updateDemo() {
      const head = this.demoSnake[0];
      const d = DIR[this.demoDir];
      const nx = head.x + d.x;
      const ny = head.y + d.y;

      if (nx <= 1 || nx >= COLS - 2 || ny <= 1 || ny >= ROWS - 2 || Math.random() < 0.08) {
        const dirs = Object.keys(DIR).filter(k => k !== OPP[this.demoDir]);
        const valid = dirs.filter(k => {
          const dd = DIR[k];
          const px = head.x + dd.x;
          const py = head.y + dd.y;
          return px > 0 && px < COLS - 1 && py > 0 && py < ROWS - 1;
        });
        if (valid.length) this.demoDir = valid[randInt(0, valid.length - 1)];
      }

      const dd = DIR[this.demoDir];
      this.demoSnake.unshift({ x: head.x + dd.x, y: head.y + dd.y });
      this.demoSnake.pop();
    }

    // ═══════════════════════════════════════
    //  RENDERING
    // ═══════════════════════════════════════
    _drawBg() {
      const { ctx, cvs } = this;
      ctx.fillStyle = PAL.bg;
      ctx.fillRect(0, 0, cvs.width, cvs.height);
    }

    _drawGrid() {
      const { ctx, cvs, cell } = this;
      ctx.strokeStyle = PAL.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = cell; x < cvs.width; x += cell) {
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, cvs.height);
      }
      for (let y = cell; y < cvs.height; y += cell) {
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(cvs.width, y + 0.5);
      }
      ctx.stroke();
    }

    _drawAmbient(dt) {
      for (const p of this.ambient) {
        p.update(dt);
        p.draw(this.ctx);
      }
    }

    _drawSnakeBody(body, dir, alpha) {
      const { ctx, cell } = this;
      const sr = cell * 0.42;
      const hr = cell * 0.48;

      ctx.save();
      if (alpha != null) ctx.globalAlpha = alpha;

      for (let i = body.length - 1; i >= 0; i--) {
        const seg = body[i];
        const x = seg.x * cell + cell / 2;
        const y = seg.y * cell + cell / 2;

        const t = body.length > 1 ? i / (body.length - 1) : 0;
        const r = Math.round(lerp(0, 0, t));
        const g = Math.round(lerp(255, 68, t));
        const b = Math.round(lerp(136, 34, t));
        const col = `rgb(${r},${g},${b})`;

        if (i < body.length - 1) {
          const nx = body[i + 1].x * cell + cell / 2;
          const ny = body[i + 1].y * cell + cell / 2;
          ctx.fillStyle = col;
          const dx = nx - x, dy = ny - y;
          if (dx !== 0) ctx.fillRect(Math.min(x, nx), y - sr, Math.abs(dx), sr * 2);
          else ctx.fillRect(x - sr, Math.min(y, ny), sr * 2, Math.abs(dy));
        }

        const radius = i === 0 ? hr : sr;
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();

        if (i === 0) {
          ctx.save();
          ctx.shadowColor = PAL.head;
          ctx.shadowBlur = 12;
          ctx.fillStyle = PAL.head;
          ctx.beginPath();
          ctx.arc(x, y, hr, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          const dd = DIR[dir] || DIR.RIGHT;
          const eo = cell * 0.2;
          const er = cell * 0.1;
          const pr = cell * 0.055;
          const px = -dd.y, py = dd.x;

          for (const s of [-1, 1]) {
            const ex = x + px * eo * s + dd.x * cell * 0.15;
            const ey = y + py * eo * s + dd.y * cell * 0.15;
            ctx.fillStyle = PAL.eye;
            ctx.beginPath();
            ctx.arc(ex, ey, er, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = PAL.pupil;
            ctx.beginPath();
            ctx.arc(ex + dd.x * pr, ey + dd.y * pr, pr, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      ctx.restore();
    }

    _drawFood() {
      const { ctx, food, cell, foodT } = this;
      const x = food.x * cell + cell / 2;
      const y = food.y * cell + cell / 2;
      const base = cell * 0.35;
      const pulse = Math.sin(foodT * 4) * 0.12 + 1;
      const r = base * pulse;

      ctx.save();
      ctx.shadowColor = PAL.food;
      ctx.shadowBlur = 18;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, PAL.foodHi);
      grad.addColorStop(1, PAL.food);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(x - r * 0.25, y - r * 0.3, r * 0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    _drawParticles(dt) {
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.update(dt);
        p.draw(this.ctx);
        if (p.dead) this.particles.splice(i, 1);
      }
      for (let i = this.floats.length - 1; i >= 0; i--) {
        const f = this.floats[i];
        f.update(dt);
        f.draw(this.ctx, this.cell);
        if (f.dead) this.floats.splice(i, 1);
      }
    }

    _drawHud() {
      const { ctx, cvs, cell } = this;
      const fs = Math.max(12, Math.round(cell * 0.6));

      ctx.save();
      ctx.font = `600 ${fs}px system-ui, sans-serif`;

      ctx.textAlign = "left";
      ctx.fillStyle = PAL.dim;
      ctx.fillText("SCORE", cell * 0.5, cell * 0.9);
      ctx.fillStyle = PAL.text;
      ctx.font = `700 ${Math.round(fs * 1.3)}px system-ui, sans-serif`;
      ctx.fillText(String(this.score), cell * 0.5, cell * 0.9 + fs * 1.3);

      ctx.font = `600 ${fs}px system-ui, sans-serif`;
      ctx.textAlign = "right";
      ctx.fillStyle = PAL.dim;
      ctx.fillText("MEILLEUR", cvs.width - cell * 0.5, cell * 0.9);
      ctx.fillStyle = PAL.text;
      ctx.font = `700 ${Math.round(fs * 1.3)}px system-ui, sans-serif`;
      ctx.fillText(String(this.best), cvs.width - cell * 0.5, cell * 0.9 + fs * 1.3);

      ctx.textAlign = "center";
      ctx.font = `600 ${fs}px system-ui, sans-serif`;
      ctx.fillStyle = PAL.accent;
      ctx.fillText(`NIVEAU ${this.level}`, cvs.width / 2, cell * 0.9);

      ctx.restore();
    }

    _drawOverlay(title, lines) {
      const { ctx, cvs, cell } = this;
      ctx.save();
      ctx.fillStyle = PAL.overlay;
      ctx.fillRect(0, 0, cvs.width, cvs.height);

      const cx = cvs.width / 2;
      const cy = cvs.height / 2;
      const titleFs = Math.max(24, Math.round(cell * 2));

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      ctx.font = `800 ${titleFs}px system-ui, sans-serif`;
      ctx.fillStyle = PAL.accent;
      ctx.shadowColor = PAL.accent;
      ctx.shadowBlur = 20;
      ctx.fillText(title, cx, cy - titleFs * 1.2);
      ctx.shadowBlur = 0;

      const lineFs = Math.max(13, Math.round(cell * 0.65));
      ctx.font = `500 ${lineFs}px system-ui, sans-serif`;

      lines.forEach((line, i) => {
        ctx.fillStyle = line.color || PAL.dim;
        ctx.fillText(line.text, cx, cy - titleFs * 0.2 + i * lineFs * 1.6);
      });

      ctx.restore();
    }

    _drawMenu(t) {
      this._drawSnakeBody(this.demoSnake, this.demoDir, 0.15);

      const blink = Math.sin(t * 3) > -0.3;
      const lines = [];
      if (this.best > 0) lines.push({ text: `Meilleur : ${this.best}`, color: PAL.accent });
      lines.push({ text: "" });
      if (blink) lines.push({ text: "Appuyez sur ESPACE pour jouer", color: PAL.text });
      else lines.push({ text: "" });
      lines.push({ text: "Fl\u00e8ches / WASD pour diriger", color: PAL.dim });
      this._drawOverlay("SNAKE", lines);
    }

    _drawPause() {
      this._drawOverlay("PAUSE", [
        { text: "Appuyez sur P pour reprendre", color: PAL.text },
      ]);
    }

    _drawGameOver() {
      this._drawOverlay("GAME OVER", [
        { text: `Score : ${this.score}`, color: PAL.text },
        { text: `Niveau : ${this.level}`, color: PAL.dim },
        ...(this.score >= this.best && this.score > 0
          ? [{ text: "Nouveau record !", color: "#ffcc00" }]
          : []),
        { text: "" },
        { text: "ESPACE pour rejouer", color: PAL.text },
      ]);
    }

    // ═══════════════════════════════════════
    //  GAME LOOP
    // ═══════════════════════════════════════
    start() {
      this.lastFrame = performance.now();
      this.lastTick = this.lastFrame;
      const loop = (now) => {
        const dt = Math.min((now - this.lastFrame) / 1000, 0.1);
        this.lastFrame = now;
        this.foodT += dt;
        this.menuT += dt;

        if (this.shakeI > 0) {
          this.shakeI -= dt;
          this.shakeX = rand(-4, 4) * (this.shakeI / 0.4);
          this.shakeY = rand(-4, 4) * (this.shakeI / 0.4);
        } else {
          this.shakeX = 0;
          this.shakeY = 0;
        }

        if (this.state === STATE.PLAY) {
          if (now - this.lastTick >= this.tickMs) {
            this._tick();
            this.lastTick = now;
          }
        }

        if (this.state === STATE.MENU) {
          this.demoTick += dt;
          if (this.demoTick > 0.12) {
            this._updateDemo();
            this.demoTick = 0;
          }
        }

        const { ctx, cvs } = this;
        ctx.save();
        ctx.translate(this.shakeX, this.shakeY);

        this._drawBg();
        this._drawGrid();
        this._drawAmbient(dt);

        if (this.state === STATE.MENU) {
          this._drawMenu(this.menuT);
        } else {
          this._drawSnakeBody(this.snake, this.dir, this.state === STATE.OVER ? 0.5 : null);
          if (this.state !== STATE.OVER) this._drawFood();
          this._drawParticles(dt);
          this._drawHud();
          if (this.state === STATE.PAUSE) this._drawPause();
          if (this.state === STATE.OVER) this._drawGameOver();
        }

        ctx.restore();
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }
  }

  // ═══════════════════════════════════════
  //  INIT
  // ═══════════════════════════════════════
  window.addEventListener("DOMContentLoaded", () => {
    new Game().start();
  });
})();
