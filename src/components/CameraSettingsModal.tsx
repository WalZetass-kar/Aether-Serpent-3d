import React, { useState } from 'react';
import {
  Activity,
  Camera,
  Compass,
  Cpu,
  Dices,
  Eye,
  Gauge,
  MousePointerClick,
  Music,
  Play,
  RotateCcw,
  Sliders,
  Sparkles,
  Volume2,
  VolumeX,
  Wind,
  X,
} from 'lucide-react';
import {
  DEFAULT_SOUND_SETTINGS,
  soundEngine,
  type SoundSettings,
} from '../audio/soundEngine';
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
  soundSettings: SoundSettings;
  muted: boolean;
  onSoundChange: (next: SoundSettings) => void;
  onToggleMute: () => void;
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
  soundSettings,
  muted,
  onSoundChange,
  onToggleMute,
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'sound' | 'graphics'>('camera');

  if (!open) return null;

  const patch = (partial: Partial<CameraSettings>) => {
    onChange({ ...settings, ...partial });
  };

  const patchGraphics = (partial: Partial<GraphicsPreferences>) => {
    onGraphicsChange({ ...graphicsPrefs, ...partial });
  };

  const patchSound = (partial: Partial<SoundSettings>) => {
    onSoundChange({ ...soundSettings, ...partial });
  };

  const recommendedLabel = QUALITY_PRESETS[deviceCaps.recommendedTier].label;

  const headerTitle =
    activeTab === 'camera'
      ? 'Pengaturan Kamera'
      : activeTab === 'sound'
        ? 'Pengaturan Suara'
        : 'Grafis & Performa';

  const activeCategoryCount = [
    soundSettings.musicEnabled,
    soundSettings.uiSoundsEnabled,
    soundSettings.boardEffectsEnabled,
    soundSettings.ambientBoardEnabled,
  ].filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 p-4">
      <div className="w-full max-w-lg max-h-[88vh] flex flex-col rounded-2xl glass-panel shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-amber-500/20">
          <div className="flex items-center gap-2.5 min-w-0">
            {activeTab === 'camera' ? (
              <Camera className="w-5 h-5 text-amber-400 shrink-0" />
            ) : activeTab === 'sound' ? (
              muted ? (
                <VolumeX className="w-5 h-5 text-rose-400 shrink-0" />
              ) : (
                <Volume2 className="w-5 h-5 text-amber-400 shrink-0" />
              )
            ) : (
              <Gauge className="w-5 h-5 text-amber-400 shrink-0" />
            )}
            <div className="min-w-0">
              <h2 className="font-display text-lg font-bold text-gold-gradient truncate">
                {headerTitle}
              </h2>
              <p className="text-xs text-slate-400 truncate">
                Preferensi perangkat lokal tersimpan otomatis di browser Anda.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="p-2 min-w-[40px] min-h-[40px] inline-flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-5 pt-3">
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-950/75 border border-slate-800">
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                setActiveTab('camera');
              }}
              className={`min-h-[38px] px-2 inline-flex items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'camera'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Camera className="w-3.5 h-3.5 shrink-0" />
              <span>Kamera 3D</span>
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                setActiveTab('sound');
              }}
              className={`min-h-[38px] px-2 inline-flex items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'sound'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5 shrink-0" />
              <span>Suara</span>
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                setActiveTab('graphics');
              }}
              className={`min-h-[38px] px-2 inline-flex items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'graphics'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>Grafis</span>
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
          ) : activeTab === 'sound' ? (
            <>
              {/* Master Audio Switch & Master Volume */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-100">Master Audio</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {muted
                        ? 'Semua suara sedang dibisukan'
                        : `${activeCategoryCount} dari 4 kategori audio aktif`}
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={!muted}
                    aria-label="Aktifkan Master Audio"
                    onClick={onToggleMute}
                    className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                      !muted
                        ? 'border-amber-400/70 bg-amber-500'
                        : 'border-slate-700 bg-slate-800'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 rounded-full bg-slate-950 shadow-sm transition-transform duration-150 ${
                        !muted ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className={muted ? 'opacity-50' : ''}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-300 font-medium">Volume Utama</span>
                    <span className="font-mono-num text-amber-300 font-semibold">
                      {Math.round(soundSettings.masterVolume * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={Math.round(soundSettings.masterVolume * 100)}
                    onChange={(e) =>
                      patchSound({ masterVolume: Number(e.target.value) / 100 })
                    }
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </div>
              </div>

              {muted && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-950/25 px-3.5 py-2.5 text-[11px] text-rose-200 leading-relaxed">
                  Master Audio sedang nonaktif. Anda tetap dapat mengatur kategori di bawah dan menyalakan Master Audio kapan saja.
                </div>
              )}

              {/* Individual Audio Categories */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">Kategori Audio</span>
                  <span className="text-[11px] text-slate-400">
                    Aktifkan atau nonaktifkan per jenis suara
                  </span>
                </div>

                <div className="divide-y divide-slate-800/80 rounded-xl border border-slate-800 bg-slate-950/55">
                  {/* 1. Background Music */}
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <Music className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-100">
                            Musik Latar
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                            Alunan harpa dan harmoni fantasi lembut selama berada di menu dan arena.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={muted || !soundSettings.musicEnabled}
                          onClick={() => soundEngine.previewCategory('music')}
                          title="Uji Musik Latar"
                          className="min-h-[34px] px-2.5 inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 text-[11px] font-semibold text-slate-200 hover:border-amber-400/50 hover:text-amber-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer whitespace-nowrap"
                        >
                          <Play className="w-3 h-3" />
                          <span>Tes</span>
                        </button>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={soundSettings.musicEnabled}
                          aria-label="Toggle Musik Latar"
                          onClick={() => {
                            const nextVal = !soundSettings.musicEnabled;
                            patchSound({ musicEnabled: nextVal });
                            soundEngine.playUiToggle(nextVal);
                          }}
                          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                            soundSettings.musicEnabled
                              ? 'border-amber-400/70 bg-amber-500'
                              : 'border-slate-700 bg-slate-800'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 rounded-full bg-slate-950 transition-transform duration-150 ${
                              soundSettings.musicEnabled ? 'translate-x-5.5' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {soundSettings.musicEnabled && (
                      <div className="pl-7 pt-1">
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="text-slate-400">Tingkat Musik</span>
                          <span className="font-mono-num text-amber-300">
                            {Math.round(soundSettings.musicVolume * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={10}
                          max={100}
                          step={5}
                          value={Math.round(soundSettings.musicVolume * 100)}
                          onChange={(e) =>
                            patchSound({ musicVolume: Number(e.target.value) / 100 })
                          }
                          className="w-full accent-amber-400 cursor-pointer"
                        />
                      </div>
                    )}
                  </div>

                  {/* 2. Interface Sounds */}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <MousePointerClick className="w-4 h-4 text-sky-400 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-100">
                            Suara Antarmuka
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                            Umpan balik klik tombol, perpindahan tab, dan interaksi menu.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={muted || !soundSettings.uiSoundsEnabled}
                          onClick={() => soundEngine.previewCategory('ui')}
                          title="Uji Suara Antarmuka"
                          className="min-h-[34px] px-2.5 inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 text-[11px] font-semibold text-slate-200 hover:border-amber-400/50 hover:text-amber-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer whitespace-nowrap"
                        >
                          <Play className="w-3 h-3" />
                          <span>Tes</span>
                        </button>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={soundSettings.uiSoundsEnabled}
                          aria-label="Toggle Suara Antarmuka"
                          onClick={() => {
                            const nextVal = !soundSettings.uiSoundsEnabled;
                            patchSound({ uiSoundsEnabled: nextVal });
                            if (nextVal) {
                              soundEngine.setSettings({
                                ...soundSettings,
                                uiSoundsEnabled: true,
                              });
                              soundEngine.playUiToggle(true);
                            }
                          }}
                          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                            soundSettings.uiSoundsEnabled
                              ? 'border-amber-400/70 bg-amber-500'
                              : 'border-slate-700 bg-slate-800'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 rounded-full bg-slate-950 transition-transform duration-150 ${
                              soundSettings.uiSoundsEnabled ? 'translate-x-5.5' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 3. Board Action & Gameplay Effects */}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <Dices className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-100">
                            Efek Papan & Permainan
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                            Lemparan dadu, lompatan pion, naiki tangga, gigitan ular, perisai, dan kemenangan.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={muted || !soundSettings.boardEffectsEnabled}
                          onClick={() => soundEngine.previewCategory('board')}
                          title="Uji Efek Papan"
                          className="min-h-[34px] px-2.5 inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 text-[11px] font-semibold text-slate-200 hover:border-amber-400/50 hover:text-amber-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer whitespace-nowrap"
                        >
                          <Play className="w-3 h-3" />
                          <span>Tes</span>
                        </button>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={soundSettings.boardEffectsEnabled}
                          aria-label="Toggle Efek Papan & Permainan"
                          onClick={() => {
                            const nextVal = !soundSettings.boardEffectsEnabled;
                            patchSound({ boardEffectsEnabled: nextVal });
                            soundEngine.playUiToggle(nextVal);
                          }}
                          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                            soundSettings.boardEffectsEnabled
                              ? 'border-amber-400/70 bg-amber-500'
                              : 'border-slate-700 bg-slate-800'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 rounded-full bg-slate-950 transition-transform duration-150 ${
                              soundSettings.boardEffectsEnabled
                                ? 'translate-x-5.5'
                                : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 4. Ambient Board Effects */}
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <Wind className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-100">
                            Efek Ambien Papan
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                            Desir angin hutan, air terjun latar, dan resonansi kristal papan 3D.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={muted || !soundSettings.ambientBoardEnabled}
                          onClick={() => soundEngine.previewCategory('ambient')}
                          title="Uji Efek Ambien Papan"
                          className="min-h-[34px] px-2.5 inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 text-[11px] font-semibold text-slate-200 hover:border-amber-400/50 hover:text-amber-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer whitespace-nowrap"
                        >
                          <Play className="w-3 h-3" />
                          <span>Tes</span>
                        </button>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={soundSettings.ambientBoardEnabled}
                          aria-label="Toggle Efek Ambien Papan"
                          onClick={() => {
                            const nextVal = !soundSettings.ambientBoardEnabled;
                            patchSound({ ambientBoardEnabled: nextVal });
                            soundEngine.playUiToggle(nextVal);
                          }}
                          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                            soundSettings.ambientBoardEnabled
                              ? 'border-amber-400/70 bg-amber-500'
                              : 'border-slate-700 bg-slate-800'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 rounded-full bg-slate-950 transition-transform duration-150 ${
                              soundSettings.ambientBoardEnabled
                                ? 'translate-x-5.5'
                                : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {soundSettings.ambientBoardEnabled && (
                      <div className="pl-7 pt-1">
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="text-slate-400">Tingkat Ambien</span>
                          <span className="font-mono-num text-amber-300">
                            {Math.round(soundSettings.ambientVolume * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={10}
                          max={100}
                          step={5}
                          value={Math.round(soundSettings.ambientVolume * 100)}
                          onChange={(e) =>
                            patchSound({ ambientVolume: Number(e.target.value) / 100 })
                          }
                          className="w-full accent-amber-400 cursor-pointer"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Reset Sound Defaults */}
              <div className="flex items-center justify-between gap-3 pt-1">
                <span className="text-[11px] text-slate-400">
                  Perubahan audio langsung aktif tanpa memuat ulang arena.
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onSoundChange({ ...DEFAULT_SOUND_SETTINGS });
                    soundEngine.playUiClick();
                  }}
                  className="inline-flex items-center justify-center gap-1.5 min-h-[38px] px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-amber-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                  <span>Reset Audio</span>
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
