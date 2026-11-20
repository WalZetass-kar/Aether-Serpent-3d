import {
  LADDERS,
  SNAKES,
  SPECIAL_TILE_MAP,
  type SnakeOrLadder,
} from './gameConfig.ts';

export type BoardThemeId =
  | 'enchanted_forest'
  | 'dragon_volcano'
  | 'frozen_kingdom'
  | 'lost_desert'
  | 'atlantis_ocean'
  | 'shadow_realm'
  | 'celestial_sky'
  | 'ancient_temple'
  | 'sakura_shogun'
  | 'clockwork_aether'
  | 'jade_palace'
  | 'cosmic_nebula'
  | 'crimson_bloodmoon'
  | 'cyber_neon_citadel'
  | 'mystic_fungi_grove'
  | 'golden_pharaoh_vault'
  | 'storm_titan_peak'
  | 'crystal_rose_cathedral'
  | 'solar_phoenix_sanctum'
  | 'abyssal_kraken_trench'
  | 'celestial_dragon_throne'
  | 'aether_infinity_nexus';

export type BoardSelectionMode = 'manual' | 'random' | 'custom';

export type BoardUnlockType = 'free' | 'mission' | 'premium';
export type BoardRarity = 'starter' | 'rare' | 'epic' | 'legendary' | 'mythic';
export type BoardMissionMetric =
  | 'totalGames'
  | 'wins'
  | 'laddersClimbed'
  | 'bestScore'
  | 'onlineWins'
  | 'specialTilesHit'
  | 'loginStreak';

export interface BoardUnlockRule {
  boardId: string;
  unlockType: BoardUnlockType;
  rarity: BoardRarity;
  mission?: {
    title: string;
    description: string;
    metric: BoardMissionMetric;
    target: number;
    metricUnit: string;
    altMetric?: BoardMissionMetric;
    altTarget?: number;
    altLabel?: string;
    rewardCoins: number;
  };
  premium?: {
    priceCoins: number;
    priceIdr: string;
    tierLabel: string;
    perks: string;
  };
}

export interface AetherCoinPack {
  id: string;
  name: string;
  coins: number;
  bonusCoins: number;
  priceIdr: string;
  tagline: string;
  unlockAllPremium?: boolean;
}

export type BoardShapeStyle = 'classic_square' | 'octagon_bastion' | 'citadel_terrace';
export type BoardMaterialPreset = 'matte' | 'satin' | 'glossy' | 'metallic';

export type TileShapeStyle =
  | 'beveled_square'
  | 'rounded_tablet'
  | 'octagon_cut'
  | 'crystal_facet';

export type TileTextureStyle =
  | 'mossy_stone'
  | 'basalt_lava'
  | 'frosted_ice'
  | 'sandstone_carved'
  | 'coral_mosaic'
  | 'obsidian_runes'
  | 'celestial_marble'
  | 'temple_gold_inlay'
  | 'sakura_lacquer'
  | 'brass_clockwork'
  | 'imperial_jade'
  | 'nebula_crystal';

export type TileMaterialFinish = 'matte' | 'satin' | 'glossy' | 'metallic';

export type TileNumberStyle = 'mono_bold' | 'cinzel_royal' | 'serif_antique';

export type TileVisualEffect =
  | 'none'
  | 'subtle_rune_glow'
  | 'corner_sparks'
  | 'edge_pulse';

export type SnakeHeadModel =
  | 'oriental_dragon'
  | 'horned_viper'
  | 'crowned_cobra'
  | 'abyssal_wyrm';

export type SnakeScalePattern =
  | 'diamond_keel'
  | 'royal_hex'
  | 'draconic_plate'
  | 'frost_shard';

export type SnakeMaterialFinish =
  | 'glossy_scales'
  | 'matte_reptile'
  | 'metallic_drake'
  | 'crystalline';

export type LadderMaterialStyle =
  | 'ancient_oak'
  | 'obsidian_iron'
  | 'glacier_crystal'
  | 'sandstone_gold'
  | 'coral_pearl'
  | 'shadow_wrought'
  | 'celestial_marble'
  | 'temple_bronze'
  | 'lacquer_gold'
  | 'gilded_brass'
  | 'imperial_jade_stone'
  | 'astral_prism';

export type LadderModelStyle =
  | 'arch_bridge'
  | 'royal_steps'
  | 'crystal_spire'
  | 'chain_link';

export type SkyPresetStyle =
  | 'twilight_forest'
  | 'volcanic_ash'
  | 'aurora_frost'
  | 'golden_mirage'
  | 'abyssal_sea'
  | 'eclipse_void'
  | 'astral_dawn'
  | 'temple_sunset'
  | 'radiant_day'
  | 'starlit_night'
  | 'sakura_dusk'
  | 'aether_twilight'
  | 'jade_mist'
  | 'cosmic_nebula_sky';

export type EnvironmentDecorationStyle =
  | 'runic_obelisks'
  | 'volcano_braziers'
  | 'ice_crystals'
  | 'desert_pyramids'
  | 'atlantis_pillars'
  | 'shadow_monoliths'
  | 'floating_islands'
  | 'temple_columns'
  | 'sakura_torii'
  | 'clockwork_gears'
  | 'jade_pagodas'
  | 'nebula_rings';

export type LightingPreset =
  | 'emerald_canopy'
  | 'magma_glow'
  | 'arctic_noon'
  | 'desert_sun'
  | 'bioluminescent'
  | 'shadow_moon'
  | 'divine_radiance'
  | 'torchlit_sanctum'
  | 'blossom_lantern'
  | 'brass_atelier'
  | 'jade_sanctuary'
  | 'nebula_aurora';

export type MagicalParticleStyle =
  | 'fireflies'
  | 'lava_embers'
  | 'snowflakes'
  | 'sand_sparks'
  | 'sea_bubbles'
  | 'shadow_wisps'
  | 'starlight'
  | 'golden_runes'
  | 'sakura_petals'
  | 'brass_sparks'
  | 'jade_lanterns'
  | 'cosmic_stardust';

export interface BoardConfig {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  themeId: BoardThemeId;
  previewSwatches: [string, string, string];
  isCustom: boolean;
  isFavorite?: boolean;
  createdAt: number;
  updatedAt: number;
  ladders: SnakeOrLadder[];
  snakes: SnakeOrLadder[];
  boardSettings: {
    shape: BoardShapeStyle;
    sizeScale: number; // 0.9 .. 1.12
    material: BoardMaterialPreset;
    primaryColor: string;
    secondaryColor: string;
  };
  tileConfig: {
    shape: TileShapeStyle;
    primaryColor: string;
    alternateColor: string;
    textureStyle: TileTextureStyle;
    material: TileMaterialFinish;
    numeralStyle: TileNumberStyle;
    visualEffect: TileVisualEffect;
  };
  snakeConfig: {
    primaryColor: string;
    stripeColor: string;
    bellyColor: string;
    hornColor: string;
    headModel: SnakeHeadModel;
    scalePattern: SnakeScalePattern;
    sizeScale: number; // 0.85 .. 1.25
    materialFinish: SnakeMaterialFinish;
  };
  ladderConfig: {
    materialStyle: LadderMaterialStyle;
    primaryColor: string;
    accentColor: string;
    modelStyle: LadderModelStyle;
    widthScale: number; // 0.85 .. 1.25
  };
  environmentConfig: {
    skyPreset: SkyPresetStyle;
    showTrees: boolean;
    showRocks: boolean;
    showCastle: boolean;
    showWaterfall: boolean;
    decorations: EnvironmentDecorationStyle;
    fogIntensity: number; // 0 .. 1
    lightingPreset: LightingPreset;
  };
  visualEffects: {
    glowIntensity: number; // 0 .. 1
    particleDensity: number; // 0 .. 1
    particleStyle: MagicalParticleStyle;
    ambientIntensity: number; // 0.5 .. 1.4
    shadowsEnabled: boolean;
  };
}

export const BOARD_THEME_LABELS: Record<BoardThemeId, string> = {
  enchanted_forest: 'Enchanted Forest',
  dragon_volcano: 'Dragon Volcano',
  frozen_kingdom: 'Frozen Kingdom',
  lost_desert: 'Lost Desert',
  atlantis_ocean: 'Atlantis Ocean',
  shadow_realm: 'Shadow Realm',
  celestial_sky: 'Celestial Sky',
  ancient_temple: 'Ancient Temple',
  sakura_shogun: 'Sakura Shogunate',
  clockwork_aether: 'Clockwork Aether',
  jade_palace: 'Jade Dragon Palace',
  cosmic_nebula: 'Cosmic Nebula',
  crimson_bloodmoon: 'Crimson Bloodmoon',
  cyber_neon_citadel: 'Cyber Neon Citadel',
  mystic_fungi_grove: 'Mystic Fungi Grove',
  golden_pharaoh_vault: 'Golden Pharaoh Vault',
  storm_titan_peak: 'Storm Titan Peak',
  crystal_rose_cathedral: 'Crystal Rose Cathedral',
  solar_phoenix_sanctum: 'Solar Phoenix Sanctum',
  abyssal_kraken_trench: 'Abyssal Kraken Trench',
  celestial_dragon_throne: 'Imperial Dragon Throne',
  aether_infinity_nexus: 'Aether Infinity Nexus',
};

export const STARTER_UNLOCKED_BOARD_IDS: string[] = [
  'default_enchanted_forest',
  'default_lost_desert',
];

export const BOARD_UNLOCK_RULES: Record<string, BoardUnlockRule> = {
  default_enchanted_forest: {
    boardId: 'default_enchanted_forest',
    unlockType: 'free',
    rarity: 'starter',
  },
  default_lost_desert: {
    boardId: 'default_lost_desert',
    unlockType: 'free',
    rarity: 'starter',
  },
  default_frozen_kingdom: {
    boardId: 'default_frozen_kingdom',
    unlockType: 'mission',
    rarity: 'rare',
    mission: {
      title: 'Penjelajah Kutub',
      description: 'Selesaikan 2 pertandingan di mode apa saja.',
      metric: 'totalGames',
      target: 2,
      metricUnit: 'Laga',
      rewardCoins: 120,
    },
  },
  default_atlantis_ocean: {
    boardId: 'default_atlantis_ocean',
    unlockType: 'mission',
    rarity: 'rare',
    mission: {
      title: 'Pendaki Samudra',
      description: 'Naiki total 8 tangga suci sepanjang kariermu.',
      metric: 'laddersClimbed',
      target: 8,
      metricUnit: 'Tangga',
      rewardCoins: 150,
    },
  },
  default_ancient_temple: {
    boardId: 'default_ancient_temple',
    unlockType: 'mission',
    rarity: 'epic',
    mission: {
      title: 'Penakluk Kuil Kuno',
      description: 'Raih 3 kemenangan di Solo maupun Multiplayer.',
      metric: 'wins',
      target: 3,
      metricUnit: 'Menang',
      rewardCoins: 200,
    },
  },
  default_dragon_volcano: {
    boardId: 'default_dragon_volcano',
    unlockType: 'mission',
    rarity: 'epic',
    mission: {
      title: 'Penempa Kaldera',
      description: 'Capai skor terbaik minimal 1.500 dalam satu laga.',
      metric: 'bestScore',
      target: 1500,
      metricUnit: 'Skor',
      rewardCoins: 250,
    },
  },
  default_sakura_shogun: {
    boardId: 'default_sakura_shogun',
    unlockType: 'mission',
    rarity: 'legendary',
    mission: {
      title: 'Kehormatan Shogun',
      description: 'Raih 5 kemenangan total atau 1 kemenangan Multiplayer Online.',
      metric: 'wins',
      target: 5,
      metricUnit: 'Menang',
      altMetric: 'onlineWins',
      altTarget: 1,
      altLabel: '1 Menang Online',
      rewardCoins: 350,
    },
  },
  default_shadow_realm: {
    boardId: 'default_shadow_realm',
    unlockType: 'premium',
    rarity: 'epic',
    premium: {
      priceCoins: 500,
      priceIdr: 'Rp 15.000',
      tierLabel: 'Premium Eksklusif',
      perks: 'Atmosfer gerhana ungu, monolit obsidian, dan ular bayangan.',
    },
  },
  default_celestial_sky: {
    boardId: 'default_celestial_sky',
    unlockType: 'premium',
    rarity: 'epic',
    premium: {
      priceCoins: 800,
      priceIdr: 'Rp 19.000',
      tierLabel: 'Premium Eksklusif',
      perks: 'Pulau melayang angkasa, marmer astral, dan pelangi surgawi.',
    },
  },
  default_clockwork_aether: {
    boardId: 'default_clockwork_aether',
    unlockType: 'premium',
    rarity: 'legendary',
    premium: {
      priceCoins: 1200,
      priceIdr: 'Rp 25.000',
      tierLabel: 'Premium Legendaris',
      perks: 'Roda gigi kuningan 3D, percikan aether, dan tangga kuningan tempa.',
    },
  },
  default_jade_palace: {
    boardId: 'default_jade_palace',
    unlockType: 'premium',
    rarity: 'legendary',
    premium: {
      priceCoins: 1600,
      priceIdr: 'Rp 29.000',
      tierLabel: 'Premium Legendaris',
      perks: 'Pagoda giok bertingkat, lentera melayang, dan naga kaisar giok.',
    },
  },
  default_cosmic_nebula: {
    boardId: 'default_cosmic_nebula',
    unlockType: 'premium',
    rarity: 'mythic',
    premium: {
      priceCoins: 2400,
      priceIdr: 'Rp 39.000',
      tierLabel: 'Edisi Mitik',
      perks: 'Observatorium galaksi, cincin astrolab berputar, dan debu bintang.',
    },
  },
  default_crimson_bloodmoon: {
    boardId: 'default_crimson_bloodmoon',
    unlockType: 'premium',
    rarity: 'epic',
    premium: {
      priceCoins: 650,
      priceIdr: 'Rp 17.000',
      tierLabel: 'Premium Eksklusif',
      perks: 'Benteng gerhana merah darah, bara scarlet, dan naga bertanduk crimson.',
    },
  },
  default_cyber_neon_citadel: {
    boardId: 'default_cyber_neon_citadel',
    unlockType: 'premium',
    rarity: 'epic',
    premium: {
      priceCoins: 750,
      priceIdr: 'Rp 19.000',
      tierLabel: 'Premium Eksklusif',
      perks: 'Ubin kristal siber bercahaya sian-magenta dan wyrm prisma neon.',
    },
  },
  default_mystic_fungi_grove: {
    boardId: 'default_mystic_fungi_grove',
    unlockType: 'premium',
    rarity: 'epic',
    premium: {
      priceCoins: 900,
      priceIdr: 'Rp 22.000',
      tierLabel: 'Premium Eksklusif',
      perks: 'Hutan spora bioluminesen zamrud-ungu dengan kunang-kunang kristal.',
    },
  },
  default_golden_pharaoh_vault: {
    boardId: 'default_golden_pharaoh_vault',
    unlockType: 'premium',
    rarity: 'legendary',
    premium: {
      priceCoins: 1100,
      priceIdr: 'Rp 25.000',
      tierLabel: 'Premium Legendaris',
      perks: 'Ruang harta emas murni firaun, tangga batu emas, dan kobra bermahkota.',
    },
  },
  default_storm_titan_peak: {
    boardId: 'default_storm_titan_peak',
    unlockType: 'premium',
    rarity: 'legendary',
    premium: {
      priceCoins: 1350,
      priceIdr: 'Rp 27.000',
      tierLabel: 'Premium Legendaris',
      perks: 'Puncak badai petir titan, jembatan rantai baja, dan naga halilintar.',
    },
  },
  default_crystal_rose_cathedral: {
    boardId: 'default_crystal_rose_cathedral',
    unlockType: 'premium',
    rarity: 'legendary',
    premium: {
      priceCoins: 1500,
      priceIdr: 'Rp 29.000',
      tierLabel: 'Premium Legendaris',
      perks: 'Katedral kuarsa mawar berkilau, kelopak bercahaya, dan naga mutiara.',
    },
  },
  default_solar_phoenix_sanctum: {
    boardId: 'default_solar_phoenix_sanctum',
    unlockType: 'premium',
    rarity: 'legendary',
    premium: {
      priceCoins: 1750,
      priceIdr: 'Rp 32.000',
      tierLabel: 'Premium Legendaris',
      perks: 'Singgasana api matahari Phoenix dengan pijar emas dan tangga surya.',
    },
  },
  default_abyssal_kraken_trench: {
    boardId: 'default_abyssal_kraken_trench',
    unlockType: 'premium',
    rarity: 'mythic',
    premium: {
      priceCoins: 2000,
      priceIdr: 'Rp 35.000',
      tierLabel: 'Edisi Mitik',
      perks: 'Palung laut dalam Kraken bercahaya toska dengan rantai karang abyssal.',
    },
  },
  default_celestial_dragon_throne: {
    boardId: 'default_celestial_dragon_throne',
    unlockType: 'premium',
    rarity: 'mythic',
    premium: {
      priceCoins: 2250,
      priceIdr: 'Rp 39.000',
      tierLabel: 'Edisi Mitik',
      perks: 'Istana naga kekaisaran di atas awan giok dengan pagoda emas berkilau.',
    },
  },
  default_aether_infinity_nexus: {
    boardId: 'default_aether_infinity_nexus',
    unlockType: 'premium',
    rarity: 'mythic',
    premium: {
      priceCoins: 2800,
      priceIdr: 'Rp 49.000',
      tierLabel: 'Edisi Mitik Tertinggi',
      perks: 'Inti dimensi prismatik tanpa batas dengan cincin astrolab & aura dewa.',
    },
  },
};

