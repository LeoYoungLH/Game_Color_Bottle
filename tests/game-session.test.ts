import assert from 'node:assert/strict';
import test from 'node:test';
import { createGameSession } from '../src/game-session.ts';

const opening = {
  id: 'opening',
  title: 'First delivery',
  bottles: [
    { id: 'A', layers: ['moss', 'moss', 'coral', 'coral'] },
    { id: 'B', layers: ['coral', 'coral', 'blue', 'blue'] },
    { id: 'C', layers: ['blue', 'blue', 'moss', 'moss'] },
    { id: 'D', layers: [] },
    { id: 'E', layers: [] },
  ],
  targets: ['moss', 'coral', 'blue'],
};

test('a new session exposes stable bottle positions and two unavailable ad bottles', () => {
  const session = createGameSession(opening);
  const snapshot = session.getSnapshot();
  assert.deepEqual(snapshot.bottles.map(b => [b.id, b.status]), [
    ['A', 'available'], ['B', 'available'], ['C', 'available'],
    ['D', 'available'], ['E', 'available'],
    ['ad-1', 'ad-locked'], ['ad-2', 'ad-locked'],
  ]);
  assert.equal(snapshot.phase, 'playing');
  assert.equal(snapshot.requiredCollections, 3);
  assert.equal(snapshot.moveCount, 0);
});

test('a player can pour a continuous colour segment into an empty bottle', () => {
  const session = createGameSession(opening);
  const result = session.dispatch({ type: 'pour', from: 'A', to: 'D' });
  assert.equal(result.accepted, true);
  assert.deepEqual(session.getSnapshot().bottles.find(b => b.id === 'A')?.layers, ['moss', 'moss']);
  assert.deepEqual(session.getSnapshot().bottles.find(b => b.id === 'D')?.layers, ['coral', 'coral']);
  assert.equal(session.getSnapshot().moveCount, 1);
  assert.deepEqual(result.events, [{ type: 'poured', from: 'A', to: 'D', units: 2 }]);
});

for (const [from, to, reason] of [
  ['A', 'A', 'same-bottle'],
  ['A', 'C', 'full-target'],
  ['D', 'A', 'empty-source'],
  ['A', 'ad-1', 'locked-bottle'],
  ['ad-2', 'D', 'locked-bottle'],
  ['missing', 'D', 'unknown-bottle'],
]) {
  test(`rejected ${from} to ${to} leaves the whole session unchanged`, () => {
    const session = createGameSession(opening);
    const before = session.getSnapshot();
    const result = session.dispatch({ type: 'pour', from: from!, to: to! });
    assert.deepEqual(result, { accepted: false, reason, events: [] });
    assert.deepEqual(session.getSnapshot(), before);
  });
}

test('a different top colour rejects a pour into a partially filled bottle', () => {
  const session = createGameSession(opening);
  session.dispatch({ type: 'pour', from: 'A', to: 'D' });
  const before = session.getSnapshot();
  assert.deepEqual(session.dispatch({ type: 'pour', from: 'B', to: 'D' }), {
    accepted: false, reason: 'different-color', events: [],
  });
  assert.deepEqual(session.getSnapshot(), before);
});

test('matching full bottles are collected once and the final delivery wins', () => {
  const session = createGameSession(opening);
  session.dispatch({ type: 'pour', from: 'A', to: 'D' });
  const firstDelivery = session.dispatch({ type: 'pour', from: 'C', to: 'A' });
  assert.deepEqual(firstDelivery.events, [
    { type: 'poured', from: 'C', to: 'A', units: 2 },
    { type: 'collected', bottleId: 'A', color: 'moss', units: 4, slotId: 'slot-1' },
  ]);
  assert.equal(session.getSnapshot().bottles.find(b => b.id === 'A')?.status, 'collected');
  session.dispatch({ type: 'pour', from: 'B', to: 'C' });
  const last = session.dispatch({ type: 'pour', from: 'B', to: 'D' });
  assert.equal(session.getSnapshot().phase, 'won');
  assert.equal(session.getSnapshot().collected.length, 3);
  assert.equal(session.getSnapshot().moveCount, 4);
  assert.deepEqual(last.events.at(-1), { type: 'won', levelId: 'opening' });
  const completed = session.getSnapshot();
  assert.deepEqual(session.dispatch({ type: 'pour', from: 'B', to: 'D' }), {
    accepted: false, reason: 'level-complete', events: [],
  });
  assert.deepEqual(session.getSnapshot(), completed);
});

