const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'arcade.db'));
db.pragma('journal_mode = WAL');

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
  type TEXT NOT NULL,
  cost INTEGER NOT NULL,
  preview TEXT NOT NULL,
  rarity TEXT NOT NULL DEFAULT 'common'
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

const seedItems = [
  ['skin_amber', 'Amber Cartridge', 'skin', 50, '#F2C14E', 'common'],
  ['skin_sage', 'Sage Cartridge', 'skin', 50, '#66A182', 'common'],
  ['skin_plum', 'Plum Cartridge', 'skin', 80, '#7B4B94', 'rare'],
  ['skin_ember', 'Ember Cartridge', 'skin', 80, '#E4572E', 'rare'],
  ['skin_holo', 'Holo Cartridge', 'skin', 200, 'linear-gradient(135deg,#F2C14E,#E4572E,#7B4B94)', 'legendary'],
  ['frame_default', 'Classic Frame', 'frame', 0, '#3A3A55', 'common'],
  ['frame_gold', 'Gold Frame', 'frame', 120, '#F2C14E', 'rare'],
  ['frame_neon', 'Neon Frame', 'frame', 150, '#66A182', 'epic'],
  ['frame_royal', 'Royal Frame', 'frame', 180, '#7B4B94', 'legendary'],
];

const insertItem = db.prepare(
  'INSERT OR IGNORE INTO shop_items (id, name, type, cost, preview, rarity) VALUES (?, ?, ?, ?, ?, ?)'
);
for (const item of seedItems) insertItem.run(...item);

module.exports = db;
