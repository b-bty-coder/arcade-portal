import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { getRarityColor } from '../lib/cosmetics';

export default function Shop() {
  const { user, inventory, refreshProfile } = useAuth();
  const [items, setItems] = useState([]);
  const [equippedCounts, setEquippedCounts] = useState({ skins: {}, frames: {} });
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [expanded, setExpanded] = useState({ skin: false, frame: false });

  useEffect(() => {
    api.getShopItems().then((res) => setItems(res.items));
    api.getEquippedCounts().then(setEquippedCounts).catch(() => {});
  }, []);

  function getMostPopularId(type) {
    const counts = type === 'skin' ? equippedCounts.skins : equippedCounts.frames;
    if (!counts) return null;
    let bestId = null;
    let bestCount = 0;
    Object.entries(counts).forEach(([id, count]) => {
      if (count > bestCount) {
        bestCount = count;
        bestId = id;
      }
    });
    return bestCount > 0 ? bestId : null;
  }

  async function handleBuy(item) {
    setError('');
    setMessage('');
    setBusyId(item.id);
    try {
      const res = await api.buyItem(item.id);
      await refreshProfile();
      setMessage(res.paidWithDiscount ? `Bought with discount for 🪙 ${res.amountPaid}!` : 'Purchased!');
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
      api.getEquippedCounts().then(setEquippedCounts).catch(() => {});
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleWatchAdForDiscount(item) {
    setError('');
    setMessage('');
    setBusyId('ad-' + item.id);
    try {
      const res = await api.watchAdForDiscount(item.id);
      await refreshProfile();
      setMessage(`${res.discountPct}% off "${item.name}" unlocked! (${res.remainingToday} discount-ads left today)`);
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
      {message && <p className="subtitle" style={{ color: 'var(--sage)' }}>{message}</p>}

      {['skin', 'frame'].map((type) => {
        const mostPopularId = getMostPopularId(type);
        const typeItems = items.filter((i) => i.type === type);
        const isExpanded = expanded[type];

        return (
          <div key={type} style={{ marginTop: 28 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <h2 className="display-sm">{type === 'skin' ? 'CARTRIDGE SKINS' : 'PROFILE FRAMES'}</h2>
              <button
                className="btn btn-ghost"
                style={{ padding: '6px 12px', fontSize: 12 }}
                onClick={() => setExpanded((prev) => ({ ...prev, [type]: !prev[type] }))}
              >
                {isExpanded ? 'Show less' : 'View all'}
              </button>
            </div>

            <div className={isExpanded ? 'shop-grid' : 'shop-scroll-row'}>
              {typeItems.map((item) => {
                const isOwned = owned.has(item.id);
                const isEquipped = equippedIds.includes(item.id);
                const rarityColor = getRarityColor(item.rarity);
                const hasDiscount = user.discountItemId === item.id && user.discountPct > 0;
                const discountedCost = hasDiscount
                  ? Math.max(0, Math.round(item.cost * (1 - user.discountPct / 100)))
                  : item.cost;

                return (
                  <div
                    key={item.id}
                    className={isExpanded ? 'shop-item' : 'shop-item shop-item-scroll'}
                    style={{ borderColor: rarityColor, position: 'relative' }}
                  >
                    {item.id === mostPopularId && (
                      <span className="popular-tag">🔥 Most Popular</span>
                    )}
                    <span className="rarity-tag" style={{ color: rarityColor, borderColor: rarityColor }}>
                      {item.rarity || 'common'}
                    </span>
                    <div className="swatch" style={{ background: item.preview }} />
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{item.name}</div>

                    <div className="price">
                      {item.cost === 0 ? (
                        'Free'
                      ) : hasDiscount ? (
                        <>
                          <span style={{ textDecoration: 'line-through', opacity: 0.5, marginRight: 6 }}>
                            🪙 {item.cost}
                          </span>
                          🪙 {discountedCost}
                        </>
                      ) : (
                        `🪙 ${item.cost}`
                      )}
                    </div>

                    {isOwned ? (
                      <button
                        className="btn btn-ghost"
                        disabled={isEquipped || busyId === item.id}
                        onClick={() => handleEquip(item)}
                      >
                        {isEquipped ? 'Equipped' : 'Equip'}
                      </button>
                    ) : (
                      <>
                        <button
                          className="btn btn-primary"
                          disabled={busyId === item.id || user.coins < discountedCost}
                          onClick={() => handleBuy(item)}
                        >
                          Buy
                        </button>
                        {!hasDiscount && item.cost > 0 && (
                          <button
                            className="btn btn-ghost"
                            style={{ marginTop: 6, fontSize: 12 }}
                            disabled={busyId === 'ad-' + item.id}
                            onClick={() => handleWatchAdForDiscount(item)}
                          >
                            🎁 Watch ad for 20% off
                          </button>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
