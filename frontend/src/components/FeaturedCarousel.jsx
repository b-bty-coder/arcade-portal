import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

export default function FeaturedCarousel({ games }) {
  const [index, setIndex] = useState(0);
  const timerRef = useRef(null);
  const touchStartX = useRef(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % games.length);
    }, 5000);
    return () => clearInterval(timerRef.current);
  }, [games.length]);

  function goTo(i) {
    clearInterval(timerRef.current);
    setIndex(i);
  }

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
  }
  function handleTouchEnd(e) {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 40) {
      goTo(dx < 0 ? (index + 1) % games.length : (index - 1 + games.length) % games.length);
    }
    touchStartX.current = null;
  }

  const game = games[index];

  return (
    <div
      className="featured-carousel"
      style={{ '--accent': game.accent }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <p className="eyebrow">Featured game</p>
      <h2 className="display-sm featured-title">{game.title}</h2>
      <p className="subtitle featured-desc">{game.description}</p>
      <Link to={'/game/' + game.id} className="btn btn-primary featured-play-btn">
        Play now
      </Link>

      <div className="carousel-dots">
        {games.map((g, i) => (
          <button
            key={g.id}
            className={'carousel-dot ' + (i === index ? 'active' : '')}
            onClick={() => goTo(i)}
            aria-label={'Show ' + g.title}
          />
        ))}
      </div>
    </div>
  );
}
