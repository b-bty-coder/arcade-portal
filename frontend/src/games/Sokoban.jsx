import { useEffect, useRef, useState, useCallback } from 'react';
import { InterstitialAdSlot } from '../components/AdSlot';
import { recordFail, recordLevelPassed } from '../lib/adFrequency';
import { LEVELS } from './sokobanLevels';

const CELL = 30;

function keyOf(r, c) {
  return `${r},${c}`;
}

function parseLevel(grid) {
  const rows = grid.length;
  const cols = Math.max(...grid.map((row) => row.length));
  const walls = new Set();
  const targets = new Set();
  const boxes = [];
  let player = { r: 1, c: 1 };
  for (let r = 0; r < rows; r++) {
    const line = grid[r];
    for (let c = 0; c < cols; c++) {
      const ch = line[c] || '#';
      if (ch === '#') walls.add(keyOf(r, c));
      if (ch === '.' || ch === '*' || ch === '+') targets.add(keyOf(r, c));
      if (ch === '$' || ch === '*') boxes.push({ r, c });
      if (ch === '@' || ch === '+') player = { r, c };
    }
  }
  return { rows, cols, walls, targets, boxes, player };
}

function cloneState(s) {
  return {
    ...s,
    player: { ...s.player },
    boxes: s.boxes.map((b) => ({ ...b })),
  };
}

function isWon(state) {
  if (state.boxes.length !== state.targets.size) return false;
  return state.boxes.every((b) => state.targets.has(keyOf(b.r, b.c)));
}