test('a full bottle without a matching current target stays sealed in its own position', () => {
  const session = createGameSession({
    ...opening,
    bottles: [...opening.bottles, { id: 'F', layers: ['amber', 'amber', 'amber'] }, { id: 'G', layers: ['amber'] }],
    upcomingTargets: ['amber'],
  });
  session.dispatch({ type: 'pour', from: 'G', to: 'F' });
  const before = session.getSnapshot();
  assert.deepEqual(before.bottles.find(b => b.id === 'F'), {
    id: 'F', layers: ['amber', 'amber', 'amber', 'amber'], status: 'ready',
  });
  assert.equal(before.collected.length, 0);
  assert.equal(before.phase, 'playing');
  assert.deepEqual(session.dispatch({ type: 'pour', from: 'F', to: 'D' }), {
    accepted: false, reason: 'completed-source', events: [],
  });
  assert.deepEqual(session.getSnapshot(), before);
});

test('a continuous segment is limited by remaining capacity without losing its remainder', () => {
  const session = createGameSession({
    ...opening,
    upcomingTargets: ['coral'],
    bottles: [
      { id: 'A', layers: ['blue', 'coral', 'coral', 'coral'] },
      { id: 'B', layers: ['blue', 'blue', 'blue', 'coral'] },
      { id: 'C', layers: ['moss', 'moss', 'moss'] },
      { id: 'D', layers: ['moss', 'coral', 'coral'] },
      { id: 'E', layers: ['coral', 'coral'] },
    ],
  });
  const result = session.dispatch({ type: 'pour', from: 'A', to: 'D' });
  assert.deepEqual(result.events, [{ type: 'poured', from: 'A', to: 'D', units: 1 }]);
  assert.deepEqual(session.getSnapshot().bottles.find(b => b.id === 'A')?.layers, ['blue', 'coral', 'coral']);
  assert.deepEqual(session.getSnapshot().bottles.find(b => b.id === 'D')?.layers, ['moss', 'coral', 'coral', 'coral']);
});

test('selecting, cancelling and choosing a target use the same public session boundary', () => {
  const session = createGameSession(opening);
  assert.equal(session.dispatch({ type: 'select-bottle', bottleId: 'A' }).accepted, true);
  assert.equal(session.getSnapshot().selectedBottleId, 'A');
  assert.equal(session.dispatch({ type: 'select-bottle', bottleId: 'A' }).accepted, true);
  assert.equal(session.getSnapshot().selectedBottleId, null);
  session.dispatch({ type: 'select-bottle', bottleId: 'A' });
  const selected = session.getSnapshot();
  assert.equal(session.dispatch({ type: 'select-bottle', bottleId: 'ad-1' }).accepted, false);
  assert.deepEqual(session.getSnapshot(), selected);
  assert.equal(session.dispatch({ type: 'select-bottle', bottleId: 'D' }).accepted, true);
  assert.equal(session.getSnapshot().selectedBottleId, null);
  assert.deepEqual(session.getSnapshot().bottles.find(b => b.id === 'D')?.layers, ['coral', 'coral']);
  session.dispatch({ type: 'select-bottle', bottleId: 'B' });
  session.dispatch({ type: 'cancel-selection' });
  assert.equal(session.getSnapshot().selectedBottleId, null);
});

