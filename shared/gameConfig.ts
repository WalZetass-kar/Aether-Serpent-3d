export type SpecialTileType = 'boost' | 'extra_roll' | 'shield' | 'curse';

export type DifficultyMode = 'adaptive' | 'easy' | 'medium' | 'hard';
export type ConnectionMode = 'solo' | 'local' | 'online';
export type BoardGameMode = 'classic' | 'battle' | 'team' | 'time_attack';
export type TeamId = 'A' | 'B';

export interface SnakeOrLadder {
  id: string;
  from: number;
  to: number;
  name: string;
  type: 'ladder' | 'snake';
}

export interface SpecialTileInfo {
  tile: number;
  type: SpecialTileType;
  label: string;
  description: string;
  delta?: number;
}

export interface PlayerConfig {
  id: string;
  name: string;
  isAI: boolean;
  archetypeIndex: number; // 0..3 starter pawns, 4..13 purchasable premium pawns
  color: string;
  accentColor: string;
  team?: TeamId;
}

export interface PlayerState extends PlayerConfig {
  tile: number;
  score: number;
  shields: number;
  turnsTaken: number;
  laddersClimbed: number;
  snakesBitten: number;
  specialTilesHit: number;
  shieldsUsed: number;
  battleHits?: number;
  connected?: boolean;
  ready?: boolean;
  pingMs?: number;
}

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  points: number;
  category: 'journey' | 'mastery' | 'social' | 'daily';
}

export interface DailyChallengeDef {
  date: string; // YYYY-MM-DD
  id: string;
  title: string;
  description: string;
  target: number;
  metric: 'games_played' | 'ladders_climbed' | 'wins' | 'special_tiles';
  bonusScore: number;
}

export type PawnRarity = 'starter' | 'rare' | 'epic' | 'legendary' | 'mythic';

export interface PlayerArchetypeDef {
  archetypeIndex: number;
  title: string;
  role: string;
  description: string;
  color: string;
  accentColor: string;
  hexNum: number;
  accentHexNum: number;
  unlockType: 'free' | 'premium';
  priceCoins: number;
  rarity: PawnRarity;
}

export const STARTER_PAWN_INDICES = [0, 1, 2, 3] as const;

export const PLAYER_ARCHETYPES: PlayerArchetypeDef[] = [
  {
    archetypeIndex: 0,
    title: 'Ksatria Ruby',
    role: 'Pelindung Garda Depan',
    description: 'Ksatria berbaju zirah baja dengan perisai lambang kerajaan dan pedang cahaya ruby.',
    color: '#e11d48',
    accentColor: '#fda4af',
    hexNum: 0xe11d48,
    accentHexNum: 0xfda4af,
    unlockType: 'free',
    priceCoins: 0,
    rarity: 'starter',
  },
  {
    archetypeIndex: 1,
    title: 'Penyihir Safir',
    role: 'Ahli Sihir Astral',
    description: 'Magus bertopi runcing dengan tongkat kristal astral dan jubah konstelasi safir.',
    color: '#2563eb',
    accentColor: '#93c5fd',
    hexNum: 0x3b82f6,
    accentHexNum: 0x93c5fd,
    unlockType: 'free',
    priceCoins: 0,
    rarity: 'starter',
  },
  {
    archetypeIndex: 2,
    title: 'Penjelajah Zamrud',
    role: 'Pemanah Rimba',
    description: 'Pengintai gesit berjubah hutan, lengkap dengan busur panjang lengkung dan tanduk rusa suci.',
    color: '#059669',
    accentColor: '#6ee7b7',
    hexNum: 0x10b981,
    accentHexNum: 0x6ee7b7,
    unlockType: 'free',
    priceCoins: 0,
    rarity: 'starter',
  },
  {
    archetypeIndex: 3,
    title: 'Alkemis Amber',
    role: 'Insinyur Clockwork',
    description: 'Peneliti eksentrik berkacamata kuningan dengan lentera surya dan botol ramuan bercahaya.',
    color: '#d97706',
    accentColor: '#fde68a',
    hexNum: 0xf59e0b,
    accentHexNum: 0xfde68a,
    unlockType: 'free',
    priceCoins: 0,
    rarity: 'starter',
  },
  {
    archetypeIndex: 4,
    title: 'Samurai Naga',
    role: 'Pendekar Api',
    description: 'Ronin berzirah lamela merah menyala dengan helm tanduk sabit emas dan katana bara.',
    color: '#dc2626',
    accentColor: '#fcd34d',
    hexNum: 0xdc2626,
    accentHexNum: 0xfcd34d,
    unlockType: 'premium',
    priceCoins: 550,
    rarity: 'rare',
  },
  {
    archetypeIndex: 5,
    title: 'Valkyrie Cahaya',
    role: 'Pelindung Sayap',
    description: 'Kesatria langit bersayap emas megah yang menggenggam tombak fajar dan perisai surya.',
    color: '#eab308',
    accentColor: '#fef08a',
    hexNum: 0xeab308,
    accentHexNum: 0xfef08a,
    unlockType: 'premium',
    priceCoins: 750,
    rarity: 'rare',
  },
  {
    archetypeIndex: 6,
    title: 'Ksatria Bayangan',
    role: 'Pembunuh Senyap',
    description: 'Pengembara malam bertopeng tudung ungu dengan bilah kembar violet dan jubah kabut.',
    color: '#7c3aed',
    accentColor: '#c4b5fd',
    hexNum: 0x7c3aed,
    accentHexNum: 0xc4b5fd,
    unlockType: 'premium',
    priceCoins: 900,
    rarity: 'epic',
  },
  {
    archetypeIndex: 7,
    title: 'Pendeta Teratai',
    role: 'Mistikus Air',
    description: 'Biksu suci berkalung tasbih batu giok dengan mahkota teratai sian dan tongkat cincin.',
    color: '#06b6d4',
    accentColor: '#a5f3fc',
    hexNum: 0x06b6d4,
    accentHexNum: 0xa5f3fc,
    unlockType: 'premium',
    priceCoins: 1100,
    rarity: 'epic',
  },
  {
    archetypeIndex: 8,
    title: 'Golem Obsidian',
    role: 'Benteng Magma',
    description: 'Raksasa batu vulkanik berinti lava menyala dengan bahu kristal api dan palu tektonik.',
    color: '#ea580c',
    accentColor: '#fdba74',
    hexNum: 0xea580c,
    accentHexNum: 0xfdba74,
    unlockType: 'premium',
    priceCoins: 1300,
    rarity: 'epic',
  },
  {
    archetypeIndex: 9,
    title: 'Archon Siber',
    role: 'Teknomanser',
    description: 'Komandan futuristik dengan visor holografik biru elektrik, sayap halo mekanis, dan pedang plasma.',
    color: '#0284c7',
    accentColor: '#67e8f9',
    hexNum: 0x0284c7,
    accentHexNum: 0x67e8f9,
    unlockType: 'premium',
    priceCoins: 1500,
    rarity: 'epic',
  },
  {
    archetypeIndex: 10,
    title: 'Bajak Laut Aether',
    role: 'Kapten Langit',
    description: 'Nakhoda kapal udara bertopi tricorn berbulu emas dengan pedang cutlass dan kompas astral.',
    color: '#b45309',
    accentColor: '#fde047',
    hexNum: 0xb45309,
    accentHexNum: 0xfde047,
    unlockType: 'premium',
    priceCoins: 1750,
    rarity: 'legendary',
  },
  {
    archetypeIndex: 11,
    title: 'Druid Bulan',
    role: 'Penjaga Hutan',
    description: 'Pemanggil roh rimba bermahkota tanduk bulan sabit dengan tongkat lentera kunang-kunang.',
    color: '#16a34a',
    accentColor: '#bbf7d0',
    hexNum: 0x16a34a,
    accentHexNum: 0xbbf7d0,
    unlockType: 'premium',
    priceCoins: 2000,
    rarity: 'legendary',
  },
  {
    archetypeIndex: 12,
    title: 'Raja Firaun',
    role: 'Penguasa Pasir',
    description: 'Penguasa gurun abadi dengan mahkota nemes emas-biru, tongkat Ankh suci, dan kerah permata.',
    color: '#ca8a04',
    accentColor: '#38bdf8',
    hexNum: 0xca8a04,
    accentHexNum: 0x38bdf8,
    unlockType: 'premium',
    priceCoins: 2400,
    rarity: 'legendary',
  },
  {
    archetypeIndex: 13,
    title: 'Kaisar Naga Abadi',
    role: 'Legenda Agung',
    description: 'Penguasa tertinggi Lembah Aether dengan sayap naga kosmik, tombak naga emas, dan mahkota mitos.',
    color: '#9333ea',
    accentColor: '#facc15',
    hexNum: 0x9333ea,
    accentHexNum: 0xfacc15,
    unlockType: 'premium',
    priceCoins: 3000,
    rarity: 'mythic',
  },
];

