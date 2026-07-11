export default function StreakModal({ data, onClose }) {
  if (!data) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="streak-modal" onClick={(e) => e.stopPropagation()}>
        <div className="streak-flame">🔥</div>
        <p className="display-sm">DAY {data.streak} STREAK</p>
        <p className="subtitle" style={{ margin: '10px 0 20px' }}>
          You earned <strong style={{ color: 'var(--amber)' }}>+{data.coinsAwarded} coins</strong> for coming
          back today. Keep the streak alive tomorrow!
        </p>
        <button className="btn btn-primary" onClick={onClose}>Nice</button>
      </div>
    </div>
  );
}
