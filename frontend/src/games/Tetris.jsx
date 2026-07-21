import { useEffect, useRef, useState, useCallback } from 'react';

const CELL = 34;

const PIECES = {
  I: { matrix: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], color: '#4dd9e8' },
  O: { matrix: [[0,0,0,0],[0,1,1,0],[0,1,1,0],[0,0,0,0]], color: '#f2d94e' },
  T: { matrix: [[0,1,0],[1,1,1],[0,0,0]], color: '#b06ee0' },
  S: { matrix: [[0,1,1],[1,1,0],[0,0,0]], color: '#6fd97a' },
  Z: { matrix: [[1,1,0],[0,1,1],[0,0,0]], color: '#e85a5a' },
  J: { matrix: [[1,0,0],[1,1,1],[0,0,0]], color: '#5a8ce8' },
  L: { matrix: [[0,0,1],[1,1,1],[0,0,0]], color: '#e8965a' },
};
const PIECE_KEYS = Object.keys(PIECES);

const LEVELS = [
  { name: 'Cartridge Classic', accent: '#f0a63a', speed: 800, cols: 10, rows: 20 },
  { name: 'Sage Rush',         accent: '#7fc98a', speed: 620, cols: 10, rows: 20 },
  { name: 'Plum Squeeze',      accent: '#b98cd6', speed: 560, cols: 8,  rows: 20 },
  { name: 'Ember Blackout',    accent: '#e2703a', speed: 520, cols: 10, rows: 20, fog: true },
  { name: 'Holo Garbage',      accent: '#e8d16b', speed: 480, cols: 10, rows: 20, garbage: true },
  { name: 'Sky Mirror',        accent: '#6fb8e8', speed: 440, cols: 10, rows: 20, mirror: true },
  { name: 'Crimson Overdrive', accent: '#e0455a', speed: 380, cols: 10, rows: 20, noGhost: true },
  { name: 'Violet Chaos',      accent: '#a86ee0', speed: 340, cols: 10, rows: 20, trueRandom: true },
  { name: 'Void Sudden Death', accent: '#8890a6', speed: 300, cols: 10, rows: 16, prefill: 3 },
  { name: 'Master Cartridge',  accent: '#ffffff', speed: 230, cols: 8,  rows: 16, fog: true, garbage: true, mirror: true, noGhost: true, prefill: 2 },
];

function emptyBoard(cols, rows) {
  return Array.from({ length: rows }, () => Array(cols).fill(null));
}

function rotateMatrix(m) {
  const n = m.length;
  const out = Array.from({ length: n }, () => Array(n).fill(0));
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      out[c][n - 1 - r] = m[r][c];
    }
  }
  return out;
}

function newBag() {
  const bag = [...PIECE_KEYS];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}

function spawnPiece(key, cols) {
  const def = PIECES[key];
  const size = def.matrix.length;
  return {
    key,
    matrix: def.matrix.map((row) => [...row]),
    color: def.color,
    row: -2,
    col: Math.floor((cols - size) / 2),
  };
}

function collides(board, piece, rows, cols, offsetRow = 0, offsetCol = 0, matrix = null) {
  const m = matrix || piece.matrix;
  for (let r = 0; r < m.length; r++) {
    for (let c = 0; c < m.length; c++) {
      if (!m[r][c]) continue;
      const br = piece.row + r + offsetRow;
      const bc = piece.col + c + offsetCol;
      if (bc < 0 || bc >= cols || br >= rows) return true;
      if (br >= 0 && board[br][bc]) return true;
    }
  }
  return false;
}

function mergePiece(board, piece) {
  const m = piece.matrix;
  for (let r = 0; r < m.length; r++) {
    for (let c = 0; c < m.length; c++) {
      if (!m[r][c]) continue;
      const br = piece.row + r;
      const bc = piece.col + c;
      if (br >= 0) board[br][bc] = piece.color;
    }
  }
}

