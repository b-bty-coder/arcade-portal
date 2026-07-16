import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { api } from '../api/client';
import { getSkinPreview, getFramePreview } from '../lib/cosmetics';

function HexBadge({ label, value, accent }) {
  return (
    <div className="profile-hex-badge" style={{ '--accent': accent }}>
      <div className="profile-hex-badge-inner">
        <span className="profile-hex-label">{label}</span>
        <span className="profile-hex-value">{value}</span>
      </div>
    </div>
  );
}

export default function Profile() {
  const { user, inventory } = useAuth();
  const [items, setItems] = useState([]);

  useEffect(() => {
    api.getShopItems().then((res) => setItems(res.items || [])).catch(() => setItems([]));
  }, []);

  if (!user) return <Navigate to="/login" replace />;

  const ownedItems = items.filter((item) => inventory.includes(item.id));
  const skinPreview = getSkinPreview(user.equippedSkin);

  return (
    <div style={{ padding: '24px 0' }}>
      <p className="eyebrow">Player card</p>

      <div className="profile-hero">
        <div className="profile-hex-stack">
          <HexBadge label="COINS" value={`🪙 ${user.coins}`} accent="var(--amber)" />
          <HexBadge label="CURRENT STREAK" value={`🔥 ${user.currentStreak}`} accent="var(--ember)" />
          <HexBadge label="LONGEST STREAK" value={`🏆 ${user.longestStreak}`} accent="var(--sage)" />
        </div>

        <div className="profile-circle-wrap" style={{ '--skin': skinPreview }}>
          <div className="profile-circle">
            <div className="profile-circle-icon" style={{ background: skinPreview }}>
              {user.username.charAt(0).toUpperCase()}
            </div>
            <h1 className="display-sm" style={{ margin: 0 }}>{user.username}</h1>
            <p className="subtitle" style={{ margin: 0, fontSize: 12 }}>
              Cartridge: {user.equippedSkin ? user.equippedSkin.replace('skin_', '').replace('_', ' ') : 'default'}
              <br />
              Frame: {user.equippedFrame ? user.equippedFrame.replace('frame_', '').replace('_', ' ') : 'classic'}
            </p>
          </div>
        </div>
      </div>

      <h2 className="display-sm" style={{ marginTop: 36 }}>COSMETICS GALLERY ({inventory.length})</h2>
      <p className="subtitle">View and manage all items from the Shop page.</p>

      <div className="cosmetics-gallery-row">
        {ownedItems.map((item) => {
          const isEquipped =
            (item.type === 'skin' && user.equippedSkin === item.id) ||
            (item.type === 'frame' && user.equippedFrame === item.id);
          return (
            <div key={item.id} className="cosmetics-hex-card">
              <div className="cosmetics-hex-wrap" style={{ '--accent': item.preview }}>
                <div className="cosmetics-hex-inner" style={{ background: item.preview }} />
              </div>
              {isEquipped && <span className="cosmetics-equipped-flag">🚩 Equipped</span>}
              <span className="game-thumb-name">{item.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