// Authored traces are independent examples, not solutions generated by the code under test.
test('all authored levels can be completed through selection without ad help', async () => {
  const { BASIC_LEVELS } = await import('../src/levels.ts');
  for (const level of BASIC_LEVELS) {
    const session = createGameSession(level.definition);
    for (const [from, to] of level.solution) {
      assert.equal(session.dispatch({ type: 'select-bottle', bottleId: from }).accepted, true, `${level.definition.id}: select ${from}`);
      assert.equal(session.dispatch({ type: 'select-bottle', bottleId: to }).accepted, true, `${level.definition.id}: ${from} to ${to}`);
      const snapshot = session.getSnapshot();
      const remaining = snapshot.bottles.flatMap(b => b.layers).length;
      const startingUnits = level.definition.bottles.reduce((sum, bottle) => sum + bottle.layers.length, 0);
      assert.equal(remaining + snapshot.collected.reduce((sum, r) => sum + r.units, 0), startingUnits);
    }
    const end = session.getSnapshot();
    assert.equal(end.phase, 'won', level.definition.id);
    assert.equal(end.moveCount, level.solution.length);
    assert.equal(end.bottles.filter(b => b.status === 'ad-locked').length, 2);
    assert.deepEqual(end.collected.map(r => r.color).sort(), [...level.definition.targets, ...(level.definition.upcomingTargets ?? [])].sort());
    assert.equal(end.bottles.filter(b => b.status === 'available' && b.layers.length === 0).length >= 2, true);
  }
});

test('malformed level data is rejected before a playable session is created', () => {
  assert.throws(() => createGameSession({ ...opening, bottles: [...opening.bottles, { id: 'A', layers: [] }] }), /unique/);
  assert.throws(() => createGameSession({ ...opening, bottles: [...opening.bottles, { id: 'ad-1', layers: [] }] }), /reserved/);
  assert.throws(() => createGameSession({ ...opening, bottles: [{ id: 'A', layers: ['moss', 'moss', 'moss', 'moss', 'moss'] }] }), /capacity/);
  assert.throws(() => createGameSession({ ...opening, targets: ['moss'] }), /three/);
  assert.throws(() => createGameSession({ ...opening, bottles: [{ id: 'A', layers: ['moss'] }] }), /colour inventory/);
});

test('callers cannot change a session by mutating level data or returned snapshots', () => {
  const input = structuredClone(opening);
  const session = createGameSession(input);
  const expected = session.getSnapshot();
  input.id = 'changed';
  input.bottles[0]!.layers[0] = 'changed';
  input.targets[0] = 'changed';
  const exposed = session.getSnapshot();
  Reflect.set(exposed.bottles[0]!.layers, 0, 'changed');
  Reflect.set(exposed, 'moveCount', 900);
  assert.deepEqual(session.getSnapshot(), expected);
});

test('a collected position cannot be reused as an empty bottle', () => {
  const session = createGameSession(opening);
  session.dispatch({ type: 'pour', from: 'A', to: 'D' });
  session.dispatch({ type: 'pour', from: 'C', to: 'A' });
  const before = session.getSnapshot();
  assert.deepEqual(session.dispatch({ type: 'pour', from: 'B', to: 'A' }), {
    accepted: false, reason: 'collected-bottle', events: [],
  });
  assert.deepEqual(session.getSnapshot(), before);
});

