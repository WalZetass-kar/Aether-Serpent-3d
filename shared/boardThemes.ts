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
  | 'cosmic_nebula';

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
    tagline: 'Buka instan seluruh 5 papan Premium + 1.000 Koin Aether',
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
      { id: 'L2', from: 7, to: 26, name: 'Tangga Terak Magma', type: 'ladder' },
      { id: 'L3', from: 15, to: 38, name: 'Tangga Batu Basal', type: 'ladder' },
      { id: 'L4', from: 20, to: 41, name: 'Jalur Pijar Lava', type: 'ladder' },
      { id: 'L5', from: 29, to: 52, name: 'Tangga Bara Tempaan', type: 'ladder' },
      { id: 'L6', from: 35, to: 56, name: 'Tangga Tungku Naga', type: 'ladder' },
      { id: 'L7', from: 44, to: 67, name: 'Jembatan Kawah Naga', type: 'ladder' },
      { id: 'L8', from: 53, to: 72, name: 'Tangga Menara Abu', type: 'ladder' },
      { id: 'L9', from: 57, to: 79, name: 'Tangga Obsidian Api', type: 'ladder' },
      { id: 'L10', from: 68, to: 87, name: 'Tangga Puncak Kaldera', type: 'ladder' },
      { id: 'L11', from: 74, to: 91, name: 'Tangga Gerbang Ignis', type: 'ladder' },
      { id: 'L12', from: 80, to: 98, name: 'Tangga Takhta Magma', type: 'ladder' },
    ],
    snakes: [
      { id: 'S1', from: 25, to: 6, name: 'Viper Abu Vulkanik', type: 'snake' },
      { id: 'S2', from: 39, to: 14, name: 'Ular Lahar Membara', type: 'snake' },
      { id: 'S3', from: 51, to: 24, name: 'Drake Sisik Bara', type: 'snake' },
      { id: 'S4', from: 64, to: 36, name: 'Ular Magma Hitam', type: 'snake' },
      { id: 'S5', from: 75, to: 48, name: 'Wyrm Kawah Merah', type: 'snake' },
      { id: 'S6', from: 92, to: 61, name: 'Viper Api Kaldera', type: 'snake' },
      { id: 'S7', from: 93, to: 69, name: 'Ular Belerang Pijar', type: 'snake' },
      { id: 'S8', from: 94, to: 70, name: 'Serpent Obsidian Bara', type: 'snake' },
      { id: 'S9', from: 95, to: 73, name: 'Naga Erupsi Merah', type: 'snake' },
      { id: 'S10', from: 96, to: 77, name: 'Wyrm Api Abadi', type: 'snake' },
      { id: 'S11', from: 97, to: 78, name: 'Naga Penjaga Kawah', type: 'snake' },
      { id: 'S12', from: 99, to: 2, name: 'Raja Naga Ignis Kaldera', type: 'snake' },
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
      { id: 'L1', from: 3, to: 22, name: 'Tangga Es Kristal', type: 'ladder' },
      { id: 'L2', from: 7, to: 26, name: 'Jembatan Salju Abadi', type: 'ladder' },
      { id: 'L3', from: 15, to: 38, name: 'Tangga Pilar Glasier', type: 'ladder' },
      { id: 'L4', from: 20, to: 41, name: 'Tangga Embun Utara', type: 'ladder' },
      { id: 'L5', from: 29, to: 52, name: 'Tangga Cahaya Aurora', type: 'ladder' },
      { id: 'L6', from: 35, to: 56, name: 'Jalur Kristal Biru', type: 'ladder' },
      { id: 'L7', from: 44, to: 67, name: 'Tangga Menara Beku', type: 'ladder' },
      { id: 'L8', from: 53, to: 72, name: 'Tangga Tebing Tundra', type: 'ladder' },
      { id: 'L9', from: 57, to: 79, name: 'Tangga Bintang Utara', type: 'ladder' },
      { id: 'L10', from: 68, to: 87, name: 'Tangga Benteng Borealis', type: 'ladder' },
      { id: 'L11', from: 74, to: 91, name: 'Tangga Puncak Salju', type: 'ladder' },
      { id: 'L12', from: 80, to: 98, name: 'Tangga Singgasana Es', type: 'ladder' },
    ],
    snakes: [
      { id: 'S1', from: 25, to: 6, name: 'Ular Embun Beku', type: 'snake' },
      { id: 'S2', from: 39, to: 14, name: 'Kobra Kristal Biru', type: 'snake' },
      { id: 'S3', from: 51, to: 24, name: 'Ular Badai Salju', type: 'snake' },
      { id: 'S4', from: 64, to: 36, name: 'Serpent Glasier', type: 'snake' },
      { id: 'S5', from: 75, to: 48, name: 'Wyrm Kutub Utara', type: 'snake' },
      { id: 'S6', from: 92, to: 61, name: 'Viper Serpihan Es', type: 'snake' },
      { id: 'S7', from: 93, to: 69, name: 'Ular Angin Arktik', type: 'snake' },
      { id: 'S8', from: 94, to: 70, name: 'Serpent Kabut Beku', type: 'snake' },
      { id: 'S9', from: 95, to: 73, name: 'Naga Es Borealis', type: 'snake' },
      { id: 'S10', from: 96, to: 77, name: 'Wyrm Puncak Glasier', type: 'snake' },
      { id: 'S11', from: 97, to: 78, name: 'Naga Penjaga Kutub', type: 'snake' },
      { id: 'S12', from: 99, to: 2, name: 'Leviathan Salju Abadi', type: 'snake' },
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
      { id: 'L1', from: 4, to: 25, name: 'Tangga Batu Pasir', type: 'ladder' },
      { id: 'L2', from: 6, to: 18, name: 'Tangga Bukit Emas', type: 'ladder' },
      { id: 'L3', from: 13, to: 46, name: 'Tangga Oasis Emas', type: 'ladder' },
      { id: 'L4', from: 19, to: 38, name: 'Jalur Palem Senja', type: 'ladder' },
      { id: 'L5', from: 28, to: 52, name: 'Tangga Pilar Obelisk', type: 'ladder' },
      { id: 'L6', from: 33, to: 49, name: 'Tangga Hieroglif Surya', type: 'ladder' },
      { id: 'L7', from: 42, to: 63, name: 'Tangga Makam Raja', type: 'ladder' },
      { id: 'L8', from: 50, to: 69, name: 'Tangga Kuil Sphinx', type: 'ladder' },
      { id: 'L9', from: 59, to: 79, name: 'Tangga Gerbang Firaun', type: 'ladder' },
      { id: 'L10', from: 62, to: 81, name: 'Tangga Puncak Piramida', type: 'ladder' },
      { id: 'L11', from: 74, to: 91, name: 'Tangga Cahaya Ra', type: 'ladder' },
      { id: 'L12', from: 80, to: 98, name: 'Tangga Mahkota Firaun', type: 'ladder' },
    ],
    snakes: [
      { id: 'S1', from: 27, to: 5, name: 'Viper Bukit Pasir', type: 'snake' },
      { id: 'S2', from: 40, to: 3, name: 'Kobra Emas Gurun', type: 'snake' },
      { id: 'S3', from: 44, to: 17, name: 'Ular Badai Debu', type: 'snake' },
      { id: 'S4', from: 54, to: 31, name: 'Kobra Penjaga Makam', type: 'snake' },
      { id: 'S5', from: 66, to: 45, name: 'Ular Kalajengking Surya', type: 'snake' },
      { id: 'S6', from: 92, to: 73, name: 'Viper Fatamorgana', type: 'snake' },
      { id: 'S7', from: 93, to: 68, name: 'Kobra Pasir Membara', type: 'snake' },
      { id: 'S8', from: 94, to: 75, name: 'Serpent Kuil Kuno', type: 'snake' },
      { id: 'S9', from: 95, to: 64, name: 'Naga Badai Sahara', type: 'snake' },
      { id: 'S10', from: 96, to: 77, name: 'Wyrm Piramida Emas', type: 'snake' },
      { id: 'S11', from: 97, to: 78, name: 'Kobra Agung Senja', type: 'snake' },
      { id: 'S12', from: 99, to: 2, name: 'Apophis Sang Penelan Senja', type: 'snake' },
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
      { id: 'L1', from: 5, to: 24, name: 'Tangga Karang Mutiara', type: 'ladder' },
      { id: 'L2', from: 8, to: 30, name: 'Jembatan Arus Laut', type: 'ladder' },
      { id: 'L3', from: 17, to: 40, name: 'Tangga Pilar Poseidon', type: 'ladder' },
      { id: 'L4', from: 19, to: 43, name: 'Tangga Terumbu Sian', type: 'ladder' },
      { id: 'L5', from: 28, to: 51, name: 'Tangga Bioluminesensi', type: 'ladder' },
      { id: 'L6', from: 32, to: 56, name: 'Jalur Gelembung Suci', type: 'ladder' },
      { id: 'L7', from: 45, to: 66, name: 'Tangga Kuil Samudra', type: 'ladder' },
      { id: 'L8', from: 54, to: 74, name: 'Tangga Gerbang Tirta', type: 'ladder' },
      { id: 'L9', from: 59, to: 82, name: 'Tangga Trisula Biru', type: 'ladder' },
      { id: 'L10', from: 64, to: 85, name: 'Tangga Menara Karang', type: 'ladder' },
      { id: 'L11', from: 70, to: 91, name: 'Tangga Istana Mutiara', type: 'ladder' },
      { id: 'L12', from: 80, to: 98, name: 'Tangga Mahkota Atlantis', type: 'ladder' },
    ],
    snakes: [
      { id: 'S1', from: 26, to: 4, name: 'Belut Listrik Karang', type: 'snake' },
      { id: 'S2', from: 42, to: 18, name: 'Ular Laut Sian', type: 'snake' },
      { id: 'S3', from: 50, to: 25, name: 'Hydra Palung Biru', type: 'snake' },
      { id: 'S4', from: 62, to: 39, name: 'Wyrm Arus Deras', type: 'snake' },
      { id: 'S5', from: 73, to: 49, name: 'Serpent Pusaran Air', type: 'snake' },
      { id: 'S6', from: 92, to: 63, name: 'Ular Karang Abyssal', type: 'snake' },
      { id: 'S7', from: 93, to: 67, name: 'Belut Petir Samudra', type: 'snake' },
      { id: 'S8', from: 94, to: 68, name: 'Serpent Ombak Gelap', type: 'snake' },
      { id: 'S9', from: 95, to: 72, name: 'Hydra Istana Tenggelam', type: 'snake' },
      { id: 'S10', from: 96, to: 75, name: 'Naga Samudra Dalam', type: 'snake' },
      { id: 'S11', from: 97, to: 78, name: 'Wyrm Penjaga Trisula', type: 'snake' },
      { id: 'S12', from: 99, to: 2, name: 'Leviathan Raja Atlantis', type: 'snake' },
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
      { id: 'L1', from: 3, to: 22, name: 'Rantai Bayangan Ungu', type: 'ladder' },
      { id: 'L2', from: 7, to: 26, name: 'Tangga Monolit Rune', type: 'ladder' },
      { id: 'L3', from: 15, to: 38, name: 'Jembatan Kabut Astral', type: 'ladder' },
      { id: 'L4', from: 20, to: 41, name: 'Tangga Pilar Malam', type: 'ladder' },
      { id: 'L5', from: 29, to: 52, name: 'Tangga Benteng Malam', type: 'ladder' },
      { id: 'L6', from: 35, to: 56, name: 'Jalur Sihir Gerhana', type: 'ladder' },
      { id: 'L7', from: 44, to: 67, name: 'Tangga Kristal Void', type: 'ladder' },
      { id: 'L8', from: 53, to: 72, name: 'Tangga Menara Kelam', type: 'ladder' },
      { id: 'L9', from: 57, to: 79, name: 'Tangga Gerbang Gerhana', type: 'ladder' },
      { id: 'L10', from: 68, to: 87, name: 'Tangga Kastil Obsidian', type: 'ladder' },
      { id: 'L11', from: 74, to: 91, name: 'Tangga Puncak Dimensi', type: 'ladder' },
      { id: 'L12', from: 80, to: 98, name: 'Tangga Singgasana Bayangan', type: 'ladder' },
    ],
    snakes: [
      { id: 'S1', from: 25, to: 6, name: 'Ular Asap Hitam', type: 'snake' },
      { id: 'S2', from: 39, to: 14, name: 'Viper Rune Ungu', type: 'snake' },
      { id: 'S3', from: 51, to: 24, name: 'Ular Pemangsa Mimpi', type: 'snake' },
      { id: 'S4', from: 64, to: 36, name: 'Wyrm Lembah Kelam', type: 'snake' },
      { id: 'S5', from: 75, to: 48, name: 'Serpent Kabut Malam', type: 'snake' },
      { id: 'S6', from: 92, to: 61, name: 'Viper Bayangan Void', type: 'snake' },
      { id: 'S7', from: 93, to: 69, name: 'Ular Monolit Gelap', type: 'snake' },
      { id: 'S8', from: 94, to: 70, name: 'Serpent Celah Dimensi', type: 'snake' },
      { id: 'S9', from: 95, to: 73, name: 'Naga Gerhana Abadi', type: 'snake' },
      { id: 'S10', from: 96, to: 77, name: 'Wyrm Mahkota Kelam', type: 'snake' },
      { id: 'S11', from: 97, to: 78, name: 'Naga Penjaga Kastil', type: 'snake' },
      { id: 'S12', from: 99, to: 2, name: 'Penguasa Void Obsidian', type: 'snake' },
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
      { id: 'L1', from: 5, to: 24, name: 'Tangga Awan Perak', type: 'ladder' },
      { id: 'L2', from: 8, to: 30, name: 'Jembatan Bintang Fajar', type: 'ladder' },
      { id: 'L3', from: 17, to: 40, name: 'Tangga Sayap Seraphim', type: 'ladder' },
      { id: 'L4', from: 19, to: 43, name: 'Tangga Pelangi Aether', type: 'ladder' },
      { id: 'L5', from: 28, to: 51, name: 'Tangga Pilar Konstelasi', type: 'ladder' },
      { id: 'L6', from: 32, to: 56, name: 'Jalur Awan Keemasan', type: 'ladder' },
      { id: 'L7', from: 45, to: 66, name: 'Tangga Cahaya Surya', type: 'ladder' },
      { id: 'L8', from: 54, to: 74, name: 'Tangga Pulau Melayang', type: 'ladder' },
      { id: 'L9', from: 59, to: 82, name: 'Tangga Gerbang Kosmik', type: 'ladder' },
      { id: 'L10', from: 64, to: 85, name: 'Tangga Menara Astral', type: 'ladder' },
      { id: 'L11', from: 70, to: 91, name: 'Tangga Kubah Cakrawala', type: 'ladder' },
      { id: 'L12', from: 80, to: 98, name: 'Tangga Takhta Langit', type: 'ladder' },
    ],
    snakes: [
      { id: 'S1', from: 26, to: 4, name: 'Ular Angin Stratosfer', type: 'snake' },
      { id: 'S2', from: 42, to: 18, name: 'Naga Awan Badai', type: 'snake' },
      { id: 'S3', from: 50, to: 25, name: 'Serpent Komet Biru', type: 'snake' },
      { id: 'S4', from: 62, to: 39, name: 'Naga Petir Langit', type: 'snake' },
      { id: 'S5', from: 73, to: 49, name: 'Wyrm Bintang Jatuh', type: 'snake' },
      { id: 'S6', from: 92, to: 63, name: 'Viper Awan Perak', type: 'snake' },
      { id: 'S7', from: 93, to: 67, name: 'Ular Kilat Fajar', type: 'snake' },
      { id: 'S8', from: 94, to: 68, name: 'Serpent Nebula Emas', type: 'snake' },
      { id: 'S9', from: 95, to: 72, name: 'Naga Astral Penjaga', type: 'snake' },
      { id: 'S10', from: 96, to: 75, name: 'Wyrm Puncak Surgawi', type: 'snake' },
      { id: 'S11', from: 97, to: 78, name: 'Naga Penjaga Awan', type: 'snake' },
      { id: 'S12', from: 99, to: 2, name: 'Sovereign Naga Cakrawala', type: 'snake' },
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
      { id: 'L1', from: 4, to: 25, name: 'Tangga Altar Perunggu', type: 'ladder' },
      { id: 'L2', from: 6, to: 18, name: 'Tangga Prasasti Kuno', type: 'ladder' },
      { id: 'L3', from: 13, to: 46, name: 'Tangga Pilar Leluhur', type: 'ladder' },
      { id: 'L4', from: 19, to: 38, name: 'Jalur Obor Sanctum', type: 'ladder' },
      { id: 'L5', from: 28, to: 52, name: 'Tangga Relik Suci', type: 'ladder' },
      { id: 'L6', from: 33, to: 49, name: 'Tangga Teras Giok', type: 'ladder' },
      { id: 'L7', from: 42, to: 63, name: 'Tangga Menara Lonceng', type: 'ladder' },
      { id: 'L8', from: 50, to: 69, name: 'Tangga Ruang Harta', type: 'ladder' },
      { id: 'L9', from: 59, to: 79, name: 'Tangga Gerbang Kekaisaran', type: 'ladder' },
      { id: 'L10', from: 62, to: 81, name: 'Tangga Kubah Emas', type: 'ladder' },
      { id: 'L11', from: 74, to: 91, name: 'Tangga Altar Puncak', type: 'ladder' },
      { id: 'L12', from: 80, to: 98, name: 'Tangga Singgasana Kuil', type: 'ladder' },
    ],
    snakes: [
      { id: 'S1', from: 27, to: 5, name: 'Ular Penjaga Relik', type: 'snake' },
      { id: 'S2', from: 40, to: 3, name: 'Viper Batu Giok', type: 'snake' },
      { id: 'S3', from: 44, to: 17, name: 'Ular Kutukan Kuil', type: 'snake' },
      { id: 'S4', from: 54, to: 31, name: 'Naga Perunggu Kuno', type: 'snake' },
      { id: 'S5', from: 66, to: 45, name: 'Serpent Lorong Rahasia', type: 'snake' },
      { id: 'S6', from: 92, to: 73, name: 'Viper Altar Emas', type: 'snake' },
      { id: 'S7', from: 93, to: 68, name: 'Ular Pilar Suci', type: 'snake' },
      { id: 'S8', from: 94, to: 75, name: 'Serpent Ukiran Kuno', type: 'snake' },
      { id: 'S9', from: 95, to: 64, name: 'Naga Giok Pelindung', type: 'snake' },
      { id: 'S10', from: 96, to: 77, name: 'Wyrm Mahkota Kuil', type: 'snake' },
      { id: 'S11', from: 97, to: 78, name: 'Naga Penjaga Sanctum', type: 'snake' },
      { id: 'S12', from: 99, to: 2, name: 'Dewa Naga Kuil Emas', type: 'snake' },
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
      { id: 'L1', from: 5, to: 24, name: 'Jembatan Torii Timur', type: 'ladder' },
      { id: 'L2', from: 8, to: 30, name: 'Tangga Kelopak Hanami', type: 'ladder' },
      { id: 'L3', from: 17, to: 40, name: 'Jalur Lentera Shogun', type: 'ladder' },
      { id: 'L4', from: 19, to: 43, name: 'Tangga Taman Koi', type: 'ladder' },
      { id: 'L5', from: 28, to: 51, name: 'Tangga Pagoda Crimson', type: 'ladder' },
      { id: 'L6', from: 32, to: 56, name: 'Jembatan Bambu Senja', type: 'ladder' },
      { id: 'L7', from: 45, to: 66, name: 'Gerbang Angin Sakura', type: 'ladder' },
      { id: 'L8', from: 54, to: 74, name: 'Tangga Kastil Samurai', type: 'ladder' },
      { id: 'L9', from: 59, to: 82, name: 'Tangga Kaisar Fajar', type: 'ladder' },
      { id: 'L10', from: 64, to: 85, name: 'Tangga Menara Kipas', type: 'ladder' },
      { id: 'L11', from: 70, to: 91, name: 'Tangga Gerbang Vermilion', type: 'ladder' },
      { id: 'L12', from: 80, to: 98, name: 'Puncak Kuil Bunga', type: 'ladder' },
    ],
    snakes: [
      { id: 'S1', from: 26, to: 4, name: 'Ryu Merah Muda', type: 'snake' },
      { id: 'S2', from: 42, to: 18, name: 'Ular Kipas Kabuki', type: 'snake' },
      { id: 'S3', from: 50, to: 25, name: 'Naga Awan Senja', type: 'snake' },
      { id: 'S4', from: 62, to: 39, name: 'Penjaga Sungai Koi', type: 'snake' },
      { id: 'S5', from: 73, to: 49, name: 'Ular Pedang Ronin', type: 'snake' },
      { id: 'S6', from: 92, to: 63, name: 'Viper Kelopak Crimson', type: 'snake' },
      { id: 'S7', from: 93, to: 67, name: 'Ular Torii Malam', type: 'snake' },
      { id: 'S8', from: 94, to: 68, name: 'Ryu Gerhana Sakura', type: 'snake' },
      { id: 'S9', from: 95, to: 72, name: 'Naga Lentera Merah', type: 'snake' },
      { id: 'S10', from: 96, to: 75, name: 'Wyrm Pagoda Emas', type: 'snake' },
      { id: 'S11', from: 97, to: 78, name: 'Ryu Penjaga Istana', type: 'snake' },
      { id: 'S12', from: 99, to: 2, name: 'Shogun Ryu Abadi', type: 'snake' },
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
      { id: 'L1', from: 3, to: 22, name: 'Lift Piston Kronos', type: 'ladder' },
      { id: 'L2', from: 7, to: 26, name: 'Tangga Roda Gigi', type: 'ladder' },
      { id: 'L3', from: 15, to: 38, name: 'Rel Uap Kuningan', type: 'ladder' },
      { id: 'L4', from: 20, to: 41, name: 'Tangga Katup Aether', type: 'ladder' },
      { id: 'L5', from: 29, to: 52, name: 'Jembatan Pendulum', type: 'ladder' },
      { id: 'L6', from: 35, to: 56, name: 'Jalur Turbin Emas', type: 'ladder' },
      { id: 'L7', from: 44, to: 67, name: 'Menara Dinamo Aether', type: 'ladder' },
      { id: 'L8', from: 53, to: 72, name: 'Tangga Astrolab Uap', type: 'ladder' },
      { id: 'L9', from: 57, to: 79, name: 'Tangga Kompas Emas', type: 'ladder' },
      { id: 'L10', from: 68, to: 87, name: 'Tangga Menara Lonceng', type: 'ladder' },
      { id: 'L11', from: 74, to: 91, name: 'Tangga Kronometer Agung', type: 'ladder' },
      { id: 'L12', from: 80, to: 98, name: 'Poros Waktu Agung', type: 'ladder' },
    ],
    snakes: [
      { id: 'S1', from: 25, to: 6, name: 'Kobra Tembaga', type: 'snake' },
      { id: 'S2', from: 39, to: 14, name: 'Ular Pegas Baja', type: 'snake' },
      { id: 'S3', from: 51, to: 24, name: 'Viper Voltase', type: 'snake' },
      { id: 'S4', from: 64, to: 36, name: 'Naga Mesin Uap', type: 'snake' },
      { id: 'S5', from: 75, to: 48, name: 'Automaton Wyrm', type: 'snake' },
      { id: 'S6', from: 92, to: 61, name: 'Viper Roda Gigi', type: 'snake' },
      { id: 'S7', from: 93, to: 69, name: 'Ular Kronometer', type: 'snake' },
      { id: 'S8', from: 94, to: 70, name: 'Serpent Pegas Emas', type: 'snake' },
      { id: 'S9', from: 95, to: 73, name: 'Naga Dinamo Aether', type: 'snake' },
      { id: 'S10', from: 96, to: 77, name: 'Wyrm Kuningan Tempa', type: 'snake' },
      { id: 'S11', from: 97, to: 78, name: 'Automaton Penjaga Puncak', type: 'snake' },
      { id: 'S12', from: 99, to: 2, name: 'Leviathan Kronos Abadi', type: 'snake' },
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
      { id: 'L1', from: 4, to: 25, name: 'Tangga Gerbang Giok', type: 'ladder' },
      { id: 'L2', from: 6, to: 18, name: 'Tangga Kolam Teratai', type: 'ladder' },
      { id: 'L3', from: 13, to: 46, name: 'Jembatan Kabut Awan', type: 'ladder' },
      { id: 'L4', from: 19, to: 38, name: 'Tangga Bambu Suci', type: 'ladder' },
      { id: 'L5', from: 28, to: 52, name: 'Tangga Pagoda Langit', type: 'ladder' },
      { id: 'L6', from: 33, to: 49, name: 'Jalur Lentera Kaisar', type: 'ladder' },
      { id: 'L7', from: 42, to: 63, name: 'Tangga Teratai Emas', type: 'ladder' },
      { id: 'L8', from: 50, to: 69, name: 'Tangga Balai Zamrud', type: 'ladder' },
      { id: 'L9', from: 59, to: 79, name: 'Pilar Naga Timur', type: 'ladder' },
      { id: 'L10', from: 62, to: 81, name: 'Tangga Awan Kahyangan', type: 'ladder' },
      { id: 'L11', from: 74, to: 91, name: 'Tangga Gerbang Kekaisaran', type: 'ladder' },
      { id: 'L12', from: 80, to: 98, name: 'Takhta Giok Abadi', type: 'ladder' },
    ],
    snakes: [
      { id: 'S1', from: 27, to: 5, name: 'Naga Embun Giok', type: 'snake' },
      { id: 'S2', from: 40, to: 3, name: 'Ular Bambu Suci', type: 'snake' },
      { id: 'S3', from: 44, to: 17, name: 'Ryu Kabut Lembah', type: 'snake' },
      { id: 'S4', from: 54, to: 31, name: 'Penjaga Kolam Teratai', type: 'snake' },
      { id: 'S5', from: 66, to: 45, name: 'Naga Awan Zamrud', type: 'snake' },
      { id: 'S6', from: 92, to: 73, name: 'Viper Pagoda Giok', type: 'snake' },
      { id: 'S7', from: 93, to: 68, name: 'Ular Lentera Emas', type: 'snake' },
      { id: 'S8', from: 94, to: 75, name: 'Serpent Kabut Timur', type: 'snake' },
      { id: 'S9', from: 95, to: 64, name: 'Kaisar Ular Emas', type: 'snake' },
      { id: 'S10', from: 96, to: 77, name: 'Wyrm Istana Giok', type: 'snake' },
      { id: 'S11', from: 97, to: 78, name: 'Naga Penjaga Kahyangan', type: 'snake' },
      { id: 'S12', from: 99, to: 2, name: 'Shenlong Langit Giok', type: 'snake' },
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
      { id: 'L1', from: 5, to: 24, name: 'Gerbang Warp Orion', type: 'ladder' },
      { id: 'L2', from: 8, to: 30, name: 'Jembatan Cahaya Pulsar', type: 'ladder' },
      { id: 'L3', from: 17, to: 40, name: 'Tangga Konstelasi Lyra', type: 'ladder' },
      { id: 'L4', from: 19, to: 43, name: 'Jalur Komet Biru', type: 'ladder' },
      { id: 'L5', from: 28, to: 51, name: 'Cincin Orbit Saturnus', type: 'ladder' },
      { id: 'L6', from: 32, to: 56, name: 'Tangga Nebula Violet', type: 'ladder' },
      { id: 'L7', from: 45, to: 66, name: 'Tangga Supernova', type: 'ladder' },
      { id: 'L8', from: 54, to: 74, name: 'Jalur Bima Sakti', type: 'ladder' },
      { id: 'L9', from: 59, to: 82, name: 'Tangga Cakrawala Quasar', type: 'ladder' },
      { id: 'L10', from: 64, to: 85, name: 'Tangga Observatorium Astral', type: 'ladder' },
      { id: 'L11', from: 70, to: 91, name: 'Gerbang Galaksi Andromeda', type: 'ladder' },
      { id: 'L12', from: 80, to: 98, name: 'Portal Singularitas', type: 'ladder' },
    ],
    snakes: [
      { id: 'S1', from: 26, to: 4, name: 'Komet Ekor Ungu', type: 'snake' },
      { id: 'S2', from: 42, to: 18, name: 'Ular Lubang Hitam', type: 'snake' },
      { id: 'S3', from: 50, to: 25, name: 'Wyrm Sabuk Asteroid', type: 'snake' },
      { id: 'S4', from: 62, to: 39, name: 'Naga Gerhana Nova', type: 'snake' },
      { id: 'S5', from: 73, to: 49, name: 'Serpent Quasar', type: 'snake' },
      { id: 'S6', from: 92, to: 63, name: 'Naga Nebula Andromeda', type: 'snake' },
      { id: 'S7', from: 93, to: 67, name: 'Ular Debu Bintang', type: 'snake' },
      { id: 'S8', from: 94, to: 68, name: 'Serpent Meteorit Ungu', type: 'snake' },
      { id: 'S9', from: 95, to: 72, name: 'Naga Pulsar Kosmik', type: 'snake' },
      { id: 'S10', from: 96, to: 75, name: 'Wyrm Horizon Peristiwa', type: 'snake' },
      { id: 'S11', from: 97, to: 78, name: 'Naga Penjaga Galaksi', type: 'snake' },
      { id: 'S12', from: 99, to: 2, name: 'Aurelion Penguasa Bintang', type: 'snake' },
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
];

export function cloneBoardConfig(config: BoardConfig): BoardConfig {
  const themeDefault =
    DEFAULT_BOARD_CONFIGS.find((b) => b.themeId === config.themeId) ?? DEFAULT_BOARD_CONFIGS[0];
  const sourceLadders =
    Array.isArray(config.ladders) && config.ladders.length > 0
      ? config.ladders
      : themeDefault.ladders ?? LADDERS;
  const sourceSnakes =
    Array.isArray(config.snakes) && config.snakes.length > 0
      ? config.snakes
      : themeDefault.snakes ?? SNAKES;

  return {
    ...config,
    previewSwatches: [...(config.previewSwatches || themeDefault.previewSwatches)] as [
      string,
      string,
      string,
    ],
    ladders: sourceLadders.map((l) => ({ ...l, type: 'ladder' as const })),
    snakes: sourceSnakes.map((s) => ({ ...s, type: 'snake' as const })),
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