export const AETHER_COIN_PACKS: AetherCoinPack[] = [
  {
    id: 'pack_pouch',
    name: 'Kantong Koin Aether',
    coins: 600,
    bonusCoins: 100,
    priceIdr: 'Rp 15.000',
    tagline: 'Cukup untuk membuka 1 papan Eksklusif',
  },
  {
    id: 'pack_chest',
    name: 'Peti Harta Penjelajah',
    coins: 1500,
    bonusCoins: 350,
    priceIdr: 'Rp 35.000',
    tagline: 'Paling populer · Buka papan Legendaris',
  },
  {
    id: 'pack_vault',
    name: 'Brankas Kaisar Naga',
    coins: 3200,
    bonusCoins: 800,
    priceIdr: 'Rp 69.000',
    tagline: 'Bonus +25% Koin untuk koleksi papan Mitik',
  },
  {
    id: 'pack_royal_pass',
    name: 'Royal Pass — Buka Semua Papan Premium',
    coins: 1000,
    bonusCoins: 0,
    priceIdr: 'Rp 89.000',
    tagline: 'Buka instan seluruh 15 papan Premium + 1.000 Koin Aether',
    unlockAllPremium: true,
  },
];

export function getBoardUnlockRule(boardId: string): BoardUnlockRule {
  return (
    BOARD_UNLOCK_RULES[boardId] ?? {
      boardId,
      unlockType: 'free',
      rarity: 'starter',
    }
  );
}

