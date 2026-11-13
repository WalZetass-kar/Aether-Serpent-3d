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
  archetypeIndex: number; // 0: Ruby Knight, 1: Sapphire Mage, 2: Emerald Ranger, 3: Amber Alchemist
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

export const PLAYER_ARCHETYPES: Array<{
  archetypeIndex: number;
  title: string;
  color: string;
  accentColor: string;
  hexNum: number;
  accentHexNum: number;
}> = [
  {
    archetypeIndex: 0,
    title: 'Ksatria Ruby',
    color: '#e11d48',
    accentColor: '#fda4af',
    hexNum: 0xe11d48,
    accentHexNum: 0xfda4af,
  },
  {
    archetypeIndex: 1,
    title: 'Penyihir Safir',
    color: '#2563eb',
    accentColor: '#93c5fd',
    hexNum: 0x3b82f6,
    accentHexNum: 0x93c5fd,
  },
  {
    archetypeIndex: 2,
    title: 'Penjelajah Zamrud',
    color: '#059669',
    accentColor: '#6ee7b7',
    hexNum: 0x10b981,
    accentHexNum: 0x6ee7b7,
  },
  {
    archetypeIndex: 3,
    title: 'Alkemis Amber',
    color: '#d97706',
    accentColor: '#fde68a',
    hexNum: 0xf59e0b,
    accentHexNum: 0xfde68a,
  },
];

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
  { id: 'L2', from: 13, to: 46, name: 'Tangga Kristal Langit', type: 'ladder' },
  { id: 'L3', from: 33, to: 49, name: 'Tangga Runik Emas', type: 'ladder' },
  { id: 'L4', from: 42, to: 63, name: 'Tangga Cahaya Bintang', type: 'ladder' },
  { id: 'L5', from: 50, to: 69, name: 'Tangga Menara Zamrud', type: 'ladder' },
  { id: 'L6', from: 62, to: 81, name: 'Tangga Sayap Aether', type: 'ladder' },
  { id: 'L7', from: 74, to: 92, name: 'Tangga Takhta Naga', type: 'ladder' },
];

export const SNAKES: SnakeOrLadder[] = [
  { id: 'S1', from: 27, to: 5, name: 'Ular Kabut Hijau', type: 'snake' },
  { id: 'S2', from: 40, to: 3, name: 'Ular Obsidian', type: 'snake' },
  { id: 'S3', from: 43, to: 18, name: 'Ular Bara Api', type: 'snake' },
  { id: 'S4', from: 54, to: 31, name: 'Ular Bayangan', type: 'snake' },
  { id: 'S5', from: 66, to: 45, name: 'Ular Racun Zamrud', type: 'snake' },
  { id: 'S6', from: 89, to: 53, name: 'Naga Petir Ungu', type: 'snake' },
  { id: 'S7', from: 97, to: 78, name: 'Serpent Penjaga Puncak', type: 'snake' },
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
  { tile: 94, type: 'curse', label: 'Kabut Penyesat', description: 'Kabut gelap mendorongmu mundur 3 langkah.', delta: -3 },
];

export const SPECIAL_TILE_MAP = new Map<number, SpecialTileInfo>(
  SPECIAL_TILES.map((t) => [t.tile, t]),
);

export const JUMP_MAP = new Map<number, SnakeOrLadder>(
  [...LADDERS, ...SNAKES].map((item) => [item.from, item]),
);

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
): number {
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
    const jump = JUMP_MAP.get(landing);
    const special = SPECIAL_TILE_MAP.get(landing);
    let utility = roll * 0.4;
    if (landing === 100) utility += 12;
    if (jump?.type === 'ladder') utility += 6;
    if (jump?.type === 'snake') utility -= 6;
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
  let scoreDelta = roll * 15;
  let shieldsDelta = 0;
  let shieldBlocked = false;
  let extraTurn = roll === 6;

  const specialHit = SPECIAL_TILE_MAP.get(landedTile) ?? null;
  let postSpecialTile = landedTile;

  if (specialHit) {
    if (specialHit.type === 'boost') {
      scoreDelta += 80;
      const target = landedTile + (specialHit.delta ?? 4);
      postSpecialTile = target > 100 ? 100 - (target - 100) : target;
    } else if (specialHit.type === 'extra_roll') {
      scoreDelta += 80;
      extraTurn = true;
    } else if (specialHit.type === 'shield') {
      scoreDelta += 90;
      shieldsDelta += 1;
    } else if (specialHit.type === 'curse') {
      if (currentShields + shieldsDelta > 0) {
        shieldsDelta -= 1;
        shieldBlocked = true;
        scoreDelta += 120;
      } else {
        postSpecialTile = Math.max(1, landedTile + (specialHit.delta ?? -3));
        scoreDelta = Math.max(0, scoreDelta - 25);
      }
    }
  }

  const jumpTriggered = JUMP_MAP.get(postSpecialTile) ?? null;
  let finalTile = postSpecialTile;

  if (jumpTriggered) {
    if (jumpTriggered.type === 'ladder') {
      finalTile = jumpTriggered.to;
      scoreDelta += 120;
    } else if (jumpTriggered.type === 'snake') {
      if (currentShields + shieldsDelta > 0) {
        shieldsDelta -= 1;
        shieldBlocked = true;
        scoreDelta += 150;
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
          scoreDelta += 75;
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
        scoreDelta += 40;
        teamSynergy = {
          allyPlayerId: ally.id,
          allyPlayerName: ally.name,
          bonusScore: 40,
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
  const efficiency = Math.max(0, 60 - turns) * 20;
  return Math.round((500 + efficiency) * getDifficultyMultiplier(difficulty));
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
