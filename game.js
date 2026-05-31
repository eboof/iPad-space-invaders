const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const levelEl = document.getElementById('level');
const bestScoreEl = document.getElementById('bestScore');
const waveTypeEl = document.getElementById('waveType');
const overlay = document.getElementById('overlay');
const leftButton = document.getElementById('leftButton');
const rightButton = document.getElementById('rightButton');
const fireButton = document.getElementById('fireButton');
const pauseButton = document.getElementById('pauseButton');
const muteButton = document.getElementById('muteButton');
const bossBarWrap = document.getElementById('bossBarWrap');
const bossBarFill = document.getElementById('bossBarFill');

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const STORAGE_KEY = 'ipad-space-invaders-best-score';
const SOUND_KEY = 'ipad-space-invaders-sound-enabled';

const state = {
  phase: 'start',
  score: 0,
  lives: 3,
  level: 1,
  waveName: 'Classic',
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
  boss: null,
  enemyDirection: 1,
  enemySpeed: 0.5,
  bossDirection: 1,
  lastTime: 0,
  lastShotAt: 0,
  lastEnemyShotAt: 0,
  lastMusicAt: 0,
  musicStep: 0,
  audioContext: null,
  floatTime: 0
};

const waveTypes = [
  { name: 'Classic', movement: 'classic' },
  { name: 'Zigzag', movement: 'zigzag' },
  { name: 'Dive', movement: 'dive' },
  { name: 'Boss', movement: 'boss' }
];

function isRunning() {
  return state.phase === 'running';
}

function resetStars() {
  state.stars = Array.from({ length: 90 }, () => ({
    x: Math.random() * WIDTH,
    y: Math.random() * HEIGHT,
    r: Math.random() * 2 + 1,
    s: Math.random() * 1 + 0.25
  }));
}

function createPlayer() {
  return {
    x: WIDTH / 2 - 38,
    y: HEIGHT - 108,
    width: 76,
    height: 38,
    speed: 8,
    flash: 0
  };
}

function createShields() {
  return [
    { x: 110, y: 920, width: 140, height: 42, hp: 8 },
    { x: 380, y: 920, width: 140, height: 42, hp: 8 },
    { x: 650, y: 920, width: 140, height: 42, hp: 8 }
  ];
}

function getWaveForLevel(level) {
  return waveTypes[(level - 1) % waveTypes.length];
}

function createEnemies(level, movement) {
  const rows = Math.min(4 + Math.floor(level / 2), 6);
  const cols = 7;
  const enemies = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      enemies.push({
        baseX: 90 + col * 100,
        x: 90 + col * 100,
        y: 120 + row * 84,
        width: 54,
        height: 36,
        alive: true,
        points: (rows - row) * 10,
        row,
        col,
        movement,
        phase: Math.random() * Math.PI * 2,
        diving: false,
        diveSpeed: 0,
        diveX: 0,
        flash: 0
      });
    }
  }
  return enemies;
}

function createBoss(level) {
  return {
    x: WIDTH / 2 - 120,
    y: 110,
    width: 240,
    height: 110,
    hp: 18 + level * 2,
    maxHp: 18 + level * 2,
    speed: 3 + level * 0.25,
    flash: 0,
    points: 500 + level * 80
  };
}

function setWave() {
  const wave = getWaveForLevel(state.level);
  state.waveName = wave.name;
  state.boss = wave.movement === 'boss' ? createBoss(state.level) : null;
  state.enemies = wave.movement === 'boss' ? [] : createEnemies(state.level, wave.movement);
  state.enemySpeed = 0.55 + state.level * 0.13;
  state.enemyDirection = 1;
  state.bossDirection = 1;
  state.shields = createShields();
  updateBossUi();
}

function resetGame(fullReset = true) {
  ensureAudio();
  if (fullReset) {
    state.score = 0;
    state.lives = 3;
    state.level = 1;
  }
  state.phase = 'running';
  state.player = createPlayer();
  state.bullets = [];
  state.enemyBullets = [];
  state.particles = [];
  state.lastShotAt = 0;
  state.lastEnemyShotAt = 0;
  state.lastMusicAt = 0;
  state.musicStep = 0;
  state.floatTime = 0;
  setWave();
  syncHud();
  overlay.classList.add('hidden');
}

