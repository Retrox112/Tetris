const C = document.getElementById('board'), ctx = C.getContext('2d'),
      N = document.querySelector('.next'), nctx = N.getContext('2d'),
      S = document.querySelector('.value'), O = document.querySelector('.overlay'),
      OT = document.querySelector('.pause-title'), OR = document.querySelector('.pause-resume'),
      B = document.querySelector('.sound-btn');

const COLS = 10, ROWS = 20, SIZE = 30, W_SIZE = 30;
const board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));

let score = 0, paused = false, gameOver = false, soundOn = true, dropCounter = 0, lastTime = 0;
let actx = null;

function playSound(freq = 150, duration = 0.08) {
  if (!soundOn) return;
  if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = actx.createOscillator(), gain = actx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, actx.currentTime);
  gain.gain.setValueAtTime(0.15, actx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + duration);
  osc.connect(gain);
  gain.connect(actx.destination);
  osc.start();
  osc.stop(actx.currentTime + duration);
}

const SHAPES = [
  [[1,1,1,1]],
  [[1,0,0],[1,1,1]],
  [[0,0,1],[1,1,1]],
  [[1,1],[1,1]],
  [[0,1,1],[1,1,0]],
  [[0,1,0],[1,1,1]],
  [[1,1,0],[0,1,1]]
];

const createPiece = () => {
  const m = SHAPES[Math.floor(Math.random() * SHAPES.length)];
  return { m, x: Math.floor((COLS - m[0].length) / 2), y: 0 };
};

let piece = createPiece(), nextPiece = createPiece();

function drawCell(c, x, y, sz = SIZE) {
  c.fillStyle = '#fff';
  c.fillRect(x * sz, y * sz, sz, sz);
  c.fillStyle = '#000';
  c.fillRect(x * sz + 2, y * sz + 2, sz - 4, sz - 4);
  c.fillStyle = '#fff';
  c.fillRect(x * sz + 3, y * sz + 3, sz - 6, sz - 6);
}

function drawMatrix(mat, offset, context, sz = SIZE) {
  mat.forEach((row, y) => row.forEach((v, x) => {
    if (v) drawCell(context, x + offset.x, y + offset.y, sz);
  }));
}

function collide(b, p) {
  return p.m.some((row, y) => row.some((v, x) => 
    v && (b[y + p.y]?.[x + p.x] !== 0)
  ));
}

function merge(b, p) {
  p.m.forEach((row, y) => row.forEach((v, x) => {
    if (v) b[y + p.y][x + p.x] = 1;
  }));
}

function rotate(m) {
  return m[0].map((_, i) => m.map(row => row[i]).reverse());
}

function playerRotate() {
  const rotated = rotate(piece.m);
  const oldM = piece.m;
  piece.m = rotated;
  if (collide(board, piece)) piece.m = oldM;
  else playSound(180, 0.05);
}

function playerMove(dir) {
  piece.x += dir;
  if (collide(board, piece)) piece.x -= dir;
  else playSound(120, 0.04);
}

function resetGame() {
  board.forEach(r => r.fill(0));
  score = 0;
  S.textContent = score;
  gameOver = false;
  paused = false;
  O.style.display = 'none';
  piece = createPiece();
  nextPiece = createPiece();
}

function drop() {
  piece.y++;
  if (collide(board, piece)) {
    piece.y--;
    merge(board, piece);
    playSound(90, 0.1);
    clearLines();
    piece = nextPiece;
    nextPiece = createPiece();
    if (collide(board, piece)) {
      gameOver = true;
      OT.textContent = 'Game Over';
      OR.textContent = 'Press any key to restart';
      O.style.display = 'flex';
      playSound(50, 0.4);
    }
  }
  dropCounter = 0;
}

function clearLines() {
  let lines = 0;
  for (let y = ROWS - 1; y >= 0; y--) {
    if (board[y].every(v => v !== 0)) {
      board.splice(y, 1);
      board.unshift(Array(COLS).fill(0));
      lines++;
      y++;
    }
  }
  if (lines) {
    score += lines * 10;
    S.textContent = score;
    playSound(220, 0.15);
  }
}

function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, C.width, C.height);
  drawMatrix(board, { x: 0, y: 0 }, ctx);
  if (!gameOver) drawMatrix(piece.m, piece, ctx);

  nctx.fillStyle = '#000';
  nctx.fillRect(0, 0, N.width, N.height);
  const offX = (4 - nextPiece.m[0].length) / 2;
  const offY = (4 - nextPiece.m.length) / 2;
  drawMatrix(nextPiece.m, { x: offX, y: offY }, nctx, W_SIZE);
}

function update(time = 0) {
  const dt = time - lastTime;
  lastTime = time;
  if (!paused && !gameOver) {
    dropCounter += dt;
    if (dropCounter > 800) drop();
    draw();
  }
  requestAnimationFrame(update);
}

document.addEventListener('keydown', e => {
  if (gameOver) {
    resetGame();
    return;
  }
  if (e.key === 'p' || e.key === 'P') {
    paused = !paused;
    OT.textContent = 'Paused';
    OR.textContent = 'Press P to resume';
    O.style.display = paused ? 'flex' : 'none';
    return;
  }
  if (paused) return;
  if (e.key === 'ArrowLeft') playerMove(-1);
  if (e.key === 'ArrowRight') playerMove(1);
  if (e.key === 'ArrowDown') { drop(); playSound(100, 0.03); }
  if (e.key === 'ArrowUp') playerRotate();
});

B.onclick = () => {
  soundOn = !soundOn;
  B.textContent = `Sound: ${soundOn ? 'ON' : 'OFF'}`;
};

update();