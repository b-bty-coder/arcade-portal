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

  return (
    <div style={{ padding: '24px 0' }}>
      <p className="eyebrow">Player card</p>

      <div className="player-card-preview" style={{ '--skin': getSkinPreview(user.equippedSkin) }}>
        <div className="player-avatar" style={{ borderColor: getFramePreview(user.equippedFrame) }}>
          {user.username.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="display-xl" style={{ margin: 0 }}>{user.username}</h1>
          <p className="subtitle" style={{ margin: '6px 0 0' }}>
            Cartridge: {user.equippedSkin ? user.equippedSkin.replace('skin_', '').replace('_', ' ') : 'default'}
            {' · '}
            Frame: {user.equippedFrame ? user.equippedFrame.replace('frame_', '').replace('_', ' ') : 'classic'}
          </p>
        </div>
      </div>

      <div className="profile-hex-panel">
        <HexBadge label="COINS" value={`🪙 ${user.coins}`} accent="var(--amber)" />
        <HexBadge label="CURRENT STREAK" value={`🔥 ${user.currentStreak}`} accent="var(--ember)" />
        <HexBadge label="LONGEST STREAK" value={`🏆 ${user.longestStreak}`} accent="var(--sage)" />
      </div>

      <h2 className="display-sm" style={{ marginTop: 32 }}>COSMETICS GALLERY ({inventory.length})</h2>
      <p className="subtitle">View and manage all items from the Shop page.</p>

      <div className="shop-grid">
        {ownedItems.map((item) => {
          const isEquipped =
            (item.type === 'skin' && user.equippedSkin === item.id) ||
            (item.type === 'frame' && user.equippedFrame === item.id);
          return (
            <div
              key={item.id}
              className="shop-item shop-item-glow"
              style={{ '--accent': item.preview }}
            >
              <div className="swatch" style={{ background: item.preview }} />
              <div style={{ fontSize: 14, fontWeight: 600 }}>{item.name}</div>
              <div className="price" style={{ opacity: isEquipped ? 1 : 0.5 }}>
                {isEquipped ? 'Equipped' : item.type}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
