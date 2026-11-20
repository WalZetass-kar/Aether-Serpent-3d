import React, { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  Check,
  Copy,
  Hash,
  Search,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import { PLAYER_ARCHETYPES } from '../../shared/gameConfig';
import type { CloudPublicProfile } from '../services/firebaseAccountService';
import {
  acceptFriendRequest,
  searchPlayersByNameOrId,
  sendFriendRequest,
} from '../services/friendsService';
import { ArchetypeEmblem } from './FantasyIcons';

export interface FriendRelationLookupEntry {
  status: 'accepted' | 'incoming' | 'outgoing';
  friendshipId: string;
}

interface FriendSearchPanelProps {
  user: User;
  myName: string;
  myArchetypeIndex: number;
  relationByUid: Map<string, FriendRelationLookupEntry>;
  onNotify: (title: string, subtitle?: string) => void;
}

export const FriendSearchPanel: React.FC<FriendSearchPanelProps> = ({
  user,
  myName,
  myArchetypeIndex,
  relationByUid,
  onNotify,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<CloudPublicProfile[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [busyUidOrId, setBusyUidOrId] = useState<string | null>(null);
  const [copiedUid, setCopiedUid] = useState<string | null>(null);

  const runSearch = async (queryText: string) => {
    if (!user.emailVerified) return;
    setSearching(true);
    try {
      const results = await searchPlayersByNameOrId(user, queryText);
      setSearchResults(results);
      setHasSearched(true);
    } catch {
      onNotify('Pencarian Gagal', 'Tidak dapat memuat daftar pemain dari server.');
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    if (user.emailVerified && !hasSearched) {
      void runSearch('');
    }
  }, [user.uid, user.emailVerified]);

  const handleCopyNumericId = async (numericId: string, key: string) => {
    if (!numericId || typeof navigator === 'undefined' || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(numericId);
      setCopiedUid(key);
      window.setTimeout(() => setCopiedUid((prev) => (prev === key ? null : prev)), 1600);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleSendFriendRequest = async (target: CloudPublicProfile) => {
    if (!user.emailVerified) return;
    setBusyUidOrId(target.uid);
    try {
      const result = await sendFriendRequest(
        user,
        { name: myName, archetypeIndex: myArchetypeIndex },
        target,
      );
      if (result.outcome === 'sent') {
        onNotify(
          'Permintaan Terkirim',
          result.backendNotified
            ? `Permintaan & notifikasi dikirim ke ${target.displayName}.`
            : `Permintaan pertemanan dikirim ke ${target.displayName}.`,
        );
      } else if (result.outcome === 'accepted_existing') {
        onNotify('Sekarang Berteman!', `${target.displayName} juga sudah mengirim permintaan.`);
      } else if (result.outcome === 'already_friends') {
        onNotify('Sudah Berteman', `${target.displayName} sudah ada di daftar teman.`);
      } else {
        onNotify('Menunggu Konfirmasi', `Permintaan ke ${target.displayName} masih menunggu.`);
      }
    } catch (err) {
      onNotify(
        'Gagal Mengirim Permintaan',
        err instanceof Error ? err.message : 'Terjadi kendala koneksi ke server.',
      );
    } finally {
      setBusyUidOrId(null);
    }
  };

  const handleAcceptIncoming = async (friendshipId: string, target: CloudPublicProfile) => {
    if (!user.emailVerified) return;
    setBusyUidOrId(friendshipId);
    try {
      await acceptFriendRequest(user, friendshipId, myName, target.uid);
      onNotify('Teman Ditambahkan', `Kamu dan ${target.displayName} sekarang berteman!`);
    } catch {
      onNotify('Gagal Menerima', 'Coba lagi beberapa saat lagi.');
    } finally {
      setBusyUidOrId(null);
    }
  };

  return (
    <div className="space-y-3" data-testid="friend-search-panel">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void runSearch(searchQuery);
        }}
        className="flex items-center gap-2"
      >
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            maxLength={128}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari username unik atau ID angka (cth. 847291034)..."
            aria-label="Cari pemain berdasarkan username unik atau ID angka"
            className="w-full min-h-[42px] rounded-xl border border-slate-700 bg-slate-900 pl-10 pr-3.5 py-2 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
          />
        </div>
        <button
          type="submit"
          disabled={searching}
          className="min-h-[42px] px-4 rounded-xl bg-amber-400 text-slate-950 text-xs sm:text-sm font-bold hover:bg-amber-300 disabled:opacity-50 cursor-pointer shrink-0 whitespace-nowrap"
        >
          {searching ? 'Mencari...' : 'Cari'}
        </button>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
        <span>
          Masukkan <span className="text-slate-200 font-medium">username</span>,{' '}
          <span className="text-slate-200 font-medium">ID angka 9 digit</span>, atau UID akun.
        </span>
        {searchQuery.trim().length > 0 && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              void runSearch('');
            }}
            className="text-amber-300 hover:text-amber-200 font-semibold cursor-pointer whitespace-nowrap"
          >
            Tampilkan Semua
          </button>
        )}
      </div>

      {searching ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 text-center text-xs text-slate-400">
          Mencari pemain di server Aether...
        </div>
      ) : searchResults.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/50 p-6 text-center space-y-1">
          <div className="text-sm font-bold text-slate-200">Pemain Tidak Ditemukan</div>
          <p className="text-xs text-slate-400">
            Periksa kembali ejaan username atau ID angka, dan pastikan akun teman sudah terverifikasi.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {searchResults.map((p) => {
            const rel = relationByUid.get(p.uid);
            const arch = PLAYER_ARCHETYPES[p.archetypeIndex % PLAYER_ARCHETYPES.length];
            const numericId = p.numericId || '000000000';
            const isOnlineNow = Boolean(p.isOnline);
            return (
              <div
                key={p.uid}
                className="flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-slate-800 bg-slate-900/85 p-3"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="relative w-10 h-10 rounded-xl border border-amber-500/30 bg-slate-950 flex items-center justify-center shrink-0">
                    <ArchetypeEmblem
                      archetypeIndex={p.archetypeIndex}
                      className="w-5 h-5"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 min-w-0 text-sm">
                      <span className="font-bold text-white truncate">
                        {p.displayName}
                      </span>
                      <span aria-hidden="true" className="text-slate-600">·</span>
                      <span className="text-[11px] text-slate-400 truncate">
                        {arch?.title || 'Pahlawan'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-400 mt-0.5">
                      <span
                        className={`inline-flex items-center gap-1 font-semibold ${
                          isOnlineNow ? 'text-emerald-300' : 'text-slate-400'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isOnlineNow ? 'bg-emerald-400' : 'bg-slate-500'
                          }`}
                        />
                        <span>{isOnlineNow ? 'Online' : 'Offline'}</span>
                      </span>
                      <span aria-hidden="true">·</span>
                      <button
                        type="button"
                        onClick={() => void handleCopyNumericId(numericId, p.uid)}
                        title="Salin ID angka pemain"
                        className="font-mono-num inline-flex items-center gap-1 text-amber-200/90 hover:text-amber-300 cursor-pointer"
                      >
                        <Hash className="w-3 h-3 text-amber-400/80 shrink-0" />
                        <span>{numericId}</span>
                        {copiedUid === p.uid ? (
                          <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                        ) : (
                          <Copy className="w-3 h-3 text-slate-500 shrink-0" />
                        )}
                      </button>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-num">{p.wins} Menang</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-num">
                        Skor {p.bestScore.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0">
                  {rel?.status === 'accepted' ? (
                    <span className="inline-flex items-center gap-1 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3 py-2 text-xs font-bold text-emerald-300 whitespace-nowrap">
                      <UserCheck className="w-3.5 h-3.5 shrink-0" />
                      <span>Berteman</span>
                    </span>
                  ) : rel?.status === 'incoming' ? (
                    <button
                      type="button"
                      disabled={busyUidOrId === rel.friendshipId}
                      onClick={() => void handleAcceptIncoming(rel.friendshipId, p)}
                      className="inline-flex items-center gap-1 rounded-xl bg-emerald-400 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-300 cursor-pointer whitespace-nowrap"
                    >
                      <Check className="w-3.5 h-3.5 shrink-0" />
                      <span>Terima</span>
                    </button>
                  ) : rel?.status === 'outgoing' ? (
                    <span className="inline-flex items-center rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-200 whitespace-nowrap">
                      Menunggu
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={busyUidOrId === p.uid}
                      onClick={() => void handleSendFriendRequest(p)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-amber-300 disabled:opacity-50 cursor-pointer whitespace-nowrap"
                    >
                      <UserPlus className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {busyUidOrId === p.uid ? 'Mengirim...' : 'Kirim Permintaan'}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
