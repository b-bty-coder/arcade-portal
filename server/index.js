const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const db = require('./db');
const { signToken, requireAuth } = require('./auth');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;

const MAX_SCORE = {
  snake: 5000,
  memory: 100000,
};

app.get('/api/stats/overview', (req, res) => {
  const perGame = db
    .prepare('SELECT game_id, COUNT(*) as players FROM leaderboard GROUP BY game_id')
    .all();
  const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get();
  const playerCounts = {};
  perGame.forEach((row) => { playerCounts[row.game_id] = row.players; });
  res.json({ playerCounts, totalUsers: totalUsers.count });
});

app.post('/api/auth/register', (req, res) => {
  const { username, email, password } = req.body || {};
  if (!username || !email || !password || password.length < 6) {
    return res.status(400).json({ error: 'Username, email and a password of 6+ characters are required' });
  }
  try {
    const hash = bcrypt.hashSync(password, 10);
    const info = db
      .prepare('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)')
      .run(username, email, hash);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
    db.prepare('INSERT OR IGNORE INTO inventory (user_id, item_id) VALUES (?, ?)').run(user.id, 'frame_default');
    const token = signToken(user);
    res.json({ token, user: publicUser(user) });
  } catch (e) {
    if (String(e).includes('UNIQUE')) {
      return res.status(409).json({ error: 'Username or email already in use' });
    }
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password || '', user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  const token = signToken(user);
  res.json({ token, user: publicUser(user) });
});

function publicUser(u) {
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    coins: u.coins,
    currentStreak: u.current_streak,
    longestStreak: u.longest_streak,
    equippedSkin: u.equipped_skin,
    equippedFrame: u.equipped_frame,
  };
}

app.get('/api/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const inventory = db
    .prepare('SELECT item_id FROM inventory WHERE user_id = ?')
    .all(req.userId)
    .map((r) => r.item_id);
  res.json({ user: publicUser(user), inventory });
});

app.post('/api/streak/checkin', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
  const today = new Date().toISOString().slice(0, 10);

  if (user.last_checkin_date === today) {
    return res.json({
      streak: user.current_streak,
      coinsAwarded: 0,
      alreadyCheckedInToday: true,
      coins: user.coins,
    });
  }

  let newStreak = 1;
  if (user.last_checkin_date) {
    const last = new Date(user.last_checkin_date);
    const diffDays = Math.round((new Date(today) - last) / 86400000);
    newStreak = diffDays === 1 ? user.current_streak + 1 : 1;
  }

  const dayInCycle = ((newStreak - 1) % 7) + 1;
  const coinsAwarded = dayInCycle * 10;
  const longest = Math.max(user.longest_streak, newStreak);

  db.prepare(
    'UPDATE users SET current_streak = ?, longest_streak = ?, last_checkin_date = ?, coins = coins + ? WHERE id = ?'
  ).run(newStreak, longest, today, coinsAwarded, user.id);

  const updated = db.prepare('SELECT coins FROM users WHERE id = ?').get(user.id);
  res.json({ streak: newStreak, coinsAwarded, alreadyCheckedInToday: false, coins: updated.coins });
});

const AD_REWARD_COINS = 20;
const MAX_AD_REWARDS_PER_DAY = 5;

app.post('/api/coins/reward-ad', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
  const today = new Date().toISOString().slice(0, 10);
  const alreadyToday = user.ad_rewards_date === today ? user.ad_rewards_today : 0;

  if (alreadyToday >= MAX_AD_REWARDS_PER_DAY) {
    return res.status(429).json({ error: 'Daily ad-reward limit reached, come back tomorrow' });
  }

  db.prepare(
    'UPDATE users SET coins = coins + ?, ad_rewards_today = ?, ad_rewards_date = ? WHERE id = ?'
  ).run(AD_REWARD_COINS, alreadyToday + 1, today, user.id);

  const updated = db.prepare('SELECT coins FROM users WHERE id = ?').get(user.id);
  res.json({
    ok: true,
    coinsAwarded: AD_REWARD_COINS,
    coins: updated.coins,
    remainingToday: MAX_AD_REWARDS_PER_DAY - (alreadyToday + 1),
  });
});

app.get('/api/progress/:gameId', requireAuth, (req, res) => {
  const row = db
    .prepare('SELECT data_json, updated_at FROM game_progress WHERE user_id = ? AND game_id = ?')
    .get(req.userId, req.params.gameId);
  res.json({ data: row ? JSON.parse(row.data_json) : null, updatedAt: row ? row.updated_at : null });
});

