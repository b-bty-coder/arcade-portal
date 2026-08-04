import { useEffect, useRef, useState, useCallback } from 'react';
import { RewardedAdSlot, InterstitialAdSlot } from '../components/AdSlot';
import { recordFail, recordLevelPassed } from '../lib/adFrequency';

const GRID = 8;
const CELL = 38;
const CANVAS_W = GRID * CELL;
const CANVAS_H = GRID * CELL;

const GEMS = [
  { color: '#e4572e', shape: 'circle' },
  { color: '#f2c14e', shape: 'diamond' },
  { color: '#66a182', shape: 'square' },
  { color: '#7b4b94', shape: 'triangle' },
  { color: '#e07ad0', shape: 'hex' },
];

const BASE_MOVES = 20;
const BASE_TARGET = 300;

function randType() {
  return Math.floor(Math.random() * GEMS.length);
}

function makeBoard() {
  const board = [];
  for (let r = 0; r < GRID; r++) {
    board[r] = [];
    for (let c = 0; c < GRID; c++) {
      let t;
      do {
        t = randType();
      } while (
        (c >= 2 && board[r][c - 1] === t && board[r][c - 2] === t) ||
        (r >= 2 && board[r - 1][c] === t && board[r - 2][c] === t)
      );
      board[r][c] = t;
    }
  }
  return board;
}

function findMatches(board) {
  const matched = Array.from({ length: GRID }, () => Array(GRID).fill(false));
  for (let r = 0; r < GRID; r++) {
    let run = 1;
    for (let c = 1; c <= GRID; c++) {
      const same = c < GRID && board[r][c] === board[r][c - 1];
      if (same) run++;
      else {
        if (run >= 3) for (let k = c - run; k < c; k++) matched[r][k] = true;
        run = 1;
      }
    }
  }
  for (let c = 0; c < GRID; c++) {
    let run = 1;
    for (let r = 1; r <= GRID; r++) {
      const same = r < GRID && board[r][c] === board[r - 1][c];
      if (same) run++;
      else {
        if (run >= 3) for (let k = r - run; k < r; k++) matched[k][c] = true;
        run = 1;
      }
    }
  }
  return matched;
}

function countMatched(matched) {
  let n = 0;
  for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++) if (matched[r][c]) n++;
  return n;
}

function collapseAndRefill(board, matched) {
  for (let c = 0; c < GRID; c++) {
    let write = GRID - 1;
    for (let r = GRID - 1; r >= 0; r--) {
      if (!matched[r][c]) {
        board[write][c] = board[r][c];
        write--;
      }
    }
    for (let r = write; r >= 0; r--) board[r][c] = randType();
  }
}

