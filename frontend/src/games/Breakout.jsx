import { useEffect, useRef, useState, useCallback } from 'react';
import { RewardedAdSlot, InterstitialAdSlot } from '../components/AdSlot';
import { recordFail, recordLevelPassed } from '../lib/adFrequency';

const CANVAS_W = 300;
const CANVAS_H = 380;
const ROWS = 5;
const COLS = 8;
const BRICK_PAD = 5;
const BRICK_TOP = 40;
const BRICK_LEFT = 8;
const BRICK_W = (CANVAS_W - BRICK_LEFT * 2 - BRICK_PAD * (COLS - 1)) / COLS;
const BRICK_H = 12;
const PADDLE_W = 60;
const PADDLE_H = 10;
const BALL_R = 5;

const ROW_COLORS = ['#e4572e', '#f2c14e', '#66a182', '#7b4b94', '#e07ad0'];

function makeBricks() {
  const bricks = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      bricks.push({
        x: BRICK_LEFT + c * (BRICK_W + BRICK_PAD),
        y: BRICK_TOP + r * (BRICK_H + BRICK_PAD),
        w: BRICK_W,
        h: BRICK_H,
        alive: true,
        color: ROW_COLORS[r % ROW_COLORS.length],
      });
    }
  }
  return bricks;
}

function makePaddle() {
  return { x: (CANVAS_W - PADDLE_W) / 2, y: CANVAS_H - 24, w: PADDLE_W, h: PADDLE_H };
}

function makeBall(paddle, level) {
  const speed = 3.2 + (level - 1) * 0.35;
  return { x: paddle.x + paddle.w / 2, y: paddle.y - BALL_R - 1, dx: 0, dy: 0, speed };
}

