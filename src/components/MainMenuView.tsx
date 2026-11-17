import React, { useState } from 'react';
import {
  Award,
  BookOpen,
  Check,
  Clock,
  Cloud,
  DoorOpen,
  Flame,
  Globe,
  Layers,
  LogOut,
  Menu,
  PlusSquare,
  Settings,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Swords,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  Wand2,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import {
  BOARD_GAME_MODES,
  PLAYER_ARCHETYPES,
  type BoardGameMode,
} from '../../shared/gameConfig';
import type { PlayerProfile } from '../services/storageService';
import { ArchetypeEmblem, SerpentCrestEmblem } from './FantasyIcons';

interface MainMenuViewProps {
  profile: PlayerProfile;
  user: User | null;
  isOnline: boolean;
  onUpdateProfile: (name: string, archetypeIndex: number) => void;
  onToggleMute: () => void;
  onOpenCameraSettings: () => void;
  onOpenAuth: (tab: 'login' | 'register') => void;
  onBackToLanding: () => void;
  onLogout: () => void;
  onNavigateModeSelection: () => void;
  onQuickSelectMode: (mode: BoardGameMode) => void;
  onOpenMultiplayer: (tab: 'create' | 'join') => void;
  onOpenTutorial: () => void;
  onOpenLeaderboard: () => void;
  onOpenAchievements: () => void;
  onOpenCloud: () => void;
  onOpenBoardManager: (tab?: 'collection' | 'creator') => void;
  onOpenOracleAI?: () => void;
}

const MODE_STYLE: Record<
  BoardGameMode,
  { icon: React.ReactNode; accent: string; badge: string }
> = {
  classic: {
    icon: <Shield className="w-4 h-4 text-amber-300 shrink-0" />,
    accent: 'hover:border-amber-400/60',
    badge: 'Klasik',
  },
  battle: {
    icon: <Swords className="w-4 h-4 text-rose-400 shrink-0" />,
    accent: 'hover:border-rose-400/60',
    badge: 'Duel',
  },
  team: {
    icon: <Users className="w-4 h-4 text-sky-400 shrink-0" />,
    accent: 'hover:border-sky-400/60',
    badge: '2v2',
  },
  time_attack: {
    icon: <Clock className="w-4 h-4 text-emerald-400 shrink-0" />,
    accent: 'hover:border-emerald-400/60',
    badge: 'Cepat',
  },
};

export const MainMenuView: React.FC<MainMenuViewProps> = ({
  profile,
  user,
  isOnline,
  onUpdateProfile,
  onToggleMute,
  onOpenCameraSettings,
  onOpenAuth,
  onBackToLanding,
  onLogout,
  onNavigateModeSelection,
  onQuickSelectMode,
  onOpenMultiplayer,
  onOpenTutorial,
  onOpenLeaderboard,
  onOpenAchievements,
  onOpenCloud,
  onOpenBoardManager,
  onOpenOracleAI,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editName, setEditName] = useState(profile.name);
  const [editArch, setEditArch] = useState(profile.archetypeIndex);
  const [savedFeedback, setSavedFeedback] = useState(false);

  const openSidebar = () => {
    setEditName(profile.name);
    setEditArch(profile.archetypeIndex);
    setSavedFeedback(false);
    setSidebarOpen(true);
  };

  const handleSaveProfileInline = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = editName.trim() || 'Penjelajah Aether';
    onUpdateProfile(cleanName, editArch);
    setSavedFeedback(true);
    window.setTimeout(() => setSavedFeedback(false), 1800);
  };

  const activeArchetype =
    PLAYER_ARCHETYPES[profile.archetypeIndex % PLAYER_ARCHETYPES.length];

  return (
    <div className="relative z-10 flex flex-col w-full h-full justify-start lg:justify-between safe-page-scroll pointer-events-none overflow-y-auto custom-scroll">
      {/* Top Bar: Mobile shows ONLY precise Brand Title + Sidebar Menu button */}
      <header className="pointer-events-auto flex items-center justify-between gap-2.5 shrink-0">
        {/* Brand Title */}
        <div className="glass-panel-soft rounded-2xl px-3 sm:px-4 py-2 sm:py-2.5 flex items-center gap-2.5 sm:gap-3 min-w-0">
          <SerpentCrestEmblem className="w-9 h-9 sm:w-12 sm:h-12 shrink-0" />
          <div className="min-w-0">
            <h1 className="font-display text-sm sm:text-xl font-bold text-gold-gradient leading-tight truncate">
              Aether Serpent 3D
            </h1>
            <p className="hidden sm:block text-[11px] text-slate-300/90 tracking-wide truncate">
              Arena Ular Tangga Fantasi 3D
            </p>
          </div>
        </div>

        {/* Right Controls: Account + Menu */}
        <div className="flex items-center gap-2 shrink-0">
          {!user && (
            <button
              type="button"
              onClick={() => onOpenAuth('login')}
              className="hidden sm:inline-flex glass-panel-soft items-center justify-center gap-1.5 min-h-[44px] px-3.5 py-2 rounded-xl border border-amber-400/40 bg-amber-500/10 text-xs font-bold text-amber-200 hover:bg-amber-500/20 transition-colors cursor-pointer whitespace-nowrap"
            >
              <span>Masuk / Daftar</span>
            </button>
          )}

          {/* Desktop-only quick profile summary */}
          <button
            type="button"
            onClick={openSidebar}
            className="hidden lg:inline-flex glass-panel-soft items-center gap-2.5 min-h-[44px] px-3.5 py-1.5 rounded-xl hover:border-amber-400/50 transition-colors cursor-pointer text-left"
            title="Buka Sidebar Profil & Pengaturan"
          >
            <ArchetypeEmblem archetypeIndex={profile.archetypeIndex} className="w-5 h-5 shrink-0" />
            <div className="text-xs">
              <div className="font-bold text-white truncate max-w-[140px]">{profile.name}</div>
              <div className="text-[11px] font-mono-num text-amber-300/90">
                {user ? (user.emailVerified ? 'Akun Cloud Aktif' : 'Perlu Verifikasi') : `${profile.wins} Menang · ${profile.bestScore.toLocaleString('id-ID')}`}
              </div>
            </div>
          </button>

          {/* Desktop-only Oracle AI shortcut */}
          {onOpenOracleAI && (
            <button
              type="button"
              onClick={onOpenOracleAI}
              className="hidden md:inline-flex glass-panel-soft items-center justify-center gap-1.5 min-h-[44px] px-3.5 py-2 rounded-xl border border-amber-400/45 bg-amber-500/15 text-xs font-bold text-amber-200 hover:bg-amber-500/25 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Oracle AI</span>
            </button>
          )}

          {/* Universal Sidebar Trigger (Primary top-right button on mobile) */}
          <button
            type="button"
            onClick={openSidebar}
            aria-label="Buka Menu Samping & Pengaturan"
            className="glass-panel-soft inline-flex items-center justify-center gap-2 min-h-[44px] min-w-[44px] px-3 sm:px-3.5 py-2 rounded-xl border border-amber-500/35 text-xs font-semibold text-slate-100 hover:border-amber-400/60 hover:text-amber-200 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Menu className="w-4 h-4 text-amber-300 shrink-0" />
            <span className="text-xs font-bold">Menu</span>
          </button>
        </div>
      </header>

      {/* Main Content: Anchored closely below header with elegant breathing room and balanced bottom fill */}
      <main className="flex-1 flex flex-col lg:flex-row items-stretch justify-between gap-3 lg:gap-6 mt-1.5 sm:mt-2 mb-1">
        {/* Desktop-only subtle caption leaving 3D dragon unobstructed */}
        <div className="hidden lg:flex flex-col justify-end self-end mr-auto max-w-sm pb-1 pointer-events-none">
          <div className="glass-panel-soft rounded-2xl px-4 py-3 border border-slate-800/80">
            <div className="text-[11px] font-semibold text-amber-300">
              Penjaga Lembah Aether
            </div>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Pilih mode permainan, rancang papan 3D kustom, atau tantang sahabat secara daring.
            </p>
          </div>
        </div>

        {/* Right Command Hub Card: Tighter top margin right below title header, balanced bottom fill */}
        <section className="pointer-events-auto flex-1 flex flex-col justify-between w-full max-w-xl lg:max-w-[450px] mx-auto lg:mx-0 glass-panel rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 gap-3 sm:gap-3.5 shrink-0">
          <div className="space-y-2.5 sm:space-y-3">
            <div className="flex items-center justify-between gap-2 min-w-0">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <SerpentCrestEmblem className="w-10 h-10 sm:w-12 sm:h-12 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] sm:text-[11px] font-semibold text-amber-300/90 truncate">
                    Gerbang Petualangan
                  </div>
                  <h2 className="font-display text-base sm:text-2xl font-bold text-white truncate">
                    Menu Permainan
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={openSidebar}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/80 px-2.5 py-1.5 text-xs text-slate-300 hover:border-amber-400/40 hover:text-amber-200 transition-colors cursor-pointer shrink-0 max-w-[44%]"
                title="Ubah Nama & Bidak di Sidebar"
              >
                <ArchetypeEmblem archetypeIndex={profile.archetypeIndex} className="w-4 h-4 shrink-0" />
                <span className="font-semibold text-amber-200 truncate">
                  {profile.name}
                </span>
              </button>
            </div>

            {profile.loginStreak >= 2 && (
              <div
                className="flex items-center justify-between gap-2 rounded-xl border border-amber-400/40 bg-amber-500/12 px-3 py-1.5 text-xs text-amber-200"
                title={`Anda telah login ${profile.loginStreak} hari berturut-turut`}
              >
                <span className="inline-flex items-center gap-1.5 font-bold">
                  <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Daily Streak</span>
                </span>
                <span className="font-mono-num font-bold text-amber-300">
                  {profile.loginStreak} Hari Beruntun
                </span>
              </div>
            )}

            {/* Primary CTA: Select Game Mode */}
            <button
              type="button"
              onClick={onNavigateModeSelection}
              className="w-full min-h-[46px] sm:min-h-[50px] inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-base font-bold text-slate-950 shadow-lg hover:brightness-105 active:scale-[0.99] transition-all cursor-pointer whitespace-nowrap"
            >
              <SlidersHorizontal className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              <span>Pilih Mode Permainan</span>
            </button>
          </div>

          {/* 4 Quick Game Modes: Responsive 2x2 on phone/desktop, 4x1 option on wide tablet */}
          <div className="flex-1 flex flex-col justify-center space-y-2 min-h-0">
            <div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-300">
              <span className="truncate">Mode Cepat</span>
              <span className="text-[10px] sm:text-[11px] font-mono-num text-amber-300/90 shrink-0">
                {profile.wins} Menang · Skor {profile.bestScore.toLocaleString('id-ID')}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2 sm:gap-2.5 flex-1">
              {BOARD_GAME_MODES.map((m) => {
                const st = MODE_STYLE[m.id];
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onQuickSelectMode(m.id)}
                    className={`min-w-0 overflow-hidden rounded-xl border border-slate-800 bg-slate-900/80 p-2.5 sm:p-3.5 text-left flex flex-col justify-between transition-all hover:bg-slate-800/90 ${st.accent} cursor-pointer group`}
                  >
                    <div className="flex items-center justify-between gap-1 min-w-0">
                      <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-white group-hover:text-amber-200 min-w-0 truncate">
                        {st.icon}
                        <span className="truncate">{m.label.replace(' Mode', '')}</span>
                      </span>
                      <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded bg-slate-950/70 text-slate-300 shrink-0">
                        {st.badge}
                      </span>
                    </div>
                    <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1.5 line-clamp-2 leading-snug">
                      {m.shortDesc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2.5 sm:space-y-3 pt-2.5 border-t border-slate-800/80 shrink-0">
            {/* Multiplayer Daring & Dunia Papan 3D */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2 sm:gap-2.5">
              <button
                type="button"
                onClick={() => onOpenMultiplayer('create')}
                className="min-w-0 inline-flex items-center justify-center gap-1.5 min-h-[42px] sm:min-h-[46px] px-2.5 sm:px-3 py-2 rounded-xl border border-amber-500/35 bg-amber-500/10 text-[11px] sm:text-xs font-bold text-amber-200 hover:bg-amber-500/20 transition-colors cursor-pointer"
              >
                <PlusSquare className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span className="truncate">Buat Room</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenMultiplayer('join')}
                className="min-w-0 inline-flex items-center justify-center gap-1.5 min-h-[42px] sm:min-h-[46px] px-2.5 sm:px-3 py-2 rounded-xl border border-sky-500/35 bg-sky-500/10 text-[11px] sm:text-xs font-bold text-sky-200 hover:bg-sky-500/20 transition-colors cursor-pointer"
              >
                <DoorOpen className="w-3.5 h-3.5 text-sky-300 shrink-0" />
                <span className="truncate">Gabung Room</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenBoardManager('collection')}
                className="min-w-0 inline-flex items-center justify-center gap-1.5 min-h-[42px] sm:min-h-[46px] px-2.5 sm:px-3 py-2 rounded-xl border border-emerald-500/35 bg-emerald-500/10 text-[11px] sm:text-xs font-bold text-emerald-200 hover:bg-emerald-500/20 transition-colors cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                <span className="truncate">Koleksi Papan</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenBoardManager('creator')}
                className="min-w-0 inline-flex items-center justify-center gap-1.5 min-h-[42px] sm:min-h-[46px] px-2.5 sm:px-3 py-2 rounded-xl border border-cyan-500/35 bg-cyan-500/10 text-[11px] sm:text-xs font-bold text-cyan-200 hover:bg-cyan-500/20 transition-colors cursor-pointer"
              >
                <Wand2 className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
                <span className="truncate">Buat Papan 3D</span>
              </button>
            </div>

            {/* Card Footer Credit */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 text-[10px] sm:text-[11px] text-slate-400">
              <span className="truncate">Aether Serpent 3D</span>
              <span className="shrink-0">
                Developed By{' '}
                <a
                  href="https://portfolionyaihwal.my.id"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-amber-300 hover:text-amber-200 underline underline-offset-2 transition-colors"
                >
                  WalZetass
                </a>
              </span>
            </div>
          </div>
        </section>
      </main>

      {/* Slide-Out Sidebar Drawer (Holds Name/Profile Editor, AI Assistant, Leaderboard, Quests, Cloud & Settings) */}
      {sidebarOpen && (
        <div className="pointer-events-auto fixed inset-0 z-50 flex justify-end bg-slate-950/65 backdrop-blur-xs">
          <aside className="relative flex h-full w-full max-w-[360px] flex-col border-l border-slate-800 bg-slate-950/98 shadow-2xl overflow-y-auto custom-scroll">
            {/* Sidebar Header */}
            <div className="flex items-center justify-between border-b border-slate-800/90 px-5 py-4">
              <div className="flex items-center gap-2.5 min-w-0">
                <SerpentCrestEmblem className="w-6 h-6 shrink-0" />
                <div className="min-w-0">
                  <h3 className="font-display text-sm font-bold text-amber-200 truncate">
                    Profil & Pengaturan
                  </h3>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    {isOnline ? (
                      <Wifi className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <WifiOff className="w-3 h-3 text-amber-400" />
                    )}
                    <span>{isOnline ? 'Terhubung' : 'Mode Offline'}</span>
                    <span>·</span>
                    <span>{activeArchetype.title}</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                aria-label="Tutup Menu Samping"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-6 flex-1">
              {/* 0. Akun Firebase Login / Daftar */}
              <div className="rounded-2xl border border-amber-500/25 bg-slate-900/80 p-3.5 space-y-2.5">
                {user ? (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">
                          {user.displayName || profile.name}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">{user.email}</div>
                      </div>
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-bold shrink-0 ${
                          user.emailVerified
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {user.emailVerified ? 'Cloud Aktif' : 'Belum Verifikasi'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSidebarOpen(false);
                        onOpenAuth('login');
                      }}
                      className="w-full rounded-xl border border-slate-700 bg-slate-800/90 py-2 text-xs font-semibold text-slate-200 hover:border-amber-400/50 cursor-pointer"
                    >
                      Kelola Akun & Verifikasi
                    </button>
                  </>
                ) : (
                  <>
                    <div className="text-xs text-slate-300 leading-relaxed">
                      Masuk dengan <span className="font-semibold text-amber-200">Google / Email</span> untuk menyimpan progres di semua perangkat.
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSidebarOpen(false);
                          onOpenAuth('login');
                        }}
                        className="rounded-xl bg-amber-400 py-2 text-xs font-bold text-slate-950 hover:bg-amber-300 cursor-pointer"
                      >
                        Masuk
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSidebarOpen(false);
                          onOpenAuth('register');
                        }}
                        className="rounded-xl border border-amber-400/40 bg-amber-500/10 py-2 text-xs font-bold text-amber-200 hover:bg-amber-500/20 cursor-pointer"
                      >
                        Daftar Baru
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* 1. Pengaturan Nama & Bidak Pemain */}
              <form onSubmit={handleSaveProfileInline} className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-200">
                    Nama Pemain & Bidak
                  </label>
                  <span className="font-mono-num text-[11px] text-amber-300">
                    {profile.wins} Menang · Rekor {profile.bestScore.toLocaleString('id-ID')}
                  </span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={24}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Nama pemain..."
                    className="flex-1 min-h-[42px] rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-1.5 min-h-[42px] px-3.5 rounded-xl bg-amber-400 text-slate-950 text-xs font-bold hover:bg-amber-300 transition-colors cursor-pointer shrink-0"
                  >
                    {savedFeedback ? <Check className="w-4 h-4" /> : null}
                    <span>{savedFeedback ? 'Tersimpan' : 'Simpan'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  {PLAYER_ARCHETYPES.map((arch) => (
                    <button
                      key={arch.archetypeIndex}
                      type="button"
                      onClick={() => {
                        setEditArch(arch.archetypeIndex);
                        onUpdateProfile(editName.trim() || profile.name, arch.archetypeIndex);
                      }}
                      className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-colors cursor-pointer ${
                        editArch === arch.archetypeIndex
                          ? 'border-amber-400/80 bg-amber-500/15 text-amber-100'
                          : 'border-slate-800 bg-slate-900/70 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <ArchetypeEmblem
                        archetypeIndex={arch.archetypeIndex}
                        className="w-4 h-4 shrink-0"
                      />
                      <span className="text-xs font-medium truncate">{arch.title}</span>
                    </button>
                  ))}
                </div>
              </form>

              {/* 2. Asisten Strategi Oracle Aether AI */}
              {onOpenOracleAI && (
                <div className="space-y-2 pt-4 border-t border-slate-800/80">
                  <div className="text-xs font-semibold text-slate-300">Asisten Pintar AI</div>
                  <button
                    type="button"
                    onClick={() => {
                      setSidebarOpen(false);
                      onOpenOracleAI();
                    }}
                    className="w-full flex items-center justify-between min-h-[48px] px-4 py-2.5 rounded-2xl border border-amber-400/45 bg-amber-500/12 text-left hover:bg-amber-500/20 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-amber-200 truncate">
                          Buka Oracle Aether AI
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          Tanya peluang dadu, strategi & lore papan
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-amber-300 shrink-0">Chat</span>
                  </button>
                </div>
              )}

              {/* 3. Menu Progres, Peringkat & Panduan */}
              <div className="space-y-2 pt-4 border-t border-slate-800/80">
                <div className="text-xs font-semibold text-slate-300">Fitur & Progres</div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSidebarOpen(false);
                      onOpenLeaderboard();
                    }}
                    className="flex items-center gap-2 min-h-[44px] px-3 py-2 rounded-xl border border-slate-800 bg-slate-900/80 text-xs font-semibold text-slate-200 hover:border-amber-400/50 cursor-pointer"
                  >
                    <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="truncate">Leaderboard</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSidebarOpen(false);
                      onOpenAchievements();
                    }}
                    className="flex items-center gap-2 min-h-[44px] px-3 py-2 rounded-xl border border-slate-800 bg-slate-900/80 text-xs font-semibold text-slate-200 hover:border-emerald-400/50 cursor-pointer"
                  >
                    <Award className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="truncate">Misi & Dadu</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSidebarOpen(false);
                      onOpenCloud();
                    }}
                    className="flex items-center gap-2 min-h-[44px] px-3 py-2 rounded-xl border border-slate-800 bg-slate-900/80 text-xs font-semibold text-slate-200 hover:border-sky-400/50 cursor-pointer"
                  >
                    <Cloud className="w-4 h-4 text-sky-400 shrink-0" />
                    <span className="truncate">Sinkron Awan</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSidebarOpen(false);
                      onOpenTutorial();
                    }}
                    className="flex items-center gap-2 min-h-[44px] px-3 py-2 rounded-xl border border-slate-800 bg-slate-900/80 text-xs font-semibold text-slate-200 hover:border-amber-400/50 cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4 text-amber-300 shrink-0" />
                    <span className="truncate">Tutorial</span>
                  </button>
                </div>
              </div>

              {/* 4. Pengaturan Perangkat & Grafis */}
              <div className="space-y-2 pt-4 border-t border-slate-800/80">
                <div className="text-xs font-semibold text-slate-300">Pengaturan Sistem</div>
                <button
                  type="button"
                  onClick={onToggleMute}
                  className="w-full flex items-center justify-between min-h-[44px] px-3.5 rounded-xl border border-slate-800 bg-slate-900/80 text-xs font-semibold text-slate-200 hover:border-amber-400/40 cursor-pointer"
                >
                  <span className="inline-flex items-center gap-2.5">
                    {profile.muted ? (
                      <VolumeX className="w-4 h-4 text-rose-400" />
                    ) : (
                      <Volume2 className="w-4 h-4 text-emerald-400" />
                    )}
                    Efek Suara & Musik
                  </span>
                  <span className={profile.muted ? 'text-rose-300' : 'text-emerald-300'}>
                    {profile.muted ? 'Nonaktif' : 'Aktif'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSidebarOpen(false);
                    onOpenCameraSettings();
                  }}
                  className="w-full flex items-center justify-between min-h-[44px] px-3.5 rounded-xl border border-slate-800 bg-slate-900/80 text-xs font-semibold text-slate-200 hover:border-amber-400/40 cursor-pointer"
                >
                  <span className="inline-flex items-center gap-2.5">
                    <Settings className="w-4 h-4 text-amber-400" />
                    Kamera & Kualitas Grafis 3D
                  </span>
                  <span className="text-amber-300">Atur</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSidebarOpen(false);
                    onBackToLanding();
                  }}
                  className="w-full flex items-center justify-between min-h-[44px] px-3.5 rounded-xl border border-slate-800 bg-slate-900/80 text-xs font-semibold text-slate-200 hover:border-amber-400/40 cursor-pointer"
                >
                  <span className="inline-flex items-center gap-2.5">
                    <Globe className="w-4 h-4 text-sky-400" />
                    Halaman Utama (Landing Page)
                  </span>
                  <span className="text-sky-300">Buka</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSidebarOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center justify-between min-h-[44px] px-3.5 rounded-xl border border-rose-500/25 bg-rose-950/20 text-xs font-semibold text-rose-200 hover:border-rose-400/50 cursor-pointer"
                >
                  <span className="inline-flex items-center gap-2.5">
                    <LogOut className="w-4 h-4 text-rose-400" />
                    {user ? 'Keluar Akun & Reset Sesi' : 'Reset / Ganti Sesi Profil'}
                  </span>
                  <span className="text-rose-300">Keluar</span>
                </button>
              </div>
            </div>

            <footer className="px-5 py-3 border-t border-slate-800/90 bg-slate-950 text-center text-[11px] text-slate-400">
              Developed By{' '}
              <a
                href="https://portfolionyaihwal.my.id"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-amber-300 hover:text-amber-200 underline underline-offset-2 transition-colors"
              >
                WalZetass
              </a>
            </footer>
          </aside>
        </div>
      )}
    </div>
  );
};
