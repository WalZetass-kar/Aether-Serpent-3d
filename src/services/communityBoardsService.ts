import type { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  BOARD_THEME_LABELS,
  cloneBoardConfig,
  getDefaultBoardByTheme,
  type BoardConfig,
  type BoardThemeId,
} from '../../shared/boardThemes';
import type { SnakeOrLadder } from '../../shared/gameConfig';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';

export interface CommunityBoardRecord {
  id: string;
  authorUid: string;
  authorName: string;
  downloads: number;
  isPublished: boolean;
  publishedAtMs: number;
  updatedAtMs: number;
  board: BoardConfig;
}

const VALID_THEME_IDS = new Set<string>(Object.keys(BOARD_THEME_LABELS));

function sanitizeDocId(raw: string): string {
  const clean = String(raw || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 80);
  return clean.length > 0 ? clean : `cb_${Date.now()}`;
}

function sanitizeAuthorName(raw: string | null | undefined): string {
  const clean = String(raw || 'Penjelajah Aether')
    .trim()
    .slice(0, 32);
  return clean.length > 0 ? clean : 'Penjelajah Aether';
}

function sanitizeHexColor(raw: unknown, fallback: string): string {
  if (typeof raw === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(raw.trim())) {
    return raw.trim().slice(0, 16);
  }
  return fallback;
}

function sanitizeJumps(raw: unknown, type: 'ladder' | 'snake'): SnakeOrLadder[] {
  if (!Array.isArray(raw)) return [];
  const usedFrom = new Set<number>();
  const out: SnakeOrLadder[] = [];

  for (let i = 0; i < raw.length && out.length < 20; i++) {
    const item = raw[i] as Partial<SnakeOrLadder> | null;
    if (!item || typeof item !== 'object') continue;
    const from = Math.round(Number(item.from));
    const to = Math.round(Number(item.to));
    if (!Number.isFinite(from) || !Number.isFinite(to)) continue;
    if (from <= 1 || from >= 100 || to < 1 || to > 100) continue;
    if (type === 'ladder' && to <= from) continue;
    if (type === 'snake' && to >= from) continue;
    if (usedFrom.has(from)) continue;
    usedFrom.add(from);

    out.push({
      id: sanitizeDocId(String(item.id || `${type === 'ladder' ? 'L' : 'S'}${out.length + 1}`)).slice(0, 24),
      name: String(item.name || (type === 'ladder' ? 'Tangga Komunitas' : 'Ular Komunitas'))
        .trim()
        .slice(0, 40) || (type === 'ladder' ? 'Tangga Komunitas' : 'Ular Komunitas'),
      from,
      to,
      type,
    });
  }

  return out;
}

function timestampToMs(ts: unknown, fallback = Date.now()): number {
  if (ts && typeof ts === 'object' && 'toMillis' in ts && typeof (ts as { toMillis: () => number }).toMillis === 'function') {
    return (ts as { toMillis: () => number }).toMillis();
  }
  if (typeof ts === 'number' && Number.isFinite(ts)) return ts;
  return fallback;
}