export const DEFAULT_BOARD_CONFIGS: BoardConfig[] = [
  {
    id: 'default_enchanted_forest',
    name: 'Enchanted Forest',
    subtitle: 'Sanctuary Lembah Yggdrasil',
    description:
      'Hutan fantasi yang dipenuhi pepohonan raksasa, batu kuno berlumut, tanaman bercahaya, dan air terjun magis.',
    themeId: 'enchanted_forest',
    previewSwatches: ['#10b981', '#263532', '#fbbf24'],
    isCustom: false,
    createdAt: 1735689600000,
    updatedAt: 1735689600000,
    ladders: [
      { id: 'L1', from: 4, to: 25, name: 'Tangga Akar Yggdrasil', type: 'ladder' },
      { id: 'L2', from: 6, to: 18, name: 'Tangga Embun Fajar', type: 'ladder' },
      { id: 'L3', from: 13, to: 46, name: 'Tangga Sulur Zamrud', type: 'ladder' },
      { id: 'L4', from: 19, to: 38, name: 'Tangga Gerbang Lumut', type: 'ladder' },
      { id: 'L5', from: 28, to: 52, name: 'Tangga Pelangi Rimba', type: 'ladder' },
      { id: 'L6', from: 33, to: 49, name: 'Tangga Runik Hutan', type: 'ladder' },
      { id: 'L7', from: 42, to: 63, name: 'Tangga Kanopi Peri', type: 'ladder' },
      { id: 'L8', from: 50, to: 69, name: 'Tangga Menara Lumut', type: 'ladder' },
      { id: 'L9', from: 59, to: 79, name: 'Tangga Jembatan Kunang', type: 'ladder' },
      { id: 'L10', from: 62, to: 81, name: 'Tangga Angin Lembah', type: 'ladder' },
      { id: 'L11', from: 74, to: 91, name: 'Tangga Puncak Sylvan', type: 'ladder' },
      { id: 'L12', from: 80, to: 98, name: 'Tangga Takhta Yggdrasil', type: 'ladder' },
    ],
    snakes: [
      { id: 'S1', from: 27, to: 5, name: 'Ular Kabut Hijau', type: 'snake' },
      { id: 'S2', from: 40, to: 3, name: 'Ular Akar Berduri', type: 'snake' },
      { id: 'S3', from: 44, to: 17, name: 'Viper Lembah Rimba', type: 'snake' },
      { id: 'S4', from: 54, to: 31, name: 'Ular Rawa Berbisa', type: 'snake' },
      { id: 'S5', from: 66, to: 45, name: 'Ular Racun Zamrud', type: 'snake' },
      { id: 'S6', from: 92, to: 73, name: 'Viper Gerbang Hutan', type: 'snake' },
      { id: 'S7', from: 93, to: 68, name: 'Ular Lumut Kuno', type: 'snake' },
      { id: 'S8', from: 94, to: 75, name: 'Serpent Kabut Lembah', type: 'snake' },
      { id: 'S9', from: 95, to: 64, name: 'Naga Kanopi Hijau', type: 'snake' },
      { id: 'S10', from: 96, to: 77, name: 'Wyrm Mahkota Sylvan', type: 'snake' },
      { id: 'S11', from: 97, to: 78, name: 'Serpent Penjaga Puncak', type: 'snake' },
      { id: 'S12', from: 99, to: 2, name: 'Raja Naga Yggdrasil Abadi', type: 'snake' },
    ],
    boardSettings: {
      shape: 'classic_square',
      sizeScale: 1.0,
      material: 'satin',
      primaryColor: '#475569',
      secondaryColor: '#d97706',
    },
    tileConfig: {
      shape: 'beveled_square',
      primaryColor: '#263532',
      alternateColor: '#354a45',
      textureStyle: 'mossy_stone',
      material: 'satin',
      numeralStyle: 'mono_bold',
      visualEffect: 'subtle_rune_glow',
    },
    snakeConfig: {
      primaryColor: '#059669',
      stripeColor: '#a7f3d0',
      bellyColor: '#d1fae5',
      hornColor: '#fbbf24',
      headModel: 'oriental_dragon',
      scalePattern: 'diamond_keel',
      sizeScale: 1.0,
      materialFinish: 'glossy_scales',
    },
    ladderConfig: {
      materialStyle: 'ancient_oak',
      primaryColor: '#d6b48a',
      accentColor: '#b45309',
      modelStyle: 'arch_bridge',
      widthScale: 1.0,
    },
    environmentConfig: {
      skyPreset: 'twilight_forest',
      showTrees: true,
      showRocks: true,
      showCastle: true,
      showWaterfall: true,
      decorations: 'runic_obelisks',
      fogIntensity: 0.45,
      lightingPreset: 'emerald_canopy',
    },
    visualEffects: {
      glowIntensity: 0.75,
      particleDensity: 0.85,
      particleStyle: 'fireflies',
      ambientIntensity: 0.95,
      shadowsEnabled: true,
    },
  },
  {
    id: 'default_dragon_volcano',
    name: 'Dragon Volcano',
    subtitle: 'Kawah Naga Api Kaldera',
    description:
      'Lingkungan gunung berapi aktif dengan sungai lava mengalir, bebatuan basal hitam, dan pijar bara oranye-merah.',
    themeId: 'dragon_volcano',
    previewSwatches: ['#f97316', '#291814', '#ef4444'],
    isCustom: false,
    createdAt: 1735689610000,
    updatedAt: 1735689610000,
    ladders: [
      { id: 'L1', from: 3, to: 22, name: 'Jembatan Rantai Besi', type: 'ladder' },
      { id: 'L2', from: 11, to: 29, name: 'Tangga Terak Magma', type: 'ladder' },
      { id: 'L3', from: 18, to: 41, name: 'Tangga Batu Basal', type: 'ladder' },
      { id: 'L4', from: 26, to: 48, name: 'Jalur Pijar Lava', type: 'ladder' },
      { id: 'L5', from: 35, to: 57, name: 'Tangga Bara Tempaan', type: 'ladder' },
      { id: 'L6', from: 45, to: 67, name: 'Jembatan Kawah Naga', type: 'ladder' },
      { id: 'L7', from: 54, to: 75, name: 'Tangga Menara Abu', type: 'ladder' },
      { id: 'L8', from: 63, to: 83, name: 'Tangga Obsidian Api', type: 'ladder' },
      { id: 'L9', from: 72, to: 92, name: 'Tangga Takhta Magma', type: 'ladder' },
    ],
    snakes: [
      { id: 'S1', from: 25, to: 6, name: 'Viper Abu Vulkanik', type: 'snake' },
      { id: 'S2', from: 38, to: 15, name: 'Ular Lahar Membara', type: 'snake' },
      { id: 'S3', from: 51, to: 28, name: 'Drake Sisik Bara', type: 'snake' },
      { id: 'S4', from: 62, to: 36, name: 'Ular Magma Hitam', type: 'snake' },
      { id: 'S5', from: 74, to: 49, name: 'Wyrm Kawah Merah', type: 'snake' },
      { id: 'S6', from: 86, to: 59, name: 'Naga Erupsi Merah', type: 'snake' },
      { id: 'S7', from: 94, to: 68, name: 'Wyrm Api Abadi', type: 'snake' },
      { id: 'S8', from: 98, to: 43, name: 'Raja Naga Ignis Kaldera', type: 'snake' },
    ],
    boardSettings: {
      shape: 'octagon_bastion',
      sizeScale: 1.02,
      material: 'metallic',
      primaryColor: '#1c1917',
      secondaryColor: '#ea580c',
    },
    tileConfig: {
      shape: 'octagon_cut',
      primaryColor: '#291814',
      alternateColor: '#3f221b',
      textureStyle: 'basalt_lava',
      material: 'metallic',
      numeralStyle: 'cinzel_royal',
      visualEffect: 'corner_sparks',
    },
    snakeConfig: {
      primaryColor: '#b91c1c',
      stripeColor: '#fb923c',
      bellyColor: '#fde047',
      hornColor: '#f97316',
      headModel: 'horned_viper',
      scalePattern: 'draconic_plate',
      sizeScale: 1.08,
      materialFinish: 'metallic_drake',
    },
    ladderConfig: {
      materialStyle: 'obsidian_iron',
      primaryColor: '#44403c',
      accentColor: '#f97316',
      modelStyle: 'chain_link',
      widthScale: 1.04,
    },
    environmentConfig: {
      skyPreset: 'volcanic_ash',
      showTrees: false,
      showRocks: true,
      showCastle: true,
      showWaterfall: true,
      decorations: 'volcano_braziers',
      fogIntensity: 0.65,
      lightingPreset: 'magma_glow',
    },
    visualEffects: {
      glowIntensity: 0.95,
      particleDensity: 0.95,
      particleStyle: 'lava_embers',
      ambientIntensity: 0.95,
      shadowsEnabled: true,
    },
  },
  {
    id: 'default_frozen_kingdom',
    name: 'Frozen Kingdom',
    subtitle: 'Benteng Glasier Borealis',
    description:
      'Kerajaan es abadi dengan permukaan papan bersalju, kristal es bercahaya, dan atmosfer dingin biru aurora.',
    themeId: 'frozen_kingdom',
    previewSwatches: ['#38bdf8', '#1e3a5f', '#e0f2fe'],
    isCustom: false,
    createdAt: 1735689620000,
    updatedAt: 1735689620000,
    ladders: [
      { id: 'L1', from: 5, to: 24, name: 'Tangga Es Kristal', type: 'ladder' },
      { id: 'L2', from: 13, to: 32, name: 'Jembatan Salju Abadi', type: 'ladder' },
      { id: 'L3', from: 19, to: 40, name: 'Tangga Pilar Glasier', type: 'ladder' },
      { id: 'L4', from: 28, to: 50, name: 'Tangga Cahaya Aurora', type: 'ladder' },
      { id: 'L5', from: 36, to: 59, name: 'Jalur Kristal Biru', type: 'ladder' },
      { id: 'L6', from: 46, to: 68, name: 'Tangga Menara Beku', type: 'ladder' },
      { id: 'L7', from: 53, to: 73, name: 'Tangga Tebing Tundra', type: 'ladder' },
      { id: 'L8', from: 66, to: 85, name: 'Tangga Benteng Borealis', type: 'ladder' },
      { id: 'L9', from: 77, to: 95, name: 'Tangga Singgasana Es', type: 'ladder' },
    ],
    snakes: [
      { id: 'S1', from: 27, to: 8, name: 'Ular Embun Beku', type: 'snake' },
      { id: 'S2', from: 42, to: 17, name: 'Kobra Kristal Biru', type: 'snake' },
      { id: 'S3', from: 52, to: 30, name: 'Ular Badai Salju', type: 'snake' },
      { id: 'S4', from: 64, to: 39, name: 'Serpent Glasier', type: 'snake' },
      { id: 'S5', from: 79, to: 49, name: 'Wyrm Kutub Utara', type: 'snake' },
      { id: 'S6', from: 89, to: 61, name: 'Naga Es Borealis', type: 'snake' },
      { id: 'S7', from: 93, to: 70, name: 'Wyrm Puncak Glasier', type: 'snake' },
      { id: 'S8', from: 97, to: 56, name: 'Leviathan Salju Abadi', type: 'snake' },
    ],
    boardSettings: {
      shape: 'citadel_terrace',
      sizeScale: 1.0,
      material: 'glossy',
      primaryColor: '#1e3a8a',
      secondaryColor: '#38bdf8',
    },
    tileConfig: {
      shape: 'crystal_facet',
      primaryColor: '#1e3a5f',
      alternateColor: '#2d527c',
      textureStyle: 'frosted_ice',
      material: 'glossy',
      numeralStyle: 'mono_bold',
      visualEffect: 'edge_pulse',
    },
    snakeConfig: {
      primaryColor: '#0284c7',
      stripeColor: '#bae6fd',
      bellyColor: '#f0f9ff',
      hornColor: '#7dd3fc',
      headModel: 'crowned_cobra',
      scalePattern: 'frost_shard',
      sizeScale: 1.0,
      materialFinish: 'crystalline',
    },
    ladderConfig: {
      materialStyle: 'glacier_crystal',
      primaryColor: '#bae6fd',
      accentColor: '#0284c7',
      modelStyle: 'crystal_spire',
      widthScale: 1.02,
    },
    environmentConfig: {
      skyPreset: 'aurora_frost',
      showTrees: true,
      showRocks: true,
      showCastle: true,
      showWaterfall: true,
      decorations: 'ice_crystals',
      fogIntensity: 0.5,
      lightingPreset: 'arctic_noon',
    },
    visualEffects: {
      glowIntensity: 0.85,
      particleDensity: 0.9,
      particleStyle: 'snowflakes',
      ambientIntensity: 1.1,
      shadowsEnabled: true,
    },
  },
  {
    id: 'default_lost_desert',
    name: 'Lost Desert',
    subtitle: 'Oasis Piramida Matahari',
    description:
      'Lingkungan gurun pasir mistis dengan piramida kuno, pahatan batu pasir hieroglif, dan cahaya senja keemasan.',
    themeId: 'lost_desert',
    previewSwatches: ['#f59e0b', '#5c3a1e', '#fef08a'],
    isCustom: false,
    createdAt: 1735689630000,
    updatedAt: 1735689630000,
    ladders: [
      { id: 'L1', from: 2, to: 19, name: 'Tangga Batu Pasir', type: 'ladder' },
      { id: 'L2', from: 10, to: 31, name: 'Tangga Bukit Emas', type: 'ladder' },
      { id: 'L3', from: 17, to: 39, name: 'Tangga Oasis Emas', type: 'ladder' },
      { id: 'L4', from: 25, to: 46, name: 'Tangga Pilar Obelisk', type: 'ladder' },
      { id: 'L5', from: 33, to: 54, name: 'Tangga Hieroglif Surya', type: 'ladder' },
      { id: 'L6', from: 44, to: 66, name: 'Tangga Makam Raja', type: 'ladder' },
      { id: 'L7', from: 52, to: 74, name: 'Tangga Kuil Sphinx', type: 'ladder' },
      { id: 'L8', from: 61, to: 82, name: 'Tangga Puncak Piramida', type: 'ladder' },
      { id: 'L9', from: 75, to: 94, name: 'Tangga Mahkota Firaun', type: 'ladder' },
    ],
    snakes: [
      { id: 'S1', from: 29, to: 7, name: 'Viper Bukit Pasir', type: 'snake' },
      { id: 'S2', from: 41, to: 14, name: 'Kobra Emas Gurun', type: 'snake' },
      { id: 'S3', from: 50, to: 26, name: 'Ular Badai Debu', type: 'snake' },
      { id: 'S4', from: 63, to: 35, name: 'Kobra Penjaga Makam', type: 'snake' },
      { id: 'S5', from: 72, to: 45, name: 'Ular Kalajengking Surya', type: 'snake' },
      { id: 'S6', from: 85, to: 57, name: 'Naga Badai Sahara', type: 'snake' },
      { id: 'S7', from: 91, to: 67, name: 'Wyrm Piramida Emas', type: 'snake' },
      { id: 'S8', from: 96, to: 48, name: 'Apophis Sang Penelan Senja', type: 'snake' },
    ],
    boardSettings: {
      shape: 'classic_square',
      sizeScale: 1.0,
      material: 'matte',
      primaryColor: '#92400e',
      secondaryColor: '#fbbf24',
    },
    tileConfig: {
      shape: 'rounded_tablet',
      primaryColor: '#5c3a1e',
      alternateColor: '#784d27',
      textureStyle: 'sandstone_carved',
      material: 'matte',
      numeralStyle: 'serif_antique',
      visualEffect: 'subtle_rune_glow',
    },
    snakeConfig: {
      primaryColor: '#d97706',
      stripeColor: '#fef08a',
      bellyColor: '#fef3c7',
      hornColor: '#f59e0b',
      headModel: 'crowned_cobra',
      scalePattern: 'royal_hex',
      sizeScale: 1.04,
      materialFinish: 'matte_reptile',
    },
    ladderConfig: {
      materialStyle: 'sandstone_gold',
      primaryColor: '#eab308',
      accentColor: '#78350f',
      modelStyle: 'royal_steps',
      widthScale: 1.05,
    },
    environmentConfig: {
      skyPreset: 'golden_mirage',
      showTrees: false,
      showRocks: true,
      showCastle: false,
      showWaterfall: false,
      decorations: 'desert_pyramids',
      fogIntensity: 0.4,
      lightingPreset: 'desert_sun',
    },
    visualEffects: {
      glowIntensity: 0.7,
      particleDensity: 0.75,
      particleStyle: 'sand_sparks',
      ambientIntensity: 1.05,
      shadowsEnabled: true,
    },
  },
  {
    id: 'default_atlantis_ocean',
    name: 'Atlantis Ocean',
    subtitle: 'Singgasana Samudra Biru',
    description:
      'Dunia bawah laut di tengah reruntuhan kerajaan Atlantis dengan karang bercahaya, mosaik marmer, dan gelembung air.',
    themeId: 'atlantis_ocean',
    previewSwatches: ['#06b6d4', '#0f394c', '#67e8f9'],
    isCustom: false,
    createdAt: 1735689640000,
    updatedAt: 1735689640000,
    ladders: [
      { id: 'L1', from: 6, to: 26, name: 'Tangga Karang Mutiara', type: 'ladder' },
      { id: 'L2', from: 14, to: 35, name: 'Jembatan Arus Laut', type: 'ladder' },
      { id: 'L3', from: 22, to: 43, name: 'Tangga Pilar Poseidon', type: 'ladder' },
      { id: 'L4', from: 31, to: 53, name: 'Tangga Bioluminesensi', type: 'ladder' },
      { id: 'L5', from: 39, to: 61, name: 'Jalur Gelembung Suci', type: 'ladder' },
      { id: 'L6', from: 48, to: 69, name: 'Tangga Kuil Samudra', type: 'ladder' },
      { id: 'L7', from: 57, to: 78, name: 'Tangga Trisula Biru', type: 'ladder' },
      { id: 'L8', from: 68, to: 89, name: 'Tangga Istana Mutiara', type: 'ladder' },
      { id: 'L9', from: 79, to: 96, name: 'Tangga Mahkota Atlantis', type: 'ladder' },
    ],
    snakes: [
      { id: 'S1', from: 24, to: 4, name: 'Belut Listrik Karang', type: 'snake' },
      { id: 'S2', from: 38, to: 15, name: 'Ular Laut Sian', type: 'snake' },
      { id: 'S3', from: 49, to: 27, name: 'Hydra Palung Biru', type: 'snake' },
      { id: 'S4', from: 60, to: 33, name: 'Wyrm Arus Deras', type: 'snake' },
      { id: 'S5', from: 73, to: 50, name: 'Serpent Pusaran Air', type: 'snake' },
      { id: 'S6', from: 82, to: 56, name: 'Hydra Istana Tenggelam', type: 'snake' },
      { id: 'S7', from: 92, to: 66, name: 'Naga Samudra Dalam', type: 'snake' },
      { id: 'S8', from: 98, to: 52, name: 'Leviathan Raja Atlantis', type: 'snake' },
    ],
    boardSettings: {
      shape: 'octagon_bastion',
      sizeScale: 1.0,
      material: 'glossy',
      primaryColor: '#155e75',
      secondaryColor: '#22d3ee',
    },
    tileConfig: {
      shape: 'rounded_tablet',
      primaryColor: '#0f394c',
      alternateColor: '#164e63',
      textureStyle: 'coral_mosaic',
      material: 'glossy',
      numeralStyle: 'cinzel_royal',
      visualEffect: 'edge_pulse',
    },
    snakeConfig: {
      primaryColor: '#0891b2',
      stripeColor: '#67e8f9',
      bellyColor: '#cffafe',
      hornColor: '#2dd4bf',
      headModel: 'abyssal_wyrm',
      scalePattern: 'diamond_keel',
      sizeScale: 1.05,
      materialFinish: 'glossy_scales',
    },
    ladderConfig: {
      materialStyle: 'coral_pearl',
      primaryColor: '#2dd4bf',
      accentColor: '#0284c7',
      modelStyle: 'arch_bridge',
      widthScale: 1.0,
    },
    environmentConfig: {
      skyPreset: 'abyssal_sea',
      showTrees: true,
      showRocks: true,
      showCastle: true,
      showWaterfall: true,
      decorations: 'atlantis_pillars',
      fogIntensity: 0.55,
      lightingPreset: 'bioluminescent',
    },
    visualEffects: {
      glowIntensity: 0.9,
      particleDensity: 0.9,
      particleStyle: 'sea_bubbles',
      ambientIntensity: 1.0,
      shadowsEnabled: true,
    },
  },
  {
    id: 'default_shadow_realm',
    name: 'Shadow Realm',
    subtitle: 'Dimensi Kabut Obsidian',
    description:
      'Dunia fantasi gelap dengan kastil misterius, monolit rune ungu, kabut mistis, dan pencahayaan kontras dramatis.',
    themeId: 'shadow_realm',
    previewSwatches: ['#a855f7', '#1e1633', '#d8b4fe'],
    isCustom: false,
    createdAt: 1735689650000,
    updatedAt: 1735689650000,
    ladders: [
      { id: 'L1', from: 4, to: 22, name: 'Rantai Bayangan Ungu', type: 'ladder' },
      { id: 'L2', from: 11, to: 33, name: 'Tangga Monolit Rune', type: 'ladder' },
      { id: 'L3', from: 20, to: 44, name: 'Jembatan Kabut Astral', type: 'ladder' },
      { id: 'L4', from: 29, to: 51, name: 'Tangga Benteng Malam', type: 'ladder' },
      { id: 'L5', from: 38, to: 60, name: 'Jalur Sihir Gerhana', type: 'ladder' },
      { id: 'L6', from: 46, to: 67, name: 'Tangga Kristal Void', type: 'ladder' },
      { id: 'L7', from: 56, to: 77, name: 'Tangga Gerbang Gerhana', type: 'ladder' },
      { id: 'L8', from: 69, to: 87, name: 'Tangga Kastil Obsidian', type: 'ladder' },
      { id: 'L9', from: 78, to: 93, name: 'Tangga Singgasana Bayangan', type: 'ladder' },
    ],
    snakes: [
      { id: 'S1', from: 28, to: 7, name: 'Ular Asap Hitam', type: 'snake' },
      { id: 'S2', from: 43, to: 18, name: 'Viper Rune Ungu', type: 'snake' },
      { id: 'S3', from: 54, to: 31, name: 'Ular Pemangsa Mimpi', type: 'snake' },
      { id: 'S4', from: 66, to: 40, name: 'Wyrm Lembah Kelam', type: 'snake' },
      { id: 'S5', from: 75, to: 52, name: 'Serpent Kabut Malam', type: 'snake' },
      { id: 'S6', from: 86, to: 62, name: 'Naga Gerhana Abadi', type: 'snake' },
      { id: 'S7', from: 95, to: 64, name: 'Wyrm Mahkota Kelam', type: 'snake' },
      { id: 'S8', from: 99, to: 41, name: 'Penguasa Void Obsidian', type: 'snake' },
    ],
    boardSettings: {
      shape: 'octagon_bastion',
      sizeScale: 1.0,
      material: 'metallic',
      primaryColor: '#1e1b4b',
      secondaryColor: '#a855f7',
    },
    tileConfig: {
      shape: 'octagon_cut',
      primaryColor: '#1e1633',
      alternateColor: '#2d204a',
      textureStyle: 'obsidian_runes',
      material: 'metallic',
      numeralStyle: 'cinzel_royal',
      visualEffect: 'edge_pulse',
    },
    snakeConfig: {
      primaryColor: '#581c87',
      stripeColor: '#d8b4fe',
      bellyColor: '#f3e8ff',
      hornColor: '#c084fc',
      headModel: 'abyssal_wyrm',
      scalePattern: 'draconic_plate',
      sizeScale: 1.06,
      materialFinish: 'metallic_drake',
    },
    ladderConfig: {
      materialStyle: 'shadow_wrought',
      primaryColor: '#312e81',
      accentColor: '#c084fc',
      modelStyle: 'chain_link',
      widthScale: 0.98,
    },
    environmentConfig: {
      skyPreset: 'eclipse_void',
      showTrees: true,
      showRocks: true,
      showCastle: true,
      showWaterfall: false,
      decorations: 'shadow_monoliths',
      fogIntensity: 0.7,
      lightingPreset: 'shadow_moon',
    },
    visualEffects: {
      glowIntensity: 0.95,
      particleDensity: 0.85,
      particleStyle: 'shadow_wisps',
      ambientIntensity: 0.8,
      shadowsEnabled: true,
    },
  },
  {
    id: 'default_celestial_sky',
    name: 'Celestial Sky',
    subtitle: 'Takhta Awan Astral',
    description:
      'Dunia di atas awan dengan pulau-pulau melayang, jembatan langit marmer emas, dan pancaran bintang biru-emas.',
    themeId: 'celestial_sky',
    previewSwatches: ['#eab308', '#1e2952', '#60a5fa'],
    isCustom: false,
    createdAt: 1735689660000,
    updatedAt: 1735689660000,
    ladders: [
      { id: 'L1', from: 7, to: 28, name: 'Tangga Awan Perak', type: 'ladder' },
      { id: 'L2', from: 15, to: 36, name: 'Jembatan Bintang Fajar', type: 'ladder' },
      { id: 'L3', from: 24, to: 45, name: 'Tangga Sayap Seraphim', type: 'ladder' },
      { id: 'L4', from: 32, to: 54, name: 'Tangga Pilar Konstelasi', type: 'ladder' },
      { id: 'L5', from: 41, to: 63, name: 'Jalur Awan Keemasan', type: 'ladder' },
      { id: 'L6', from: 50, to: 72, name: 'Tangga Pulau Melayang', type: 'ladder' },
      { id: 'L7', from: 59, to: 80, name: 'Tangga Gerbang Kosmik', type: 'ladder' },
      { id: 'L8', from: 67, to: 86, name: 'Tangga Menara Astral', type: 'ladder' },
      { id: 'L9', from: 74, to: 97, name: 'Tangga Takhta Langit', type: 'ladder' },
    ],
    snakes: [
      { id: 'S1', from: 26, to: 5, name: 'Ular Angin Stratosfer', type: 'snake' },
      { id: 'S2', from: 40, to: 18, name: 'Naga Awan Badai', type: 'snake' },
      { id: 'S3', from: 53, to: 29, name: 'Serpent Komet Biru', type: 'snake' },
      { id: 'S4', from: 66, to: 38, name: 'Naga Petir Langit', type: 'snake' },
      { id: 'S5', from: 78, to: 51, name: 'Wyrm Bintang Jatuh', type: 'snake' },
      { id: 'S6', from: 89, to: 60, name: 'Naga Astral Penjaga', type: 'snake' },
      { id: 'S7', from: 94, to: 69, name: 'Wyrm Puncak Surgawi', type: 'snake' },
      { id: 'S8', from: 98, to: 62, name: 'Sovereign Naga Cakrawala', type: 'snake' },
    ],
    boardSettings: {
      shape: 'citadel_terrace',
      sizeScale: 1.02,
      material: 'glossy',
      primaryColor: '#1e3a8a',
      secondaryColor: '#fbbf24',
    },
    tileConfig: {
      shape: 'crystal_facet',
      primaryColor: '#1e2952',
      alternateColor: '#2a396b',
      textureStyle: 'celestial_marble',
      material: 'glossy',
      numeralStyle: 'cinzel_royal',
      visualEffect: 'edge_pulse',
    },
    snakeConfig: {
      primaryColor: '#2563eb',
      stripeColor: '#fde047',
      bellyColor: '#eff6ff',
      hornColor: '#fbbf24',
      headModel: 'oriental_dragon',
      scalePattern: 'royal_hex',
      sizeScale: 1.02,
      materialFinish: 'crystalline',
    },
    ladderConfig: {
      materialStyle: 'celestial_marble',
      primaryColor: '#fde68a',
      accentColor: '#38bdf8',
      modelStyle: 'royal_steps',
      widthScale: 1.05,
    },
    environmentConfig: {
      skyPreset: 'astral_dawn',
      showTrees: false,
      showRocks: true,
      showCastle: true,
      showWaterfall: true,
      decorations: 'floating_islands',
      fogIntensity: 0.3,
      lightingPreset: 'divine_radiance',
    },
    visualEffects: {
      glowIntensity: 0.9,
      particleDensity: 0.95,
      particleStyle: 'starlight',
      ambientIntensity: 1.15,
      shadowsEnabled: true,
    },
  },
  {
    id: 'default_ancient_temple',
    name: 'Ancient Temple',
    subtitle: 'Kuil Peradaban Emas',
    description:
      'Kuil peradaban kuno di tengah lembah suci dengan pilar batu raksasa, ukiran bersejarah, dan ornamen emas murni.',
    themeId: 'ancient_temple',
    previewSwatches: ['#d97706', '#3a342a', '#10b981'],
    isCustom: false,
    createdAt: 1735689670000,
    updatedAt: 1735689670000,
    ladders: [
      { id: 'L1', from: 3, to: 20, name: 'Tangga Altar Perunggu', type: 'ladder' },
      { id: 'L2', from: 13, to: 35, name: 'Tangga Prasasti Kuno', type: 'ladder' },
      { id: 'L3', from: 18, to: 42, name: 'Tangga Pilar Leluhur', type: 'ladder' },
      { id: 'L4', from: 27, to: 49, name: 'Tangga Relik Suci', type: 'ladder' },
      { id: 'L5', from: 36, to: 57, name: 'Tangga Teras Giok', type: 'ladder' },
      { id: 'L6', from: 46, to: 68, name: 'Tangga Ruang Harta', type: 'ladder' },
      { id: 'L7', from: 54, to: 75, name: 'Tangga Gerbang Kekaisaran', type: 'ladder' },
      { id: 'L8', from: 64, to: 85, name: 'Tangga Kubah Emas', type: 'ladder' },
      { id: 'L9', from: 73, to: 92, name: 'Tangga Singgasana Kuil', type: 'ladder' },
    ],
    snakes: [
      { id: 'S1', from: 25, to: 5, name: 'Ular Penjaga Relik', type: 'snake' },
      { id: 'S2', from: 39, to: 14, name: 'Viper Batu Giok', type: 'snake' },
      { id: 'S3', from: 52, to: 28, name: 'Ular Kutukan Kuil', type: 'snake' },
      { id: 'S4', from: 62, to: 38, name: 'Naga Perunggu Kuno', type: 'snake' },
      { id: 'S5', from: 77, to: 51, name: 'Serpent Lorong Rahasia', type: 'snake' },
      { id: 'S6', from: 87, to: 59, name: 'Naga Giok Pelindung', type: 'snake' },
      { id: 'S7', from: 93, to: 66, name: 'Wyrm Mahkota Kuil', type: 'snake' },
      { id: 'S8', from: 97, to: 44, name: 'Dewa Naga Kuil Emas', type: 'snake' },
    ],
    boardSettings: {
      shape: 'classic_square',
      sizeScale: 1.0,
      material: 'metallic',
      primaryColor: '#44403c',
      secondaryColor: '#f59e0b',
    },
    tileConfig: {
      shape: 'beveled_square',
      primaryColor: '#3a342a',
      alternateColor: '#4d4436',
      textureStyle: 'temple_gold_inlay',
      material: 'metallic',
      numeralStyle: 'serif_antique',
      visualEffect: 'subtle_rune_glow',
    },
    snakeConfig: {
      primaryColor: '#047857',
      stripeColor: '#fde047',
      bellyColor: '#fef9c3',
      hornColor: '#f59e0b',
      headModel: 'oriental_dragon',
      scalePattern: 'royal_hex',
      sizeScale: 1.04,
      materialFinish: 'glossy_scales',
    },
    ladderConfig: {
      materialStyle: 'temple_bronze',
      primaryColor: '#d97706',
      accentColor: '#fef08a',
      modelStyle: 'royal_steps',
      widthScale: 1.05,
    },
    environmentConfig: {
      skyPreset: 'temple_sunset',
      showTrees: true,
      showRocks: true,
      showCastle: true,
      showWaterfall: true,
      decorations: 'temple_columns',
      fogIntensity: 0.45,
      lightingPreset: 'torchlit_sanctum',
    },
    visualEffects: {
      glowIntensity: 0.85,
      particleDensity: 0.85,
      particleStyle: 'golden_runes',
      ambientIntensity: 1.0,
      shadowsEnabled: true,
    },
  },
  {
    id: 'default_sakura_shogun',
    name: 'Sakura Shogunate',
    subtitle: 'Istana Kelopak Crimson',
    description:
      'Kastil shogun bermandikan senja merah jambu, gerbang Torii vermilion, kelopak sakura melayang, dan naga kaisar crimson.',
    themeId: 'sakura_shogun',
    previewSwatches: ['#f472b6', '#881337', '#fbbf24'],
    isCustom: false,
    createdAt: 1735689608000,
    updatedAt: 1735689608000,
    ladders: [
      { id: 'L1', from: 5, to: 26, name: 'Jembatan Torii Timur', type: 'ladder' },
      { id: 'L2', from: 11, to: 31, name: 'Tangga Kelopak Hanami', type: 'ladder' },
      { id: 'L3', from: 19, to: 41, name: 'Jalur Lentera Shogun', type: 'ladder' },
      { id: 'L4', from: 29, to: 50, name: 'Tangga Pagoda Crimson', type: 'ladder' },
      { id: 'L5', from: 38, to: 61, name: 'Jembatan Bambu Senja', type: 'ladder' },
      { id: 'L6', from: 48, to: 70, name: 'Gerbang Angin Sakura', type: 'ladder' },
      { id: 'L7', from: 57, to: 79, name: 'Tangga Kastil Samurai', type: 'ladder' },
      { id: 'L8', from: 67, to: 86, name: 'Tangga Gerbang Vermilion', type: 'ladder' },
      { id: 'L9', from: 74, to: 95, name: 'Puncak Kuil Bunga', type: 'ladder' },
    ],
    snakes: [
      { id: 'S1', from: 24, to: 6, name: 'Ryu Merah Muda', type: 'snake' },
      { id: 'S2', from: 39, to: 15, name: 'Ular Kipas Kabuki', type: 'snake' },
      { id: 'S3', from: 53, to: 28, name: 'Naga Awan Senja', type: 'snake' },
      { id: 'S4', from: 64, to: 36, name: 'Penjaga Sungai Koi', type: 'snake' },
      { id: 'S5', from: 75, to: 49, name: 'Ular Pedang Ronin', type: 'snake' },
      { id: 'S6', from: 85, to: 60, name: 'Naga Lentera Merah', type: 'snake' },
      { id: 'S7', from: 92, to: 68, name: 'Wyrm Pagoda Emas', type: 'snake' },
      { id: 'S8', from: 98, to: 45, name: 'Shogun Ryu Abadi', type: 'snake' },
    ],
    boardSettings: {
      shape: 'citadel_terrace',
      sizeScale: 1.04,
      material: 'glossy',
      primaryColor: '#260b16',
      secondaryColor: '#f43f5e',
    },
    tileConfig: {
      shape: 'rounded_tablet',
      primaryColor: '#3b1224',
      alternateColor: '#541a32',
      textureStyle: 'sakura_lacquer',
      material: 'glossy',
      numeralStyle: 'cinzel_royal',
      visualEffect: 'subtle_rune_glow',
    },
    snakeConfig: {
      primaryColor: '#be123c',
      stripeColor: '#fda4af',
      bellyColor: '#fef3c7',
      hornColor: '#f59e0b',
      headModel: 'oriental_dragon',
      scalePattern: 'royal_hex',
      sizeScale: 1.08,
      materialFinish: 'glossy_scales',
    },
    ladderConfig: {
      materialStyle: 'lacquer_gold',
      primaryColor: '#b91c1c',
      accentColor: '#fbbf24',
      modelStyle: 'arch_bridge',
      widthScale: 1.04,
    },
    environmentConfig: {
      skyPreset: 'sakura_dusk',
      showTrees: true,
      showRocks: true,
      showCastle: true,
      showWaterfall: true,
      decorations: 'sakura_torii',
      fogIntensity: 0.36,
      lightingPreset: 'blossom_lantern',
    },
    visualEffects: {
      glowIntensity: 0.88,
      particleDensity: 0.92,
      particleStyle: 'sakura_petals',
      ambientIntensity: 1.04,
      shadowsEnabled: true,
    },
  },
  {
    id: 'default_clockwork_aether',
    name: 'Clockwork Aether',
    subtitle: 'Menara Kronos Steampunk',
    description:
      'Observatorium mekanis berlapis kuningan tempa, roda gigi raksasa berputar, saluran energi zamrud, dan naga mekanis aether.',
    themeId: 'clockwork_aether',
    previewSwatches: ['#d97706', '#10b981', '#292524'],
    isCustom: false,
    createdAt: 1735689609000,
    updatedAt: 1735689609000,
    ladders: [
      { id: 'L1', from: 4, to: 25, name: 'Lift Piston Kronos', type: 'ladder' },
      { id: 'L2', from: 10, to: 30, name: 'Tangga Roda Gigi', type: 'ladder' },
      { id: 'L3', from: 17, to: 38, name: 'Rel Uap Kuningan', type: 'ladder' },
      { id: 'L4', from: 27, to: 48, name: 'Jembatan Pendulum', type: 'ladder' },
      { id: 'L5', from: 35, to: 59, name: 'Jalur Turbin Emas', type: 'ladder' },
      { id: 'L6', from: 45, to: 66, name: 'Menara Dinamo Aether', type: 'ladder' },
      { id: 'L7', from: 54, to: 77, name: 'Tangga Kompas Emas', type: 'ladder' },
      { id: 'L8', from: 68, to: 89, name: 'Tangga Kronometer Agung', type: 'ladder' },
      { id: 'L9', from: 79, to: 96, name: 'Poros Waktu Agung', type: 'ladder' },
    ],
    snakes: [
      { id: 'S1', from: 29, to: 8, name: 'Kobra Tembaga', type: 'snake' },
      { id: 'S2', from: 42, to: 18, name: 'Ular Pegas Baja', type: 'snake' },
      { id: 'S3', from: 53, to: 31, name: 'Viper Voltase', type: 'snake' },
      { id: 'S4', from: 63, to: 40, name: 'Naga Mesin Uap', type: 'snake' },
      { id: 'S5', from: 74, to: 49, name: 'Automaton Wyrm', type: 'snake' },
      { id: 'S6', from: 86, to: 61, name: 'Naga Dinamo Aether', type: 'snake' },
      { id: 'S7', from: 93, to: 70, name: 'Wyrm Kuningan Tempa', type: 'snake' },
      { id: 'S8', from: 99, to: 50, name: 'Leviathan Kronos Abadi', type: 'snake' },
    ],
    boardSettings: {
      shape: 'octagon_bastion',
      sizeScale: 1.05,
      material: 'metallic',
      primaryColor: '#1c1917',
      secondaryColor: '#f59e0b',
    },
    tileConfig: {
      shape: 'octagon_cut',
      primaryColor: '#29231e',
      alternateColor: '#3d3228',
      textureStyle: 'brass_clockwork',
      material: 'metallic',
      numeralStyle: 'mono_bold',
      visualEffect: 'corner_sparks',
    },
    snakeConfig: {
      primaryColor: '#b45309',
      stripeColor: '#34d399',
      bellyColor: '#fde68a',
      hornColor: '#f59e0b',
      headModel: 'horned_viper',
      scalePattern: 'draconic_plate',
      sizeScale: 1.06,
      materialFinish: 'metallic_drake',
    },
    ladderConfig: {
      materialStyle: 'gilded_brass',
      primaryColor: '#d97706',
      accentColor: '#34d399',
      modelStyle: 'chain_link',
      widthScale: 1.05,
    },
    environmentConfig: {
      skyPreset: 'aether_twilight',
      showTrees: false,
      showRocks: true,
      showCastle: true,
      showWaterfall: false,
      decorations: 'clockwork_gears',
      fogIntensity: 0.42,
      lightingPreset: 'brass_atelier',
    },
    visualEffects: {
      glowIntensity: 0.9,
      particleDensity: 0.86,
      particleStyle: 'brass_sparks',
      ambientIntensity: 0.98,
      shadowsEnabled: true,
    },
  },
  {
    id: 'default_jade_palace',
    name: 'Jade Dragon Palace',
    subtitle: 'Kahyangan Naga Giok',
    description:
      'Istana marmer giok kekaisaran di puncak tebing berkabut, pagoda emas bercahaya, lentera giok melayang, dan naga pusaka.',
    themeId: 'jade_palace',
    previewSwatches: ['#10b981', '#065f46', '#fde047'],
    isCustom: false,
    createdAt: 1735689610000,
    updatedAt: 1735689610000,
    ladders: [
      { id: 'L1', from: 6, to: 27, name: 'Tangga Gerbang Giok', type: 'ladder' },
      { id: 'L2', from: 14, to: 36, name: 'Jembatan Kabut Awan', type: 'ladder' },
      { id: 'L3', from: 22, to: 44, name: 'Tangga Bambu Suci', type: 'ladder' },
      { id: 'L4', from: 30, to: 51, name: 'Tangga Pagoda Langit', type: 'ladder' },
      { id: 'L5', from: 40, to: 62, name: 'Tangga Teratai Emas', type: 'ladder' },
      { id: 'L6', from: 49, to: 72, name: 'Tangga Balai Zamrud', type: 'ladder' },
      { id: 'L7', from: 60, to: 81, name: 'Pilar Naga Timur', type: 'ladder' },
      { id: 'L8', from: 69, to: 89, name: 'Tangga Gerbang Kekaisaran', type: 'ladder' },
      { id: 'L9', from: 75, to: 94, name: 'Takhta Giok Abadi', type: 'ladder' },
    ],
    snakes: [
      { id: 'S1', from: 25, to: 4, name: 'Naga Embun Giok', type: 'snake' },
      { id: 'S2', from: 41, to: 17, name: 'Ular Bambu Suci', type: 'snake' },
      { id: 'S3', from: 54, to: 31, name: 'Penjaga Kolam Teratai', type: 'snake' },
      { id: 'S4', from: 66, to: 43, name: 'Naga Awan Zamrud', type: 'snake' },
      { id: 'S5', from: 78, to: 52, name: 'Viper Pagoda Giok', type: 'snake' },
      { id: 'S6', from: 86, to: 61, name: 'Kaisar Ular Emas', type: 'snake' },
      { id: 'S7', from: 91, to: 68, name: 'Wyrm Istana Giok', type: 'snake' },
      { id: 'S8', from: 97, to: 46, name: 'Shenlong Langit Giok', type: 'snake' },
    ],
    boardSettings: {
      shape: 'citadel_terrace',
      sizeScale: 1.06,
      material: 'glossy',
      primaryColor: '#052e23',
      secondaryColor: '#fbbf24',
    },
    tileConfig: {
      shape: 'beveled_square',
      primaryColor: '#0b4a3a',
      alternateColor: '#115e4b',
      textureStyle: 'imperial_jade',
      material: 'glossy',
      numeralStyle: 'cinzel_royal',
      visualEffect: 'edge_pulse',
    },
    snakeConfig: {
      primaryColor: '#059669',
      stripeColor: '#fde047',
      bellyColor: '#ecfdf5',
      hornColor: '#fbbf24',
      headModel: 'oriental_dragon',
      scalePattern: 'royal_hex',
      sizeScale: 1.12,
      materialFinish: 'crystalline',
    },
    ladderConfig: {
      materialStyle: 'imperial_jade_stone',
      primaryColor: '#34d399',
      accentColor: '#fde047',
      modelStyle: 'royal_steps',
      widthScale: 1.06,
    },
    environmentConfig: {
      skyPreset: 'jade_mist',
      showTrees: true,
      showRocks: true,
      showCastle: true,
      showWaterfall: true,
      decorations: 'jade_pagodas',
      fogIntensity: 0.34,
      lightingPreset: 'jade_sanctuary',
    },
    visualEffects: {
      glowIntensity: 0.92,
      particleDensity: 0.9,
      particleStyle: 'jade_lanterns',
      ambientIntensity: 1.06,
      shadowsEnabled: true,
    },
  },
  {
    id: 'default_cosmic_nebula',
    name: 'Cosmic Nebula',
    subtitle: 'Observatorium Galaksi Astral',
    description:
      'Arena kristal antariksa di tengah pusaran nebula violet-emas, cincin astrolab mengorbit, dan naga bintang kosmik legendaris.',
    themeId: 'cosmic_nebula',
    previewSwatches: ['#a855f7', '#38bdf8', '#fde047'],
    isCustom: false,
    createdAt: 1735689611000,
    updatedAt: 1735689611000,
    ladders: [
      { id: 'L1', from: 8, to: 29, name: 'Gerbang Warp Orion', type: 'ladder' },
      { id: 'L2', from: 15, to: 38, name: 'Jembatan Cahaya Pulsar', type: 'ladder' },
      { id: 'L3', from: 24, to: 46, name: 'Jalur Komet Biru', type: 'ladder' },
      { id: 'L4', from: 32, to: 53, name: 'Cincin Orbit Saturnus', type: 'ladder' },
      { id: 'L5', from: 43, to: 64, name: 'Tangga Supernova', type: 'ladder' },
      { id: 'L6', from: 51, to: 73, name: 'Jalur Bima Sakti', type: 'ladder' },
      { id: 'L7', from: 61, to: 82, name: 'Tangga Cakrawala Quasar', type: 'ladder' },
      { id: 'L8', from: 70, to: 91, name: 'Gerbang Galaksi Andromeda', type: 'ladder' },
      { id: 'L9', from: 78, to: 96, name: 'Portal Singularitas', type: 'ladder' },
    ],
    snakes: [
      { id: 'S1', from: 27, to: 5, name: 'Komet Ekor Ungu', type: 'snake' },
      { id: 'S2', from: 44, to: 19, name: 'Ular Lubang Hitam', type: 'snake' },
      { id: 'S3', from: 56, to: 31, name: 'Wyrm Sabuk Asteroid', type: 'snake' },
      { id: 'S4', from: 67, to: 40, name: 'Naga Gerhana Nova', type: 'snake' },
      { id: 'S5', from: 77, to: 50, name: 'Serpent Quasar', type: 'snake' },
      { id: 'S6', from: 87, to: 62, name: 'Naga Nebula Andromeda', type: 'snake' },
      { id: 'S7', from: 94, to: 69, name: 'Naga Pulsar Kosmik', type: 'snake' },
      { id: 'S8', from: 98, to: 54, name: 'Aurelion Penguasa Bintang', type: 'snake' },
    ],
    boardSettings: {
      shape: 'octagon_bastion',
      sizeScale: 1.08,
      material: 'glossy',
      primaryColor: '#090418',
      secondaryColor: '#38bdf8',
    },
    tileConfig: {
      shape: 'crystal_facet',
      primaryColor: '#140b2e',
      alternateColor: '#1f1247',
      textureStyle: 'nebula_crystal',
      material: 'glossy',
      numeralStyle: 'cinzel_royal',
      visualEffect: 'edge_pulse',
    },
    snakeConfig: {
      primaryColor: '#7c3aed',
      stripeColor: '#38bdf8',
      bellyColor: '#fef08a',
      hornColor: '#fde047',
      headModel: 'abyssal_wyrm',
      scalePattern: 'frost_shard',
      sizeScale: 1.14,
      materialFinish: 'crystalline',
    },
    ladderConfig: {
      materialStyle: 'astral_prism',
      primaryColor: '#38bdf8',
      accentColor: '#f472b6',
      modelStyle: 'crystal_spire',
      widthScale: 1.08,
    },
    environmentConfig: {
      skyPreset: 'cosmic_nebula_sky',
      showTrees: false,
      showRocks: true,
      showCastle: false,
      showWaterfall: false,
      decorations: 'nebula_rings',
      fogIntensity: 0.28,
      lightingPreset: 'nebula_aurora',
    },
    visualEffects: {
      glowIntensity: 1.0,
      particleDensity: 1.0,
      particleStyle: 'cosmic_stardust',
      ambientIntensity: 1.02,
      shadowsEnabled: true,
    },
  },
  // =========================================================================
  // 10 BRAND-NEW PREMIUM 3D BOARDS (Unique Layouts & Bespoke 3D Atmospheres)
  // =========================================================================
  {
    id: 'default_crimson_bloodmoon',
    name: 'Crimson Bloodmoon',
    subtitle: 'Benteng Gerhana Darah',
    description:
      'Kastil kuno di bawah sinar bulan merah darah, ukiran obsidian scarlet, bara crimson, dan naga bertanduk penjaga gerhana.',
    themeId: 'crimson_bloodmoon',
    previewSwatches: ['#e11d48', '#2a0a12', '#fbbf24'],
    isCustom: false,
    createdAt: 1735689612000,
    updatedAt: 1735689612000,
    ladders: [
      { id: 'L1', from: 2, to: 20, name: 'Tangga Gerbang Scarlet', type: 'ladder' },
      { id: 'L2', from: 11, to: 30, name: 'Jembatan Menara Darah', type: 'ladder' },
      { id: 'L3', from: 19, to: 39, name: 'Rantai Kastil Gerhana', type: 'ladder' },
      { id: 'L4', from: 28, to: 49, name: 'Tangga Altar Rubi', type: 'ladder' },
      { id: 'L5', from: 38, to: 60, name: 'Jalur Pijar Crimson', type: 'ladder' },
      { id: 'L6', from: 48, to: 69, name: 'Tangga Balkon Vampir', type: 'ladder' },
      { id: 'L7', from: 57, to: 78, name: 'Tangga Bulan Merah', type: 'ladder' },
      { id: 'L8', from: 66, to: 85, name: 'Tangga Menara Lonceng', type: 'ladder' },
      { id: 'L9', from: 75, to: 93, name: 'Takhta Gerhana Crimson', type: 'ladder' },
    ],
    snakes: [
      { id: 'S1', from: 26, to: 5, name: 'Viper Darah Kuno', type: 'snake' },
      { id: 'S2', from: 42, to: 17, name: 'Ular Bayangan Merah', type: 'snake' },
      { id: 'S3', from: 54, to: 32, name: 'Wyrm Rubi Malam', type: 'snake' },
      { id: 'S4', from: 64, to: 41, name: 'Drake Gerhana Gelap', type: 'snake' },
      { id: 'S5', from: 79, to: 52, name: 'Serpent Ksatria Darah', type: 'snake' },
      { id: 'S6', from: 89, to: 62, name: 'Naga Bulan Crimson', type: 'snake' },
      { id: 'S7', from: 95, to: 70, name: 'Wyrm Kastil Scarlet', type: 'snake' },
      { id: 'S8', from: 99, to: 36, name: 'Raja Naga Bloodmoon', type: 'snake' },
    ],
    boardSettings: {
      shape: 'octagon_bastion',
      sizeScale: 1.04,
      material: 'metallic',
      primaryColor: '#1f080e',
      secondaryColor: '#e11d48',
    },
    tileConfig: {
      shape: 'octagon_cut',
      primaryColor: '#2a0a12',
      alternateColor: '#450f1d',
      textureStyle: 'obsidian_runes',
      material: 'metallic',
      numeralStyle: 'cinzel_royal',
      visualEffect: 'edge_pulse',
    },
    snakeConfig: {
      primaryColor: '#9f1239',
      stripeColor: '#fda4af',
      bellyColor: '#fef08a',
      hornColor: '#f59e0b',
      headModel: 'horned_viper',
      scalePattern: 'draconic_plate',
      sizeScale: 1.1,
      materialFinish: 'metallic_drake',
    },
    ladderConfig: {
      materialStyle: 'obsidian_iron',
      primaryColor: '#3f121d',
      accentColor: '#fb7185',
      modelStyle: 'chain_link',
      widthScale: 1.04,
    },
    environmentConfig: {
      skyPreset: 'eclipse_void',
      showTrees: false,
      showRocks: true,
      showCastle: true,
      showWaterfall: false,
      decorations: 'volcano_braziers',
      fogIntensity: 0.52,
      lightingPreset: 'magma_glow',
    },
    visualEffects: {
      glowIntensity: 0.96,
      particleDensity: 0.9,
      particleStyle: 'lava_embers',
      ambientIntensity: 0.9,
      shadowsEnabled: true,
    },
  },
  {
    id: 'default_cyber_neon_citadel',
    name: 'Cyber Neon Citadel',
    subtitle: 'Metropolis Aether Siber',
    description:
      'Arena futuristik berbalut kristal siber sian-magenta, lintasan prisma holografis, dan wyrm energi kuantum.',
    themeId: 'cyber_neon_citadel',
    previewSwatches: ['#06b6d4', '#ec4899', '#0f172a'],
    isCustom: false,
    createdAt: 1735689613000,
    updatedAt: 1735689613000,
    ladders: [
      { id: 'L1', from: 4, to: 24, name: 'Jalur Hyperlink Alpha', type: 'ladder' },
      { id: 'L2', from: 13, to: 33, name: 'Lift Plasma Sian', type: 'ladder' },
      { id: 'L3', from: 22, to: 42, name: 'Jembatan Hologram', type: 'ladder' },
      { id: 'L4', from: 31, to: 52, name: 'Tangga Sirkuit Neon', type: 'ladder' },
      { id: 'L5', from: 40, to: 62, name: 'Kabel Foton Ungu', type: 'ladder' },
      { id: 'L6', from: 49, to: 70, name: 'Menara Transmisi Siber', type: 'ladder' },
      { id: 'L7', from: 59, to: 80, name: 'Portal Fiber Optik', type: 'ladder' },
      { id: 'L8', from: 68, to: 87, name: 'Tangga Core Kuantum', type: 'ladder' },
      { id: 'L9', from: 79, to: 97, name: 'Gerbang Overclock 99', type: 'ladder' },
    ],
    snakes: [
      { id: 'S1', from: 28, to: 6, name: 'Virus Kobra Sian', type: 'snake' },
      { id: 'S2', from: 45, to: 18, name: 'Ular Glitch Magenta', type: 'snake' },
      { id: 'S3', from: 56, to: 30, name: 'Serpent Firewall', type: 'snake' },
      { id: 'S4', from: 66, to: 39, name: 'Wyrm Sirkuit Rusak', type: 'snake' },
      { id: 'S5', from: 75, to: 50, name: 'Naga Arus Pendek', type: 'snake' },
      { id: 'S6', from: 86, to: 61, name: 'Hydra Malware Neon', type: 'snake' },
      { id: 'S7', from: 92, to: 67, name: 'Wyrm Matrix Siber', type: 'snake' },
      { id: 'S8', from: 98, to: 44, name: 'Overlord Naga Kuantum', type: 'snake' },
    ],
    boardSettings: {
      shape: 'octagon_bastion',
      sizeScale: 1.06,
      material: 'glossy',
      primaryColor: '#090d1f',
      secondaryColor: '#06b6d4',
    },
    tileConfig: {
      shape: 'crystal_facet',
      primaryColor: '#0f172a',
      alternateColor: '#1e1b4b',
      textureStyle: 'nebula_crystal',
      material: 'glossy',
      numeralStyle: 'mono_bold',
      visualEffect: 'edge_pulse',
    },
    snakeConfig: {
      primaryColor: '#db2777',
      stripeColor: '#22d3ee',
      bellyColor: '#f0f9ff',
      hornColor: '#38bdf8',
      headModel: 'abyssal_wyrm',
      scalePattern: 'frost_shard',
      sizeScale: 1.08,
      materialFinish: 'crystalline',
    },
    ladderConfig: {
      materialStyle: 'astral_prism',
      primaryColor: '#22d3ee',
      accentColor: '#f472b6',
      modelStyle: 'crystal_spire',
      widthScale: 1.06,
    },
    environmentConfig: {
      skyPreset: 'starlit_night',
      showTrees: false,
      showRocks: true,
      showCastle: false,
      showWaterfall: false,
      decorations: 'nebula_rings',
      fogIntensity: 0.32,
      lightingPreset: 'nebula_aurora',
    },
    visualEffects: {
      glowIntensity: 1.0,
      particleDensity: 0.96,
      particleStyle: 'cosmic_stardust',
      ambientIntensity: 1.04,
      shadowsEnabled: true,
    },
  },
  {
    id: 'default_mystic_fungi_grove',
    name: 'Mystic Fungi Grove',
    subtitle: 'Hutan Jamur Bioluminesen',
    description:
      'Lembah malam penuh jamur bercahaya toska dan ungu, spora magis berkilau, serta naga penjaga mata air rimba.',
    themeId: 'mystic_fungi_grove',
    previewSwatches: ['#14b8a6', '#8b5cf6', '#0f292a'],
    isCustom: false,
    createdAt: 1735689614000,
    updatedAt: 1735689614000,
    ladders: [
      { id: 'L1', from: 3, to: 24, name: 'Tangga Spora Toska', type: 'ladder' },
      { id: 'L2', from: 10, to: 32, name: 'Jembatan Jamur Raksasa', type: 'ladder' },
      { id: 'L3', from: 18, to: 43, name: 'Sulur Bioluminesen', type: 'ladder' },
      { id: 'L4', from: 29, to: 51, name: 'Tangga Embun Violet', type: 'ladder' },
      { id: 'L5', from: 39, to: 60, name: 'Jalur Kunang Kristal', type: 'ladder' },
      { id: 'L6', from: 46, to: 68, name: 'Tangga Pohon Bercahaya', type: 'ladder' },
      { id: 'L7', from: 56, to: 77, name: 'Tangga Lembah Spora', type: 'ladder' },
      { id: 'L8', from: 67, to: 86, name: 'Jembatan Kanopi Ajaib', type: 'ladder' },
      { id: 'L9', from: 74, to: 94, name: 'Tangga Inti Rimba', type: 'ladder' },
    ],
    snakes: [
      { id: 'S1', from: 27, to: 7, name: 'Ular Spora Beracun', type: 'snake' },
      { id: 'S2', from: 41, to: 15, name: 'Viper Jamur Ungu', type: 'snake' },
      { id: 'S3', from: 53, to: 26, name: 'Ular Lumut Bercahaya', type: 'snake' },
      { id: 'S4', from: 63, to: 38, name: 'Serpent Kabut Toska', type: 'snake' },
      { id: 'S5', from: 78, to: 50, name: 'Wyrm Akar Hutan', type: 'snake' },
      { id: 'S6', from: 89, to: 61, name: 'Naga Bioluminesen', type: 'snake' },
      { id: 'S7', from: 93, to: 69, name: 'Viper Kubah Spora', type: 'snake' },
      { id: 'S8', from: 97, to: 48, name: 'Raja Serpent Mycelium', type: 'snake' },
    ],
    boardSettings: {
      shape: 'classic_square',
      sizeScale: 1.02,
      material: 'satin',
      primaryColor: '#0c272b',
      secondaryColor: '#2dd4bf',
    },
    tileConfig: {
      shape: 'rounded_tablet',
      primaryColor: '#112e30',
      alternateColor: '#1f2347',
      textureStyle: 'mossy_stone',
      material: 'satin',
      numeralStyle: 'mono_bold',
      visualEffect: 'subtle_rune_glow',
    },
    snakeConfig: {
      primaryColor: '#0d9488',
      stripeColor: '#c084fc',
      bellyColor: '#ccfbf1',
      hornColor: '#5eead4',
      headModel: 'crowned_cobra',
      scalePattern: 'diamond_keel',
      sizeScale: 1.05,
      materialFinish: 'glossy_scales',
    },
    ladderConfig: {
      materialStyle: 'coral_pearl',
      primaryColor: '#2dd4bf',
      accentColor: '#a78bfa',
      modelStyle: 'arch_bridge',
      widthScale: 1.02,
    },
    environmentConfig: {
      skyPreset: 'twilight_forest',
      showTrees: true,
      showRocks: true,
      showCastle: false,
      showWaterfall: true,
      decorations: 'runic_obelisks',
      fogIntensity: 0.48,
      lightingPreset: 'bioluminescent',
    },
    visualEffects: {
      glowIntensity: 0.94,
      particleDensity: 0.96,
      particleStyle: 'fireflies',
      ambientIntensity: 0.98,
      shadowsEnabled: true,
    },
  },
  {
    id: 'default_golden_pharaoh_vault',
    name: 'Golden Pharaoh Vault',
    subtitle: 'Brankas Emas Anubis',
    description:
      'Ruang harta karun firaun berlapis emas murni, tablet batu hitam berukir hieroglif, dan kobra kerajaan penjaga singgasana.',
    themeId: 'golden_pharaoh_vault',
    previewSwatches: ['#fbbf24', '#1c1917', '#b45309'],
    isCustom: false,
    createdAt: 1735689615000,
    updatedAt: 1735689615000,
    ladders: [
      { id: 'L1', from: 5, to: 25, name: 'Tangga Patung Anubis', type: 'ladder' },
      { id: 'L2', from: 14, to: 33, name: 'Jalur Peti Emas', type: 'ladder' },
      { id: 'L3', from: 20, to: 42, name: 'Tangga Obelisk Ra', type: 'ladder' },
      { id: 'L4', from: 30, to: 52, name: 'Tangga Sarkofagus Suci', type: 'ladder' },
      { id: 'L5', from: 39, to: 61, name: 'Jembatan Permata Nil', type: 'ladder' },
      { id: 'L6', from: 49, to: 70, name: 'Tangga Ruang Harta', type: 'ladder' },
      { id: 'L7', from: 59, to: 81, name: 'Tangga Gerbang Horus', type: 'ladder' },
      { id: 'L8', from: 68, to: 87, name: 'Tangga Pilar Emas', type: 'ladder' },
      { id: 'L9', from: 77, to: 96, name: 'Takhta Firaun Abadi', type: 'ladder' },
    ],
    snakes: [
      { id: 'S1', from: 28, to: 6, name: 'Kobra Brankas Emas', type: 'snake' },
      { id: 'S2', from: 44, to: 17, name: 'Viper Makam Firaun', type: 'snake' },
      { id: 'S3', from: 56, to: 32, name: 'Ular Kutukan Anubis', type: 'snake' },
      { id: 'S4', from: 66, to: 40, name: 'Kobra Mahkota Surya', type: 'snake' },
      { id: 'S5', from: 74, to: 50, name: 'Serpent Pasir Emas', type: 'snake' },
      { id: 'S6', from: 85, to: 62, name: 'Naga Piramida Agung', type: 'snake' },
      { id: 'S7', from: 91, to: 67, name: 'Wyrm Harta Karun', type: 'snake' },
      { id: 'S8', from: 99, to: 45, name: 'Set Penguasa Brankas', type: 'snake' },
    ],
    boardSettings: {
      shape: 'citadel_terrace',
      sizeScale: 1.05,
      material: 'metallic',
      primaryColor: '#1c1509',
      secondaryColor: '#f59e0b',
    },
    tileConfig: {
      shape: 'beveled_square',
      primaryColor: '#2b200d',
      alternateColor: '#4a3512',
      textureStyle: 'temple_gold_inlay',
      material: 'metallic',
      numeralStyle: 'serif_antique',
      visualEffect: 'corner_sparks',
    },
    snakeConfig: {
      primaryColor: '#eab308',
      stripeColor: '#1c1917',
      bellyColor: '#fef9c3',
      hornColor: '#fbbf24',
      headModel: 'crowned_cobra',
      scalePattern: 'royal_hex',
      sizeScale: 1.1,
      materialFinish: 'metallic_drake',
    },
    ladderConfig: {
      materialStyle: 'sandstone_gold',
      primaryColor: '#fbbf24',
      accentColor: '#78350f',
      modelStyle: 'royal_steps',
      widthScale: 1.06,
    },
    environmentConfig: {
      skyPreset: 'golden_mirage',
      showTrees: false,
      showRocks: true,
      showCastle: true,
      showWaterfall: false,
      decorations: 'desert_pyramids',
      fogIntensity: 0.34,
      lightingPreset: 'torchlit_sanctum',
    },
    visualEffects: {
      glowIntensity: 0.92,
      particleDensity: 0.88,
      particleStyle: 'golden_runes',
      ambientIntensity: 1.08,
      shadowsEnabled: true,
    },
  },
  {
    id: 'default_storm_titan_peak',
    name: 'Storm Titan Peak',
    subtitle: 'Puncak Petir Titan',
    description:
      'Dataran tinggi badai petir tempat para titan menempa halilintar, batu tulis kobalt, jembatan rantai baja, dan naga kilat.',
    themeId: 'storm_titan_peak',
    previewSwatches: ['#3b82f6', '#facc15', '#1e293b'],
    isCustom: false,
    createdAt: 1735689616000,
    updatedAt: 1735689616000,
    ladders: [
      { id: 'L1', from: 6, to: 26, name: 'Rantai Tebing Guntur', type: 'ladder' },
      { id: 'L2', from: 15, to: 36, name: 'Tangga Menara Kilat', type: 'ladder' },
      { id: 'L3', from: 24, to: 45, name: 'Jembatan Awan Badai', type: 'ladder' },
      { id: 'L4', from: 32, to: 53, name: 'Tangga Batu Titan', type: 'ladder' },
      { id: 'L5', from: 41, to: 63, name: 'Jalur Petir Biru', type: 'ladder' },
      { id: 'L6', from: 50, to: 72, name: 'Tangga Altar Zeus', type: 'ladder' },
      { id: 'L7', from: 60, to: 82, name: 'Tangga Puncak Awan', type: 'ladder' },
      { id: 'L8', from: 69, to: 89, name: 'Jembatan Halilintar', type: 'ladder' },
      { id: 'L9', from: 78, to: 95, name: 'Takhta Dewa Badai', type: 'ladder' },
    ],
    snakes: [
      { id: 'S1', from: 29, to: 8, name: 'Ular Percikan Kilat', type: 'snake' },
      { id: 'S2', from: 43, to: 18, name: 'Viper Badai Kobalt', type: 'snake' },
      { id: 'S3', from: 54, to: 31, name: 'Naga Awan Hitam', type: 'snake' },
      { id: 'S4', from: 66, to: 39, name: 'Wyrm Guntur Emas', type: 'snake' },
      { id: 'S5', from: 75, to: 49, name: 'Serpent Pusaran Angin', type: 'snake' },
      { id: 'S6', from: 86, to: 61, name: 'Naga Petir Titan', type: 'snake' },
      { id: 'S7', from: 94, to: 68, name: 'Wyrm Puncak Halilintar', type: 'snake' },
      { id: 'S8', from: 98, to: 46, name: 'Tempest Sovereign', type: 'snake' },
    ],
    boardSettings: {
      shape: 'octagon_bastion',
      sizeScale: 1.05,
      material: 'metallic',
      primaryColor: '#0f172a',
      secondaryColor: '#facc15',
    },
    tileConfig: {
      shape: 'octagon_cut',
      primaryColor: '#1e293b',
      alternateColor: '#334155',
      textureStyle: 'frosted_ice',
      material: 'metallic',
      numeralStyle: 'cinzel_royal',
      visualEffect: 'corner_sparks',
    },
    snakeConfig: {
      primaryColor: '#1d4ed8',
      stripeColor: '#fde047',
      bellyColor: '#e0f2fe',
      hornColor: '#facc15',
      headModel: 'horned_viper',
      scalePattern: 'draconic_plate',
      sizeScale: 1.1,
      materialFinish: 'metallic_drake',
    },
    ladderConfig: {
      materialStyle: 'shadow_wrought',
      primaryColor: '#475569',
      accentColor: '#facc15',
      modelStyle: 'chain_link',
      widthScale: 1.05,
    },
    environmentConfig: {
      skyPreset: 'aurora_frost',
      showTrees: false,
      showRocks: true,
      showCastle: true,
      showWaterfall: true,
      decorations: 'floating_islands',
      fogIntensity: 0.44,
      lightingPreset: 'arctic_noon',
    },
    visualEffects: {
      glowIntensity: 0.96,
      particleDensity: 0.9,
      particleStyle: 'starlight',
      ambientIntensity: 1.06,
      shadowsEnabled: true,
    },
  },
  {
    id: 'default_crystal_rose_cathedral',
    name: 'Crystal Rose Cathedral',
    subtitle: 'Katedral Mawar Kristal',
    description:
      'Katedral megah berbahan kuarsa mawar merah muda, kaca patri bercahaya, kelopak kristal berterbangan, dan naga mutiara.',
    themeId: 'crystal_rose_cathedral',
    previewSwatches: ['#f472b6', '#fbcfe8', '#4c1d45'],
    isCustom: false,
    createdAt: 1735689617000,
    updatedAt: 1735689617000,
    ladders: [
      { id: 'L1', from: 2, to: 22, name: 'Tangga Gerbang Mawar', type: 'ladder' },
      { id: 'L2', from: 11, to: 32, name: 'Jembatan Kuarsa Merah', type: 'ladder' },
      { id: 'L3', from: 19, to: 41, name: 'Tangga Kaca Patri', type: 'ladder' },
      { id: 'L4', from: 27, to: 49, name: 'Tangga Balkon Mutiara', type: 'ladder' },
      { id: 'L5', from: 36, to: 57, name: 'Jalur Kelopak Kristal', type: 'ladder' },
      { id: 'L6', from: 46, to: 67, name: 'Tangga Altar Mawar', type: 'ladder' },
      { id: 'L7', from: 54, to: 75, name: 'Tangga Menara Lonceng', type: 'ladder' },
      { id: 'L8', from: 64, to: 85, name: 'Tangga Kubah Kuarsa', type: 'ladder' },
      { id: 'L9', from: 73, to: 93, name: 'Mahkota Katedral Mawar', type: 'ladder' },
    ],
    snakes: [
      { id: 'S1', from: 25, to: 4, name: 'Ular Duri Mawar', type: 'snake' },
      { id: 'S2', from: 40, to: 17, name: 'Viper Kuarsa Merah', type: 'snake' },
      { id: 'S3', from: 52, to: 28, name: 'Serpent Kaca Patri', type: 'snake' },
      { id: 'S4', from: 62, to: 38, name: 'Naga Kelopak Perak', type: 'snake' },
      { id: 'S5', from: 77, to: 51, name: 'Wyrm Taman Kristal', type: 'snake' },
      { id: 'S6', from: 87, to: 60, name: 'Naga Ratu Mawar', type: 'snake' },
      { id: 'S7', from: 95, to: 68, name: 'Wyrm Katedral Senja', type: 'snake' },
      { id: 'S8', from: 99, to: 53, name: 'Seraphim Naga Mutiara', type: 'snake' },
    ],
    boardSettings: {
      shape: 'citadel_terrace',
      sizeScale: 1.05,
      material: 'glossy',
      primaryColor: '#3b102d',
      secondaryColor: '#f472b6',
    },
    tileConfig: {
      shape: 'crystal_facet',
      primaryColor: '#4c163a',
      alternateColor: '#6b1f52',
      textureStyle: 'sakura_lacquer',
      material: 'glossy',
      numeralStyle: 'cinzel_royal',
      visualEffect: 'edge_pulse',
    },
    snakeConfig: {
      primaryColor: '#ec4899',
      stripeColor: '#fef08a',
      bellyColor: '#fdf2f8',
      hornColor: '#fbcfe8',
      headModel: 'oriental_dragon',
      scalePattern: 'frost_shard',
      sizeScale: 1.08,
      materialFinish: 'crystalline',
    },
    ladderConfig: {
      materialStyle: 'lacquer_gold',
      primaryColor: '#f9a8d4',
      accentColor: '#fde047',
      modelStyle: 'crystal_spire',
      widthScale: 1.04,
    },
    environmentConfig: {
      skyPreset: 'sakura_dusk',
      showTrees: true,
      showRocks: true,
      showCastle: true,
      showWaterfall: true,
      decorations: 'sakura_torii',
      fogIntensity: 0.34,
      lightingPreset: 'blossom_lantern',
    },
    visualEffects: {
      glowIntensity: 0.94,
      particleDensity: 0.95,
      particleStyle: 'sakura_petals',
      ambientIntensity: 1.08,
      shadowsEnabled: true,
    },
  },
  {
    id: 'default_solar_phoenix_sanctum',
    name: 'Solar Phoenix Sanctum',
    subtitle: 'Singgasana Api Phoenix',
    description:
      'Kuil suci sang Phoenix Abadi dengan marmer surya menyala, bulu api keemasan, pilar matahari, dan naga api surgawi.',
    themeId: 'solar_phoenix_sanctum',
    previewSwatches: ['#f97316', '#fde047', '#7c2d12'],
    isCustom: false,
    createdAt: 1735689618000,
    updatedAt: 1735689618000,
    ladders: [
      { id: 'L1', from: 4, to: 26, name: 'Tangga Sayap Fajar', type: 'ladder' },
      { id: 'L2', from: 13, to: 35, name: 'Jembatan Bulu Api', type: 'ladder' },
      { id: 'L3', from: 22, to: 44, name: 'Tangga Pilar Surya', type: 'ladder' },
      { id: 'L4', from: 31, to: 54, name: 'Jalur Bara Emas', type: 'ladder' },
      { id: 'L5', from: 40, to: 63, name: 'Tangga Altar Phoenix', type: 'ladder' },
      { id: 'L6', from: 49, to: 72, name: 'Tangga Matahari Terbit', type: 'ladder' },
      { id: 'L7', from: 59, to: 81, name: 'Tangga Gerbang Api Suci', type: 'ladder' },
      { id: 'L8', from: 67, to: 89, name: 'Tangga Puncak Solis', type: 'ladder' },
      { id: 'L9', from: 75, to: 97, name: 'Singgasana Phoenix Abadi', type: 'ladder' },
    ],
    snakes: [
      { id: 'S1', from: 27, to: 6, name: 'Ular Abu Matahari', type: 'snake' },
      { id: 'S2', from: 42, to: 17, name: 'Viper Lidah Api', type: 'snake' },
      { id: 'S3', from: 56, to: 30, name: 'Drake Pijar Emas', type: 'snake' },
      { id: 'S4', from: 66, to: 38, name: 'Naga Gerhana Surya', type: 'snake' },
      { id: 'S5', from: 78, to: 50, name: 'Wyrm Bara Surgawi', type: 'snake' },
      { id: 'S6', from: 86, to: 61, name: 'Serpent Mahkota Api', type: 'snake' },
      { id: 'S7', from: 92, to: 68, name: 'Naga Kuil Matahari', type: 'snake' },
      { id: 'S8', from: 98, to: 41, name: 'Solaris Naga Phoenix', type: 'snake' },
    ],
    boardSettings: {
      shape: 'citadel_terrace',
      sizeScale: 1.06,
      material: 'metallic',
      primaryColor: '#431407',
      secondaryColor: '#fbbf24',
    },
    tileConfig: {
      shape: 'beveled_square',
      primaryColor: '#5c1d0c',
      alternateColor: '#7c2d12',
      textureStyle: 'temple_gold_inlay',
      material: 'metallic',
      numeralStyle: 'cinzel_royal',
      visualEffect: 'corner_sparks',
    },
    snakeConfig: {
      primaryColor: '#ea580c',
      stripeColor: '#fde047',
      bellyColor: '#fffbeb',
      hornColor: '#facc15',
      headModel: 'oriental_dragon',
      scalePattern: 'draconic_plate',
      sizeScale: 1.12,
      materialFinish: 'metallic_drake',
    },
    ladderConfig: {
      materialStyle: 'temple_bronze',
      primaryColor: '#f59e0b',
      accentColor: '#fef08a',
      modelStyle: 'royal_steps',
      widthScale: 1.06,
    },
    environmentConfig: {
      skyPreset: 'temple_sunset',
      showTrees: false,
      showRocks: true,
      showCastle: true,
      showWaterfall: false,
      decorations: 'temple_columns',
      fogIntensity: 0.36,
      lightingPreset: 'divine_radiance',
    },
    visualEffects: {
      glowIntensity: 0.98,
      particleDensity: 0.96,
      particleStyle: 'lava_embers',
      ambientIntensity: 1.12,
      shadowsEnabled: true,
    },
  },
  {
    id: 'default_abyssal_kraken_trench',
    name: 'Abyssal Kraken Trench',
    subtitle: 'Palung Gelap Kraken',
    description:
      'Kedalaman samudra tak tersentuh cahaya matahari, reruntuhan kapal hantu, lentera toska abyssal, dan leviathan laut dalam.',
    themeId: 'abyssal_kraken_trench',
    previewSwatches: ['#0ea5e9', '#14b8a6', '#041221'],
    isCustom: false,
    createdAt: 1735689619000,
    updatedAt: 1735689619000,
    ladders: [
      { id: 'L1', from: 3, to: 22, name: 'Rantai Jangkar Kuno', type: 'ladder' },
      { id: 'L2', from: 11, to: 33, name: 'Tangga Karang Gelap', type: 'ladder' },
      { id: 'L3', from: 20, to: 43, name: 'Jembatan Palung Dalam', type: 'ladder' },
      { id: 'L4', from: 28, to: 50, name: 'Jalur Gelembung Abyss', type: 'ladder' },
      { id: 'L5', from: 38, to: 60, name: 'Tangga Kapal Hantu', type: 'ladder' },
      { id: 'L6', from: 48, to: 69, name: 'Tangga Pilar Kraken', type: 'ladder' },
      { id: 'L7', from: 57, to: 79, name: 'Tangga Lentera Laut', type: 'ladder' },
      { id: 'L8', from: 66, to: 87, name: 'Tangga Tebing Samudra', type: 'ladder' },
      { id: 'L9', from: 74, to: 95, name: 'Gerbang Permukaan Laut', type: 'ladder' },
    ],
    snakes: [
      { id: 'S1', from: 26, to: 5, name: 'Belut Palung Gelap', type: 'snake' },
      { id: 'S2', from: 41, to: 15, name: 'Ular Tentakel Toska', type: 'snake' },
      { id: 'S3', from: 53, to: 29, name: 'Hydra Kapal Karam', type: 'snake' },
      { id: 'S4', from: 64, to: 39, name: 'Wyrm Arus Abyssal', type: 'snake' },
      { id: 'S5', from: 77, to: 51, name: 'Serpent Mata Kraken', type: 'snake' },
      { id: 'S6', from: 86, to: 62, name: 'Naga Laut Gelap', type: 'snake' },
      { id: 'S7', from: 93, to: 67, name: 'Wyrm Palung Mariana', type: 'snake' },
      { id: 'S8', from: 99, to: 36, name: 'Kraken Leviathan Agung', type: 'snake' },
    ],
    boardSettings: {
      shape: 'octagon_bastion',
      sizeScale: 1.06,
      material: 'glossy',
      primaryColor: '#041221',
      secondaryColor: '#14b8a6',
    },
    tileConfig: {
      shape: 'rounded_tablet',
      primaryColor: '#082032',
      alternateColor: '#0d3347',
      textureStyle: 'coral_mosaic',
      material: 'glossy',
      numeralStyle: 'mono_bold',
      visualEffect: 'edge_pulse',
    },
    snakeConfig: {
      primaryColor: '#0f766e',
      stripeColor: '#38bdf8',
      bellyColor: '#ccfbf1',
      hornColor: '#2dd4bf',
      headModel: 'abyssal_wyrm',
      scalePattern: 'diamond_keel',
      sizeScale: 1.12,
      materialFinish: 'glossy_scales',
    },
    ladderConfig: {
      materialStyle: 'obsidian_iron',
      primaryColor: '#0e7490',
      accentColor: '#5eead4',
      modelStyle: 'chain_link',
      widthScale: 1.06,
    },
    environmentConfig: {
      skyPreset: 'abyssal_sea',
      showTrees: false,
      showRocks: true,
      showCastle: false,
      showWaterfall: true,
      decorations: 'atlantis_pillars',
      fogIntensity: 0.56,
      lightingPreset: 'bioluminescent',
    },
    visualEffects: {
      glowIntensity: 0.96,
      particleDensity: 0.94,
      particleStyle: 'sea_bubbles',
      ambientIntensity: 0.94,
      shadowsEnabled: true,
    },
  },
  {
    id: 'default_celestial_dragon_throne',
    name: 'Imperial Dragon Throne',
    subtitle: 'Istana Naga Langit',
    description:
      'Singgasana kekaisaran naga langit di puncak awan giok dan emas, pagoda bertingkat bercahaya, serta naga surga penjaga mahkota.',
    themeId: 'celestial_dragon_throne',
    previewSwatches: ['#fde047', '#0d9488', '#134e4a'],
    isCustom: false,
    createdAt: 1735689620000,
    updatedAt: 1735689620000,
    ladders: [
      { id: 'L1', from: 5, to: 27, name: 'Tangga Gerbang Langit', type: 'ladder' },
      { id: 'L2', from: 14, to: 36, name: 'Jembatan Awan Emas', type: 'ladder' },
      { id: 'L3', from: 24, to: 46, name: 'Tangga Pagoda Kekaisaran', type: 'ladder' },
      { id: 'L4', from: 33, to: 54, name: 'Jalur Lentera Surgawi', type: 'ladder' },
      { id: 'L5', from: 43, to: 64, name: 'Tangga Pilar Naga', type: 'ladder' },
      { id: 'L6', from: 52, to: 73, name: 'Tangga Balai Singgasana', type: 'ladder' },
      { id: 'L7', from: 61, to: 82, name: 'Tangga Teras Giok Emas', type: 'ladder' },
      { id: 'L8', from: 70, to: 89, name: 'Tangga Menara Kaisar', type: 'ladder' },
      { id: 'L9', from: 79, to: 96, name: 'Takhta Naga Langit', type: 'ladder' },
    ],
    snakes: [
      { id: 'S1', from: 29, to: 7, name: 'Naga Kabut Fajar', type: 'snake' },
      { id: 'S2', from: 42, to: 18, name: 'Ryu Penjaga Gerbang', type: 'snake' },
      { id: 'S3', from: 56, to: 31, name: 'Naga Awan Perak', type: 'snake' },
      { id: 'S4', from: 67, to: 40, name: 'Kaisar Serpent Giok', type: 'snake' },
      { id: 'S5', from: 77, to: 50, name: 'Naga Kilat Surgawi', type: 'snake' },
      { id: 'S6', from: 85, to: 59, name: 'Wyrm Istana Awan', type: 'snake' },
      { id: 'S7', from: 91, to: 68, name: 'Naga Mahkota Emas', type: 'snake' },
      { id: 'S8', from: 98, to: 45, name: 'Tianlong Penguasa Langit', type: 'snake' },
    ],
    boardSettings: {
      shape: 'citadel_terrace',
      sizeScale: 1.08,
      material: 'glossy',
      primaryColor: '#092424',
      secondaryColor: '#fde047',
    },
    tileConfig: {
      shape: 'beveled_square',
      primaryColor: '#0f3838',
      alternateColor: '#19524c',
      textureStyle: 'imperial_jade',
      material: 'glossy',
      numeralStyle: 'cinzel_royal',
      visualEffect: 'edge_pulse',
    },
    snakeConfig: {
      primaryColor: '#ca8a04',
      stripeColor: '#2dd4bf',
      bellyColor: '#fef9c3',
      hornColor: '#fde047',
      headModel: 'oriental_dragon',
      scalePattern: 'royal_hex',
      sizeScale: 1.15,
      materialFinish: 'crystalline',
    },
    ladderConfig: {
      materialStyle: 'celestial_marble',
      primaryColor: '#fef08a',
      accentColor: '#14b8a6',
      modelStyle: 'royal_steps',
      widthScale: 1.08,
    },
    environmentConfig: {
      skyPreset: 'astral_dawn',
      showTrees: true,
      showRocks: true,
      showCastle: true,
      showWaterfall: true,
      decorations: 'jade_pagodas',
      fogIntensity: 0.3,
      lightingPreset: 'jade_sanctuary',
    },
    visualEffects: {
      glowIntensity: 0.98,
      particleDensity: 0.95,
      particleStyle: 'jade_lanterns',
      ambientIntensity: 1.12,
      shadowsEnabled: true,
    },
  },
  {
    id: 'default_aether_infinity_nexus',
    name: 'Aether Infinity Nexus',
    subtitle: 'Inti Dimensi Tanpa Batas',
    description:
      'Edisi Mitik tertinggi: nexus kristal prismatik di pusat multisemesta dengan cincin astrolab emas, aurora dimensi, dan naga abadi.',
    themeId: 'aether_infinity_nexus',
    previewSwatches: ['#a855f7', '#fbbf24', '#38bdf8'],
    isCustom: false,
    createdAt: 1735689621000,
    updatedAt: 1735689621000,
    ladders: [
      { id: 'L1', from: 7, to: 29, name: 'Portal Dimensi Alpha', type: 'ladder' },
      { id: 'L2', from: 15, to: 39, name: 'Jembatan Prismatik', type: 'ladder' },
      { id: 'L3', from: 25, to: 48, name: 'Tangga Astrolab Emas', type: 'ladder' },
      { id: 'L4', from: 35, to: 57, name: 'Lintasan Aether Murni', type: 'ladder' },
      { id: 'L5', from: 45, to: 67, name: 'Tangga Cakrawala Abadi', type: 'ladder' },
      { id: 'L6', from: 54, to: 75, name: 'Jalur Singularity', type: 'ladder' },
      { id: 'L7', from: 63, to: 85, name: 'Tangga Galaksi Emas', type: 'ladder' },
      { id: 'L8', from: 72, to: 92, name: 'Gerbang Multisemesta', type: 'ladder' },
      { id: 'L9', from: 81, to: 98, name: 'Puncak Infinity Nexus', type: 'ladder' },
    ],
    snakes: [
      { id: 'S1', from: 26, to: 4, name: 'Ular Retakan Ruang', type: 'snake' },
      { id: 'S2', from: 43, to: 18, name: 'Viper Paradoks Waktu', type: 'snake' },
      { id: 'S3', from: 56, to: 32, name: 'Wyrm Gravitasi Ungu', type: 'snake' },
      { id: 'S4', from: 68, to: 41, name: 'Naga Horizon Aether', type: 'snake' },
      { id: 'S5', from: 79, to: 51, name: 'Serpent Dimensi Nol', type: 'snake' },
      { id: 'S6', from: 87, to: 60, name: 'Naga Prismatik Agung', type: 'snake' },
      { id: 'S7', from: 94, to: 69, name: 'Wyrm Kosmos Abadi', type: 'snake' },
      { id: 'S8', from: 99, to: 49, name: 'Chronos Penguasa Infinity', type: 'snake' },
    ],
    boardSettings: {
      shape: 'citadel_terrace',
      sizeScale: 1.1,
      material: 'glossy',
      primaryColor: '#120829',
      secondaryColor: '#fbbf24',
    },
    tileConfig: {
      shape: 'crystal_facet',
      primaryColor: '#1d1042',
      alternateColor: '#311a6e',
      textureStyle: 'nebula_crystal',
      material: 'glossy',
      numeralStyle: 'cinzel_royal',
      visualEffect: 'edge_pulse',
    },
    snakeConfig: {
      primaryColor: '#9333ea',
      stripeColor: '#fde047',
      bellyColor: '#e0f2fe',
      hornColor: '#38bdf8',
      headModel: 'oriental_dragon',
      scalePattern: 'frost_shard',
      sizeScale: 1.16,
      materialFinish: 'crystalline',
    },
    ladderConfig: {
      materialStyle: 'astral_prism',
      primaryColor: '#fde047',
      accentColor: '#a855f7',
      modelStyle: 'crystal_spire',
      widthScale: 1.1,
    },
    environmentConfig: {
      skyPreset: 'cosmic_nebula_sky',
      showTrees: false,
      showRocks: true,
      showCastle: true,
      showWaterfall: true,
      decorations: 'nebula_rings',
      fogIntensity: 0.25,
      lightingPreset: 'nebula_aurora',
    },
    visualEffects: {
      glowIntensity: 1.0,
      particleDensity: 1.0,
      particleStyle: 'cosmic_stardust',
      ambientIntensity: 1.12,
      shadowsEnabled: true,
    },
  },
];

