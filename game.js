const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const levelEl = document.getElementById('level');
const overlay = document.getElementById('overlay');
const startButton = document.getElementById('startButton');
const leftButton = document.getElementById('leftButton');
const rightButton = document.getElementById('rightButton');
const fireButton = document.getElementById('fireButton');

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

const state = {
  running: false,
  score: 0,
  lives: 3,
  level: 1,
  moveLeft: false,
  moveRight: false,
  player: null,
  bullets: [],
  enemyBullets: [],
  enemies: [],
  stars: [],
  enemyDirection: 1,
  enemySpeed: 0.45,
  lastTime: 0,
  lastShotAt: 0,
  lastEnemyShotAt: 0,
  message: 'Tap Start. Defend the sector.'
};

function resetStars() {
  state.stars = Array.from({ length: 70 }, () => ({
    x: Math.random() * WIDTH,
    y: Math.random() * HEIGHT,
    r: Math.random() * 2 + 1,
    s: Math.random() * 0.7 + 0.2
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

function resetGame(fullReset = true) {
  state.running = true;
  if (fullReset) {
    state.score = 0;
    state.lives = 3;
    state.level = 1;
  }
  state.player = createPlayer();
  state.bullets = [];
  state.enemyBullets = [];
  state.enemies = createEnemies(state.level);
  state.enemyDirection = 1;
  state.enemySpeed = 0.45 + state.level * 0.12;
  state.lastShotAt = 0;
  state.lastEnemyShotAt = 0;
  state.message = '';
  overlay.classList.add('hidden');
  syncHud();
}

function syncHud() {
  scoreEl.textContent = state.score;
  livesEl.textContent = state.lives;
  levelEl.textContent = state.level;
}

function showOverlay(title, message, buttonText = 'Play Again') {
  overlay.innerHTML = `
    <h1>${title}</h1>
    <p>${message}</p>
    <button id="startButton">${buttonText}</button>
  `;
  overlay.classList.remove('hidden');
  document.getElementById('startButton').addEventListener('click', () => resetGame(true));
}

function nextLevel() {
  state.level += 1;
  state.player = createPlayer();
  state.bullets = [];
  state.enemyBullets = [];
  state.enemies = createEnemies(state.level);
  state.enemyDirection = 1;
  state.enemySpeed = 0.45 + state.level * 0.12;
  syncHud();
}

function firePlayerBullet(now) {
  if (!state.running || now - state.lastShotAt < 260) return;
  state.lastShotAt = now;
  state.bullets.push({
    x: state.player.x + state.player.width / 2 - 3,
    y: state.player.y - 12,
    width: 6,
    height: 20,
    speed: 11
  });
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
    speed: 6 + state.level * 0.35
  });
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
    for (const enemy of liveEnemies) {
      if (enemy.alive && overlaps(bullet, enemy)) {
        enemy.alive = false;
        bullet.y = -100;
        state.score += enemy.points;
        syncHud();
        break;
      }
    }
  }

  for (const bullet of state.enemyBullets) {
    if (overlaps(bullet, state.player)) {
      bullet.y = HEIGHT + 100;
      state.lives -= 1;
      syncHud();
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
    ctx.globalAlpha = 0.4 + star.r * 0.2;
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

  drawPlayer();
  drawEnemies();
  drawBullets();
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

function drawBullets() {
  ctx.fillStyle = '#2ce8f5';
  for (const bullet of state.bullets) ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
  ctx.fillStyle = '#ff6b6b';
  for (const bullet of state.enemyBullets) ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
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
    onStart(true);
  });
  const clear = () => onEnd(false);
  button.addEventListener('pointerup', clear);
  button.addEventListener('pointercancel', clear);
  button.addEventListener('pointerleave', clear);
}

startButton.addEventListener('click', () => resetGame(true));

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
  firePlayerBullet(performance.now());
});

window.addEventListener('keydown', (event) => {
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

resetStars();
state.player = createPlayer();
syncHud();
draw();
requestAnimationFrame(loop);
