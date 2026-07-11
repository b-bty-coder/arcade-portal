// db.js — SQLite schema + seed data for the arcade portal backend.
// Uses Node's built-in node:sqlite (requires Node 22.5+) instead of the
// better-sqlite3 native addon. This means there is nothing to compile —
// works the same on a laptop, a server, or Termux on Android.

const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const db = new DatabaseSync(path.join(__dirname, 'arcade.db'));
db.exec('PRAGMA journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  coins INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_checkin_date TEXT,
  equipped_skin TEXT DEFAULT 'default',
  equipped_frame TEXT DEFAULT 'default',
  ad_rewards_today INTEGER NOT NULL DEFAULT 0,
  ad_rewards_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS game_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  game_id TEXT NOT NULL,
  data_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, game_id),
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS leaderboard (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  game_id TEXT NOT NULL,
  high_score INTEGER NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, game_id),
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS shop_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'skin' | 'frame'
  cost INTEGER NOT NULL,
  preview TEXT NOT NULL -- css color or gradient used to render a swatch
);

CREATE TABLE IF NOT EXISTS inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  item_id TEXT NOT NULL,
  acquired_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, item_id),
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(item_id) REFERENCES shop_items(id)
);
`);

// Seed shop items once.
const seedItems = [
  ['skin_amber', 'Amber Cartridge', 'skin', 50, '#F2C14E'],
  ['skin_sage', 'Sage Cartridge', 'skin', 50, '#66A182'],
  ['skin_plum', 'Plum Cartridge', 'skin', 80, '#7B4B94'],
  ['skin_ember', 'Ember Cartridge', 'skin', 80, '#E4572E'],
  ['skin_holo', 'Holo Cartridge', 'skin', 200, 'linear-gradient(135deg,#F2C14E,#E4572E,#7B4B94)'],
  ['frame_default', 'Classic Frame', 'frame', 0, '#3A3A55'],
  ['frame_gold', 'Gold Frame', 'frame', 120, '#F2C14E'],
  ['frame_neon', 'Neon Frame', 'frame', 150, '#66A182'],
  ['frame_royal', 'Royal Frame', 'frame', 180, '#7B4B94'],
];

const insertItem = db.prepare(
  `INSERT OR IGNORE INTO shop_items (id, name, type, cost, preview) VALUES (?, ?, ?, ?, ?)`
);
for (const item of seedItems) insertItem.run(...item);

module.exports = db;
