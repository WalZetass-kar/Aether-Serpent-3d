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
    label: 'Potato (Sharp)',
    targetFps: 30,
    minResScale: 0.88,
    maxResScale: 1.0,
    defaultResScale: 0.95,
    antialias: false,
    shadowsEnabled: false,
    shadowMapSize: 0,
    shadowImportantOnly: true,
    pbrTexSize: 512,
    boardAtlasSize: 2048,
    anisotropyCap: 8,
    postMode: 'none',
    lodBias: 0.75,
    particleBudget: 18,
    envDensity: 0.35,
    terrainSegments: 48,
    loadVistaGlbs: false,
  },
  low: {
    tier: 'low',
    label: 'Low (Crisp)',
    targetFps: 30,
    minResScale: 0.92,
    maxResScale: 1.05,
    defaultResScale: 1.0,
    antialias: true,
    shadowsEnabled: true,
    shadowMapSize: 512,
    shadowImportantOnly: true,
    pbrTexSize: 512,
    boardAtlasSize: 2048,
    anisotropyCap: 8,
    postMode: 'none',
    lodBias: 0.88,
    particleBudget: 36,
    envDensity: 0.5,
    terrainSegments: 64,
    loadVistaGlbs: true,
  },
  medium: {
    tier: 'medium',
    label: 'Medium (HD)',
    targetFps: 50,
    minResScale: 0.96,
    maxResScale: 1.15,
    defaultResScale: 1.0,
    antialias: true,
    shadowsEnabled: true,
    shadowMapSize: 1024,
    shadowImportantOnly: false,
    pbrTexSize: 512,
    boardAtlasSize: 2048,
    anisotropyCap: 12,
    postMode: 'fxaa',
    lodBias: 1.0,
    particleBudget: 64,
    envDensity: 0.72,
    terrainSegments: 96,
    loadVistaGlbs: true,
  },
  high: {
    tier: 'high',
    label: 'High',
    targetFps: 60,
    minResScale: 0.95,
    maxResScale: 1.12,
    defaultResScale: 1.0,
    antialias: true,
    shadowsEnabled: true,
    shadowMapSize: 2048,
    shadowImportantOnly: false,
    pbrTexSize: 512,
    boardAtlasSize: 2048,
    anisotropyCap: 16,
    postMode: 'bloom_dof_fxaa',
    lodBias: 1.2,
    particleBudget: 96,
    envDensity: 0.9,
    terrainSegments: 128,
    loadVistaGlbs: true,
  },
  ultra: {
    tier: 'ultra',
    label: 'Ultra',
    targetFps: 60,
    minResScale: 1.0,
    maxResScale: 1.25,
    defaultResScale: 1.15,
    antialias: true,
    shadowsEnabled: true,
    shadowMapSize: 2048,
    shadowImportantOnly: false,
    pbrTexSize: 1024,
    boardAtlasSize: 2048,
    anisotropyCap: 16,
    postMode: 'ultra_ssao',
    lodBias: 1.5,
    particleBudget: 128,
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
