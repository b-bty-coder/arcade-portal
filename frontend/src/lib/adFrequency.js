// Shared, in-memory ad-frequency counters used by every game.
// Counters live for the lifetime of the page (reset on full reload),
// and are intentionally simple module-level state — no need for
// React context since games mount one at a time.

const state = {
  fails: 0,
  levels: 0,
};

export function recordFail() {
  state.fails += 1;
  const showInterstitial = state.fails % 3 === 0;
  return { showInterstitial };
}

export function recordLevelPassed() {
  state.levels += 1;
  const showInterstitial = state.levels % 3 === 0;
  return { showInterstitial };
}

export function resetFails() {
  state.fails = 0;
}

export function resetLevels() {
  state.levels = 0;
}
