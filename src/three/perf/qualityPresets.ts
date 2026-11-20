export type QualityPresetId = 'auto' | 'potato' | 'low' | 'medium' | 'high' | 'ultra';
export type ResolvedQualityTier = 'potato' | 'low' | 'medium' | 'high' | 'ultra';

export interface GraphicsPreferences {
  preset: QualityPresetId;
  autoAdjust: boolean;
  showDevOverlay: boolean;
}

export const GRAPHICS_PREFS_KEY = 'aether_serpent_graphics_v2';

export const DEFAULT_GRAPHICS_PREFS: GraphicsPreferences = {
  preset: 'auto',
  autoAdjust: true,
  showDevOverlay: false,
};

export interface QualityConfig {
  tier: ResolvedQualityTier;
  label: string;
  targetFps: number;
  minResScale: number;
  maxResScale: number;
  defaultResScale: number;
  antialias: boolean;
  shadowsEnabled: boolean;
  shadowMapSize: number;
  shadowImportantOnly: boolean;
  pbrTexSize: 256 | 512 | 1024;
  envTexSize: 128 | 256 | 512 | 1024;
  boardAtlasSize: 1024 | 2048;
  anisotropyCap: number;
  postMode: 'none' | 'fxaa' | 'dof_fxaa' | 'bloom_dof_fxaa' | 'ultra_ssao';
  lodBias: number;
  particleBudget: number;
  envDensity: number;
  terrainSegments: 32 | 48 | 64 | 96 | 128;
  loadVistaGlbs: boolean;
  simplifiedShaders: boolean;
}

export const QUALITY_PRESETS: Record<ResolvedQualityTier, QualityConfig> = {
  potato: {
    tier: 'potato',
    label: 'Super Ringan (Potato)',
    targetFps: 30,
    minResScale: 0.85,
    maxResScale: 1.0,
    defaultResScale: 0.94,
    antialias: true,
    shadowsEnabled: false,
    shadowMapSize: 0,
    shadowImportantOnly: true,
    pbrTexSize: 256,
    envTexSize: 128,
    boardAtlasSize: 2048,
    anisotropyCap: 4,
    postMode: 'none',
    lodBias: 0.55,
    particleBudget: 8,
    envDensity: 0.14,
    terrainSegments: 32,
    loadVistaGlbs: false,
    simplifiedShaders: true,
  },
  low: {
    tier: 'low',
    label: 'Hemat & Lancar (HP)',
    targetFps: 45,
    minResScale: 0.9,
    maxResScale: 1.08,
    defaultResScale: 1.0,
    antialias: true,
    shadowsEnabled: false,
    shadowMapSize: 0,
    shadowImportantOnly: true,
    pbrTexSize: 512,
    envTexSize: 256,
    boardAtlasSize: 2048,
    anisotropyCap: 6,
    postMode: 'none',
    lodBias: 0.78,
    particleBudget: 20,
    envDensity: 0.3,
    terrainSegments: 48,
    loadVistaGlbs: false,
    simplifiedShaders: false,
  },
  medium: {
    tier: 'medium',
    label: 'Seimbang (HD Ringan)',
    targetFps: 55,
    minResScale: 0.92,
    maxResScale: 1.08,
    defaultResScale: 1.0,
    antialias: true,
    shadowsEnabled: true,
    shadowMapSize: 512,
    shadowImportantOnly: true,
    pbrTexSize: 512,
    envTexSize: 256,
    boardAtlasSize: 2048,
    anisotropyCap: 8,
    postMode: 'none',
    lodBias: 0.9,
    particleBudget: 36,
    envDensity: 0.48,
    terrainSegments: 48,
    loadVistaGlbs: true,
    simplifiedShaders: false,
  },
  high: {
    tier: 'high',
    label: 'Tinggi (High)',
    targetFps: 60,
    minResScale: 0.92,
    maxResScale: 1.1,
    defaultResScale: 1.0,
    antialias: true,
    shadowsEnabled: true,
    shadowMapSize: 1024,
    shadowImportantOnly: false,
    pbrTexSize: 512,
    envTexSize: 512,
    boardAtlasSize: 2048,
    anisotropyCap: 12,
    postMode: 'bloom_dof_fxaa',
    lodBias: 1.1,
    particleBudget: 72,
    envDensity: 0.78,
    terrainSegments: 64,
    loadVistaGlbs: true,
    simplifiedShaders: false,
  },
  ultra: {
    tier: 'ultra',
    label: 'Ultra',
    targetFps: 60,
    minResScale: 1.0,
    maxResScale: 1.25,
    defaultResScale: 1.1,
    antialias: true,
    shadowsEnabled: true,
    shadowMapSize: 2048,
    shadowImportantOnly: false,
    pbrTexSize: 1024,
    envTexSize: 1024,
    boardAtlasSize: 2048,
    anisotropyCap: 16,
    postMode: 'ultra_ssao',
    lodBias: 1.4,
    particleBudget: 120,
    envDensity: 1.0,
    terrainSegments: 128,
    loadVistaGlbs: true,
    simplifiedShaders: false,
  },
};

export const TIER_ORDER: ResolvedQualityTier[] = ['potato', 'low', 'medium', 'high', 'ultra'];

export function loadGraphicsPreferences(): GraphicsPreferences {
  try {
    const raw = localStorage.getItem(GRAPHICS_PREFS_KEY);
    if (!raw) return { ...DEFAULT_GRAPHICS_PREFS };
    const parsed = JSON.parse(raw) as Partial<GraphicsPreferences>;
    return {
      preset: parsed.preset ?? DEFAULT_GRAPHICS_PREFS.preset,
      autoAdjust: parsed.autoAdjust ?? DEFAULT_GRAPHICS_PREFS.autoAdjust,
      showDevOverlay: parsed.showDevOverlay ?? DEFAULT_GRAPHICS_PREFS.showDevOverlay,
    };
  } catch {
    return { ...DEFAULT_GRAPHICS_PREFS };
  }
}

export function saveGraphicsPreferences(prefs: GraphicsPreferences): void {
  try {
    localStorage.setItem(GRAPHICS_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // ignore storage quota errors
  }
}