app.post('/api/progress/:gameId', requireAuth, (req, res) => {
  const { data } = req.body || {};
  if (typeof data === 'undefined') return res.status(400).json({ error: 'Missing data' });
  db.prepare(
    "INSERT INTO game_progress (user_id, game_id, data_json, updated_at) VALUES (?, ?, ?, datetime('now')) ON CONFLICT(user_id, game_id) DO UPDATE SET data_json = excluded.data_json, updated_at = excluded.updated_at"
  ).run(req.userId, req.params.gameId, JSON.stringify(data));
  res.json({ ok: true });
});

app.post('/api/leaderboard/:gameId', requireAuth, (req, res) => {
  const { score } = req.body || {};
  const gameId = req.params.gameId;
  const ceiling = MAX_SCORE[gameId];
  if (typeof score !== 'number' || !Number.isFinite(score) || score < 0) {
    return res.status(400).json({ error: 'Invalid score' });
  }
  if (ceiling && score > ceiling) {
    return res.status(400).json({ error: 'Score rejected: exceeds plausible maximum for this game' });
  }

  const existing = db
    .prepare('SELECT high_score FROM leaderboard WHERE user_id = ? AND game_id = ?')
    .get(req.userId, gameId);

  if (!existing || score > existing.high_score) {
    db.prepare(
      "INSERT INTO leaderboard (user_id, game_id, high_score, updated_at) VALUES (?, ?, ?, datetime('now')) ON CONFLICT(user_id, game_id) DO UPDATE SET high_score = excluded.high_score, updated_at = excluded.updated_at"
    ).run(req.userId, gameId, score);
  }
  res.json({ ok: true, isNewHighScore: !existing || score > existing.high_score });
});

app.get('/api/leaderboard/:gameId', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const rows = db
    .prepare(
      'SELECT users.username, leaderboard.high_score, users.equipped_frame FROM leaderboard JOIN users ON users.id = leaderboard.user_id WHERE game_id = ? ORDER BY high_score DESC LIMIT ?'
    )
    .all(req.params.gameId, limit);
  res.json({ scores: rows });
});

app.get('/api/leaderboard-global/top', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const rows = db
    .prepare(
      'SELECT users.username, users.equipped_frame, SUM(leaderboard.high_score) as total_score FROM leaderboard JOIN users ON users.id = leaderboard.user_id GROUP BY leaderboard.user_id ORDER BY total_score DESC LIMIT ?'
    )
    .all(limit);
  res.json({ scores: rows });
});

app.get('/api/shop/items', (req, res) => {
  res.json({ items: db.prepare('SELECT * FROM shop_items').all() });
});

app.post('/api/shop/buy', requireAuth, (req, res) => {
  const { itemId } = req.body || {};
  const item = db.prepare('SELECT * FROM shop_items WHERE id = ?').get(itemId);
  if (!item) return res.status(404).json({ error: 'Item not found' });

  const owned = db.prepare('SELECT 1 FROM inventory WHERE user_id = ? AND item_id = ?').get(req.userId, itemId);
  if (owned) return res.status(409).json({ error: 'Already owned' });

  const user = db.prepare('SELECT coins FROM users WHERE id = ?').get(req.userId);
  if (user.coins < item.cost) return res.status(402).json({ error: 'Not enough coins' });

  const buy = db.transaction(() => {
    db.prepare('UPDATE users SET coins = coins - ? WHERE id = ?').run(item.cost, req.userId);
    db.prepare('INSERT INTO inventory (user_id, item_id) VALUES (?, ?)').run(req.userId, itemId);
  });
  buy();

  const updated = db.prepare('SELECT coins FROM users WHERE id = ?').get(req.userId);
  res.json({ ok: true, coins: updated.coins });
});

app.post('/api/shop/equip', requireAuth, (req, res) => {
  const { itemId, type } = req.body || {};
  if (!['skin', 'frame'].includes(type)) return res.status(400).json({ error: 'Invalid type' });

  const owned = db.prepare('SELECT 1 FROM inventory WHERE user_id = ? AND item_id = ?').get(req.userId, itemId);
  if (!owned) return res.status(403).json({ error: 'Item not owned' });

  const column = type === 'skin' ? 'equipped_skin' : 'equipped_frame';
  db.prepare('UPDATE users SET ' + column + ' = ? WHERE id = ?').run(itemId, req.userId);
  res.json({ ok: true });
});

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log('Arcade portal API running on http://localhost:' + PORT);
});
