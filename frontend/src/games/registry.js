import { lazy } from 'react';

const Snake = lazy(() => import('./Snake.jsx'));
const Memory = lazy(() => import('./Memory.jsx'));
const Tetris = lazy(() => import('./Tetris.jsx'));
const Game2048 = lazy(() => import('./Game2048.jsx'));
const FlappyBird = lazy(() => import('./FlappyBird.jsx'));

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
  {
    id: 'tetris',
    title: 'Tetris',
    description: 'Ten themed levels — each one changes speed, size, visibility, or controls.',
    accent: 'var(--amber)',
    thumbnail: '/thumbnails/tetris.svg',
    component: Tetris,
  },
  {
    id: '2048',
    title: '2048',
    description: 'Swipe to merge tiles and reach 2048.',
    accent: 'var(--plum)',
    thumbnail: '/thumbnails/2048.svg',
    component: Game2048,
  },
  {
    id: 'flappy',
    title: 'Flappy Bird',
    description: 'Tap to flap, dodge the pipes, beat your best score.',
    accent: 'var(--sage)',
    thumbnail: '/thumbnails/flappy.svg',
    component: FlappyBird,
  },
];

export function getGame(id) {
  return GAMES.find((g) => g.id === id);
}