export function getArchetypeDef(archetypeIndex: number): PlayerArchetypeDef {
  const safe = Number.isFinite(archetypeIndex) ? Math.floor(archetypeIndex) : 0;
  return PLAYER_ARCHETYPES[((safe % PLAYER_ARCHETYPES.length) + PLAYER_ARCHETYPES.length) % PLAYER_ARCHETYPES.length];
}

export function isPawnUnlocked(
  archetypeIndex: number,
  unlockedPawnIndices?: number[] | null,
): boolean {
  const safe = Math.floor(archetypeIndex);
  if (safe >= 0 && safe <= 3) return true;
  if (!Array.isArray(unlockedPawnIndices)) return false;
  return unlockedPawnIndices.includes(safe);
}

export function getPawnUnlockCost(archetypeIndex: number): number {
  const def = PLAYER_ARCHETYPES.find((a) => a.archetypeIndex === archetypeIndex);
  return def ? def.priceCoins : 0;
}

export const BOARD_GAME_MODES: Array<{
  id: BoardGameMode;
  label: string;
  shortDesc: string;
  rulesDesc: string;
}> = [
  {
    id: 'classic',
    label: 'Classic Mode',
    shortDesc: 'Aturan standar ular tangga',
    rulesDesc: 'Balapan klasik menuju petak 100 dengan tangga suci, ular mistis, dan kotak berkah.',
  },
  {
    id: 'battle',
    label: 'Battle Mode',
    shortDesc: 'Serang & dorong lawan mundur',
    rulesDesc: 'Mendarat di petak lawan mendorongnya mundur 4 petak & mencuri +75 poin (kecuali dilindungi Perisai).',
  },
  {
    id: 'team',
    label: 'Team Mode',
    shortDesc: 'Kerja sama tim Surya vs Bulan',
    rulesDesc: 'Tim berbagi sinergi +40 poin saat bertemu di satu petak. Tim pertama mencapai petak 100 menang bersama!',
  },
  {
    id: 'time_attack',
    label: 'Time Attack',
    shortDesc: 'Berlomba sebelum waktu habis',
    rulesDesc: 'Batas waktu 3 menit! Capai petak 100 secepatnya atau raih petak & skor tertinggi saat waktu habis.',
  },
];

export const BOARD_SIZE = 10;
export const TILE_SPACING = 1.8;
export const TIME_ATTACK_DEFAULT_SEC = 180;
export const ONLINE_TURN_TIMEOUT_SEC = 20;

export const LADDERS: SnakeOrLadder[] = [
  { id: 'L1', from: 4, to: 25, name: 'Tangga Akar Yggdrasil', type: 'ladder' },
  { id: 'L2', from: 6, to: 18, name: 'Tangga Embun Fajar', type: 'ladder' },
  { id: 'L3', from: 13, to: 46, name: 'Tangga Kristal Langit', type: 'ladder' },
  { id: 'L4', from: 19, to: 38, name: 'Tangga Gerbang Lumut', type: 'ladder' },
  { id: 'L5', from: 28, to: 52, name: 'Tangga Pelangi Rimba', type: 'ladder' },
  { id: 'L6', from: 33, to: 49, name: 'Tangga Runik Emas', type: 'ladder' },
  { id: 'L7', from: 42, to: 63, name: 'Tangga Cahaya Bintang', type: 'ladder' },
  { id: 'L8', from: 50, to: 69, name: 'Tangga Menara Zamrud', type: 'ladder' },
  { id: 'L9', from: 59, to: 79, name: 'Tangga Jembatan Peri', type: 'ladder' },
  { id: 'L10', from: 62, to: 81, name: 'Tangga Sayap Aether', type: 'ladder' },
  { id: 'L11', from: 74, to: 91, name: 'Tangga Puncak Sylvan', type: 'ladder' },
  { id: 'L12', from: 80, to: 98, name: 'Tangga Takhta Sanctuary', type: 'ladder' },
];

export const SNAKES: SnakeOrLadder[] = [
  { id: 'S1', from: 27, to: 5, name: 'Ular Kabut Hijau', type: 'snake' },
  { id: 'S2', from: 40, to: 3, name: 'Ular Obsidian', type: 'snake' },
  { id: 'S3', from: 44, to: 17, name: 'Ular Bara Api', type: 'snake' },
  { id: 'S4', from: 54, to: 31, name: 'Ular Bayangan', type: 'snake' },
  { id: 'S5', from: 66, to: 45, name: 'Ular Racun Zamrud', type: 'snake' },
  { id: 'S6', from: 92, to: 73, name: 'Viper Gerbang Puncak', type: 'snake' },
  { id: 'S7', from: 93, to: 68, name: 'Ular Petir Ungu', type: 'snake' },
  { id: 'S8', from: 94, to: 75, name: 'Serpent Kabut Langit', type: 'snake' },
  { id: 'S9', from: 95, to: 64, name: 'Naga Awan Kelam', type: 'snake' },
  { id: 'S10', from: 96, to: 77, name: 'Wyrm Mahkota Emas', type: 'snake' },
  { id: 'S11', from: 97, to: 78, name: 'Serpent Penjaga Puncak', type: 'snake' },
  { id: 'S12', from: 99, to: 2, name: 'Raja Naga Aether Abadi', type: 'snake' },
];

