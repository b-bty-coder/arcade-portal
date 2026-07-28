import { useEffect, useRef, useState } from 'react';
import { RewardedAdSlot, InterstitialAdSlot } from '../components/AdSlot';
import { recordFail } from '../lib/adFrequency';

const GRID = 18;
const CELL = 20;
const CANVAS_SIZE = GRID * CELL;
const TICK_MS = 130;

function randomCell(exclude) {
  let cell;
  do {
    cell = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
  } while (exclude.some((c) => c.x === cell.x && c.y === cell.y));
  return cell;
}

const START_SNAKE = [{ x: 8, y: 9 }, { x: 7, y: 9 }, { x: 6, y: 9 }];

export default function Snake({ onGameOver, bestScore = 0 }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const stateRef = useRef(null);
  const hasRevivedRef = useRef(false);
  const [squareSize, setSquareSize] = useState(0);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState('ready'); // ready | playing | paused | dying | interstitial | over

  function reset() {
    const snake = [...START_SNAKE];
    stateRef.current = {
      snake,
      dir: { x: 1, y: 0 },
      nextDir: { x: 1, y: 0 },
      food: randomCell(snake),
    };
    hasRevivedRef.current = false;
    setScore(0);
    setStatus('playing');
  }

  function togglePause() {
    setStatus((prev) => (prev === 'playing' ? 'paused' : prev === 'paused' ? 'playing' : prev));
  }

  function setDirection(next) {
    const s = stateRef.current;
    if (!s || status !== 'playing') return;
    if (next.x === -s.dir.x && next.y === -s.dir.y) return;
    s.nextDir = next;
  }

  function buildRevivedSnake(length) {
    // Lay the tail out in a zigzag (boustrophedon) starting from the
    // head, wrapping to the next row whenever it hits an edge. This
    // guarantees no self-overlap no matter how long the snake is —
    // a simple straight-line wrap breaks (segments land on top of
    // each other) once the snake is longer than the board is wide.
    const startX = 8;
    const startY = 9;
    const cells = [{ x: startX, y: startY }];
    let x = startX;
    let y = startY;
    let dir = -1; // tail extends leftwards from the head first
    for (let i = 1; i < length; i++) {
      x += dir;
      if (x < 0) {
        y = (y + 1) % GRID;
        dir = 1;
        x = 0;
      } else if (x >= GRID) {
        y = (y + 1) % GRID;
        dir = -1;
        x = GRID - 1;
      }
      cells.push({ x, y });
    }
    return cells;
  }

  function reviveSnake() {
    const s = stateRef.current;
    const keepLength = s.snake.length;
    // Rebuild the snake at the same length it had before dying, just
    // moved back to a safe spot in the middle of the board.
    const freshSnake = buildRevivedSnake(keepLength);
    s.snake = freshSnake;
    s.dir = { x: 1, y: 0 };
    s.nextDir = { x: 1, y: 0 };
    if (freshSnake.some((seg) => seg.x === s.food.x && seg.y === s.food.y)) {
      s.food = randomCell(freshSnake);
    }
    hasRevivedRef.current = true;
    setStatus('playing');
  }

  function finalizeGameOver() {
    const { showInterstitial } = recordFail();
    if (showInterstitial) {
      setStatus('interstitial');
    } else {
      setStatus('over');
      onGameOver?.(score);
    }
  }

  function finishAfterInterstitial() {
    setStatus('over');
    onGameOver?.(score);
  }

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function measure() {
      const style = getComputedStyle(el);
      const padX = (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0);
      const padY = (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0);
      const availW = el.clientWidth - padX;
      const availH = el.clientHeight - padY;
      setSquareSize(Math.max(0, Math.min(availW, availH)));
    }
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let raf;
    let last = 0;

    function draw() {
      const s = stateRef.current;
      ctx.fillStyle = '#1b1b2f';
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      if (!s) return;

      ctx.fillStyle = '#e4572e';
      ctx.fillRect(s.food.x * CELL + 2, s.food.y * CELL + 2, CELL - 4, CELL - 4);

      s.snake.forEach((seg, i) => {
        ctx.fillStyle = i === 0 ? '#f2c14e' : '#66a182';
        ctx.fillRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2);
      });
    }

    function tick(ts) {
      raf = requestAnimationFrame(tick);
      if (status !== 'playing') { draw(); return; }
      if (ts - last < TICK_MS) return;
      last = ts;

      const s = stateRef.current;
      s.dir = s.nextDir;
      const head = { x: s.snake[0].x + s.dir.x, y: s.snake[0].y + s.dir.y };

      const hitWall = head.x < 0 || head.y < 0 || head.x >= GRID || head.y >= GRID;
      const hitSelf = s.snake.some((seg) => seg.x === head.x && seg.y === head.y);

      if (hitWall || hitSelf) {
        if (!hasRevivedRef.current) {
          setStatus('dying');
        } else {
          finalizeGameOver();
        }
        draw();
        return;
      }

      s.snake.unshift(head);
      if (head.x === s.food.x && head.y === s.food.y) {
        s.food = randomCell(s.snake);
        setScore((prev) => prev + 1);
      } else {
        s.snake.pop();
      }
      draw();
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    function handleKey(e) {
      if (e.key === ' ' || e.key === 'Escape') {
        e.preventDefault();
        togglePause();
        return;
      }
      const map = {
        ArrowUp: { x: 0, y: -1 }, w: { x: 0, y: -1 },
        ArrowDown: { x: 0, y: 1 }, s: { x: 0, y: 1 },
        ArrowLeft: { x: -1, y: 0 }, a: { x: -1, y: 0 },
        ArrowRight: { x: 1, y: 0 }, d: { x: 1, y: 0 },
      };
      const next = map[e.key];
      if (!next) return;
      e.preventDefault();
      setDirection(next);
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const touchStart = useRef(null);
  function handleTouchStart(e) {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  }
  function handleTouchEnd(e) {
    if (!touchStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    if (!stateRef.current) return;
    let next;
    if (Math.abs(dx) > Math.abs(dy)) next = { x: dx > 0 ? 1 : -1, y: 0 };
    else next = { x: 0, y: dy > 0 ? 1 : -1 };
    setDirection(next);
  }

  return (
    <div className="tetris-shell">
      <div className="game-header">
        <div className="stat"><span>Score</span><div className="value">{score}</div></div>
        <div className="stat"><span>Best</span><div className="value">{Math.max(bestScore, score)}</div></div>
        {(status === 'playing' || status === 'paused') && (
          <div className="stat">
            <button className="icon-btn" onClick={togglePause} aria-label={status === 'paused' ? 'Resume' : 'Pause'}>
              {status === 'paused' ? '▶' : '⏸'}
            </button>
          </div>
        )}
      </div>

      <div className="canvas-container" ref={containerRef} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <div className="canvas-wrapper" style={{ width: squareSize || '100%', height: squareSize || '100%' }}>
          <canvas ref={canvasRef} width={CANVAS_SIZE} height={CANVAS_SIZE} />

          {status === 'dying' && (
            <div className="tetris-overlay">
              <p>You hit something!</p>
              <RewardedAdSlot onRewardClaim={reviveSnake} rewardLabel="a second chance" />
              <button className="btn btn-ghost" onClick={finalizeGameOver}>
                No thanks, end game
              </button>
            </div>
          )}

          {status !== 'playing' && status !== 'dying' && status !== 'interstitial' && (
            <div className="tetris-overlay">
              <p>
                {status === 'over'
                  ? 'Game Over'
                  : status === 'paused'
                  ? 'Paused'
                  : 'Arrow keys / swipe / D-pad to move'}
              </p>
              {status === 'over' && <span>Score: {score}</span>}
              <button
                className="btn btn-primary"
                onClick={status === 'paused' ? togglePause : reset}
              >
                {status === 'over' ? 'Play again' : status === 'paused' ? 'Resume' : 'Start'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="snake-dpad">
        <button className="snake-dpad-btn snake-dpad-up" onClick={() => setDirection({ x: 0, y: -1 })} aria-label="Move up">▲</button>
        <button className="snake-dpad-btn snake-dpad-left" onClick={() => setDirection({ x: -1, y: 0 })} aria-label="Move left">◀</button>
        <button className="snake-dpad-btn snake-dpad-pause" onClick={togglePause} aria-label={status === 'paused' ? 'Resume' : 'Pause'}>
          {status === 'paused' ? '▶' : '⏸'}
        </button>
        <button className="snake-dpad-btn snake-dpad-right" onClick={() => setDirection({ x: 1, y: 0 })} aria-label="Move right">▶</button>
        <button className="snake-dpad-btn snake-dpad-down" onClick={() => setDirection({ x: 0, y: 1 })} aria-label="Move down">▼</button>
      </div>

      {status === 'interstitial' && (
        <InterstitialAdSlot onClose={finishAfterInterstitial} />
      )}
    </div>
  );
}
