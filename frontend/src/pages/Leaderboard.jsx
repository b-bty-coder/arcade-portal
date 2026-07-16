import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { GAMES } from '../games/registry';
import { getFramePreview } from '../lib/cosmetics';

export default function Leaderboard() {
  const [params, setParams] = useSearchParams();
  const activeGame = params.get('game') || 'global';
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const fetcher = activeGame === 'global' ? api.getGlobalLeaderboard() : api.getLeaderboard(activeGame);
    fetcher
      .then((res) => { if (!cancelled) setRows(res.scores); })
      .catch(() => { if (!cancelled) setRows([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [activeGame]);

  return (
    <div style={{ padding: '24px 0' }}>
      <p className="eyebrow">Hall of fame</p>
      <h1 className="display-xl">Leaderboard</h1>

      <div className="nav-links" style={{ margin: '20px 0' }}>
        <button
          className={`nav-link ${activeGame === 'global' ? 'active' : ''}`}
          onClick={() => setParams({ game: 'global' })}
        >
          Global
        </button>
        {GAMES.map((g) => (
          <button
            key={g.id}
            className={`nav-link ${activeGame === g.id ? 'active' : ''}`}
            onClick={() => setParams({ game: g.id })}
          >
            {g.title}
          </button>
        ))}
      </div>

      {loading && <p className="subtitle">Loading scores…</p>}
      {!loading && rows.length === 0 && <p className="subtitle">No scores yet — be the first to play!</p>}

      {rows.map((row, i) => (
        <div key={i} className={`leader-row ${i === 0 ? 'top1' : i === 1 ? 'top2' : i === 2 ? 'top3' : ''}`}>
          <span className="rank">#{i + 1}</span>
          <span className="leader-name">
            <span
              className="frame-badge"
              style={{ background: getFramePreview(row.equipped_frame) }}
              title="Equipped frame"
            />
            {row.username}
          </span>
          <span className="score">{activeGame === 'global' ? row.total_score : row.high_score}</span>
        </div>
      ))}
    </div>
  );
}
