import { useEffect, useRef, useState, useCallback } from 'react';
import { RewardedAdSlot, InterstitialAdSlot } from '../components/AdSlot';

const SIZE = 4;

const TILE_COLORS = {
  2: '#3d3d63',
  4: '#4a4a7a',
  8: '#66a182',
  16: '#5a9e6f',
  32: '#e4572e',
  64: '#e4762e',
  128: '#f2c14e',
  256: '#f2b83e',
  512: '#7b4b94',
  1024: '#9a5fb8',
  2048: '#ffd54f',
};

function emptyBoard() {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
}

function emptyCells(board) {
  const cells = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] === 0) cells.push([r, c]);
    }
  }
  return cells;
}

function spawnTile(board) {
  const cells = emptyCells(board);
  if (cells.length === 0) return board;
  const [r, c] = cells[Math.floor(Math.random() * cells.length)];
  const next = board.map((row) => [...row]);
  next[r][c] = Math.random() < 0.9 ? 2 : 4;
  return next;
}

function slideLine(line) {
  const filtered = line.filter((v) => v !== 0);
  const result = [];
  let gained = 0;
  let i = 0;
  while (i < filtered.length) {
    if (filtered[i] === filtered[i + 1]) {
      const merged = filtered[i] * 2;
      result.push(merged);
      gained += merged;
      i += 2;
    } else {
      result.push(filtered[i]);
      i += 1;
    }
  }
  while (result.length < SIZE) result.push(0);
  return { line: result, gained };
}

function transpose(board) {
  const next = emptyBoard();
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      next[c][r] = board[r][c];
    }
  }
  return next;
}

function moveLeftBoard(board) {
  let gained = 0;
  const next = board.map((row) => {
    const { line, gained: g } = slideLine(row);
    gained += g;
    return line;
  });
  return { board: next, gained };
}

function boardsEqual(a, b) {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (a[r][c] !== b[r][c]) return false;
    }
  }
  return true;
}

function applyMove(board, dir) {
  let working = board;
  let flip = false;
  let rotate = false;

  if (dir === 'up' || dir === 'down') {
    working = transpose(working);
    rotate = true;
  }
  if (dir === 'right' || dir === 'down') {
    working = working.map((row) => [...row].reverse());
    flip = true;
  }

  const { board: moved, gained } = moveLeftBoard(working);

  let result = moved;
  if (flip) result = result.map((row) => [...row].reverse());
  if (rotate) result = transpose(result);

  return { board: result, gained, changed: !boardsEqual(board, result) };
}

function canMove(board) {
  if (emptyCells(board).length > 0) return true;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const v = board[r][c];
      if (c + 1 < SIZE && board[r][c + 1] === v) return true;
      if (r + 1 < SIZE && board[r + 1][c] === v) return true;
    }
  }
  return false;
}

function initBoard() {
  let board = spawnTile(emptyBoard());
  board = spawnTile(board);
  return board;
}

