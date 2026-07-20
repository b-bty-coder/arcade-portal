import { lazy } from 'react';
const Snake = lazy(() => import('./Snake.jsx'));
const Memory = lazy(() => import('./Memory.jsx'));

export const GAMES = [
  {
    id: 'snake',
    title: 'Neon Snake',
    description: 'Classic snake, console-cartridge style. Eat, grow, don\u2019t hit yourself.',
    accent: 'var(--amber)',
    thumbnail: '/thumbnails/snake.png',
    component: Snake,
  },
  {
    id: 'memory',
    title: 'Cartridge Match',
    description: 'Flip cartridges, find the pairs, beat your best time.',
    accent: 'var(--sage)',
    thumbnail: '/thumbnails/memory.png',
    component: Memory,
  },
];

export function getGame(id) {
  return GAMES.find((g) => g.id === id);
}