export function cloneBoardConfig(config: BoardConfig): BoardConfig {
  const themeDefault =
    DEFAULT_BOARD_CONFIGS.find((b) => b.themeId === config.themeId) ?? DEFAULT_BOARD_CONFIGS[0];
  const sourceLadders = Array.isArray(config.ladders)
    ? config.ladders
    : (themeDefault.ladders ?? LADDERS);
  const sourceSnakes = Array.isArray(config.snakes)
    ? config.snakes
    : (themeDefault.snakes ?? SNAKES);

  const seenSnakeFrom = new Set<number>();
  const normalizedSnakes = sourceSnakes
    .map((s, idx) => ({
      ...s,
      id: s.id || `S${idx + 1}`,
      from: Math.round(Number(s.from)),
      to: Math.round(Number(s.to)),
      type: 'snake' as const,
    }))
    .filter((s) => {
      if (
        !Number.isFinite(s.from) ||
        !Number.isFinite(s.to) ||
        s.from <= 1 ||
        s.from >= 100 ||
        s.to < 1 ||
        s.to >= s.from ||
        seenSnakeFrom.has(s.from)
      ) {
        return false;
      }
      seenSnakeFrom.add(s.from);
      return true;
    });

  const seenLadderFrom = new Set<number>();
  const normalizedLadders = sourceLadders
    .map((l, idx) => ({
      ...l,
      id: l.id || `L${idx + 1}`,
      from: Math.round(Number(l.from)),
      to: Math.round(Number(l.to)),
      type: 'ladder' as const,
    }))
    .filter((l) => {
      if (
        !Number.isFinite(l.from) ||
        !Number.isFinite(l.to) ||
        l.from <= 1 ||
        l.from >= 100 ||
        l.to <= l.from ||
        l.to > 100 ||
        seenSnakeFrom.has(l.from) ||
        seenLadderFrom.has(l.from)
      ) {
        return false;
      }
      seenLadderFrom.add(l.from);
      return true;
    });

  return {
    ...config,
    previewSwatches: [...(config.previewSwatches || themeDefault.previewSwatches)] as [
      string,
      string,
      string,
    ],
    ladders: normalizedLadders,
    snakes: normalizedSnakes,
    boardSettings: { ...themeDefault.boardSettings, ...config.boardSettings },
    tileConfig: { ...themeDefault.tileConfig, ...config.tileConfig },
    snakeConfig: { ...themeDefault.snakeConfig, ...config.snakeConfig },
    ladderConfig: { ...themeDefault.ladderConfig, ...config.ladderConfig },
    environmentConfig: { ...themeDefault.environmentConfig, ...config.environmentConfig },
    visualEffects: { ...themeDefault.visualEffects, ...config.visualEffects },
  };
}

