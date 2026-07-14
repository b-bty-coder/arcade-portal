import { Link } from 'react-router-dom';

export default function TrendingRow({ games, playerCounts }) {
  return (
    <div className="trending-row">
      {games.map((game) => (
        <Link key={game.id} to={`/game/${game.id}`} className="trending-item">
          <div className="trending-icon" style={{ '--accent': game.accent }}>
            <img src={game.thumbnail} alt={game.title} />
          </div>
          <span className="trending-name">{game.title}</span>
          <span className="trending-count">
            {playerCounts && playerCounts[game.id] > 0
              ? playerCounts[game.id] + (playerCounts[game.id] === 1 ? ' player' : ' players')
              : 'Be the first to play'}
          </span>
        </Link>
      ))}
    </div>
  );
}
