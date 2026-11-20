import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  ArrowLeft,
  DoorOpen,
  MessageSquare,
  Search,
  Send,
  ShieldAlert,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { PLAYER_ARCHETYPES } from '../../shared/gameConfig';
import { deriveNumericFriendId } from '../services/firebaseAccountService';
import {
  clearRoomInvite,
  removeOrDeclineFriendship,
  sendFriendChatMessage,
  sendRoomInviteToFriend,
  subscribeToFriendChatMessages,
  subscribeToFriendships,
  subscribeToFriendsPresence,
  type FriendChatMessage,
  type FriendPresence,
  type FriendshipItem,
  type FriendshipSummary,
  type OnlinePresenceStatus,
} from '../services/friendsService';
import { ArchetypeEmblem } from './FantasyIcons';

interface FriendsListDrawerProps {
  open: boolean;
  onClose: () => void;
  user: User | null;
  myName: string;
  activeRoomCode?: string | null;
  initialSummary?: FriendshipSummary;
  onOpenFriendsModal: (tab: 'friends' | 'requests' | 'search') => void;
  onOpenAuth: (tab: 'login' | 'register') => void;
  onJoinInvitedRoom: (roomCode: string, friendshipId: string) => void;
  onNotify: (title: string, subtitle?: string) => void;
}

const PRESENCE_META: Record<
  OnlinePresenceStatus,
  { dotClass: string; textClass: string; label: string }
> = {
  online: {
    dotClass: 'bg-emerald-400',
    textClass: 'text-emerald-300',
    label: 'Online',
  },
  away: {
    dotClass: 'bg-amber-400',
    textClass: 'text-amber-300',
    label: 'Baru Aktif',
  },
  offline: {
    dotClass: 'bg-slate-500',
    textClass: 'text-slate-400',
    label: 'Offline',
  },
};

const QUICK_CHAT_STARTERS = [
  'Yuk mabar sekarang!',
  'Ayo masuk Room!',
  'Sebentar lagi aku siap.',
  'Main bagus tadi!',
];