function hydrateCommunityBoardRecord(docId: string, d: Record<string, unknown>): CommunityBoardRecord {
  const rawTheme = typeof d.themeId === 'string' && VALID_THEME_IDS.has(d.themeId)
    ? (d.themeId as BoardThemeId)
    : 'enchanted_forest';
  const base = getDefaultBoardByTheme(rawTheme);

  const bs = (d.boardSettings && typeof d.boardSettings === 'object' ? d.boardSettings : {}) as Partial<BoardConfig['boardSettings']>;
  const tc = (d.tileConfig && typeof d.tileConfig === 'object' ? d.tileConfig : {}) as Partial<BoardConfig['tileConfig']>;
  const sc = (d.snakeConfig && typeof d.snakeConfig === 'object' ? d.snakeConfig : {}) as Partial<BoardConfig['snakeConfig']>;
  const lc = (d.ladderConfig && typeof d.ladderConfig === 'object' ? d.ladderConfig : {}) as Partial<BoardConfig['ladderConfig']>;
  const ec = (d.environmentConfig && typeof d.environmentConfig === 'object' ? d.environmentConfig : {}) as Partial<BoardConfig['environmentConfig']>;
  const vx = (d.visualEffects && typeof d.visualEffects === 'object' ? d.visualEffects : {}) as Partial<BoardConfig['visualEffects']>;

  const rawSwatches = Array.isArray(d.previewSwatches) ? d.previewSwatches : [];
  const previewSwatches: [string, string, string] = [
    sanitizeHexColor(rawSwatches[0], base.previewSwatches[0]),
    sanitizeHexColor(rawSwatches[1], base.previewSwatches[1]),
    sanitizeHexColor(rawSwatches[2], base.previewSwatches[2]),
  ];

  const publishedAtMs = timestampToMs(d.createdAt);
  const updatedAtMs = timestampToMs(d.updatedAt, publishedAtMs);
  const name = String(d.name || base.name).trim().slice(0, 60) || base.name;
  const authorName = sanitizeAuthorName(typeof d.authorName === 'string' ? d.authorName : 'Kreator Komunitas');
  const subtitle = String(d.subtitle || `Karya ${authorName}`).trim().slice(0, 100);
  const description = String(d.description || base.description).trim().slice(0, 240);

  const ladders = Array.isArray(d.ladders) ? sanitizeJumps(d.ladders, 'ladder') : base.ladders;
  const snakes = Array.isArray(d.snakes) ? sanitizeJumps(d.snakes, 'snake') : base.snakes;

  const board: BoardConfig = cloneBoardConfig({
    ...base,
    id: `community_${sanitizeDocId(String(d.id || docId))}`,
    name,
    subtitle: subtitle || `Karya ${authorName}`,
    description: description || base.description,
    themeId: rawTheme,
    previewSwatches,
    isCustom: true,
    createdAt: publishedAtMs,
    updatedAt: updatedAtMs,
    ladders,
    snakes,
    boardSettings: {
      shape: bs.shape || base.boardSettings.shape,
      sizeScale:
        typeof bs.sizeScale === 'number' && Number.isFinite(bs.sizeScale)
          ? Math.max(0.88, Math.min(1.15, bs.sizeScale))
          : base.boardSettings.sizeScale,
      material: bs.material || base.boardSettings.material,
      primaryColor: sanitizeHexColor(bs.primaryColor, base.boardSettings.primaryColor),
      secondaryColor: sanitizeHexColor(bs.secondaryColor, base.boardSettings.secondaryColor),
    },
    tileConfig: {
      shape: tc.shape || base.tileConfig.shape,
      primaryColor: sanitizeHexColor(tc.primaryColor, base.tileConfig.primaryColor),
      alternateColor: sanitizeHexColor(tc.alternateColor, base.tileConfig.alternateColor),
      textureStyle: tc.textureStyle || base.tileConfig.textureStyle,
      material: tc.material || base.tileConfig.material,
      numeralStyle: tc.numeralStyle || base.tileConfig.numeralStyle,
      visualEffect: tc.visualEffect || base.tileConfig.visualEffect,
    },
    snakeConfig: {
      primaryColor: sanitizeHexColor(sc.primaryColor, base.snakeConfig.primaryColor),
      stripeColor: sanitizeHexColor(sc.stripeColor, base.snakeConfig.stripeColor),
      bellyColor: sanitizeHexColor(sc.bellyColor, base.snakeConfig.bellyColor),
      hornColor: sanitizeHexColor(sc.hornColor, base.snakeConfig.hornColor),
      headModel: sc.headModel || base.snakeConfig.headModel,
      scalePattern: sc.scalePattern || base.snakeConfig.scalePattern,
      sizeScale:
        typeof sc.sizeScale === 'number' && Number.isFinite(sc.sizeScale)
          ? Math.max(0.75, Math.min(1.3, sc.sizeScale))
          : base.snakeConfig.sizeScale,
      materialFinish: sc.materialFinish || base.snakeConfig.materialFinish,
    },
    ladderConfig: {
      materialStyle: lc.materialStyle || base.ladderConfig.materialStyle,
      primaryColor: sanitizeHexColor(lc.primaryColor, base.ladderConfig.primaryColor),
      accentColor: sanitizeHexColor(lc.accentColor, base.ladderConfig.accentColor),
      modelStyle: lc.modelStyle || base.ladderConfig.modelStyle,
      widthScale:
        typeof lc.widthScale === 'number' && Number.isFinite(lc.widthScale)
          ? Math.max(0.75, Math.min(1.3, lc.widthScale))
          : base.ladderConfig.widthScale,
    },
    environmentConfig: {
      skyPreset: ec.skyPreset || base.environmentConfig.skyPreset,
      showTrees: typeof ec.showTrees === 'boolean' ? ec.showTrees : base.environmentConfig.showTrees,
      showRocks: typeof ec.showRocks === 'boolean' ? ec.showRocks : base.environmentConfig.showRocks,
      showCastle: typeof ec.showCastle === 'boolean' ? ec.showCastle : base.environmentConfig.showCastle,
      showWaterfall: typeof ec.showWaterfall === 'boolean' ? ec.showWaterfall : base.environmentConfig.showWaterfall,
      decorations: ec.decorations || base.environmentConfig.decorations,
      fogIntensity:
        typeof ec.fogIntensity === 'number' && Number.isFinite(ec.fogIntensity)
          ? Math.max(0, Math.min(1, ec.fogIntensity))
          : base.environmentConfig.fogIntensity,
      lightingPreset: ec.lightingPreset || base.environmentConfig.lightingPreset,
    },
    visualEffects: {
      particleStyle: vx.particleStyle || base.visualEffects.particleStyle,
      particleDensity:
        typeof vx.particleDensity === 'number' && Number.isFinite(vx.particleDensity)
          ? Math.max(0, Math.min(1, vx.particleDensity))
          : base.visualEffects.particleDensity,
      glowIntensity:
        typeof vx.glowIntensity === 'number' && Number.isFinite(vx.glowIntensity)
          ? Math.max(0, Math.min(1, vx.glowIntensity))
          : base.visualEffects.glowIntensity,
      ambientIntensity:
        typeof vx.ambientIntensity === 'number' && Number.isFinite(vx.ambientIntensity)
          ? Math.max(0.35, Math.min(1.6, vx.ambientIntensity))
          : base.visualEffects.ambientIntensity,
      shadowsEnabled:
        typeof vx.shadowsEnabled === 'boolean' ? vx.shadowsEnabled : base.visualEffects.shadowsEnabled,
    },
  });

  return {
    id: sanitizeDocId(String(d.id || docId)),
    authorUid: String(d.authorUid || ''),
    authorName,
    downloads: typeof d.downloads === 'number' && Number.isFinite(d.downloads) ? Math.max(0, Math.floor(d.downloads)) : 0,
    isPublished: d.isPublished !== false,
    publishedAtMs,
    updatedAtMs,
    board,
  };
}

