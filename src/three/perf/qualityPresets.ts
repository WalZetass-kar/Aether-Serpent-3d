export type QualityPresetId = 'auto' | 'potato' | 'low' | 'medium' | 'high' | 'ultra';
export type ResolvedQualityTier = 'potato' | 'low' | 'medium' | 'high' | 'ultra';

export interface GraphicsPreferences {
  preset: QualityPresetId;
  autoAdjust: boolean;
  showDevOverlay: boolean;
}

export const GRAPHICS_PREFS_KEY = 'aether_serpent_graphics_v1';

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
  boardAtlasSize: 1024 | 2048;
  anisotropyCap: number;
  postMode: 'none' | 'fxaa' | 'dof_fxaa' | 'bloom_dof_fxaa' | 'ultra_ssao';
  lodBias: number;
  particleBudget: number;
  envDensity: number;
  terrainSegments: 48 | 64 | 96 | 128;
  loadVistaGlbs: boolean;
}

export const QUALITY_PRESETS: Record<ResolvedQualityTier, QualityConfig> = {
  potato: {
    tier: 'potato',
    label: 'Ringan Maksimal (Potato)',
    targetFps: 30,
    minResScale: 0.78,
    maxResScale: 0.95,
    defaultResScale: 0.88,
    antialias: false,
    shadowsEnabled: false,
    shadowMapSize: 0,
    shadowImportantOnly: true,
    pbrTexSize: 256,
    boardAtlasSize: 1024,
    anisotropyCap: 4,
    postMode: 'none',
    lodBias: 0.65,
    particleBudget: 12,
    envDensity: 0.28,
    terrainSegments: 48,
    loadVistaGlbs: false,
  },
  low: {
    tier: 'low',
    label: 'Hemat & Lancar (Mobile)',
    targetFps: 45,
    minResScale: 0.85,
    maxResScale: 1.0,
    defaultResScale: 0.92,
    antialias: true,
    shadowsEnabled: false,
    shadowMapSize: 0,
    shadowImportantOnly: true,
    pbrTexSize: 256,
    boardAtlasSize: 1024,
    anisotropyCap: 4,
    postMode: 'none',
    lodBias: 0.8,
    particleBudget: 24,
    envDensity: 0.42,
    terrainSegments: 48,
    loadVistaGlbs: true,
  },
  medium: {
    tier: 'medium',
    label: 'Seimbang (HD)',
    targetFps: 55,
    minResScale: 0.9,
    maxResScale: 1.1,
    defaultResScale: 1.0,
    antialias: true,
    shadowsEnabled: true,
    shadowMapSize: 1024,
    shadowImportantOnly: true,
    pbrTexSize: 512,
    boardAtlasSize: 2048,
    anisotropyCap: 8,
    postMode: 'none',
    lodBias: 0.95,
    particleBudget: 48,
    envDensity: 0.62,
    terrainSegments: 64,
    loadVistaGlbs: true,
  },
  high: {
    tier: 'high',
    label: 'Tinggi (High)',
    targetFps: 60,
    minResScale: 0.95,
    maxResScale: 1.12,
    defaultResScale: 1.0,
    antialias: true,
    shadowsEnabled: true,
    shadowMapSize: 1024,
    shadowImportantOnly: false,
    pbrTexSize: 512,
    boardAtlasSize: 2048,
    anisotropyCap: 12,
    postMode: 'bloom_dof_fxaa',
    lodBias: 1.15,
    particleBudget: 84,
    envDensity: 0.85,
    terrainSegments: 96,
    loadVistaGlbs: true,
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
    boardAtlasSize: 2048,
    anisotropyCap: 16,
    postMode: 'ultra_ssao',
    lodBias: 1.4,
    particleBudget: 120,
    envDensity: 1.0,
    terrainSegments: 128,
    loadVistaGlbs: true,
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