export const SPECIAL_TILES: SpecialTileInfo[] = [
  { tile: 9, type: 'boost', label: 'Angin Aether', description: 'Dorongan angin magis +4 langkah maju!', delta: 4 },
  { tile: 21, type: 'boost', label: 'Angin Aether', description: 'Dorongan angin magis +4 langkah maju!', delta: 4 },
  { tile: 58, type: 'boost', label: 'Angin Aether', description: 'Dorongan angin magis +4 langkah maju!', delta: 4 },
  { tile: 84, type: 'boost', label: 'Angin Aether', description: 'Dorongan angin magis +4 langkah maju!', delta: 4 },

  { tile: 16, type: 'extra_roll', label: 'Dadu Berkah', description: 'Dapatkan satu lemparan dadu tambahan!', delta: 0 },
  { tile: 37, type: 'extra_roll', label: 'Dadu Berkah', description: 'Dapatkan satu lemparan dadu tambahan!', delta: 0 },
  { tile: 65, type: 'extra_roll', label: 'Dadu Berkah', description: 'Dapatkan satu lemparan dadu tambahan!', delta: 0 },
  { tile: 88, type: 'extra_roll', label: 'Dadu Berkah', description: 'Dapatkan satu lemparan dadu tambahan!', delta: 0 },

  { tile: 12, type: 'shield', label: 'Perisai Suci', description: 'Menangkal 1x gigitan ular, kutukan, atau serangan duel.', delta: 0 },
  { tile: 34, type: 'shield', label: 'Perisai Suci', description: 'Menangkal 1x gigitan ular, kutukan, atau serangan duel.', delta: 0 },
  { tile: 55, type: 'shield', label: 'Perisai Suci', description: 'Menangkal 1x gigitan ular, kutukan, atau serangan duel.', delta: 0 },
  { tile: 76, type: 'shield', label: 'Perisai Suci', description: 'Menangkal 1x gigitan ular, kutukan, atau serangan duel.', delta: 0 },

  { tile: 23, type: 'curse', label: 'Kabut Penyesat', description: 'Kabut gelap mendorongmu mundur 3 langkah.', delta: -3 },
  { tile: 47, type: 'curse', label: 'Kabut Penyesat', description: 'Kabut gelap mendorongmu mundur 3 langkah.', delta: -3 },
  { tile: 71, type: 'curse', label: 'Kabut Penyesat', description: 'Kabut gelap mendorongmu mundur 3 langkah.', delta: -3 },
  { tile: 90, type: 'curse', label: 'Kabut Penyesat', description: 'Kabut gelap mendorongmu mundur 3 langkah.', delta: -3 },
];

export const SPECIAL_TILE_MAP = new Map<number, SpecialTileInfo>(
  SPECIAL_TILES.map((t) => [t.tile, t]),
);

export const JUMP_MAP = new Map<number, SnakeOrLadder>(
  [...LADDERS, ...SNAKES].map((item) => [item.from, item]),
);

export function buildJumpMap(
  ladders?: SnakeOrLadder[],
  snakes?: SnakeOrLadder[],
): Map<number, SnakeOrLadder> {
  const effectiveLadders = Array.isArray(ladders) ? ladders : LADDERS;
  const effectiveSnakes = Array.isArray(snakes) ? snakes : SNAKES;
  const map = new Map<number, SnakeOrLadder>();
  for (let i = 0; i < effectiveLadders.length; i++) {
    const item = effectiveLadders[i];
    if (!item) continue;
    const from = Math.round(Number(item.from));
    const to = Math.round(Number(item.to));
    if (
      Number.isFinite(from) &&
      Number.isFinite(to) &&
      from > 1 &&
      from < 100 &&
      to > from &&
      to <= 100
    ) {
      map.set(from, {
        id: item.id || `L${i + 1}`,
        from,
        to,
        name: item.name || `Tangga Suci #${i + 1}`,
        type: 'ladder',
      });
    }
  }
  for (let i = 0; i < effectiveSnakes.length; i++) {
    const item = effectiveSnakes[i];
    if (!item) continue;
    const from = Math.round(Number(item.from));
    const to = Math.round(Number(item.to));
    if (
      Number.isFinite(from) &&
      Number.isFinite(to) &&
      from > 1 &&
      from < 100 &&
      to >= 1 &&
      to < from
    ) {
      map.set(from, {
        id: item.id || `S${i + 1}`,
        from,
        to,
        name: item.name || `Ular Mistis #${i + 1}`,
        type: 'snake',
      });
    }
  }
  return map;
}

const FANTASY_TITLES = [
  'Ksatria',
  'Penyihir',
  'Penjelajah',
  'Alkemis',
  'Penjaga',
  'Pengembara',
  'Arkon',
  'Pangeran',
];

const FANTASY_NAMES = [
  'Aldebaran',
  'Lyra',
  'Orion',
  'Valkyrie',
  'Zephyr',
  'Kaelen',
  'Selena',
  'Draven',
  'Aurelia',
  'Sylph',
  'Vanguard',
  'Solstice',
  'Astrea',
  'Hyperion',
  'Caspian',
  'Seraphina',
];

/**
 * Generates a unique, non-duplicate fantasy player name per device based on its seed/playerId.
 */
export function generateUniqueDevicePlayerName(seedId: string): string {
  let hash = 2166136261;
  for (let i = 0; i < seedId.length; i++) {
    hash ^= seedId.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const unsigned = hash >>> 0;
  const title = FANTASY_TITLES[unsigned % FANTASY_TITLES.length];
  const hero = FANTASY_NAMES[(unsigned >>> 4) % FANTASY_NAMES.length];
  const badgeNum = 100 + ((unsigned >>> 9) % 900);
  return `${title} ${hero} #${badgeNum}`;
}

/**
 * Ensures a joining or local player's name never duplicates an existing player's name.
 */
export function disambiguatePlayerName(
  desiredName: string,
  existingNames: string[],
  fallbackSeed?: string,
): string {
  const base = desiredName.trim().slice(0, 24) || generateUniqueDevicePlayerName(fallbackSeed || `${Date.now()}`);
  const lowerExisting = new Set(existingNames.map((n) => n.trim().toLowerCase()));
  if (!lowerExisting.has(base.toLowerCase())) {
    return base;
  }
  const suffixTag = fallbackSeed
    ? Math.abs(
        fallbackSeed.split('').reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) | 0, 7),
      ) % 900 + 100
    : Math.floor(100 + Math.random() * 900);
  const candidate = `${base.slice(0, 19)} #${suffixTag}`;
  if (!lowerExisting.has(candidate.toLowerCase())) {
    return candidate;
  }
  let counter = 2;
  while (lowerExisting.has(`${base.slice(0, 20)} (${counter})`.toLowerCase())) {
    counter++;
  }
  return `${base.slice(0, 20)} (${counter})`;
}

export function tileToWorld(tile: number): { x: number; z: number; row: number; col: number } {
  const clamped = Math.max(1, Math.min(100, tile));
  const zeroBased = clamped - 1;
  const row = Math.floor(zeroBased / BOARD_SIZE);
  const rawCol = zeroBased % BOARD_SIZE;
  const col = row % 2 === 0 ? rawCol : BOARD_SIZE - 1 - rawCol;

  const halfSpan = ((BOARD_SIZE - 1) * TILE_SPACING) / 2;
  const x = col * TILE_SPACING - halfSpan;
  const z = halfSpan - row * TILE_SPACING;
  return { x, z, row, col };
}

export function getDifficultyMultiplier(difficulty: DifficultyMode): number {
  switch (difficulty) {
    case 'easy':
      return 1.0;
    case 'medium':
      return 1.25;
    case 'hard':
      return 1.5;
    case 'adaptive':
      return 1.3;
  }
}

export function getAdaptiveTierLabel(recentResults: boolean[]): {
  tier: 'Pemula' | 'Seimbang' | 'Tantangan' | 'Master';
  aiBias: number;
} {
  if (recentResults.length === 0) {
    return { tier: 'Seimbang', aiBias: 0.05 };
  }
  const recent = recentResults.slice(-8);
  const wins = recent.filter(Boolean).length;
  const winRate = wins / recent.length;
  if (winRate >= 0.75 && recent.length >= 3) {
    return { tier: 'Master', aiBias: 0.35 };
  }
  if (winRate >= 0.55) {
    return { tier: 'Tantangan', aiBias: 0.18 };
  }
  if (winRate <= 0.25 && recent.length >= 2) {
    return { tier: 'Pemula', aiBias: -0.2 };
  }
  return { tier: 'Seimbang', aiBias: 0.05 };
}

