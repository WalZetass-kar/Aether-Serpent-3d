import {
  LADDERS,
  SNAKES,
  SPECIAL_TILE_MAP,
  type SnakeOrLadder,
} from './gameConfig';

export type BoardThemeId =
  | 'enchanted_forest'
  | 'dragon_volcano'
  | 'frozen_kingdom'
  | 'lost_desert'
  | 'atlantis_ocean'
  | 'shadow_realm'
  | 'celestial_sky'
  | 'ancient_temple';

export type BoardSelectionMode = 'manual' | 'random' | 'custom';

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
  | 'temple_gold_inlay';

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
  | 'temple_bronze';

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
  | 'temple_sunset';

export type EnvironmentDecorationStyle =
  | 'runic_obelisks'
  | 'volcano_braziers'
  | 'ice_crystals'
  | 'desert_pyramids'
  | 'atlantis_pillars'
  | 'shadow_monoliths'
  | 'floating_islands'
  | 'temple_columns';

export type LightingPreset =
  | 'emerald_canopy'
  | 'magma_glow'
  | 'arctic_noon'
  | 'desert_sun'
  | 'bioluminescent'
  | 'shadow_moon'
  | 'divine_radiance'
  | 'torchlit_sanctum';

export type MagicalParticleStyle =
  | 'fireflies'
  | 'lava_embers'
  | 'snowflakes'
  | 'sand_sparks'
  | 'sea_bubbles'
  | 'shadow_wisps'
  | 'starlight'
  | 'golden_runes';

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
};

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
      { id: 'L2', from: 13, to: 46, name: 'Tangga Sulur Zamrud', type: 'ladder' },
      { id: 'L3', from: 33, to: 49, name: 'Tangga Runik Hutan', type: 'ladder' },
      { id: 'L4', from: 42, to: 63, name: 'Tangga Kanopi Peri', type: 'ladder' },
      { id: 'L5', from: 50, to: 69, name: 'Tangga Menara Lumut', type: 'ladder' },
      { id: 'L6', from: 62, to: 81, name: 'Tangga Angin Lembah', type: 'ladder' },
      { id: 'L7', from: 74, to: 92, name: 'Tangga Puncak Sylvan', type: 'ladder' },
    ],
    snakes: [
      { id: 'S1', from: 27, to: 5, name: 'Ular Kabut Hijau', type: 'snake' },
      { id: 'S2', from: 40, to: 3, name: 'Ular Akar Berduri', type: 'snake' },
      { id: 'S3', from: 43, to: 18, name: 'Viper Lembah Rimba', type: 'snake' },
      { id: 'S4', from: 54, to: 31, name: 'Ular Rawa Berbisa', type: 'snake' },
      { id: 'S5', from: 66, to: 45, name: 'Ular Racun Zamrud', type: 'snake' },
      { id: 'S6', from: 89, to: 53, name: 'Naga Rimba Kuno', type: 'snake' },
      { id: 'S7', from: 97, to: 78, name: 'Serpent Penjaga Yggdrasil', type: 'snake' },
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
      { id: 'L1', from: 6, to: 28, name: 'Jembatan Rantai Besi', type: 'ladder' },
      { id: 'L2', from: 15, to: 38, name: 'Tangga Batu Basal', type: 'ladder' },
      { id: 'L3', from: 29, to: 52, name: 'Tangga Bara Tempaan', type: 'ladder' },
      { id: 'L4', from: 44, to: 67, name: 'Jembatan Kawah Naga', type: 'ladder' },
      { id: 'L5', from: 57, to: 79, name: 'Tangga Obsidian Api', type: 'ladder' },
      { id: 'L6', from: 68, to: 87, name: 'Tangga Puncak Kaldera', type: 'ladder' },
      { id: 'L7', from: 77, to: 96, name: 'Tangga Takhta Magma', type: 'ladder' },
    ],
    snakes: [
      { id: 'S1', from: 24, to: 7, name: 'Viper Abu Vulkanik', type: 'snake' },
      { id: 'S2', from: 39, to: 14, name: 'Ular Lahar Membara', type: 'snake' },
      { id: 'S3', from: 51, to: 26, name: 'Drake Sisik Bara', type: 'snake' },
      { id: 'S4', from: 64, to: 35, name: 'Ular Magma Hitam', type: 'snake' },
      { id: 'S5', from: 75, to: 48, name: 'Wyrm Kawah Merah', type: 'snake' },
      { id: 'S6', from: 91, to: 60, name: 'Naga Api Ignis', type: 'snake' },
      { id: 'S7', from: 98, to: 73, name: 'Raja Naga Kaldera', type: 'snake' },
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
      { id: 'L2', from: 11, to: 32, name: 'Jembatan Salju Abadi', type: 'ladder' },
      { id: 'L3', from: 26, to: 48, name: 'Tangga Pilar Glasier', type: 'ladder' },
      { id: 'L4', from: 39, to: 61, name: 'Tangga Cahaya Aurora', type: 'ladder' },
      { id: 'L5', from: 53, to: 75, name: 'Tangga Menara Beku', type: 'ladder' },
      { id: 'L6', from: 67, to: 86, name: 'Tangga Bintang Utara', type: 'ladder' },
      { id: 'L7', from: 78, to: 95, name: 'Tangga Singgasana Es', type: 'ladder' },
    ],
    snakes: [
      { id: 'S1', from: 25, to: 6, name: 'Ular Embun Beku', type: 'snake' },
      { id: 'S2', from: 38, to: 17, name: 'Kobra Kristal Biru', type: 'snake' },
      { id: 'S3', from: 49, to: 27, name: 'Ular Badai Salju', type: 'snake' },
      { id: 'S4', from: 63, to: 41, name: 'Serpent Glasier', type: 'snake' },
      { id: 'S5', from: 73, to: 50, name: 'Wyrm Kutub Utara', type: 'snake' },
      { id: 'S6', from: 87, to: 59, name: 'Naga Es Borealis', type: 'snake' },
      { id: 'S7', from: 96, to: 72, name: 'Leviathan Salju Abadi', type: 'snake' },
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
      { id: 'L1', from: 5, to: 27, name: 'Tangga Batu Pasir', type: 'ladder' },
      { id: 'L2', from: 14, to: 36, name: 'Tangga Oasis Emas', type: 'ladder' },
      { id: 'L3', from: 30, to: 53, name: 'Tangga Pilar Obelisk', type: 'ladder' },
      { id: 'L4', from: 41, to: 64, name: 'Tangga Hieroglif Surya', type: 'ladder' },
      { id: 'L5', from: 52, to: 74, name: 'Tangga Makam Raja', type: 'ladder' },
      { id: 'L6', from: 69, to: 89, name: 'Tangga Puncak Piramida', type: 'ladder' },
      { id: 'L7', from: 79, to: 97, name: 'Tangga Mahkota Firaun', type: 'ladder' },
    ],
    snakes: [
      { id: 'S1', from: 28, to: 8, name: 'Viper Bukit Pasir', type: 'snake' },
      { id: 'S2', from: 35, to: 11, name: 'Kobra Emas Gurun', type: 'snake' },
      { id: 'S3', from: 46, to: 20, name: 'Ular Badai Debu', type: 'snake' },
      { id: 'S4', from: 60, to: 38, name: 'Kobra Penjaga Makam', type: 'snake' },
      { id: 'S5', from: 72, to: 49, name: 'Ular Kalajengking Surya', type: 'snake' },
      { id: 'S6', from: 90, to: 61, name: 'Serpent Fatamorgana', type: 'snake' },
      { id: 'S7', from: 99, to: 77, name: 'Apophis Sang Penelan Senja', type: 'snake' },
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
      { id: 'L1', from: 7, to: 29, name: 'Tangga Karang Mutiara', type: 'ladder' },
      { id: 'L2', from: 17, to: 40, name: 'Jembatan Arus Laut', type: 'ladder' },
      { id: 'L3', from: 31, to: 54, name: 'Tangga Pilar Poseidon', type: 'ladder' },
      { id: 'L4', from: 45, to: 66, name: 'Tangga Bioluminesensi', type: 'ladder' },
      { id: 'L5', from: 56, to: 78, name: 'Tangga Kuil Samudra', type: 'ladder' },
      { id: 'L6', from: 64, to: 85, name: 'Tangga Trisula Biru', type: 'ladder' },
      { id: 'L7', from: 75, to: 93, name: 'Tangga Mahkota Atlantis', type: 'ladder' },
    ],
    snakes: [
      { id: 'S1', from: 26, to: 4, name: 'Belut Listrik Karang', type: 'snake' },
      { id: 'S2', from: 42, to: 19, name: 'Ular Laut Sian', type: 'snake' },
      { id: 'S3', from: 50, to: 25, name: 'Hydra Palung Biru', type: 'snake' },
      { id: 'S4', from: 62, to: 39, name: 'Wyrm Arus Deras', type: 'snake' },
      { id: 'S5', from: 74, to: 51, name: 'Serpent Pusaran Air', type: 'snake' },
      { id: 'S6', from: 86, to: 57, name: 'Naga Samudra Dalam', type: 'snake' },
      { id: 'S7', from: 95, to: 70, name: 'Leviathan Penjaga Atlantis', type: 'snake' },
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
      { id: 'L1', from: 2, to: 24, name: 'Rantai Bayangan Ungu', type: 'ladder' },
      { id: 'L2', from: 18, to: 41, name: 'Tangga Monolit Rune', type: 'ladder' },
      { id: 'L3', from: 32, to: 56, name: 'Jembatan Kabut Astral', type: 'ladder' },
      { id: 'L4', from: 43, to: 68, name: 'Tangga Benteng Malam', type: 'ladder' },
      { id: 'L5', from: 51, to: 73, name: 'Tangga Kristal Void', type: 'ladder' },
      { id: 'L6', from: 63, to: 83, name: 'Tangga Gerbang Gerhana', type: 'ladder' },
      { id: 'L7', from: 72, to: 91, name: 'Tangga Singgasana Bayangan', type: 'ladder' },
    ],
    snakes: [
      { id: 'S1', from: 29, to: 10, name: 'Ular Asap Hitam', type: 'snake' },
      { id: 'S2', from: 44, to: 15, name: 'Viper Rune Ungu', type: 'snake' },
      { id: 'S3', from: 53, to: 30, name: 'Ular Pemangsa Mimpi', type: 'snake' },
      { id: 'S4', from: 67, to: 42, name: 'Wyrm Lembah Kelam', type: 'snake' },
      { id: 'S5', from: 79, to: 52, name: 'Serpent Kabut Malam', type: 'snake' },
      { id: 'S6', from: 92, to: 64, name: 'Naga Gerhana Abadi', type: 'snake' },
      { id: 'S7', from: 98, to: 69, name: 'Penguasa Void Obsidian', type: 'snake' },
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
      { id: 'L1', from: 8, to: 30, name: 'Tangga Awan Perak', type: 'ladder' },
      { id: 'L2', from: 19, to: 43, name: 'Jembatan Bintang Fajar', type: 'ladder' },
      { id: 'L3', from: 28, to: 51, name: 'Tangga Sayap Seraphim', type: 'ladder' },
      { id: 'L4', from: 40, to: 62, name: 'Tangga Pilar Konstelasi', type: 'ladder' },
      { id: 'L5', from: 59, to: 80, name: 'Tangga Cahaya Surya', type: 'ladder' },
      { id: 'L6', from: 70, to: 90, name: 'Tangga Gerbang Kosmik', type: 'ladder' },
      { id: 'L7', from: 81, to: 98, name: 'Tangga Takhta Langit', type: 'ladder' },
    ],
    snakes: [
      { id: 'S1', from: 31, to: 13, name: 'Ular Angin Stratosfer', type: 'snake' },
      { id: 'S2', from: 45, to: 22, name: 'Naga Awan Badai', type: 'snake' },
      { id: 'S3', from: 54, to: 33, name: 'Serpent Komet Biru', type: 'snake' },
      { id: 'S4', from: 68, to: 46, name: 'Naga Petir Langit', type: 'snake' },
      { id: 'S5', from: 77, to: 56, name: 'Wyrm Bintang Jatuh', type: 'snake' },
      { id: 'S6', from: 91, to: 67, name: 'Naga Astral Penjaga', type: 'snake' },
      { id: 'S7', from: 96, to: 74, name: 'Sovereign Naga Cakrawala', type: 'snake' },
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
      { id: 'L1', from: 6, to: 26, name: 'Tangga Altar Perunggu', type: 'ladder' },
      { id: 'L2', from: 15, to: 39, name: 'Tangga Pilar Leluhur', type: 'ladder' },
      { id: 'L3', from: 27, to: 50, name: 'Tangga Relik Suci', type: 'ladder' },
      { id: 'L4', from: 44, to: 63, name: 'Tangga Teras Giok', type: 'ladder' },
      { id: 'L5', from: 57, to: 77, name: 'Tangga Menara Lonceng', type: 'ladder' },
      { id: 'L6', from: 66, to: 86, name: 'Tangga Gerbang Kekaisaran', type: 'ladder' },
      { id: 'L7', from: 78, to: 96, name: 'Tangga Singgasana Kuil', type: 'ladder' },
    ],
    snakes: [
      { id: 'S1', from: 30, to: 7, name: 'Ular Penjaga Relik', type: 'snake' },
      { id: 'S2', from: 41, to: 17, name: 'Viper Batu Giok', type: 'snake' },
      { id: 'S3', from: 52, to: 29, name: 'Ular Kutukan Kuil', type: 'snake' },
      { id: 'S4', from: 61, to: 36, name: 'Naga Perunggu Kuno', type: 'snake' },
      { id: 'S5', from: 73, to: 48, name: 'Serpent Lorong Rahasia', type: 'snake' },
      { id: 'S6', from: 89, to: 60, name: 'Naga Giok Pelindung', type: 'snake' },
      { id: 'S7', from: 97, to: 75, name: 'Dewa Naga Kuil Emas', type: 'snake' },
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
  ladderCount = 7,
  snakeCount = 7,
): { ladders: SnakeOrLadder[]; snakes: SnakeOrLadder[] } {
  const themeBoard = getDefaultBoardByTheme(themeId);
  const usedTiles = new Set<number>([1, 100]);
  for (const specTile of SPECIAL_TILE_MAP.keys()) {
    usedTiles.add(specTile);
  }

  const pickFreeTile = (min: number, max: number): number => {
    for (let attempt = 0; attempt < 80; attempt++) {
      const candidate = Math.floor(min + Math.random() * (max - min + 1));
      if (!usedTiles.has(candidate)) {
        usedTiles.add(candidate);
        return candidate;
      }
    }
    for (let t = min; t <= max; t++) {
      if (!usedTiles.has(t)) {
        usedTiles.add(t);
        return t;
      }
    }
    return Math.max(2, Math.min(99, min));
  };

  const ladders: SnakeOrLadder[] = [];
  for (let i = 0; i < ladderCount; i++) {
    const bandMin = Math.max(2, Math.min(82, 3 + i * 11));
    const bandMax = Math.min(86, bandMin + 10);
    const from = pickFreeTile(bandMin, bandMax);
    const minTo = Math.min(98, from + 12);
    const maxTo = Math.min(99, from + 32);
    const to = pickFreeTile(minTo, Math.max(minTo, maxTo));
    const templateName =
      themeBoard.ladders[i % themeBoard.ladders.length]?.name || `Tangga Suci #${i + 1}`;
    ladders.push({
      id: `L${i + 1}`,
      from: Math.min(from, to - 1),
      to: Math.max(to, from + 1),
      name: templateName,
      type: 'ladder',
    });
  }

  const snakes: SnakeOrLadder[] = [];
  for (let i = 0; i < snakeCount; i++) {
    const bandMin = Math.max(20, Math.min(94, 22 + i * 11));
    const bandMax = Math.min(99, bandMin + 10);
    const from = pickFreeTile(bandMin, bandMax);
    const minTo = Math.max(2, from - 34);
    const maxTo = Math.max(3, from - 12);
    const to = pickFreeTile(minTo, Math.max(minTo, maxTo));
    const templateName =
      themeBoard.snakes[i % themeBoard.snakes.length]?.name || `Ular Penjaga #${i + 1}`;
    snakes.push({
      id: `S${i + 1}`,
      from: Math.max(from, to + 1),
      to: Math.min(to, from - 1),
      name: templateName,
      type: 'snake',
    });
  }

  ladders.sort((a, b) => a.from - b.from);
  snakes.sort((a, b) => a.from - b.from);

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
