import { useEffect, useRef, useState, useCallback } from 'react';
import { RewardedAdSlot, InterstitialAdSlot } from '../components/AdSlot';
import { recordFail, recordLevelPassed } from '../lib/adFrequency';

const CELL = 24;

const MAZE = [
  '#############',
  '#...........#',
  '#.###.#.###.#',
  '#...........#',
  '#.#.#####.#.#',
  '#.#.......#.#',
  '#.#.#####.#.#',
  '#...........#',
  '#.#.#####.#.#',
  '#.#.......#.#',
  '#.#.#####.#.#',
  '#...........#',
  '#.###.#.###.#',
  '#o.........o#',
  '#############',
];
const ROWS = MAZE.length;
const COLS = MAZE[0].length;

const PLAYER_START = { r: 11, c: 6 };
const GHOST_STARTS = [
  { r: 5, c: 5, color: '#e4572e' },
  { r: 5, c: 6, color: '#e07ad0' },
  { r: 5, c: 7, color: '#6fd9e8' },
];
const PLAYER_TICK_BASE = 170;
const GHOST_TICK_BASE = 190;
const FRIGHT_MS = 6000;

const DIRS = {
  ArrowUp: { dx: 0, dy: -1 },
  ArrowDown: { dx: 0, dy: 1 },
  ArrowLeft: { dx: -1, dy: 0 },
  ArrowRight: { dx: 1, dy: 0 },
};

function isWall(r, c) {
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return true;
  return MAZE[r][c] === '#';
}

function buildDots() {
  const dots = [];
  let power = [];
  let total = 0;
  for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) {
      const ch = MAZE[r][c];
      const has = ch === '.' || ch === 'o';
      row.push(has);
      if (has) total++;
      if (ch === 'o') power.push([r, c]);
    }
    dots.push(row);
  }
  return { dots, power, total };
}

function openNeighbors(r, c, excludeDir) {
  const out = [];
  for (const key of Object.keys(DIRS)) {
    const { dx, dy } = DIRS[key];
    if (excludeDir && dx === -excludeDir.dx && dy === -excludeDir.dy) continue;
    const nr = r + dy;
    const nc = c + dx;
    if (!isWall(nr, nc)) out.push({ dx, dy, r: nr, c: nc });
  }
  return out;
}