export function rollAdaptiveAIDice(
  aiTile: number,
  bestHumanTile: number,
  difficulty: DifficultyMode,
  recentResults: boolean[],
  customJumpMap?: Map<number, SnakeOrLadder>,
): number {
  const activeJumpMap = customJumpMap ?? JUMP_MAP;
  let bias = 0;
  if (difficulty === 'easy') bias = -0.25;
  else if (difficulty === 'medium') bias = 0.08;
  else if (difficulty === 'hard') bias = 0.38;
  else {
    const adaptive = getAdaptiveTierLabel(recentResults);
    const gap = bestHumanTile - aiTile;
    bias = adaptive.aiBias + Math.max(-0.2, Math.min(0.25, gap * 0.01));
  }

  const weights = [1, 1, 1, 1, 1, 1];
  for (let roll = 1; roll <= 6; roll++) {
    let landing = aiTile + roll;
    if (landing > 100) landing = 100 - (landing - 100);
    const special = SPECIAL_TILE_MAP.get(landing);
    let postSpecialLanding = landing;
    if (special?.type === 'boost') {
      const target = landing + (special.delta ?? 4);
      postSpecialLanding = target > 100 ? 100 - (target - 100) : target;
    } else if (special?.type === 'curse') {
      postSpecialLanding = Math.max(1, landing + (special.delta ?? -3));
    }
    const jump = activeJumpMap.get(postSpecialLanding);
    let utility = roll * 0.4;
    if (postSpecialLanding === 100 || landing === 100) utility += 12;
    if (jump?.type === 'ladder' && jump.to > jump.from) utility += 6;
    if (jump?.type === 'snake' && jump.to < jump.from) utility -= 6;
    if (special?.type === 'boost' || special?.type === 'extra_roll' || special?.type === 'shield') {
      utility += 3;
    }
    if (special?.type === 'curse') utility -= 2.5;
    weights[roll - 1] = Math.max(0.2, 1 + bias * utility * 0.25);
  }

  const total = weights.reduce((acc, w) => acc + w, 0);
  let r = Math.random() * total;
  for (let i = 0; i < 6; i++) {
    r -= weights[i];
    if (r <= 0) return i + 1;
  }
  return Math.floor(Math.random() * 6) + 1;
}

export interface BattlePushEvent {
  targetPlayerId: string;
  targetPlayerName: string;
  fromTile: number;
  toTile: number;
  blockedByShield: boolean;
}

export interface TeamSynergyEvent {
  allyPlayerId: string;
  allyPlayerName: string;
  bonusScore: number;
}

export interface TurnResolution {
  roll: number;
  startTile: number;
  pathTiles: number[];
  landedTile: number;
  specialHit: SpecialTileInfo | null;
  shieldBlocked: boolean;
  postSpecialTile: number;
  jumpTriggered: SnakeOrLadder | null;
  finalTile: number;
  extraTurn: boolean;
  scoreDelta: number;
  shieldsDelta: number;
  won: boolean;
  battlePush?: BattlePushEvent | null;
  teamSynergy?: TeamSynergyEvent | null;
}

export function resolveTurnMove(
  startTile: number,
  roll: number,
  currentShields: number,
  context?: {
    boardMode?: BoardGameMode;
    actorId?: string;
    actorTeam?: TeamId;
    otherPlayers?: PlayerState[];
    customJumpMap?: Map<number, SnakeOrLadder>;
    boardConfig?: { ladders?: SnakeOrLadder[]; snakes?: SnakeOrLadder[] };
  },
): TurnResolution {
  const pathTiles: number[] = [];
  let cursor = startTile;
  let direction = 1;

  for (let i = 0; i < roll; i++) {
    if (cursor === 100) {
      direction = -1;
    }
    cursor += direction;
    pathTiles.push(cursor);
  }

  const landedTile = cursor;
  let scoreDelta = roll * 25;
  let shieldsDelta = 0;
  let shieldBlocked = false;
  let extraTurn = roll === 6;

  const specialHit = SPECIAL_TILE_MAP.get(landedTile) ?? null;
  let postSpecialTile = landedTile;

  if (specialHit) {
    if (specialHit.type === 'boost') {
      scoreDelta += 120;
      const target = landedTile + (specialHit.delta ?? 4);
      postSpecialTile = target > 100 ? 100 - (target - 100) : target;
    } else if (specialHit.type === 'extra_roll') {
      scoreDelta += 120;
      extraTurn = true;
    } else if (specialHit.type === 'shield') {
      scoreDelta += 140;
      shieldsDelta += 1;
    } else if (specialHit.type === 'curse') {
      if (currentShields + shieldsDelta > 0) {
        shieldsDelta -= 1;
        shieldBlocked = true;
        scoreDelta += 200;
      } else {
        postSpecialTile = Math.max(1, landedTile + (specialHit.delta ?? -3));
        scoreDelta = Math.max(0, scoreDelta - 25);
      }
    }
  }

  const activeJumpMap =
    context?.customJumpMap !== undefined
      ? context.customJumpMap
      : context?.boardConfig
        ? buildJumpMap(context.boardConfig.ladders, context.boardConfig.snakes)
        : JUMP_MAP;

  const candidateJump = activeJumpMap.get(postSpecialTile) ?? null;
  const isValidJump =
    candidateJump !== null &&
    candidateJump.from === postSpecialTile &&
    ((candidateJump.type === 'ladder' &&
      candidateJump.from > 1 &&
      candidateJump.from < 100 &&
      candidateJump.to > candidateJump.from &&
      candidateJump.to <= 100) ||
      (candidateJump.type === 'snake' &&
        candidateJump.from > 1 &&
        candidateJump.from < 100 &&
        candidateJump.to >= 1 &&
        candidateJump.to < candidateJump.from));

  const jumpTriggered = isValidJump ? candidateJump : null;
  let finalTile = postSpecialTile;

  if (jumpTriggered) {
    if (jumpTriggered.type === 'ladder') {
      finalTile = jumpTriggered.to;
      scoreDelta += 180 + Math.max(0, jumpTriggered.to - jumpTriggered.from) * 8;
    } else if (jumpTriggered.type === 'snake') {
      if (currentShields + shieldsDelta > 0) {
        shieldsDelta -= 1;
        shieldBlocked = true;
        scoreDelta += 220;
        finalTile = postSpecialTile;
      } else {
        finalTile = jumpTriggered.to;
        scoreDelta = Math.max(0, scoreDelta - 40);
      }
    }
  }

  // Mode-specific interaction on finalTile (Battle duel push or Team synergy)
  let battlePush: BattlePushEvent | null = null;
  let teamSynergy: TeamSynergyEvent | null = null;
  const boardMode = context?.boardMode ?? 'classic';
  const others = context?.otherPlayers ?? [];

  if (finalTile > 1 && finalTile < 100 && others.length > 0) {
    if (boardMode === 'battle') {
      const victim = others.find((o) => o.id !== context?.actorId && o.tile === finalTile);
      if (victim) {
        if (victim.shields > 0) {
          battlePush = {
            targetPlayerId: victim.id,
            targetPlayerName: victim.name,
            fromTile: victim.tile,
            toTile: victim.tile,
            blockedByShield: true,
          };
        } else {
          const pushedTo = Math.max(1, victim.tile - 4);
          scoreDelta += 150;
          battlePush = {
            targetPlayerId: victim.id,
            targetPlayerName: victim.name,
            fromTile: victim.tile,
            toTile: pushedTo,
            blockedByShield: false,
          };
        }
      }
    } else if (boardMode === 'team' && context?.actorTeam) {
      const ally = others.find(
        (o) => o.id !== context?.actorId && o.team === context.actorTeam && o.tile === finalTile,
      );
      if (ally) {
        scoreDelta += 100;
        teamSynergy = {
          allyPlayerId: ally.id,
          allyPlayerName: ally.name,
          bonusScore: 100,
        };
      }
    }
  }

  const won = finalTile === 100;
  if (won) {
    extraTurn = false;
  }

  return {
    roll,
    startTile,
    pathTiles,
    landedTile,
    specialHit,
    shieldBlocked,
    postSpecialTile,
    jumpTriggered,
    finalTile,
    extraTurn,
    scoreDelta,
    shieldsDelta,
    won,
    battlePush,
    teamSynergy,
  };
}

