import React, { useEffect, useState } from 'react';
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

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="relative z-10 w-full h-full overflow-y-auto overflow-x-hidden custom-scroll bg-[#060913] text-slate-100 select-text">
      {/* 3-Zone Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-amber-500/15 bg-[#060913]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 py-3">
          {/* Left: Clean Brand Wordmark Only */}
          <a
            href="#hero"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('hero');
            }}
            className="flex items-center gap-2.5 min-w-0 shrink-0"
          >
            <SerpentCrestEmblem className="w-8 h-8 sm:w-9 sm:h-9 shrink-0" />
            <span className="font-display text-sm sm:text-lg font-bold tracking-tight text-gold-gradient truncate">
              Naga Tangga Nih Bos
            </span>
          </a>

          {/* Center: Single-Row Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-300">
            <button
              type="button"
              onClick={() => scrollToSection('fitur')}
              className="hover:text-amber-300 transition-colors cursor-pointer whitespace-nowrap"
            >
              Keunggulan
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('mode')}
              className="hover:text-amber-300 transition-colors cursor-pointer whitespace-nowrap"
            >
              Mode Arena
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('peringkat')}
              className="hover:text-amber-300 transition-colors cursor-pointer whitespace-nowrap"
            >
              Peringkat & Akun
            </button>
          </nav>

          {/* Right: Auth + Enter Game CTA */}
          <div className="flex items-center gap-2 shrink-0">
            {user ? (
              <button
                type="button"
                onClick={() => onOpenAuth('login')}
                className="inline-flex items-center gap-1.5 min-h-[40px] rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/20 transition-colors cursor-pointer max-w-[140px] sm:max-w-[190px]"
              >
                <UserCheck className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                <span className="truncate">{user.displayName || profile.name}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onOpenAuth('login')}
                className="inline-flex items-center gap-1.5 min-h-[40px] rounded-xl border border-slate-700 bg-slate-900/90 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-amber-400/50 hover:text-amber-200 transition-colors cursor-pointer whitespace-nowrap"
              >
                <LogIn className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span>Masuk / Daftar</span>
              </button>
            )}

            <button
              type="button"
              onClick={onEnterGame}
              className="inline-flex items-center gap-1.5 min-h-[40px] rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-bold text-slate-950 shadow-lg hover:brightness-105 transition-all cursor-pointer whitespace-nowrap"
            >
              {!user && <Lock className="w-3.5 h-3.5 shrink-0" />}
              <span>{user ? 'Masuk Game' : 'Masuk untuk Main'}</span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
            </button>
          </div>
        </div>
      </header>

      {/* Section 1: Hero Proposition */}
      <section
        id="hero"
        className="relative overflow-hidden border-b border-slate-800/80"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            {/* Editorial Copy Column */}
            <div className="lg:col-span-6 space-y-5 sm:space-y-6">
              <div className="text-xs font-semibold tracking-widest uppercase text-amber-300/90">
                Aether Serpent 3D · Arena Ular Tangga Fantasi
              </div>

              <h1
                className="font-display font-bold tracking-tight text-white leading-[1.08]"
                style={{ fontSize: 'clamp(2.1rem, 4.2vw, 3.65rem)' }}
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
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={onEnterGame}
                  className="inline-flex items-center justify-center gap-2 min-h-[48px] rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 px-6 py-3 text-sm sm:text-base font-bold text-slate-950 shadow-xl hover:brightness-105 active:scale-[0.99] transition-all cursor-pointer"
                >
                  <span>Masuk ke Menu Game</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </button>

                {user ? (
                  <button
                    type="button"
                    onClick={onOpenOnlineLobby}
                    className="inline-flex items-center justify-center gap-2 min-h-[48px] rounded-2xl border border-sky-500/40 bg-sky-500/10 px-5 py-3 text-sm font-semibold text-sky-200 hover:bg-sky-500/20 transition-colors cursor-pointer"
                  >
                    <Globe className="w-4 h-4 text-sky-300 shrink-0" />
                    <span>Buka Room Daring</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onOpenAuth('register')}
                    className="inline-flex items-center justify-center gap-2 min-h-[48px] rounded-2xl border border-amber-500/35 bg-slate-900/90 px-5 py-3 text-sm font-semibold text-amber-200 hover:border-amber-400 hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <LogIn className="w-4 h-4 text-amber-300 shrink-0" />
                    <span>Daftar / Login Akun</span>
                  </button>
                )}
              </div>

              {/* Grounded Numeric Snapshot */}
              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-800/80 max-w-lg">
                <div>
                  <div className="font-mono-num text-lg sm:text-xl font-bold text-white">4 Mode</div>
                  <div className="text-[11px] sm:text-xs text-slate-400">Classic, Battle, 2v2, Timer</div>
                </div>
                <div>
                  <div className="font-mono-num text-lg sm:text-xl font-bold text-white">8 Tema</div>
                  <div className="text-[11px] sm:text-xs text-slate-400">Arena 3D + Editor Papan</div>
                </div>
                <div>
                  <div className="font-mono-num text-lg sm:text-xl font-bold text-white">2–4 Pemain</div>
                  <div className="text-[11px] sm:text-xs text-slate-400">Solo AI, Lokal, & Daring</div>
                </div>
              </div>
            </div>

            {/* Dominant 16:9 Focal Key Art */}
            <div className="lg:col-span-6">
              <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-amber-500/25 bg-slate-900 shadow-2xl">
                <img
                  src={heroArtwork}
                  alt="Ilustrasi arena 3D Naga Tangga Nih Bos dengan tangga cahaya dan naga zamrud"
                  className="w-full aspect-video object-cover block"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#060913]/85 via-transparent to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 flex items-end justify-between gap-3">
                  <div>
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
                    className="pointer-events-auto shrink-0 rounded-xl border border-amber-400/50 bg-slate-950/85 px-3.5 py-2 text-xs font-bold text-amber-200 hover:bg-amber-400 hover:text-slate-950 transition-colors cursor-pointer"
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
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <div className="mb-8 max-w-2xl">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
              Dirancang untuk Mabar Cepat & Ringan di Semua Perangkat
            </h2>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">
              Setiap detail mulai dari manajemen GPU WebGL hingga sinkronisasi room daring dibangun
              agar tetap stabil di ponsel kelas menengah ke bawah tanpa mengorbankan atmosfer 3D.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Showcase Visual Card */}
            <div className="lg:col-span-7 flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
              <div className="relative overflow-hidden">
                <img
                  src={arenaShowcaseArt}
                  alt="Tampilan arena papan elemen langit dan gunung berapi di Naga Tangga Nih Bos"
                  className="w-full aspect-video object-cover block"
                  loading="lazy"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent" />
              </div>
              <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-display text-lg font-bold text-white">
                    8 Dunia Papan & Studio Kustomisasi
                  </h3>
                  <p className="mt-1 text-xs sm:text-sm text-slate-300 leading-relaxed">
                    Ganti tema arena dari Hutan Aether, Kawah Naga, hingga Kuil Langit atau susun
                    sendiri jalur tangga & ular untuk dipakai bertanding bersama teman.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onOpenBoardStudio}
                  className="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-xs font-bold text-amber-200 hover:bg-amber-500/20 transition-colors cursor-pointer"
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
            <div className="lg:col-span-5 grid grid-cols-1 gap-3.5">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5">
                <div className="text-xs font-mono-num font-bold text-amber-300">01. PERFORMA ADAPTIF</div>
                <h3 className="mt-1 text-sm sm:text-base font-bold text-white">
                  Preset Otomatis untuk HP RAM 2–4 GB & Laptop Tanpa GPU
                </h3>
                <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
                  Deteksi kemampuan GPU WebGL2 dan FPS nyata memilih mode Super Ringan, Low,
                  Medium, atau Ultra secara otomatis—dengan tombol cepat 60 FPS di dalam arena.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5">
                <div className="text-xs font-mono-num font-bold text-sky-300">02. MULTIPLAYER DUAL-TRANSPORT</div>
                <h3 className="mt-1 text-sm sm:text-base font-bold text-white">
                  Room Daring Stabil via WebSocket & Serverless Vercel
                </h3>
                <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
                  Bagikan kode 5 huruf atau tautan undangan. Mendukung giliran otomatis berbatas
                  waktu, chat lobi, serta pindah host otomatis jika salah satu pemain keluar.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5">
                <div className="text-xs font-mono-num font-bold text-emerald-300">03. AKUN CLOUD FIREBASE</div>
                <h3 className="mt-1 text-sm sm:text-base font-bold text-white">
                  Simpan Rekor, Misi Harian, & Skin Dadu 3D di Banyak Perangkat
                </h3>
                <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
                  Masuk sekali dengan Google atau Email untuk mengamankan pencapaian, statistik
                  kemenangan, serta papan kustom milikmu.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5">
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
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* 4 Modes Interactive Picker */}
            <div className="lg:col-span-7 space-y-5">
              <div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
                  Pilih Gaya Bermainmu
                </h2>
                <p className="mt-1.5 text-sm text-slate-400">
                  Klik salah satu mode di bawah untuk langsung mengatur pertandingan di menu game.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {BOARD_GAME_MODES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onQuickStartMode(m.id)}
                    className="group rounded-2xl border border-slate-800 bg-slate-900/75 p-4 text-left hover:border-amber-400/55 hover:bg-slate-900 transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-2 text-sm font-bold text-white group-hover:text-amber-200">
                          {MODE_ICON_MAP[m.id]}
                          {m.label}
                        </span>
                        <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-300 transition-colors" />
                      </div>
                      <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                        {m.shortDesc}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Live Cloud Top Players from Firestore */}
            <div
              id="peringkat"
              className="lg:col-span-5 rounded-2xl border border-amber-500/20 bg-slate-900/70 p-5 sm:p-6 space-y-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Trophy className="w-5 h-5 text-amber-400 shrink-0" />
                  <div>
                    <h3 className="font-display text-base sm:text-lg font-bold text-white">
                      Papan Kehormatan Cloud
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Pemain terdaftar dengan skor tertinggi
                    </p>
                  </div>
                </div>
                {!user && (
                  <button
                    type="button"
                    onClick={() => onOpenAuth('register')}
                    className="rounded-lg border border-amber-400/40 bg-amber-500/10 px-2.5 py-1.5 text-[11px] font-bold text-amber-200 hover:bg-amber-500/20 transition-colors cursor-pointer shrink-0"
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
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-800/90 bg-slate-950/65 px-3.5 py-2.5"
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
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <div className="rounded-3xl border border-amber-500/25 bg-gradient-to-br from-slate-900 via-[#0b1224] to-slate-950 p-6 sm:p-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
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

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              {!user && (
                <button
                  type="button"
                  onClick={() => onOpenAuth('register')}
                  className="inline-flex items-center justify-center gap-2 min-h-[46px] rounded-xl border border-slate-700 bg-slate-900 px-5 py-2.5 text-xs sm:text-sm font-bold text-white hover:border-amber-400/60 transition-colors cursor-pointer"
                >
                  <LogIn className="w-4 h-4 text-amber-300" />
                  <span>Buat Akun Gratis</span>
                </button>
              )}
              <button
                type="button"
                onClick={onEnterGame}
                className="inline-flex items-center justify-center gap-2 min-h-[46px] rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 px-6 py-2.5 text-xs sm:text-sm font-bold text-slate-950 shadow-lg hover:brightness-105 transition-all cursor-pointer"
              >
                {!user && <Lock className="w-4 h-4 shrink-0" />}
                <span>{user ? 'Masuk ke Menu Game' : 'Login & Masuk Game'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-800/80 bg-[#050710]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
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
