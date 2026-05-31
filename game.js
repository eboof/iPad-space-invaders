const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const levelEl = document.getElementById('level');
const bestScoreEl = document.getElementById('bestScore');
const overlay = document.getElementById('overlay');
const leftButton = document.getElementById('leftButton');
const rightButton = document.getElementById('rightButton');
const fireButton = document.getElementById('fireButton');

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const STORAGE_KEY = 'ipad-space-invaders-best-score';
const SOUND_KEY = 'ipad-space-invaders-sound-enabled';

const state = {
  running: false,
  score: 0,
  lives: 3,
  level: 1,
  bestScore: Number(localStorage.getItem(STORAGE_KEY) || 0),
  soundEnabled: localStorage.getItem(SOUND_KEY) !== 'off',
  moveLeft: false,
  moveRight: false,
  player: null,
  bullets: [],
  enemyBullets: [],
  enemies: [],
  stars: [],
  particles: [],
  shields: [],
  enemyDirection: 1,
  enemySpeed: 0.45,
  lastTime: 0,
  lastShotAt: 0,
  lastEnemyShotAt: 0,
  audioContext: null
};

function resetStars() {
  state.stars = Array.from({ length: 80 }, () => ({
    x: Math.random() * WIDTH,
    y: Math.random() * HEIGHT,
    r: Math.random() * 2 + 1,
    s: Math.random() * 0.9 + 0.25
  }));
}

function createPlayer() {
  return {
    x: WIDTH / 2 - 35,
    y: HEIGHT - 100,
    width: 70,
    height: 34,
    speed: 7
  };
}

function createEnemies(level) {
  const rows = Math.min(4 + Math.floor(level / 2), 6);
  const cols = 7;
  const enemies = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      enemies.push({
        x: 90 + col * 100,
        y: 120 + row * 84,
        width: 54,
        height: 36,
        alive: true,
        points: (rows - row) * 10
      });
    }
  }
  return enemies;
}

function createShields() {
  return [
    { x: 120, y: 920, width: 130, height: 40, hp: 7 },
    { x: 385, y: 920, width: 130, height: 40, hp: 7 },
    { x: 650, y: 920, width: 130, height: 40, hp: 7 }
  ];
}

function resetGame(fullReset = true) {
  ensureAudio();
  state.running = true;
  if (fullReset) {
    state.score = 0;
    state.lives = 3;
    state.level = 1;
  }
  state.player = createPlayer();
  state.bullets = [];
  state.enemyBullets = [];
  state.particles = [];
  state.shields = createShields();
  state.enemies = createEnemies(state.level);
  state.enemyDirection = 1;
  state.enemySpeed = 0.45 + state.level * 0.12;
  state.lastShotAt = 0;
  state.lastEnemyShotAt = 0;
  overlay.classList.add('hidden');
  syncHud();
}

function syncHud() {
  scoreEl.textContent = state.score;
  livesEl.textContent = state.lives;
  levelEl.textContent = state.level;
  bestScoreEl.textContent = state.bestScore;
}

function updateBestScore() {
  if (state.score > state.bestScore) {
    state.bestScore = state.score;
    localStorage.setItem(STORAGE_KEY, String(state.bestScore));
    syncHud();
  }
}

function ensureAudio() {
  if (!state.soundEnabled || state.audioContext) return;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;
  state.audioContext = new AudioCtx();
}

function playTone({ frequency = 440, type = 'square', duration = 0.08, gain = 0.03, slideTo = null }) {
  if (!state.soundEnabled) return;
  ensureAudio();
  if (!state.audioContext) return;

  if (state.audioContext.state === 'suspended') {
    state.audioContext.resume().catch(() => {});
  }

  const now = state.audioContext.currentTime;
  const osc = state.audioContext.createOscillator();
  const amp = state.audioContext.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, now);
  if (slideTo) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(slideTo, 40), now + duration);
  }

  amp.gain.setValueAtTime(gain, now);
  amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(amp);
  amp.connect(state.audioContext.destination);
  osc.start(now);
  osc.stop(now + duration);
}