export function applyTurnEffectsToPlayers(
  players: PlayerState[],
  actorId: string,
  resolution: TurnResolution,
  difficulty: DifficultyMode,
): PlayerState[] {
  return players.map((p) => {
    if (p.id === actorId) {
      const turnsTaken = p.turnsTaken + 1;
      const bonus = resolution.won ? calculateVictoryBonus(turnsTaken, difficulty) : 0;
      return {
        ...p,
        tile: resolution.finalTile,
        score: Math.max(0, p.score + resolution.scoreDelta + bonus),
        shields: Math.max(0, p.shields + resolution.shieldsDelta),
        turnsTaken,
        laddersClimbed: p.laddersClimbed + (resolution.jumpTriggered?.type === 'ladder' ? 1 : 0),
        snakesBitten:
          p.snakesBitten +
          (resolution.jumpTriggered?.type === 'snake' && !resolution.shieldBlocked ? 1 : 0),
        specialTilesHit: p.specialTilesHit + (resolution.specialHit ? 1 : 0),
        shieldsUsed: p.shieldsUsed + (resolution.shieldBlocked ? 1 : 0),
        battleHits:
          (p.battleHits ?? 0) +
          (resolution.battlePush && !resolution.battlePush.blockedByShield ? 1 : 0),
      };
    }

    if (resolution.battlePush && p.id === resolution.battlePush.targetPlayerId) {
      if (resolution.battlePush.blockedByShield) {
        return {
          ...p,
          shields: Math.max(0, p.shields - 1),
          shieldsUsed: p.shieldsUsed + 1,
        };
      }
      return {
        ...p,
        tile: resolution.battlePush.toTile,
        score: Math.max(0, p.score - 45),
      };
    }

    if (resolution.teamSynergy && p.id === resolution.teamSynergy.allyPlayerId) {
      return {
        ...p,
        score: p.score + resolution.teamSynergy.bonusScore,
      };
    }

    return p;
  });
}

export function pickTimeAttackWinner(players: PlayerState[]): PlayerState | null {
  if (players.length === 0) return null;
  const sorted = [...players].sort((a, b) => b.tile - a.tile || b.score - a.score);
  return sorted[0];
}

export function calculateVictoryBonus(turns: number, difficulty: DifficultyMode): number {
  const efficiency = Math.max(0, 60 - turns) * 35;
  return Math.round((850 + efficiency) * getDifficultyMultiplier(difficulty));
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first_step',
    title: 'Langkah Pertama',
    description: 'Selesaikan 1 pertandingan di papan fantasi.',
    points: 100,
    category: 'journey',
  },
  {
    id: 'ladder_climber',
    title: 'Penakluk Tangga',
    description: 'Naiki total 10 tangga suci sepanjang permainan.',
    points: 200,
    category: 'journey',
  },
  {
    id: 'serpent_shield',
    title: 'Kebal Bisa Ular',
    description: 'Gunakan Perisai Suci untuk menahan gigitan ular atau kutukan.',
    points: 250,
    category: 'mastery',
  },
  {
    id: 'speed_runner',
    title: 'Juara Kilat',
    description: 'Menangkan permainan dalam 22 giliran atau kurang.',
    points: 350,
    category: 'mastery',
  },
  {
    id: 'blessing_collector',
    title: 'Kolektor Berkah',
    description: 'Aktifkan 15 kotak khusus di papan permainan.',
    points: 200,
    category: 'journey',
  },
  {
    id: 'adaptive_master',
    title: 'Master Adaptif',
    description: 'Kalahkan AI pada mode Adaptif atau Sulit.',
    points: 300,
    category: 'mastery',
  },
  {
    id: 'high_scorer',
    title: 'Legenda Skor',
    description: 'Raih skor 2.200 poin atau lebih dalam satu pertandingan.',
    points: 400,
    category: 'mastery',
  },
  {
    id: 'online_champion',
    title: 'Penakluk Arena Daring',
    description: 'Menangkan 1 pertandingan di mode Multiplayer Daring.',
    points: 350,
    category: 'social',
  },
  {
    id: 'daily_devotee',
    title: 'Penjaga Api Harian',
    description: 'Capai beruntun tantangan harian selama 3 hari.',
    points: 300,
    category: 'daily',
  },
  {
    id: 'board_monarch',
    title: 'Raja Papan Aether',
    description: 'Menangkan total 5 pertandingan di mode apa saja.',
    points: 500,
    category: 'journey',
  },
];

export function getTodayDateString(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getDailyChallengeForDate(dateStr = getTodayDateString()): DailyChallengeDef {
  const pool: Omit<DailyChallengeDef, 'date'>[] = [
    {
      id: 'daily_ladders',
      title: 'Pendaki Puncak Aether',
      description: 'Naiki 3 tangga suci dalam pertandingan hari ini.',
      target: 3,
      metric: 'ladders_climbed',
      bonusScore: 300,
    },
    {
      id: 'daily_win',
      title: 'Penakluk Takhta',
      description: 'Menangkan 1 pertandingan di mode Solo atau Daring hari ini.',
      target: 1,
      metric: 'wins',
      bonusScore: 350,
    },
    {
      id: 'daily_special',
      title: 'Pemburu Rune Khusus',
      description: 'Singgahi 4 kotak khusus (Angin, Berkah, Perisai) hari ini.',
      target: 4,
      metric: 'special_tiles',
      bonusScore: 280,
    },
    {
      id: 'daily_play',
      title: 'Ritual Harian',
      description: 'Selesaikan 2 pertandingan lengkap hari ini.',
      target: 2,
      metric: 'games_played',
      bonusScore: 250,
    },
  ];
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash * 31 + dateStr.charCodeAt(i)) >>> 0;
  }
  const picked = pool[hash % pool.length];
  return { ...picked, date: dateStr };
}

// ---------------------------------------------------------------------------
// Custom 3D Dice Skins (Unlocked via Achievements)
// ---------------------------------------------------------------------------

export type DiceSkinId =
  | 'royal_obsidian'
  | 'celestial_core'
  | 'molten_rock'
  | 'emerald_serpent'
  | 'sovereign_gold';

export interface DiceSkinDef {
  id: DiceSkinId;
  name: string;
  subtitle: string;
  description: string;
  requiredAchievementId: string | null;
  requiredAchievementTitle: string;
  previewColors: {
    coreBg: string;
    plateBg: string;
    borderHex: string;
    pipHex: string;
    pipOneHex: string;
    glowHex: string;
  };
  threeMaterials: {
    coreColor: number;
    coreRoughness: number;
    coreMetalness: number;
    coreEmissive: number;
    coreEmissiveIntensity: number;
    studColor: number;
    studEmissive: number;
    studEmissiveIntensity: number;
    ringColor: number;
  };
}