export default function GemCascade({ onGameOver, bestScore = 0 }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const boardRef = useRef(makeBoard());
  const selectedRef = useRef(null);
  const animatingRef = useRef(false);
  const hasRevivedRef = useRef(false);
  const movesRef = useRef(BASE_MOVES);
  const targetRef = useRef(BASE_TARGET);
  const levelRef = useRef(1);
  const frameRef = useRef(0);

  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(BASE_MOVES);
  const [level, setLevel] = useState(1);
  const [target, setTarget] = useState(BASE_TARGET);
  const [status, setStatus] = useState('playing');
  const [toast, setToast] = useState(null);

  const startNewGame = useCallback(() => {
    boardRef.current = makeBoard();
    selectedRef.current = null;
    animatingRef.current = false;
    hasRevivedRef.current = false;
    movesRef.current = BASE_MOVES;
    targetRef.current = BASE_TARGET;
    levelRef.current = 1;
    setScore(0);
    setMoves(BASE_MOVES);
    setLevel(1);
    setTarget(BASE_TARGET);
    setStatus('playing');
  }, []);

  function reviveWithAd() {
    hasRevivedRef.current = true;
    movesRef.current = 8;
    setMoves(8);
    setStatus('playing');
  }

  function finalizeGameOver(finalScore) {
    const { showInterstitial } = recordFail();
    if (showInterstitial) {
      setStatus('interstitial');
    } else {
      setStatus('over');
      onGameOver?.(finalScore);
    }
  }

  function finishAfterInterstitial() {
    setStatus('over');
    onGameOver?.(score);
  }

  function closeLevelInterstitial() {
    setStatus('playing');
  }

  function checkEnd(finalScore) {
    if (finalScore >= targetRef.current) {
      setToast('LEVEL CLEAR!');
      setTimeout(() => setToast(null), 1100);
      const nextLevel = levelRef.current + 1;
      const nextTarget = targetRef.current + 250 + (nextLevel - 1) * 50;
      levelRef.current = nextLevel;
      targetRef.current = nextTarget;
      movesRef.current = BASE_MOVES;
      onGameOver?.(finalScore + (nextLevel - 1) * 100);
      const { showInterstitial } = recordLevelPassed();
      setTimeout(() => {
        boardRef.current = makeBoard();
        setLevel(nextLevel);
        setTarget(nextTarget);
        setMoves(BASE_MOVES);
        setStatus(showInterstitial ? 'levelInterstitial' : 'playing');
      }, 700);
    } else if (movesRef.current <= 0) {
      if (!hasRevivedRef.current) {
        setStatus('dying');
      } else {
        finalizeGameOver(finalScore);
      }
    }
  }

  function resolveChain(chain, runningScore) {
    const matched = findMatches(boardRef.current);
    const n = countMatched(matched);
    if (n === 0) {
      animatingRef.current = false;
      checkEnd(runningScore);
      return;
    }
    const gained = n * 10 * chain;
    const next = runningScore + gained;
    setScore(next);
    collapseAndRefill(boardRef.current, matched);
    setTimeout(() => resolveChain(chain + 1, next), 180);
  }

  function trySwap(a, b) {
    if (animatingRef.current || status !== 'playing') return;
    animatingRef.current = true;
    const board = boardRef.current;
    const tmp = board[a.r][a.c];
    board[a.r][a.c] = board[b.r][b.c];
    board[b.r][b.c] = tmp;
    const matched = findMatches(board);
    if (countMatched(matched) === 0) {
      board[b.r][b.c] = board[a.r][a.c];
      board[a.r][a.c] = tmp;
      animatingRef.current = false;
      return;
    }
    movesRef.current -= 1;
    setMoves(movesRef.current);
    setTimeout(() => resolveChain(1, score), 150);
  }

  function shuffle() {
    if (animatingRef.current || status !== 'playing') return;
    boardRef.current = makeBoard();
    selectedRef.current = null;
  }

  function cellFromEvent(e) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scale = CANVAS_W / rect.width;
    const x = (e.clientX - rect.left) * scale;
    const y = (e.clientY - rect.top) * scale;
    const c = Math.floor(x / CELL);
    const r = Math.floor(y / CELL);
    if (r < 0 || r >= GRID || c < 0 || c >= GRID) return null;
    return { r, c };
  }

  function onPointerDown(e) {
    if (animatingRef.current || status !== 'playing') return;
    const cell = cellFromEvent(e);
    if (!cell) return;
    if (!selectedRef.current) {
      selectedRef.current = cell;
      return;
    }
    const dr = Math.abs(selectedRef.current.r - cell.r);
    const dc = Math.abs(selectedRef.current.c - cell.c);
    if (dr + dc === 1) {
      const a = selectedRef.current;
      selectedRef.current = null;
      trySwap(a, cell);
    } else {
      selectedRef.current = cell;
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    function drawGem(x, y, size, type) {
      const g = GEMS[type];
      const cx = x + size / 2, cy = y + size / 2;
      const r = size * 0.34;
      ctx.save();
      ctx.fillStyle = g.color;
      ctx.beginPath();
      switch (g.shape) {
        case 'circle':
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          break;
        case 'square':
          ctx.rect(cx - r * 0.85, cy - r * 0.85, r * 1.7, r * 1.7);
          break;
        case 'diamond':
          ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r, cy); ctx.lineTo(cx, cy + r); ctx.lineTo(cx - r, cy);
          break;
        case 'triangle':
          ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r * 0.9, cy + r * 0.7); ctx.lineTo(cx - r * 0.9, cy + r * 0.7);
          break;
        case 'hex':
          for (let i = 0; i < 6; i++) {
            const a = (Math.PI / 3) * i - Math.PI / 2;
            const px = cx + r * Math.cos(a), py = cy + r * Math.sin(a);
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
          break;
        default:
          break;
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    function draw() {
      frameRef.current++;
      ctx.fillStyle = '#0d0e1a';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      const board = boardRef.current;
      const selected = selectedRef.current;
      for (let r = 0; r < GRID; r++) {
        for (let c = 0; c < GRID; c++) {
          const x = c * CELL, y = r * CELL;
          ctx.fillStyle = (r + c) % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.045)';
          ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
          if (board[r][c] !== null) {
            const isSel = selected && selected.r === r && selected.c === c;
            if (isSel) {
              const pulse = 0.6 + 0.4 * Math.abs(Math.sin(frameRef.current * 0.08));
              ctx.strokeStyle = `rgba(245,240,230,${pulse})`;
              ctx.lineWidth = 2;
              ctx.strokeRect(x + 3, y + 3, CELL - 6, CELL - 6);
            }
            drawGem(x, y, CELL, board[r][c]);
          }
        }
      }
    }

    function loop() {
      rafRef.current = requestAnimationFrame(loop);
      draw();
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <div className="tetris-shell">
      <div className="game-header">
        <div className="stat"><span>Level</span><div className="value">{level}</div></div>
        <div className="stat"><span>Score</span><div className="value">{score}</div></div>
        <div className="stat"><span>Moves</span><div className="value">{moves}</div></div>
        <div className="stat"><span>Target</span><div className="value">{target}</div></div>
        <div className="stat"><span>Best</span><div className="value">{Math.max(bestScore, score)}</div></div>
      </div>

      <div className="canvas-container">
        <div
          className="canvas-wrapper"
          style={{ aspectRatio: `${CANVAS_W} / ${CANVAS_H}`, touchAction: 'none' }}
          onPointerDown={onPointerDown}
        >
          <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} />
          {toast && <div className="win-toast">{toast}</div>}

          {status === 'dying' && (
            <div className="tetris-overlay" onPointerDown={(e) => e.stopPropagation()}>
              <p>Out of moves!</p>
              <span>Score: {score}</span>
              <RewardedAdSlot onRewardClaim={reviveWithAd} rewardLabel="8 extra moves" />
              <button className="btn btn-ghost" onClick={() => finalizeGameOver(score)}>
                No thanks, restart
              </button>
            </div>
          )}

          {status === 'over' && (
            <div className="tetris-overlay" onPointerDown={(e) => e.stopPropagation()}>
              <p>Game Over</p>
              <span>Score: {score}</span>
              <button className="btn btn-primary" onClick={startNewGame}>Play again</button>
            </div>
          )}
        </div>
      </div>

      <div className="game-controls">
        <button className="btn btn-ghost" onClick={shuffle} disabled={status !== 'playing'}>
          Shuffle
        </button>
      </div>

      {status === 'interstitial' && (
        <InterstitialAdSlot onClose={finishAfterInterstitial} />
      )}
      {status === 'levelInterstitial' && (
        <InterstitialAdSlot label="Level milestone ad" onClose={closeLevelInterstitial} />
      )}
    </div>
  );
}
