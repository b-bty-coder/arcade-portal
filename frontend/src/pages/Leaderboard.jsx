import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { GAMES } from '../games/registry';
import { getFramePreview } from '../lib/cosmetics';

const ALL_OPTIONS = [{ id: 'global', title: 'Global' }, ...GAMES];

export default function Leaderboard() {
  const [params, setParams] = useSearchParams();
  const activeGame = params.get('game') || 'global';
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

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

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ALL_OPTIONS;
    return ALL_OPTIONS.filter((g) => g.title.toLowerCase().includes(q));
  }, [query]);

  function selectGame(id) {
    setParams({ game: id }, { replace: true });
  }

  return (
    <div style={{ padding: '24px 0' }}>
      <p className="eyebrow">Hall of fame</p>
      <h1 className="display-xl">Leaderboard</h1>

      <div className="leaderboard-controls">
        <div className="leaderboard-search-wrap">
          <span className="leaderboard-search-icon">🔍</span>
          <input
            type="text"
            className="leaderboard-search"
            placeholder="Search games…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
          />
        </div>

        <select
          className="leaderboard-dropdown"
          value={activeGame}
          onChange={(e) => selectGame(e.target.value)}
        >
          {filteredOptions.length === 0 && <option>No games found</option>}
          {filteredOptions.map((g) => (
            <option key={g.id} value={g.id}>
              {g.title}
            </option>
          ))}
        </select>
      </div>

      {loading && <p className="subtitle">Loading scores…</p>}
      {!loading && rows.length === 0 && (
        <p className="subtitle">No scores yet — be the first to play! 🏆</p>
      )}

      <div className="leaderboard-list">
        {rows.map((row, i) => {
          const name = activeGame === 'global' ? row.username : row.username;
          const score = activeGame === 'global' ? row.total_score : row.high_score;
          return (
            <div key={i} className={`score-row ${i === 0 ? 'top1' : i === 1 ? 'top2' : i === 2 ? 'top3' : ''}`}>
              <span className="score-rank">#{i + 1}</span>
              <span
                className="score-avatar"
                style={{ background: getFramePreview(row.equipped_frame) }}
              >
                {name?.[0]?.toUpperCase() || '?'}
              </span>
              <span className="score-player">{name}</span>
              <span className="score-value">{score}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
