import { useParams, Link, Navigate } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import { getGame } from '../games/registry';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { idbGet, idbSet } from '../lib/idb';
import { BannerAdSlot, RewardedAdSlot } from '../components/AdSlot';

export default function GamePage() {
  const { gameId } = useParams();
  const { user, refreshProfile } = useAuth();
  const game = getGame(gameId);
  const [bestScore, setBestScore] = useState(0);
  const [message, setMessage] = useState('');
  const [adRewardBusy, setAdRewardBusy] = useState(false);

  const localKey = `progress:${gameId}`;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // local-first: show whatever we have on-device immediately
      const local = await idbGet(localKey);
      if (local?.bestScore && !cancelled) setBestScore(local.bestScore);

      // then reconcile with the server if logged in
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

  async function claimAdReward() {
    if (!user) { setMessage('Log in to earn coins from rewarded ads.'); return; }
    setAdRewardBusy(true);
    try {
      const res = await api.claimAdReward();
      await refreshProfile();
      setMessage(`+${res.coinsAwarded} coins! (${res.remainingToday} rewarded ads left today)`);
    } catch (e) {
      setMessage(e.message);
    } finally {
      setAdRewardBusy(false);
    }
  }

  if (!game) return <Navigate to="/" replace />;
  const GameComponent = game.component;

  return (
    <div>
      <div style={{ padding: '24px 0 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div>
          <Link to="/" className="eyebrow">&larr; All games</Link>
          <h1 className="display-xl" style={{ marginTop: 6 }}>{game.title}</h1>
        </div>
        <Link to={`/leaderboard?game=${game.id}`} className="btn btn-ghost">View leaderboard</Link>
      </div>

      <BannerAdSlot label="Pre-game banner ad" />

      <div className="game-frame">
        <GameComponent onGameOver={handleGameOver} bestScore={bestScore} />
      </div>

      {message && <p className="subtitle" style={{ marginTop: 14 }}>{message}</p>}

      <div style={{ marginTop: 8 }}>
        <RewardedAdSlot onRewardClaim={claimAdReward} rewardLabel="+20 coins" />
        {adRewardBusy && <p className="eyebrow">Claiming reward…</p>}
      </div>
    </div>
  );
}
