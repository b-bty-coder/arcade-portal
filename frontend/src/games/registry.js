import { lazy } from 'react';

const Snake = lazy(() => import('./Snake.jsx'));
const Memory = lazy(() => import('./Memory.jsx'));
const Tetris = lazy(() => import('./Tetris.jsx'));
const Game2048 = lazy(() => import('./Game2048.jsx'));
const FlappyBird = lazy(() => import('./FlappyBird.jsx'));
const Pacman = lazy(() => import('./Pacman.jsx'));
const Sokoban = lazy(() => import('./Sokoban.jsx'));
const Breakout = lazy(() => import('./Breakout.jsx'));
const GemCascade = lazy(() => import('./GemCascade.jsx'));

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
  {
    id: 'pacman',
    title: 'Pac-Man',
    description: 'Eat every dot, dodge the ghosts, chase them back with a power pellet.',
    accent: 'var(--amber)',
    thumbnail: '/thumbnails/pacman.svg',
    component: Pacman,
  },
  {
    id: 'sokoban',
    title: 'Box Pusher',
    description: 'Push every crate onto its target. 20 hand-built puzzles, more on the way.',
    accent: 'var(--plum)',
    thumbnail: '/thumbnails/sokoban.svg',
    component: Sokoban,
  },
  {
    id: 'breakout',
    title: 'Breakout',
    description: 'Smash every brick, keep the ball alive, level up as it speeds up.',
    accent: 'var(--ember)',
    thumbnail: '/thumbnails/breakout.svg',
    component: Breakout,
  },
  {
    id: 'gem-cascade',
    title: 'Gem Cascade',
    description: 'Match 3 gems, chain cascades, clear the target before you run out of moves.',
    accent: 'var(--plum)',
    thumbnail: '/thumbnails/gem-cascade.svg',
    component: GemCascade,
  },
];

export function getGame(id) {
  return GAMES.find((g) => g.id === id);
}
