import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function HUD() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const links = [
    { to: '/', label: 'Home' },
    { to: '/leaderboard', label: 'Leaderboard' },
    { to: '/shop', label: 'Shop' },
  ];

  return (
    <div className="hud">
      <Link to="/" className="hud-logo">
        <span className="chip" />
        CARTRIDGE ARCADE
      </Link>

      <div className="nav-links">
        {links.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className={`nav-link ${location.pathname === l.to ? 'active' : ''}`}
          >
            {l.label}
          </Link>
        ))}
      </div>

      <div className="hud-stats">
        {user ? (
          <>
            <span className="stat-pill coins" title="Coins">🪙 {user.coins}</span>
            <span className="stat-pill streak" title="Daily streak">🔥 {user.currentStreak}</span>
            <Link to="/profile" className="nav-link">{user.username}</Link>
            <button className="btn btn-ghost" onClick={logout}>Log out</button>
          </>
        ) : (
          <Link to="/login" className="btn btn-primary">Log in</Link>
        )}
      </div>
    </div>
  );
}
