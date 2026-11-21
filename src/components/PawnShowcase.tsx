import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Coins,
  Lock,
  MessageCircle,
  Pause,
  Play,
  RotateCcw,
  ShoppingBag,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import {
  PLAYER_ARCHETYPES,
  isPawnUnlocked,
  type PawnRarity,
  type PlayerArchetypeDef,
} from '../../shared/gameConfig';
import {
  purchasePremiumPawn,
  type PlayerProfile,
} from '../services/storageService';
import { soundEngine } from '../audio/soundEngine';
import { PawnPreviewEngine } from '../three/PawnPreviewEngine';
import type { PawnClipName } from '../three/assets/heroPawnBuilder';
import { ArchetypeEmblem } from './FantasyIcons';

interface PawnShowcaseProps {
  profile: PlayerProfile;
  onUpdateProfile: (next: PlayerProfile) => void;
  onOpenTopUpChat: (itemName?: string | null) => void;
  onNotify?: (title: string, detail?: string) => void;
}

type PawnFilterTab = 'all' | 'shop' | 'owned';

const RARITY_META: Record<PawnRarity, { label: string; textClass: string }> = {
  starter: { label: 'Gratis', textClass: 'text-emerald-400' },
  rare: { label: 'Langka', textClass: 'text-sky-400' },
  epic: { label: 'Epik', textClass: 'text-violet-400' },
  legendary: { label: 'Legendaris', textClass: 'text-amber-300' },
  mythic: { label: 'Mitik', textClass: 'text-fuchsia-300' },
};

const ANIMATION_CLIPS: Array<{ id: PawnClipName; label: string }> = [
  { id: 'idle', label: 'Idle' },
  { id: 'walk', label: 'Jalan' },
  { id: 'climb', label: 'Panjat' },
  { id: 'cast', label: 'Aksi' },
  { id: 'victory', label: 'Menang' },
];