function syncHud() {
  scoreEl.textContent = state.score;
  livesEl.textContent = state.lives;
  levelEl.textContent = state.level;
  bestScoreEl.textContent = state.bestScore;
  waveTypeEl.textContent = state.waveName;
  muteButton.textContent = state.soundEnabled ? '🔊' : '🔈';
  pauseButton.textContent = state.phase === 'paused' ? '▶' : '❚❚';
}

function updateBestScore() {
  if (state.score > state.bestScore) {
    state.bestScore = state.score;
    localStorage.setItem(STORAGE_KEY, String(state.bestScore));
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
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(slideTo, 40), now + duration);
  amp.gain.setValueAtTime(gain, now);
  amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(amp);
  amp.connect(state.audioContext.destination);
  osc.start(now);
  osc.stop(now + duration);
}

function playMusic(now) {
  if (!isRunning() || !state.soundEnabled || now - state.lastMusicAt < 360) return;
  state.lastMusicAt = now;
  const pattern = state.boss ? [220, 247, 196, 165] : [330, 392, 294, 247];
  const note = pattern[state.musicStep % pattern.length];
  const gain = state.boss ? 0.012 : 0.009;
  playTone({ frequency: note, type: 'triangle', duration: 0.18, gain, slideTo: note * 0.98 });
  state.musicStep += 1;
}

function toggleSound() {
  state.soundEnabled = !state.soundEnabled;
  localStorage.setItem(SOUND_KEY, state.soundEnabled ? 'on' : 'off');
  syncHud();
  if (!overlay.classList.contains('hidden')) renderOverlay();
}

function pauseGame() {
  if (state.phase !== 'running') return;
  state.phase = 'paused';
  syncHud();
  renderOverlay();
  overlay.classList.remove('hidden');
}

function resumeGame() {
  if (state.phase !== 'paused') return;
  state.phase = 'running';
  syncHud();
  overlay.classList.add('hidden');
}

function getOverlayConfig() {
  if (state.phase === 'start') {
    return {
      kicker: 'Retro arcade • optimized for iPad',
      title: 'Space Invaders DX',
      body: 'A smoother start screen, pause support, boss waves, richer audio, and a more iPad-native interface are all live. Drag to steer. Tap fire. Survive the invasion.',
      primary: 'Start Game',
      secondary: `Sound: ${state.soundEnabled ? 'On' : 'Off'}`,
      features: ['Classic + zigzag + dive waves', 'Boss battles every 4th level', 'Synth audio + looping music', 'Add to Home Screen friendly']
    };
  }
  if (state.phase === 'paused') {
    return {
      kicker: 'Game paused',
      title: 'Take a breath',
      body: `Score ${state.score} • Level ${state.level} • ${state.waveName} wave`,
      primary: 'Resume',
      secondary: `Sound: ${state.soundEnabled ? 'On' : 'Off'}`,
      features: ['Your progress is waiting', 'Tap resume to continue']
    };
  }
  if (state.phase === 'gameover') {
    return {
      kicker: 'Transmission lost',
      title: 'Game Over',
      body: `Final score: ${state.score}. Best: ${state.bestScore}. Ready for another run?`,
      primary: 'Restart',
      secondary: `Sound: ${state.soundEnabled ? 'On' : 'Off'}`,
      features: ['Try for a new best score', 'Boss waves appear every 4th level']
    };
  }
  return {
    kicker: 'Sector cleared',
    title: 'Victory',
    body: `You cleared level ${state.level}. Launch again?`,
    primary: 'Next Run',
    secondary: `Sound: ${state.soundEnabled ? 'On' : 'Off'}`,
    features: ['Higher levels move faster']
  };
}

function renderOverlay() {
  const config = getOverlayConfig();
  overlay.innerHTML = `
    <div class="overlay-panel">
      <div class="overlay-kicker">${config.kicker}</div>
      <h1>${config.title}</h1>
      <p>${config.body}</p>
      <div class="overlay-features">
        ${config.features.map((item) => `<div class="feature-chip">${item}</div>`).join('')}
      </div>
      <div class="overlay-actions">
        <button id="overlayPrimary" class="primary-button">${config.primary}</button>
        <button id="overlaySecondary" class="secondary-button">${config.secondary}</button>
      </div>
    </div>
  `;

  document.getElementById('overlayPrimary').addEventListener('click', () => {
    if (state.phase === 'paused') {
      resumeGame();
    } else {
      resetGame(true);
    }
  });
  document.getElementById('overlaySecondary').addEventListener('click', toggleSound);
}