test('a queued target collects waiting bottles in one committed action', () => {
  const session = createGameSession({
    id: 'chain', title: 'Queue chain',
    bottles: [
      { id: 'A', layers: ['moss', 'moss', 'moss'] },
      { id: 'B', layers: ['moss', 'moss', 'moss'] },
      { id: 'C', layers: ['moss', 'moss', 'moss'] },
      { id: 'D', layers: ['moss', 'moss', 'moss'] },
      { id: 'E', layers: ['coral', 'coral', 'coral', 'coral'] },
      { id: 'F', layers: ['blue', 'blue', 'blue', 'blue'] },
    ],
    targets: ['moss', 'moss', 'moss'], upcomingTargets: ['coral', 'blue'],
  });
  const before = session.getSnapshot();
  assert.equal(before.nextTarget, 'coral');
  assert.equal(before.collected.length, 0);
  assert.deepEqual(before.bottles.slice(4, 6).map(b => b.status), ['ready', 'ready']);
  const result = session.dispatch({ type: 'pour', from: 'B', to: 'A' });
  assert.deepEqual(result.events, [
    { type: 'poured', from: 'B', to: 'A', units: 1 },
    { type: 'collected', bottleId: 'A', color: 'moss', units: 4, slotId: 'slot-1' },
    { type: 'collected', bottleId: 'E', color: 'coral', units: 4, slotId: 'slot-1' },
    { type: 'collected', bottleId: 'F', color: 'blue', units: 4, slotId: 'slot-1' },
  ]);
  const after = session.getSnapshot();
  assert.equal(after.collected.length, 3);
  assert.equal(after.nextTarget, null);
  assert.equal(after.targets[0]?.color, null);
  assert.deepEqual(after.bottles.slice(0, 6).map(b => b.id), ['A', 'B', 'C', 'D', 'E', 'F']);
  assert.equal(after.phase, 'playing');
  session.dispatch({ type: 'pour', from: 'C', to: 'B' });
  const last = session.dispatch({ type: 'pour', from: 'D', to: 'C' });
  assert.deepEqual(last.events.at(-1), { type: 'won', levelId: 'chain' });
  assert.equal(last.events.filter(e => e.type === 'won').length, 1);
  assert.equal(session.getSnapshot().collected.length, 5);
  assert.deepEqual(session.dispatch({ type: 'pour', from: 'D', to: 'B' }).events, []);
});

test('target inventory cannot duplicate, omit or invent collection demand', () => {
  assert.throws(() => createGameSession({ ...opening, upcomingTargets: ['moss'] }), /target inventory/);
  assert.throws(() => createGameSession({ ...opening, targets: ['moss', 'coral', 'amber'] }), /target inventory/);
});

test('a new session has a distinct identity even for the same level', () => {
  const first = createGameSession(opening).getSnapshot();
  const next = createGameSession(opening).getSnapshot();
  assert.notEqual(first.sessionId, next.sessionId);
  assert.equal(first.levelId, next.levelId);
});

test('simultaneous full bottles use identifier order without changing board positions', () => {
  const session = createGameSession({
    id: 'ordered', title: 'Order',
    bottles: [
      { id: 'B', layers: ['moss', 'moss', 'moss', 'moss'] },
      { id: 'A', layers: ['moss', 'moss', 'moss', 'moss'] },
      { id: 'C', layers: ['coral', 'coral', 'coral', 'coral'] },
    ],
    targets: ['moss', 'moss', 'coral'],
  });
  const snapshot = session.getSnapshot();
  assert.deepEqual(snapshot.bottles.slice(0, 3).map(b => b.id), ['B', 'A', 'C']);
  assert.deepEqual(snapshot.collected.map(r => [r.bottleId, r.slotId]), [
    ['A', 'slot-1'], ['B', 'slot-2'], ['C', 'slot-3'],
  ]);
});

test('feedback settings are independent session commands and do not change the board', () => {
  const session = createGameSession(opening);
  const before = session.getSnapshot();
  assert.deepEqual(before.feedback, { sound: false, vibration: false });
  assert.deepEqual(session.dispatch({ type: 'set-feedback', kind: 'sound', enabled: true }), {
    accepted: true, events: [{ type: 'feedback-changed', kind: 'sound', enabled: true }],
  });
  assert.deepEqual(session.getSnapshot().feedback, { sound: true, vibration: false });
  assert.deepEqual(session.getSnapshot().bottles, before.bottles);
  assert.equal(session.getSnapshot().moveCount, 0);
  session.dispatch({ type: 'set-feedback', kind: 'vibration', enabled: true });
  session.dispatch({ type: 'pour', from: 'A', to: 'D' });
  assert.deepEqual(session.getSnapshot().feedback, { sound: true, vibration: true });
  assert.deepEqual(createGameSession(opening).getSnapshot().feedback, { sound: false, vibration: false });
});