function clearLines(board, cols) {
  let cleared = 0;
  for (let r = board.length - 1; r >= 0; r--) {
    if (board[r].every((cell) => cell)) {
      board.splice(r, 1);
      board.unshift(Array(cols).fill(null));
      cleared++;
      r++;
    }
  }
  return cleared;
}

function makePrefill(cols, rows, rowsToFill) {
  const board = emptyBoard(cols, rows);
  for (let r = rows - rowsToFill; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (Math.random() < 0.55) board[r][c] = '#3a3f52';
    }
    const gap = Math.floor(Math.random() * cols);
    board[r][gap] = null;
  }
  return board;
}

export default function Tetris({ onGameOver, bestScore }) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const boardRef = useRef(null);
  const pieceRef = useRef(null);
  const bagRef = useRef([]);
  const dropTimerRef = useRef(0);
  const garbageTimerRef = useRef(0);
  const lastTsRef = useRef(0);
  const rafRef = useRef(null);
  const softDropRef = useRef(false);
  const touchRef = useRef(null);

  const [levelIdx, setLevelIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [paused, setPaused] = useState(false);

  const config = LEVELS[Math.min(levelIdx, LEVELS.length - 1)];
  const extraSpeedCuts = Math.max(0, Math.floor(lines / 10) - (LEVELS.length - 1));
  const speed = Math.max(100, config.speed - extraSpeedCuts * 15);

  const nextFromBag = useCallback(() => {
    if (config.trueRandom) {
      return PIECE_KEYS[Math.floor(Math.random() * PIECE_KEYS.length)];
    }
    if (bagRef.current.length === 0) bagRef.current = newBag();
    return bagRef.current.pop();
  }, [config.trueRandom]);

  const spawnNext = useCallback(() => {
    const key = nextFromBag();
    const p = spawnPiece(key, config.cols);
    if (collides(boardRef.current, p, config.rows, config.cols)) {
      setGameOver(true);
      return null;
    }
    return p;
  }, [nextFromBag, config.cols, config.rows]);

  const resetForLevel = useCallback(() => {
    const rowsFill = config.prefill || 0;
    boardRef.current = rowsFill ? makePrefill(config.cols, config.rows, rowsFill) : emptyBoard(config.cols, config.rows);
    bagRef.current = [];
    pieceRef.current = spawnNext();
    dropTimerRef.current = 0;
    garbageTimerRef.current = 0;
  }, [config.cols, config.rows, config.prefill, spawnNext]);

  useEffect(() => {
    resetForLevel();
  }, [levelIdx]);

  const lockPiece = useCallback(() => {
    mergePiece(boardRef.current, pieceRef.current);
    const cleared = clearLines(boardRef.current, config.cols);
    if (cleared > 0) {
      const points = [0, 100, 300, 500, 800][cleared] * (levelIdx + 1);
      setScore((s) => s + points);
      setLines((l) => {
        const nl = l + cleared;
        const nextLevelIdx = Math.min(LEVELS.length - 1, Math.floor(nl / 10));
        if (nextLevelIdx !== levelIdx) setLevelIdx(nextLevelIdx);
        return nl;
      });
    }
    pieceRef.current = spawnNext();
  }, [config.cols, levelIdx, spawnNext]);

  const tryMove = useCallback((dr, dc) => {
    const p = pieceRef.current;
    if (!p || gameOver || paused) return false;
    if (!collides(boardRef.current, p, config.rows, config.cols, dr, dc)) {
      p.row += dr;
      p.col += dc;
      return true;
    }
    if (dr === 1 && dc === 0) {
      lockPiece();
    }
    return false;
  }, [config.rows, config.cols, gameOver, paused, lockPiece]);

  const tryRotate = useCallback(() => {
    const p = pieceRef.current;
    if (!p || gameOver || paused || p.key === 'O') return;
    const rotated = rotateMatrix(p.matrix);
    const kicks = [0, -1, 1, -2, 2];
    for (const k of kicks) {
      if (!collides(boardRef.current, p, config.rows, config.cols, 0, k, rotated)) {
        p.matrix = rotated;
        p.col += k;
        return;
      }
    }
  }, [config.rows, config.cols, gameOver, paused]);

  const hardDrop = useCallback(() => {
    const p = pieceRef.current;
    if (!p || gameOver || paused) return;
    let d = 0;
    while (!collides(boardRef.current, p, config.rows, config.cols, d + 1, 0)) d++;
    p.row += d;
    setScore((s) => s + d * 2);
    lockPiece();
  }, [config.rows, config.cols, gameOver, paused, lockPiece]);

  const moveLeft = useCallback(() => tryMove(0, config.mirror ? 1 : -1), [tryMove, config.mirror]);
  const moveRight = useCallback(() => tryMove(0, config.mirror ? -1 : 1), [tryMove, config.mirror]);

  const onCanvasPointerDown = useCallback((e) => {
    touchRef.current = { x: e.clientX, y: e.clientY, t: Date.now(), moved: false };
  }, []);

  const onCanvasPointerMove = useCallback((e) => {
    const t = touchRef.current;
    if (!t) return;
    const dx = e.clientX - t.x;
    const dy = e.clientY - t.y;
    const STEP = 28;
    if (Math.abs(dx) >= STEP) {
      if (dx > 0) moveRight(); else moveLeft();
      t.x = e.clientX;
      t.moved = true;
    }
    if (dy >= STEP * 1.5) {
      tryMove(1, 0);
      t.y = e.clientY;
      t.moved = true;
    }
  }, [moveLeft, moveRight, tryMove]);

  const onCanvasPointerUp = useCallback((e) => {
    const t = touchRef.current;
    touchRef.current = null;
    if (!t) return;
    const dx = e.clientX - t.x;
    const dy = e.clientY - t.y;
    const dt = Date.now() - t.t;
    if (!t.moved && dt < 250 && Math.abs(dx) < 12 && Math.abs(dy) < 12) {
      tryRotate();
    } else if (dy > 60 && Math.abs(dx) < 20) {
      hardDrop();
    }
  }, [tryRotate, hardDrop]);

  useEffect(() => {
    if (gameOver) {
      onGameOver(score);
      return;
    }
    function loop(ts) {
      if (!lastTsRef.current) lastTsRef.current = ts;
      const dt = ts - lastTsRef.current;
      lastTsRef.current = ts;
      if (!paused) {
        dropTimerRef.current += dt;
        const interval = softDropRef.current ? Math.min(speed, 60) : speed;
        if (dropTimerRef.current >= interval) {
          dropTimerRef.current = 0;
          tryMove(1, 0);
        }
        if (config.garbage) {
          garbageTimerRef.current += dt;
          if (garbageTimerRef.current >= 15000) {
            garbageTimerRef.current = 0;
            const b = boardRef.current;
            b.shift();
            const gap = Math.floor(Math.random() * config.cols);
            const row = Array(config.cols).fill('#3a3f52');
            row[gap] = null;
            b.push(row);
          }
        }
      }
      draw();
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [gameOver, paused, speed, config.garbage, config.cols, tryMove]);

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const cell = Math.floor(canvas.width / config.cols);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#12141f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const board = boardRef.current;
    const piece = pieceRef.current;
    const fogStart = config.fog ? Math.floor(config.rows * 0.45) : -1;

    for (let r = 0; r < config.rows; r++) {
      for (let c = 0; c < config.cols; c++) {
        const cellColor = board[r][c];
        if (!cellColor) continue;
        const dim = config.fog && r < fogStart;
        ctx.globalAlpha = dim ? 0.15 : 1;
        ctx.fillStyle = cellColor;
        ctx.fillRect(c * cell, r * cell, cell - 1, cell - 1);
      }
    }
    ctx.globalAlpha = 1;

    if (piece && !config.noGhost) {
      let d = 0;
      while (!collides(board, piece, config.rows, config.cols, d + 1, 0)) d++;
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = piece.color;
      for (let r = 0; r < piece.matrix.length; r++) {
        for (let c = 0; c < piece.matrix.length; c++) {
          if (!piece.matrix[r][c]) continue;
          const br = piece.row + r + d;
          const bc = piece.col + c;
          if (br < 0) continue;
          const dim = config.fog && br < fogStart;
          if (dim) continue;
          ctx.fillRect(bc * cell, br * cell, cell - 1, cell - 1);
        }
      }
      ctx.globalAlpha = 1;
    }

    if (piece) {
      ctx.fillStyle = piece.color;
      for (let r = 0; r < piece.matrix.length; r++) {
        for (let c = 0; c < piece.matrix.length; c++) {
          if (!piece.matrix[r][c]) continue;
          const br = piece.row + r;
          const bc = piece.col + c;
          if (br < 0) continue;
          const dim = config.fog && br < fogStart;
          ctx.globalAlpha = dim ? 0.25 : 1;
          ctx.fillRect(bc * cell, br * cell, cell - 1, cell - 1);
        }
      }
      ctx.globalAlpha = 1;
    }

    ctx.strokeStyle = config.accent;
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);
  }

  useEffect(() => {
    function onKey(e) {
      if (gameOver) return;
      if (e.key === 'ArrowLeft') moveLeft();
      else if (e.key === 'ArrowRight') moveRight();
      else if (e.key === 'ArrowUp') tryRotate();
      else if (e.key === 'ArrowDown') softDropRef.current = true;
      else if (e.key === ' ') { e.preventDefault(); hardDrop(); }
      else if (e.key === 'p' || e.key === 'P') setPaused((v) => !v);
    }
    function onKeyUp(e) {
      if (e.key === 'ArrowDown') softDropRef.current = false;
    }
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [gameOver, moveLeft, moveRight, tryRotate, hardDrop]);

  useEffect(() => {
    function resize() {
      const el = wrapRef.current;
      const canvas = canvasRef.current;
      if (!el || !canvas) return;
      const width = el.clientWidth;
      const cellSize = Math.max(8, Math.floor(width / config.cols));
      canvas.width = cellSize * config.cols;
      canvas.height = cellSize * config.rows;
    }
    resize();
    const ro = new ResizeObserver(resize);
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [config.cols, config.rows]);

  return (
    <div className="tetris-wrap" style={{ '--tetris-accent': config.accent }}>
      <div className="tetris-hud">
        <div className="tetris-hud-item"><span>Level</span><strong>{levelIdx + 1}</strong></div>
        <div className="tetris-hud-item"><span>{config.name}</span></div>
        <div className="tetris-hud-item"><span>Score</span><strong>{score}</strong></div>
        <div className="tetris-hud-item"><span>Best</span><strong>{Math.max(bestScore, score)}</strong></div>
      </div>

      <div className="game-canvas-wrap">
        <div className="game-canvas-container" ref={wrapRef} style={{ borderColor: config.accent }}>
          <canvas
            ref={canvasRef}
            style={{ touchAction: 'none' }}
            onPointerDown={onCanvasPointerDown}
            onPointerMove={onCanvasPointerMove}
            onPointerUp={onCanvasPointerUp}
          />
          {gameOver && (
            <div className="tetris-overlay">
              <p>Game Over</p>
              <span>Score: {score}</span>
            </div>
          )}
          {paused && !gameOver && (
            <div className="tetris-overlay">
              <p>Paused</p>
            </div>
          )}
        </div>
      </div>

      <div className="tetris-controls">
        <button onPointerDown={moveLeft} aria-label="Move left">◀</button>
        <button onPointerDown={tryRotate} aria-label="Rotate">⟳</button>
        <button
          onPointerDown={() => { softDropRef.current = true; }}
          onPointerUp={() => { softDropRef.current = false; }}
          onPointerLeave={() => { softDropRef.current = false; }}
          aria-label="Soft drop"
        >▼</button>
        <button onPointerDown={hardDrop} aria-label="Hard drop">⤓</button>
        <button onPointerDown={moveRight} aria-label="Move right">▶</button>
      </div>
    </div>
  );
}
