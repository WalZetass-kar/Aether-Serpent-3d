import React, { useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  Check,
  Copy,
  DoorOpen,
  Hash,
  Search,
  Send,
  ShieldAlert,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { PLAYER_ARCHETYPES } from '../../shared/gameConfig';
import { deriveNumericFriendId } from '../services/firebaseAccountService';
import {
  acceptFriendRequest,
  clearRoomInvite,
  removeOrDeclineFriendship,
  sendRoomInviteToFriend,
  type FriendshipSummary,
} from '../services/friendsService';
import { ArchetypeEmblem } from './FantasyIcons';
import {
  FriendSearchPanel,
  type FriendRelationLookupEntry,
} from './FriendSearchPanel';

interface FriendsModalProps {
  open: boolean;
  initialTab?: FriendsTab;
  onClose: () => void;
  user: User | null;
  myName: string;
  myArchetypeIndex: number;
  summary: FriendshipSummary;
  activeRoomCode?: string | null;
  onOpenAuth: (tab: 'login' | 'register') => void;
  onOpenDrawer?: () => void;
  onJoinInvitedRoom: (roomCode: string, friendshipId: string) => void;
  onNotify: (title: string, subtitle?: string) => void;
}

export type FriendsTab = 'friends' | 'requests' | 'search';

export const FriendsModal: React.FC<FriendsModalProps> = ({
  open,
  initialTab = 'friends',
  onClose,
  user,
  myName,
  myArchetypeIndex,
  summary,
  activeRoomCode,
  onOpenAuth,
  onOpenDrawer,
  onJoinInvitedRoom,
  onNotify,
}) => {
  const [tab, setTab] = useState<FriendsTab>(initialTab);
  const [busyUidOrId, setBusyUidOrId] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const incomingCount = summary.incomingRequests.length;
  const totalReqCount = summary.incomingRequests.length + summary.outgoingRequests.length;

  const relationByUid = useMemo(() => {
    const map = new Map<string, FriendRelationLookupEntry>();
    for (const f of summary.friends) {
      map.set(f.friendUid, { status: 'accepted', friendshipId: f.id });
    }
    for (const req of summary.incomingRequests) {
      map.set(req.friendUid, { status: 'incoming', friendshipId: req.id });
    }
    for (const req of summary.outgoingRequests) {
      map.set(req.friendUid, { status: 'outgoing', friendshipId: req.id });
    }
    return map;
  }, [summary]);

  useEffect(() => {
    if (!open) {
      setConfirmRemoveId(null);
      return;
    }
    setTab(initialTab);
  }, [open, initialTab]);

  if (!open) return null;

  const handleCopyText = async (value: string, key: string) => {
    if (!value || typeof navigator === 'undefined' || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedId(key);
      window.setTimeout(() => setCopiedId((prev) => (prev === key ? null : prev)), 1600);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleAccept = async (friendshipId: string, friendName: string, friendUid?: string) => {
    if (!user?.emailVerified) return;
    setBusyUidOrId(friendshipId);
    try {
      await acceptFriendRequest(user, friendshipId, myName, friendUid);
      onNotify('Teman Ditambahkan', `Kamu dan ${friendName} sekarang berteman!`);
    } catch {
      onNotify('Gagal Menerima', 'Coba lagi beberapa saat lagi.');
    } finally {
      setBusyUidOrId(null);
    }
  };

  const handleRemoveOrDecline = async (friendshipId: string, label: string) => {
    if (!user?.emailVerified) return;
    setBusyUidOrId(friendshipId);
    try {
      await removeOrDeclineFriendship(user, friendshipId);
      setConfirmRemoveId(null);
      onNotify('Selesai', label);
    } catch {
      onNotify('Gagal Memproses', 'Tidak dapat memperbarui data pertemanan.');
    } finally {
      setBusyUidOrId(null);
    }
  };

  const handleInviteToRoom = async (
    friendshipId: string,
    friendName: string,
    friendUid?: string,
  ) => {
    if (!user?.emailVerified || !activeRoomCode) return;
    setBusyUidOrId(`inv-${friendshipId}`);
    try {
      await sendRoomInviteToFriend(user, friendshipId, activeRoomCode, friendUid, myName);
      onNotify('Undangan Terkirim', `${friendName} diundang ke Room #${activeRoomCode}.`);
    } catch {
      onNotify('Gagal Mengundang', 'Tidak dapat mengirim undangan room.');
    } finally {
      setBusyUidOrId(null);
    }
  };

  const myNumericId = user?.uid ? deriveNumericFriendId(user.uid) : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 sm:p-4 pointer-events-auto">
      <div className="glass-panel rounded-2xl sm:rounded-3xl w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden border border-amber-500/35 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-slate-800/90 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl border border-amber-400/45 bg-amber-500/15 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-amber-300" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-base sm:text-xl font-bold text-gold-gradient truncate">
                Teman &amp; Pencarian Pemain
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                Cari berdasarkan nama atau User ID, tambah teman &amp; undang ke room
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup Panel Teman"
            className="w-9 h-9 rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:border-amber-400/50 flex items-center justify-center cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!user || !user.emailVerified ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl border border-amber-400/40 bg-amber-500/10 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6 text-amber-300" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm sm:text-base font-bold text-white">
                {user ? 'Verifikasi Email Diperlukan' : 'Masuk Akun Diperlukan'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                {user
                  ? 'Verifikasi email akun kamu terlebih dahulu agar dapat mencari pemain lain, menambah teman, dan menerima undangan room.'
                  : 'Masuk dengan akun terverifikasi untuk menambahkan teman, mencari ID pemain, dan bermain bersama di arena daring.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAuth('login');
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-2.5 text-xs sm:text-sm font-bold text-slate-950 hover:bg-amber-300 cursor-pointer"
            >
              <span>{user ? 'Kelola Verifikasi Akun' : 'Masuk / Daftar Sekarang'}</span>
            </button>
          </div>
        ) : (
          <>
            {/* My Shareable User ID & Numeric ID Strip */}
            <div className="px-4 sm:px-6 py-2.5 border-b border-slate-800/80 bg-slate-950/60 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="flex flex-wrap items-center gap-2 min-w-0 text-xs">
                <ArchetypeEmblem archetypeIndex={myArchetypeIndex} className="w-4 h-4 shrink-0" />
                <span className="font-semibold text-white truncate max-w-[130px]">{myName}</span>
                <span className="text-slate-500">·</span>
                <button
                  type="button"
                  onClick={() => void handleCopyText(myNumericId, 'my-num')}
                  title="Salin ID angka Anda"
                  className="font-mono-num inline-flex items-center gap-1 text-[11px] text-amber-200 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-md hover:border-amber-400/50 cursor-pointer"
                >
                  <Hash className="w-3 h-3 text-amber-400 shrink-0" />
                  <span>{myNumericId}</span>
                  {copiedId === 'my-num' ? (
                    <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                  ) : (
                    <Copy className="w-3 h-3 text-slate-500 shrink-0" />
                  )}
                </button>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {onOpenDrawer && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenDrawer();
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-sky-400/35 bg-sky-500/10 px-2.5 py-1 text-[11px] font-semibold text-sky-200 hover:bg-sky-500/20 cursor-pointer"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Drawer Online</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void handleCopyText(user.uid, 'my-uid')}
                  className="inline-flex items-center gap-1 rounded-lg border border-amber-500/35 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-200 hover:bg-amber-500/20 cursor-pointer shrink-0"
                >
                  {copiedId === 'my-uid' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>UID Disalin</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin UID</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Segmented Tab Navigation */}
            <div className="px-4 sm:px-6 pt-3 pb-2 shrink-0">
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-950/90 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setTab('friends')}
                  className={`inline-flex items-center justify-center gap-1.5 min-h-[38px] px-2 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                    tab === 'friends'
                      ? 'bg-amber-400 text-slate-950 shadow'
                      : 'text-slate-300 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <Users className="w-3.5 h-3.5 shrink-0" />
                  <span>Teman ({summary.friends.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTab('requests')}
                  className={`inline-flex items-center justify-center gap-1.5 min-h-[38px] px-2 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                    tab === 'requests'
                      ? 'bg-amber-400 text-slate-950 shadow'
                      : 'text-slate-300 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5 shrink-0" />
                  <span>Permintaan</span>
                  {incomingCount > 0 && (
                    <span
                      className={`font-mono-num text-[10px] px-1.5 py-0.5 rounded font-extrabold ${
                        tab === 'requests'
                          ? 'bg-slate-950 text-amber-300'
                          : 'bg-rose-500 text-white'
                      }`}
                    >
                      {incomingCount}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setTab('search')}
                  className={`inline-flex items-center justify-center gap-1.5 min-h-[38px] px-2 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                    tab === 'search'
                      ? 'bg-amber-400 text-slate-950 shadow'
                      : 'text-slate-300 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <Search className="w-3.5 h-3.5 shrink-0" />
                  <span>Cari &amp; Tambah</span>
                </button>
              </div>
            </div>

            {/* Body Content */}
            <div className="flex-1 overflow-y-auto custom-scroll px-4 sm:px-6 pb-5 pt-2 space-y-3">
              {tab === 'friends' && (
                <>
                  {summary.friends.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/50 p-6 text-center space-y-3">
                      <Users className="w-8 h-8 text-slate-500 mx-auto" />
                      <div className="space-y-1">
                        <div className="text-sm font-bold text-slate-200">Belum Ada Teman</div>
                        <p className="text-xs text-slate-400 max-w-sm mx-auto">
                          Cari pemain lain berdasarkan nama atau User ID untuk menambah teman dan mengundang ke arena bersama.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setTab('search')}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-300 cursor-pointer"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Cari &amp; Tambah Teman</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {summary.friends.map((f) => {
                        const arch = PLAYER_ARCHETYPES[f.friendArchetype % PLAYER_ARCHETYPES.length];
                        const isConfirming = confirmRemoveId === f.id;
                        return (
                          <div
                            key={f.id}
                            className={`rounded-2xl border p-3.5 space-y-2.5 transition-colors ${
                              f.hasPendingRoomInvite
                                ? 'border-emerald-400/55 bg-emerald-950/20'
                                : 'border-slate-800 bg-slate-900/80'
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2.5">
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <div className="w-10 h-10 rounded-xl border border-amber-500/35 bg-slate-950 flex items-center justify-center shrink-0">
                                  <ArchetypeEmblem
                                    archetypeIndex={f.friendArchetype}
                                    className="w-5 h-5"
                                  />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="text-sm font-bold text-white truncate">
                                    {f.friendName}
                                  </div>
                                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 truncate">
                                    <span className="truncate">{arch?.title || 'Pahlawan'}</span>
                                    <span>·</span>
                                    <button
                                      type="button"
                                      onClick={() => void handleCopyText(f.friendUid, f.friendUid)}
                                      className="font-mono-num text-slate-400 hover:text-amber-300 inline-flex items-center gap-1 cursor-pointer truncate"
                                      title="Salin User ID teman"
                                    >
                                      <span className="truncate max-w-[110px]">
                                        ID: {f.friendUid}
                                      </span>
                                      {copiedId === f.friendUid ? (
                                        <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                                      ) : (
                                        <Copy className="w-3 h-3 shrink-0" />
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {activeRoomCode && (
                                  <button
                                    type="button"
                                    disabled={busyUidOrId === `inv-${f.id}`}
                                    onClick={() =>
                                      void handleInviteToRoom(f.id, f.friendName, f.friendUid)
                                    }
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-sky-400/50 bg-sky-500/15 px-3 py-1.5 text-xs font-bold text-sky-200 hover:bg-sky-500/25 disabled:opacity-50 cursor-pointer whitespace-nowrap"
                                  >
                                    <Send className="w-3.5 h-3.5 shrink-0" />
                                    <span>Undang #{activeRoomCode}</span>
                                  </button>
                                )}

                                {isConfirming ? (
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      disabled={busyUidOrId === f.id}
                                      onClick={() =>
                                        void handleRemoveOrDecline(
                                          f.id,
                                          `${f.friendName} dihapus dari daftar teman.`,
                                        )
                                      }
                                      className="rounded-lg bg-rose-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-rose-500 cursor-pointer"
                                    >
                                      Hapus
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmRemoveId(null)}
                                      className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-[11px] text-slate-300 hover:text-white cursor-pointer"
                                    >
                                      Batal
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmRemoveId(f.id)}
                                    title="Hapus Teman"
                                    className="inline-flex items-center justify-center w-8 h-8 rounded-xl border border-slate-700 bg-slate-950/70 text-slate-400 hover:text-rose-300 hover:border-rose-500/45 cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {f.hasPendingRoomInvite && (
                              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-400/40 bg-slate-950/80 px-3 py-2">
                                <div className="text-xs text-emerald-200">
                                  Mengajakmu bermain di Room{' '}
                                  <span className="font-mono-num font-bold text-amber-300">
                                    #{f.inviteRoomCode}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => onJoinInvitedRoom(f.inviteRoomCode, f.id)}
                                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-400 px-3 py-1 text-[11px] font-bold text-slate-950 hover:bg-emerald-300 cursor-pointer"
                                  >
                                    <DoorOpen className="w-3.5 h-3.5" />
                                    <span>Gabung Room</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void clearRoomInvite(user, f.id)}
                                    className="rounded-lg border border-slate-700 px-2 py-1 text-[11px] text-slate-400 hover:text-white cursor-pointer"
                                  >
                                    Tutup
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {tab === 'requests' && (
                <div className="space-y-4">
                  {totalReqCount === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/50 p-6 text-center space-y-2">
                      <UserCheck className="w-8 h-8 text-slate-500 mx-auto" />
                      <div className="text-sm font-bold text-slate-200">
                        Tidak Ada Permintaan Pertemanan
                      </div>
                      <p className="text-xs text-slate-400">
                        Semua permintaan masuk maupun terkirim akan muncul di sini secara langsung.
                      </p>
                    </div>
                  ) : (
                    <>
                      {summary.incomingRequests.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                            Permintaan Masuk ({summary.incomingRequests.length})
                          </div>
                          {summary.incomingRequests.map((req) => (
                            <div
                              key={req.id}
                              className="flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-amber-400/35 bg-slate-900/90 p-3"
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <div className="w-9 h-9 rounded-xl border border-amber-500/30 bg-slate-950 flex items-center justify-center shrink-0">
                                  <ArchetypeEmblem
                                    archetypeIndex={req.friendArchetype}
                                    className="w-5 h-5"
                                  />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="text-sm font-bold text-white truncate">
                                    {req.friendName}
                                  </div>
                                  <div className="text-[11px] font-mono-num text-slate-400 truncate">
                                    ID: {req.friendUid}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  disabled={busyUidOrId === req.id}
                                  onClick={() =>
                                    void handleAccept(req.id, req.friendName, req.friendUid)
                                  }
                                  className="inline-flex items-center gap-1 rounded-xl bg-emerald-400 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-300 disabled:opacity-50 cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Terima</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={busyUidOrId === req.id}
                                  onClick={() =>
                                    void handleRemoveOrDecline(
                                      req.id,
                                      `Permintaan dari ${req.friendName} ditolak.`,
                                    )
                                  }
                                  className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-rose-200 hover:border-rose-500/40 disabled:opacity-50 cursor-pointer"
                                >
                                  Tolak
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {summary.outgoingRequests.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            Permintaan Terkirim ({summary.outgoingRequests.length})
                          </div>
                          {summary.outgoingRequests.map((req) => (
                            <div
                              key={req.id}
                              className="flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-slate-800 bg-slate-900/75 p-3"
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <div className="w-9 h-9 rounded-xl border border-slate-700 bg-slate-950 flex items-center justify-center shrink-0">
                                  <ArchetypeEmblem
                                    archetypeIndex={req.friendArchetype}
                                    className="w-5 h-5"
                                  />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="text-sm font-bold text-white truncate">
                                    {req.friendName}
                                  </div>
                                  <div className="text-[11px] text-slate-400 truncate">
                                    Menunggu konfirmasi pemain...
                                  </div>
                                </div>
                              </div>
                              <button
                                type="button"
                                disabled={busyUidOrId === req.id}
                                onClick={() =>
                                  void handleRemoveOrDecline(
                                    req.id,
                                    `Permintaan ke ${req.friendName} dibatalkan.`,
                                  )
                                }
                                className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-rose-200 cursor-pointer shrink-0"
                              >
                                Batalkan
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {tab === 'search' && (
                <FriendSearchPanel
                  user={user}
                  myName={myName}
                  myArchetypeIndex={myArchetypeIndex}
                  relationByUid={relationByUid}
                  onNotify={onNotify}
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