export const DICE_SKINS: DiceSkinDef[] = [
  {
    id: 'royal_obsidian',
    name: 'Royal Obsidian',
    subtitle: 'Warisan Kuno Aether',
    description: 'Dadu batu obsidian kerajaan dengan paku sudut emas murni dan pelat gading klasik.',
    requiredAchievementId: null,
    requiredAchievementTitle: 'Terbuka Sejak Awal',
    previewColors: {
      coreBg: '#0f172a',
      plateBg: '#fffbeb',
      borderHex: '#d97706',
      pipHex: '#1e1b4b',
      pipOneHex: '#dc2626',
      glowHex: '#f59e0b',
    },
    threeMaterials: {
      coreColor: 0x0f172a,
      coreRoughness: 0.25,
      coreMetalness: 0.55,
      coreEmissive: 0x1e293b,
      coreEmissiveIntensity: 0.12,
      studColor: 0xf59e0b,
      studEmissive: 0xd97706,
      studEmissiveIntensity: 0.18,
      ringColor: 0xfbbf24,
    },
  },
  {
    id: 'celestial_core',
    name: 'Celestial Core',
    subtitle: 'Inti Bintang Astral',
    description: 'Kristal kosmik safir bercahaya bintang dengan cincin nebula sian dan mata dadu konstelasi.',
    requiredAchievementId: 'first_step',
    requiredAchievementTitle: 'Langkah Pertama',
    previewColors: {
      coreBg: '#0c1938',
      plateBg: '#0f172a',
      borderHex: '#38bdf8',
      pipHex: '#7dd3fc',
      pipOneHex: '#fde047',
      glowHex: '#0ea5e9',
    },
    threeMaterials: {
      coreColor: 0x172554,
      coreRoughness: 0.14,
      coreMetalness: 0.78,
      coreEmissive: 0x0284c7,
      coreEmissiveIntensity: 0.42,
      studColor: 0x38bdf8,
      studEmissive: 0x7dd3fc,
      studEmissiveIntensity: 0.55,
      ringColor: 0x38bdf8,
    },
  },
  {
    id: 'molten_rock',
    name: 'Molten Rock',
    subtitle: 'Batu Magma Vulkanik',
    description: 'Basalt vulkanik yang retak oleh aliran lava membara dengan paku bara api yang berpijar.',
    requiredAchievementId: 'serpent_shield',
    requiredAchievementTitle: 'Kebal Bisa Ular',
    previewColors: {
      coreBg: '#1c1917',
      plateBg: '#29150e',
      borderHex: '#f97316',
      pipHex: '#fb923c',
      pipOneHex: '#fef08a',
      glowHex: '#ea580c',
    },
    threeMaterials: {
      coreColor: 0x271714,
      coreRoughness: 0.48,
      coreMetalness: 0.42,
      coreEmissive: 0xea580c,
      coreEmissiveIntensity: 0.48,
      studColor: 0xf97316,
      studEmissive: 0xfbbf24,
      studEmissiveIntensity: 0.62,
      ringColor: 0xf97316,
    },
  },
  {
    id: 'emerald_serpent',
    name: 'Emerald Serpent',
    subtitle: 'Permata Naga Giok',
    description: 'Dadu batu giok zamrud berukir sisik naga suci dengan paku perunggu keemasan.',
    requiredAchievementId: 'ladder_climber',
    requiredAchievementTitle: 'Penakluk Tangga',
    previewColors: {
      coreBg: '#022c22',
      plateBg: '#064e3b',
      borderHex: '#10b981',
      pipHex: '#a7f3d0',
      pipOneHex: '#fbbf24',
      glowHex: '#10b981',
    },
    threeMaterials: {
      coreColor: 0x064e3b,
      coreRoughness: 0.2,
      coreMetalness: 0.64,
      coreEmissive: 0x059669,
      coreEmissiveIntensity: 0.34,
      studColor: 0xfbbf24,
      studEmissive: 0x10b981,
      studEmissiveIntensity: 0.35,
      ringColor: 0x34d399,
    },
  },
  {
    id: 'sovereign_gold',
    name: 'Sovereign Monarch',
    subtitle: 'Mahkota Raja Papan',
    description: 'Tempaan emas kekaisaran berkilau tinggi dengan permata rubi merah darah di setiap sudut.',
    requiredAchievementId: 'board_monarch',
    requiredAchievementTitle: 'Raja Papan Aether',
    previewColors: {
      coreBg: '#451a03',
      plateBg: '#18181b',
      borderHex: '#fbbf24',
      pipHex: '#fde68a',
      pipOneHex: '#f43f5e',
      glowHex: '#eab308',
    },
    threeMaterials: {
      coreColor: 0xb45309,
      coreRoughness: 0.16,
      coreMetalness: 0.92,
      coreEmissive: 0xd97706,
      coreEmissiveIntensity: 0.28,
      studColor: 0xf43f5e,
      studEmissive: 0xfb7185,
      studEmissiveIntensity: 0.45,
      ringColor: 0xfde047,
    },
  },
];

export function getDiceSkinDef(skinId?: string | null): DiceSkinDef {
  return DICE_SKINS.find((s) => s.id === skinId) ?? DICE_SKINS[0];
}

export function isDiceSkinUnlocked(
  skinId: DiceSkinId,
  unlockedAchievements: string[],
): boolean {
  const def = getDiceSkinDef(skinId);
  if (!def.requiredAchievementId) return true;
  return unlockedAchievements.includes(def.requiredAchievementId);
}

// ---------------------------------------------------------------------------
// Custom Emote Sets for EmoteWheel (Unlocked via Achievement Progress)
// ---------------------------------------------------------------------------

export type EmoteTone = 'amber' | 'emerald' | 'sky' | 'violet' | 'rose' | 'orange';

export type EmoteSetId =
  | 'classic_aether'
  | 'ember_valor'
  | 'astral_oracle'
  | 'serpent_guild'
  | 'sovereign_crown';

export interface EmoteWheelItem {
  id: string;
  label: string;
  shortLabel: string;
  icon: string;
  payload: string;
  tone: EmoteTone;
  accentHex: string;
  glowRgba: string;
  isAngry?: boolean;
}

export type EmoteUnlockCondition =
  | { type: 'starter' }
  | { type: 'achievement_count'; count: number }
  | { type: 'achievement_points'; points: number }
  | { type: 'specific_achievements'; achievementIds: string[] }
  | { type: 'category_count'; category: AchievementDef['category']; count: number };

export interface EmoteSetDef {
  id: EmoteSetId;
  name: string;
  subtitle: string;
  description: string;
  themeHex: string;
  glowRgba: string;
  unlockCondition: EmoteUnlockCondition;
  requirementLabel: string;
  items: EmoteWheelItem[];
}