export default function Sokoban({ onGameOver, bestScore = 0 }) {
  const canvasRef = useRef(null);
  const historyRef = useRef([]);
  const pendingActionRef = useRef(null); // 'advance' | 'retry'

  const [levelIdx, setLevelIdx] = useState(0);
  const [levelState, setLevelState] = useState(() => parseLevel(LEVELS[0].grid));
  const [moves, setMoves] = useState(0);
  const [toast, setToast] = useState(null);
  const [paused, setPaused] = useState(false);
  const [interstitial, setInterstitial] = useState(false);
  const [interstitialLabel, setInterstitialLabel] = useState('');

  const loadLevel = useCallback((idx) => {
    const wrapped = ((idx % LEVELS.length) + LEVELS.length) % LEVELS.length;
    const parsed = parseLevel(LEVELS[wrapped].grid);
    historyRef.current = [];
    setLevelState(parsed);
    setMoves(0);
    setLevelIdx(wrapped);
  }, []);

  useEffect(() => {
    loadLevel(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const wonRef = useRef(false);

  const move = useCallback(
    (dx, dy) => {
      if (paused || interstitial || wonRef.current) return;

      const prev = levelState;
      const { walls, boxes, player } = prev;
      const nr = player.r + dy;
      const nc = player.c + dx;
      if (walls.has(keyOf(nr, nc))) return;

      const boxIdx = boxes.findIndex((b) => b.r === nr && b.c === nc);
      let nextBoxes = boxes;
      if (boxIdx >= 0) {
        const br = nr + dy;
        const bc = nc + dx;
        if (walls.has(keyOf(br, bc))) return;
        if (boxes.some((b) => b.r === br && b.c === bc)) return;
        nextBoxes = boxes.map((b, i) => (i === boxIdx ? { r: br, c: bc } : b));
      }

      historyRef.current.push(cloneState(prev));
      if (historyRef.current.length > 200) historyRef.current.shift();

      const next = { ...prev, player: { r: nr, c: nc }, boxes: nextBoxes };
      setLevelState(next);
      setMoves((m) => m + 1);

      if (isWon(next)) {
        wonRef.current = true;
        setToast('LEVEL CLEAR!');
        setTimeout(() => setToast(null), 1100);
        onGameOver?.(levelIdx + 1);
        const { showInterstitial } = recordLevelPassed();
        setTimeout(() => {
          wonRef.current = false;
          if (showInterstitial) {
            pendingActionRef.current = 'advance';
            setInterstitialLabel('Level milestone ad');
            setInterstitial(true);
            setPaused(true);
          } else {
            loadLevel(levelIdx + 1);
          }
        }, 700);
      }
    },
    [paused, interstitial, levelState, levelIdx, loadLevel, onGameOver]
  );

  function undo() {
    if (paused || interstitial) return;
    const prev = historyRef.current.pop();
    if (prev) {
      setLevelState(prev);
      setMoves((m) => Math.max(0, m - 1));
    }
  }

  function resetLevel() {
    if (paused || interstitial) return;
    const { showInterstitial } = recordFail();
    if (showInterstitial) {
      pendingActionRef.current = 'retry';
      setInterstitialLabel('Ad break');
      setInterstitial(true);
      setPaused(true);
    } else {
      loadLevel(levelIdx);
    }
  }

  function closeInterstitial() {
    setInterstitial(false);
    setPaused(false);
    setToast(null);
    if (pendingActionRef.current === 'advance') {
      loadLevel(levelIdx + 1);
    } else {
      loadLevel(levelIdx);
    }
    pendingActionRef.current = null;
  }

  useEffect(() => {
    function onKey(e) {
      const map = {
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
      };
      const d = map[e.key];
      if (!d) return;
      e.preventDefault();
      move(d[0], d[1]);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [move]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { rows, cols, walls, targets, boxes, player } = levelState;

    ctx.fillStyle = '#0d0e1a';
    ctx.fillRect(0, 0, cols * CELL, rows * CELL);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * CELL;
        const y = r * CELL;
        if (walls.has(keyOf(r, c))) {
          ctx.fillStyle = '#3d4a7a';
          ctx.fillRect(x, y, CELL, CELL);
          ctx.strokeStyle = '#2a335c';
          ctx.strokeRect(x + 0.5, y + 0.5, CELL - 1, CELL - 1);
        } else {
          ctx.fillStyle = '#14162a';
          ctx.fillRect(x, y, CELL, CELL);
          if (targets.has(keyOf(r, c))) {
            ctx.fillStyle = '#f2c14e';
            ctx.beginPath();
            ctx.arc(x + CELL / 2, y + CELL / 2, 5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }

    for (const b of boxes) {
      const x = b.c * CELL;
      const y = b.r * CELL;
      const onTarget = targets.has(keyOf(b.r, b.c));
      ctx.fillStyle = onTarget ? '#66a182' : '#e4572e';
      ctx.fillRect(x + 3, y + 3, CELL - 6, CELL - 6);
      ctx.strokeStyle = onTarget ? '#3d7a55' : '#a83a1a';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 3, y + 3, CELL - 6, CELL - 6);
    }

    const px = player.c * CELL + CELL / 2;
    const py = player.r * CELL + CELL / 2;
    ctx.fillStyle = '#f2e14e';
    ctx.beginPath();
    ctx.arc(px, py, CELL / 2 - 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1b1b2f';
    ctx.beginPath();
    ctx.arc(px, py, 3, 0, Math.PI * 2);
    ctx.fill();
  }, [levelState]);

  const level = LEVELS[levelIdx];
  const canvasW = levelState.cols * CELL;
  const canvasH = levelState.rows * CELL;

  return (
    <div className="tetris-shell">
      <div className="game-header">
        <div className="stat"><span>Level</span><div className="value">{levelIdx + 1}</div></div>
        <div className="stat"><span>{level.title}</span></div>
        <div className="stat"><span>Moves</span><div className="value">{moves}</div></div>
        <div className="stat"><span>Best</span><div className="value">{Math.max(bestScore, levelIdx + 1)}</div></div>
      </div>

      <div className="canvas-container">
        <div
          className="canvas-wrapper"
          style={{ aspectRatio: `${levelState.cols} / ${levelState.rows}` }}
        >
          <canvas ref={canvasRef} width={canvasW} height={canvasH} />
          {toast && <div className="win-toast">{toast}</div>}
        </div>
      </div>

      <div className="snake-dpad">
        <button className="snake-dpad-btn snake-dpad-up" onClick={() => move(0, -1)} aria-label="Move up">▲</button>
        <button className="snake-dpad-btn snake-dpad-left" onClick={() => move(-1, 0)} aria-label="Move left">◀</button>
        <button className="snake-dpad-btn snake-dpad-pause" onClick={undo} aria-label="Undo">↺</button>
        <button className="snake-dpad-btn snake-dpad-right" onClick={() => move(1, 0)} aria-label="Move right">▶</button>
        <button className="snake-dpad-btn snake-dpad-down" onClick={() => move(0, 1)} aria-label="Move down">▼</button>
      </div>

      <button className="btn btn-ghost" style={{ marginTop: 10 }} onClick={resetLevel}>
        Reset level
      </button>

      {interstitial && (
        <InterstitialAdSlot label={interstitialLabel} onClose={closeInterstitial} />
      )}
    </div>
  );
}