function toggleSound() {
  state.soundEnabled = !state.soundEnabled;
  localStorage.setItem(SOUND_KEY, state.soundEnabled ? 'on' : 'off');
  renderOverlay(getOverlayTitle(), getOverlayMessage(), state.running ? 'Resume' : 'Start Game');
}

function getOverlayTitle() {
  return state.running ? 'Paused' : 'iPad Space Invaders';
}

function getOverlayMessage() {
  return state.running
    ? 'Tap resume when you are ready.'
    : 'Tap Start. Drag left/right to move. Tap Fire to shoot. Add to Home Screen for full-screen play.';
}

function renderOverlay(title, message, buttonText) {
  overlay.innerHTML = `
    <h1>${title}</h1>
    <p>${message}</p>
    <div class="overlay-actions">
      <button id="startButton">${buttonText}</button>
      <button id="soundButton" class="secondary-button">Sound: ${state.soundEnabled ? 'On' : 'Off'}</button>
    </div>
  `;

  document.getElementById('startButton').addEventListener('click', () => resetGame(!state.running));
  document.getElementById('soundButton').addEventListener('click', toggleSound);
}

function showOverlay(title, message, buttonText = 'Play Again') {
  renderOverlay(title, message, buttonText);
  overlay.classList.remove('hidden');
}

function nextLevel() {
  state.level += 1;
  state.player = createPlayer();
  state.bullets = [];
  state.enemyBullets = [];
  state.particles = [];
  state.shields = createShields();
  state.enemies = createEnemies(state.level);
  state.enemyDirection = 1;
  state.enemySpeed = 0.45 + state.level * 0.12;
  syncHud();
  playTone({ frequency: 520, type: 'triangle', duration: 0.12, gain: 0.04, slideTo: 820 });
}

function firePlayerBullet(now) {
  if (!state.running || now - state.lastShotAt < 260) return;
  state.lastShotAt = now;
  state.bullets.push({
    x: state.player.x + state.player.width / 2 - 3,
    y: state.player.y - 12,
    width: 6,
    height: 20,
    speed: 11,
    kind: 'player'
  });
  playTone({ frequency: 760, duration: 0.07, gain: 0.025, slideTo: 420 });
}

function fireEnemyBullet(now) {
  if (now - state.lastEnemyShotAt < Math.max(500, 1300 - state.level * 60)) return;
  const shooters = state.enemies.filter((enemy) => enemy.alive);
  if (!shooters.length) return;
  state.lastEnemyShotAt = now;
  const shooter = shooters[Math.floor(Math.random() * shooters.length)];
  state.enemyBullets.push({
    x: shooter.x + shooter.width / 2 - 4,
    y: shooter.y + shooter.height,
    width: 8,
    height: 22,
    speed: 6 + state.level * 0.35,
    kind: 'enemy'
  });
}

function spawnBurst(x, y, color) {
  for (let i = 0; i < 14; i += 1) {
    state.particles.push({
      x,
      y,
      dx: (Math.random() - 0.5) * 7,
      dy: (Math.random() - 0.5) * 7,
      life: 28 + Math.random() * 12,
      color,
      size: Math.random() * 5 + 2
    });
  }
}

function hitShield(bullet) {
  for (const shield of state.shields) {
    if (shield.hp > 0 && overlaps(bullet, shield)) {
      shield.hp -= bullet.kind === 'enemy' ? 2 : 1;
      bullet.y = bullet.kind === 'player' ? -100 : HEIGHT + 100;
      spawnBurst(bullet.x, bullet.y, '#2ce8f5');
      playTone({ frequency: 180, type: 'sawtooth', duration: 0.05, gain: 0.018, slideTo: 120 });
      return true;
    }
  }
  return false;
}