export default function Game2048({ onGameOver, bestScore = 0 }) {
  const [board, setBoard] = useState(initBoard);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState('playing'); // playing | over
  const [won, setWon] = useState(false);
  const touchRef = useRef(null);
  const overRef = useRef(false);

  const boardRef = useRef(board);

  const move = useCallback(
    (dir) => {
      if (status !== 'playing') return;
      const current = boardRef.current;
      const { board: next, gained, changed } = applyMove(current, dir);
      if (!changed) return;

      const spawned = spawnTile(next);
      boardRef.current = spawned;
      setBoard(spawned);

      if (gained > 0) {
        setScore((s) => s + gained);
      }
      if (!won && spawned.some((row) => row.some((v) => v >= 2048))) {
        setWon(true);
      }
      if (!canMove(spawned) && !overRef.current) {
        overRef.current = true;
        setStatus('choice');
      }
    },
    [status, won]
  );

  function restart() {
    overRef.current = false;
    const fresh = initBoard();
    boardRef.current = fresh;
    setBoard(fresh);
    setScore(0);
    setStatus('playing');
    setWon(false);
  }

  function handleContinueWithAd() {
    // clear one random filled tile to free up a move, then keep playing
    const prev = boardRef.current;
    const filled = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (prev[r][c] !== 0) filled.push([r, c]);
      }
    }
    const next = prev.map((row) => [...row]);
    if (filled.length > 0) {
      const [r, c] = filled[Math.floor(Math.random() * filled.length)];
      next[r][c] = 0;
    }
    boardRef.current = next;
    setBoard(next);
    overRef.current = false;
    setStatus('playing');
  }

  function declineAdAndShowInterstitial() {
    setStatus('interstitial');
  }

  function finishAfterInterstitial() {
    setStatus('over');
    onGameOver?.(score);
  }

  useEffect(() => {
    function onKey(e) {
      const map = {
        ArrowLeft: 'left',
        ArrowRight: 'right',
        ArrowUp: 'up',
        ArrowDown: 'down',
      };
      const dir = map[e.key];
      if (!dir) return;
      e.preventDefault();
      move(dir);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [move]);

  function onPointerDown(e) {
    touchRef.current = { x: e.clientX, y: e.clientY };
  }
  function onPointerUp(e) {
    const t = touchRef.current;
    touchRef.current = null;
    if (!t) return;
    const dx = e.clientX - t.x;
    const dy = e.clientY - t.y;
    const THRESHOLD = 24;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < THRESHOLD) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      move(dx > 0 ? 'right' : 'left');
    } else {
      move(dy > 0 ? 'down' : 'up');
    }
  }

  return (
    <div className="tetris-shell">
      <div className="game-header">
        <div className="stat"><span>Score</span><div className="value">{score}</div></div>
        <div className="stat"><span>Best</span><div className="value">{Math.max(bestScore, score)}</div></div>
      </div>

      <p style={{ textAlign: 'center', fontSize: 12, color: '#a8a3c0', margin: '0 0 4px' }}>
        Swipe the board, or use the arrows below, to merge matching tiles.
      </p>

      <div className="canvas-container">
        <div
          className="canvas-wrapper"
          style={{ aspectRatio: '1 / 1', background: '#14162a', touchAction: 'none' }}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
        >
          <div className="board-2048">
            {board.map((row, r) =>
              row.map((v, c) => (
                <div
                  key={`${r}-${c}`}
                  className="tile-2048"
                  style={{
                    background: v ? TILE_COLORS[v] || '#ffd54f' : 'rgba(255,255,255,0.04)',
                    color: v >= 8 ? '#1b1b2f' : '#f5f0e6',
                    fontSize: v >= 1000 ? '20px' : v >= 100 ? '24px' : '28px',
                  }}
                >
                  {v !== 0 ? v : ''}
                </div>
              ))
            )}
          </div>

          {won && status === 'playing' && (
            <div className="win-toast">2048!</div>
          )}

          {status === 'choice' && (
            <div className="tetris-overlay">
              <p>Game Over</p>
              <span>Score: {score}</span>
              <RewardedAdSlot onRewardClaim={handleContinueWithAd} rewardLabel="one more move" />
              <button className="btn btn-ghost" onClick={declineAdAndShowInterstitial}>
                No thanks, restart
              </button>
            </div>
          )}

          {status === 'over' && (
            <div className="tetris-overlay">
              <p>Game Over</p>
              <span>Score: {score}</span>
              <button className="btn btn-primary" onClick={restart}>Play again</button>
            </div>
          )}
        </div>
      </div>

      <div className="snake-dpad">
        <button className="snake-dpad-btn snake-dpad-up" onClick={() => move('up')} aria-label="Move up">▲</button>
        <button className="snake-dpad-btn snake-dpad-left" onClick={() => move('left')} aria-label="Move left">◀</button>
        <button className="snake-dpad-btn snake-dpad-right" onClick={() => move('right')} aria-label="Move right">▶</button>
        <button className="snake-dpad-btn snake-dpad-down" onClick={() => move('down')} aria-label="Move down">▼</button>
      </div>

      {status === 'interstitial' && (
        <InterstitialAdSlot onClose={finishAfterInterstitial} />
      )}
    </div>
  );
}
