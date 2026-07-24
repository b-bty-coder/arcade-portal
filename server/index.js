const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { pool, initDb } = require('./db');
const { signToken, requireAuth } = require('./auth');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;

const MAX_SCORE = {
  snake: 5000,
  memory: 100000,
};

app.get('/api/stats/overview', async (req, res) => {
  try {
    const perGame = await pool.query('SELECT game_id, COUNT(*) as players FROM leaderboard GROUP BY game_id');
    const totalUsers = await pool.query('SELECT COUNT(*) as count FROM users');
    const playerCounts = {};
    perGame.rows.forEach((row) => { playerCounts[row.game_id] = parseInt(row.players, 10); });
    res.json({ playerCounts, totalUsers: parseInt(totalUsers.rows[0].count, 10) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load stats' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body || {};
  if (!username || !email || !password || password.length < 6) {
    return res.status(400).json({ error: 'Username, email and a password of 6+ characters are required' });
  }
  try {
    const hash = bcrypt.hashSync(password, 10);
    const insertResult = await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING *',
      [username, email, hash]
    );
    const user = insertResult.rows[0];
    await pool.query(
      'INSERT INTO inventory (user_id, item_id) VALUES ($1, $2) ON CONFLICT (user_id, item_id) DO NOTHING',
      [user.id, 'frame_default']
    );
    const token = signToken(user);
    res.json({ token, user: publicUser(user) });
  } catch (e) {
    if (String(e.message || e).includes('duplicate key')) {
      return res.status(409).json({ error: 'Username or email already in use' });
    }
    console.error(e);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user || !bcrypt.compareSync(password || '', user.password_hash)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const token = signToken(user);
    res.json({ token, user: publicUser(user) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Login failed' });
  }
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
    discountItemId: u.discount_item_id,
    discountPct: u.discount_pct,
  };
}

app.get('/api/me', requireAuth, async (req, res) => {
  try {
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [req.userId]);
    const user = userResult.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });
    const invResult = await pool.query('SELECT item_id FROM inventory WHERE user_id = $1', [req.userId]);
    const inventory = invResult.rows.map((r) => r.item_id);
    res.json({ user: publicUser(user), inventory });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

app.post('/api/streak/checkin', requireAuth, async (req, res) => {
  try {
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [req.userId]);
    const user = userResult.rows[0];
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

    await pool.query(
      'UPDATE users SET current_streak = $1, longest_streak = $2, last_checkin_date = $3, coins = coins + $4 WHERE id = $5',
      [newStreak, longest, today, coinsAwarded, user.id]
    );

    const updatedResult = await pool.query('SELECT coins FROM users WHERE id = $1', [user.id]);
    res.json({ streak: newStreak, coinsAwarded, alreadyCheckedInToday: false, coins: updatedResult.rows[0].coins });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Check-in failed' });
  }
});

const AD_REWARD_COINS = 20;
const MAX_AD_REWARDS_PER_DAY = 5;

app.post('/api/coins/reward-ad', requireAuth, async (req, res) => {
  try {
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [req.userId]);
    const user = userResult.rows[0];
    const today = new Date().toISOString().slice(0, 10);
    const alreadyToday = user.ad_rewards_date === today ? user.ad_rewards_today : 0;

    if (alreadyToday >= MAX_AD_REWARDS_PER_DAY) {
      return res.status(429).json({ error: 'Daily ad-reward limit reached, come back tomorrow' });
    }

    await pool.query(
      'UPDATE users SET coins = coins + $1, ad_rewards_today = $2, ad_rewards_date = $3 WHERE id = $4',
      [AD_REWARD_COINS, alreadyToday + 1, today, user.id]
    );

    const updatedResult = await pool.query('SELECT coins FROM users WHERE id = $1', [user.id]);
    res.json({
      ok: true,
      coinsAwarded: AD_REWARD_COINS,
      coins: updatedResult.rows[0].coins,
      remainingToday: MAX_AD_REWARDS_PER_DAY - (alreadyToday + 1),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Reward failed' });
  }
});

const DISCOUNT_PCT = 20;
const MAX_DISCOUNT_ADS_PER_DAY = 3;

app.post('/api/shop/watch-ad-discount', requireAuth, async (req, res) => {
  const { itemId } = req.body || {};
  if (!itemId) return res.status(400).json({ error: 'Missing itemId' });

  try {
    const itemResult = await pool.query('SELECT id FROM shop_items WHERE id = $1', [itemId]);
    if (!itemResult.rows[0]) return res.status(404).json({ error: 'Item not found' });

    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [req.userId]);
    const user = userResult.rows[0];
    const today = new Date().toISOString().slice(0, 10);
    const alreadyToday = user.discount_ads_date === today ? user.discount_ads_today : 0;

    if (alreadyToday >= MAX_DISCOUNT_ADS_PER_DAY) {
      return res.status(429).json({ error: 'Daily discount-ad limit reached, come back tomorrow' });
    }

    await pool.query(
      'UPDATE users SET discount_item_id = $1, discount_pct = $2, discount_ads_today = $3, discount_ads_date = $4 WHERE id = $5',
      [itemId, DISCOUNT_PCT, alreadyToday + 1, today, req.userId]
    );

    res.json({
      ok: true,
      itemId,
      discountPct: DISCOUNT_PCT,
      remainingToday: MAX_DISCOUNT_ADS_PER_DAY - (alreadyToday + 1),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Discount-ad failed' });
  }
});

app.get('/api/stats/equipped-counts', async (req, res) => {
  try {
    const skinRows = await pool.query(
      "SELECT equipped_skin, COUNT(*) as count FROM users WHERE equipped_skin IS NOT NULL AND equipped_skin != 'default' GROUP BY equipped_skin"
    );
    const frameRows = await pool.query(
      "SELECT equipped_frame, COUNT(*) as count FROM users WHERE equipped_frame IS NOT NULL AND equipped_frame != 'default' GROUP BY equipped_frame"
    );
    const skins = {};
    skinRows.rows.forEach((r) => { skins[r.equipped_skin] = parseInt(r.count, 10); });
    const frames = {};
    frameRows.rows.forEach((r) => { frames[r.equipped_frame] = parseInt(r.count, 10); });
    res.json({ skins, frames });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load stats' });
  }
});

app.get('/api/progress/:gameId', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT data_json, updated_at FROM game_progress WHERE user_id = $1 AND game_id = $2',
      [req.userId, req.params.gameId]
    );
    const row = result.rows[0];
    res.json({ data: row ? JSON.parse(row.data_json) : null, updatedAt: row ? row.updated_at : null });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load progress' });
  }
});

app.post('/api/progress/:gameId', requireAuth, async (req, res) => {
  const { data } = req.body || {};
  if (typeof data === 'undefined') return res.status(400).json({ error: 'Missing data' });
  try {
    await pool.query(
      `INSERT INTO game_progress (user_id, game_id, data_json, updated_at) VALUES ($1, $2, $3, NOW()::text)
       ON CONFLICT (user_id, game_id) DO UPDATE SET data_json = EXCLUDED.data_json, updated_at = EXCLUDED.updated_at`,
      [req.userId, req.params.gameId, JSON.stringify(data)]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to save progress' });
  }
});

app.post('/api/leaderboard/:gameId', requireAuth, async (req, res) => {
  const { score } = req.body || {};
  const gameId = req.params.gameId;
  const ceiling = MAX_SCORE[gameId];
  if (typeof score !== 'number' || !Number.isFinite(score) || score < 0) {
    return res.status(400).json({ error: 'Invalid score' });
  }
  if (ceiling && score > ceiling) {
    return res.status(400).json({ error: 'Score rejected: exceeds plausible maximum for this game' });
  }

  try {
    const existingResult = await pool.query(
      'SELECT high_score FROM leaderboard WHERE user_id = $1 AND game_id = $2',
      [req.userId, gameId]
    );
    const existing = existingResult.rows[0];

    if (!existing || score > existing.high_score) {
      await pool.query(
        `INSERT INTO leaderboard (user_id, game_id, high_score, updated_at) VALUES ($1, $2, $3, NOW()::text)
         ON CONFLICT (user_id, game_id) DO UPDATE SET high_score = EXCLUDED.high_score, updated_at = EXCLUDED.updated_at`,
        [req.userId, gameId, score]
      );
    }
    res.json({ ok: true, isNewHighScore: !existing || score > existing.high_score });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to submit score' });
  }
});

app.get('/api/leaderboard/:gameId', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  try {
    const result = await pool.query(
      `SELECT users.username, leaderboard.high_score, users.equipped_frame
       FROM leaderboard JOIN users ON users.id = leaderboard.user_id
       WHERE game_id = $1 ORDER BY high_score DESC LIMIT $2`,
      [req.params.gameId, limit]
    );
    res.json({ scores: result.rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load leaderboard' });
  }
});

app.get('/api/leaderboard-global/top', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  try {
    const result = await pool.query(
      `SELECT users.username, users.equipped_frame, SUM(leaderboard.high_score) as total_score
       FROM leaderboard JOIN users ON users.id = leaderboard.user_id
       GROUP BY leaderboard.user_id, users.username, users.equipped_frame
       ORDER BY total_score DESC LIMIT $1`,
      [limit]
    );
    res.json({ scores: result.rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load leaderboard' });
  }
});

app.get('/api/shop/items', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM shop_items');
    res.json({ items: result.rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load shop items' });
  }
});

app.post('/api/shop/buy', requireAuth, async (req, res) => {
  const { itemId } = req.body || {};
  const client = await pool.connect();
  try {
    const itemResult = await client.query('SELECT * FROM shop_items WHERE id = $1', [itemId]);
    const item = itemResult.rows[0];
    if (!item) { client.release(); return res.status(404).json({ error: 'Item not found' }); }

    const ownedResult = await client.query(
      'SELECT 1 FROM inventory WHERE user_id = $1 AND item_id = $2',
      [req.userId, itemId]
    );
    if (ownedResult.rows[0]) { client.release(); return res.status(409).json({ error: 'Already owned' }); }

    const userResult = await client.query('SELECT * FROM users WHERE id = $1', [req.userId]);
    const user = userResult.rows[0];
    const hasDiscount = user.discount_item_id === itemId && user.discount_pct > 0;
    const finalCost = hasDiscount
      ? Math.max(0, Math.round(item.cost * (1 - user.discount_pct / 100)))
      : item.cost;

    if (user.coins < finalCost) { client.release(); return res.status(402).json({ error: 'Not enough coins' }); }

    await client.query('BEGIN');
    await client.query('UPDATE users SET coins = coins - $1 WHERE id = $2', [finalCost, req.userId]);
    await client.query('INSERT INTO inventory (user_id, item_id) VALUES ($1, $2)', [req.userId, itemId]);
    if (hasDiscount) {
      await client.query('UPDATE users SET discount_item_id = NULL, discount_pct = 0 WHERE id = $1', [req.userId]);
    }
    await client.query('COMMIT');

    const updatedResult = await client.query('SELECT coins FROM users WHERE id = $1', [req.userId]);
    res.json({ ok: true, coins: updatedResult.rows[0].coins, paidWithDiscount: hasDiscount, amountPaid: finalCost });
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(e);
    res.status(500).json({ error: 'Purchase failed' });
  } finally {
    client.release();
  }
});

app.post('/api/shop/equip', requireAuth, async (req, res) => {
  const { itemId, type } = req.body || {};
  if (!['skin', 'frame'].includes(type)) return res.status(400).json({ error: 'Invalid type' });

  try {
    const ownedResult = await pool.query(
      'SELECT 1 FROM inventory WHERE user_id = $1 AND item_id = $2',
      [req.userId, itemId]
    );
    if (!ownedResult.rows[0]) return res.status(403).json({ error: 'Item not owned' });

    const column = type === 'skin' ? 'equipped_skin' : 'equipped_frame';
    await pool.query(`UPDATE users SET ${column} = $1 WHERE id = $2`, [itemId, req.userId]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Equip failed' });
  }
});

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log('Arcade portal API running on http://localhost:' + PORT);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
