import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Cloud,
  Coins,
  Copy,
  Crown,
  DoorOpen,
  Eye,
  EyeOff,
  Flame,
  Gift,
  Globe,
  Infinity as InfinityIcon,
  Layers,
  Lock,
  MessageCircle,
  Minus,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  Trophy,
  UserMinus,
  Users,
  X,
} from 'lucide-react';
import {
  adminAdjustMemberCoins,
  adminCloseRoom,
  adminDeclareRoomWinner,
  adminDeleteLeaderboardEntry,
  adminGrantAllPremiumBoards,
  adminKickRoomPlayer,
  adminLookupMemberByUid,
  adminSendGiftCoins,
  adminSetMemberUnlimitedCoins,
  fetchAdminMembers,
  fetchAdminServerOverview,
  fetchMemberCustomBoards,
  setMemberPublicVisibility,
  type AdminCoinGiftRecipientInfo,
  type AdminCoinGiftResult,
  type AdminMemberBoardSummary,
  type AdminMemberRecord,
  type AdminRoomPlayer,
  type AdminRoomRecord,
  type AdminServerOverview,
} from '../services/adminService';
import {
  markTopUpThreadReadByAdmin,
  sendAdminTopUpReply,
  subscribeToAllTopUpThreads,
  subscribeToTopUpMessages,
  type TopUpChatMessage,
  type TopUpChatThread,
} from '../services/topUpChatService';
import { ArchetypeEmblem } from './FantasyIcons';

interface AdminPortalViewProps {
  user: User;
  onBackToMenu: () => void;
  onNotify: (title: string, subtitle?: string) => void;
}

