const BASE = '/api';

function getToken() {
  return localStorage.getItem('arcade_token');
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = 'Bearer ' + token;
  }
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || ('Request failed (' + res.status + ')'));
  }
  return data;
}

export const api = {
  register: (payload) => request('/auth/register', { method: 'POST', body: payload, auth: false }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload, auth: false }),
  me: () => request('/me'),
  checkin: () => request('/streak/checkin', { method: 'POST' }),
  claimAdReward: () => request('/coins/reward-ad', { method: 'POST' }),
  getProgress: (gameId) => request('/progress/' + gameId),
  saveProgress: (gameId, data) => request('/progress/' + gameId, { method: 'POST', body: { data } }),
  submitScore: (gameId, score) => request('/leaderboard/' + gameId, { method: 'POST', body: { score } }),
  getLeaderboard: (gameId) => request('/leaderboard/' + gameId, { auth: false }),
  getGlobalLeaderboard: () => request('/leaderboard-global/top', { auth: false }),
  getShopItems: () => request('/shop/items', { auth: false }),
  getStatsOverview: () => request('/stats/overview', { auth: false }),
  buyItem: (itemId) => request('/shop/buy', { method: 'POST', body: { itemId } }),
  equipItem: (itemId, type) => request('/shop/equip', { method: 'POST', body: { itemId, type } }),
};

export { getToken };