function updateBossUi() {
  if (!state.boss) {
    bossBarWrap.classList.add('hidden');
    bossBarFill.style.width = '0%';
    return;
  }
  bossBarWrap.classList.remove('hidden');
  bossBarFill.style.width = `${Math.max(0, (state.boss.hp / state.boss.maxHp) * 100)}%`;
}

function nextLevel() {
  state.level += 1;
  state.player = createPlayer();
  state.bullets = [];
  state.enemyBullets = [];
  state.particles = [];
  setWave();
  syncHud();
  playTone({ frequency: 520, type: 'triangle', duration: 0.12, gain: 0.04, slideTo: 920 });
}

function firePlayerBullet(now) {
  if (!isRunning() || now - state.lastShotAt < 230) return;
  state.lastShotAt = now;
  state.bullets.push({
    x: state.player.x + state.player.width / 2 - 3,
    y: state.player.y - 12,
    width: 6,
    height: 22,
    speed: 12,
    kind: 'player'
  });
  playTone({ frequency: 780, duration: 0.06, gain: 0.024, slideTo: 420 });
}

function fireEnemyBullet(now) {
  if (now - state.lastEnemyShotAt < Math.max(380, 1200 - state.level * 55)) return;
  state.lastEnemyShotAt = now;

  if (state.boss) {
    const offsets = [-60, 0, 60];
    offsets.forEach((offset) => {
      state.enemyBullets.push({
        x: state.boss.x + state.boss.width / 2 + offset,
        y: state.boss.y + state.boss.height - 10,
        width: 10,
        height: 24,
        speed: 6.5 + state.level * 0.3,
        kind: 'enemy'
      });
    });
    return;
  }

  const shooters = state.enemies.filter((enemy) => enemy.alive && !enemy.diving);
  if (!shooters.length) return;
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

function spawnBurst(x, y, color, count = 14) {
  for (let i = 0; i < count; i += 1) {
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
      spawnBurst(bullet.x, bullet.y, '#2ce8f5', 8);
      playTone({ frequency: 180, type: 'sawtooth', duration: 0.05, gain: 0.015, slideTo: 120 });
      return true;
    }
  }
  return false;
}

function maybeStartDive() {
  if (state.boss || Math.random() > 0.01) return;
  const candidates = state.enemies.filter((enemy) => enemy.alive && enemy.movement === 'dive' && !enemy.diving);
  if (!candidates.length) return;
  const enemy = candidates[Math.floor(Math.random() * candidates.length)];
  enemy.diving = true;
  enemy.diveSpeed = 4 + Math.random() * 1.5;
  enemy.diveX = (Math.random() - 0.5) * 3;
}

function updateEnemies(delta) {
  if (state.boss) {
    state.boss.x += state.bossDirection * state.boss.speed;
    if (state.boss.x <= 60 || state.boss.x + state.boss.width >= WIDTH - 60) {
      state.bossDirection *= -1;
      state.boss.y += 18;
    }
    state.boss.flash = Math.max(0, state.boss.flash - 1);
    if (state.boss.y + state.boss.height >= state.player.y - 20) {
      endGame();
    }
    return;
  }

  let hitEdge = false;
  const liveEnemies = state.enemies.filter((enemy) => enemy.alive);
  for (const enemy of liveEnemies) {
    if (enemy.movement === 'classic') {
      enemy.x += state.enemyDirection * state.enemySpeed * delta * 0.06;
    } else if (enemy.movement === 'zigzag') {
      enemy.phase += 0.035;
      enemy.x += state.enemyDirection * state.enemySpeed * delta * 0.055 + Math.sin(enemy.phase) * 1.4;
      enemy.y += Math.cos(enemy.phase) * 0.3;
    } else if (enemy.movement === 'dive') {
      if (enemy.diving) {
        enemy.y += enemy.diveSpeed;
        enemy.x += enemy.diveX * 2;
        if (enemy.y > HEIGHT + 30) {
          enemy.alive = false;
        }
      } else {
        enemy.x += state.enemyDirection * state.enemySpeed * delta * 0.05;
      }
    }

    enemy.flash = Math.max(0, enemy.flash - 1);
    if (!enemy.diving && (enemy.x <= 28 || enemy.x + enemy.width >= WIDTH - 28)) hitEdge = true;
  }

  if (hitEdge) {
    state.enemyDirection *= -1;
    for (const enemy of liveEnemies) {
      if (!enemy.diving) {
        enemy.y += 26;
        if (enemy.y + enemy.height >= state.player.y - 10) {
          endGame();
          return;
        }
      }
    }
  }

  maybeStartDive();
}