test('hidden layers occupy capacity without exposing their colours in the public snapshot', () => {
  const session = createGameSession({
    ...opening,
    bottles: opening.bottles.map(b => b.id === 'A' ? { ...b, hiddenLayers: [1] } : b),
  });
  const before = session.getSnapshot();
  assert.deepEqual(before.bottles[0]?.layers, ['moss', null, 'coral', 'coral']);
  assert.equal(before.bottles[0]?.layers.length, 4);
  assert.equal('hiddenLayers' in before.bottles[0]!, false);
  assert.deepEqual(session.dispatch({ type: 'pour', from: 'A', to: 'D' }).events, [
    { type: 'poured', from: 'A', to: 'D', units: 2 },
    { type: 'revealed', bottleId: 'A', color: 'moss' },
  ]);
  const after = session.getSnapshot();
  assert.deepEqual(after.bottles[0]?.layers, ['moss', 'moss']);
  assert.deepEqual(after.bottles.find(b => b.id === 'D')?.layers, ['coral', 'coral']);
  assert.equal(after.collected.length, 0);
});

test('moving an unknown same-colour layer reveals it only at its destination', () => {
  const session = createGameSession({
    ...opening,
    bottles: opening.bottles.map(b => b.id === 'A' ? { ...b, hiddenLayers: [2] } : b),
  });
  assert.deepEqual(session.getSnapshot().bottles[0]?.layers, ['moss', 'moss', null, 'coral']);
  session.dispatch({ type: 'pour', from: 'A', to: 'D' });
  assert.deepEqual(session.getSnapshot().bottles.find(b => b.id === 'D')?.layers, ['coral', 'coral']);
  assert.deepEqual(session.getSnapshot().bottles[0]?.layers, ['moss', 'moss']);
});

test('invalid hidden-layer positions are rejected before play', () => {
  const withHidden = (hiddenLayers: number[]) => ({
    ...opening,
    bottles: opening.bottles.map(b => b.id === 'A' ? { ...b, hiddenLayers } : b),
  });
  assert.throws(() => createGameSession(withHidden([1, 1])), /hidden layer/);
  assert.throws(() => createGameSession(withHidden([4])), /hidden layer/);
  assert.throws(() => createGameSession(withHidden([3])), /top layer/);
});

test('S06 and S07 expose only planned information before their safe first pours', async () => {
  const { BASIC_LEVELS } = await import('../src/levels.ts');
  const cases = [
    { id: 'S06', opening: ['moss', null, 'coral', 'coral'], revealed: ['moss', 'moss'], units: 2 },
    { id: 'S07', opening: ['moss', 'coral', null, 'coral'], revealed: ['moss', 'coral', 'moss'], units: 1 },
  ] as const;
  for (const example of cases) {
    const level = BASIC_LEVELS.find(candidate => candidate.definition.id === example.id)!;
    const session = createGameSession(level.definition);
    assert.deepEqual(session.getSnapshot().bottles.find(b => b.id === 'A')?.layers, example.opening);
    const result = session.dispatch({ type: 'pour', from: 'A', to: 'D' });
    assert.equal(result.accepted, true);
    assert.deepEqual(result.events, [
      { type: 'poured', from: 'A', to: 'D', units: example.units },
      { type: 'revealed', bottleId: 'A', color: 'moss' },
    ]);
    assert.deepEqual(session.getSnapshot().bottles.find(b => b.id === 'A')?.layers, example.revealed);
    assert.equal(session.getSnapshot().collected.length, 0);
  }
});

test('failed pours and later edits to level data cannot reveal an unknown layer', () => {
  const hiddenBottle = { ...opening.bottles[0]!, hiddenLayers: [1] };
  const sessionInputBottle = structuredClone(hiddenBottle);
  const level = {
    ...opening,
    bottles: [sessionInputBottle, ...opening.bottles.slice(1)],
  };
  const session = createGameSession(level);
  const before = session.getSnapshot();
  sessionInputBottle.hiddenLayers[0] = 0;
  assert.deepEqual(session.dispatch({ type: 'pour', from: 'A', to: 'B' }), {
    accepted: false, reason: 'full-target', events: [],
  });
  assert.deepEqual(session.getSnapshot(), before);
});
