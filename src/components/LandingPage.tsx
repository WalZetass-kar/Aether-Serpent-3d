import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Clock,
  Cpu,
  Globe,
  Layers,
  Lock,
  LogIn,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  UserCheck,
  Users,
} from 'lucide-react';
import heroArtwork from '../assets/images/hero_naga_tangga_1794911553591.jpg';
import arenaShowcaseArt from '../assets/images/arena_elemental_clash_1794911554751.jpg';
import { BOARD_GAME_MODES, type BoardGameMode } from '../../shared/gameConfig';
import { useAuth } from '../contexts/AuthContext';
import {
  fetchTopPublicProfiles,
  type CloudPublicProfile,
} from '../services/firebaseAccountService';
import type { PlayerProfile } from '../services/storageService';
import { ArchetypeEmblem, SerpentCrestEmblem } from './FantasyIcons';
import { PWAInstallButton } from './PWAInstallButton';

interface LandingPageProps {
  profile: PlayerProfile;
  onEnterGame: () => void;
  onOpenBoardStudio: () => void;
  onQuickStartMode: (mode: BoardGameMode) => void;
  onOpenAuth: (tab: 'login' | 'register') => void;
  onOpenOnlineLobby: () => void;
}

const MODE_ICON_MAP: Record<BoardGameMode, React.ReactNode> = {
  classic: <Shield className="w-4 h-4 text-amber-300 shrink-0" />,
  battle: <Swords className="w-4 h-4 text-rose-400 shrink-0" />,
  team: <Users className="w-4 h-4 text-sky-400 shrink-0" />,
  time_attack: <Clock className="w-4 h-4 text-emerald-400 shrink-0" />,
};

