// These are PLACEHOLDERS. Replace the inner markup with your real ad
// network's embed snippet (Google AdSense <ins> tag, AdMob web SDK,
// or a GPT/offerwall network's script) once you have an account.
//
// IMPORTANT for the rewarded slot: never credit the reward on the
// client just because this component fired. Call your backend, and
// only credit coins after the backend gets a server-to-server
// postback / verification from the ad network. See server/index.js
// for where that verification endpoint should live.

export function BannerAdSlot({ label = 'Banner ad' }) {
  return (
    <div className="ad-slot banner">
      [{label} — swap for real AdSense/AdMob unit here]
    </div>
  );
}

export function RewardedAdSlot({ onRewardClaim, rewardLabel = '+20 coins' }) {
  function simulateWatchAd() {
    // DEMO ONLY: in production this click opens the ad SDK's rewarded
    // ad flow. The onRewardClaim callback below should only fire after
    // your backend has confirmed the view really happened.
    onRewardClaim?.();
  }

  return (
    <div className="ad-slot rewarded">
      <p style={{ margin: '0 0 10px' }}>Watch a short ad for {rewardLabel}</p>
      <button className="btn btn-primary" onClick={simulateWatchAd}>
        ▶ Watch ad (demo)
      </button>
    </div>
  );
}

export function InterstitialAdSlot({ onClose, label = 'Interstitial ad' }) {
  return (
    <div className="interstitial-overlay">
      <div className="interstitial-card">
        <p style={{ margin: '0 0 16px' }}>
          [{label} — swap for real AdSense/AdMob interstitial unit here]
        </p>
        <button className="btn btn-primary" onClick={onClose}>
          Continue
        </button>
      </div>
    </div>
  );
}