export default function Breakout({ onGameOver, bestScore = 0 }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const paddleRef = useRef(makePaddle());
  const ballRef = useRef(null);
  const bricksRef = useRef(makeBricks());
  const launchedRef = useRef(false);
  const leftDownRef = useRef(false);
  const rightDownRef = useRef(false);
  const hasRevivedRef = useRef(false);
  const livesRef = useRef(3);
  const levelRef = useRef(1);
  const clearingRef = useRef(false);

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [status, setStatus] = useState('ready'); // ready | playing | dying | interstitial | over
  const [toast, setToast] = useState(null);

  ballRef.current = ballRef.current || makeBall(paddleRef.current, 1);

  const startNewGame = useCallback(() => {
    paddleRef.current = makePaddle();
    bricksRef.current = makeBricks();
    ballRef.current = makeBall(paddleRef.current, 1);
    launchedRef.current = false;
    hasRevivedRef.current = false;
    livesRef.current = 3;
    levelRef.current = 1;
    clearingRef.current = false;
    setScore(0);
    setLives(3);
    setLevel(1);
    setStatus('ready');
  }, []);

  function launchBall() {
    if (status !== 'ready' && status !== 'playing') return;
    if (!launchedRef.current) {
      launchedRef.current = true;
      const b = ballRef.current;
      b.dx = b.speed * 0.5;
      b.dy = -b.speed;
      setStatus('playing');
    }
  }

  function loseLife() {
    launchedRef.current = false;
    livesRef.current = Math.max(0, livesRef.current - 1);
    setLives(livesRef.current);
    if (livesRef.current <= 0) {
      if (!hasRevivedRef.current) {
        setStatus('dying');
      } else {
        finalizeGameOver();
      }
    } else {
      paddleRef.current = makePaddle();
      ballRef.current = makeBall(paddleRef.current, levelRef.current);
    }
  }

  function reviveWithAd() {
    hasRevivedRef.current = true;
    livesRef.current = 1;
    setLives(1);
    paddleRef.current = makePaddle();
    ballRef.current = makeBall(paddleRef.current, levelRef.current);
    launchedRef.current = false;
    setStatus('ready');
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

  function closeLevelInterstitial() {
    setStatus('ready');
  }

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'ArrowLeft') leftDownRef.current = true;
      if (e.key === 'ArrowRight') rightDownRef.current = true;
      if (e.key === ' ') {
        e.preventDefault();
        launchBall();
      }
    }
    function onKeyUp(e) {
      if (e.key === 'ArrowLeft') leftDownRef.current = false;
      if (e.key === 'ArrowRight') rightDownRef.current = false;
    }
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKeyUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  function movePaddleTo(clientX) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scale = CANVAS_W / rect.width;
    const x = (clientX - rect.left) * scale;
    const p = paddleRef.current;
    p.x = Math.min(Math.max(x - p.w / 2, 0), CANVAS_W - p.w);
  }

  function onPointerDown(e) {
    movePaddleTo(e.clientX);
    launchBall();
  }
  function onPointerMove(e) {
    if (e.buttons === 0 && e.pointerType === 'mouse') return;
    movePaddleTo(e.clientX);
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    function drawRect(x, y, w, h, r, color) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    }

    function draw() {
      ctx.fillStyle = '#0d0e1a';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      for (const b of bricksRef.current) {
        if (!b.alive) continue;
        drawRect(b.x, b.y, b.w, b.h, 2, b.color);
      }

      const paddle = paddleRef.current;
      drawRect(paddle.x, paddle.y, paddle.w, paddle.h, 5, '#f5f0e6');

      const ball = ballRef.current;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
      ctx.fillStyle = '#f2c14e';
      ctx.fill();

      if (status === 'ready') {
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.fillStyle = '#f5f0e6';
        ctx.font = 'bold 13px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('TAP OR SPACE TO LAUNCH', CANVAS_W / 2, CANVAS_H - 60);
      }
    }

    function update() {
      const paddle = paddleRef.current;
      if (leftDownRef.current) paddle.x = Math.max(paddle.x - 6, 0);
      if (rightDownRef.current) paddle.x = Math.min(paddle.x + 6, CANVAS_W - paddle.w);

      const ball = ballRef.current;
      if (!launchedRef.current) {
        ball.x = paddle.x + paddle.w / 2;
        ball.y = paddle.y - BALL_R - 1;
        return;
      }

      ball.x += ball.dx;
      ball.y += ball.dy;

      if (ball.x - BALL_R < 0) { ball.x = BALL_R; ball.dx *= -1; }
      if (ball.x + BALL_R > CANVAS_W) { ball.x = CANVAS_W - BALL_R; ball.dx *= -1; }
      if (ball.y - BALL_R < 0) { ball.y = BALL_R; ball.dy *= -1; }

      if (
        ball.y + BALL_R >= paddle.y &&
        ball.y + BALL_R <= paddle.y + paddle.h + 6 &&
        ball.x >= paddle.x &&
        ball.x <= paddle.x + paddle.w &&
        ball.dy > 0
      ) {
        const hit = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
        const angle = hit * (Math.PI / 3);
        ball.dx = ball.speed * Math.sin(angle);
        ball.dy = -Math.abs(ball.speed * Math.cos(angle));
      }

      for (const b of bricksRef.current) {
        if (!b.alive) continue;
        if (
          ball.x + BALL_R > b.x && ball.x - BALL_R < b.x + b.w &&
          ball.y + BALL_R > b.y && ball.y - BALL_R < b.y + b.h
        ) {
          b.alive = false;
          setScore((s) => s + 10);
          const overlapX = Math.min(ball.x + BALL_R - b.x, b.x + b.w - (ball.x - BALL_R));
          const overlapY = Math.min(ball.y + BALL_R - b.y, b.y + b.h - (ball.y - BALL_R));
          if (overlapX < overlapY) ball.dx *= -1; else ball.dy *= -1;
          break;
        }
      }

      if (ball.y - BALL_R > CANVAS_H) {
        loseLife();
      } else if (!clearingRef.current && bricksRef.current.every((b) => !b.alive)) {
        clearingRef.current = true;
        setToast('LEVEL CLEAR!');
        setTimeout(() => setToast(null), 1100);
        const nextLevel = levelRef.current + 1;
        levelRef.current = nextLevel;
        setLevel(nextLevel);
        onGameOver?.(score + (nextLevel - 1) * 100);
        const { showInterstitial } = recordLevelPassed();
        setTimeout(() => {
          bricksRef.current = makeBricks();
          paddleRef.current = makePaddle();
          ballRef.current = makeBall(paddleRef.current, nextLevel);
          launchedRef.current = false;
          clearingRef.current = false;
          if (showInterstitial) {
            setStatus('levelInterstitial');
          } else {
            setStatus('ready');
          }
        }, 700);
      }
    }

    function loop() {
      rafRef.current = requestAnimationFrame(loop);
      if (status === 'playing') update();
      draw();
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

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
          style={{ aspectRatio: `${CANVAS_W} / ${CANVAS_H}`, touchAction: 'none' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
        >
          <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} />
          {toast && <div className="win-toast">{toast}</div>}

          {status === 'dying' && (
            <div className="tetris-overlay" onPointerDown={(e) => e.stopPropagation()}>
              <p>Out of lives!</p>
              <span>Score: {score}</span>
              <RewardedAdSlot onRewardClaim={reviveWithAd} rewardLabel="1 extra life" />
              <button className="btn btn-ghost" onClick={finalizeGameOver}>
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

      <div
        className="breakout-slide-strip"
        style={{ touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
      >
        SLIDE TO MOVE · TAP TO LAUNCH
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
