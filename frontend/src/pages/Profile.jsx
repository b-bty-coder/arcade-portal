import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { api } from '../api/client';
import { getSkinPreview, getFramePreview } from '../lib/cosmetics';

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

      <div className="shop-grid">
        {ownedItems.map((item) => {
          const isEquipped =
            (item.type === 'skin' && user.equippedSkin === item.id) ||
            (item.type === 'frame' && user.equippedFrame === item.id);
          return (
            <div key={item.id} className="shop-item">
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
