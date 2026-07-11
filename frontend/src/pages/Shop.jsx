import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Shop() {
  const { user, inventory, refreshProfile } = useAuth();
  const [items, setItems] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getShopItems().then((res) => setItems(res.items));
  }, []);

  async function handleBuy(item) {
    setError('');
    setBusyId(item.id);
    try {
      await api.buyItem(item.id);
      await refreshProfile();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleEquip(item) {
    setBusyId(item.id);
    try {
      await api.equipItem(item.id, item.type);
      await refreshProfile();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  }

  if (!user) {
    return (
      <div style={{ padding: '48px 0' }}>
        <h1 className="display-xl">Shop</h1>
        <p className="subtitle">Log in to spend coins on cartridge skins and frames.</p>
      </div>
    );
  }

  const owned = new Set(inventory);
  const equippedIds = [user.equippedSkin, user.equippedFrame];

  return (
    <div style={{ padding: '24px 0' }}>
      <p className="eyebrow">Cosmetics only — nothing here is pay-to-win</p>
      <h1 className="display-xl">Shop</h1>
      <p className="subtitle">You have <strong style={{ color: 'var(--amber)' }}>🪙 {user.coins}</strong> coins.</p>

      {error && <p className="error-text">{error}</p>}

      {['skin', 'frame'].map((type) => (
        <div key={type} style={{ marginTop: 28 }}>
          <h2 className="display-sm">{type === 'skin' ? 'CARTRIDGE SKINS' : 'PROFILE FRAMES'}</h2>
          <div className="shop-grid">
            {items.filter((i) => i.type === type).map((item) => {
              const isOwned = owned.has(item.id);
              const isEquipped = equippedIds.includes(item.id);
              return (
                <div key={item.id} className="shop-item">
                  <div className="swatch" style={{ background: item.preview }} />
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{item.name}</div>
                  <div className="price">{item.cost === 0 ? 'Free' : `🪙 ${item.cost}`}</div>
                  {isOwned ? (
                    <button
                      className="btn btn-ghost"
                      disabled={isEquipped || busyId === item.id}
                      onClick={() => handleEquip(item)}
                    >
                      {isEquipped ? 'Equipped' : 'Equip'}
                    </button>
                  ) : (
                    <button
                      className="btn btn-primary"
                      disabled={busyId === item.id || user.coins < item.cost}
                      onClick={() => handleBuy(item)}
                    >
                      Buy
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
