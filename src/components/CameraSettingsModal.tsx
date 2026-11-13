import React, { useState } from 'react';
import {
  Activity,
  Camera,
  Compass,
  Cpu,
  Eye,
  Gauge,
  RotateCcw,
  Sliders,
  Sparkles,
  X,
} from 'lucide-react';
import {
  DEFAULT_CAMERA_SETTINGS,
  type CameraMode,
  type CameraSettings,
} from '../three/DynamicCameraController';
import {
  DEFAULT_GRAPHICS_PREFS,
  QUALITY_PRESETS,
  type GraphicsPreferences,
  type QualityPresetId,
} from '../three/perf/qualityPresets';
import type { DeviceCapabilitiesReport } from '../three/perf/PerformanceManager';

interface CameraSettingsModalProps {
  open: boolean;
  onClose: () => void;
  settings: CameraSettings;
  onChange: (next: CameraSettings) => void;
  onSnapOverview: (kind: 'isometric' | 'topdown') => void;
  graphicsPrefs: GraphicsPreferences;
  onGraphicsChange: (next: GraphicsPreferences) => void;
  deviceCaps: DeviceCapabilitiesReport;
}

const CAMERA_MODES: Array<{ id: CameraMode; label: string; desc: string }> = [
  {
    id: 'auto_follow',
    label: 'Auto Follow',
    desc: 'Ikuti dadu & pion saat giliran berjalan, lalu kembali ke papan penuh saat jeda.',
  },
  {
    id: 'cinematic',
    label: 'Cinematic',
    desc: 'Selalu mengunci & mengikuti pion aktif antar giliran dengan efek zoom dadu & kemenangan.',
  },
  {
    id: 'isometric',
    label: 'Isometric',
    desc: 'Menjaga sudut pandang isometrik keseluruhan papan secara stabil.',
  },
  {
    id: 'manual',
    label: 'Manual Camera',
    desc: 'Kontrol penuh dengan mouse/sentuhan tanpa pergerakan kamera otomatis.',
  },
];

const GRAPHICS_PRESET_OPTIONS: Array<{
  id: QualityPresetId;
  label: string;
  desc: string;
}> = [
  {
    id: 'auto',
    label: 'Auto Detect',
    desc: 'Memilih preset terbaik secara otomatis berdasarkan hasil uji GPU & WebGL.',
  },
  {
    id: 'potato',
    label: 'Potato',
    desc: 'Bayangan mati, tekstur 256px, LOD agresif untuk laptop lawas / RAM kecil.',
  },
  {
    id: 'low',
    label: 'Low',
    desc: 'Bayangan 512px ringan, efek pos-proses mati untuk 30+ FPS stabil.',
  },
  {
    id: 'medium',
    label: 'Medium',
    desc: 'Bayangan 1024px, Depth-of-Field + FXAA seimbang untuk iGPU modern.',
  },
  {
    id: 'high',
    label: 'High',
    desc: 'Bayangan 2048px, PBR 512px, Bloom halus & DoF sinematik 60 FPS.',
  },
  {
    id: 'ultra',
    label: 'Ultra',
    desc: 'Kualitas maksimal: tekstur 1024px, supersampling 1.15x, Bloom & SSAO.',
  },
];

