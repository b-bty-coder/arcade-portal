import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

export default function Profile() {
  const { user, inventory } = useAuth();
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div style={{ padding: '24px 0' }}>
      <p className="eyebrow">Player card</p>
      <h1 className="display-xl">{user.username}</h1>

      <div className="cart-grid" style={{ marginTop: 24 }}>
        <div className="cartridge" style={{ '--accent': 'var(--amber)' }}>
          <div className="label-stripe">COINS</div>
          <p className="display-xl" style={{ textAlign: 'center', margin: 0 }}>🪙 {user.coins}</p>
        </div>
        <div className="cartridge" style={{ '--accent': 'var(--ember)' }}>
          <div className="label-stripe">CURRENT STREAK</div>
          <p className="display-xl" style={{ textAlign: 'center', margin: 0 }}>🔥 {user.currentStreak}</p>
        </div>
        <div className="cartridge" style={{ '--accent': 'var(--sage)' }}>
          <div className="label-stripe">LONGEST STREAK</div>
          <p className="display-xl" style={{ textAlign: 'center', margin: 0 }}>🏆 {user.longestStreak}</p>
        </div>
      </div>

      <h2 className="display-sm" style={{ marginTop: 32 }}>OWNED COSMETICS ({inventory.length})</h2>
      <p className="subtitle">Manage and equip these from the Shop page.</p>
    </div>
  );
}