function updatePlayer() {
  if (state.moveLeft) state.player.x -= state.player.speed;
  if (state.moveRight) state.player.x += state.player.speed;
  state.player.x = Math.max(20, Math.min(WIDTH - state.player.width - 20, state.player.x));
  state.player.flash = Math.max(0, state.player.flash - 1);
}

function updateWorld(now) {
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
  state.enemyBullets = state.enemyBullets.filter((bullet) => bullet.y < HEIGHT + 24);

  state.floatTime += 0.02;
  playMusic(now);
}

function handleCollisions() {
  if (state.boss) {
    for (const bullet of state.bullets) {
      if (hitShield(bullet)) continue;
      if (overlaps(bullet, state.boss)) {
        bullet.y = -100;
        state.boss.hp -= 1;
        state.boss.flash = 2;
        state.score += 20;
        updateBestScore();
        spawnBurst(bullet.x, bullet.y, '#ffd36a', 10);
        playTone({ frequency: 210, type: 'sawtooth', duration: 0.08, gain: 0.024, slideTo: 120 });
        updateBossUi();
        if (state.boss.hp <= 0) {
          state.score += state.boss.points;
          updateBestScore();
          spawnBurst(state.boss.x + state.boss.width / 2, state.boss.y + state.boss.height / 2, '#ff6b6b', 40);
          state.boss = null;
          updateBossUi();
          nextLevel();
          return;
        }
      }
    }
  } else {
    const liveEnemies = state.enemies.filter((enemy) => enemy.alive);
    for (const bullet of state.bullets) {
      if (hitShield(bullet)) continue;
      for (const enemy of liveEnemies) {
        if (enemy.alive && overlaps(bullet, enemy)) {
          enemy.alive = false;
          enemy.flash = 2;
          bullet.y = -100;
          state.score += enemy.points;
          updateBestScore();
          spawnBurst(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, '#ff8cf7');
          playTone({ frequency: 270, duration: 0.08, gain: 0.03, slideTo: 140 });
          break;
        }
      }
    }
  }

  for (const bullet of state.enemyBullets) {
    if (hitShield(bullet)) continue;
    if (overlaps(bullet, state.player)) {
      bullet.y = HEIGHT + 100;
      state.lives -= 1;
      state.player.flash = 8;
      syncHud();
      spawnBurst(state.player.x + state.player.width / 2, state.player.y, '#ff6b6b', 18);
      playTone({ frequency: 140, type: 'sawtooth', duration: 0.18, gain: 0.03, slideTo: 70 });
      if (state.lives <= 0) {
        endGame();
        return;
      }
      state.player = createPlayer();
    }
  }

  if (!state.boss && !state.enemies.some((enemy) => enemy.alive)) {
    nextLevel();
  }
}

function endGame() {
  state.phase = 'gameover';
  updateBestScore();
  syncHud();
  renderOverlay();
  overlay.classList.remove('hidden');
}

function overlaps(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function drawBackground() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = '#030712';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  for (const star of state.stars) {
    ctx.fillStyle = '#b6efff';
    ctx.globalAlpha = 0.28 + star.r * 0.22;
    ctx.fillRect(star.x, star.y, star.r, star.r);
  }
  ctx.globalAlpha = 1;

  ctx.strokeStyle = 'rgba(32, 79, 140, 0.55)';
  ctx.lineWidth = 2;
  for (let y = 120; y < HEIGHT; y += 120) {
    ctx.beginPath();
    ctx.moveTo(20, y + Math.sin(state.floatTime + y * 0.01) * 2);
    ctx.lineTo(WIDTH - 20, y + Math.sin(state.floatTime + y * 0.01) * 2);
    ctx.stroke();
  }
}

function drawPlayer() {
  const p = state.player;
  if (!p) return;
  ctx.save();
  if (p.flash % 2 === 1) ctx.globalAlpha = 0.45;
  ctx.fillStyle = '#7eff8a';
  ctx.fillRect(p.x + 12, p.y, p.width - 24, 18);
  ctx.fillRect(p.x, p.y + 18, p.width, 12);
  ctx.fillRect(p.x + 10, p.y + 30, 14, 8);
  ctx.fillRect(p.x + p.width - 24, p.y + 30, 14, 8);
  ctx.restore();
}

