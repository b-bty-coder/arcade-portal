import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getSkinPreview } from '../lib/cosmetics';

export default function HUD() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const links = [
    { to: '/', label: 'Home' },
    { to: '/games', label: 'Games' },
    { to: '/leaderboard', label: 'Leaderboard' },
    { to: '/shop', label: 'Shop' },
  ];

  function closeDrawer() {
    setDrawerOpen(false);
  }

  return (
    <>
      <div className="hud">
        <Link to="/" className="hud-logo">
          <span className="chip" style={{ background: getSkinPreview(user?.equippedSkin) }} />
          CARTRIDGE ARCADE
        </Link>

        <div className="nav-links nav-links-desktop">
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

        <div className="hud-stats hud-stats-desktop">
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

        <button
          className="hamburger-btn"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
        >
          <span /><span /><span />
        </button>
      </div>

      {drawerOpen && (
        <div className="drawer-overlay" onClick={closeDrawer}>
          <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
            <button className="icon-btn drawer-close" onClick={closeDrawer} aria-label="Close menu">✕</button>

            {user && (
              <div className="drawer-stats">
                <span className="stat-pill coins">🪙 {user.coins}</span>
                <span className="stat-pill streak">🔥 {user.currentStreak}</span>
              </div>
            )}

            <nav className="drawer-links">
              {links.map((l) => (
                <Link key={l.to} to={l.to} className="drawer-link" onClick={closeDrawer}>
                  {l.label}
                </Link>
              ))}
              {user ? (
                <>
                  <Link to="/profile" className="drawer-link" onClick={closeDrawer}>
                    {user.username}
                  </Link>
                  <button
                    className="drawer-link drawer-link-danger"
                    onClick={() => { logout(); closeDrawer(); }}
                  >
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="drawer-link" onClick={closeDrawer}>Log in</Link>
                  <Link to="/register" className="drawer-link" onClick={closeDrawer}>Sign up</Link>
                </>
              )}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
