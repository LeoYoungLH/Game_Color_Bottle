import { restoreGameSession, type LevelDefinition, type SessionRecoveryState } from './game-session.ts';

export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

interface CatalogEntry {
  readonly definition: LevelDefinition;
  readonly version: number;
  readonly seed: number | null;
}

const STORAGE_KEY = 'shise-workshop-save';
const FORMAT_VERSION = 1;

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function checksum(text: string): string {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index++) hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
  return (hash >>> 0).toString(16);
}

export function createGameStore<T extends CatalogEntry>(storage: StorageAdapter, levels: readonly T[]) {
  const byId = new Map(levels.map(level => [level.definition.id, level]));

  function save(level: T, session: { getRecoveryState(): SessionRecoveryState }, completedLevelIds: readonly string[]) {
    if (byId.get(level.definition.id) !== level || session.getRecoveryState().levelId !== level.definition.id
      || completedLevelIds.some(id => !byId.has(id))) throw new Error('Cannot save an unknown level or progress.');
    const payload = {
      levelId: level.definition.id, levelVersion: level.version, seed: level.seed,
      session: session.getRecoveryState(), completedLevelIds: [...new Set(completedLevelIds)],
    };
    const body = JSON.stringify(payload);
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify({ formatVersion: FORMAT_VERSION, checksum: checksum(body), payload }));
      return { status: 'saved' as const };
    } catch {
      return { status: 'unavailable' as const };
    }
  }

  function load() {
    let raw: string | null;
    try { raw = storage.getItem(STORAGE_KEY); }
    catch { return { status: 'unavailable' as const }; }
    if (raw === null) return { status: 'missing' as const };
    let envelope: unknown;
    try { envelope = JSON.parse(raw); }
    catch { return { status: 'corrupt' as const }; }
    if (!record(envelope)) return { status: 'corrupt' as const };
    if (envelope.formatVersion !== FORMAT_VERSION) return { status: 'incompatible' as const };
    const payload = envelope.payload;
    if (!record(payload) || typeof envelope.checksum !== 'string' || checksum(JSON.stringify(payload)) !== envelope.checksum
      || typeof payload.levelId !== 'string' || !Array.isArray(payload.completedLevelIds)
      || payload.completedLevelIds.some(id => typeof id !== 'string' || !byId.has(id))
      || new Set(payload.completedLevelIds).size !== payload.completedLevelIds.length) {
      return { status: 'corrupt' as const };
    }
    const level = byId.get(payload.levelId);
    if (!level || level.version !== payload.levelVersion || level.seed !== payload.seed) return { status: 'incompatible' as const };
    try {
      const session = restoreGameSession(level.definition, payload.session);
      if (session.getSnapshot().phase === 'won' && !payload.completedLevelIds.includes(level.definition.id)) {
        return { status: 'corrupt' as const };
      }
      return { status: 'restored' as const, level, session, completedLevelIds: payload.completedLevelIds as string[] };
    } catch {
      return { status: 'corrupt' as const };
    }
  }

  return { save, load };
}