function formatChatTime(ts: number): string {
  try {
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch {
    return '';
  }
}

export const FriendsListDrawer: React.FC<FriendsListDrawerProps> = ({
  open,
  onClose,
  user,
  myName,
  activeRoomCode,
  initialSummary,
  onOpenFriendsModal,
  onOpenAuth,
  onJoinInvitedRoom,
  onNotify,
}) => {
  const [summary, setSummary] = useState<FriendshipSummary>(
    initialSummary ?? { friends: [], incomingRequests: [], outgoingRequests: [] },
  );
  const [presenceByUid, setPresenceByUid] = useState<Record<string, FriendPresence>>({});
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Active Quick-Chat target inside the drawer
  const [activeChatFriendId, setActiveChatFriendId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<FriendChatMessage[]>([]);
  const [chatDraft, setChatDraft] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Connect directly to friendsService for real-time friendship updates
  useEffect(() => {
    if (!user?.emailVerified) {
      setSummary({ friends: [], incomingRequests: [], outgoingRequests: [] });
      setActiveChatFriendId(null);
      return;
    }

    return subscribeToFriendships(user, (nextSummary) => {
      setSummary(nextSummary);
    });
  }, [user]);

  // Connect in real time to each friend's online presence indicator
  const friendUidsKey = useMemo(
    () =>
      summary.friends
        .map((f) => f.friendUid)
        .sort()
        .join(','),
    [summary.friends],
  );

  useEffect(() => {
    if (!user?.emailVerified) {
      setPresenceByUid({});
      return;
    }
    const uids = friendUidsKey ? friendUidsKey.split(',') : [];
    return subscribeToFriendsPresence(user, uids, (nextMap) => {
      setPresenceByUid(nextMap);
    });
  }, [user, friendUidsKey]);

  const activeChatFriend: FriendshipItem | null = useMemo(() => {
    if (!activeChatFriendId) return null;
    return summary.friends.find((f) => f.id === activeChatFriendId) ?? null;
  }, [activeChatFriendId, summary.friends]);

  // Clear active quick-chat automatically if the friendship is removed in real time
  useEffect(() => {
    if (activeChatFriendId && !activeChatFriend) {
      setActiveChatFriendId(null);
      setChatMessages([]);
    }
  }, [activeChatFriendId, activeChatFriend]);

  // Subscribe in real time to 1-to-1 quick-chat messages when a friend chat is open
  useEffect(() => {
    if (!open || !user?.emailVerified || !activeChatFriend) {
      setChatMessages([]);
      return;
    }
    return subscribeToFriendChatMessages(user, activeChatFriend.id, (msgs) => {
      setChatMessages(msgs);
    });
  }, [open, user, activeChatFriend?.id]);

  useEffect(() => {
    if (open && activeChatFriend) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [open, activeChatFriend?.id, chatMessages.length]);

  const sortedFriends = useMemo(() => {
    const rank: Record<OnlinePresenceStatus, number> = { online: 0, away: 1, offline: 2 };
    return [...summary.friends].sort((a, b) => {
      if (a.hasPendingRoomInvite !== b.hasPendingRoomInvite) {
        return a.hasPendingRoomInvite ? -1 : 1;
      }
      const statusA = presenceByUid[a.friendUid]?.status ?? 'offline';
      const statusB = presenceByUid[b.friendUid]?.status ?? 'offline';
      if (rank[statusA] !== rank[statusB]) {
        return rank[statusA] - rank[statusB];
      }
      return a.friendName.localeCompare(b.friendName, 'id');
    });
  }, [summary.friends, presenceByUid]);

  const onlineCount = useMemo(
    () =>
      summary.friends.filter((f) => presenceByUid[f.friendUid]?.status === 'online').length,
    [summary.friends, presenceByUid],
  );

  if (!open) return null;

  const myNumericId = user?.uid ? deriveNumericFriendId(user.uid) : '';

  const handleRemoveFriend = async (friend: FriendshipItem) => {
    if (!user?.emailVerified) return;
    setBusyId(friend.id);
    try {
      await removeOrDeclineFriendship(user, friend.id);
      setConfirmRemoveId(null);
      if (activeChatFriendId === friend.id) {
        setActiveChatFriendId(null);
      }
      onNotify('Teman Dihapus', `${friend.friendName} dihapus dari daftar teman.`);
    } catch {
      onNotify('Gagal Menghapus', 'Tidak dapat memperbarui koneksi pertemanan.');
    } finally {
      setBusyId(null);
    }
  };

  const handleInviteFriend = async (friend: FriendshipItem) => {
    if (!user?.emailVerified || !activeRoomCode) return;
    setBusyId(`inv-${friend.id}`);
    try {
      await sendRoomInviteToFriend(
        user,
        friend.id,
        activeRoomCode,
        friend.friendUid,
        myName,
      );
      onNotify('Undangan Terkirim', `${friend.friendName} diundang ke Room #${activeRoomCode}.`);
    } catch {
      onNotify('Gagal Mengundang', 'Tidak dapat mengirim undangan room.');
    } finally {
      setBusyId(null);
    }
  };

  const handleSendQuickChat = async (textToSend: string) => {
    if (!user?.emailVerified || !activeChatFriend) return;
    const clean = textToSend.trim().slice(0, 300);
    if (!clean || sendingChat) return;
    setSendingChat(true);
    try {
      await sendFriendChatMessage(
        user,
        activeChatFriend.id,
        activeChatFriend.friendUid,
        myName,
        clean,
      );
      setChatDraft('');
    } catch {
      onNotify('Pesan Gagal Terkirim', 'Pastikan koneksi internet aktif dan teman masih terhubung.');
    } finally {
      setSendingChat(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-xs pointer-events-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Daftar Teman & Quick Chat"
    >
      <div
        className="flex-1"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className="w-full max-w-md h-full bg-slate-950/95 border-l border-amber-500/35 shadow-2xl flex flex-col overflow-hidden">
        {/* Drawer Header */}
        <div className="flex items-center justify-between gap-2.5 px-4 py-3.5 border-b border-slate-800/90 bg-slate-900/75 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {activeChatFriend ? (
              <button
                type="button"
                onClick={() => setActiveChatFriendId(null)}
                aria-label="Kembali ke Daftar Teman"
                className="w-9 h-9 rounded-xl border border-slate-700 bg-slate-900 text-slate-200 hover:text-white hover:border-amber-400/50 flex items-center justify-center cursor-pointer shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <div className="w-9 h-9 rounded-xl border border-amber-400/45 bg-amber-500/15 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4 text-amber-300" />
              </div>
            )}

            <div className="min-w-0">
              <h2 className="font-display text-base font-bold text-gold-gradient truncate">
                {activeChatFriend ? `Quick Chat · ${activeChatFriend.friendName}` : 'Daftar Teman'}
              </h2>
              <p className="text-[11px] text-slate-400 truncate font-mono-num">
                {activeChatFriend
                  ? `ID #${presenceByUid[activeChatFriend.friendUid]?.numericId || activeChatFriend.friendNumericId}`
                  : user?.emailVerified
                    ? `${onlineCount} Online · ${summary.friends.length} Teman · ID #${myNumericId}`
                    : 'Status Koneksi Teman Real-Time'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup Drawer Teman"
            className="w-9 h-9 rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:border-amber-400/50 flex items-center justify-center cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!user || !user.emailVerified ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl border border-amber-400/40 bg-amber-500/10 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6 text-amber-300" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-white">
                {user ? 'Verifikasi Email Diperlukan' : 'Masuk untuk Mengakses Teman'}
              </h3>
              <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                Masuk dengan akun terverifikasi untuk melihat status online teman, mengirim quick-chat, dan mencari pemain lewat ID angka.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAuth('login');
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-300 cursor-pointer"
            >
              <span>{user ? 'Kelola Verifikasi Akun' : 'Masuk / Daftar'}</span>
            </button>
          </div>
        ) : activeChatFriend ? (
          /* Real-Time 1-to-1 Quick-Chat View */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Active Friend Status Strip */}
            {(() => {
              const pStatus = presenceByUid[activeChatFriend.friendUid]?.status ?? 'offline';
              const meta = PRESENCE_META[pStatus];
              return (
                <div className="px-4 py-2 border-b border-slate-800/80 bg-slate-900/45 flex items-center justify-between gap-2 text-xs shrink-0">
                  <span className={`inline-flex items-center gap-1.5 font-semibold ${meta.textClass}`}>
                    <span className={`w-2 h-2 rounded-full ${meta.dotClass}`} />
                    <span>{meta.label}</span>
                  </span>
                  {activeRoomCode && (
                    <button
                      type="button"
                      disabled={busyId === `inv-${activeChatFriend.id}`}
                      onClick={() => void handleInviteFriend(activeChatFriend)}
                      className="inline-flex items-center gap-1 rounded-lg border border-sky-400/45 bg-sky-500/15 px-2.5 py-1 text-[11px] font-bold text-sky-200 hover:bg-sky-500/25 cursor-pointer whitespace-nowrap"
                    >
                      <Send className="w-3 h-3" />
                      <span>Undang #{activeRoomCode}</span>
                    </button>
                  )}
                </div>
              );
            })()}

            {/* Chat Messages Feed */}
            <div className="flex-1 overflow-y-auto custom-scroll px-4 py-3 space-y-2.5">
              {chatMessages.length === 0 ? (
                <div className="h-full min-h-[180px] flex flex-col items-center justify-center text-center px-4">
                  <MessageSquare className="w-7 h-7 text-slate-600 mb-2" />
                  <p className="text-xs font-semibold text-slate-300">
                    Mulai obrolan cepat dengan {activeChatFriend.friendName}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Pesan tersinkron otomatis secara real-time untuk mengajak bermain bersama.
                  </p>
                </div>
              ) : (
                chatMessages.map((msg) => {
                  const isMine = msg.senderUid === user.uid;
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1.5 px-1 mb-0.5 text-[10px] text-slate-400">
                        <span className={`font-semibold ${isMine ? 'text-amber-300' : 'text-sky-300'}`}>
                          {isMine ? 'Anda' : msg.senderName}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono-num">{formatChatTime(msg.createdAtMs)}</span>
                      </div>
                      <div
                        className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed break-words border ${
                          isMine
                            ? 'bg-amber-500/20 border-amber-400/40 text-amber-50'
                            : 'bg-slate-900 border-slate-800 text-slate-100'
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Quick-Chat Phrase Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar border-t border-slate-800/80 px-3 py-2 bg-slate-900/45 shrink-0">
              {QUICK_CHAT_STARTERS.map((phrase) => (
                <button
                  key={phrase}
                  type="button"
                  disabled={sendingChat}
                  onClick={() => void handleSendQuickChat(phrase)}
                  className="shrink-0 whitespace-nowrap rounded-lg border border-slate-700/80 bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-slate-200 hover:border-amber-400/50 hover:text-amber-200 cursor-pointer"
                >
                  {phrase}
                </button>
              ))}
            </div>

            {/* Quick-Chat Composer */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleSendQuickChat(chatDraft);
              }}
              className="flex items-center gap-2 border-t border-slate-800 px-3 py-3 bg-slate-950 shrink-0"
            >
              <input
                type="text"
                maxLength={300}
                value={chatDraft}
                onChange={(e) => setChatDraft(e.target.value)}
                placeholder={`Kirim pesan ke ${activeChatFriend.friendName}...`}
                className="flex-1 min-w-0 min-h-[40px] rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                disabled={!chatDraft.trim() || sendingChat}
                aria-label="Kirim Pesan"
                className="inline-flex h-[40px] w-[40px] items-center justify-center rounded-xl bg-amber-400 text-slate-950 hover:bg-amber-300 disabled:opacity-45 cursor-pointer shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        ) : (
          /* Real-Time Friends List View */
          <>
            {/* Quick Action Toolbar */}
            <div className="px-4 py-2.5 border-b border-slate-800/80 bg-slate-900/50 flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenFriendsModal('search');
                }}
                className="flex-1 inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3 rounded-xl bg-amber-400 text-slate-950 text-xs font-bold hover:bg-amber-300 cursor-pointer whitespace-nowrap"
              >
                <Search className="w-3.5 h-3.5 shrink-0" />
                <span>Cari &amp; Tambah</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenFriendsModal('requests');
                }}
                className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3 rounded-xl border border-slate-700 bg-slate-900 text-xs font-semibold text-slate-200 hover:border-amber-400/50 hover:text-amber-200 cursor-pointer whitespace-nowrap"
              >
                <UserCheck className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span>Permintaan</span>
                {summary.incomingRequests.length > 0 && (
                  <span className="font-mono-num text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-rose-500 text-white leading-none">
                    {summary.incomingRequests.length}
                  </span>
                )}
              </button>
            </div>

            {/* Friends Scroll Container */}
            <div className="flex-1 overflow-y-auto custom-scroll p-4 space-y-2.5">
              {sortedFriends.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-6 text-center space-y-3">
                  <Users className="w-8 h-8 text-slate-500 mx-auto" />
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-slate-200">Belum Ada Teman Terhubung</div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Cari pemain menggunakan username unik atau ID angka untuk mulai melihat status online dan bertukar pesan.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenFriendsModal('search');
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-300 cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Buka Pencarian Teman</span>
                  </button>
                </div>
              ) : (
                sortedFriends.map((friend) => {
                  const presence = presenceByUid[friend.friendUid];
                  const status = presence?.status ?? 'offline';
                  const pMeta = PRESENCE_META[status];
                  const arch = PLAYER_ARCHETYPES[friend.friendArchetype % PLAYER_ARCHETYPES.length];
                  const numericId = presence?.numericId || friend.friendNumericId;
                  const isConfirming = confirmRemoveId === friend.id;

                  return (
                    <div
                      key={friend.id}
                      className={`rounded-2xl border p-3 space-y-2.5 transition-colors ${
                        friend.hasPendingRoomInvite
                          ? 'border-emerald-400/50 bg-emerald-950/20'
                          : 'border-slate-800 bg-slate-900/80'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="w-10 h-10 rounded-xl border border-amber-500/35 bg-slate-950 flex items-center justify-center shrink-0">
                            <ArchetypeEmblem
                              archetypeIndex={friend.friendArchetype}
                              className="w-5 h-5"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-bold text-white truncate">
                              {friend.friendName}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-slate-400 mt-0.5">
                              <span
                                className={`inline-flex items-center gap-1 font-semibold ${pMeta.textClass}`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${pMeta.dotClass}`} />
                                <span>{pMeta.label}</span>
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono-num text-slate-300">#{numericId}</span>
                              <span aria-hidden="true">·</span>
                              <span className="truncate">{arch?.title || 'Pahlawan'}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {friend.hasPendingRoomInvite && (
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-400/40 bg-slate-950/85 px-3 py-2">
                          <div className="text-xs text-emerald-200">
                            Undangan Room{' '}
                            <span className="font-mono-num font-bold text-amber-300">
                              #{friend.inviteRoomCode}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onJoinInvitedRoom(friend.inviteRoomCode, friend.id)}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-400 px-2.5 py-1 text-[11px] font-bold text-slate-950 hover:bg-emerald-300 cursor-pointer"
                            >
                              <DoorOpen className="w-3.5 h-3.5" />
                              <span>Gabung</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => void clearRoomInvite(user, friend.id)}
                              className="rounded-lg border border-slate-700 px-2 py-1 text-[11px] text-slate-400 hover:text-white cursor-pointer"
                            >
                              Tutup
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Action Bar: Quick Chat, Room Invite (if in room), and Remove Friend */}
                      <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 border-t border-slate-800/70">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setActiveChatFriendId(friend.id)}
                            className="inline-flex items-center gap-1.5 min-h-[36px] px-3 rounded-xl border border-amber-400/40 bg-amber-500/12 text-xs font-bold text-amber-200 hover:bg-amber-500/22 cursor-pointer whitespace-nowrap"
                          >
                            <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                            <span>Quick Chat</span>
                          </button>

                          {activeRoomCode && (
                            <button
                              type="button"
                              disabled={busyId === `inv-${friend.id}`}
                              onClick={() => void handleInviteFriend(friend)}
                              className="inline-flex items-center gap-1 min-h-[36px] px-2.5 rounded-xl border border-sky-400/40 bg-sky-500/12 text-xs font-semibold text-sky-200 hover:bg-sky-500/22 disabled:opacity-50 cursor-pointer whitespace-nowrap"
                            >
                              <Send className="w-3.5 h-3.5 shrink-0" />
                              <span>Undang</span>
                            </button>
                          )}
                        </div>

                        {isConfirming ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={busyId === friend.id}
                              onClick={() => void handleRemoveFriend(friend)}
                              className="min-h-[36px] rounded-xl bg-rose-600 px-3 text-xs font-bold text-white hover:bg-rose-500 cursor-pointer whitespace-nowrap"
                            >
                              Konfirmasi Hapus
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmRemoveId(null)}
                              className="min-h-[36px] rounded-xl border border-slate-700 bg-slate-800 px-2.5 text-xs text-slate-300 hover:text-white cursor-pointer"
                            >
                              Batal
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmRemoveId(friend.id)}
                            className="inline-flex items-center gap-1 min-h-[36px] px-2.5 rounded-xl border border-slate-700/80 bg-slate-950/70 text-xs font-semibold text-slate-300 hover:text-rose-200 hover:border-rose-500/45 cursor-pointer whitespace-nowrap"
                          >
                            <UserMinus className="w-3.5 h-3.5 shrink-0" />
                            <span>Hapus Teman</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </aside>
    </div>
  );
};
