export const SKIN_PREVIEWS = {
  skin_amber: '#F2C14E',
  skin_sage: '#66A182',
  skin_plum: '#7B4B94',
  skin_ember: '#E4572E',
  skin_holo: 'linear-gradient(135deg, #F2C14E, #E4572E, #7B4B94)',
};

export const FRAME_PREVIEWS = {
  frame_default: '#3A3A55',
  frame_gold: '#F2C14E',
  frame_neon: '#66A182',
  frame_royal: '#7B4B94',
};

export const RARITY_COLORS = {
  common: '#A8A3C0',
  rare: '#66A182',
  epic: '#7B4B94',
  legendary: '#F2C14E',
};

export function getSkinPreview(id) {
  return SKIN_PREVIEWS[id] || 'var(--amber)';
}

export function getFramePreview(id) {
  return FRAME_PREVIEWS[id] || 'var(--line)';
}

export function getRarityColor(rarity) {
  return RARITY_COLORS[rarity] || RARITY_COLORS.common;
}