export const LandingPage: React.FC<LandingPageProps> = ({
  profile,
  onEnterGame,
  onOpenBoardStudio,
  onQuickStartMode,
  onOpenAuth,
  onOpenOnlineLobby,
}) => {
  const { user } = useAuth();
  const [cloudLeaders, setCloudLeaders] = useState<CloudPublicProfile[]>([]);
  const [leadersLoaded, setLeadersLoaded] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const scrollProgressBarRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;
    void fetchTopPublicProfiles(6)
      .then((list) => {
        if (active) {
          setCloudLeaders(list);
          setLeadersLoaded(true);
        }
      })
      .catch(() => {
        if (active) setLeadersLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [user?.uid, profile.bestScore]);

  // Repeating scroll-reveal observer scoped to the LandingPage scroll container
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const targets = Array.from(container.querySelectorAll<HTMLElement>('[data-scroll-reveal]'));
    if (targets.length === 0) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion || typeof IntersectionObserver === 'undefined') {
      targets.forEach((el) => el.setAttribute('data-reveal', 'visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const el = entry.target as HTMLElement;
          const rootTop = entry.rootBounds ? entry.rootBounds.top : 0;
          const rootHeight = entry.rootBounds ? entry.rootBounds.height : container.clientHeight;
          const isTallElement = entry.boundingClientRect.height > rootHeight * 0.78;

          if (entry.isIntersecting && (entry.intersectionRatio >= 0.12 || isTallElement)) {
            el.setAttribute('data-reveal', 'visible');
          } else if (!entry.isIntersecting) {
            el.setAttribute('data-reveal', 'hidden');
            const exitedAbove = entry.boundingClientRect.bottom <= rootTop + 16;
            el.setAttribute('data-exit', exitedAbove ? 'top' : 'bottom');
          }
        }
      },
      {
        root: container,
        threshold: [0, 0.12, 0.25],
        rootMargin: '0px 0px -3% 0px',
      },
    );

    targets.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
    };
  }, [leadersLoaded, cloudLeaders.length]);

  // Compositor-only scroll progress indicator in sticky header
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    let rafId = 0;
    const updateProgress = () => {
      rafId = 0;
      const bar = scrollProgressBarRef.current;
      if (!bar) return;
      const maxScroll = container.scrollHeight - container.clientHeight;
      const ratio = maxScroll > 0 ? Math.min(1, Math.max(0, container.scrollTop / maxScroll)) : 0;
      bar.style.transform = `scaleX(${ratio})`;
    };

    const handleScroll = () => {
      if (!rafId) {
        rafId = window.requestAnimationFrame(updateProgress);
      }
    };

    updateProgress();
    container.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);

  const revealDelay = (ms: number): React.CSSProperties =>
    ({ '--reveal-delay': `${ms}ms` }) as React.CSSProperties;

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div
      ref={scrollContainerRef}
      className="relative z-10 w-full h-full overflow-y-auto overflow-x-hidden custom-scroll bg-[#060913] text-slate-100 select-text"
    >
      {/* 3-Zone Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-amber-500/15 bg-[#060913]/90 backdrop-blur-md">
        <div
          ref={scrollProgressBarRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] origin-left bg-gradient-to-r from-amber-400 via-yellow-300 to-emerald-400 will-change-transform"
          style={{ transform: 'scaleX(0)' }}
        />
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 sm:gap-4 px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3">
          {/* Left: Clean Brand Wordmark Only */}
          <a
            href="#hero"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('hero');
            }}
            className="flex items-center gap-2 min-w-0 flex-1 lg:flex-initial"
          >
            <SerpentCrestEmblem className="w-7 h-7 sm:w-9 sm:h-9 shrink-0" />
            <span className="font-display text-xs sm:text-base lg:text-lg font-bold tracking-tight text-gold-gradient truncate">
              Naga Tangga Nih Bos
            </span>
          </a>

          {/* Center: Single-Row Navigation Links (lg+ to prevent tablet crowding) */}
          <nav className="hidden lg:flex items-center gap-5 xl:gap-6 text-xs font-semibold text-slate-300 shrink-0">
            <button
              type="button"
              onClick={() => scrollToSection('fitur')}
              className="hover:text-amber-300 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Keunggulan
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('mode')}
              className="hover:text-amber-300 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Mode Arena
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('peringkat')}
              className="hover:text-amber-300 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Peringkat & Akun
            </button>
          </nav>

          {/* Right: Auth + Enter Game CTA */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {user ? (
              <button
                type="button"
                onClick={() => onOpenAuth('login')}
                className="inline-flex items-center gap-1.5 min-h-[40px] rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-2.5 sm:px-3 py-2 text-[11px] sm:text-xs font-semibold text-emerald-200 hover:bg-emerald-500/20 transition-colors cursor-pointer max-w-[110px] sm:max-w-[175px]"
              >
                <UserCheck className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                <span className="truncate">{user.displayName || profile.name}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onOpenAuth('login')}
                className="inline-flex items-center gap-1.5 min-h-[40px] rounded-xl border border-slate-700 bg-slate-900/90 px-2.5 sm:px-3 py-2 text-[11px] sm:text-xs font-semibold text-slate-200 hover:border-amber-400/50 hover:text-amber-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <LogIn className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span>Masuk / Daftar</span>
              </button>
            )}

            <button
              type="button"
              onClick={onEnterGame}
              className="inline-flex items-center gap-1 sm:gap-1.5 min-h-[40px] rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 px-2.5 sm:px-4 py-2 text-[11px] sm:text-sm font-bold text-slate-950 shadow-lg hover:brightness-105 transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              {!user && <Lock className="w-3.5 h-3.5 shrink-0" />}
              <span className="sm:hidden">{user ? 'Main' : 'Masuk Main'}</span>
              <span className="hidden sm:inline">{user ? 'Masuk Game' : 'Masuk untuk Main'}</span>
              <ArrowRight className="hidden sm:block w-3.5 h-3.5 shrink-0" />
            </button>
          </div>
        </div>
      </header>

      {/* Section 1: Hero Proposition */}
      <section
        id="hero"
        className="relative overflow-hidden border-b border-slate-800/80"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-5 pb-8 sm:pt-7 sm:pb-10 lg:pt-9 lg:pb-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
            {/* Editorial Copy Column */}
            <div
              data-scroll-reveal
              data-reveal-variant="up"
              data-reveal="visible"
              style={revealDelay(0)}
              className="scroll-reveal lg:col-span-6 flex flex-col justify-between gap-4 sm:gap-5"
            >
              <div className="space-y-3.5 sm:space-y-4">
                <div className="text-xs font-semibold tracking-widest uppercase text-amber-300/90">
                  Aether Serpent 3D · Arena Ular Tangga Fantasi
                </div>

                <h1
                  className="font-display font-bold tracking-tight text-white leading-[1.08]"
                  style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)' }}
                >
                  Taklukkan Papan{' '}
                  <span className="text-gold-gradient">Naga 3D</span> Bersama Sahabat
                </h1>

                <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl">
                  Lempar dadu kristal 3D, naiki tangga cahaya suci, hindari ular mistis, dan
                  susun taktik di papan 100 petak. Bermain solo melawan AI adaptif, mabar lokal,
                  atau buat room daring dengan sinkronisasi akun cloud.
                </p>

                {/* Primary + Secondary CTA Row */}
                <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={onEnterGame}
                    className="inline-flex items-center justify-center gap-2 min-h-[46px] rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 px-5 py-2.5 text-sm font-bold text-slate-950 shadow-xl hover:brightness-105 active:scale-[0.99] transition-all cursor-pointer whitespace-nowrap"
                  >
                    <span>Masuk ke Menu Game</span>
                    <ArrowRight className="w-4 h-4 shrink-0" />
                  </button>

                  {user ? (
                    <button
                      type="button"
                      onClick={onOpenOnlineLobby}
                      className="inline-flex items-center justify-center gap-2 min-h-[46px] rounded-xl border border-sky-500/40 bg-sky-500/10 px-5 py-2.5 text-sm font-semibold text-sky-200 hover:bg-sky-500/20 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <Globe className="w-4 h-4 text-sky-300 shrink-0" />
                      <span>Buka Room Daring</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onOpenAuth('register')}
                      className="inline-flex items-center justify-center gap-2 min-h-[46px] rounded-xl border border-amber-500/35 bg-slate-900/90 px-5 py-2.5 text-sm font-semibold text-amber-200 hover:border-amber-400 hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <LogIn className="w-4 h-4 text-amber-300 shrink-0" />
                      <span>Daftar / Login Akun</span>
                    </button>
                  )}
                  <PWAInstallButton
                    variant="button"
                    className="min-h-[46px] rounded-xl"
                  />
                </div>
              </div>

              {/* Grounded Numeric Snapshot */}
              <div className="grid grid-cols-3 gap-3 pt-3.5 border-t border-slate-800/80 max-w-lg">
                <div
                  data-scroll-reveal
                  data-reveal-variant="up"
                  data-reveal="visible"
                  style={revealDelay(60)}
                  className="scroll-reveal"
                >
                  <div className="font-mono-num text-lg sm:text-xl font-bold text-white">4 Mode</div>
                  <div className="text-[11px] sm:text-xs text-slate-400">Classic, Battle, 2v2, Timer</div>
                </div>
                <div
                  data-scroll-reveal
                  data-reveal-variant="up"
                  data-reveal="visible"
                  style={revealDelay(130)}
                  className="scroll-reveal"
                >
                  <div className="font-mono-num text-lg sm:text-xl font-bold text-white">12 Tema</div>
                  <div className="text-[11px] sm:text-xs text-slate-400">Arena 3D, Misi & Editor</div>
                </div>
                <div
                  data-scroll-reveal
                  data-reveal-variant="up"
                  data-reveal="visible"
                  style={revealDelay(200)}
                  className="scroll-reveal"
                >
                  <div className="font-mono-num text-lg sm:text-xl font-bold text-white">2–4 Pemain</div>
                  <div className="text-[11px] sm:text-xs text-slate-400">Solo AI, Lokal, & Daring</div>
                </div>
              </div>
            </div>

            {/* Dominant Focal Key Art — full-bleed stretch matching copy column height */}
            <div
              data-scroll-reveal
              data-reveal-variant="zoom"
              data-reveal="visible"
              style={revealDelay(90)}
              className="scroll-reveal lg:col-span-6 flex"
            >
              <div className="relative w-full h-full min-h-[240px] sm:min-h-[300px] overflow-hidden rounded-2xl sm:rounded-3xl border border-amber-500/25 bg-slate-900 shadow-2xl">
                <img
                  src={heroArtwork}
                  alt="Ilustrasi arena 3D Naga Tangga Nih Bos dengan tangga cahaya dan naga zamrud"
                  className="w-full h-full object-cover block"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#060913]/90 via-[#060913]/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-amber-300">
                      Papan Obsidian & Naga Zamrud
                    </div>
                    <div className="text-[11px] sm:text-xs text-slate-300">
                      Render WebGL2 adaptif — langsung ringan di browser HP & laptop
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onEnterGame}
                    className="pointer-events-auto shrink-0 inline-flex items-center justify-center min-h-[40px] rounded-xl border border-amber-400/50 bg-slate-950/90 px-4 py-2 text-xs font-bold text-amber-200 hover:bg-amber-400 hover:text-slate-950 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Coba Arena
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Asymmetric Bento Capabilities */}
      <section id="fitur" className="border-b border-slate-800/80 bg-[#080d1a]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-7 sm:py-10">
          <div
            data-scroll-reveal
            data-reveal-variant="up"
            style={revealDelay(0)}
            className="scroll-reveal mb-5 sm:mb-6 max-w-2xl"
          >
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
              Dirancang untuk Mabar Cepat & Ringan di Semua Perangkat
            </h2>
            <p className="mt-1.5 text-sm text-slate-400 leading-relaxed">
              Setiap detail mulai dari manajemen GPU WebGL hingga sinkronisasi room daring dibangun
              agar tetap stabil di ponsel kelas menengah ke bawah tanpa mengorbankan atmosfer 3D.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* Showcase Visual Card — full-bleed flex-1 artwork so zero dead gap ever appears */}
            <div
              data-scroll-reveal
              data-reveal-variant="left"
              style={revealDelay(60)}
              className="scroll-reveal lg:col-span-7 flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70"
            >
              <div className="relative flex-1 min-h-[220px] sm:min-h-[280px] overflow-hidden">
                <img
                  src={arenaShowcaseArt}
                  alt="Tampilan arena papan elemen langit dan gunung berapi di Naga Tangga Nih Bos"
                  className="w-full h-full object-cover block"
                  loading="lazy"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent" />
              </div>
              <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 shrink-0 border-t border-slate-800/80">
                <div className="min-w-0">
                  <h3 className="font-display text-base sm:text-lg font-bold text-white">
                    12 Dunia Papan & Studio Kustomisasi
                  </h3>
                  <p className="mt-1 text-xs sm:text-sm text-slate-300 leading-relaxed">
                    Ganti tema arena dari Hutan Aether, Kawah Naga, hingga Kuil Langit atau susun
                    sendiri jalur tangga & ular untuk dipakai bertanding bersama teman.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onOpenBoardStudio}
                  className="shrink-0 inline-flex items-center justify-center gap-1.5 min-h-[42px] rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-xs font-bold text-amber-200 hover:bg-amber-500/20 transition-colors cursor-pointer whitespace-nowrap"
                >
                  {user ? (
                    <Layers className="w-4 h-4 text-amber-300 shrink-0" />
                  ) : (
                    <Lock className="w-4 h-4 text-amber-300 shrink-0" />
                  )}
                  <span>Lihat Studio Papan</span>
                </button>
              </div>
            </div>

            {/* Numbered Editorial Architecture List */}
            <div className="lg:col-span-5 grid grid-cols-1 gap-3">
              <div
                data-scroll-reveal
                data-reveal-variant="right"
                style={revealDelay(0)}
                className="scroll-reveal rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5"
              >
                <div className="text-xs font-mono-num font-bold text-amber-300">01. PERFORMA ADAPTIF</div>
                <h3 className="mt-1 text-sm sm:text-base font-bold text-white">
                  Preset Otomatis untuk HP RAM 2–4 GB & Laptop Tanpa GPU
                </h3>
                <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
                  Deteksi kemampuan GPU WebGL2 dan FPS nyata memilih mode Super Ringan, Low,
                  Medium, atau Ultra secara otomatis—dengan tombol cepat 60 FPS di dalam arena.
                </p>
              </div>

              <div
                data-scroll-reveal
                data-reveal-variant="right"
                style={revealDelay(85)}
                className="scroll-reveal rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5"
              >
                <div className="text-xs font-mono-num font-bold text-sky-300">02. MULTIPLAYER DUAL-TRANSPORT</div>
                <h3 className="mt-1 text-sm sm:text-base font-bold text-white">
                  Room Daring Stabil via WebSocket & Serverless Vercel
                </h3>
                <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
                  Bagikan kode 5 huruf atau tautan undangan. Mendukung giliran otomatis berbatas
                  waktu, chat lobi, serta pindah host otomatis jika salah satu pemain keluar.
                </p>
              </div>

              <div
                data-scroll-reveal
                data-reveal-variant="right"
                style={revealDelay(170)}
                className="scroll-reveal rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5"
              >
                <div className="text-xs font-mono-num font-bold text-emerald-300">03. AKUN CLOUD FIREBASE</div>
                <h3 className="mt-1 text-sm sm:text-base font-bold text-white">
                  Simpan Rekor, Misi Harian, & Skin Dadu 3D di Banyak Perangkat
                </h3>
                <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
                  Masuk sekali dengan Google atau Email untuk mengamankan pencapaian, statistik
                  kemenangan, serta papan kustom milikmu.
                </p>
              </div>

              <div
                data-scroll-reveal
                data-reveal-variant="right"
                style={revealDelay(255)}
                className="scroll-reveal rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5"
              >
                <div className="text-xs font-mono-num font-bold text-rose-300">04. ORACLE AETHER AI</div>
                <h3 className="mt-1 text-sm sm:text-base font-bold text-white">
                  Asisten Taktik & Peluang Dadu Sekali Sentuh
                </h3>
                <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
                  Butuh hitungan risiko tangga atau posisi perisai lawan? Buka laci Oracle AI di
                  menu utama maupun langsung di tengah permainan.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Game Modes & Live Cloud Leaderboard */}
      <section id="mode" className="border-b border-slate-800/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-7 sm:py-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-stretch">
            {/* 4 Modes Interactive Picker */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              <div
                data-scroll-reveal
                data-reveal-variant="up"
                style={revealDelay(0)}
                className="scroll-reveal"
              >
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
                  Pilih Gaya Bermainmu
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Klik salah satu mode di bawah untuk langsung mengatur pertandingan di menu game.
                </p>
              </div>

              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 sm:grid-rows-2 gap-3 items-stretch">
                {BOARD_GAME_MODES.map((m, idx) => (
                  <button
                    key={m.id}
                    type="button"
                    data-scroll-reveal
                    data-reveal-variant="up"
                    style={revealDelay(idx * 75)}
                    onClick={() => onQuickStartMode(m.id)}
                    className="scroll-reveal group h-full rounded-2xl border border-slate-800 bg-slate-900/75 p-4 text-left hover:border-amber-400/55 hover:bg-slate-900 transition-all cursor-pointer flex flex-col justify-between gap-2.5"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-2 text-sm font-bold text-white group-hover:text-amber-200">
                          {MODE_ICON_MAP[m.id]}
                          {m.label}
                        </span>
                        <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-300 transition-colors shrink-0" />
                      </div>
                      <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                        {m.shortDesc}
                      </p>
                    </div>
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-semibold text-amber-300/90">
                      <span>Mainkan Sekarang</span>
                      <span className="text-slate-400 group-hover:text-amber-200 transition-colors">
                        {m.id === 'team' ? '2v2 Tim' : '2–4 Pemain'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Live Cloud Top Players from Firestore */}
            <div
              id="peringkat"
              data-scroll-reveal
              data-reveal-variant="zoom"
              style={revealDelay(80)}
              className="scroll-reveal lg:col-span-5 rounded-2xl border border-amber-500/20 bg-slate-900/70 p-4 sm:p-5 flex flex-col gap-3.5"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Trophy className="w-5 h-5 text-amber-400 shrink-0" />
                  <div className="min-w-0">
                    <h3 className="font-display text-base sm:text-lg font-bold text-white truncate">
                      Papan Kehormatan Cloud
                    </h3>
                    <p className="text-[11px] text-slate-400 truncate">
                      Pemain terdaftar dengan skor tertinggi
                    </p>
                  </div>
                </div>
                {!user && (
                  <button
                    type="button"
                    onClick={() => onOpenAuth('register')}
                    className="min-h-[36px] rounded-xl border border-amber-400/40 bg-amber-500/10 px-3 py-1.5 text-[11px] font-bold text-amber-200 hover:bg-amber-500/20 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Daftar Sekarang
                  </button>
                )}
              </div>

              {!leadersLoaded ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Memuat data peringkat awan...
                </div>
              ) : cloudLeaders.length === 0 ? (
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-5 text-center space-y-2.5">
                  <Sparkles className="w-6 h-6 text-amber-300 mx-auto" />
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Jadilah pemain pertama yang mencatatkan rekor skor di Papan Kehormatan Cloud!
                  </p>
                  <button
                    type="button"
                    onClick={() => (user ? onEnterGame() : onOpenAuth('register'))}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-amber-300 transition-colors cursor-pointer"
                  >
                    <span>{user ? 'Main & Cetak Skor' : 'Buat Akun Sekarang'}</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {cloudLeaders.map((entry, idx) => (
                    <div
                      key={entry.uid}
                      data-scroll-reveal
                      data-reveal-variant="up"
                      style={revealDelay(idx * 55)}
                      className="scroll-reveal flex items-center justify-between gap-3 rounded-xl border border-slate-800/90 bg-slate-950/65 px-3.5 py-2.5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="font-mono-num text-xs font-bold text-amber-300 w-5 text-center shrink-0">
                          #{idx + 1}
                        </span>
                        <ArchetypeEmblem
                          archetypeIndex={entry.archetypeIndex}
                          className="w-5 h-5 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate">
                            {entry.displayName}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono-num">
                            {entry.wins} Menang · {entry.totalGames} Main
                          </div>
                        </div>
                      </div>
                      <div className="font-mono-num text-xs font-bold text-amber-200 shrink-0">
                        {entry.bestScore.toLocaleString('id-ID')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: Account Action Banner */}
      <section id="akun" className="bg-[#080d1a]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-7 sm:py-10">
          <div
            data-scroll-reveal
            data-reveal-variant="zoom"
            style={revealDelay(40)}
            className="scroll-reveal rounded-2xl sm:rounded-3xl border border-amber-500/25 bg-gradient-to-br from-slate-900 via-[#0b1224] to-slate-950 p-5 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-5"
          >
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-amber-300">
                <Cpu className="w-4 h-4 shrink-0" />
                <span>Siap Dimainkan Langsung di Browser HP, Tablet, & Desktop</span>
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
                {user
                  ? `Selamat datang kembali, ${user.displayName || profile.name}`
                  : 'Masuk atau Daftar Akun untuk Mulai Bermain'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {user
                  ? 'Akun Anda siap digunakan. Semua kemenangan, skin dadu 3D, dan papan kustom otomatis tersimpan ke Firebase.'
                  : 'Masuk menggunakan akun Google atau Email untuk mengakses arena 3D, Studio Papan, multiplayer daring, dan sinkronisasi progres di banyak perangkat.'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
              {!user && (
                <button
                  type="button"
                  onClick={() => onOpenAuth('register')}
                  className="inline-flex items-center justify-center gap-2 min-h-[46px] rounded-xl border border-slate-700 bg-slate-900 px-5 py-2.5 text-xs sm:text-sm font-bold text-white hover:border-amber-400/60 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <LogIn className="w-4 h-4 text-amber-300 shrink-0" />
                  <span>Buat Akun Gratis</span>
                </button>
              )}
              <button
                type="button"
                onClick={onEnterGame}
                className="inline-flex items-center justify-center gap-2 min-h-[46px] rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 px-5 py-2.5 text-xs sm:text-sm font-bold text-slate-950 shadow-lg hover:brightness-105 transition-all cursor-pointer whitespace-nowrap"
              >
                {!user && <Lock className="w-4 h-4 shrink-0" />}
                <span>{user ? 'Masuk ke Menu Game' : 'Login & Masuk Game'}</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-800/80 bg-[#050710]">
        <div
          data-scroll-reveal
          data-reveal-variant="up"
          style={revealDelay(0)}
          className="scroll-reveal mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400"
        >
          <div className="flex items-center gap-2">
            <SerpentCrestEmblem className="w-5 h-5 shrink-0" />
            <span className="font-semibold text-slate-200">Naga Tangga Nih Bos</span>
            <span>·</span>
            <span>Aether Serpent 3D</span>
          </div>
          <div>
            Developed By{' '}
            <a
              href="https://portfolionyaihwal.my.id"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-amber-300 hover:text-amber-200 underline underline-offset-2 transition-colors"
            >
              WalZetass
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
