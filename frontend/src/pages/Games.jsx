import { Link } from 'react-router-dom';
import { GAMES } from '../games/registry';

export default function Games() {
  return (
    <div style={{ padding: '20px 0' }}>
      <p className="eyebrow">Pick your game</p>
      <h1 className="display-xl">Explore all games</h1>

      <div className="game-thumb-grid">
        {GAMES.map((game) => (
          <Link key={game.id} to={`/game/${game.id}`} className="game-thumb">
            <div className="game-thumb-hex-wrap" style={{ '--accent': game.accent }}>
              <div className="game-thumb-hex">
                <img src={game.thumbnail} alt={game.title} />
              </div>
            </div>
            <span className="game-thumb-name">{game.title}</span>
            <span className="game-thumb-play">▶ Play</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
