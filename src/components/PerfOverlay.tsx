import React, { useState } from 'react';
import { Activity, Gauge, Play, X } from 'lucide-react';
import type { BenchmarkSummary, LivePerfTelemetry } from '../three/perf/PerformanceManager';

interface PerfOverlayProps {
  telemetry: LivePerfTelemetry | null;
  onRunBenchmark: () => Promise<BenchmarkSummary | null>;
  onClose: () => void;
}

export const PerfOverlay: React.FC<PerfOverlayProps> = ({
  telemetry,
  onRunBenchmark,
  onClose,
}) => {
  const [runningBench, setRunningBench] = useState(false);
  const [benchResult, setBenchResult] = useState<BenchmarkSummary | null>(null);

  const handleBenchmark = async () => {
    if (runningBench) return;
    setRunningBench(true);
    try {
      const res = await onRunBenchmark();
      if (res) setBenchResult(res);
    } finally {
      setRunningBench(false);
    }
  };

  if (!telemetry) return null;

  const fpsTone =
    telemetry.fps >= 52
      ? 'text-emerald-300'
      : telemetry.fps >= 28
        ? 'text-amber-300'
        : 'text-rose-400';

  return (
    <aside
      aria-label="Developer Performance Telemetry"
      className="fixed top-20 left-3 sm:left-4 z-30 w-72 rounded-2xl glass-panel p-3.5 text-[11px] text-slate-200 shadow-2xl select-none"
    >
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-amber-500/20">
        <div className="flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-display text-xs font-bold text-gold-gradient">
            Perf Telemetry
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-400/35 font-mono-num text-[10px] font-bold uppercase text-amber-200">
            {telemetry.resolvedTier}
            {telemetry.autoAdjustedStep < 0 ? ` (${telemetry.autoAdjustedStep})` : ''}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup Overlay Performa"
            className="p-0.5 rounded text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 py-2.5 font-mono-num">
        <div className="flex items-center justify-between">
          <span className="text-slate-400">FPS</span>
          <span className={`font-bold ${fpsTone}`}>{telemetry.fps}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Avg/P95</span>
          <span className="text-slate-100">
            {telemetry.avgFrameMs}/{telemetry.p95FrameMs}ms
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Draw Calls</span>
          <span className="text-sky-300 font-semibold">{telemetry.drawCalls}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Triangles</span>
          <span className="text-slate-100">
            {telemetry.triangles >= 1000
              ? `${(telemetry.triangles / 1000).toFixed(1)}k`
              : telemetry.triangles}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Objects</span>
          <span className="text-slate-200">{telemetry.activeObjects}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Geo/Tex</span>
          <span className="text-slate-200">
            {telemetry.geometries}/{telemetry.textures}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Est. VRAM</span>
          <span className="text-amber-200">{telemetry.estimatedTextureMb} MB</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Shaders</span>
          <span className="text-slate-200">{telemetry.programs}</span>
        </div>
      </div>

      <div className="pt-2 border-t border-slate-800/80 space-y-1 text-[10px] text-slate-400">
        <div className="flex items-center justify-between font-mono-num">
          <span>Render Res</span>
          <span className="text-slate-200">
            {telemetry.renderWidth}×{telemetry.renderHeight} ({telemetry.resScale.toFixed(2)}x)
          </span>
        </div>
        {telemetry.jsHeapUsedMb !== null && (
          <div className="flex items-center justify-between font-mono-num">
            <span>JS Heap</span>
            <span className="text-slate-200">{telemetry.jsHeapUsedMb} MB</span>
          </div>
        )}
        <div className="truncate text-slate-400" title={telemetry.gpuSummary}>
          GPU: <span className="text-slate-300">{telemetry.gpuSummary}</span>
        </div>
      </div>

      <div className="mt-2.5 pt-2 border-t border-slate-800/80 space-y-2">
        <button
          type="button"
          disabled={runningBench}
          onClick={() => void handleBenchmark()}
          className="w-full min-h-[32px] inline-flex items-center justify-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/15 px-2.5 py-1 text-[11px] font-bold text-amber-200 hover:bg-amber-500/25 disabled:opacity-50 cursor-pointer transition-colors"
        >
          {runningBench ? (
            <>
              <Gauge className="w-3.5 h-3.5 animate-spin" />
              Mengukur 3 Detik...
            </>
          ) : (
            <>
              <Play className="w-3 h-3" />
              Benchmark 3s
            </>
          )}
        </button>

        {benchResult && (
          <div className="rounded-lg border border-emerald-500/30 bg-slate-950/75 p-2 font-mono-num text-[10px] text-slate-200 space-y-0.5">
            <div className="flex justify-between font-bold text-emerald-300">
              <span>Hasil ({benchResult.tier.toUpperCase()})</span>
              <span>{benchResult.avgFps} FPS</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Avg {benchResult.avgFrameMs}ms · P95 {benchResult.p95FrameMs}ms</span>
              <span>{benchResult.drawCalls} dc</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