type AdminTab = 'members' | 'gift' | 'topup' | 'rooms' | 'leaderboard';
type MemberSortKey = 'recent' | 'coins' | 'score' | 'wins' | 'streak';
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
  const [totalNetworkMembers, setTotalNetworkMembers] = useState(0);
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
    room: AdminRoomRecord;
    player: AdminRoomPlayer;
  } | null>(null);
  const [overrideDraftByRoom, setOverrideDraftByRoom] = useState<Record<string, string>>({});
  const [declaringWinnerKey, setDeclaringWinnerKey] = useState<string | null>(null);
  const [kickCandidate, setKickCandidate] = useState<{
    room: AdminRoomRecord;
    player: AdminRoomPlayer;
  } | null>(null);
  const [kickingPlayerKey, setKickingPlayerKey] = useState<string | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());

  const [confirmDeleteLbId, setConfirmDeleteLbId] = useState<string | null>(null);
  const [deletingLbId, setDeletingLbId] = useState<string | null>(null);

  // Paid Top-Up Chat & Member Coin Adjustment State
  const [topUpThreads, setTopUpThreads] = useState<TopUpChatThread[]>([]);
  const [selectedThreadUid, setSelectedThreadUid] = useState<string | null>(null);
  const [threadMessages, setThreadMessages] = useState<TopUpChatMessage[]>([]);
  const [adminReplyText, setAdminReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [coinAmountInput, setCoinAmountInput] = useState('500');
  const [coinNoteInput, setCoinNoteInput] = useState('');
  const [adjustingCoinsUid, setAdjustingCoinsUid] = useState<string | null>(null);
  const [togglingUnlimitedUid, setTogglingUnlimitedUid] = useState<string | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  // Gift Coins by User ID State
  const [giftTargetUid, setGiftTargetUid] = useState('');
  const [giftAmountInput, setGiftAmountInput] = useState('500');
  const [giftMessageInput, setGiftMessageInput] = useState('');
  const [giftLookupLoading, setGiftLookupLoading] = useState(false);
  const [giftLookupError, setGiftLookupError] = useState<string | null>(null);
  const [giftRecipientPreview, setGiftRecipientPreview] =
    useState<AdminCoinGiftRecipientInfo | null>(null);
  const [sendingGift, setSendingGift] = useState(false);
  const [sentGiftsHistory, setSentGiftsHistory] = useState<AdminCoinGiftResult[]>([]);
  const [copiedUid, setCopiedUid] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    setMembersLoading(true);
    setMembersError(null);
    try {
      const { members: list, totalNetworkMembers: networkTotal } = await fetchAdminMembers(user);
      setMembers(list);
      setTotalNetworkMembers(networkTotal);
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

  // Auto-refresh open multiplayer rooms every 6s when viewing Rooms tab + 1s clock for 2-min idle indicator
  useEffect(() => {
    if (activeTab !== 'rooms') return;
    const pollId = window.setInterval(() => {
      void loadServerOverview();
    }, 6000);
    const tickId = window.setInterval(() => {
      setNowTick(Date.now());
    }, 1000);
    return () => {
      window.clearInterval(pollId);
      window.clearInterval(tickId);
    };
  }, [activeTab, loadServerOverview]);

  // Real-time subscription to member Top-Up chat threads
  useEffect(() => {
    return subscribeToAllTopUpThreads(user, (threads) => {
      setTopUpThreads(threads);
      setSelectedThreadUid((prev) => {
        if (prev && threads.some((t) => t.uid === prev)) return prev;
        return threads[0]?.uid ?? null;
      });
    });
  }, [user]);

  // Real-time messages for currently selected top-up thread
  useEffect(() => {
    if (!selectedThreadUid) {
      setThreadMessages([]);
      return;
    }
    const unsub = subscribeToTopUpMessages(selectedThreadUid, true, (msgs) => {
      setThreadMessages(msgs);
    });
    if (activeTab === 'topup') {
      void markTopUpThreadReadByAdmin(user, selectedThreadUid);
    }
    return unsub;
  }, [activeTab, selectedThreadUid, user]);

  useEffect(() => {
    if (activeTab !== 'topup' || !chatScrollRef.current) return;
    chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [activeTab, threadMessages.length, selectedThreadUid]);

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
      if (winnerCandidate?.room.code === code) {
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

  const handleConfirmDeclareWinner = async (room: AdminRoomRecord, playerId: string | null) => {
    const key = `${room.code}:${playerId || 'clear'}`;
    setDeclaringWinnerKey(key);
    try {
      const res = await adminDeclareRoomWinner(user, room, playerId);
      setWinnerCandidate(null);
      if (res.designatedWinnerId) {
        setOverrideDraftByRoom((prev) => ({
          ...prev,
          [res.roomCode]: res.designatedWinnerId as string,
        }));
        onNotify(
          'Admin Winner Override Aktif',
          `${res.targetName || 'Pemain'} kini 100% kebal ular & mendapat dorongan tangga hingga menang.`,
        );
      } else {
        onNotify(
          'Admin Winner Override Nonaktif',
          `Room #${res.roomCode} kembali berjalan normal tanpa override.`,
        );
      }
      await loadServerOverview();
    } catch (err) {
      onNotify(
        'Gagal Mengatur Target Pemenang',
        err instanceof Error ? err.message : 'Terjadi kesalahan pada server.',
      );
    } finally {
      setDeclaringWinnerKey(null);
    }
  };

  const handleConfirmKickPlayer = async (room: AdminRoomRecord, player: AdminRoomPlayer) => {
    const key = `${room.code}:${player.id}`;
    setKickingPlayerKey(key);
    try {
      const res = await adminKickRoomPlayer(user, room, player.id);
      setKickCandidate(null);
      if (res.roomClosed) {
        onNotify(
          'Pemain Dikeluarkan & Room Ditutup',
          `${res.kickedPlayerName} dikeluarkan; Room #${res.roomCode} kosong dan ditutup.`,
        );
      } else {
        onNotify(
          'Pemain Dikeluarkan dari Room',
          `${res.kickedPlayerName} telah dikeluarkan dari Room #${res.roomCode}. Permainan tetap lanjut lancar.`,
        );
      }
      await loadServerOverview();
    } catch (err) {
      onNotify(
        'Gagal Mengeluarkan Pemain',
        err instanceof Error ? err.message : 'Terjadi kesalahan pada server.',
      );
    } finally {
      setKickingPlayerKey(null);
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

  const handleAdminAdjustCoins = async (
    target: { uid: string; email: string; displayName: string },
    signedDelta: number,
    customNote?: string,
  ) => {
    if (!signedDelta || !Number.isFinite(signedDelta)) {
      onNotify('Nominal Tidak Valid', 'Masukkan jumlah koin yang valid (lebih dari 0).');
      return;
    }
    setAdjustingCoinsUid(target.uid);
    try {
      const res = await adminAdjustMemberCoins(user, target, signedDelta, customNote, true);
      setMembers((prev) =>
        prev.map((m) => (m.uid === target.uid ? { ...m, aetherCoins: res.nextCoins } : m)),
      );
      setSelectedMember((prev) =>
        prev && prev.uid === target.uid ? { ...prev, aetherCoins: res.nextCoins } : prev,
      );
      setCoinNoteInput('');
      onNotify(
        res.appliedDelta >= 0 ? 'Koin Member Ditambahkan' : 'Koin Member Dikurangi',
        `${target.displayName}: ${res.appliedDelta >= 0 ? '+' : ''}${res.appliedDelta.toLocaleString('id-ID')} Koin (Saldo baru: ${res.nextCoins.toLocaleString('id-ID')})`,
      );
    } catch (err) {
      onNotify(
        'Gagal Mengubah Koin Member',
        err instanceof Error ? err.message : 'Terjadi kesalahan Firestore.',
      );
    } finally {
      setAdjustingCoinsUid(null);
    }
  };

  const handleAdminGrantRoyalPass = async (
    target: { uid: string; email: string; displayName: string },
    customNote?: string,
  ) => {
    setAdjustingCoinsUid(target.uid);
    try {
      const res = await adminGrantAllPremiumBoards(user, target, 1000, customNote);
      setMembers((prev) =>
        prev.map((m) =>
          m.uid === target.uid
            ? { ...m, aetherCoins: res.nextCoins, unlockedBoardIds: res.unlockedBoardIds }
            : m,
        ),
      );
      setSelectedMember((prev) =>
        prev && prev.uid === target.uid
          ? { ...prev, aetherCoins: res.nextCoins, unlockedBoardIds: res.unlockedBoardIds }
          : prev,
      );
      setCoinNoteInput('');
      onNotify(
        'Royal Pass Diaktifkan',
        `Semua 15 Papan Premium + 1.000 Koin diberikan kepada ${target.displayName}.`,
      );
    } catch (err) {
      onNotify(
        'Gagal Mengaktifkan Royal Pass',
        err instanceof Error ? err.message : 'Terjadi kesalahan Firestore.',
      );
    } finally {
      setAdjustingCoinsUid(null);
    }
  };

  const handleAdminToggleUnlimitedCoins = async (
    target: { uid: string; email: string; displayName: string },
    nextEnabled: boolean,
    customNote?: string,
  ) => {
    setTogglingUnlimitedUid(target.uid);
    try {
      const res = await adminSetMemberUnlimitedCoins(user, target, nextEnabled, customNote, true);
      setMembers((prev) =>
        prev.map((m) => (m.uid === target.uid ? { ...m, unlimitedCoins: res.unlimitedCoins } : m)),
      );
      setSelectedMember((prev) =>
        prev && prev.uid === target.uid ? { ...prev, unlimitedCoins: res.unlimitedCoins } : prev,
      );
      setGiftRecipientPreview((prev) =>
        prev && prev.uid === target.uid ? { ...prev, unlimitedCoins: res.unlimitedCoins } : prev,
      );
      setCoinNoteInput('');
      onNotify(
        res.unlimitedCoins ? 'Koin Unlimited (∞) Diaktifkan' : 'Koin Unlimited Dinonaktifkan',
        res.unlimitedCoins
          ? `${target.displayName} sekarang memiliki Koin Aether Unlimited (∞).`
          : `${target.displayName} kembali ke saldo Koin Aether normal.`,
      );
    } catch (err) {
      onNotify(
        'Gagal Mengatur Koin Unlimited',
        err instanceof Error ? err.message : 'Terjadi kesalahan Firestore.',
      );
    } finally {
      setTogglingUnlimitedUid(null);
    }
  };

  const handleSendAdminReply = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeThread = topUpThreads.find((t) => t.uid === selectedThreadUid);
    if (!activeThread) return;
    const text = adminReplyText.trim();
    if (!text) return;
    setSendingReply(true);
    try {
      await sendAdminTopUpReply(
        user,
        {
          uid: activeThread.uid,
          email: activeThread.email,
          displayName: activeThread.displayName,
        },
        text,
      );
      setAdminReplyText('');
    } catch (err) {
      onNotify(
        'Gagal Mengirim Balasan',
        err instanceof Error ? err.message : 'Terjadi kesalahan Firestore.',
      );
    } finally {
      setSendingReply(false);
    }
  };

  const handleCopyUid = (uid: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(uid);
      setCopiedUid(uid);
      window.setTimeout(() => setCopiedUid((prev) => (prev === uid ? null : prev)), 1800);
      onNotify('ID Pengguna Disalin', uid);
    }
  };

  const handleLookupGiftRecipient = async (explicitUid?: string) => {
    const cleanUid = (explicitUid ?? giftTargetUid).trim();
    if (!cleanUid) {
      setGiftRecipientPreview(null);
      setGiftLookupError('Masukkan ID Pengguna (Firebase UID) terlebih dahulu.');
      return;
    }
    setGiftLookupError(null);

    // Check already-loaded members first for instant preview
    const cached = members.find((m) => m.uid === cleanUid);
    if (cached) {
      setGiftRecipientPreview({
        uid: cached.uid,
        displayName: cached.displayName,
        email: cached.email,
        aetherCoins: cached.aetherCoins,
        unlimitedCoins: cached.unlimitedCoins,
        archetypeIndex: cached.archetypeIndex,
      });
    }

    setGiftLookupLoading(true);
    try {
      const found = await adminLookupMemberByUid(user, cleanUid);
      if (!found) {
        setGiftRecipientPreview(null);
        setGiftLookupError(`Akun dengan ID "${cleanUid}" tidak ditemukan di Firestore.`);
      } else {
        setGiftRecipientPreview(found);
      }
    } catch (err) {
      setGiftRecipientPreview(null);
      setGiftLookupError(err instanceof Error ? err.message : 'Gagal mencari ID pengguna.');
    } finally {
      setGiftLookupLoading(false);
    }
  };

  const handleSendGiftCoins = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUid = giftTargetUid.trim();
    const amt = Math.trunc(Number(giftAmountInput) || 0);
    if (!cleanUid) {
      setGiftLookupError('Masukkan ID Pengguna (UID) tujuan terlebih dahulu.');
      return;
    }
    if (amt < 1) {
      onNotify('Nominal Tidak Valid', 'Masukkan jumlah Gift Coins minimal 1 Koin.');
      return;
    }
    setSendingGift(true);
    setGiftLookupError(null);
    try {
      const res = await adminSendGiftCoins(user, cleanUid, amt, giftMessageInput);
      setSentGiftsHistory((prev) => [res, ...prev].slice(0, 30));
      setMembers((prev) =>
        prev.map((m) => (m.uid === res.recipientUid ? { ...m, aetherCoins: res.nextCoins } : m)),
      );
      setSelectedMember((prev) =>
        prev && prev.uid === res.recipientUid ? { ...prev, aetherCoins: res.nextCoins } : prev,
      );
      setGiftRecipientPreview((prev) =>
        prev && prev.uid === res.recipientUid
          ? { ...prev, aetherCoins: res.nextCoins }
          : {
              uid: res.recipientUid,
              displayName: res.recipientName,
              email: res.recipientEmail,
              aetherCoins: res.nextCoins,
              archetypeIndex: 0,
            },
      );
      setGiftMessageInput('');
      onNotify(
        'Gift Coins Terkirim!',
        `+${res.appliedAmount.toLocaleString('id-ID')} Koin ke ${res.recipientName}. Animasi hadiah akan muncul di layar penerima.`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal mengirim Gift Coins.';
      setGiftLookupError(msg);
      onNotify('Gagal Mengirim Gift Coins', msg);
    } finally {
      setSendingGift(false);
    }
  };

  const giftQuickMatches = useMemo(() => {
    const q = giftTargetUid.trim().toLowerCase();
    if (!q) return members.slice(0, 6);
    return members
      .filter(
        (m) =>
          m.uid.toLowerCase().includes(q) ||
          m.displayName.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q),
      )
      .slice(0, 6);
  }, [giftTargetUid, members]);

  const totalUnreadTopUp = useMemo(
    () => topUpThreads.reduce((sum, t) => sum + t.unreadByAdmin, 0),
    [topUpThreads],
  );

  const selectedTopUpThread = useMemo(
    () => topUpThreads.find((t) => t.uid === selectedThreadUid) ?? null,
    [selectedThreadUid, topUpThreads],
  );

  const selectedThreadMember = useMemo(
    () => (selectedThreadUid ? members.find((m) => m.uid === selectedThreadUid) ?? null : null),
    [members, selectedThreadUid],
  );

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
      if (memberSort === 'coins') {
        return (
          Number(b.unlimitedCoins) - Number(a.unlimitedCoins) ||
          b.aetherCoins - a.aetherCoins ||
          b.bestScore - a.bestScore
        );
      }
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
      totalMembers: Math.max(members.length, totalNetworkMembers),
      activeRooms,
      totalRooms: serverData?.rooms.length ?? 0,
      onlinePlayersInRooms,
      totalMatches,
      cloudSyncCount: serverData?.cloudSyncCount ?? 0,
    };
  }, [members, serverData, totalNetworkMembers]);

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
              onClick={() => setActiveTab('gift')}
              className={`inline-flex items-center justify-between gap-2.5 min-h-[42px] rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'gift'
                  ? 'bg-amber-400 text-slate-950 font-bold'
                  : 'border border-slate-800 bg-slate-900/70 text-slate-300 hover:border-slate-700 hover:text-white'
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <Gift className="w-4 h-4 shrink-0" />
                <span>Gift Coins</span>
              </span>
              {sentGiftsHistory.length > 0 && (
                <span
                  className={`font-mono-num text-[11px] px-1.5 py-0.5 rounded ${
                    activeTab === 'gift'
                      ? 'bg-slate-950/15 text-slate-950'
                      : 'bg-amber-500/20 text-amber-300 font-bold'
                  }`}
                >
                  {sentGiftsHistory.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('topup')}
              className={`inline-flex items-center justify-between gap-2.5 min-h-[42px] rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'topup'
                  ? 'bg-amber-400 text-slate-950 font-bold'
                  : 'border border-slate-800 bg-slate-900/70 text-slate-300 hover:border-slate-700 hover:text-white'
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <MessageCircle className="w-4 h-4 shrink-0" />
                <span>Top-Up &amp; Chat</span>
              </span>
              <span
                className={`font-mono-num text-[11px] px-1.5 py-0.5 rounded ${
                  activeTab === 'topup'
                    ? 'bg-slate-950/15 text-slate-950'
                    : totalUnreadTopUp > 0
                      ? 'bg-emerald-500/20 text-emerald-300 font-bold'
                      : 'bg-slate-800 text-slate-300'
                }`}
              >
                {totalUnreadTopUp > 0 ? `${totalUnreadTopUp} Baru` : topUpThreads.length}
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
                Menampilkan seluruh room aktif (Publik maupun Privat) lintas jaringan dari Firestore &amp; server aktif.
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
              <div className="mt-1 text-[11px] text-slate-400">Seluruh jaringan terdaftar</div>
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
                    <option value="coins">Koin Aether Terbanyak</option>
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
                        <th className="py-3 px-4 font-semibold text-right">Koin Aether</th>
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
                          <td className="py-3 px-4 text-right font-mono-num font-bold whitespace-nowrap">
                            {m.unlimitedCoins ? (
                              <span
                                title={`Koin Unlimited Aktif (Saldo dasar: ${m.aetherCoins.toLocaleString('id-ID')})`}
                                className="inline-flex items-center gap-1 rounded-md border border-cyan-400/45 bg-cyan-500/15 px-2 py-0.5 text-cyan-200"
                              >
                                <InfinityIcon className="w-3.5 h-3.5 text-cyan-300" />
                                <span>Unlimited</span>
                              </span>
                            ) : (
                              <span className="text-amber-300">
                                {m.aetherCoins.toLocaleString('id-ID')}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-mono-num text-slate-200 whitespace-nowrap">
                            {m.totalGames} / <span className="text-emerald-300 font-semibold">{m.wins}</span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono-num font-bold text-slate-100 whitespace-nowrap">
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

          {/* TAB 1B: PAID TOP-UP CHAT INBOX & LIVE COIN CREDIT */}
          {activeTab === 'topup' && (
            <section className="space-y-4">
              <div>
                <h2 className="font-display text-base sm:text-lg font-bold text-white">
                  Inbox Pembelian Koin &amp; Chat Member
                </h2>
                <p className="text-xs text-slate-400">
                  Verifikasi pembayaran member melalui chat langsung, lalu tambah/kurangi Koin Aether atau aktifkan Royal Pass secara instan.
                </p>
              </div>

              {topUpThreads.length === 0 ? (
                <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-8 text-center space-y-2">
                  <MessageCircle className="w-6 h-6 text-slate-500 mx-auto" />
                  <div className="text-sm font-semibold text-slate-200">
                    Belum ada pesan top-up masuk dari member
                  </div>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Saat member menekan tombol Beli Koin (Chat Admin) di Studio Papan, pesan mereka akan muncul secara otomatis di sini. Kamu juga bisa langsung mengubah saldo koin member lewat tab Akun Member.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  {/* Thread List */}
                  <div className="lg:col-span-4 rounded-xl border border-slate-800 bg-slate-900/65 overflow-hidden flex flex-col max-h-[560px]">
                    <div className="px-3.5 py-2.5 border-b border-slate-800 bg-slate-950/60 text-[11px] font-semibold text-slate-400">
                      Daftar Percakapan ({topUpThreads.length})
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scroll divide-y divide-slate-800/80">
                      {topUpThreads.map((t) => {
                        const active = t.uid === selectedThreadUid;
                        const statusText =
                          t.status === 'pending_payment'
                            ? 'Menunggu Bayar'
                            : t.status === 'completed'
                              ? 'Selesai'
                              : 'Aktif';
                        const statusColor =
                          t.status === 'pending_payment'
                            ? 'text-amber-300'
                            : t.status === 'completed'
                              ? 'text-emerald-300'
                              : 'text-sky-300';
                        return (
                          <button
                            key={t.uid}
                            type="button"
                            onClick={() => {
                              setSelectedThreadUid(t.uid);
                              void markTopUpThreadReadByAdmin(user, t.uid);
                            }}
                            className={`w-full text-left px-3.5 py-3 transition-colors cursor-pointer space-y-1 ${
                              active ? 'bg-amber-500/12' : 'hover:bg-slate-800/50'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-white truncate">
                                {t.displayName}
                              </span>
                              {t.unreadByAdmin > 0 ? (
                                <span className="font-mono-num text-[10px] font-bold text-emerald-300 shrink-0">
                                  {t.unreadByAdmin} baru
                                </span>
                              ) : (
                                <span className={`text-[10px] font-semibold shrink-0 ${statusColor}`}>
                                  {statusText}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate">{t.email}</div>
                            {t.requestedPackName && (
                              <div className="text-[11px] font-semibold text-amber-300 truncate">
                                Paket: {t.requestedPackName}
                              </div>
                            )}
                            <div className="text-[11px] text-slate-300 truncate">
                              {t.lastMessageText || '—'}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Active Chat & Inline Coin Controls */}
                  <div className="lg:col-span-8 rounded-xl border border-slate-800 bg-slate-900/65 flex flex-col h-[560px] overflow-hidden">
                    {!selectedTopUpThread ? (
                      <div className="flex-1 flex items-center justify-center text-xs text-slate-400 p-6">
                        Pilih salah satu percakapan member di sebelah kiri.
                      </div>
                    ) : (
                      <>
                        {/* Thread Header + Quick Coin Bar */}
                        <div className="border-b border-slate-800 bg-slate-950/75 p-3.5 space-y-3 shrink-0">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-sm font-bold text-white truncate">
                                {selectedTopUpThread.displayName}
                              </div>
                              <div className="text-[11px] text-slate-400 truncate">
                                {selectedTopUpThread.email}
                                {selectedTopUpThread.requestedPackName
                                  ? ` · Pesanan: ${selectedTopUpThread.requestedPackName}`
                                  : ''}
                              </div>
                            </div>
                            <div className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/35 bg-amber-950/40 px-2.5 py-1.5 text-xs shrink-0">
                              {selectedThreadMember?.unlimitedCoins ? (
                                <>
                                  <InfinityIcon className="w-3.5 h-3.5 text-cyan-300" />
                                  <span className="font-mono-num font-bold text-cyan-200">
                                    ∞ Unlimited
                                  </span>
                                </>
                              ) : (
                                <>
                                  <Coins className="w-3.5 h-3.5 text-amber-400" />
                                  <span className="text-slate-300">Saldo:</span>
                                  <span className="font-mono-num font-bold text-amber-300">
                                    {(selectedThreadMember?.aetherCoins ?? 0).toLocaleString('id-ID')}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Inline Coin Adjustment Controls */}
                          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80">
                            <input
                              type="number"
                              min={1}
                              max={10000000}
                              value={coinAmountInput}
                              onChange={(e) => setCoinAmountInput(e.target.value)}
                              className="w-28 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 font-mono-num text-xs font-bold text-white focus:outline-none focus:border-amber-400"
                              placeholder="Nominal"
                            />
                            <button
                              type="button"
                              disabled={adjustingCoinsUid === selectedTopUpThread.uid}
                              onClick={() => {
                                const amt = Math.abs(Math.trunc(Number(coinAmountInput) || 0));
                                void handleAdminAdjustCoins(selectedTopUpThread, amt, coinNoteInput);
                              }}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50 cursor-pointer whitespace-nowrap"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Tambah Koin</span>
                            </button>
                            <button
                              type="button"
                              disabled={adjustingCoinsUid === selectedTopUpThread.uid}
                              onClick={() => {
                                const amt = Math.abs(Math.trunc(Number(coinAmountInput) || 0));
                                void handleAdminAdjustCoins(selectedTopUpThread, -amt, coinNoteInput);
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-rose-500/45 bg-rose-950/50 px-3 py-1.5 text-xs font-bold text-rose-200 hover:bg-rose-900/60 disabled:opacity-50 cursor-pointer whitespace-nowrap"
                            >
                              <Minus className="w-3.5 h-3.5" />
                              <span>Kurangi</span>
                            </button>
                            <button
                              type="button"
                              disabled={adjustingCoinsUid === selectedTopUpThread.uid}
                              onClick={() => void handleAdminGrantRoyalPass(selectedTopUpThread, coinNoteInput)}
                              className="inline-flex items-center gap-1 rounded-lg border border-amber-400/50 bg-amber-500/15 px-3 py-1.5 text-xs font-bold text-amber-200 hover:bg-amber-500/25 disabled:opacity-50 cursor-pointer whitespace-nowrap"
                            >
                              <Crown className="w-3.5 h-3.5 text-amber-400" />
                              <span>Aktifkan Royal Pass</span>
                            </button>
                            <button
                              type="button"
                              disabled={togglingUnlimitedUid === selectedTopUpThread.uid}
                              onClick={() =>
                                void handleAdminToggleUnlimitedCoins(
                                  selectedTopUpThread,
                                  !(selectedThreadMember?.unlimitedCoins ?? false),
                                  coinNoteInput,
                                )
                              }
                              className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-bold disabled:opacity-50 cursor-pointer whitespace-nowrap ${
                                selectedThreadMember?.unlimitedCoins
                                  ? 'border-cyan-400/60 bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/30'
                                  : 'border-sky-400/45 bg-sky-500/15 text-sky-200 hover:bg-sky-500/25'
                              }`}
                            >
                              <InfinityIcon className="w-3.5 h-3.5 shrink-0" />
                              <span>
                                {selectedThreadMember?.unlimitedCoins
                                  ? 'Matikan Unlimited (∞)'
                                  : 'Set Unlimited (∞)'}
                              </span>
                            </button>
                          </div>
                        </div>

                        {/* Chat Messages */}
                        <div
                          ref={chatScrollRef}
                          className="flex-1 overflow-y-auto custom-scroll p-4 space-y-2.5 bg-slate-950/35"
                        >
                          {threadMessages.length === 0 ? (
                            <div className="text-center text-xs text-slate-400 py-8">
                              Belum ada riwayat pesan di percakapan ini.
                            </div>
                          ) : (
                            threadMessages.map((msg) => {
                              const isAdmin = msg.senderRole === 'admin';
                              return (
                                <div
                                  key={msg.id}
                                  className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}
                                >
                                  <div
                                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                                      isAdmin
                                        ? 'bg-amber-500/15 border border-amber-500/35 text-amber-50'
                                        : 'bg-slate-900 border border-slate-800 text-slate-100'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-3 text-[10px] text-slate-400 mb-1">
                                      <span className={isAdmin ? 'text-amber-300 font-bold' : 'text-sky-300 font-semibold'}>
                                        {isAdmin ? 'Admin Resmi' : msg.senderName}
                                      </span>
                                      <span className="font-mono-num">{formatDateTimeId(msg.createdAtMs)}</span>
                                    </div>
                                    <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                                    {msg.coinDelta !== 0 && (
                                      <div
                                        className={`mt-1.5 pt-1.5 border-t border-white/10 font-mono-num font-bold text-[11px] ${
                                          msg.coinDelta > 0 ? 'text-emerald-300' : 'text-rose-300'
                                        }`}
                                      >
                                        {msg.coinDelta > 0
                                          ? `+${msg.coinDelta.toLocaleString('id-ID')} Koin Aether`
                                          : `${msg.coinDelta.toLocaleString('id-ID')} Koin Aether`}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>

                        {/* Reply Form */}
                        <form
                          onSubmit={(e) => void handleSendAdminReply(e)}
                          className="border-t border-slate-800 bg-slate-950/80 p-3 flex items-center gap-2 shrink-0"
                        >
                          <input
                            type="text"
                            value={adminReplyText}
                            onChange={(e) => setAdminReplyText(e.target.value)}
                            maxLength={500}
                            placeholder="Balas member (info rekening/QRIS, konfirmasi pembayaran, dll)..."
                            className="flex-1 min-h-[40px] rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                          />
                          <button
                            type="submit"
                            disabled={sendingReply || !adminReplyText.trim()}
                            className="inline-flex items-center gap-1.5 min-h-[40px] rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-50 cursor-pointer whitespace-nowrap shrink-0"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Kirim</span>
                          </button>
                        </form>
                      </>
                    )}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* TAB 1C: GIFT COINS BY USER ID (REAL-TIME RECIPIENT ANIMATION) */}
          {activeTab === 'gift' && (
            <section className="space-y-5">
              <div>
                <h2 className="font-display text-base sm:text-lg font-bold text-white">
                  Kirim Gift Coins Berdasarkan ID Pengguna
                </h2>
                <p className="text-xs text-slate-400">
                  Masukkan Firebase UID pemain tertentu untuk mengirim hadiah Koin Aether. Saldo langsung bertambah dan animasi hujan koin emas muncul seketika di layar penerima.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Gift Form */}
                <form
                  onSubmit={(e) => void handleSendGiftCoins(e)}
                  className="lg:col-span-7 rounded-xl border border-slate-800 bg-slate-900/65 p-4 sm:p-5 space-y-4"
                >
                  {/* Step 1: User ID Input + Verify Lookup */}
                  <div className="space-y-2">
                    <label
                      htmlFor="gift-uid-input"
                      className="block text-xs font-semibold text-slate-200"
                    >
                      1. ID Pengguna Tujuan (Firebase UID)
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        id="gift-uid-input"
                        type="text"
                        value={giftTargetUid}
                        onChange={(e) => {
                          const nextVal = e.target.value;
                          setGiftTargetUid(nextVal);
                          setGiftLookupError(null);
                          const exact = members.find((m) => m.uid === nextVal.trim());
                          if (exact) {
                            setGiftRecipientPreview({
                              uid: exact.uid,
                              displayName: exact.displayName,
                              email: exact.email,
                              aetherCoins: exact.aetherCoins,
                              unlimitedCoins: exact.unlimitedCoins,
                              archetypeIndex: exact.archetypeIndex,
                            });
                          } else {
                            setGiftRecipientPreview(null);
                          }
                        }}
                        placeholder="Tempel atau ketik ID Pengguna (contoh: aB3x9K...)"
                        className="flex-1 min-h-[42px] rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 font-mono-num text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                      />
                      <button
                        type="button"
                        disabled={giftLookupLoading || !giftTargetUid.trim()}
                        onClick={() => void handleLookupGiftRecipient()}
                        className="inline-flex items-center justify-center gap-1.5 min-h-[42px] rounded-xl border border-amber-400/45 bg-amber-500/15 px-4 py-2 text-xs font-bold text-amber-200 hover:bg-amber-500/25 disabled:opacity-50 cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <Search className="w-3.5 h-3.5" />
                        <span>{giftLookupLoading ? 'Mencari...' : 'Verifikasi ID'}</span>
                      </button>
                    </div>

                    {giftLookupError && (
                      <div className="rounded-xl border border-rose-500/40 bg-rose-950/30 px-3 py-2 text-xs text-rose-200">
                        {giftLookupError}
                      </div>
                    )}

                    {giftRecipientPreview && (
                      <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <ArchetypeEmblem
                            archetypeIndex={giftRecipientPreview.archetypeIndex}
                            className="w-6 h-6 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-white truncate">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span className="truncate">{giftRecipientPreview.displayName}</span>
                            </div>
                            <div className="text-[11px] text-slate-400 truncate">
                              {giftRecipientPreview.email}
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-[10px] text-slate-400">Saldo Saat Ini</div>
                          <div className="font-mono-num text-xs font-bold text-amber-300">
                            {giftRecipientPreview.unlimitedCoins
                              ? '∞ Unlimited'
                              : `${giftRecipientPreview.aetherCoins.toLocaleString('id-ID')} Koin`}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Step 2: Gift Amount */}
                  <div className="space-y-2 pt-2 border-t border-slate-800/80">
                    <label
                      htmlFor="gift-amount-input"
                      className="block text-xs font-semibold text-slate-200"
                    >
                      2. Jumlah Gift Coins (Koin Aether)
                    </label>
                    <div className="grid grid-cols-5 gap-1.5 font-mono-num">
                      {[250, 500, 1000, 2500, 5000].map((preset) => (
                        <button
                          key={`gift_preset_${preset}`}
                          type="button"
                          onClick={() => setGiftAmountInput(String(preset))}
                          className={`min-h-[36px] rounded-lg border text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                            giftAmountInput === String(preset)
                              ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                              : 'border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-600'
                          }`}
                        >
                          +{preset.toLocaleString('id-ID')}
                        </button>
                      ))}
                    </div>
                    <div className="relative">
                      <Coins className="w-4 h-4 text-amber-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="gift-amount-input"
                        type="number"
                        min={1}
                        max={10000000}
                        value={giftAmountInput}
                        onChange={(e) => setGiftAmountInput(e.target.value)}
                        placeholder="Masukkan jumlah koin..."
                        className="w-full min-h-[42px] rounded-xl border border-slate-700 bg-slate-950 pl-9 pr-3 py-2 font-mono-num text-sm font-bold text-amber-200 focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>

                  {/* Step 3: Optional Celebratory Message */}
                  <div className="space-y-2 pt-2 border-t border-slate-800/80">
                    <label
                      htmlFor="gift-message-input"
                      className="block text-xs font-semibold text-slate-200"
                    >
                      3. Pesan Hadiah untuk Penerima (Opsional)
                    </label>
                    <input
                      id="gift-message-input"
                      type="text"
                      maxLength={200}
                      value={giftMessageInput}
                      onChange={(e) => setGiftMessageInput(e.target.value)}
                      placeholder="Contoh: Selamat memenangkan event minggu ini! Nikmati Koin Aether-mu."
                      className="w-full min-h-[42px] rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        'Hadiah Event Spesial dari Admin!',
                        'Selamat! Bonus Juara Arena 3D.',
                        'Apresiasi Member Setia Aether Serpent.',
                      ].map((tpl) => (
                        <button
                          key={tpl}
                          type="button"
                          onClick={() => setGiftMessageInput(tpl)}
                          className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1 text-[11px] text-slate-300 hover:border-amber-400/50 hover:text-amber-200 transition-colors cursor-pointer"
                        >
                          {tpl}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={sendingGift || !giftTargetUid.trim()}
                    className="w-full inline-flex items-center justify-center gap-2 min-h-[46px] rounded-xl bg-amber-400 px-5 py-2.5 text-xs sm:text-sm font-bold text-slate-950 hover:bg-amber-300 disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap shadow-lg"
                  >
                    <Gift className="w-4 h-4 shrink-0" />
                    <span>
                      {sendingGift
                        ? 'Mengirim Gift Coins...'
                        : `Kirim +${Math.max(0, Math.trunc(Number(giftAmountInput) || 0)).toLocaleString('id-ID')} Gift Coins`}
                    </span>
                  </button>
                </form>

                {/* Quick Member Picker by UID */}
                <div className="lg:col-span-5 rounded-xl border border-slate-800 bg-slate-900/65 p-4 flex flex-col max-h-[460px]">
                  <div className="pb-2.5 border-b border-slate-800">
                    <div className="text-xs font-bold text-white">Pilih Cepat dari Daftar Member</div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Klik member di bawah untuk mengisi ID Pengguna secara otomatis.
                    </p>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scroll divide-y divide-slate-800/80 mt-1">
                    {giftQuickMatches.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400">
                        Tidak ada member cocok di daftar lokal — tetap bisa klik “Verifikasi ID” untuk mencari langsung di Firestore.
                      </div>
                    ) : (
                      giftQuickMatches.map((m) => {
                        const selected = giftTargetUid.trim() === m.uid;
                        return (
                          <button
                            key={`gift_pick_${m.uid}`}
                            type="button"
                            onClick={() => {
                              setGiftTargetUid(m.uid);
                              setGiftLookupError(null);
                              setGiftRecipientPreview({
                                uid: m.uid,
                                displayName: m.displayName,
                                email: m.email,
                                aetherCoins: m.aetherCoins,
                                unlimitedCoins: m.unlimitedCoins,
                                archetypeIndex: m.archetypeIndex,
                              });
                            }}
                            className={`w-full text-left py-2.5 px-2.5 rounded-lg transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                              selected ? 'bg-amber-500/15' : 'hover:bg-slate-800/60'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-white truncate">
                                {m.displayName}
                              </div>
                              <div className="font-mono-num text-[10px] text-slate-400 truncate">
                                {m.uid}
                              </div>
                            </div>
                            <span
                              className={`font-mono-num text-xs font-bold shrink-0 ${
                                m.unlimitedCoins ? 'text-cyan-300' : 'text-amber-300'
                              }`}
                            >
                              {m.unlimitedCoins ? '∞ Unlimited' : m.aetherCoins.toLocaleString('id-ID')}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Session Gift Log */}
              <div className="space-y-2.5">
                <div className="text-xs font-semibold text-slate-300">
                  Riwayat Gift Coins Terkirim (Sesi Ini)
                </div>
                {sentGiftsHistory.length === 0 ? (
                  <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 text-center text-xs text-slate-400">
                    Belum ada Gift Coins yang dikirim pada sesi ini.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] text-slate-400">
                          <th className="py-2.5 px-4 font-semibold">Penerima</th>
                          <th className="py-2.5 px-4 font-semibold">ID Pengguna</th>
                          <th className="py-2.5 px-4 font-semibold text-right">Gift Coins</th>
                          <th className="py-2.5 px-4 font-semibold">Pesan</th>
                          <th className="py-2.5 px-4 font-semibold text-right">Waktu</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80">
                        {sentGiftsHistory.map((item) => (
                          <tr key={item.giftId} className="hover:bg-slate-800/40">
                            <td className="py-2.5 px-4 font-semibold text-white whitespace-nowrap">
                              {item.recipientName}
                            </td>
                            <td className="py-2.5 px-4 font-mono-num text-[11px] text-slate-400">
                              {item.recipientUid}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono-num font-bold text-emerald-300 whitespace-nowrap">
                              +{item.appliedAmount.toLocaleString('id-ID')} Koin
                            </td>
                            <td className="py-2.5 px-4 text-slate-300 max-w-[240px] truncate">
                              {item.message || '—'}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono-num text-[11px] text-slate-400 whitespace-nowrap">
                              {formatDateTimeId(item.sentAtMs)}
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

          {/* TAB 2: OPEN MULTIPLAYER ROOMS */}
          {activeTab === 'rooms' && (
            <section className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-base sm:text-lg font-bold text-white">
                    Daftar Room Multiplayer Aktif
                  </h2>
                  <p className="text-xs text-slate-400">
                    Klik profil pemain di dalam room untuk menargetkan pemenang secara rahasia — permainan tetap berjalan normal tanpa notifikasi ke pemain.
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
                              <span>·</span>
                              {(() => {
                                const lastAct = room.lastActivityAt || room.updatedAt || room.createdAt;
                                const idleSec = Math.max(0, Math.floor((nowTick - lastAct) / 1000));
                                const remainSec = Math.max(0, 120 - idleSec);
                                const isWarning = remainSec <= 35;
                                return (
                                  <span
                                    className={`inline-flex items-center gap-1 font-mono-num ${
                                      isWarning ? 'text-rose-300 font-semibold' : 'text-amber-300/90'
                                    }`}
                                    title="Room otomatis ditutup jika tidak ada pergerakan pemain selama 2 menit"
                                  >
                                    <Clock className="w-3 h-3" />
                                    Diam {idleSec}d · Auto-tutup {remainSec}d
                                  </span>
                                );
                              })()}
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

                        {/* Admin Winner Override Toggle Panel (Active Rooms) */}
                        {room.status !== 'finished' && room.players.length > 0 && (() => {
                          const isOverrideActive = Boolean(
                            room.designatedWinnerId &&
                              room.players.some((pl) => pl.id === room.designatedWinnerId),
                          );
                          const draftId = overrideDraftByRoom[room.code];
                          const validDraftId =
                            draftId && room.players.some((pl) => pl.id === draftId)
                              ? draftId
                              : null;
                          const selectedOverridePlayerId =
                            (isOverrideActive ? room.designatedWinnerId : null) ||
                            validDraftId ||
                            room.players[0].id;
                          const selectedOverridePlayer =
                            room.players.find((pl) => pl.id === selectedOverridePlayerId) ||
                            room.players[0];
                          const isUpdatingOverride =
                            declaringWinnerKey !== null &&
                            declaringWinnerKey.startsWith(`${room.code}:`);

                          return (
                            <div
                              className={`rounded-xl border px-3.5 py-3 transition-colors ${
                                isOverrideActive
                                  ? 'border-amber-400/65 bg-gradient-to-r from-amber-500/15 via-amber-400/10 to-emerald-500/10 shadow-[0_0_24px_rgba(251,191,36,0.16)]'
                                  : 'border-slate-800/90 bg-slate-950/75'
                              }`}
                            >
                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                <div className="flex items-start gap-2.5 min-w-0">
                                  <div
                                    className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 ${
                                      isOverrideActive
                                        ? 'border-amber-300/70 bg-amber-500/25 text-amber-200 shadow-[0_0_14px_rgba(251,191,36,0.45)]'
                                        : 'border-amber-400/30 bg-amber-500/10 text-amber-300'
                                    }`}
                                  >
                                    <ShieldCheck className="w-4 h-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="text-xs font-bold text-slate-100">
                                        Admin Winner Override
                                      </span>
                                      <span
                                        className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                                          isOverrideActive
                                            ? 'border-amber-300/60 bg-amber-500/20 text-amber-200'
                                            : 'border-slate-700 bg-slate-800/90 text-slate-400'
                                        }`}
                                      >
                                        {isOverrideActive ? 'AKTIF · AURA EMAS' : 'NONAKTIF'}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                                      Pemain terpilih 100% kebal ular &amp; kutukan, mendapat dorongan tangga beruntun hingga menang, serta ditandai Aura Emas khusus Admin di Arena 3D.
                                    </p>
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                                  <select
                                    aria-label={`Pilih pemain untuk Admin Winner Override di Room ${room.code}`}
                                    disabled={isUpdatingOverride}
                                    value={selectedOverridePlayerId}
                                    onChange={(e) => {
                                      const nextId = e.target.value;
                                      setOverrideDraftByRoom((prev) => ({
                                        ...prev,
                                        [room.code]: nextId,
                                      }));
                                      if (isOverrideActive && nextId !== room.designatedWinnerId) {
                                        void handleConfirmDeclareWinner(room, nextId);
                                      }
                                    }}
                                    className="min-h-[36px] max-w-[220px] rounded-lg border border-slate-700/90 bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-slate-100 focus:border-amber-400/70 focus:outline-none disabled:opacity-50 cursor-pointer"
                                  >
                                    {room.players.map((pl) => (
                                      <option key={pl.id} value={pl.id}>
                                        {pl.name}
                                        {pl.id === room.hostId ? ' (Host)' : ''} · P{pl.tile}
                                        {room.boardMode === 'team' && pl.team
                                          ? ` · Tim ${pl.team}`
                                          : ''}
                                      </option>
                                    ))}
                                  </select>

                                  <button
                                    type="button"
                                    role="switch"
                                    aria-checked={isOverrideActive}
                                    aria-label={`Toggle Admin Winner Override untuk Room ${room.code}`}
                                    disabled={isUpdatingOverride}
                                    onClick={() => {
                                      setConfirmCloseCode(null);
                                      setKickCandidate(null);
                                      setWinnerCandidate(null);
                                      if (isOverrideActive) {
                                        void handleConfirmDeclareWinner(room, null);
                                      } else {
                                        void handleConfirmDeclareWinner(
                                          room,
                                          selectedOverridePlayerId,
                                        );
                                      }
                                    }}
                                    className={`inline-flex items-center gap-2 min-h-[36px] rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 ${
                                      isOverrideActive
                                        ? 'border-amber-400/70 bg-amber-500/20 text-amber-100 hover:bg-amber-500/30'
                                        : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-amber-400/50 hover:text-amber-200'
                                    }`}
                                  >
                                    <span
                                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                        isOverrideActive ? 'bg-amber-400' : 'bg-slate-700'
                                      }`}
                                    >
                                      <span
                                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                                          isOverrideActive ? 'translate-x-4.5' : 'translate-x-1'
                                        }`}
                                      />
                                    </span>
                                    <span>
                                      {isUpdatingOverride
                                        ? 'Menyimpan...'
                                        : isOverrideActive
                                          ? 'ON'
                                          : 'OFF'}
                                    </span>
                                  </button>
                                </div>
                              </div>

                              {isOverrideActive && selectedOverridePlayer && (
                                <div className="mt-2.5 pt-2.5 border-t border-amber-400/25 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-amber-100">
                                  <span className="inline-flex items-center gap-2 font-semibold">
                                    <span className="relative inline-flex items-center justify-center w-6 h-6 rounded-full border border-amber-300 bg-amber-500/25 shadow-[0_0_14px_rgba(251,191,36,0.7)]">
                                      <ArchetypeEmblem
                                        archetypeIndex={selectedOverridePlayer.archetypeIndex ?? 0}
                                        className="w-3.5 h-3.5"
                                      />
                                    </span>
                                    Target Aura Emas:{' '}
                                    <strong className="text-amber-200">
                                      {selectedOverridePlayer.name}
                                    </strong>
                                  </span>
                                  <span className="inline-flex items-center gap-1 text-emerald-300">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Kebal Ular &amp; Kutukan
                                  </span>
                                  <span className="inline-flex items-center gap-1 text-amber-200">
                                    <Flame className="w-3.5 h-3.5 text-amber-300" />
                                    Garansi Tangga &amp; Menang (Hanya Terlihat Admin)
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {/* Players in Room (Target Stealth Winner OR Kick Lagging Player) */}
                        <div className="pt-2.5 border-t border-slate-800/80 space-y-2.5">
                          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                            <span>
                              Klik kartu pemain untuk memilih target cepat, atau klik tombol merah untuk mengeluarkan pemain yang lag:
                            </span>
                            {room.status === 'finished' && room.winnerId ? (
                              <span className="inline-flex items-center gap-1 font-semibold text-amber-300">
                                <Crown className="w-3.5 h-3.5 text-amber-400" />
                                Pemenang:{' '}
                                {room.players.find((pl) => pl.id === room.winnerId)?.name ||
                                  'Selesai'}
                              </span>
                            ) : room.designatedWinnerId ? (
                              <span className="inline-flex items-center gap-1 font-semibold text-amber-300">
                                <Crown className="w-3.5 h-3.5 text-amber-400" />
                                Aura Emas Override:{' '}
                                {room.players.find((pl) => pl.id === room.designatedWinnerId)?.name ||
                                  'Aktif'}
                              </span>
                            ) : null}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                            {room.players.map((p) => {
                              const isCurrentWinner =
                                room.status === 'finished' && room.winnerId === p.id;
                              const isDesignatedTarget =
                                room.status !== 'finished' && room.designatedWinnerId === p.id;
                              const isSelectedCandidate =
                                winnerCandidate?.room.code === room.code &&
                                winnerCandidate.player.id === p.id;
                              const isSelectedKick =
                                kickCandidate?.room.code === room.code &&
                                kickCandidate.player.id === p.id;
                              const isLagging = !p.connected || p.pingMs >= 250;
                              return (
                                <div
                                  key={p.id}
                                  className={`group flex items-stretch gap-1.5 rounded-lg border transition-all ${
                                    isSelectedKick
                                      ? 'border-rose-400 bg-rose-500/15 ring-1 ring-rose-400/50'
                                      : isCurrentWinner
                                        ? 'border-amber-400/70 bg-amber-500/15'
                                        : isDesignatedTarget
                                          ? 'border-amber-400 bg-gradient-to-br from-amber-500/20 via-amber-400/10 to-slate-950 ring-1 ring-amber-300/65 shadow-[0_0_22px_rgba(251,191,36,0.34)]'
                                          : isSelectedCandidate
                                            ? 'border-amber-400 bg-amber-500/20 ring-1 ring-amber-400/50'
                                            : 'border-slate-800/90 bg-slate-950/60 hover:border-amber-400/50 hover:bg-slate-900'
                                  }`}
                                >
                                  <button
                                    type="button"
                                    disabled={
                                      isCurrentWinner ||
                                      room.status === 'finished' ||
                                      declaringWinnerKey !== null
                                    }
                                    onClick={() => {
                                      setConfirmCloseCode(null);
                                      setKickCandidate(null);
                                      setWinnerCandidate(
                                        isSelectedCandidate
                                          ? null
                                          : { room, player: p },
                                      );
                                    }}
                                    className={`flex-1 min-w-0 text-left flex items-center justify-between gap-2 px-3 py-2.5 text-xs ${
                                      isCurrentWinner || room.status === 'finished'
                                        ? 'cursor-default'
                                        : 'cursor-pointer'
                                    }`}
                                    title={
                                      isCurrentWinner
                                        ? `${p.name} adalah pemenang room ini`
                                        : isDesignatedTarget
                                          ? `${p.name} sedang dilindungi Aura Emas (Target Winner Override)`
                                          : `Klik untuk menargetkan ${p.name} sebagai pemenang rahasia`
                                    }
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <div
                                        className={`relative flex items-center justify-center shrink-0 rounded-full transition-all ${
                                          isDesignatedTarget
                                            ? 'w-8 h-8 border-2 border-amber-300 bg-amber-500/25 shadow-[0_0_16px_rgba(251,191,36,0.72)]'
                                            : isCurrentWinner
                                              ? 'w-7 h-7 border border-amber-400/70 bg-amber-500/15'
                                              : 'w-6 h-6'
                                        }`}
                                      >
                                        <ArchetypeEmblem
                                          archetypeIndex={p.archetypeIndex ?? 0}
                                          className={
                                            isDesignatedTarget ? 'w-5 h-5 shrink-0' : 'w-5 h-5 shrink-0'
                                          }
                                        />
                                      </div>
                                      <div className="min-w-0">
                                        <div className="font-semibold text-slate-100 truncate flex items-center gap-1">
                                          <span className="truncate">
                                            {p.name}
                                            {p.id === room.hostId ? ' (Host)' : ''}
                                          </span>
                                        </div>
                                        <div
                                          className={`font-mono-num text-[10px] ${
                                            isLagging ? 'text-rose-300 font-semibold' : 'text-slate-400'
                                          }`}
                                        >
                                          {p.connected ? `Online · ${p.pingMs}ms` : 'Terputus / Lag'}
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
                                      ) : isDesignatedTarget ? (
                                        <span className="inline-flex items-center gap-1 font-bold text-amber-200">
                                          <Crown className="w-3.5 h-3.5 text-amber-300" />
                                          Aura Emas
                                        </span>
                                      ) : (
                                        <div className="font-bold text-amber-300">P{p.tile}</div>
                                      )}
                                      <div className="text-[10px] text-slate-400">{p.score} pts</div>
                                    </div>
                                  </button>

                                  <button
                                    type="button"
                                    disabled={kickingPlayerKey !== null}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setConfirmCloseCode(null);
                                      setWinnerCandidate(null);
                                      setKickCandidate(
                                        isSelectedKick ? null : { room, player: p },
                                      );
                                    }}
                                    title={`Keluarkan ${p.name} dari Room #${room.code} (lag / moderasi)`}
                                    aria-label={`Keluarkan ${p.name}`}
                                    className={`px-2.5 flex items-center justify-center border-l transition-colors cursor-pointer disabled:opacity-50 rounded-r-lg ${
                                      isSelectedKick
                                        ? 'border-rose-400/50 bg-rose-600 text-white'
                                        : 'border-slate-800/80 text-rose-300 hover:bg-rose-600/25 hover:text-rose-100'
                                    }`}
                                  >
                                    <UserMinus className="w-4 h-4" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>

                          {/* Inline 2-Step Confirmation Bar to Kick a Lagging / Disruptive Player */}
                          {kickCandidate?.room.code === room.code && (
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-lg border border-rose-500/45 bg-rose-500/10 px-3.5 py-2.5 text-xs">
                              <div className="space-y-0.5 min-w-0">
                                <div className="flex items-center gap-2 text-rose-100 min-w-0">
                                  <UserMinus className="w-4 h-4 text-rose-400 shrink-0" />
                                  <span className="truncate">
                                    Keluarkan{' '}
                                    <strong className="text-white">
                                      {kickCandidate.player.name}
                                    </strong>{' '}
                                    dari Room #{room.code}?
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-300 pl-6">
                                  Berguna saat pemain ngelag / terputus. Giliran akan langsung diteruskan ke pemain berikutnya tanpa membuat room macet.
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  disabled={kickingPlayerKey !== null}
                                  onClick={() =>
                                    void handleConfirmKickPlayer(room, kickCandidate.player)
                                  }
                                  className="min-h-[34px] rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-500 disabled:opacity-50 cursor-pointer"
                                >
                                  {kickingPlayerKey === `${room.code}:${kickCandidate.player.id}`
                                    ? 'Mengeluarkan...'
                                    : 'Ya, Keluarkan Pemain'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setKickCandidate(null)}
                                  className="min-h-[34px] rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:text-white cursor-pointer"
                                >
                                  Batal
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Inline 2-Step Confirmation Bar to Set or Clear Stealth Winner Target */}
                          {winnerCandidate?.room.code === room.code && (
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-lg border border-amber-400/45 bg-amber-500/10 px-3.5 py-2.5 text-xs">
                              <div className="space-y-0.5 min-w-0">
                                <div className="flex items-center gap-2 text-amber-100 min-w-0">
                                  <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                                  <span className="truncate">
                                    {room.designatedWinnerId === winnerCandidate.player.id ? (
                                      <>
                                        Batalkan target pemenang rahasia untuk{' '}
                                        <strong className="text-white">
                                          {winnerCandidate.player.name}
                                        </strong>
                                        ?
                                      </>
                                    ) : (
                                      <>
                                        Targetkan{' '}
                                        <strong className="text-white">
                                          {winnerCandidate.player.name}
                                        </strong>{' '}
                                        sebagai pemenang rahasia Room #{room.code}?
                                      </>
                                    )}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-300 pl-6">
                                  Mode Optimal Aktif: Pemain terpilih 100% aman dari ular, kutukan, &amp; dorongan duel serta terus diarahkan naik tangga menuju kemenangan, sedangkan lawan terus diarahkan terkena ular — tetap rahasia tanpa notifikasi di chat.
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {room.designatedWinnerId === winnerCandidate.player.id ? (
                                  <button
                                    type="button"
                                    disabled={declaringWinnerKey !== null}
                                    onClick={() => void handleConfirmDeclareWinner(room, null)}
                                    className="inline-flex items-center gap-1.5 min-h-[36px] rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-400 disabled:opacity-50 cursor-pointer"
                                  >
                                    <span>
                                      {declaringWinnerKey === `${room.code}:clear`
                                        ? 'Memproses...'
                                        : 'Batalkan Target'}
                                    </span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={declaringWinnerKey !== null}
                                    onClick={() =>
                                      void handleConfirmDeclareWinner(
                                        room,
                                        winnerCandidate.player.id,
                                      )
                                    }
                                    className="inline-flex items-center gap-1.5 min-h-[36px] rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-300 disabled:opacity-50 cursor-pointer"
                                  >
                                    <Crown className="w-3.5 h-3.5" />
                                    <span>
                                      {declaringWinnerKey ===
                                      `${room.code}:${winnerCandidate.player.id}`
                                        ? 'Memproses...'
                                        : 'Set Pemenang Rahasia'}
                                    </span>
                                  </button>
                                )}
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
              <div className="space-y-2 pb-4 border-b border-slate-800">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-400">Firebase UID (ID Pengguna)</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleCopyUid(selectedMember.uid)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] font-semibold text-slate-200 hover:border-amber-400/50 cursor-pointer whitespace-nowrap"
                    >
                      <Copy className="w-3 h-3 text-amber-400" />
                      <span>{copiedUid === selectedMember.uid ? 'Tersalin' : 'Salin UID'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setGiftTargetUid(selectedMember.uid);
                        setGiftLookupError(null);
                        setGiftRecipientPreview({
                          uid: selectedMember.uid,
                          displayName: selectedMember.displayName,
                          email: selectedMember.email,
                          aetherCoins: selectedMember.aetherCoins,
                          unlimitedCoins: selectedMember.unlimitedCoins,
                          archetypeIndex: selectedMember.archetypeIndex,
                        });
                        setSelectedMember(null);
                        setActiveTab('gift');
                      }}
                      className="inline-flex items-center gap-1 rounded-lg bg-amber-400 px-2.5 py-1 text-[11px] font-bold text-slate-950 hover:bg-amber-300 cursor-pointer whitespace-nowrap"
                    >
                      <Gift className="w-3 h-3" />
                      <span>Gift Coins</span>
                    </button>
                  </div>
                </div>
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
                  <div className="text-[11px] text-slate-400 font-sans">Total Skor Karier</div>
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

              {/* Admin Wallet & Coin Adjustment Panel */}
              <div className="rounded-xl border border-amber-500/35 bg-amber-950/15 p-3.5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-semibold text-amber-300">
                    <Coins className="w-4 h-4 shrink-0" />
                    <span>Kelola Poin / Koin Aether Member</span>
                  </div>
                  {selectedMember.unlimitedCoins ? (
                    <span className="inline-flex items-center gap-1 font-mono-num text-sm font-bold text-cyan-200">
                      <InfinityIcon className="w-4 h-4 text-cyan-300" />
                      <span>Unlimited</span>
                    </span>
                  ) : (
                    <span className="font-mono-num text-base font-bold text-amber-200">
                      {selectedMember.aetherCoins.toLocaleString('id-ID')} Koin
                    </span>
                  )}
                </div>

                {/* Admin Unlimited Coins Toggle Banner */}
                <div
                  className={`rounded-xl border p-3 flex flex-wrap items-center justify-between gap-2.5 ${
                    selectedMember.unlimitedCoins
                      ? 'border-cyan-400/50 bg-cyan-950/35'
                      : 'border-slate-700/80 bg-slate-950/70'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                      <InfinityIcon
                        className={`w-4 h-4 shrink-0 ${
                          selectedMember.unlimitedCoins ? 'text-cyan-300' : 'text-slate-400'
                        }`}
                      />
                      <span>Mode Koin Unlimited (∞)</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                      {selectedMember.unlimitedCoins
                        ? `Aktif — member bisa membuka semua papan & pion premium gratis (saldo dasar: ${selectedMember.aetherCoins.toLocaleString('id-ID')} Koin).`
                        : 'Aktifkan agar member memiliki Koin Aether tak terbatas yang hanya dapat diatur Admin.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={togglingUnlimitedUid === selectedMember.uid}
                    onClick={() =>
                      void handleAdminToggleUnlimitedCoins(
                        selectedMember,
                        !selectedMember.unlimitedCoins,
                        coinNoteInput,
                      )
                    }
                    className={`inline-flex items-center justify-center gap-1.5 min-h-[36px] rounded-xl px-3.5 py-1.5 text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap shrink-0 ${
                      selectedMember.unlimitedCoins
                        ? 'border border-rose-400/50 bg-rose-950/60 text-rose-200 hover:bg-rose-900/70'
                        : 'bg-cyan-400 text-slate-950 hover:bg-cyan-300 shadow'
                    }`}
                  >
                    <InfinityIcon className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {togglingUnlimitedUid === selectedMember.uid
                        ? 'Menyimpan...'
                        : selectedMember.unlimitedCoins
                          ? 'Nonaktifkan Unlimited'
                          : 'Aktifkan Unlimited (∞)'}
                    </span>
                  </button>
                </div>

                <div className="text-[11px] text-slate-400">
                  Papan terbuka:{' '}
                  <span className="font-mono-num text-slate-200 font-semibold">
                    {selectedMember.unlockedBoardIds.length} tema
                  </span>
                  . Perubahan saldo otomatis tercatat di chat top-up &amp; langsung tersinkron ke perangkat member.
                </div>

                {/* Quick Presets */}
                <div className="grid grid-cols-4 gap-1.5 font-mono-num">
                  {[500, 1000, 1850, 3900].map((preset) => (
                    <button
                      key={`preset_${preset}`}
                      type="button"
                      onClick={() => setCoinAmountInput(String(preset))}
                      className={`rounded-lg border py-1 text-[11px] font-bold cursor-pointer transition-colors ${
                        coinAmountInput === String(preset)
                          ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                          : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      {preset.toLocaleString('id-ID')}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <input
                    type="number"
                    min={1}
                    max={10000000}
                    value={coinAmountInput}
                    onChange={(e) => setCoinAmountInput(e.target.value)}
                    placeholder="Jumlah Koin Aether..."
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono-num text-xs font-bold text-white focus:outline-none focus:border-amber-400"
                  />
                  <input
                    type="text"
                    value={coinNoteInput}
                    onChange={(e) => setCoinNoteInput(e.target.value)}
                    maxLength={120}
                    placeholder="Catatan opsional (mis. Bukti transfer BCA / koreksi saldo)..."
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={adjustingCoinsUid === selectedMember.uid}
                    onClick={() => {
                      const amt = Math.abs(Math.trunc(Number(coinAmountInput) || 0));
                      void handleAdminAdjustCoins(selectedMember, amt, coinNoteInput);
                    }}
                    className="inline-flex items-center justify-center gap-1.5 min-h-[38px] rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50 cursor-pointer whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Koin</span>
                  </button>
                  <button
                    type="button"
                    disabled={adjustingCoinsUid === selectedMember.uid}
                    onClick={() => {
                      const amt = Math.abs(Math.trunc(Number(coinAmountInput) || 0));
                      void handleAdminAdjustCoins(selectedMember, -amt, coinNoteInput);
                    }}
                    className="inline-flex items-center justify-center gap-1.5 min-h-[38px] rounded-xl border border-rose-500/45 bg-rose-950/50 px-3 py-2 text-xs font-bold text-rose-200 hover:bg-rose-900/60 disabled:opacity-50 cursor-pointer whitespace-nowrap"
                  >
                    <Minus className="w-3.5 h-3.5" />
                    <span>Kurangi Koin</span>
                  </button>
                </div>

                <button
                  type="button"
                  disabled={adjustingCoinsUid === selectedMember.uid}
                  onClick={() => void handleAdminGrantRoyalPass(selectedMember, coinNoteInput)}
                  className="w-full inline-flex items-center justify-center gap-1.5 min-h-[38px] rounded-xl border border-amber-400/50 bg-amber-500/15 px-3 py-2 text-xs font-bold text-amber-200 hover:bg-amber-500/25 disabled:opacity-50 cursor-pointer whitespace-nowrap"
                >
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  <span>Aktifkan Royal Pass (5 Papan Premium + 1.000 Koin)</span>
                </button>
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