export const PawnShowcase: React.FC<PawnShowcaseProps> = ({
  profile,
  onUpdateProfile,
  onOpenTopUpChat,
  onNotify,
}) => {
  const [filterTab, setFilterTab] = useState<PawnFilterTab>('all');
  const [selectedIdx, setSelectedIdx] = useState<number>(() => {
    const idx = profile.archetypeIndex ?? 0;
    return idx >= 0 && idx < PLAYER_ARCHETYPES.length ? idx : 0;
  });
  const [activeClip, setActiveClip] = useState<PawnClipName>('idle');
  const [autoRotate, setAutoRotate] = useState(true);
  const [webglLost, setWebglLost] = useState(false);
  const [mountKey, setMountKey] = useState(0);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<PawnPreviewEngine | null>(null);

  const currentCoins = profile.aetherCoins ?? 0;
  const isUnlimitedCoins = Boolean(profile.unlimitedCoins);
  const ownedCount = useMemo(
    () =>
      PLAYER_ARCHETYPES.filter((a) =>
        isPawnUnlocked(a.archetypeIndex, profile.unlockedPawnIndices),
      ).length,
    [profile.unlockedPawnIndices],
  );

  const filteredPawns = useMemo(() => {
    if (filterTab === 'shop') {
      return PLAYER_ARCHETYPES.filter((a) => a.unlockType === 'premium');
    }
    if (filterTab === 'owned') {
      return PLAYER_ARCHETYPES.filter((a) =>
        isPawnUnlocked(a.archetypeIndex, profile.unlockedPawnIndices),
      );
    }
    return PLAYER_ARCHETYPES;
  }, [filterTab, profile.unlockedPawnIndices]);

  const selectedPawn: PlayerArchetypeDef =
    PLAYER_ARCHETYPES[selectedIdx] ?? PLAYER_ARCHETYPES[0];
  const isSelectedUnlocked = isPawnUnlocked(
    selectedPawn.archetypeIndex,
    profile.unlockedPawnIndices,
  );
  const isSelectedEquipped = profile.archetypeIndex === selectedPawn.archetypeIndex;
  const canAffordSelected = isUnlimitedCoins || currentCoins >= selectedPawn.priceCoins;
  const shortfallCoins = isUnlimitedCoins ? 0 : Math.max(0, selectedPawn.priceCoins - currentCoins);

  const showQuickNotice = (msg: string) => {
    setFeedbackToast(msg);
    window.setTimeout(() => {
      setFeedbackToast((curr) => (curr === msg ? null : curr));
    }, 2600);
  };

  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    setWebglLost(false);
    const engine = new PawnPreviewEngine(container, {
      initialArchetypeIndex: selectedIdx,
      initialUnlocked: isSelectedUnlocked,
      onWebGLContextLost: (lost) => setWebglLost(lost),
    });
    engine.setClip(activeClip);
    engine.setAutoRotate(autoRotate);
    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
    // Mount 3D engine once per mountKey so React UI state updates never rebuild the WebGL context
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mountKey]);

  useEffect(() => {
    engineRef.current?.setPawn(selectedPawn.archetypeIndex, isSelectedUnlocked);
  }, [selectedPawn.archetypeIndex, isSelectedUnlocked]);

  useEffect(() => {
    engineRef.current?.setClip(activeClip);
  }, [activeClip]);

  useEffect(() => {
    engineRef.current?.setAutoRotate(autoRotate);
  }, [autoRotate]);

  const handleEquipPawn = (arch: PlayerArchetypeDef) => {
    if (!isPawnUnlocked(arch.archetypeIndex, profile.unlockedPawnIndices)) return;
    soundEngine.playUiClick();
    const next: PlayerProfile = {
      ...profile,
      archetypeIndex: arch.archetypeIndex,
    };
    onUpdateProfile(next);
    showQuickNotice(`Pion "${arch.title}" dipasang sebagai karakter aktif.`);
    onNotify?.('Pion Aktif Diperbarui', arch.title);
  };

  const handleBuyPawn = (arch: PlayerArchetypeDef) => {
    const res = purchasePremiumPawn(arch.archetypeIndex, profile);
    if (!res.ok) {
      soundEngine.playUiClick();
      showQuickNotice(res.reason || 'Koin Aether belum mencukupi.');
      return;
    }
    soundEngine.playVictory();
    onUpdateProfile(res.profile);
    setActiveClip('victory');
    showQuickNotice(
      `Selamat! Pion "${arch.title}" berhasil dibeli & langsung dipasang.`,
    );
    onNotify?.(
      `Pion Baru Terbuka: ${arch.title}`,
      `Menggunakan ${arch.priceCoins.toLocaleString('id-ID')} Koin Aether`,
    );
  };

  return (
    <div className="flex-1 flex flex-col lg:grid lg:grid-cols-12 lg:grid-rows-[minmax(0,1fr)] min-h-0 overflow-hidden">
      {/* Left Catalog Column (7 cols on desktop, scrollable list) */}
      <div className="order-2 lg:order-1 flex-1 lg:col-span-7 lg:h-full flex flex-col min-h-0 border-r border-slate-800/80 bg-slate-950/95 overflow-y-auto custom-scroll p-3 sm:p-4 space-y-3.5">
        {/* Top Summary & Filter Segmented Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/75 p-3.5">
          <div className="min-w-0">
            <h2 className="font-display text-sm sm:text-base font-bold text-amber-300">
              Galeri &amp; Toko Pion Pahlawan 3D
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
              <span>{ownedCount} dari {PLAYER_ARCHETYPES.length} pion dimiliki</span>
              <span aria-hidden="true"> · </span>
              <span>Putar model 3D 360° di panel pratinjau sebelum membeli</span>
            </p>
          </div>

          <div className="inline-flex items-center rounded-xl border border-slate-800 bg-slate-950 p-1">
            {(
              [
                { id: 'all', label: `Semua (${PLAYER_ARCHETYPES.length})` },
                { id: 'shop', label: 'Toko Pion (10)' },
                { id: 'owned', label: `Dimiliki (${ownedCount})` },
              ] as Array<{ id: PawnFilterTab; label: string }>
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  soundEngine.playUiClick();
                  setFilterTab(tab.id);
                }}
                className={`inline-flex items-center justify-center min-h-[32px] px-3 py-1 rounded-lg text-[11px] sm:text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  filterTab === tab.id
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Pawn Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-stretch">
          {filteredPawns.map((arch) => {
            const unlocked = isPawnUnlocked(
              arch.archetypeIndex,
              profile.unlockedPawnIndices,
            );
            const equipped = profile.archetypeIndex === arch.archetypeIndex;
            const selected = selectedPawn.archetypeIndex === arch.archetypeIndex;
            const rarity = RARITY_META[arch.rarity];

            return (
              <div
                key={arch.archetypeIndex}
                onClick={() => {
                  soundEngine.playUiClick();
                  setSelectedIdx(arch.archetypeIndex);
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    soundEngine.playUiClick();
                    setSelectedIdx(arch.archetypeIndex);
                  }
                }}
                className={`group h-full rounded-2xl border p-3.5 transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                  selected
                    ? 'border-amber-400/80 bg-slate-900 shadow-lg ring-1 ring-amber-400/35'
                    : equipped
                      ? 'border-emerald-500/45 bg-slate-900/80 hover:border-amber-400/50'
                      : 'border-slate-800 bg-slate-900/55 hover:border-slate-700 hover:bg-slate-900/85'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className="w-11 h-11 rounded-xl border flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: `${arch.color}22`,
                      borderColor: `${arch.accentColor}55`,
                    }}
                  >
                    <ArchetypeEmblem
                      archetypeIndex={arch.archetypeIndex}
                      className="w-6 h-6"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-display text-sm font-bold text-white truncate">
                        {arch.title}
                      </h3>
                      {equipped ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 shrink-0 whitespace-nowrap">
                          <Check className="w-3.5 h-3.5" />
                          Dipakai
                        </span>
                      ) : unlocked ? (
                        <span className="text-[11px] font-semibold text-slate-300 shrink-0 whitespace-nowrap">
                          Dimiliki
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-mono-num text-[11px] font-bold text-amber-300 shrink-0 whitespace-nowrap">
                          <Lock className="w-3 h-3" />
                          {arch.priceCoins.toLocaleString('id-ID')} Koin
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                      <span className={`font-semibold ${rarity.textClass}`}>
                        {rarity.label}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="truncate">{arch.role}</span>
                    </div>

                    <p className="text-xs text-slate-300 line-clamp-2 mt-1.5 leading-relaxed">
                      {arch.description}
                    </p>
                  </div>
                </div>

                {/* Card Quick Actions */}
                <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      soundEngine.playUiClick();
                      setSelectedIdx(arch.archetypeIndex);
                    }}
                    className={`inline-flex items-center justify-center min-h-[36px] px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                      selected
                        ? 'border-amber-400/60 bg-amber-500/15 text-amber-200'
                        : 'border-slate-700 bg-slate-950/70 text-slate-300 hover:text-white'
                    }`}
                  >
                    {selected ? 'Sedang Diinspeksi' : 'Inspeksi 3D'}
                  </button>

                  {equipped ? (
                    <span className="inline-flex items-center justify-center gap-1 min-h-[36px] text-[11px] font-bold text-emerald-300 px-2 whitespace-nowrap">
                      <UserCheck className="w-3.5 h-3.5 shrink-0" />
                      Aktif di Arena
                    </span>
                  ) : unlocked ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedIdx(arch.archetypeIndex);
                        handleEquipPawn(arch);
                      }}
                      className="inline-flex items-center justify-center min-h-[36px] px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition-colors cursor-pointer whitespace-nowrap"
                    >
                      Pasang Pion
                    </button>
                  ) : isUnlimitedCoins || currentCoins >= arch.priceCoins ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedIdx(arch.archetypeIndex);
                        handleBuyPawn(arch);
                      }}
                      className="inline-flex items-center justify-center gap-1.5 min-h-[36px] px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-xs font-bold text-slate-950 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {isUnlimitedCoins
                          ? 'Buka Gratis (∞)'
                          : `Beli (${arch.priceCoins.toLocaleString('id-ID')})`}
                      </span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedIdx(arch.archetypeIndex);
                        onOpenTopUpChat(arch.title);
                      }}
                      className="inline-flex items-center justify-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg border border-amber-500/45 bg-amber-950/40 hover:bg-amber-900/50 text-[11px] font-bold text-amber-200 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <Coins className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Isi Koin</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Column: Interactive 3D Pawn Orbit Showcase Mini-Canvas */}
      <div className="order-1 lg:order-2 lg:col-span-5 lg:h-full lg:min-h-0 relative flex flex-col shrink-0 h-[310px] sm:h-[360px] border-b lg:border-b-0 border-amber-500/25 bg-slate-950 overflow-hidden">
        {/* Isolated WebGL Container (no backdrop-blur over WebGL) */}
        <div ref={canvasMountRef} className="relative flex-1 w-full h-full min-h-0 overflow-hidden" />

        {webglLost && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/95 px-4 text-center">
            <p className="text-xs font-bold text-rose-300 mb-2">
              Konteks WebGL 3D sempat terputus.
            </p>
            <button
              type="button"
              onClick={() => setMountKey((k) => k + 1)}
              className="rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 cursor-pointer"
            >
              Muat Ulang Pratinjau 3D
            </button>
          </div>
        )}

        {/* Top HUD: Pawn Identity + Orbit/Reset Controls */}
        <div className="pointer-events-none absolute top-3 left-3 right-3 z-10 flex items-start justify-between gap-2">
          <div className="pointer-events-auto rounded-xl border border-amber-500/35 bg-slate-950/92 px-3.5 py-2 max-w-[64%]">
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span className={`font-bold ${RARITY_META[selectedPawn.rarity].textClass}`}>
                {RARITY_META[selectedPawn.rarity].label}
              </span>
              <span aria-hidden="true">·</span>
              <span className="truncate">{selectedPawn.role}</span>
            </div>
            <div className="font-display text-sm sm:text-base font-bold text-white truncate mt-0.5">
              {selectedPawn.title}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Seret untuk putar 360° · Scroll untuk perbesar
            </div>
          </div>

          <div className="pointer-events-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setAutoRotate((v) => !v)}
              title={autoRotate ? 'Jeda Putar Otomatis' : 'Aktifkan Putar Otomatis'}
              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition-colors cursor-pointer whitespace-nowrap ${
                autoRotate
                  ? 'border-amber-400/60 bg-amber-500/20 text-amber-200'
                  : 'border-slate-700 bg-slate-950/92 text-slate-300 hover:text-white'
              }`}
            >
              {autoRotate ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{autoRotate ? 'Putar' : 'Jeda'}</span>
            </button>
            <button
              type="button"
              onClick={() => engineRef.current?.resetCamera()}
              title="Reset Sudut Kamera"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-950/92 px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 hover:border-amber-400/50 hover:text-amber-200 transition-colors cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          </div>
        </div>

        {/* Bottom Dock: Animation Tester + Buy / Equip Action */}
        <div className="pointer-events-auto border-t border-slate-800/90 bg-slate-950/95 px-3.5 py-3 space-y-2.5">
          {/* Animation Clips */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto">
            <span className="text-[11px] font-semibold text-slate-400 shrink-0">
              Animasi:
            </span>
            <div className="inline-flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 p-0.5">
              {ANIMATION_CLIPS.map((clip) => (
                <button
                  key={clip.id}
                  type="button"
                  onClick={() => setActiveClip(clip.id)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer whitespace-nowrap ${
                    activeClip === clip.id
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {clip.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description + Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1 border-t border-slate-800/70">
            <div className="min-w-0">
              <p className="text-[11px] text-slate-300 line-clamp-2 leading-snug">
                {selectedPawn.description}
              </p>
              {!isSelectedUnlocked && !canAffordSelected && (
                <p className="text-[11px] text-rose-300 font-semibold mt-0.5">
                  Butuh {shortfallCoins.toLocaleString('id-ID')} Koin lagi (Saldo:{' '}
                  {currentCoins.toLocaleString('id-ID')})
                </p>
              )}
            </div>

            <div className="shrink-0 flex items-center gap-2">
              {isSelectedEquipped ? (
                <div className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/50 bg-emerald-950/60 px-4 py-2 text-xs font-bold text-emerald-300 whitespace-nowrap">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Pion Sedang Dipakai</span>
                </div>
              ) : isSelectedUnlocked ? (
                <button
                  type="button"
                  onClick={() => handleEquipPawn(selectedPawn)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 px-4 py-2 text-xs font-bold text-slate-950 transition-colors cursor-pointer whitespace-nowrap shadow-md"
                >
                  <Check className="w-4 h-4" />
                  <span>Pasang Pion Ini</span>
                </button>
              ) : canAffordSelected ? (
                <button
                  type="button"
                  onClick={() => handleBuyPawn(selectedPawn)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2 text-xs font-bold text-slate-950 transition-colors cursor-pointer whitespace-nowrap shadow-md"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>
                    {isUnlimitedCoins
                      ? 'Buka Pion (∞ Unlimited)'
                      : `Beli Pion (${selectedPawn.priceCoins.toLocaleString('id-ID')} Koin)`}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onOpenTopUpChat(selectedPawn.title)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2 text-xs font-bold text-slate-950 transition-colors cursor-pointer whitespace-nowrap shadow-md"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Beli Koin via Admin</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {feedbackToast && (
          <div className="pointer-events-none absolute bottom-28 left-3 right-3 z-20 flex justify-center">
            <div className="rounded-xl border border-emerald-400/60 bg-slate-950/95 px-3.5 py-1.5 text-xs font-bold text-emerald-300 shadow-xl text-center">
              {feedbackToast}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