function update(delta, now) {
  if (!state.running) return;

  if (state.moveLeft) state.player.x -= state.player.speed;
  if (state.moveRight) state.player.x += state.player.speed;
  state.player.x = Math.max(20, Math.min(WIDTH - state.player.width - 20, state.player.x));

  for (const star of state.stars) {
    star.y += star.s;
    if (star.y > HEIGHT) {
      star.y = 0;
      star.x = Math.random() * WIDTH;
    }
  }

  for (const particle of state.particles) {
    particle.x += particle.dx;
    particle.y += particle.dy;
    particle.life -= 1;
    particle.dy += 0.02;
  }
  state.particles = state.particles.filter((particle) => particle.life > 0);

  for (const bullet of state.bullets) bullet.y -= bullet.speed;
  for (const bullet of state.enemyBullets) bullet.y += bullet.speed;
  state.bullets = state.bullets.filter((bullet) => bullet.y + bullet.height > 0);
  state.enemyBullets = state.enemyBullets.filter((bullet) => bullet.y < HEIGHT + 20);

  let hitEdge = false;
  const liveEnemies = state.enemies.filter((enemy) => enemy.alive);
  for (const enemy of liveEnemies) {
    enemy.x += state.enemyDirection * state.enemySpeed * delta * 0.06;
    if (enemy.x <= 28 || enemy.x + enemy.width >= WIDTH - 28) hitEdge = true;
  }

  if (hitEdge) {
    state.enemyDirection *= -1;
    for (const enemy of liveEnemies) {
      enemy.y += 26;
      if (enemy.y + enemy.height >= state.player.y - 10) {
        endGame('Game Over', 'The invaders reached your line.');
        return;
      }
    }
  }

  for (const bullet of state.bullets) {
    if (hitShield(bullet)) continue;
    for (const enemy of liveEnemies) {
      if (enemy.alive && overlaps(bullet, enemy)) {
        enemy.alive = false;
        bullet.y = -100;
        state.score += enemy.points;
        updateBestScore();
        syncHud();
        spawnBurst(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, '#ff8cf7');
        playTone({ frequency: 260, duration: 0.09, gain: 0.03, slideTo: 120 });
        break;
      }
    }
  }

  for (const bullet of state.enemyBullets) {
    if (hitShield(bullet)) continue;
    if (overlaps(bullet, state.player)) {
      bullet.y = HEIGHT + 100;
      state.lives -= 1;
      syncHud();
      spawnBurst(state.player.x + state.player.width / 2, state.player.y, '#ff6b6b');
      playTone({ frequency: 140, type: 'sawtooth', duration: 0.18, gain: 0.035, slideTo: 70 });
      if (state.lives <= 0) {
        endGame('Game Over', `Final score: ${state.score}`);
        return;
      }
      state.player = createPlayer();
    }
  }

  if (!state.enemies.some((enemy) => enemy.alive)) {
    nextLevel();
    return;
  }

  fireEnemyBullet(now);
}

function endGame(title, message) {
  state.running = false;
  updateBestScore();
  showOverlay(title, message, 'Restart');
}

function overlaps(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function draw() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = '#030712';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  for (const star of state.stars) {
    ctx.fillStyle = '#b6efff';
    ctx.globalAlpha = 0.35 + star.r * 0.2;
    ctx.fillRect(star.x, star.y, star.r, star.r);
  }
  ctx.globalAlpha = 1;

  ctx.strokeStyle = '#123052';
  ctx.lineWidth = 2;
  for (let y = 120; y < HEIGHT; y += 120) {
    ctx.beginPath();
    ctx.moveTo(20, y);
    ctx.lineTo(WIDTH - 20, y);
    ctx.stroke();
  }

  drawShields();
  drawPlayer();
  drawEnemies();
  drawBullets();
  drawParticles();
}

function drawPlayer() {
  const p = state.player;
  if (!p) return;
  ctx.fillStyle = '#7eff8a';
  ctx.fillRect(p.x + 12, p.y, p.width - 24, 16);
  ctx.fillRect(p.x, p.y + 16, p.width, 12);
  ctx.fillRect(p.x + 10, p.y + 28, 12, 6);
  ctx.fillRect(p.x + p.width - 22, p.y + 28, 12, 6);
}