export const EMOTE_SETS: EmoteSetDef[] = [
  {
    id: 'classic_aether',
    name: 'Aether Klasik',
    subtitle: 'Set Emote Bawaan Penjelajah',
    description:
      'Ekspresi arena klasik untuk menyapa lawan, merayakan keberhasilan, dan melampiaskan kejutan di papan 3D.',
    themeHex: '#fbbf24',
    glowRgba: 'rgba(251, 191, 36, 0.28)',
    unlockCondition: { type: 'starter' },
    requirementLabel: 'Terbuka Sejak Awal',
    items: [
      {
        id: 'gg',
        label: 'GG!',
        shortLabel: 'GG',
        icon: '🏆',
        payload: '🏆 GG!',
        tone: 'amber',
        accentHex: '#fbbf24',
        glowRgba: 'rgba(251, 191, 36, 0.34)',
      },
      {
        id: 'thanks',
        label: 'Thanks!',
        shortLabel: 'Thanks',
        icon: '🙏',
        payload: '🙏 Thanks!',
        tone: 'emerald',
        accentHex: '#34d399',
        glowRgba: 'rgba(52, 211, 153, 0.32)',
      },
      {
        id: 'well_played',
        label: 'Well Played!',
        shortLabel: 'WP',
        icon: '⚔️',
        payload: '⚔️ Well Played!',
        tone: 'sky',
        accentHex: '#38bdf8',
        glowRgba: 'rgba(56, 189, 248, 0.32)',
      },
      {
        id: 'oops',
        label: 'Oops!',
        shortLabel: 'Oops',
        icon: '😱',
        payload: '😱 Oops!',
        tone: 'violet',
        accentHex: '#c084fc',
        glowRgba: 'rgba(192, 132, 252, 0.34)',
      },
      {
        id: 'angry',
        label: 'Angry!',
        shortLabel: 'Angry',
        icon: '💢',
        payload: '💢 Angry!',
        tone: 'rose',
        accentHex: '#fb7185',
        glowRgba: 'rgba(251, 113, 133, 0.36)',
        isAngry: true,
      },
      {
        id: 'nice',
        label: 'Nice!',
        shortLabel: 'Nice',
        icon: '🔥',
        payload: '🔥 Nice!',
        tone: 'orange',
        accentHex: '#fb923c',
        glowRgba: 'rgba(251, 146, 60, 0.34)',
      },
    ],
  },
  {
    id: 'ember_valor',
    name: 'Bara Ksatria',
    subtitle: 'Semangat Pejuang Arena',
    description:
      'Set emote berapi-api bagi penantang yang berjaya memanaskan duel dengan serangan dan pertahanan.',
    themeHex: '#fb923c',
    glowRgba: 'rgba(251, 146, 60, 0.32)',
    unlockCondition: { type: 'achievement_count', count: 2 },
    requirementLabel: 'Buka minimal 2 Pencapaian apa saja',
    items: [
      {
        id: 'ember_fire',
        label: 'On Fire!',
        shortLabel: 'On Fire',
        icon: '❤️‍🔥',
        payload: '❤️‍🔥 On Fire!',
        tone: 'orange',
        accentHex: '#fb923c',
        glowRgba: 'rgba(251, 146, 60, 0.36)',
      },
      {
        id: 'ember_strike',
        label: 'Strike!',
        shortLabel: 'Strike',
        icon: '⚡',
        payload: '⚡ Strike!',
        tone: 'amber',
        accentHex: '#fbbf24',
        glowRgba: 'rgba(251, 191, 36, 0.34)',
      },
      {
        id: 'ember_guard',
        label: 'Shield Up!',
        shortLabel: 'Guard',
        icon: '🛡️',
        payload: '🛡️ Shield Up!',
        tone: 'sky',
        accentHex: '#38bdf8',
        glowRgba: 'rgba(56, 189, 248, 0.32)',
      },
      {
        id: 'ember_boom',
        label: 'Boom!',
        shortLabel: 'Boom',
        icon: '💥',
        payload: '💥 Boom!',
        tone: 'rose',
        accentHex: '#fb7185',
        glowRgba: 'rgba(251, 113, 133, 0.38)',
        isAngry: true,
      },
      {
        id: 'ember_respect',
        label: 'Respect!',
        shortLabel: 'Respect',
        icon: '🫡',
        payload: '🫡 Respect!',
        tone: 'emerald',
        accentHex: '#34d399',
        glowRgba: 'rgba(52, 211, 153, 0.32)',
      },
      {
        id: 'ember_bring_it',
        label: 'Bring It!',
        shortLabel: 'Challenge',
        icon: '😤',
        payload: '😤 Bring It!',
        tone: 'violet',
        accentHex: '#c084fc',
        glowRgba: 'rgba(192, 132, 252, 0.34)',
        isAngry: true,
      },
    ],
  },
  {
    id: 'astral_oracle',
    name: 'Mistis Astral',
    subtitle: 'Bisikan Bintang & Takdir',
    description:
      'Simbol ramalan kosmik dan keajaiban bintang untuk memprediksi lemparan dadu penuh keberuntungan.',
    themeHex: '#c084fc',
    glowRgba: 'rgba(192, 132, 252, 0.32)',
    unlockCondition: { type: 'achievement_points', points: 600 },
    requirementLabel: 'Kumpulkan 600 Poin Pencapaian',
    items: [
      {
        id: 'astral_bless',
        label: 'Aether Bless!',
        shortLabel: 'Bless',
        icon: '✨',
        payload: '✨ Aether Bless!',
        tone: 'violet',
        accentHex: '#c084fc',
        glowRgba: 'rgba(192, 132, 252, 0.36)',
      },
      {
        id: 'astral_foreseen',
        label: 'Foreseen!',
        shortLabel: 'Foreseen',
        icon: '🔮',
        payload: '🔮 Foreseen!',
        tone: 'sky',
        accentHex: '#38bdf8',
        glowRgba: 'rgba(56, 189, 248, 0.34)',
      },
      {
        id: 'astral_moonlit',
        label: 'Moonlit!',
        shortLabel: 'Moon',
        icon: '🌙',
        payload: '🌙 Moonlit!',
        tone: 'amber',
        accentHex: '#fbbf24',
        glowRgba: 'rgba(251, 191, 36, 0.32)',
      },
      {
        id: 'astral_twist',
        label: 'Plot Twist!',
        shortLabel: 'Twist',
        icon: '🌀',
        payload: '🌀 Plot Twist!',
        tone: 'emerald',
        accentHex: '#34d399',
        glowRgba: 'rgba(52, 211, 153, 0.34)',
      },
      {
        id: 'astral_meteor',
        label: 'Meteor Roll!',
        shortLabel: 'Meteor',
        icon: '☄️',
        payload: '☄️ Meteor Roll!',
        tone: 'orange',
        accentHex: '#fb923c',
        glowRgba: 'rgba(251, 146, 60, 0.34)',
      },
      {
        id: 'astral_cursed',
        label: 'Cursed!',
        shortLabel: 'Cursed',
        icon: '💀',
        payload: '💀 Cursed!',
        tone: 'rose',
        accentHex: '#fb7185',
        glowRgba: 'rgba(251, 113, 133, 0.38)',
        isAngry: true,
      },
    ],
  },
  {
    id: 'serpent_guild',
    name: 'Serikat Penakluk',
    subtitle: 'Ahli Tangga & Penjinak Ular',
    description:
      'Set khusus bagi penjelajah yang menguasai pendakian tangga suci serta selamat dari bisa ular.',
    themeHex: '#34d399',
    glowRgba: 'rgba(52, 211, 153, 0.32)',
    unlockCondition: {
      type: 'specific_achievements',
      achievementIds: ['ladder_climber', 'serpent_shield'],
    },
    requirementLabel: 'Buka Penakluk Tangga & Kebal Bisa Ular',
    items: [
      {
        id: 'guild_ascend',
        label: 'Ascend!',
        shortLabel: 'Ascend',
        icon: '🪜',
        payload: '🪜 Ascend!',
        tone: 'emerald',
        accentHex: '#34d399',
        glowRgba: 'rgba(52, 211, 153, 0.36)',
      },
      {
        id: 'guild_hiss',
        label: 'Hiss!',
        shortLabel: 'Hiss',
        icon: '🐍',
        payload: '🐍 Hiss!',
        tone: 'rose',
        accentHex: '#fb7185',
        glowRgba: 'rgba(251, 113, 133, 0.36)',
        isAngry: true,
      },
      {
        id: 'guild_fly',
        label: 'Soar High!',
        shortLabel: 'Soar',
        icon: '🪽',
        payload: '🪽 Soar High!',
        tone: 'sky',
        accentHex: '#38bdf8',
        glowRgba: 'rgba(56, 189, 248, 0.34)',
      },
      {
        id: 'guild_ward',
        label: 'Warded!',
        shortLabel: 'Warded',
        icon: '🧿',
        payload: '🧿 Warded!',
        tone: 'amber',
        accentHex: '#fbbf24',
        glowRgba: 'rgba(251, 191, 36, 0.34)',
      },
      {
        id: 'guild_lucky',
        label: 'Lucky Six!',
        shortLabel: 'Lucky',
        icon: '🍀',
        payload: '🍀 Lucky Six!',
        tone: 'orange',
        accentHex: '#fb923c',
        glowRgba: 'rgba(251, 146, 60, 0.34)',
      },
      {
        id: 'guild_magic',
        label: 'Enchanted!',
        shortLabel: 'Magic',
        icon: '🪄',
        payload: '🪄 Enchanted!',
        tone: 'violet',
        accentHex: '#c084fc',
        glowRgba: 'rgba(192, 132, 252, 0.34)',
      },
    ],
  },
  {
    id: 'sovereign_crown',
    name: 'Mahkota Agung',
    subtitle: 'Titah Penguasa Takhta',
    description:
      'Ekspresi eksklusif bagi sang grandmaster yang membuktikan ketangguhan di pencapaian kategori Mastery.',
    themeHex: '#fde047',
    glowRgba: 'rgba(253, 224, 71, 0.34)',
    unlockCondition: { type: 'category_count', category: 'mastery', count: 3 },
    requirementLabel: 'Selesaikan 3 Pencapaian Kategori Mastery',
    items: [
      {
        id: 'crown_hail',
        label: 'All Hail!',
        shortLabel: 'Hail',
        icon: '👑',
        payload: '👑 All Hail!',
        tone: 'amber',
        accentHex: '#fde047',
        glowRgba: 'rgba(253, 224, 71, 0.38)',
      },
      {
        id: 'crown_gem',
        label: 'Flawless!',
        shortLabel: 'Flawless',
        icon: '💎',
        payload: '💎 Flawless!',
        tone: 'sky',
        accentHex: '#38bdf8',
        glowRgba: 'rgba(56, 189, 248, 0.36)',
      },
      {
        id: 'crown_dragon',
        label: 'Dragon Roar!',
        shortLabel: 'Roar',
        icon: '🐉',
        payload: '🐉 Dragon Roar!',
        tone: 'emerald',
        accentHex: '#34d399',
        glowRgba: 'rgba(52, 211, 153, 0.34)',
      },
      {
        id: 'crown_checkmate',
        label: 'Checkmate!',
        shortLabel: 'Check',
        icon: '🔱',
        payload: '🔱 Checkmate!',
        tone: 'violet',
        accentHex: '#c084fc',
        glowRgba: 'rgba(192, 132, 252, 0.36)',
      },
      {
        id: 'crown_wrath',
        label: 'Royal Wrath!',
        shortLabel: 'Wrath',
        icon: '🌋',
        payload: '🌋 Royal Wrath!',
        tone: 'rose',
        accentHex: '#fb7185',
        glowRgba: 'rgba(251, 113, 133, 0.4)',
        isAngry: true,
      },
      {
        id: 'crown_legend',
        label: 'Legendary!',
        shortLabel: 'Legend',
        icon: '🌟',
        payload: '🌟 Legendary!',
        tone: 'orange',
        accentHex: '#fb923c',
        glowRgba: 'rgba(251, 146, 60, 0.36)',
      },
    ],
  },
];

