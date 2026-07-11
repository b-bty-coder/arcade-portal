import { useEffect, useState, useRef } from 'react';

const ICONS = ['🕹️', '👾', '🎮', '🧩', '🚀', '⭐', '🍄', '🔥'];

function buildDeck() {
  const deck = [...ICONS, ...ICONS]
    .map((icon, i) => ({ id: i, icon, flipped: false, matched: false }))
    .sort(() => Math.random() - 0.5);
  return deck;
}

export default function Memory({ onGameOver, bestScore = 0 }) {
  const [deck, setDeck] = useState(buildDeck);
  const [selected, setSelected] = useState([]);
  const [moves, setMoves] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [status, setStatus] = useState('ready');
  const [finalScore, setFinalScore] = useState(0);
  const lockRef = useRef(false);

  function reset() {
    setDeck(buildDeck());
    setSelected([]);
    setMoves(0);
    setStartTime(Date.now());
    setStatus('playing');
    lockRef.current = false;
  }

  function handleFlip(card) {
    if (status !== 'playing' || lockRef.current) return;
    if (card.flipped || card.matched) return;
    if (selected.length === 2) return;

    const updated = deck.map((c) => (c.id === card.id ? { ...c, flipped: true } : c));
    const newSelected = [...selected, card.id];
    setDeck(updated);
    setSelected(newSelected);

    if (newSelected.length === 2) {
      lockRef.current = true;
      setMoves((m) => m + 1);
      const [aId, bId] = newSelected;
      const a = updated.find((c) => c.id === aId);
      const b = updated.find((c) => c.id === bId);

      setTimeout(() => {
        setDeck((prev) => {
          const isMatch = a.icon === b.icon;
          const next = prev.map((c) => {
            if (c.id === aId || c.id === bId) {
              return isMatch ? { ...c, matched: true, flipped: true } : { ...c, flipped: false };
            }
            return c;
          });
          const allMatched = next.every((c) => c.matched);
          if (allMatched) {
            const elapsedSec = Math.max(1, Math.round((Date.now() - startTime) / 1000));
            const score = Math.max(50, Math.round(2000 / (moves + 1) + 2000 / elapsedSec));
            setFinalScore(score);
            setStatus('over');
            onGameOver?.(score);
          }
          return next;
        });
        setSelected([]);
        lockRef.current = false;
      }, 650);
    }
  }

  return (
    <div className="game-canvas-wrap">
      <div className="game-hud">
        <span>MOVES: {moves}</span>
        <span>BEST: {bestScore}</span>
      </div>
      <div className="game-canvas-container">
        <div
          className="memory-board"
          style={{
            opacity: status === 'playing' ? 1 : 0.3,
            pointerEvents: status === 'playing' ? 'auto' : 'none',
          }}
        >
          {deck.map((card) => (
            <button
              key={card.id}
              onClick={() => handleFlip(card)}
              className={card.flipped || card.matched ? '' : 'face-down'}
            >
              {card.flipped || card.matched ? card.icon : '❓'}
            </button>
          ))}
        </div>
        {status !== 'playing' && (
          <div className="game-overlay">
            <p className="display-sm" style={{ color: '#f5f0e6' }}>
              {status === 'over' ? `SOLVED — SCORE ${finalScore}` : 'MATCH THE PAIRS'}
            </p>
            <button className="btn btn-primary" onClick={reset}>
              {status === 'over' ? 'Play again' : 'Start'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