export const CameraSettingsModal: React.FC<CameraSettingsModalProps> = ({
  open,
  onClose,
  settings,
  onChange,
  onSnapOverview,
  graphicsPrefs,
  onGraphicsChange,
  deviceCaps,
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'graphics'>('camera');

  if (!open) return null;

  const patch = (partial: Partial<CameraSettings>) => {
    onChange({ ...settings, ...partial });
  };

  const patchGraphics = (partial: Partial<GraphicsPreferences>) => {
    onGraphicsChange({ ...graphicsPrefs, ...partial });
  };

  const recommendedLabel = QUALITY_PRESETS[deviceCaps.recommendedTier].label;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 p-4">
      <div className="w-full max-w-lg max-h-[88vh] flex flex-col rounded-2xl glass-panel shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-amber-500/20">
          <div className="flex items-center gap-2.5">
            {activeTab === 'camera' ? (
              <Camera className="w-5 h-5 text-amber-400" />
            ) : (
              <Gauge className="w-5 h-5 text-amber-400" />
            )}
            <div>
              <h2 className="font-display text-lg font-bold text-gold-gradient">
                {activeTab === 'camera' ? 'Pengaturan Kamera' : 'Grafis & Performa'}
              </h2>
              <p className="text-xs text-slate-400">
                Preferensi perangkat lokal tersimpan otomatis di browser Anda.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-5 pt-3">
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-950/75 border border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab('camera')}
              className={`min-h-[36px] inline-flex items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeTab === 'camera'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              Kamera 3D
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('graphics')}
              className={`min-h-[36px] inline-flex items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeTab === 'graphics'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Grafis & Performa
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto custom-scroll space-y-5">
          {activeTab === 'camera' ? (
            <>
              {/* Mode Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">Mode Kamera</label>
                <div className="grid grid-cols-2 gap-2">
                  {CAMERA_MODES.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => patch({ mode: m.id })}
                      className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                        settings.mode === m.id
                          ? 'border-amber-400 bg-amber-500/15 text-amber-200'
                          : 'border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div className="text-xs font-bold">{m.label}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">{m.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Numeric Sliders */}
              <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/55 p-4">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                  <Sliders className="w-3.5 h-3.5 text-amber-400" />
                  Parameter Dinamis
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">Camera Distance</span>
                    <span className="font-mono-num text-amber-300">
                      {settings.distance.toFixed(1)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={6.5}
                    max={22}
                    step={0.5}
                    value={settings.distance}
                    onChange={(e) => patch({ distance: Number(e.target.value) })}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">Camera Height</span>
                    <span className="font-mono-num text-amber-300">
                      {settings.height.toFixed(1)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={4.0}
                    max={18.0}
                    step={0.4}
                    value={settings.height}
                    onChange={(e) => patch({ height: Number(e.target.value) })}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">Follow Smoothness</span>
                    <span className="font-mono-num text-amber-300">
                      {settings.smoothness.toFixed(1)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={2.0}
                    max={14.0}
                    step={0.5}
                    value={settings.smoothness}
                    onChange={(e) => patch({ smoothness: Number(e.target.value) })}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">Camera Sensitivity</span>
                    <span className="font-mono-num text-amber-300">
                      {settings.sensitivity.toFixed(1)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.4}
                    max={2.0}
                    step={0.1}
                    value={settings.sensitivity}
                    onChange={(e) => patch({ sensitivity: Number(e.target.value) })}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">Camera FOV</span>
                    <span className="font-mono-num text-amber-300">
                      {Math.round(settings.fov)}°
                    </span>
                  </div>
                  <input
                    type="range"
                    min={34}
                    max={64}
                    step={1}
                    value={settings.fov}
                    onChange={(e) => patch({ fov: Number(e.target.value) })}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </div>
              </div>

              {/* Performance / Reduced Visual Effects Toggle */}
              <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/55 px-4 py-3 cursor-pointer hover:border-slate-700 transition-colors">
                <div>
                  <div className="text-xs font-semibold text-slate-200">
                    Kurangi Efek Visual (DoF & Partikel)
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    Nonaktifkan Depth-of-Field blur & kurangi partikel untuk FPS lebih stabil.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.reducedEffects}
                  onChange={(e) => patch({ reducedEffects: e.target.checked })}
                  className="h-4 w-4 accent-amber-400 cursor-pointer shrink-0"
                />
              </label>

              {/* Quick Snapshots & Reset */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => onSnapOverview('isometric')}
                  className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-2.5 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-amber-200 cursor-pointer whitespace-nowrap"
                >
                  <Compass className="w-3.5 h-3.5 text-amber-400" />
                  Isometrik
                </button>
                <button
                  type="button"
                  onClick={() => onSnapOverview('topdown')}
                  className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-2.5 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-amber-200 cursor-pointer whitespace-nowrap"
                >
                  <Eye className="w-3.5 h-3.5 text-sky-400" />
                  Sudut Atas
                </button>
                <button
                  type="button"
                  onClick={() => onChange({ ...DEFAULT_CAMERA_SETTINGS })}
                  className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-2.5 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-rose-200 cursor-pointer whitespace-nowrap"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                  Reset
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Quality Presets */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">
                    Preset Kualitas Rendering
                  </label>
                  <span className="text-[11px] font-semibold text-emerald-300">
                    Rekomendasi Perangkat: {recommendedLabel}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {GRAPHICS_PRESET_OPTIONS.map((opt) => {
                    const selected = graphicsPrefs.preset === opt.id;
                    const isRec =
                      opt.id === deviceCaps.recommendedTier ||
                      (opt.id === 'auto' && graphicsPrefs.preset === 'auto');
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => patchGraphics({ preset: opt.id })}
                        className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                          selected
                            ? 'border-amber-400 bg-amber-500/15 text-amber-200'
                            : 'border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold">{opt.label}</span>
                          {opt.id === deviceCaps.recommendedTier && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-[9px] font-bold text-emerald-300">
                              Rekomen
                            </span>
                          )}
                          {opt.id === 'auto' && isRec && (
                            <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-[9px] font-bold text-sky-300">
                              {recommendedLabel}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                          {opt.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Adaptive Hysteresis & Dev Telemetry Overlay Toggles */}
              <div className="space-y-2.5">
                <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/55 px-4 py-3 cursor-pointer hover:border-slate-700 transition-colors">
                  <div>
                    <div className="text-xs font-semibold text-slate-200">
                      Penyesuaian Kualitas Otomatis (Hysteresis)
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                      Turunkan resolusi render atau bayangan secara halus saat FPS turun, dan naikkan lagi saat GPU longgar.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={graphicsPrefs.autoAdjust}
                    onChange={(e) => patchGraphics({ autoAdjust: e.target.checked })}
                    className="h-4 w-4 accent-amber-400 cursor-pointer shrink-0"
                  />
                </label>

                <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/55 px-4 py-3 cursor-pointer hover:border-slate-700 transition-colors">
                  <div className="flex items-start gap-2.5">
                    <Activity className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs font-semibold text-slate-200">
                        Tampilkan Developer Performance Overlay
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                        Pantau FPS, frame time, draw calls, segitiga, estimasi VRAM & jalankan benchmark 3 detik.
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={graphicsPrefs.showDevOverlay}
                    onChange={(e) => patchGraphics({ showDevOverlay: e.target.checked })}
                    className="h-4 w-4 accent-amber-400 cursor-pointer shrink-0"
                  />
                </label>
              </div>

              {/* Detected Device Hardware Probe Summary */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                    <Cpu className="w-3.5 h-3.5 text-sky-400" />
                    Profil Kemampuan Perangkat
                  </div>
                  <button
                    type="button"
                    onClick={() => onGraphicsChange({ ...DEFAULT_GRAPHICS_PREFS })}
                    className="text-[11px] font-semibold text-amber-300 hover:text-amber-200 cursor-pointer"
                  >
                    Reset Default
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-y-1.5 gap-x-3 text-[11px] pt-1 font-mono-num">
                  <div className="col-span-2 truncate text-slate-300" title={deviceCaps.gpuRenderer}>
                    <span className="text-slate-500">GPU: </span>
                    {deviceCaps.gpuRenderer}
                  </div>
                  <div>
                    <span className="text-slate-500">Max Tex: </span>
                    <span className="text-slate-200">{deviceCaps.maxTextureSize}px</span>
                  </div>
                  <div>
                    <span className="text-slate-500">CPU/RAM: </span>
                    <span className="text-slate-200">
                      {deviceCaps.hardwareConcurrency}c
                      {deviceCaps.deviceMemoryGb ? ` / ${deviceCaps.deviceMemoryGb}GB` : ''}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Micro-Bench: </span>
                    <span className="text-amber-300">{deviceCaps.benchmarkScoreMs}ms</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Tex Comp: </span>
                    <span className="text-slate-200">
                      {deviceCaps.compressedFormats.length > 0
                        ? deviceCaps.compressedFormats.slice(0, 2).join(', ')
                        : 'RGBA Mipmap'}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
