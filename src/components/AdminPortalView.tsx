import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  ArrowLeft,
  Cloud,
  Crown,
  DoorOpen,
  Eye,
  EyeOff,
  Flame,
  Globe,
  Layers,
  Lock,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import {
  adminCloseRoom,
  adminDeclareRoomWinner,
  adminDeleteLeaderboardEntry,
  fetchAdminMembers,
  fetchAdminServerOverview,
  fetchMemberCustomBoards,
  setMemberPublicVisibility,
  type AdminMemberBoardSummary,
  type AdminMemberRecord,
  type AdminRoomPlayer,
  type AdminRoomRecord,
  type AdminServerOverview,
} from '../services/adminService';
import { ArchetypeEmblem } from './FantasyIcons';

interface AdminPortalViewProps {
  user: User;
  onBackToMenu: () => void;
  onNotify: (title: string, subtitle?: string) => void;
}

type AdminTab = 'members' | 'rooms' | 'leaderboard';
type MemberSortKey = 'recent' | 'score' | 'wins' | 'streak';
type RoomFilterKey = 'all' | 'lobby' | 'playing' | 'finished' | 'public' | 'private';

function formatDateTimeId(msOrIso: number | string | null | undefined): string {
  if (!msOrIso) return '—';
  const date = typeof msOrIso === 'number' ? new Date(msOrIso) : new Date(msOrIso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatModeLabel(mode: string): string {
  switch (mode) {
    case 'battle':
      return 'Battle';
    case 'team':
      return 'Tim 2v2';
    case 'time_attack':
      return 'Time Attack';
    default:
      return 'Classic';
  }
}

export const AdminPortalView: React.FC<AdminPortalViewProps> = ({
  user,
  onBackToMenu,
  onNotify,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('members');
  const [members, setMembers] = useState<AdminMemberRecord[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [membersError, setMembersError] = useState<string | null>(null);

  const [serverData, setServerData] = useState<AdminServerOverview | null>(null);
  const [serverLoading, setServerLoading] = useState(true);
  const [serverError, setServerError] = useState<string | null>(null);

  const [memberSearch, setMemberSearch] = useState('');
  const [memberSort, setMemberSort] = useState<MemberSortKey>('recent');
  const [selectedMember, setSelectedMember] = useState<AdminMemberRecord | null>(null);
  const [selectedMemberBoards, setSelectedMemberBoards] = useState<AdminMemberBoardSummary[]>([]);
  const [boardsLoading, setBoardsLoading] = useState(false);
  const [togglingVisibilityUid, setTogglingVisibilityUid] = useState<string | null>(null);

  const [roomSearch, setRoomSearch] = useState('');
  const [roomFilter, setRoomFilter] = useState<RoomFilterKey>('all');
  const [confirmCloseCode, setConfirmCloseCode] = useState<string | null>(null);
  const [closingRoomCode, setClosingRoomCode] = useState<string | null>(null);
  const [winnerCandidate, setWinnerCandidate] = useState<{
    roomCode: string;
    player: AdminRoomPlayer;
  } | null>(null);
  const [declaringWinnerKey, setDeclaringWinnerKey] = useState<string | null>(null);

  const [confirmDeleteLbId, setConfirmDeleteLbId] = useState<string | null>(null);
  const [deletingLbId, setDeletingLbId] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    setMembersLoading(true);
    setMembersError(null);
    try {
      const list = await fetchAdminMembers(user);
      setMembers(list);
      setSelectedMember((prev) =>
        prev ? list.find((item) => item.uid === prev.uid) ?? null : null,
      );
    } catch (err) {
      setMembersError(
        err instanceof Error ? err.message : 'Gagal memuat daftar akun member dari Firestore.',
      );
    } finally {
      setMembersLoading(false);
    }
  }, [user]);

  const loadServerOverview = useCallback(async () => {
    setServerLoading(true);
    setServerError(null);
    try {
      const data = await fetchAdminServerOverview(user);
      setServerData(data);
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : 'Gagal memuat data room dan server multiplayer.',
      );
    } finally {
      setServerLoading(false);
    }
  }, [user]);

  const handleRefreshAll = useCallback(() => {
    void loadMembers();
    void loadServerOverview();
  }, [loadMembers, loadServerOverview]);

  useEffect(() => {
    handleRefreshAll();
  }, [handleRefreshAll]);

  // Auto-refresh open multiplayer rooms every 6s when viewing Rooms tab
  useEffect(() => {
    if (activeTab !== 'rooms') return;
    const id = window.setInterval(() => {
      void loadServerOverview();
    }, 6000);
    return () => window.clearInterval(id);
  }, [activeTab, loadServerOverview]);

  const handleInspectMember = useCallback(
    async (member: AdminMemberRecord) => {
      setSelectedMember(member);
      setSelectedMemberBoards([]);
      setBoardsLoading(true);
      try {
        const boards = await fetchMemberCustomBoards(user, member.uid);
        setSelectedMemberBoards(boards);
      } catch {
        setSelectedMemberBoards([]);
      } finally {
        setBoardsLoading(false);
      }
    },
    [user],
  );

  const handleToggleMemberPublic = async (member: AdminMemberRecord) => {
    const nextPublic = !(member.isPublic === true);
    setTogglingVisibilityUid(member.uid);
    try {
      await setMemberPublicVisibility(user, member.uid, nextPublic);
      setMembers((prev) =>
        prev.map((m) => (m.uid === member.uid ? { ...m, isPublic: nextPublic } : m)),
      );
      setSelectedMember((prev) =>
        prev && prev.uid === member.uid ? { ...prev, isPublic: nextPublic } : prev,
      );
      onNotify(
        nextPublic ? 'Profil Ditampilkan di Leaderboard' : 'Profil Disembunyikan dari Leaderboard',
        `${member.displayName} (${member.email})`,
      );
    } catch (err) {
      onNotify(
        'Gagal Mengubah Visibilitas',
        err instanceof Error ? err.message : 'Terjadi kesalahan Firestore.',
      );
    } finally {
      setTogglingVisibilityUid(null);
    }
  };

  const handleConfirmCloseRoom = async (code: string) => {
    setClosingRoomCode(code);
    try {
      await adminCloseRoom(user, code);
      setConfirmCloseCode(null);
      if (winnerCandidate?.roomCode === code) {
        setWinnerCandidate(null);
      }
      onNotify('Room Ditutup', `Ruangan ${code} telah dihentikan oleh Admin.`);
      await loadServerOverview();
    } catch (err) {
      onNotify(
        'Gagal Menutup Room',
        err instanceof Error ? err.message : 'Room tidak ditemukan atau sudah berakhir.',
      );
    } finally {
      setClosingRoomCode(null);
    }
  };

  const handleConfirmDeclareWinner = async (roomCode: string, player: AdminRoomPlayer) => {
    const key = `${roomCode}:${player.id}`;
    setDeclaringWinnerKey(key);
    try {
      const res = await adminDeclareRoomWinner(user, roomCode, player.id);
      setWinnerCandidate(null);
      onNotify(
        'Pemenang Ditetapkan!',
        `${res.winnerName} resmi ditunjuk sebagai pemenang Room #${res.roomCode}.`,
      );
      await loadServerOverview();
    } catch (err) {
      onNotify(
        'Gagal Menetapkan Pemenang',
        err instanceof Error ? err.message : 'Terjadi kesalahan pada server.',
      );
    } finally {
      setDeclaringWinnerKey(null);
    }
  };

  const handleConfirmDeleteLeaderboard = async (id: string) => {
    setDeletingLbId(id);
    try {
      await adminDeleteLeaderboardEntry(user, id);
      setConfirmDeleteLbId(null);
      onNotify('Entri Dihapus', 'Skor telah dihapus dari leaderboard server.');
      await loadServerOverview();
    } catch (err) {
      onNotify(
        'Gagal Menghapus Entri',
        err instanceof Error ? err.message : 'Terjadi kesalahan pada server.',
      );
    } finally {
      setDeletingLbId(null);
    }
  };

  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    const filtered = q
      ? members.filter(
          (m) =>
            m.displayName.toLowerCase().includes(q) ||
            m.email.toLowerCase().includes(q) ||
            m.uid.toLowerCase().includes(q),
        )
      : members;

    return [...filtered].sort((a, b) => {
      if (memberSort === 'score') return b.bestScore - a.bestScore || b.wins - a.wins;
      if (memberSort === 'wins') return b.wins - a.wins || b.bestScore - a.bestScore;
      if (memberSort === 'streak') return b.loginStreak - a.loginStreak || b.bestScore - a.bestScore;
      return b.updatedAtMs - a.updatedAtMs || b.bestScore - a.bestScore;
    });
  }, [memberSearch, memberSort, members]);

  const filteredRooms = useMemo(() => {
    const rooms = serverData?.rooms ?? [];
    const q = roomSearch.trim().toLowerCase();
    return rooms.filter((r) => {
      if (roomFilter === 'lobby' && r.status !== 'lobby') return false;
      if (roomFilter === 'playing' && r.status !== 'playing') return false;
      if (roomFilter === 'finished' && r.status !== 'finished') return false;
      if (roomFilter === 'public' && !r.isPublic) return false;
      if (roomFilter === 'private' && r.isPublic) return false;
      if (!q) return true;
      return (
        r.code.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        r.hostName.toLowerCase().includes(q) ||
        r.players.some((p) => p.name.toLowerCase().includes(q))
      );
    });
  }, [roomFilter, roomSearch, serverData?.rooms]);

  const summaryStats = useMemo(() => {
    const totalMatches = members.reduce((sum, m) => sum + m.totalGames, 0);
    const activeRooms = (serverData?.rooms ?? []).filter((r) => r.status !== 'finished').length;
    const onlinePlayersInRooms = (serverData?.rooms ?? []).reduce(
      (sum, r) => sum + r.playerCount,
      0,
    );
    return {
      totalMembers: members.length,
      activeRooms,
      totalRooms: serverData?.rooms.length ?? 0,
      onlinePlayersInRooms,
      totalMatches,
      cloudSyncCount: serverData?.cloudSyncCount ?? 0,
    };
  }, [members, serverData]);

  return (
    <div className="relative z-20 flex h-full w-full flex-col bg-[#060913] text-slate-100 overflow-hidden select-text">
      {/* Top Bar */}
      <header className="shrink-0 border-b border-slate-800 bg-[#080d1a] px-4 sm:px-6 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onBackToMenu}
              className="inline-flex items-center gap-1.5 min-h-[40px] rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-amber-400/50 hover:text-amber-200 transition-colors cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Menu Game</span>
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">Panel Administrator</span>
                <span aria-hidden="true">·</span>
                <span className="truncate text-amber-300/90">{user.email}</span>
              </div>
              <h1 className="font-display text-sm sm:text-lg font-bold text-white truncate">
                Ruang Kontrol Member & Arena Daring
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRefreshAll}
            disabled={membersLoading || serverLoading}
            className="inline-flex items-center gap-1.5 min-h-[40px] rounded-xl border border-amber-500/40 bg-amber-500/10 px-3.5 py-2 text-xs font-bold text-amber-200 hover:bg-amber-500/20 disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${membersLoading || serverLoading ? 'animate-spin' : ''}`}
            />
            <span>Muat Ulang</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Body (Sidebar + Viewport) */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row mx-auto w-full max-w-7xl overflow-hidden">
        {/* Left Navigation Rail (Desktop) / Segmented Tabs (Mobile & Tablet) */}
        <aside className="shrink-0 border-b lg:border-b-0 lg:border-r border-slate-800 bg-[#080d1a]/70 lg:w-64 p-3 sm:p-4">
          <nav className="flex lg:flex-col gap-2 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab('members')}
              className={`inline-flex items-center justify-between gap-2.5 min-h-[42px] rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'members'
                  ? 'bg-amber-400 text-slate-950 font-bold'
                  : 'border border-slate-800 bg-slate-900/70 text-slate-300 hover:border-slate-700 hover:text-white'
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <Users className="w-4 h-4 shrink-0" />
                <span>Akun Member</span>
              </span>
              <span
                className={`font-mono-num text-[11px] px-1.5 py-0.5 rounded ${
                  activeTab === 'members' ? 'bg-slate-950/15 text-slate-950' : 'bg-slate-800 text-slate-300'
                }`}
              >
                {summaryStats.totalMembers}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('rooms')}
              className={`inline-flex items-center justify-between gap-2.5 min-h-[42px] rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'rooms'
                  ? 'bg-amber-400 text-slate-950 font-bold'
                  : 'border border-slate-800 bg-slate-900/70 text-slate-300 hover:border-slate-700 hover:text-white'
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <DoorOpen className="w-4 h-4 shrink-0" />
                <span>Room Terbuka</span>
              </span>
              <span
                className={`font-mono-num text-[11px] px-1.5 py-0.5 rounded ${
                  activeTab === 'rooms' ? 'bg-slate-950/15 text-slate-950' : 'bg-slate-800 text-slate-300'
                }`}
              >
                {summaryStats.totalRooms}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('leaderboard')}
              className={`inline-flex items-center justify-between gap-2.5 min-h-[42px] rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'leaderboard'
                  ? 'bg-amber-400 text-slate-950 font-bold'
                  : 'border border-slate-800 bg-slate-900/70 text-slate-300 hover:border-slate-700 hover:text-white'
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <Trophy className="w-4 h-4 shrink-0" />
                <span>Skor & Cloud Sync</span>
              </span>
              <span
                className={`font-mono-num text-[11px] px-1.5 py-0.5 rounded ${
                  activeTab === 'leaderboard' ? 'bg-slate-950/15 text-slate-950' : 'bg-slate-800 text-slate-300'
                }`}
              >
                {serverData?.leaderboard.length ?? 0}
              </span>
            </button>
          </nav>

          {/* Summary Sidebar Note (Desktop) */}
          <div className="hidden lg:block mt-6 pt-5 border-t border-slate-800 space-y-3 text-xs text-slate-400">
            <div>
              <div className="font-semibold text-slate-200">Lingkungan Server</div>
              <div className="mt-0.5 font-mono-num text-[11px]">
                {serverData?.serverless ? 'Vercel Serverless Runtime' : 'Express Node + WebSocket'}
              </div>
            </div>
            <div>
              <div className="font-semibold text-slate-200">Catatan Sinkronisasi Room</div>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                Menampilkan seluruh room aktif (Publik maupun Privat) pada instance backend saat ini.
              </p>
            </div>
          </div>
        </aside>

        {/* Scrollable Content Viewport */}
        <main className="flex-1 min-h-0 overflow-y-auto custom-scroll p-4 sm:p-6 space-y-6">
          {/* 4-Column Tabular KPI Strip */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/65 p-3.5 sm:p-4">
              <div className="text-[11px] font-medium text-slate-400">Akun Member Terdaftar</div>
              <div className="mt-1 font-mono-num text-xl sm:text-2xl font-bold text-white">
                {summaryStats.totalMembers}
              </div>
              <div className="mt-1 text-[11px] text-slate-400">Tersimpan di Firestore</div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/65 p-3.5 sm:p-4">
              <div className="text-[11px] font-medium text-slate-400">Room Aktif Sekarang</div>
              <div className="mt-1 font-mono-num text-xl sm:text-2xl font-bold text-amber-300">
                {summaryStats.activeRooms}
              </div>
              <div className="mt-1 font-mono-num text-[11px] text-slate-400">
                {summaryStats.onlinePlayersInRooms} pemain di dalam room
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/65 p-3.5 sm:p-4">
              <div className="text-[11px] font-medium text-slate-400">Total Pertandingan Member</div>
              <div className="mt-1 font-mono-num text-xl sm:text-2xl font-bold text-emerald-300">
                {summaryStats.totalMatches.toLocaleString('id-ID')}
              </div>
              <div className="mt-1 text-[11px] text-slate-400">Akumulasi seluruh akun</div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/65 p-3.5 sm:p-4">
              <div className="text-[11px] font-medium text-slate-400">Cadangan PIN Cloud Sync</div>
              <div className="mt-1 font-mono-num text-xl sm:text-2xl font-bold text-sky-300">
                {summaryStats.cloudSyncCount}
              </div>
              <div className="mt-1 text-[11px] text-slate-400">Kode sinkronisasi server</div>
            </div>
          </section>

          {/* TAB 1: MEMBERS DIRECTORY */}
          {activeTab === 'members' && (
            <section className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-base sm:text-lg font-bold text-white">
                    Direktori Akun Member
                  </h2>
                  <p className="text-xs text-slate-400">
                    Klik salah satu akun untuk melihat statistik lengkap, papan kustom, dan pengaturan leaderboard.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      placeholder="Cari nama, email, UID..."
                      className="w-full sm:w-56 min-h-[40px] rounded-xl border border-slate-800 bg-slate-900 pl-8 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <select
                    value={memberSort}
                    onChange={(e) => setMemberSort(e.target.value as MemberSortKey)}
                    className="min-h-[40px] rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-200 focus:outline-none focus:border-amber-400"
                  >
                    <option value="recent">Aktivitas Terbaru</option>
                    <option value="score">Skor Tertinggi</option>
                    <option value="wins">Menang Terbanyak</option>
                    <option value="streak">Login Streak Tertinggi</option>
                  </select>
                </div>
              </div>

              {membersError && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-4 text-xs text-rose-200">
                  {membersError}
                </div>
              )}

              {membersLoading ? (
                <div className="space-y-2">
                  {[0, 1, 2, 3].map((idx) => (
                    <div
                      key={idx}
                      className="h-12 rounded-xl border border-slate-800 bg-slate-900/50 animate-pulse"
                    />
                  ))}
                </div>
              ) : filteredMembers.length === 0 ? (
                <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-8 text-center space-y-2">
                  <Users className="w-6 h-6 text-slate-500 mx-auto" />
                  <div className="text-sm font-semibold text-slate-200">
                    Tidak ada akun member yang cocok
                  </div>
                  <p className="text-xs text-slate-400">
                    {memberSearch
                      ? 'Coba kata kunci pencarian lain atau kosongkan kolom cari.'
                      : 'Member baru akan muncul di sini setelah mereka login dengan email terverifikasi.'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] text-slate-400">
                        <th className="py-3 px-4 font-semibold">Pemain</th>
                        <th className="py-3 px-4 font-semibold">Email</th>
                        <th className="py-3 px-4 font-semibold text-right">Main / Menang</th>
                        <th className="py-3 px-4 font-semibold text-right">Skor Terbaik</th>
                        <th className="py-3 px-4 font-semibold text-right">Streak</th>
                        <th className="py-3 px-4 font-semibold">Leaderboard</th>
                        <th className="py-3 px-4 font-semibold text-right">Terakhir Aktif</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {filteredMembers.map((m) => (
                        <tr
                          key={m.uid}
                          onClick={() => void handleInspectMember(m)}
                          className={`hover:bg-slate-800/50 transition-colors cursor-pointer ${
                            selectedMember?.uid === m.uid ? 'bg-amber-500/10' : ''
                          }`}
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <ArchetypeEmblem
                                archetypeIndex={m.archetypeIndex}
                                className="w-5 h-5 shrink-0"
                              />
                              <div className="min-w-0">
                                <div className="font-semibold text-white truncate max-w-[160px]">
                                  {m.displayName}
                                </div>
                                <div className="font-mono-num text-[10px] text-slate-500 truncate max-w-[140px]">
                                  {m.uid}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-300 max-w-[200px] truncate">
                            {m.email}
                          </td>
                          <td className="py-3 px-4 text-right font-mono-num text-slate-200 whitespace-nowrap">
                            {m.totalGames} / <span className="text-emerald-300 font-semibold">{m.wins}</span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono-num font-bold text-amber-300 whitespace-nowrap">
                            {m.bestScore.toLocaleString('id-ID')}
                          </td>
                          <td className="py-3 px-4 text-right font-mono-num whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 text-amber-200">
                              <Flame className="w-3 h-3 text-amber-400" />
                              {m.loginStreak}h
                            </span>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {m.isPublic === null ? (
                              <span className="text-slate-500">Belum Sinkron</span>
                            ) : m.isPublic ? (
                              <span className="text-emerald-300 font-medium">Publik</span>
                            ) : (
                              <span className="text-slate-400">Tersembunyi</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-mono-num text-[11px] text-slate-400 whitespace-nowrap">
                            {formatDateTimeId(m.updatedAtMs)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {/* TAB 2: OPEN MULTIPLAYER ROOMS */}
          {activeTab === 'rooms' && (
            <section className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-base sm:text-lg font-bold text-white">
                    Daftar Room Multiplayer Aktif
                  </h2>
                  <p className="text-xs text-slate-400">
                    Klik profil pemain di dalam room untuk menunjuknya sebagai pemenang secara langsung, atau kelola room aktif.
                  </p>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={roomSearch}
                    onChange={(e) => setRoomSearch(e.target.value)}
                    placeholder="Cari kode, nama room, host..."
                    className="w-full sm:w-64 min-h-[40px] rounded-xl border border-slate-800 bg-slate-900 pl-8 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { id: 'all', label: 'Semua' },
                    { id: 'lobby', label: 'Menunggu (Lobby)' },
                    { id: 'playing', label: 'Sedang Bermain' },
                    { id: 'finished', label: 'Selesai' },
                    { id: 'public', label: 'Publik' },
                    { id: 'private', label: 'Privat' },
                  ] as Array<{ id: RoomFilterKey; label: string }>
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setRoomFilter(f.id)}
                    className={`min-h-[36px] rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                      roomFilter === f.id
                        ? 'bg-slate-100 text-slate-950 font-bold'
                        : 'border border-slate-800 bg-slate-900/70 text-slate-300 hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {serverError && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-4 text-xs text-rose-200">
                  {serverError}
                </div>
              )}

              {serverLoading && !serverData ? (
                <div className="space-y-3">
                  {[0, 1].map((idx) => (
                    <div
                      key={idx}
                      className="h-28 rounded-xl border border-slate-800 bg-slate-900/50 animate-pulse"
                    />
                  ))}
                </div>
              ) : filteredRooms.length === 0 ? (
                <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-8 text-center space-y-2">
                  <DoorOpen className="w-6 h-6 text-slate-500 mx-auto" />
                  <div className="text-sm font-semibold text-slate-200">
                    Tidak ada room terbuka saat ini
                  </div>
                  <p className="text-xs text-slate-400">
                    Room yang dibuat pemain di menu Multiplayer Daring akan tampil otomatis di sini.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredRooms.map((room: AdminRoomRecord) => {
                    const isConfirming = confirmCloseCode === room.code;
                    const isClosing = closingRoomCode === room.code;
                    return (
                      <div
                        key={room.code}
                        className="rounded-xl border border-slate-800 bg-slate-900/65 p-4 space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span className="font-mono-num font-bold text-amber-300 text-sm">
                                #{room.code}
                              </span>
                              <span className="font-bold text-white truncate max-w-[240px]">
                                {room.name}
                              </span>
                              <span className="text-slate-500">·</span>
                              <span
                                className={
                                  room.status === 'playing'
                                    ? 'text-emerald-300 font-semibold'
                                    : room.status === 'finished'
                                      ? 'text-slate-400'
                                      : 'text-amber-200 font-semibold'
                                }
                              >
                                {room.status === 'playing'
                                  ? 'Sedang Bermain'
                                  : room.status === 'finished'
                                    ? 'Selesai'
                                    : 'Menunggu Pemain'}
                              </span>
                              <span className="text-slate-500">·</span>
                              <span className="inline-flex items-center gap-1 text-slate-300">
                                {room.isPublic ? (
                                  <Globe className="w-3 h-3 text-sky-400" />
                                ) : (
                                  <Lock className="w-3 h-3 text-slate-400" />
                                )}
                                {room.isPublic ? 'Publik' : 'Privat'}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                              <span>Host: {room.hostName}</span>
                              <span>·</span>
                              <span>Mode: {formatModeLabel(room.boardMode)}</span>
                              <span>·</span>
                              <span>Papan: {room.boardName}</span>
                              <span>·</span>
                              <span className="font-mono-num">
                                {room.playerCount}/{room.maxPlayers} Pemain · {room.turnCount} Giliran · {room.chatCount} Chat
                              </span>
                              <span>·</span>
                              <span className="font-mono-num">
                                Update {formatDateTimeId(room.updatedAt)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {isConfirming ? (
                              <>
                                <button
                                  type="button"
                                  disabled={isClosing}
                                  onClick={() => void handleConfirmCloseRoom(room.code)}
                                  className="min-h-[38px] rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-500 disabled:opacity-50 cursor-pointer"
                                >
                                  {isClosing ? 'Menutup...' : 'Konfirmasi Tutup'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmCloseCode(null)}
                                  className="min-h-[38px] rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:text-white cursor-pointer"
                                >
                                  Batal
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmCloseCode(room.code)}
                                className="inline-flex items-center gap-1.5 min-h-[38px] rounded-lg border border-rose-500/35 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-200 hover:bg-rose-500/20 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Tutup Room</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Players in Room (Clickable Profiles to Designate Winner) */}
                        <div className="pt-2.5 border-t border-slate-800/80 space-y-2.5">
                          <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
                            <span>
                              Klik profil pemain untuk menunjuk pemenang room ini:
                            </span>
                            {room.winnerId && (
                              <span className="inline-flex items-center gap-1 font-semibold text-amber-300">
                                <Crown className="w-3.5 h-3.5 text-amber-400" />
                                Pemenang:{' '}
                                {room.players.find((pl) => pl.id === room.winnerId)?.name ||
                                  'Ditetapkan'}
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                            {room.players.map((p) => {
                              const isCurrentWinner =
                                room.status === 'finished' && room.winnerId === p.id;
                              const isSelectedCandidate =
                                winnerCandidate?.roomCode === room.code &&
                                winnerCandidate.player.id === p.id;
                              return (
                                <button
                                  key={p.id}
                                  type="button"
                                  disabled={isCurrentWinner || declaringWinnerKey !== null}
                                  onClick={() => {
                                    setConfirmCloseCode(null);
                                    setWinnerCandidate(
                                      isSelectedCandidate
                                        ? null
                                        : { roomCode: room.code, player: p },
                                    );
                                  }}
                                  className={`group text-left flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-xs transition-colors ${
                                    isCurrentWinner
                                      ? 'border-amber-400/70 bg-amber-500/15 cursor-default'
                                      : isSelectedCandidate
                                        ? 'border-amber-400 bg-amber-500/20 ring-1 ring-amber-400/50 cursor-pointer'
                                        : 'border-slate-800/90 bg-slate-950/60 hover:border-amber-400/50 hover:bg-slate-900 cursor-pointer'
                                  }`}
                                  title={
                                    isCurrentWinner
                                      ? `${p.name} adalah pemenang room ini`
                                      : `Klik untuk menetapkan ${p.name} sebagai pemenang`
                                  }
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <ArchetypeEmblem
                                      archetypeIndex={p.archetypeIndex ?? 0}
                                      className="w-5 h-5 shrink-0"
                                    />
                                    <div className="min-w-0">
                                      <div className="font-semibold text-slate-100 truncate flex items-center gap-1">
                                        <span className="truncate">
                                          {p.name}
                                          {p.id === room.hostId ? ' (Host)' : ''}
                                        </span>
                                      </div>
                                      <div className="font-mono-num text-[10px] text-slate-400">
                                        {p.connected ? `Online · ${p.pingMs}ms` : 'Terputus'}
                                        {room.boardMode === 'team' && p.team
                                          ? ` · Tim ${p.team}`
                                          : ''}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="text-right font-mono-num shrink-0">
                                    {isCurrentWinner ? (
                                      <span className="inline-flex items-center gap-1 font-bold text-amber-300">
                                        <Crown className="w-3.5 h-3.5 text-amber-400" />
                                        Menang
                                      </span>
                                    ) : (
                                      <div className="font-bold text-amber-300">P{p.tile}</div>
                                    )}
                                    <div className="text-[10px] text-slate-400">{p.score} pts</div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>

                          {/* Inline 2-Step Confirmation Bar to Declare Selected Player as Winner */}
                          {winnerCandidate?.roomCode === room.code && (
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-lg border border-amber-400/45 bg-amber-500/10 px-3.5 py-2.5 text-xs">
                              <div className="flex items-center gap-2 text-amber-100 min-w-0">
                                <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                                <span className="truncate">
                                  Tetapkan{' '}
                                  <strong className="text-white">
                                    {winnerCandidate.player.name}
                                  </strong>{' '}
                                  sebagai pemenang Room #{room.code}?
                                </span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  disabled={
                                    declaringWinnerKey ===
                                    `${room.code}:${winnerCandidate.player.id}`
                                  }
                                  onClick={() =>
                                    void handleConfirmDeclareWinner(
                                      room.code,
                                      winnerCandidate.player,
                                    )
                                  }
                                  className="inline-flex items-center gap-1.5 min-h-[36px] rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-300 disabled:opacity-50 cursor-pointer"
                                >
                                  <Crown className="w-3.5 h-3.5" />
                                  <span>
                                    {declaringWinnerKey ===
                                    `${room.code}:${winnerCandidate.player.id}`
                                      ? 'Memproses...'
                                      : 'Tunjuk Menang'}
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  disabled={declaringWinnerKey !== null}
                                  onClick={() => setWinnerCandidate(null)}
                                  className="min-h-[36px] rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:text-white cursor-pointer"
                                >
                                  Batal
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* TAB 3: SERVER LEADERBOARD & CLOUD SYNC RECORDS */}
          {activeTab === 'leaderboard' && (
            <section className="space-y-6">
              <div className="space-y-3">
                <div>
                  <h2 className="font-display text-base sm:text-lg font-bold text-white">
                    Moderasi Leaderboard Server
                  </h2>
                  <p className="text-xs text-slate-400">
                    Daftar skor yang tercatat di server API pertandingan lokal/AI maupun daring.
                  </p>
                </div>

                {!serverData || serverData.leaderboard.length === 0 ? (
                  <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 text-center text-xs text-slate-400">
                    Belum ada entri leaderboard pada penyimpanan server ini.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] text-slate-400">
                          <th className="py-3 px-4 font-semibold">#</th>
                          <th className="py-3 px-4 font-semibold">Nama Pemain</th>
                          <th className="py-3 px-4 font-semibold">Mode / Kesulitan</th>
                          <th className="py-3 px-4 font-semibold text-right">Skor</th>
                          <th className="py-3 px-4 font-semibold text-right">Giliran</th>
                          <th className="py-3 px-4 font-semibold text-right">Tanggal</th>
                          <th className="py-3 px-4 font-semibold text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80">
                        {serverData.leaderboard.map((entry, idx) => (
                          <tr key={entry.id} className="hover:bg-slate-800/40">
                            <td className="py-2.5 px-4 font-mono-num text-amber-300 font-bold">
                              #{idx + 1}
                            </td>
                            <td className="py-2.5 px-4 font-semibold text-white">
                              {entry.playerName}
                            </td>
                            <td className="py-2.5 px-4 text-slate-300">
                              {entry.mode} · {entry.difficulty}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono-num font-bold text-amber-200">
                              {entry.score.toLocaleString('id-ID')}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono-num text-slate-300">
                              {entry.turns}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono-num text-[11px] text-slate-400 whitespace-nowrap">
                              {formatDateTimeId(entry.createdAt)}
                            </td>
                            <td className="py-2.5 px-4 text-right whitespace-nowrap">
                              {confirmDeleteLbId === entry.id ? (
                                <div className="inline-flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    disabled={deletingLbId === entry.id}
                                    onClick={() => void handleConfirmDeleteLeaderboard(entry.id)}
                                    className="rounded bg-rose-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-rose-500 cursor-pointer"
                                  >
                                    Hapus
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteLbId(null)}
                                    className="rounded border border-slate-700 px-2 py-1 text-[11px] text-slate-300 cursor-pointer"
                                  >
                                    Batal
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteLbId(entry.id)}
                                  className="text-rose-300 hover:text-rose-200 font-medium cursor-pointer"
                                >
                                  Hapus
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-800">
                <div className="flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-sky-400 shrink-0" />
                  <h3 className="font-display text-sm sm:text-base font-bold text-white">
                    Cadangan Kode Sinkronisasi PIN
                  </h3>
                </div>

                {!serverData || serverData.cloudSyncProfiles.length === 0 ? (
                  <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 text-center text-xs text-slate-400">
                    Belum ada cadangan Cloud Sync PIN di server.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] text-slate-400">
                          <th className="py-3 px-4 font-semibold">Kode Sync</th>
                          <th className="py-3 px-4 font-semibold">Nama Pemain</th>
                          <th className="py-3 px-4 font-semibold text-right">Menang</th>
                          <th className="py-3 px-4 font-semibold text-right">Skor Terbaik</th>
                          <th className="py-3 px-4 font-semibold text-right">Terakhir Sync</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80">
                        {serverData.cloudSyncProfiles.map((rec) => (
                          <tr key={rec.syncCode} className="hover:bg-slate-800/40">
                            <td className="py-2.5 px-4 font-mono-num font-bold text-sky-300">
                              {rec.syncCode}
                            </td>
                            <td className="py-2.5 px-4 font-semibold text-white">
                              {rec.playerName}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono-num text-emerald-300">
                              {rec.wins}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono-num text-amber-200">
                              {rec.bestScore.toLocaleString('id-ID')}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono-num text-[11px] text-slate-400">
                              {formatDateTimeId(rec.updatedAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          )}
        </main>
      </div>

      {/* Member Detail Inspection Drawer */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-xs">
          <aside className="relative flex h-full w-full max-w-md flex-col border-l border-slate-800 bg-[#080d1a] shadow-2xl overflow-y-auto custom-scroll">
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
              <div className="flex items-center gap-3 min-w-0">
                <ArchetypeEmblem
                  archetypeIndex={selectedMember.archetypeIndex}
                  className="w-7 h-7 shrink-0"
                />
                <div className="min-w-0">
                  <h3 className="font-display text-sm sm:text-base font-bold text-white truncate">
                    {selectedMember.displayName}
                  </h3>
                  <div className="text-[11px] text-slate-400 truncate">
                    {selectedMember.email}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMember(null)}
                aria-label="Tutup Detail Member"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-5 text-xs">
              <div className="space-y-1.5 pb-4 border-b border-slate-800">
                <div className="text-[11px] text-slate-400">Firebase UID</div>
                <div className="font-mono-num text-[11px] text-slate-200 break-all">
                  {selectedMember.uid}
                </div>
                <div className="pt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                  <span>Daftar: {formatDateTimeId(selectedMember.createdAtMs)}</span>
                  <span>·</span>
                  <span>Update: {formatDateTimeId(selectedMember.updatedAtMs)}</span>
                </div>
              </div>

              {/* Stat Grid */}
              <div className="grid grid-cols-2 gap-3 font-mono-num">
                <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                  <div className="text-[11px] text-slate-400 font-sans">Skor Terbaik</div>
                  <div className="text-base font-bold text-amber-300 mt-0.5">
                    {selectedMember.bestScore.toLocaleString('id-ID')}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                  <div className="text-[11px] text-slate-400 font-sans">Menang / Total Main</div>
                  <div className="text-base font-bold text-white mt-0.5">
                    {selectedMember.wins} / {selectedMember.totalGames}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                  <div className="text-[11px] text-slate-400 font-sans">Menang Daring</div>
                  <div className="text-base font-bold text-sky-300 mt-0.5">
                    {selectedMember.onlineWins}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                  <div className="text-[11px] text-slate-400 font-sans">Login Streak</div>
                  <div className="text-base font-bold text-amber-200 mt-0.5">
                    {selectedMember.loginStreak} Hari
                  </div>
                </div>
              </div>

              {/* Gameplay Telemetry */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="font-semibold text-slate-200">Rincian Aktivitas Permainan</div>
                <div className="grid grid-cols-2 gap-y-2 text-[11px] text-slate-300 font-mono-num">
                  <span>Tangga Dinaiki: {selectedMember.laddersClimbed}</span>
                  <span>Terkena Ular: {selectedMember.snakesBitten}</span>
                  <span>Perisai Digunakan: {selectedMember.shieldsUsed}</span>
                  <span>Petak Spesial: {selectedMember.specialTilesHit}</span>
                  <span>Pencapaian: {selectedMember.unlockedAchievements.length}/24</span>
                  <span>Skin Dadu: {selectedMember.diceSkinId}</span>
                </div>
              </div>

              {/* Leaderboard Visibility Control */}
              {selectedMember.isPublic !== null && (
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-200">Tampil di Leaderboard Publik</div>
                    <div className="text-[11px] text-slate-400">
                      Status saat ini: {selectedMember.isPublic ? 'Publik' : 'Disembunyikan'}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={togglingVisibilityUid === selectedMember.uid}
                    onClick={() => void handleToggleMemberPublic(selectedMember)}
                    className="inline-flex items-center gap-1.5 min-h-[38px] rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-amber-400/50 cursor-pointer shrink-0"
                  >
                    {selectedMember.isPublic ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5 text-amber-300" />
                        <span>Sembunyikan</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5 text-emerald-300" />
                        <span>Tampilkan</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Member Custom Boards */}
              <div className="pt-3 border-t border-slate-800 space-y-2.5">
                <div className="flex items-center gap-2 font-semibold text-slate-200">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  <span>Papan 3D Kustom Milik Member</span>
                </div>
                {boardsLoading ? (
                  <div className="text-[11px] text-slate-400">Memuat daftar papan...</div>
                ) : selectedMemberBoards.length === 0 ? (
                  <div className="text-[11px] text-slate-400">
                    Member ini belum menyimpan papan kustom di cloud.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedMemberBoards.map((b) => (
                      <div
                        key={b.id}
                        className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-white truncate">{b.name}</div>
                          <div className="text-[11px] text-slate-400">
                            Tema: {b.themeId} · {b.ladderCount} Tangga · {b.snakeCount} Ular
                          </div>
                        </div>
                        <span className="font-mono-num text-[10px] text-slate-400 shrink-0">
                          {formatDateTimeId(b.updatedAtMs)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};
