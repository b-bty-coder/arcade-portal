import { useParams, Link, Navigate, useNavigate } from 'react-router-dom';
import { useEffect, useState, useCallback, Suspense } from 'react';
import { getGame } from '../games/registry';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { idbGet, idbSet } from '../lib/idb';

export default function GamePage() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const game = getGame(gameId);
  const [bestScore, setBestScore] = useState(0);
  const localKey = `progress:${gameId}`;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const local = await idbGet(localKey);
      if (local?.bestScore && !cancelled) setBestScore(local.bestScore);
      if (user) {
        try {
          const { data } = await api.getProgress(gameId);
          if (data?.bestScore && !cancelled) {
            setBestScore((prev) => Math.max(prev, data.bestScore));
          }
        } catch (e) {
          // offline or server down — local copy is still fine
        }
      }
    })();
    return () => { cancelled = true; };
  }, [gameId, user, localKey]);

  const handleGameOver = useCallback(
    async (score) => {
      const newBest = Math.max(bestScore, score);
      setBestScore(newBest);
      await idbSet(localKey, { bestScore: newBest, lastScore: score, updatedAt: Date.now() });
      if (!user) return;
      try {
        await api.saveProgress(gameId, { bestScore: newBest, lastScore: score });
        await api.submitScore(gameId, score);
      } catch (e) {
        // silent — sync just retries next time
      }
    },
    [bestScore, gameId, user, localKey]
  );

  if (!game) return <Navigate to="/" replace />;
  const GameComponent = game.component;

  return (
    <div className="game-box">
      <div className="game-wrapper">
        <div className="game-inner">
          <button className="back-btn" onClick={() => navigate('/')} aria-label="Back to all games">
            <div className="back-btn-inner">←</div>
          </button>
          <Link
            to={`/leaderboard?game=${game.id}`}
            className="back-btn back-btn-right"
            aria-label="View leaderboard"
          >
            <div className="back-btn-inner">🏆</div>
          </Link>

          <Suspense fallback={<div style={{ textAlign: 'center', padding: 20 }}>Loading game…</div>}>
            <GameComponent onGameOver={handleGameOver} bestScore={bestScore} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
