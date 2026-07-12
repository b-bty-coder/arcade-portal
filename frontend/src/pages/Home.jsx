import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { GAMES } from '../games/registry';
import { BannerAdSlot } from '../components/AdSlot';
import FeaturedCarousel from '../components/FeaturedCarousel';
import TrendingRow from '../components/TrendingRow';
import { api } from '../api/client';

export default function Home() {
  const [playerCounts, setPlayerCounts] = useState({});
  const [topPlayers, setTopPlayers] = useState([]);

  useEffect(() => {
    api.getStatsOverview()
      .then((res) => setPlayerCounts(res.playerCounts || {}))
      .catch(() => setPlayerCounts({}));
    api.getGlobalLeaderboard()
      .then((res) => setTopPlayers((res.scores || []).slice(0, 3)))
      .catch(() => setTopPlayers([]));
  }, []);

  return (
    <div>
      <div style={{ padding: '20px 0 4px' }}>
        <p className="eyebrow">No downloads. No installs.</p>
        <h1 className="display-xl">Pick a cartridge. Press start.</h1>
      </div>

      <FeaturedCarousel games={GAMES} />

      <section className="home-section">
        <h2 className="display-sm section-title">TRENDING GAMES</h2>
        <TrendingRow games={GAMES} playerCounts={playerCounts} />
      </section>

      {topPlayers.length > 0 && (
        <section className="home-section">
          <h2 className="display-sm section-title">TOP PLAYERS</h2>
          <div className="trophy-row">
            {topPlayers.map((p, i) => (
              <div key={i} className={'trophy-card trophy-' + (i + 1)}>
                <div className="trophy-icon">{i === 0 ? '1st' : i === 1 ? '2nd' : '3rd'}</div>
                <div className="trophy-name">{p.username}</div>
                <div className="trophy-score">{p.total_score} pts</div>
              </div>
            ))}
          </div>
        </section>
      )}

      <BannerAdSlot label="Home banner ad" />

      <section className="home-section">
        <h2 className="display-sm section-title">ALL GAMES</h2>
        <div className="cart-grid">
          {GAMES.map((game) => (
            <Link
              key={game.id}
              to={'/game/' + game.id}
              className="cartridge"
              style={{ '--accent': game.accent }}
            >
              <div className="label-stripe">{game.title}</div>
              <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0, flexGrow: 1 }}>
                {game.description}
              </p>
              <div className="cart-meta">
                <span>HTML5</span>
                <span>FREE</span>
              </div>
              <div className="play-btn">Play</div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
