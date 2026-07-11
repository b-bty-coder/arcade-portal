import { Link } from 'react-router-dom';
import { GAMES } from '../games/registry';
import { BannerAdSlot } from '../components/AdSlot';

export default function Home() {
  return (
    <div>
      <div style={{ padding: '32px 0 8px' }}>
        <p className="eyebrow">No downloads · No installs</p>
        <h1 className="display-xl">Pick a cartridge. Press start.</h1>
        <p className="subtitle">
          Every game here runs straight in your browser. Keep your streak alive, climb the
          leaderboard, and unlock cartridge skins along the way.
        </p>
      </div>

      <BannerAdSlot label="Home banner ad" />

      <div className="cart-grid">
        {GAMES.map((game) => (
          <Link
            key={game.id}
            to={`/game/${game.id}`}
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
            <div className="play-btn">▶ Play</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
