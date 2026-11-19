import assert from 'node:assert/strict';
import test from 'node:test';
import { createGameSession } from '../src/game-session.ts';
import { BASIC_LEVELS } from '../src/levels.ts';
import { createGameStore } from '../src/save-store.ts';

class MemoryStorage {
  value: string | null = null;
  getItem(_key: string) { return this.value; }
  setItem(_key: string, value: string) { this.value = value; }
}

test('a missing save starts clean and a committed game round-trips with progress', () => {
  const storage = new MemoryStorage();
  const store = createGameStore(storage, BASIC_LEVELS);
  assert.deepEqual(store.load(), { status: 'missing' });
  const level = BASIC_LEVELS.find(candidate => candidate.definition.id === 'S06')!;
  const session = createGameSession(level.definition);
  session.dispatch({ type: 'pour', from: 'A', to: 'D' });
  session.dispatch({ type: 'set-feedback', kind: 'sound', enabled: true });
  assert.deepEqual(store.save(level, session, ['S01', 'S02']), { status: 'saved' });
  const outcome = store.load();
  assert.equal(outcome.status, 'restored');
  if (outcome.status !== 'restored') return;
  assert.equal(outcome.level.definition.id, 'S06');
  assert.deepEqual(outcome.completedLevelIds, ['S01', 'S02']);
  assert.deepEqual({ ...outcome.session.getSnapshot(), sessionId: session.getSnapshot().sessionId }, session.getSnapshot());
  assert.notEqual(outcome.session.getSnapshot().sessionId, session.getSnapshot().sessionId);
});

test('invalid, incompatible and unavailable storage return distinct safe outcomes', () => {
  const storage = new MemoryStorage();
  const store = createGameStore(storage, BASIC_LEVELS);
  storage.value = '{broken';
  assert.deepEqual(store.load(), { status: 'corrupt' });
  const level = BASIC_LEVELS[0]!;
  const session = createGameSession(level.definition);
  store.save(level, session, []);
  const changedCatalog = [{ ...level, version: 2 as const }, ...BASIC_LEVELS.slice(1)];
  assert.deepEqual(createGameStore(storage, changedCatalog).load(), { status: 'incompatible' });
  const oldSession = createGameSession(level.definition).getRecoveryState();
  Reflect.set(oldSession, 'version', 2);
  store.save(level, { getRecoveryState: () => oldSession }, []);
  assert.deepEqual(store.load(), { status: 'incompatible' });
  storage.value = storage.value!.replace('"moss"', '"invented"');
  assert.deepEqual(store.load(), { status: 'corrupt' });
  const unavailable = createGameStore({
    getItem(_key: string): string | null { throw new Error('Storage disabled'); },
    setItem(_key: string, _value: string): void { throw new Error('Quota exceeded'); },
  }, BASIC_LEVELS);
  assert.deepEqual(unavailable.load(), { status: 'unavailable' });
  const before = session.getSnapshot();
  assert.deepEqual(unavailable.save(level, session, []), { status: 'unavailable' });
  assert.deepEqual(session.getSnapshot(), before);
  const quota = createGameStore({
    getItem: () => null,
    setItem: () => { throw new Error('Quota exceeded'); },
  }, BASIC_LEVELS);
  assert.deepEqual(quota.load(), { status: 'missing' });
  assert.deepEqual(quota.save(level, session, []), { status: 'unavailable' });
  assert.deepEqual(session.getSnapshot(), before);
});
