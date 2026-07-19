import { useParams, Link, Navigate } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import { getGame } from '../games/registry';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { idbGet, idbSet } from '../lib/idb';
import { BannerAdSlot } from '../components/AdSlot';

export default function GamePage() {
  const { gameId } = useParams();
  const { user } = useAuth();
  const game = getGame(gameId);
  const [bestScore, setBestScore] = useState(0);
  const [message, setMessage] = useState('');
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
      if (!user) {
        setMessage('Log in to save your progress and appear on the leaderboard.');
        return;
      }
      try {
        await api.saveProgress(gameId, { bestScore: newBest, lastScore: score });
        const res = await api.submitScore(gameId, score);
        setMessage(res.isNewHighScore ? 'New personal best — leaderboard updated!' : 'Score saved.');
      } catch (e) {
        setMessage(`Couldn't sync to server: ${e.message}`);
      }
    },
    [bestScore, gameId, user, localKey]
  );

  if (!game) return <Navigate to="/" replace />;
  const GameComponent = game.component;
  const isVertical = game.orientation !== 'horizontal';

  return (
    <div>
      <div className="game-page-header" style={{ justifyContent: 'space-between' }}>
        <Link to="/" className="icon-btn" aria-label="Back to all games">←</Link>
        <Link to={`/leaderboard?game=${game.id}`} className="icon-btn" aria-label="View leaderboard">🏆</Link>
      </div>

      {isVertical && <BannerAdSlot label="Pre-game banner ad" />}

      <div className="game-frame">
        <GameComponent onGameOver={handleGameOver} bestScore={bestScore} />
      </div>

      {message && <p className="subtitle" style={{ marginTop: 14 }}>{message}</p>}
    </div>
  );
}
