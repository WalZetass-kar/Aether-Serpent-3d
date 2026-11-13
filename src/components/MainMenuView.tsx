import React, { useState } from 'react';
import {
  Award,
  BookOpen,
  Clock,
  Cloud,
  DoorOpen,
  Edit3,
  Globe,
  LogOut,
  PlusSquare,
  Settings,
  Shield,
  SlidersHorizontal,
  Swords,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import {
  BOARD_GAME_MODES,
  PLAYER_ARCHETYPES,
  type BoardGameMode,
} from '../../shared/gameConfig';
import type { PlayerProfile } from '../services/storageService';
import { ArchetypeEmblem, CrownVictoryEmblem, SerpentCrestEmblem } from './FantasyIcons';

interface MainMenuViewProps {
  profile: PlayerProfile;
  isOnline: boolean;
  onUpdateProfile: (name: string, archetypeIndex: number) => void;
  onToggleMute: () => void;
  onOpenCameraSettings: () => void;
  onLogout: () => void;
  onNavigateModeSelection: () => void;
  onQuickSelectMode: (mode: BoardGameMode) => void;
  onOpenMultiplayer: (tab: 'create' | 'join') => void;
  onOpenTutorial: () => void;
  onOpenLeaderboard: () => void;
  onOpenAchievements: () => void;
  onOpenCloud: () => void;
}

const MODE_STYLE: Record<
  BoardGameMode,
  { icon: React.ReactNode; accent: string; badge: string }
> = {
  classic: {
    icon: <Shield className="w-4 h-4 text-amber-300" />,
    accent: 'hover:border-amber-400/60',
    badge: 'Klasik',
  },
  battle: {
    icon: <Swords className="w-4 h-4 text-rose-400" />,
    accent: 'hover:border-rose-400/60',
    badge: 'Kompetitif',
  },
  team: {
    icon: <Users className="w-4 h-4 text-sky-400" />,
    accent: 'hover:border-sky-400/60',
    badge: '2v2 Tim',
  },
  time_attack: {
    icon: <Clock className="w-4 h-4 text-emerald-400" />,
    accent: 'hover:border-emerald-400/60',
    badge: 'Cepat',
  },
};

export const MainMenuView: React.FC<MainMenuViewProps> = ({
  profile,
  isOnline,
  onUpdateProfile,
  onToggleMute,
  onOpenCameraSettings,
  onLogout,
  onNavigateModeSelection,
  onQuickSelectMode,
  onOpenMultiplayer,
  onOpenTutorial,
  onOpenLeaderboard,
  onOpenAchievements,
  onOpenCloud,
}) => {
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editName, setEditName] = useState(profile.name);
  const [editArch, setEditArch] = useState(profile.archetypeIndex);

  const openProfileEditor = () => {
    setEditName(profile.name);
    setEditArch(profile.archetypeIndex);
    setProfileModalOpen(true);
  };

  const activeArchetype =
    PLAYER_ARCHETYPES[profile.archetypeIndex % PLAYER_ARCHETYPES.length];

  return (
    <div className="relative z-10 flex flex-col w-full h-full justify-between p-4 sm:p-6 lg:px-10 lg:py-7 pointer-events-none overflow-y-auto custom-scroll">
      {/* Top Navigation & Profile Strip */}
      <header className="pointer-events-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand Crest */}
        <div className="glass-panel-soft rounded-2xl px-4 py-2.5 flex items-center gap-3">
          <SerpentCrestEmblem className="w-9 h-9 shrink-0" />
          <div>
            <h1 className="font-display text-base sm:text-xl font-bold text-gold-gradient leading-tight">
              Aether Serpent 3D
            </h1>
            <p className="text-[11px] text-slate-300/90 tracking-wide">
              Arena Ular Tangga Fantasi 3D
            </p>
          </div>
        </div>

        {/* Profile, Online Status, Settings & Logout */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Player Profile Pill */}
          <button
            type="button"
            onClick={openProfileEditor}
            className="glass-panel-soft inline-flex items-center gap-2.5 min-h-[44px] px-3.5 py-1.5 rounded-xl hover:border-amber-400/50 transition-colors cursor-pointer text-left"
            title="Ubah Profil & Bidak Pahlawan"
          >
            <div className="w-8 h-8 rounded-lg border border-amber-500/35 bg-slate-950/80 flex items-center justify-center shrink-0">
              <ArchetypeEmblem archetypeIndex={profile.archetypeIndex} className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-white truncate max-w-[140px]">
                <span className="truncate">{profile.name}</span>
                <Edit3 className="w-3 h-3 text-amber-300 shrink-0" />
              </div>
              <div className="text-[11px] font-mono-num text-amber-300/90 whitespace-nowrap">
                {profile.wins} Menang · Rekor {profile.bestScore.toLocaleString('id-ID')}
              </div>
            </div>
          </button>

          {/* Network Status */}
          <div
            className={`glass-panel-soft inline-flex items-center gap-1.5 min-h-[44px] px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap ${
              isOnline ? 'text-emerald-300' : 'text-amber-300'
            }`}
          >
            {isOnline ? (
              <Wifi className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <span className="hidden sm:inline">{isOnline ? 'Online' : 'Offline'}</span>
          </div>

          {/* Settings Trigger */}
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="glass-panel-soft inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:text-amber-200 hover:border-amber-400/50 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Settings className="w-4 h-4 text-amber-400" />
            <span className="hidden md:inline">Pengaturan</span>
          </button>

          {/* Logout / Switch Session */}
          <button
            type="button"
            onClick={onLogout}
            title="Keluar dari sesi profil aktif"
            className="glass-panel-soft inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-200 hover:border-rose-400/60 hover:bg-rose-950/50 transition-colors cursor-pointer whitespace-nowrap"
          >
            <LogOut className="w-4 h-4 text-rose-400" />
            <span className="hidden md:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Main Content Split: Left open for 3D Mascot & Waterfall, Right Command Hub */}
      <main className="flex-1 flex flex-col lg:flex-row items-end lg:items-center justify-end gap-6 my-4">
        {/* Subtle bottom-left hero caption leaving mascot unobstructed */}
        <div className="hidden lg:flex flex-col justify-end self-end mr-auto max-w-sm pb-2 pointer-events-none">
          <div className="glass-panel-soft rounded-2xl px-4 py-3 border-l-2 border-l-amber-400">
            <div className="text-[11px] uppercase tracking-widest font-bold text-amber-300">
              Penjaga Lembah Aether
            </div>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Pilih mode permainan, atur strategi tim, atau tantang sahabat di arena daring 3D penuh.
            </p>
          </div>
        </div>

        {/* Right Command Hub Card */}
        <section className="pointer-events-auto w-full max-w-[460px] glass-panel rounded-3xl p-5 sm:p-6 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-widest font-bold text-amber-300/90">
                Gerbang Petualangan
              </div>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-white mt-0.5">
                Menu Utama
              </h2>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-slate-400">Bidak Aktif</div>
              <div className="text-xs font-semibold text-amber-200">{activeArchetype.title}</div>
            </div>
          </div>

          {/* Primary CTA: Select Game Mode */}
          <button
            type="button"
            onClick={onNavigateModeSelection}
            className="w-full min-h-[52px] inline-flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 px-5 py-3 text-sm sm:text-base font-bold text-slate-950 shadow-lg hover:brightness-105 active:scale-[0.99] transition-all cursor-pointer whitespace-nowrap"
          >
            <SlidersHorizontal className="w-5 h-5" />
            Pilih Mode Permainan
          </button>

          {/* 4 Quick Game Modes */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-300">Akses Cepat Mode</div>
            <div className="grid grid-cols-2 gap-2.5">
              {BOARD_GAME_MODES.map((m) => {
                const st = MODE_STYLE[m.id];
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onQuickSelectMode(m.id)}
                    className={`rounded-xl border border-slate-700/80 bg-slate-900/75 p-3 text-left transition-all hover:bg-slate-800/90 ${st.accent} cursor-pointer group`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-white group-hover:text-amber-200">
                        {st.icon}
                        {m.label.replace(' Mode', '')}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400">
                        {st.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{m.shortDesc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Multiplayer Daring Section */}
          <div className="space-y-2 pt-1 border-t border-slate-800/90">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <span className="inline-flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-sky-400" />
                Multiplayer Daring
              </span>
              <span className="text-[11px] text-slate-400">Maks. 4 Pemain</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => onOpenMultiplayer('create')}
                className="inline-flex items-center justify-center gap-2 min-h-[44px] px-3.5 py-2.5 rounded-xl border border-amber-500/35 bg-amber-500/12 text-xs sm:text-sm font-bold text-amber-200 hover:bg-amber-500/20 hover:border-amber-400 transition-colors cursor-pointer whitespace-nowrap"
              >
                <PlusSquare className="w-4 h-4 text-amber-300" />
                Buat Room
              </button>
              <button
                type="button"
                onClick={() => onOpenMultiplayer('join')}
                className="inline-flex items-center justify-center gap-2 min-h-[44px] px-3.5 py-2.5 rounded-xl border border-sky-500/35 bg-sky-500/12 text-xs sm:text-sm font-bold text-sky-200 hover:bg-sky-500/20 hover:border-sky-400 transition-colors cursor-pointer whitespace-nowrap"
              >
                <DoorOpen className="w-4 h-4 text-sky-300" />
                Gabung Room
              </button>
            </div>
          </div>

          {/* Secondary Utility Actions */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-800/90">
            <button
              type="button"
              onClick={onOpenTutorial}
              className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-2.5 py-2 rounded-xl border border-slate-700/80 bg-slate-900/70 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:border-amber-400/50 transition-colors cursor-pointer whitespace-nowrap"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-300" />
              Tutorial
            </button>
            <button
              type="button"
              onClick={onOpenLeaderboard}
              className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-2.5 py-2 rounded-xl border border-slate-700/80 bg-slate-900/70 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:border-amber-400/50 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              Leaderboard
            </button>
            <button
              type="button"
              onClick={onOpenAchievements}
              className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-2.5 py-2 rounded-xl border border-slate-700/80 bg-slate-900/70 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:border-emerald-400/50 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Award className="w-3.5 h-3.5 text-emerald-400" />
              Misi
            </button>
            <button
              type="button"
              onClick={onOpenCloud}
              className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-2.5 py-2 rounded-xl border border-slate-700/80 bg-slate-900/70 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:border-sky-400/50 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Cloud className="w-3.5 h-3.5 text-sky-400" />
              Awan
            </button>
          </div>
        </section>
      </main>

      {/* Profile Editor Modal */}
      {profileModalOpen && (
        <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="w-full max-w-md glass-panel rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CrownVictoryEmblem className="w-6 h-6" />
                <h3 className="font-display text-lg font-bold text-amber-300">Profil Penjelajah</h3>
              </div>
              <button
                type="button"
                onClick={() => setProfileModalOpen(false)}
                aria-label="Tutup"
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Nama Pahlawan
              </label>
              <input
                type="text"
                maxLength={24}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full min-h-[42px] rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                placeholder="Masukkan nama..."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Bidak Archetype Utama
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PLAYER_ARCHETYPES.map((arch) => (
                  <button
                    key={arch.archetypeIndex}
                    type="button"
                    onClick={() => setEditArch(arch.archetypeIndex)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                      editArch === arch.archetypeIndex
                        ? 'border-amber-400 bg-amber-500/15 text-amber-200'
                        : 'border-slate-700 bg-slate-900/70 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <ArchetypeEmblem archetypeIndex={arch.archetypeIndex} className="w-5 h-5 shrink-0" />
                    <span className="text-xs font-semibold truncate">{arch.title}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setProfileModalOpen(false)}
                className="flex-1 min-h-[42px] rounded-xl border border-slate-700 bg-slate-800 text-xs font-semibold text-slate-200 hover:bg-slate-700 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  onUpdateProfile(editName.trim() || 'Penjelajah Aether', editArch);
                  setProfileModalOpen(false);
                }}
                className="flex-1 min-h-[42px] rounded-xl bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-400 cursor-pointer"
              >
                Simpan Profil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Menu Quick Settings Modal */}
      {settingsOpen && (
        <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="w-full max-w-sm glass-panel rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-amber-300">Pengaturan Cepat</h3>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                aria-label="Tutup"
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={onToggleMute}
                className="w-full flex items-center justify-between min-h-[46px] px-4 rounded-xl border border-slate-700 bg-slate-900/80 text-sm font-semibold text-white hover:border-amber-400/50 cursor-pointer"
              >
                <span className="inline-flex items-center gap-2.5">
                  {profile.muted ? (
                    <VolumeX className="w-4 h-4 text-rose-400" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-emerald-400" />
                  )}
                  Efek Suara & Musik
                </span>
                <span className={profile.muted ? 'text-rose-300 text-xs' : 'text-emerald-300 text-xs'}>
                  {profile.muted ? 'Nonaktif' : 'Aktif'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSettingsOpen(false);
                  onOpenCameraSettings();
                }}
                className="w-full flex items-center justify-between min-h-[46px] px-4 rounded-xl border border-slate-700 bg-slate-900/80 text-sm font-semibold text-white hover:border-amber-400/50 cursor-pointer"
              >
                <span className="inline-flex items-center gap-2.5">
                  <Settings className="w-4 h-4 text-amber-400" />
                  Konfigurasi Kamera 3D
                </span>
                <span className="text-xs text-amber-300">Atur</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