export default function Pacman({ onGameOver, bestScore = 0 }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const lastTsRef = useRef(0);
  const playerTimerRef = useRef(0);
  const ghostTimerRef = useRef(0);
  const frightTimerRef = useRef(0);
  const mouthPhaseRef = useRef(0);

  const dotsRef = useRef(null);
  const dotsLeftRef = useRef(0);
  const playerRef = useRef({ r: PLAYER_START.r, c: PLAYER_START.c, dir: { dx: 0, dy: 0 }, nextDir: { dx: 0, dy: 0 } });
  const ghostsRef = useRef([]);
  const frightenedRef = useRef(false);
  const livesRef = useRef(3);
  const hasRevivedRef = useRef(false);

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [status, setStatus] = useState('ready'); // ready | playing | over
  const [paused, setPaused] = useState(false);
  const [toast, setToast] = useState(null);
  const [overStage, setOverStage] = useState(null); // null | 'choice' | 'interstitial' | 'final'
  const [levelInterstitial, setLevelInterstitial] = useState(false);

  const resetPositions = useCallback(() => {
    playerRef.current = { r: PLAYER_START.r, c: PLAYER_START.c, dir: { dx: 0, dy: 0 }, nextDir: { dx: 0, dy: 0 } };
    ghostsRef.current = GHOST_STARTS.map((g) => ({ ...g, dir: { dx: 0, dy: -1 } }));
    frightenedRef.current = false;
    frightTimerRef.current = 0;
  }, []);

  const setupGame = useCallback(() => {
    const built = buildDots();
    dotsRef.current = built.dots;
    dotsLeftRef.current = built.total;
    resetPositions();
  }, [resetPositions]);

  function start() {
    setupGame();
    setScore(0);
    livesRef.current = 3;
    setLives(3);
    setLevel(1);
    hasRevivedRef.current = false;
    setOverStage(null);
    setPaused(false);
    setStatus('playing');
  }

  function restart() {
    start();
  }

  function handleContinueWithAd() {
    livesRef.current = 1;
    setLives(1);
    hasRevivedRef.current = true;
    resetPositions();
    setOverStage(null);
    setPaused(false);
    setStatus('playing');
  }

  function declineAdAndMaybeInterstitial() {
    const { showInterstitial } = recordFail();
    if (showInterstitial) {
      setOverStage('interstitial');
    } else {
      setOverStage('final');
      setStatus('over');
      onGameOver?.(score);
    }
  }

  function finishAfterGameOverInterstitial() {
    setOverStage('final');
    setStatus('over');
    onGameOver?.(score);
  }

  function closeLevelInterstitial() {
    setLevelInterstitial(false);
    setPaused(false);
  }

  const speedFactor = 1 + (level - 1) * 0.06;
  const playerTick = PLAYER_TICK_BASE / speedFactor;
  const ghostTick = GHOST_TICK_BASE / speedFactor;

  useEffect(() => {
    function onKey(e) {
      const d = DIRS[e.key];
      if (!d) return;
      e.preventDefault();
      if (status === 'ready') start();
      playerRef.current.nextDir = d;
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  function press(dir) {
    if (status === 'ready') start();
    playerRef.current.nextDir = dir;
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    function movePlayer() {
      const p = playerRef.current;
      const nd = p.nextDir;
      if ((nd.dx || nd.dy) && !isWall(p.r + nd.dy, p.c + nd.dx)) {
        p.dir = nd;
      }
      if ((p.dir.dx || p.dir.dy) && !isWall(p.r + p.dir.dy, p.c + p.dir.dx)) {
        p.r += p.dir.dy;
        p.c += p.dir.dx;
      }
      if (dotsRef.current[p.r][p.c]) {
        dotsRef.current[p.r][p.c] = false;
        dotsLeftRef.current -= 1;
        const wasPower = MAZE[p.r][p.c] === 'o';
        setScore((s) => s + (wasPower ? 50 : 10));
        if (wasPower) {
          frightenedRef.current = true;
          frightTimerRef.current = FRIGHT_MS;
        }
        if (dotsLeftRef.current <= 0) {
          setLevel((lv) => {
            const nextLevel = lv + 1;
            const { showInterstitial } = recordLevelPassed();
            if (showInterstitial) {
              setPaused(true);
              setLevelInterstitial(true);
            }
            return nextLevel;
          });
          setToast('LEVEL CLEAR!');
          setTimeout(() => setToast(null), 1200);
          const built = buildDots();
          dotsRef.current = built.dots;
          dotsLeftRef.current = built.total;
          resetPositions();
        }
      }
    }

    function moveGhosts() {
      const p = playerRef.current;
      for (const g of ghostsRef.current) {
        const neighbors = openNeighbors(g.r, g.c, g.dir);
        const options = neighbors.length > 0 ? neighbors : openNeighbors(g.r, g.c, null);
        if (options.length === 0) continue;
        let choice;
        if (frightenedRef.current) {
          choice = options[Math.floor(Math.random() * options.length)];
        } else {
          choice = options.reduce((best, opt) => {
            const d = Math.abs(opt.r - p.r) + Math.abs(opt.c - p.c);
            const bd = Math.abs(best.r - p.r) + Math.abs(best.c - p.c);
            if (d < bd) return opt;
            if (d === bd && Math.random() < 0.5) return opt;
            return best;
          }, options[0]);
        }
        g.dir = { dx: choice.dx, dy: choice.dy };
        g.r = choice.r;
        g.c = choice.c;
      }
    }

    function checkGhostCollisions() {
      const p = playerRef.current;
      for (const g of ghostsRef.current) {
        if (g.r === p.r && g.c === p.c) {
          if (frightenedRef.current) {
            setScore((s) => s + 200);
            g.r = 5;
            g.c = 5 + Math.floor(Math.random() * 3);
          } else {
            livesRef.current = Math.max(0, livesRef.current - 1);
            setLives(livesRef.current);
            if (livesRef.current <= 0) {
              setPaused(true);
              if (!hasRevivedRef.current) {
                setOverStage('choice');
              } else {
                const { showInterstitial } = recordFail();
                if (showInterstitial) {
                  setOverStage('interstitial');
                } else {
                  setOverStage('final');
                  setStatus('over');
                  onGameOver?.(score);
                }
              }
            } else {
              resetPositions();
            }
          }
        }
      }
    }

    function draw() {
      ctx.fillStyle = '#0d0e1a';
      ctx.fillRect(0, 0, COLS * CELL, ROWS * CELL);

      ctx.fillStyle = '#1a3a8f';
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (MAZE[r][c] === '#') {
            ctx.fillRect(c * CELL, r * CELL, CELL, CELL);
          }
        }
      }

      const dots = dotsRef.current;
      if (dots) {
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            if (!dots[r][c]) continue;
            const cx = c * CELL + CELL / 2;
            const cy = r * CELL + CELL / 2;
            if (MAZE[r][c] === 'o') {
              ctx.fillStyle = '#f2c14e';
              ctx.beginPath();
              ctx.arc(cx, cy, 5, 0, Math.PI * 2);
              ctx.fill();
            } else {
              ctx.fillStyle = '#e4c98a';
              ctx.beginPath();
              ctx.arc(cx, cy, 2, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      }

      for (const g of ghostsRef.current) {
        const cx = g.c * CELL + CELL / 2;
        const cy = g.r * CELL + CELL / 2;
        ctx.fillStyle = frightenedRef.current ? '#3d5ce0' : g.color;
        ctx.beginPath();
        ctx.arc(cx, cy - 3, CELL / 2 - 3, Math.PI, 0);
        ctx.lineTo(cx + CELL / 2 - 3, cy + CELL / 2 - 4);
        ctx.lineTo(cx + CELL / 4, cy + CELL / 2 - 8);
        ctx.lineTo(cx, cy + CELL / 2 - 4);
        ctx.lineTo(cx - CELL / 4, cy + CELL / 2 - 8);
        ctx.lineTo(cx - CELL / 2 + 3, cy + CELL / 2 - 4);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(cx - 4, cy - 4, 3, 0, Math.PI * 2);
        ctx.arc(cx + 4, cy - 4, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1b1b2f';
        ctx.beginPath();
        ctx.arc(cx - 4, cy - 4, 1.4, 0, Math.PI * 2);
        ctx.arc(cx + 4, cy - 4, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }

      const p = playerRef.current;
      const pcx = p.c * CELL + CELL / 2;
      const pcy = p.r * CELL + CELL / 2;
      let angle = 0;
      if (p.dir.dx === 1) angle = 0;
      else if (p.dir.dx === -1) angle = Math.PI;
      else if (p.dir.dy === -1) angle = -Math.PI / 2;
      else if (p.dir.dy === 1) angle = Math.PI / 2;
      const mouth = 0.18 + Math.abs(Math.sin(mouthPhaseRef.current)) * 0.22;
      ctx.fillStyle = '#f2e14e';
      ctx.beginPath();
      ctx.moveTo(pcx, pcy);
      ctx.arc(pcx, pcy, CELL / 2 - 2, angle + mouth * Math.PI, angle + (2 - mouth) * Math.PI);
      ctx.closePath();
      ctx.fill();

      if (status === 'ready') {
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(0, 0, COLS * CELL, ROWS * CELL);
        ctx.fillStyle = '#f5f0e6';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('TAP OR PRESS ARROW TO START', (COLS * CELL) / 2, (ROWS * CELL) / 2);
      }
    }

    function loop(ts) {
      rafRef.current = requestAnimationFrame(loop);
      if (!lastTsRef.current) lastTsRef.current = ts;
      const dt = ts - lastTsRef.current;
      lastTsRef.current = ts;

      if (status === 'playing' && !paused) {
        mouthPhaseRef.current += dt / 120;

        if (frightenedRef.current) {
          frightTimerRef.current -= dt;
          if (frightTimerRef.current <= 0) frightenedRef.current = false;
        }

        playerTimerRef.current += dt;
        if (playerTimerRef.current >= playerTick) {
          playerTimerRef.current = 0;
          movePlayer();
          checkGhostCollisions();
        }

        ghostTimerRef.current += dt;
        const currentGhostTick = frightenedRef.current ? ghostTick * 1.4 : ghostTick;
        if (ghostTimerRef.current >= currentGhostTick) {
          ghostTimerRef.current = 0;
          moveGhosts();
          checkGhostCollisions();
        }
      }

      draw();
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, paused, playerTick, ghostTick]);

  useEffect(() => {
    setupGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canvasW = COLS * CELL;
  const canvasH = ROWS * CELL;

  return (
    <div className="tetris-shell">
      <div className="game-header">
        <div className="stat"><span>Level</span><div className="value">{level}</div></div>
        <div className="stat"><span>Score</span><div className="value">{score}</div></div>
        <div className="stat"><span>Lives</span><div className="value">{lives}</div></div>
        <div className="stat"><span>Best</span><div className="value">{Math.max(bestScore, score)}</div></div>
      </div>

      <div className="canvas-container">
        <div
          className="canvas-wrapper"
          style={{ aspectRatio: `${COLS} / ${ROWS}` }}
          onPointerDown={() => {
            if (status === 'ready') start();
          }}
        >
          <canvas ref={canvasRef} width={canvasW} height={canvasH} />
          {toast && <div className="win-toast">{toast}</div>}

          {overStage === 'choice' && (
            <div className="tetris-overlay" onPointerDown={(e) => e.stopPropagation()}>
              <p>Out of lives!</p>
              <span>Score: {score}</span>
              <RewardedAdSlot onRewardClaim={handleContinueWithAd} rewardLabel="1 extra life" />
              <button className="btn btn-ghost" onClick={declineAdAndMaybeInterstitial}>
                No thanks, restart
              </button>
            </div>
          )}

          {overStage === 'final' && (
            <div className="tetris-overlay" onPointerDown={(e) => e.stopPropagation()}>
              <p>Game Over</p>
              <span>Score: {score}</span>
              <button className="btn btn-primary" onClick={restart}>Play again</button>
            </div>
          )}
        </div>
      </div>

      <div className="snake-dpad">
        <button className="snake-dpad-btn snake-dpad-up" onClick={() => press({ dx: 0, dy: -1 })} aria-label="Move up">▲</button>
        <button className="snake-dpad-btn snake-dpad-left" onClick={() => press({ dx: -1, dy: 0 })} aria-label="Move left">◀</button>
        <button className="snake-dpad-btn snake-dpad-right" onClick={() => press({ dx: 1, dy: 0 })} aria-label="Move right">▶</button>
        <button className="snake-dpad-btn snake-dpad-down" onClick={() => press({ dx: 0, dy: 1 })} aria-label="Move down">▼</button>
      </div>

      {overStage === 'interstitial' && (
        <InterstitialAdSlot onClose={finishAfterGameOverInterstitial} />
      )}
      {levelInterstitial && (
        <InterstitialAdSlot onClose={closeLevelInterstitial} label="Level milestone ad" />
      )}
    </div>
  );
}