export function getDefaultBoardByTheme(themeId: BoardThemeId): BoardConfig {
  const found =
    DEFAULT_BOARD_CONFIGS.find((b) => b.themeId === themeId) ?? DEFAULT_BOARD_CONFIGS[0];
  return cloneBoardConfig(found);
}

/**
 * Generates a balanced, non-overlapping random layout of Ladders and Snakes for custom boards.
 */
export function generateRandomJumpsForTheme(
  themeId: BoardThemeId,
  ladderCount = 12,
  snakeCount = 12,
): { ladders: SnakeOrLadder[]; snakes: SnakeOrLadder[] } {
  const themeBoard = getDefaultBoardByTheme(themeId);
  const usedTiles = new Set<number>([1, 100]);
  for (const specTile of SPECIAL_TILE_MAP.keys()) {
    usedTiles.add(specTile);
  }

  const pickFreeTile = (min: number, max: number): number | null => {
    const lo = Math.max(2, Math.min(99, min));
    const hi = Math.max(lo, Math.min(99, max));
    for (let attempt = 0; attempt < 90; attempt++) {
      const candidate = Math.floor(lo + Math.random() * (hi - lo + 1));
      if (!usedTiles.has(candidate)) {
        usedTiles.add(candidate);
        return candidate;
      }
    }
    for (let t = lo; t <= hi; t++) {
      if (!usedTiles.has(t)) {
        usedTiles.add(t);
        return t;
      }
    }
    for (let t = 2; t <= 99; t++) {
      if (!usedTiles.has(t)) {
        usedTiles.add(t);
        return t;
      }
    }
    return null;
  };

  const ladders: SnakeOrLadder[] = [];
  const ladderStep = Math.max(4, Math.floor(78 / Math.max(1, ladderCount)));
  for (let i = 0; i < ladderCount; i++) {
    const bandMin = Math.max(2, Math.min(82, 3 + i * ladderStep));
    const bandMax = Math.min(86, bandMin + Math.max(6, ladderStep));
    const from = pickFreeTile(bandMin, bandMax);
    if (from === null) break;
    const minTo = Math.min(98, from + 10);
    const maxTo = Math.min(98, from + 28);
    const to = pickFreeTile(minTo, Math.max(minTo, maxTo));
    if (to === null || to <= from) continue;
    const templateName =
      themeBoard.ladders[i % themeBoard.ladders.length]?.name || `Tangga Suci #${i + 1}`;
    ladders.push({
      id: `L${ladders.length + 1}`,
      from,
      to,
      name: templateName,
      type: 'ladder',
    });
  }

  const snakes: SnakeOrLadder[] = [];
  const snakeStep = Math.max(4, Math.floor(74 / Math.max(1, snakeCount)));
  for (let i = 0; i < snakeCount; i++) {
    const bandMin = Math.max(20, Math.min(95, 22 + i * snakeStep));
    const bandMax = Math.min(99, bandMin + Math.max(5, snakeStep));
    const from = pickFreeTile(bandMin, bandMax);
    if (from === null) break;
    const minTo = Math.max(2, from - 32);
    const maxTo = Math.max(3, from - 10);
    const to = pickFreeTile(minTo, Math.max(minTo, maxTo));
    if (to === null || to >= from) continue;
    const templateName =
      themeBoard.snakes[i % themeBoard.snakes.length]?.name || `Ular Penjaga #${i + 1}`;
    snakes.push({
      id: `S${snakes.length + 1}`,
      from,
      to,
      name: templateName,
      type: 'snake',
    });
  }

  ladders.sort((a, b) => a.from - b.from);
  snakes.sort((a, b) => a.from - b.from);
  ladders.forEach((l, idx) => {
    l.id = `L${idx + 1}`;
  });
  snakes.forEach((s, idx) => {
    s.id = `S${idx + 1}`;
  });

  return { ladders, snakes };
}

/**
 * Non-repeating random board selector: guarantees a different board than lastBoardId
 * whenever more than 1 candidate board is available.
 */
export function pickRandomBoardConfig(
  candidates: BoardConfig[],
  lastBoardId: string | null,
): BoardConfig {
  const pool = candidates.length > 0 ? candidates : DEFAULT_BOARD_CONFIGS;
  if (pool.length === 1) {
    return cloneBoardConfig(pool[0]);
  }
  const filtered = lastBoardId ? pool.filter((b) => b.id !== lastBoardId) : pool;
  const effectivePool = filtered.length > 0 ? filtered : pool;
  const idx = Math.floor(Math.random() * effectivePool.length);
  return cloneBoardConfig(effectivePool[idx]);
}
