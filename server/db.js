const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
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
      discount_item_id TEXT,
      discount_pct INTEGER NOT NULL DEFAULT 0,
      discount_ads_today INTEGER NOT NULL DEFAULT 0,
      discount_ads_date TEXT,
      created_at TEXT NOT NULL DEFAULT NOW()::text
    );

    CREATE TABLE IF NOT EXISTS game_progress (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      game_id TEXT NOT NULL,
      data_json TEXT NOT NULL DEFAULT '{}',
      updated_at TEXT NOT NULL DEFAULT NOW()::text,
      UNIQUE(user_id, game_id)
    );

    CREATE TABLE IF NOT EXISTS leaderboard (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      game_id TEXT NOT NULL,
      high_score INTEGER NOT NULL,
      updated_at TEXT NOT NULL DEFAULT NOW()::text,
      UNIQUE(user_id, game_id)
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
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      item_id TEXT NOT NULL REFERENCES shop_items(id),
      acquired_at TEXT NOT NULL DEFAULT NOW()::text,
      UNIQUE(user_id, item_id)
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

  for (const item of seedItems) {
    await pool.query(
      'INSERT INTO shop_items (id, name, type, cost, preview, rarity) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING',
      item
    );
  }
}

module.exports = { pool, initDb };