function drawEnemies() {
  for (const enemy of state.enemies) {
    if (!enemy.alive) continue;
    ctx.save();
    if (enemy.flash % 2 === 1) ctx.globalAlpha = 0.45;
    ctx.fillStyle = enemy.movement === 'zigzag' ? '#72d6ff' : enemy.movement === 'dive' ? '#ffd36a' : '#ff8cf7';
    ctx.fillRect(enemy.x + 10, enemy.y, enemy.width - 20, 10);
    ctx.fillRect(enemy.x, enemy.y + 10, enemy.width, 12);
    ctx.fillRect(enemy.x + 8, enemy.y + 22, enemy.width - 16, 8);
    ctx.fillRect(enemy.x + 6, enemy.y + 30, 10, 6);
    ctx.fillRect(enemy.x + enemy.width - 16, enemy.y + 30, 10, 6);
    ctx.restore();
  }
}

function drawBoss() {
  if (!state.boss) return;
  const b = state.boss;
  ctx.save();
  if (b.flash % 2 === 1) ctx.globalAlpha = 0.4;
  ctx.fillStyle = '#ff6b6b';
  ctx.fillRect(b.x + 30, b.y, b.width - 60, 24);
  ctx.fillRect(b.x, b.y + 24, b.width, 34);
  ctx.fillRect(b.x + 20, b.y + 58, b.width - 40, 22);
  ctx.fillRect(b.x + 40, b.y + 80, 26, 18);
  ctx.fillRect(b.x + b.width - 66, b.y + 80, 26, 18);
  ctx.fillStyle = '#ffd36a';
  ctx.fillRect(b.x + 54, b.y + 34, 26, 14);
  ctx.fillRect(b.x + b.width - 80, b.y + 34, 26, 14);
  ctx.restore();
}

function drawShields() {
  for (const shield of state.shields) {
    if (shield.hp <= 0) continue;
    const alpha = Math.max(0.24, shield.hp / 8);
    ctx.fillStyle = `rgba(44, 232, 245, ${alpha})`;
    ctx.fillRect(shield.x, shield.y, shield.width, shield.height);
    ctx.clearRect(shield.x + 40, shield.y + 22, 18, 20);
    ctx.clearRect(shield.x + shield.width - 58, shield.y + 22, 18, 20);
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

function draw() {
  drawBackground();
  drawShields();
  drawPlayer();
  drawEnemies();
  drawBoss();
  drawBullets();
  drawParticles();
}

function update(delta, now) {
  updateWorld(now);
  if (!isRunning()) return;
  updatePlayer();
  updateEnemies(delta);
  handleCollisions();
  fireEnemyBullet(now);
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
    if (state.phase === 'paused') resumeGame();
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
  if (state.phase === 'paused') resumeGame();
  if (state.phase === 'start' || state.phase === 'gameover') {
    resetGame(true);
    return;
  }
  firePlayerBullet(performance.now());
});

pauseButton.addEventListener('click', () => {
  ensureAudio();
  if (state.phase === 'running') pauseGame();
  else if (state.phase === 'paused') resumeGame();
  else if (state.phase === 'start') resetGame(true);
});

muteButton.addEventListener('click', toggleSound);

window.addEventListener('keydown', (event) => {
  ensureAudio();
  if (event.key === 'ArrowLeft') state.moveLeft = true;
  if (event.key === 'ArrowRight') state.moveRight = true;
  if (event.key === ' ' || event.code === 'Space') {
    event.preventDefault();
    if (state.phase === 'start' || state.phase === 'gameover') resetGame(true);
    else firePlayerBullet(performance.now());
  }
  if (event.key.toLowerCase() === 'p') {
    if (state.phase === 'running') pauseGame();
    else if (state.phase === 'paused') resumeGame();
  }
  if (event.key === 'Enter' && (state.phase === 'start' || state.phase === 'gameover')) resetGame(true);
});

window.addEventListener('keyup', (event) => {
  if (event.key === 'ArrowLeft') state.moveLeft = false;
  if (event.key === 'ArrowRight') state.moveRight = false;
});

let dragActive = false;
canvas.addEventListener('pointerdown', (event) => {
  ensureAudio();
  if (state.phase === 'paused') resumeGame();
  if (state.phase === 'start' || state.phase === 'gameover') resetGame(true);
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
renderOverlay();
draw();
requestAnimationFrame(loop);