/**
 * Fetches published Community Boards from Firestore (`where('isPublished', '==', true)`).
 */
export async function fetchCommunityBoards(maxCount = 50): Promise<CommunityBoardRecord[]> {
  const path = 'communityBoards';
  try {
    const q = query(
      collection(db, 'communityBoards'),
      where('isPublished', '==', true),
      limit(Math.max(1, Math.min(100, maxCount))),
    );
    const snap = await getDocs(q);
    const records: CommunityBoardRecord[] = [];
    snap.forEach((docSnap) => {
      records.push(hydrateCommunityBoardRecord(docSnap.id, docSnap.data() as Record<string, unknown>));
    });
    return records.sort((a, b) => b.updatedAtMs - a.updatedAtMs || b.downloads - a.downloads);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

/**
 * Publishes (or updates an existing published copy of) a user's custom 3D board to Firestore
 * `/communityBoards/{boardId}` adhering strictly to firebase-blueprint.json schema limits.
 */
export async function publishCommunityBoard(
  user: User,
  authorDisplayName: string,
  board: BoardConfig,
): Promise<CommunityBoardRecord> {
  if (!user.emailVerified) {
    throw new Error('Verifikasi email akun kamu terlebih dahulu untuk membagikan papan ke komunitas.');
  }

  const rawSlug = board.id.replace(/^community_/, '').replace(/^draft_/, '');
  const boardDocId = sanitizeDocId(`${user.uid.slice(0, 12)}_${rawSlug || Date.now()}`);
  const path = `communityBoards/${boardDocId}`;
  const docRef = doc(db, 'communityBoards', boardDocId);

  const safeTheme: BoardThemeId = VALID_THEME_IDS.has(board.themeId)
    ? board.themeId
    : 'enchanted_forest';
  const base = getDefaultBoardByTheme(safeTheme);

  const safeAuthorName = sanitizeAuthorName(authorDisplayName || user.displayName);
  const safeName = String(board.name || 'Papan Komunitas').trim().slice(0, 60) || 'Papan Komunitas';
  const safeSubtitle = String(board.subtitle || `Tema ${BOARD_THEME_LABELS[safeTheme]}`)
    .trim()
    .slice(0, 100);
  const safeDescription = String(
    board.description || `Papan kustom 3D bertema ${BOARD_THEME_LABELS[safeTheme]} buatan ${safeAuthorName}.`,
  )
    .trim()
    .slice(0, 240);

  const safeSwatches: [string, string, string] = [
    sanitizeHexColor(board.boardSettings?.primaryColor || board.previewSwatches?.[0], base.previewSwatches[0]),
    sanitizeHexColor(board.boardSettings?.secondaryColor || board.previewSwatches?.[1], base.previewSwatches[1]),
    sanitizeHexColor(board.snakeConfig?.primaryColor || board.previewSwatches?.[2], base.previewSwatches[2]),
  ];

  const safeLadders = sanitizeJumps(board.ladders, 'ladder');
  const safeSnakes = sanitizeJumps(board.snakes, 'snake');

  const mutablePayload = {
    authorName: safeAuthorName,
    name: safeName,
    subtitle: safeSubtitle,
    description: safeDescription,
    themeId: safeTheme,
    previewSwatches: safeSwatches,
    ladders: safeLadders,
    snakes: safeSnakes,
    boardSettings: {
      shape: board.boardSettings.shape,
      sizeScale: Math.max(0.88, Math.min(1.15, Number(board.boardSettings.sizeScale) || 1.0)),
      material: board.boardSettings.material,
      primaryColor: sanitizeHexColor(board.boardSettings.primaryColor, base.boardSettings.primaryColor),
      secondaryColor: sanitizeHexColor(board.boardSettings.secondaryColor, base.boardSettings.secondaryColor),
    },
    tileConfig: {
      shape: board.tileConfig.shape,
      primaryColor: sanitizeHexColor(board.tileConfig.primaryColor, base.tileConfig.primaryColor),
      alternateColor: sanitizeHexColor(board.tileConfig.alternateColor, base.tileConfig.alternateColor),
      textureStyle: board.tileConfig.textureStyle,
      material: board.tileConfig.material,
      numeralStyle: board.tileConfig.numeralStyle,
      visualEffect: board.tileConfig.visualEffect,
    },
    snakeConfig: {
      primaryColor: sanitizeHexColor(board.snakeConfig.primaryColor, base.snakeConfig.primaryColor),
      stripeColor: sanitizeHexColor(board.snakeConfig.stripeColor, base.snakeConfig.stripeColor),
      bellyColor: sanitizeHexColor(board.snakeConfig.bellyColor, base.snakeConfig.bellyColor),
      hornColor: sanitizeHexColor(board.snakeConfig.hornColor, base.snakeConfig.hornColor),
      headModel: board.snakeConfig.headModel,
      scalePattern: board.snakeConfig.scalePattern,
      sizeScale: Math.max(0.75, Math.min(1.3, Number(board.snakeConfig.sizeScale) || 1.0)),
      materialFinish: board.snakeConfig.materialFinish,
    },
    ladderConfig: {
      materialStyle: board.ladderConfig.materialStyle,
      primaryColor: sanitizeHexColor(board.ladderConfig.primaryColor, base.ladderConfig.primaryColor),
      accentColor: sanitizeHexColor(board.ladderConfig.accentColor, base.ladderConfig.accentColor),
      modelStyle: board.ladderConfig.modelStyle,
      widthScale: Math.max(0.75, Math.min(1.3, Number(board.ladderConfig.widthScale) || 1.0)),
    },
    environmentConfig: {
      skyPreset: board.environmentConfig.skyPreset,
      showTrees: Boolean(board.environmentConfig.showTrees),
      showRocks: Boolean(board.environmentConfig.showRocks),
      showCastle: Boolean(board.environmentConfig.showCastle),
      showWaterfall: Boolean(board.environmentConfig.showWaterfall),
      decorations: board.environmentConfig.decorations,
      fogIntensity: Math.max(0, Math.min(1, Number(board.environmentConfig.fogIntensity) || 0.3)),
      lightingPreset: board.environmentConfig.lightingPreset,
    },
    visualEffects: {
      particleStyle: board.visualEffects.particleStyle,
      particleDensity: Math.max(0, Math.min(1, Number(board.visualEffects.particleDensity) || 0.5)),
      glowIntensity: Math.max(0, Math.min(1, Number(board.visualEffects.glowIntensity) || 0.5)),
      ambientIntensity: Math.max(0.35, Math.min(1.6, Number(board.visualEffects.ambientIntensity) || 0.9)),
      shadowsEnabled: Boolean(board.visualEffects.shadowsEnabled),
    },
    isPublished: true,
    updatedAt: serverTimestamp(),
  };

  try {
    const existing = await getDoc(docRef);
    const nowMs = Date.now();
    let currentDownloads = 0;

    if (!existing.exists()) {
      await setDoc(docRef, {
        id: boardDocId,
        authorUid: user.uid,
        ...mutablePayload,
        downloads: 0,
        createdAt: serverTimestamp(),
      });
    } else {
      const existingData = existing.data();
      if (existingData.authorUid !== user.uid) {
        throw new Error('Kamu tidak memiliki izin untuk memperbarui papan milik pemain lain.');
      }
      currentDownloads = typeof existingData.downloads === 'number' ? existingData.downloads : 0;
      await updateDoc(docRef, mutablePayload);
    }

    return hydrateCommunityBoardRecord(boardDocId, {
      id: boardDocId,
      authorUid: user.uid,
      ...mutablePayload,
      downloads: currentDownloads,
      createdAt: nowMs,
      updatedAt: nowMs,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

/**
 * Increments the public download counter for a Community Board (+1) when signed in.
 * Non-fatal for guests or offline sessions so local download/play still succeeds smoothly.
 */
export async function recordCommunityBoardDownload(
  user: User | null | undefined,
  communityBoardId: string,
): Promise<void> {
  if (!user?.emailVerified) return;
  const safeId = sanitizeDocId(communityBoardId);
  const path = `communityBoards/${safeId}`;
  try {
    await updateDoc(doc(db, 'communityBoards', safeId), {
      downloads: increment(1),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    // Log structured Firestore error context without blocking local gameplay download
    try {
      handleFirestoreError(err, OperationType.UPDATE, path);
    } catch {
      // Swallow after logging
    }
  }
}

/**
 * Removes a published community board owned by the author (or moderated by an admin).
 */
export async function deleteCommunityBoard(user: User, communityBoardId: string): Promise<void> {
  if (!user.emailVerified) return;
  const safeId = sanitizeDocId(communityBoardId);
  const path = `communityBoards/${safeId}`;
  try {
    await deleteDoc(doc(db, 'communityBoards', safeId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}