export function getEmoteSetDef(setId?: string | null): EmoteSetDef {
  return EMOTE_SETS.find((s) => s.id === setId) ?? EMOTE_SETS[0];
}

export function getAchievementPointsTotal(unlockedAchievements: string[]): number {
  const unlockedSet = new Set(unlockedAchievements);
  return ACHIEVEMENTS.reduce(
    (sum, ach) => (unlockedSet.has(ach.id) ? sum + ach.points : sum),
    0,
  );
}

export interface EmoteSetUnlockStatus {
  unlocked: boolean;
  current: number;
  target: number;
  progressPct: number;
  progressText: string;
  requirementLabel: string;
}

export function getEmoteSetUnlockProgress(
  setId: EmoteSetId,
  unlockedAchievements: string[],
): EmoteSetUnlockStatus {
  const def = getEmoteSetDef(setId);
  const unlockedSet = new Set(unlockedAchievements);
  const cond = def.unlockCondition;

  if (cond.type === 'starter') {
    return {
      unlocked: true,
      current: 1,
      target: 1,
      progressPct: 100,
      progressText: 'Terbuka',
      requirementLabel: def.requirementLabel,
    };
  }

  if (cond.type === 'achievement_count') {
    const validUnlockedCount = ACHIEVEMENTS.filter((a) => unlockedSet.has(a.id)).length;
    const current = Math.min(cond.count, validUnlockedCount);
    const unlocked = validUnlockedCount >= cond.count;
    return {
      unlocked,
      current,
      target: cond.count,
      progressPct: Math.min(100, Math.round((current / Math.max(1, cond.count)) * 100)),
      progressText: `${current}/${cond.count} Pencapaian`,
      requirementLabel: def.requirementLabel,
    };
  }

  if (cond.type === 'achievement_points') {
    const earnedPoints = getAchievementPointsTotal(unlockedAchievements);
    const current = Math.min(cond.points, earnedPoints);
    const unlocked = earnedPoints >= cond.points;
    return {
      unlocked,
      current,
      target: cond.points,
      progressPct: Math.min(100, Math.round((current / Math.max(1, cond.points)) * 100)),
      progressText: `${current.toLocaleString('id-ID')}/${cond.points.toLocaleString('id-ID')} Poin`,
      requirementLabel: def.requirementLabel,
    };
  }

  if (cond.type === 'specific_achievements') {
    const completed = cond.achievementIds.filter((id) => unlockedSet.has(id)).length;
    const target = cond.achievementIds.length;
    const unlocked = completed >= target;
    return {
      unlocked,
      current: completed,
      target,
      progressPct: Math.min(100, Math.round((completed / Math.max(1, target)) * 100)),
      progressText: `${completed}/${target} Syarat`,
      requirementLabel: def.requirementLabel,
    };
  }

  // category_count
  const categoryCompleted = ACHIEVEMENTS.filter(
    (a) => a.category === cond.category && unlockedSet.has(a.id),
  ).length;
  const current = Math.min(cond.count, categoryCompleted);
  const unlocked = categoryCompleted >= cond.count;
  return {
    unlocked,
    current,
    target: cond.count,
    progressPct: Math.min(100, Math.round((current / Math.max(1, cond.count)) * 100)),
    progressText: `${current}/${cond.count} Mastery`,
    requirementLabel: def.requirementLabel,
  };
}

export function isEmoteSetUnlocked(
  setId: EmoteSetId,
  unlockedAchievements: string[],
): boolean {
  return getEmoteSetUnlockProgress(setId, unlockedAchievements).unlocked;
}


