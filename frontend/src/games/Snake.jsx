import { useEffect, useRef, useState } from 'react';

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

export default function Snake({ onGameOver, bestScore = 0 }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const stateRef = useRef(null);
  const [squareSize, setSquareSize] = useState(0);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState('ready'); // ready | playing | paused | over

  function reset() {
    const snake = [{ x: 8, y: 9 }, { x: 7, y: 9 }, { x: 6, y: 9 }];
    stateRef.current = {
      snake,
      dir: { x: 1, y: 0 },
      nextDir: { x: 1, y: 0 },
      food: randomCell(snake),
    };
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

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function measure() {
      const w = el.clientWidth;
      const h = el.clientHeight;
      setSquareSize(Math.max(0, Math.min(w, h)));
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
        setStatus('over');
        onGameOver?.(s.snake.length - 3);
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

      <div className="canvas-container" ref={containerRef}>
        <div
          className="canvas-wrapper"
          style={{ width: squareSize || '100%', height: squareSize || '100%' }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <canvas ref={canvasRef} width={CANVAS_SIZE} height={CANVAS_SIZE} />
          {status !== 'playing' && (
            <div className="game-overlay">
              <p className="display-sm" style={{ color: '#f5f0e6' }}>
                {status === 'over'
                  ? `GAME OVER — SCORE ${score}`
                  : status === 'paused'
                  ? 'PAUSED'
                  : 'ARROW KEYS / SWIPE / D-PAD TO MOVE'}
              </p>
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
    </div>
  );
}
