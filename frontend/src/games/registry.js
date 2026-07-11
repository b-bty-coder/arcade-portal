import Snake from './Snake.jsx';
import Memory from './Memory.jsx';

// To add a new game: build a component that accepts { onGameOver, bestScore }
// and calls onGameOver(score) when a round ends, then add an entry here.
export const GAMES = [
  {
    id: 'snake',
    title: 'Neon Snake',
    description: 'Classic snake, console-cartridge style. Eat, grow, don\u2019t hit yourself.',
    accent: 'var(--amber)',
    component: Snake,
  },
  {
    id: 'memory',
    title: 'Cartridge Match',
    description: 'Flip cartridges, find the pairs, beat your best time.',
    accent: 'var(--sage)',
    component: Memory,
  },
];

export function getGame(id) {
  return GAMES.find((g) => g.id === id);
}
