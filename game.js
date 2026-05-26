(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");

  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlayTitle");
  const overlayText = document.getElementById("overlayText");
  const startBtn = document.getElementById("startBtn");

  // ===== Util =====
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random() * (b - a);

  // ===== Config =====
  const W = canvas.width;
  const H = canvas.height;

  const groundY = Math.floor(H * 0.78);
  const gravity = 2400;       // px/s^2
  const jumpVel = 860;        // px/s
  const maxFall = 1400;

  // ===== State =====
  const state = {
    running: false,
    gameOver: false,
    t: 0,
    score: 0,
    best: Number(localStorage.getItem("runner_best") || 0),
    speed: 420,          // base speed
    speedInc: 7.5,       // speed increase per second
    spawnTimer: 0,
    spawnEvery: 1.15,    // seconds (will be varied)
  };

  bestEl.textContent = String(state.best);

  // ===== Entities =====
  const player = {
    x: 120,
    y: groundY - 46,
    w: 40,
    h: 46,
    vy: 0,
    onGround: true,
    color: "#e9ecf5",
  };

  let obstacles = [];
  let particles = [];

  function reset() {
    state.running = false;
    state.gameOver = false;
    state.t = 0;
    state.score = 0;
    state.speed = 420;
    state.spawnTimer = 0;
    state.spawnEvery = 1.05;

    player.y = groundY - player.h;
    player.vy = 0;
    player.onGround = true;

    obstacles = [];
    particles = [];

    scoreEl.textContent = "0";
  }

  function showOverlay(title, text, btnText = "Jogar") {
    overlayTitle.textContent = title;
    overlayText.textContent = text;
    startBtn.textContent = btnText;
    overlay.style.display = "grid";
  }

  function hideOverlay() {
    overlay.style.display = "none";
  }

  // ===== Input =====
  function jump() {
    if (!state.running || state.gameOver) return;
    if (player.onGround) {
      player.vy = -jumpVel;
      player.onGround = false;
      burst(player.x + player.w * 0.2, groundY - 2, 16);
    }
  }

  function start() {
    if (state.running && !state.gameOver) return;
    reset();
    state.running = true;
    hideOverlay();
  }

  function restart() {
    reset();
    state.running = true;
    hideOverlay();
  }

  window.addEventListener("keydown", (e) => {
    if (e.code === "Space" || e.code === "ArrowUp") {
      e.preventDefault();
      if (!state.running) start();
      else if (state.gameOver) restart();
      else jump();
    }
    if (e.code === "KeyR") {
      if (!state.running) start();
      else restart();
    }
  });

  canvas.addEventListener("pointerdown", () => {
    if (!state.running) start();
    else if (state.gameOver) restart();
    else jump();
  });

  startBtn.addEventListener("click", () => {
    if (!state.running) start();
    else if (state.gameOver) restart();
  });

  // ===== Particles =====
  function burst(x, y, n) {
    for (let i = 0; i < n; i++) {
      particles.push({
        x, y,
        vx: rand(-140, 120),
        vy: rand(-260, -40),
        life: rand(0.25, 0.55),
        r: rand(1.5, 3.2),
      });
    }
  }

  // ===== Obstacles =====
  function spawnObstacle() {
    const type = Math.random() < 0.25 ? "tall" : "small";
    const w = type === "tall" ? rand(28, 34) : rand(22, 30);
    const h = type === "tall" ? rand(60, 84) : rand(32, 48);

    obstacles.push({
      x: W + 20,
      y: groundY - h,
      w, h,
      type,
    });

    // vary spawn interval
    state.spawnEvery = clamp(rand(0.75, 1.25) - state.score / 2400, 0.48, 1.15);
  }

  function aabb(a, b) {
    return (
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y
    );
  }

  // ===== Render =====
  function drawBackground() {
    // stars
    ctx.save();
    ctx.globalAlpha = 0.55;
    for (let i = 0; i < 30; i++) {
      const sx = (i * 97 + Math.floor(state.t * 60)) % W;
      const sy = (i * 53) % Math.floor(H * 0.55);
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.fillRect(sx, sy, 2, 2);
    }
    ctx.restore();

    // ground
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(0, groundY, W, H - groundY);

    // ground line
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.beginPath();
    ctx.moveTo(0, groundY + 0.5);
    ctx.lineTo(W, groundY + 0.5);
    ctx.stroke();

    // moving stripes
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "#7c5cff";
    const stripeW = 46;
    const gap = 32;
    const off = (state.t * state.speed * 0.35) % (stripeW + gap);
    for (let x = -off; x < W + stripeW; x += stripeW + gap) {
      ctx.fillRect(x, groundY + 24, stripeW, 6);
    }
    ctx.restore();
  }

  function drawPlayer() {
    // body
    ctx.fillStyle = player.color;
    roundRect(player.x, player.y, player.w, player.h, 10);
    ctx.fill();

    // visor
    ctx.fillStyle = "rgba(11,16,32,0.75)";
    roundRect(player.x + 9, player.y + 10, player.w - 18, 12, 8);
    ctx.fill();

    // shadow
    const shW = clamp(52 - Math.abs(player.vy) * 0.02, 26, 52);
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.ellipse(player.x + player.w / 2, groundY + 18, shW / 2, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawObstacles() {
    for (const o of obstacles) {
      ctx.fillStyle = o.type === "tall" ? "rgba(255,77,109,0.92)" : "rgba(255,255,255,0.85)";
      roundRect(o.x, o.y, o.w, o.h, 10);
      ctx.fill();

      ctx.save();
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = "#000";
      ctx.fillRect(o.x + 4, o.y + 6, o.w - 8, 6);
      ctx.restore();
    }
  }

  function drawParticles(dt) {
    for (const p of particles) {
      ctx.save();
      ctx.globalAlpha = clamp(p.life / 0.55, 0, 1) * 0.6;
      ctx.fillStyle = "rgba(124,92,255,0.95)";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // ===== Loop =====
  let last = performance.now();
  function loop(now) {
    const dt = clamp((now - last) / 1000, 0, 0.033);
    last = now;

    update(dt);
    render(dt);

    requestAnimationFrame(loop);
  }

  function update(dt) {
    if (!state.running) return;

    state.t += dt;

    if (!state.gameOver) {
      state.speed += state.speedInc * dt;

      // score
      state.score += Math.floor(dt * 100);
      scoreEl.textContent = String(state.score);

      // spawn
      state.spawnTimer += dt;
      if (state.spawnTimer >= state.spawnEvery) {
        state.spawnTimer = 0;
        spawnObstacle();
      }

      // player physics
      player.vy += gravity * dt;
      player.vy = Math.min(player.vy, maxFall);
      player.y += player.vy * dt;

      if (player.y + player.h >= groundY) {
        player.y = groundY - player.h;
        player.vy = 0;
        player.onGround = true;
      }

      // obstacles move + collisions
      const speed = state.speed;
      for (const o of obstacles) {
        o.x -= speed * dt;
      }
      obstacles = obstacles.filter(o => o.x + o.w > -40);

      for (const o of obstacles) {
        if (aabb(player, o)) {
          gameOver();
          break;
        }
      }
    }

    // particles
    for (const p of particles) {
      p.life -= dt;
      p.vy += 900 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    particles = particles.filter(p => p.life > 0);
  }

  function gameOver() {
    state.gameOver = true;
    state.running = true; // still render
    burst(player.x + player.w / 2, player.y + player.h / 2, 40);

    if (state.score > state.best) {
      state.best = state.score;
      localStorage.setItem("runner_best", String(state.best));
      bestEl.textContent = String(state.best);
    }

    showOverlay("Game Over", `Pontos: ${state.score} • Clique/Espaço para jogar de novo.`, "Jogar de novo");
  }

  function render(dt) {
    ctx.clearRect(0, 0, W, H);

    drawBackground();
    drawObstacles();
    drawPlayer();
    drawParticles(dt);

    // subtle vignette
    ctx.save();
    const g = ctx.createRadialGradient(W/2, H/2, 50, W/2, H/2, 520);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0.35)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // init
  showOverlay("Runner", "Clique ou aperte Espaço para começar.", "Jogar");
  requestAnimationFrame(loop);
})();