function drawEnemies() {
  for (const enemy of state.enemies) {
    if (!enemy.alive) continue;
    ctx.fillStyle = '#ff8cf7';
    ctx.fillRect(enemy.x + 10, enemy.y, enemy.width - 20, 10);
    ctx.fillRect(enemy.x, enemy.y + 10, enemy.width, 12);
    ctx.fillRect(enemy.x + 8, enemy.y + 22, enemy.width - 16, 8);
    ctx.fillRect(enemy.x + 6, enemy.y + 30, 10, 6);
    ctx.fillRect(enemy.x + enemy.width - 16, enemy.y + 30, 10, 6);
  }
}

function drawShields() {
  for (const shield of state.shields) {
    if (shield.hp <= 0) continue;
    const alpha = Math.max(0.28, shield.hp / 7);
    ctx.fillStyle = `rgba(44, 232, 245, ${alpha})`;
    ctx.fillRect(shield.x, shield.y, shield.width, shield.height);
    ctx.clearRect(shield.x + 40, shield.y + 22, 18, 18);
    ctx.clearRect(shield.x + shield.width - 58, shield.y + 22, 18, 18);
  }
}

function drawBullets() {
  ctx.fillStyle = '#2ce8f5';
  for (const bullet of state.bullets) ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
  ctx.fillStyle = '#ff6b6b';
  for (const bullet of state.enemyBullets) ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
}

function drawParticles() {
  for (const particle of state.particles) {
    ctx.globalAlpha = Math.max(0, particle.life / 40);
    ctx.fillStyle = particle.color;
    ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
  }
  ctx.globalAlpha = 1;
}

function loop(timestamp) {
  const delta = Math.min(32, timestamp - state.lastTime || 16);
  state.lastTime = timestamp;
  update(delta, timestamp);
  draw();
  requestAnimationFrame(loop);
}

function bindHold(button, onStart, onEnd = onStart) {
  button.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    ensureAudio();
    onStart(true);
  });
  const clear = () => onEnd(false);
  button.addEventListener('pointerup', clear);
  button.addEventListener('pointercancel', clear);
  button.addEventListener('pointerleave', clear);
}

bindHold(leftButton, (value) => {
  state.moveLeft = value;
  if (value) state.moveRight = false;
}, () => {
  state.moveLeft = false;
});

bindHold(rightButton, (value) => {
  state.moveRight = value;
  if (value) state.moveLeft = false;
}, () => {
  state.moveRight = false;
});

fireButton.addEventListener('pointerdown', (event) => {
  event.preventDefault();
  ensureAudio();
  firePlayerBullet(performance.now());
});

window.addEventListener('keydown', (event) => {
  ensureAudio();
  if (event.key === 'ArrowLeft') state.moveLeft = true;
  if (event.key === 'ArrowRight') state.moveRight = true;
  if (event.key === ' ' || event.code === 'Space') {
    event.preventDefault();
    firePlayerBullet(performance.now());
  }
  if (event.key === 'Enter' && !state.running) resetGame(true);
});

window.addEventListener('keyup', (event) => {
  if (event.key === 'ArrowLeft') state.moveLeft = false;
  if (event.key === 'ArrowRight') state.moveRight = false;
});

let dragActive = false;
canvas.addEventListener('pointerdown', (event) => {
  ensureAudio();
  dragActive = true;
  movePlayerToPointer(event);
});
canvas.addEventListener('pointermove', (event) => {
  if (dragActive) movePlayerToPointer(event);
});
canvas.addEventListener('pointerup', () => { dragActive = false; });
canvas.addEventListener('pointercancel', () => { dragActive = false; });
canvas.addEventListener('click', () => firePlayerBullet(performance.now()));

function movePlayerToPointer(event) {
  if (!state.player) return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = WIDTH / rect.width;
  const x = (event.clientX - rect.left) * scaleX;
  state.player.x = Math.max(20, Math.min(WIDTH - state.player.width - 20, x - state.player.width / 2));
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

resetStars();
state.player = createPlayer();
syncHud();
renderOverlay(getOverlayTitle(), getOverlayMessage(), 'Start Game');
draw();
requestAnimationFrame(loop);
