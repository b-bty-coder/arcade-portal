import { useEffect, useRef, useState, useCallback } from 'react';

const CANVAS_W = 288;
const CANVAS_H = 512;
const GROUND_H = 40;
const BIRD_X = 70;
const BIRD_R = 12;
const GRAVITY = 1400; // px/s^2
const FLAP_VELOCITY = -380; // px/s
const PIPE_W = 52;
const PIPE_GAP = 130;
const PIPE_SPEED = 130; // px/s
const PIPE_SPACING = 190; // px between pipe spawns

function randomGapY() {
  const margin = 60;
  return margin + Math.random() * (CANVAS_H - GROUND_H - margin * 2 - PIPE_GAP) + PIPE_GAP / 2;
}

export default function FlappyBird({ onGameOver, bestScore = 0 }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const lastTsRef = useRef(0);
  const birdRef = useRef({ y: CANVAS_H / 2, vel: 0, rot: 0 });
  const pipesRef = useRef([]);
  const groundOffsetRef = useRef(0);

  const [score, setScore] = useState(0);
  const [status, setStatus] = useState('ready'); // ready | playing | over

  const flap = useCallback(() => {
    if (status === 'over') return;
    if (status === 'ready') {
      birdRef.current = { y: CANVAS_H / 2, vel: FLAP_VELOCITY, rot: 0 };
      pipesRef.current = [{ x: CANVAS_W + 40, gapY: randomGapY(), passed: false }];
      setScore(0);
      setStatus('playing');
      return;
    }
    birdRef.current.vel = FLAP_VELOCITY;
  }, [status]);

  function restart() {
    birdRef.current = { y: CANVAS_H / 2, vel: 0, rot: 0 };
    pipesRef.current = [];
    groundOffsetRef.current = 0;
    setScore(0);
    setStatus('ready');
  }

  useEffect(() => {
    function onKey(e) {
      if (e.key === ' ' || e.key === 'ArrowUp') {
        e.preventDefault();
        flap();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flap]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    function checkCollision() {
      const bird = birdRef.current;
      if (bird.y + BIRD_R >= CANVAS_H - GROUND_H || bird.y - BIRD_R <= 0) return true;
      for (const pipe of pipesRef.current) {
        const withinX = BIRD_X + BIRD_R > pipe.x && BIRD_X - BIRD_R < pipe.x + PIPE_W;
        if (!withinX) continue;
        const gapTop = pipe.gapY - PIPE_GAP / 2;
        const gapBottom = pipe.gapY + PIPE_GAP / 2;
        if (bird.y - BIRD_R < gapTop || bird.y + BIRD_R > gapBottom) return true;
      }
      return false;
    }

    function draw(ts) {
      ctx.fillStyle = '#4a90c2';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      ctx.fillStyle = '#66a182';
      for (const pipe of pipesRef.current) {
        const gapTop = pipe.gapY - PIPE_GAP / 2;
        const gapBottom = pipe.gapY + PIPE_GAP / 2;
        ctx.fillRect(pipe.x, 0, PIPE_W, gapTop);
        ctx.fillRect(pipe.x, gapBottom, PIPE_W, CANVAS_H - GROUND_H - gapBottom);
        ctx.strokeStyle = '#3d3d63';
        ctx.lineWidth = 2;
        ctx.strokeRect(pipe.x, 0, PIPE_W, gapTop);
        ctx.strokeRect(pipe.x, gapBottom, PIPE_W, CANVAS_H - GROUND_H - gapBottom);
      }

      ctx.fillStyle = '#e4c98a';
      ctx.fillRect(0, CANVAS_H - GROUND_H, CANVAS_W, GROUND_H);
      ctx.fillStyle = '#c9a86a';
      const stripeW = 24;
      const offset = groundOffsetRef.current % stripeW;
      for (let x = -stripeW + offset; x < CANVAS_W; x += stripeW) {
        ctx.fillRect(x, CANVAS_H - GROUND_H, stripeW / 2, 6);
      }

      const bird = birdRef.current;
      const wingPhase = Math.sin(ts / 90);
      ctx.save();
      ctx.translate(BIRD_X, bird.y);
      ctx.rotate(bird.rot);

      // body (slightly oval)
      ctx.fillStyle = '#f2c14e';
      ctx.beginPath();
      ctx.ellipse(0, 0, BIRD_R + 2, BIRD_R, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#c9931f';
      ctx.lineWidth = 2;
      ctx.stroke();

      // belly highlight
      ctx.fillStyle = '#fbe3a1';
      ctx.beginPath();
      ctx.ellipse(-2, 4, BIRD_R - 4, BIRD_R - 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // wing (flaps up/down while playing)
      ctx.fillStyle = '#e0a83a';
      ctx.beginPath();
      ctx.ellipse(-4, 2 + wingPhase * 4, 8, 5, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#c9931f';
      ctx.lineWidth = 1;
      ctx.stroke();

      // tail feather
      ctx.fillStyle = '#e4572e';
      ctx.beginPath();
      ctx.moveTo(-BIRD_R - 1, -2);
      ctx.lineTo(-BIRD_R - 9, -6);
      ctx.lineTo(-BIRD_R - 9, 2);
      ctx.closePath();
      ctx.fill();

      // beak
      ctx.fillStyle = '#e4572e';
      ctx.beginPath();
      ctx.moveTo(BIRD_R - 2, -1);
      ctx.lineTo(BIRD_R + 9, -3);
      ctx.lineTo(BIRD_R + 9, 3);
      ctx.lineTo(BIRD_R - 2, 3);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#b8431a';
      ctx.lineWidth = 1;
      ctx.stroke();

      // eye white + pupil
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(5, -4, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1b1b2f';
      ctx.beginPath();
      ctx.arc(6.5, -4, 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      if (status === 'ready') {
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.fillStyle = '#f5f0e6';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('TAP TO START', CANVAS_W / 2, CANVAS_H / 2);
      }
    }

    function loop(ts) {
      rafRef.current = requestAnimationFrame(loop);
      if (!lastTsRef.current) lastTsRef.current = ts;
      const dt = Math.min(0.032, (ts - lastTsRef.current) / 1000);
      lastTsRef.current = ts;

      if (status === 'playing') {
        const bird = birdRef.current;
        bird.vel += GRAVITY * dt;
        bird.y += bird.vel * dt;
        bird.rot = Math.max(-0.5, Math.min(1.2, bird.vel / 500));

        groundOffsetRef.current += PIPE_SPEED * dt;

        const pipes = pipesRef.current;
        for (const pipe of pipes) {
          pipe.x -= PIPE_SPEED * dt;
          if (!pipe.passed && pipe.x + PIPE_W < BIRD_X - BIRD_R) {
            pipe.passed = true;
            setScore((s) => s + 1);
          }
        }
        pipesRef.current = pipes.filter((p) => p.x + PIPE_W > -10);

        const last = pipesRef.current[pipesRef.current.length - 1];
        if (!last || CANVAS_W - last.x >= PIPE_SPACING) {
          pipesRef.current.push({ x: CANVAS_W + 20, gapY: randomGapY(), passed: false });
        }

        if (checkCollision()) {
          setStatus('over');
        }
      }

      draw(ts);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    if (status === 'over') {
      onGameOver?.(score);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return (
    <div className="tetris-shell">
      <div className="game-header">
        <div className="stat"><span>Score</span><div className="value">{score}</div></div>
        <div className="stat"><span>Best</span><div className="value">{Math.max(bestScore, score)}</div></div>
      </div>

      <div className="canvas-container">
        <div
          className="canvas-wrapper"
          style={{ aspectRatio: `${CANVAS_W} / ${CANVAS_H}`, touchAction: 'none' }}
          onPointerDown={flap}
        >
          <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} />
          {status === 'over' && (
            <div className="tetris-overlay">
              <p>Game Over</p>
              <span>Score: {score}</span>
              <button className="btn btn-primary" onClick={restart}>Play again</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
