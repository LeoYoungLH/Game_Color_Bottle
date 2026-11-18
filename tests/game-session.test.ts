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

const blockedLevel = {
  id: 'blocked', title: 'No free space', targets: ['moss', 'coral', 'blue'],
  bottles: [
    { id: 'A', layers: ['moss', 'coral', 'blue', 'moss'] },
    { id: 'B', layers: ['coral', 'blue', 'moss', 'coral'] },
    { id: 'C', layers: ['blue', 'moss', 'coral', 'blue'] },
  ],
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

test('a full bottle without a matching current target stays ready in its own position', () => {
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

test('hidden-level witness routes use visible top colours at every decision fork', async () => {
  const { BASIC_LEVELS } = await import('../src/levels.ts');
  const cases = [
    { id: 'S06', reveals: { 0: ['A', 'moss'], 2: ['B', 'coral'] } },
    { id: 'S07', reveals: { 0: ['A', 'moss'], 1: ['C', 'blue'], 2: ['B', 'coral'] } },
  ];
  for (const example of cases) {
    const level = BASIC_LEVELS.find(candidate => candidate.definition.id === example.id)!;
    const session = createGameSession(level.definition);
    for (const [step, [from, to]] of level.solution.entries()) {
      const before = session.getSnapshot();
      const source = before.bottles.find(b => b.id === from)!;
      const target = before.bottles.find(b => b.id === to)!;
      const visibleTop = source.layers.at(-1);
      assert.equal(typeof visibleTop, 'string', `${example.id} step ${step + 1} must not need an unknown source colour`);
      assert.ok(target.layers.length === 0 || target.layers.at(-1) === visibleTop);
      const result = session.dispatch({ type: 'pour', from, to });
      assert.equal(result.accepted, true);
      const expected = Object.entries(example.reveals).find(([index]) => Number(index) === step)?.[1];
      assert.deepEqual(result.events.filter(event => event.type === 'revealed').map(event => [event.bottleId, event.color]), expected ? [expected] : []);
    }
    assert.equal(session.getSnapshot().phase, 'won');
  }
});

test('a sealed bottle rejects both directions until actual collections reach its threshold', () => {
  const session = createGameSession({
    ...opening,
    bottles: [
      ...opening.bottles,
      { id: 'I', layers: ['honey', 'honey', 'honey'], sealThreshold: 2 },
      { id: 'J', layers: ['honey'] },
    ],
    upcomingTargets: ['honey'],
  });
  const openingState = session.getSnapshot();
  const initialPositions = openingState.bottles.map(b => b.id);
  assert.deepEqual(openingState.bottles.find(b => b.id === 'I'), {
    id: 'I', layers: [null, null, null], status: 'sealed', sealThreshold: 2,
  });
  assert.deepEqual(session.dispatch({ type: 'pour', from: 'J', to: 'I' }), {
    accepted: false, reason: 'sealed-bottle', events: [],
  });
  assert.deepEqual(session.dispatch({ type: 'pour', from: 'I', to: 'D' }), {
    accepted: false, reason: 'sealed-bottle', events: [],
  });
  assert.deepEqual(session.dispatch({ type: 'select-bottle', bottleId: 'I' }), {
    accepted: false, reason: 'sealed-bottle', events: [],
  });
  assert.deepEqual(session.getSnapshot(), openingState);
  session.dispatch({ type: 'pour', from: 'A', to: 'D' });
  session.dispatch({ type: 'pour', from: 'C', to: 'A' });
  assert.equal(session.getSnapshot().collected.length, 1);
  assert.equal(session.getSnapshot().bottles.find(b => b.id === 'I')?.status, 'sealed');
  const second = session.dispatch({ type: 'pour', from: 'B', to: 'C' });
  assert.deepEqual(second.events.filter(event => event.type === 'unsealed'), [
    { type: 'unsealed', bottleId: 'I', threshold: 2 },
  ]);
  assert.equal(session.getSnapshot().collected.length, 2);
  assert.deepEqual(session.getSnapshot().bottles.find(b => b.id === 'I'), {
    id: 'I', layers: ['honey', 'honey', 'honey'], status: 'available', sealThreshold: 2,
  });
  assert.deepEqual(session.getSnapshot().bottles.map(b => b.id), initialPositions);
  session.dispatch({ type: 'pour', from: 'J', to: 'I' });
  assert.equal(session.getSnapshot().collected.length, 3);
  session.dispatch({ type: 'pour', from: 'B', to: 'D' });
  assert.equal(session.getSnapshot().phase, 'won');
});

test('filling a waiting bottle without collection does not advance a seal', () => {
  const session = createGameSession({
    ...opening,
    bottles: [
      ...opening.bottles,
      { id: 'I', layers: ['honey', 'honey', 'honey'], sealThreshold: 2 },
      { id: 'J', layers: ['honey'] },
      { id: 'K', layers: ['violet', 'violet', 'violet'] },
      { id: 'L', layers: ['violet'] },
    ],
    upcomingTargets: ['honey', 'violet'],
  });
  session.dispatch({ type: 'pour', from: 'A', to: 'D' });
  session.dispatch({ type: 'pour', from: 'C', to: 'A' });
  const before = session.getSnapshot();
  assert.equal(before.collected.length, 1);
  const filled = session.dispatch({ type: 'pour', from: 'L', to: 'K' });
  assert.deepEqual(filled.events, [{ type: 'poured', from: 'L', to: 'K', units: 1 }]);
  const after = session.getSnapshot();
  assert.equal(after.bottles.find(b => b.id === 'K')?.status, 'ready');
  assert.equal(after.bottles.find(b => b.id === 'I')?.status, 'sealed');
  assert.equal(after.collected.length, 1);
});

test('the fifth actual receipt opens a threshold-five seal once and settles its waiting bottle', async () => {
  const { BASIC_LEVELS } = await import('../src/levels.ts');
  const base = BASIC_LEVELS.find(level => level.definition.id === 'S05')!.definition;
  const session = createGameSession({
    ...base,
    id: 'threshold-five',
    bottles: [...base.bottles, { id: 'I', layers: ['honey', 'honey', 'honey', 'honey'], sealThreshold: 5 }],
    upcomingTargets: [...(base.upcomingTargets ?? []), 'honey'],
  });
  session.dispatch({ type: 'pour', from: 'B', to: 'A' });
  session.dispatch({ type: 'pour', from: 'C', to: 'B' });
  const before = session.getSnapshot();
  assert.equal(before.collected.length, 4);
  assert.equal(before.bottles.find(b => b.id === 'I')?.status, 'sealed');
  assert.deepEqual(before.bottles.find(b => b.id === 'I')?.layers, [null, null, null, null]);
  const fifth = session.dispatch({ type: 'pour', from: 'D', to: 'C' });
  assert.deepEqual(fifth.events, [
    { type: 'poured', from: 'D', to: 'C', units: 3 },
    { type: 'collected', bottleId: 'C', color: 'moss', units: 4, slotId: 'slot-3' },
    { type: 'unsealed', bottleId: 'I', threshold: 5 },
    { type: 'collected', bottleId: 'I', color: 'honey', units: 4, slotId: 'slot-1' },
    { type: 'won', levelId: 'threshold-five' },
  ]);
  assert.equal(session.getSnapshot().collected.length, 6);
  assert.equal(session.getSnapshot().phase, 'won');
  assert.equal(session.getSnapshot().bottles.find(b => b.id === 'I')?.sealThreshold, 5);
  assert.equal(session.dispatch({ type: 'pour', from: 'I', to: 'D' }).accepted, false);
});

test('at four receipts, filling an unmatched bottle leaves a threshold-five seal closed', async () => {
  const { BASIC_LEVELS } = await import('../src/levels.ts');
  const base = BASIC_LEVELS.find(level => level.definition.id === 'S05')!.definition;
  const session = createGameSession({
    ...base,
    id: 'four-before-five',
    bottles: [
      ...base.bottles,
      { id: 'I', layers: ['honey', 'honey', 'honey', 'honey'], sealThreshold: 5 },
      { id: 'J', layers: ['honey', 'honey', 'honey', 'honey'] },
      { id: 'K', layers: ['violet', 'violet', 'violet'] },
      { id: 'L', layers: ['violet'] },
    ],
    upcomingTargets: ['coral', 'blue', 'honey', 'honey', 'violet'],
  });
  session.dispatch({ type: 'pour', from: 'B', to: 'A' });
  const before = session.getSnapshot();
  assert.equal(before.collected.length, 4);
  assert.equal(before.bottles.find(b => b.id === 'I')?.status, 'sealed');
  assert.deepEqual(session.dispatch({ type: 'pour', from: 'L', to: 'K' }).events, [
    { type: 'poured', from: 'L', to: 'K', units: 1 },
  ]);
  const after = session.getSnapshot();
  assert.equal(after.collected.length, 4);
  assert.equal(after.bottles.find(b => b.id === 'K')?.status, 'ready');
  assert.equal(after.bottles.find(b => b.id === 'I')?.status, 'sealed');
  const fifth = session.dispatch({ type: 'pour', from: 'C', to: 'B' });
  assert.equal(fifth.events.filter(event => event.type === 'unsealed').length, 1);
  assert.equal(session.getSnapshot().bottles.find(b => b.id === 'I')?.status, 'collected');
});

test('sealed bottle thresholds must be meaningful level data', () => {
  const withSeal = (sealThreshold: number, layers = ['honey', 'honey', 'honey', 'honey']) => ({
    ...opening,
    bottles: [...opening.bottles, { id: 'I', layers, sealThreshold }],
    upcomingTargets: ['honey'],
  });
  assert.throws(() => createGameSession(withSeal(0)), /positive integer/);
  assert.throws(() => createGameSession(withSeal(1.5)), /positive integer/);
  assert.throws(() => createGameSession(withSeal(4)), /precede/);
  assert.throws(() => createGameSession(withSeal(2, [])), /contents/);
});

test('changing a level threshold after session creation cannot open its seal early', () => {
  const sealed = { id: 'I', layers: ['honey', 'honey', 'honey', 'honey'], sealThreshold: 2 };
  const session = createGameSession({
    ...opening,
    bottles: [...opening.bottles, sealed],
    upcomingTargets: ['honey'],
  });
  sealed.sealThreshold = 1;
  session.dispatch({ type: 'pour', from: 'A', to: 'D' });
  session.dispatch({ type: 'pour', from: 'C', to: 'A' });
  assert.equal(session.getSnapshot().collected.length, 1);
  assert.equal(session.getSnapshot().bottles.find(b => b.id === 'I')?.status, 'sealed');
  assert.equal(session.getSnapshot().bottles.find(b => b.id === 'I')?.sealThreshold, 2);
});

test('a receive-only bottle accepts matching colour but cannot pour before completion', () => {
  const session = createGameSession({
    ...opening,
    bottles: [
      ...opening.bottles,
      { id: 'I', layers: ['honey', 'honey', 'honey'], receiveOnly: true },
      { id: 'J', layers: ['honey'] },
    ],
    upcomingTargets: ['honey'],
  });
  const initial = session.getSnapshot();
  assert.deepEqual(initial.bottles.find(b => b.id === 'I'), {
    id: 'I', layers: ['honey', 'honey', 'honey'], status: 'receive-only', receiveOnly: true,
  });
  assert.deepEqual(session.dispatch({ type: 'select-bottle', bottleId: 'I' }), {
    accepted: false, reason: 'receive-only-source', events: [],
  });
  assert.deepEqual(session.dispatch({ type: 'pour', from: 'I', to: 'E' }), {
    accepted: false, reason: 'receive-only-source', events: [],
  });
  assert.deepEqual(session.getSnapshot(), initial);
  const filled = session.dispatch({ type: 'pour', from: 'J', to: 'I' });
  assert.deepEqual(filled.events, [
    { type: 'poured', from: 'J', to: 'I', units: 1 },
    { type: 'released', bottleId: 'I' },
  ]);
  const waiting = session.getSnapshot();
  assert.equal(waiting.bottles.find(b => b.id === 'I')?.status, 'ready');
  assert.equal(waiting.collected.length, 0);
  assert.deepEqual(session.dispatch({ type: 'pour', from: 'I', to: 'J' }), {
    accepted: false, reason: 'completed-source', events: [],
  });
  session.dispatch({ type: 'pour', from: 'A', to: 'D' });
  const chain = session.dispatch({ type: 'pour', from: 'C', to: 'A' });
  assert.deepEqual(chain.events.flatMap(event => event.type === 'collected' ? [event.bottleId] : []), ['A', 'I']);
  assert.equal(session.getSnapshot().bottles.find(b => b.id === 'I')?.status, 'collected');
});

test('two receive-only bottles release independently and never become free transit space', () => {
  const session = createGameSession({
    ...opening,
    bottles: [
      ...opening.bottles,
      { id: 'I', layers: ['honey', 'honey', 'honey'], receiveOnly: true },
      { id: 'K', layers: ['violet', 'violet', 'violet'], receiveOnly: true },
      { id: 'J', layers: ['honey'] }, { id: 'L', layers: ['violet'] },
    ],
    upcomingTargets: ['honey', 'violet'],
  });
  const before = session.getSnapshot();
  const first = session.dispatch({ type: 'pour', from: 'J', to: 'I' });
  assert.deepEqual(first.events, [
    { type: 'poured', from: 'J', to: 'I', units: 1 },
    { type: 'released', bottleId: 'I' },
  ]);
  const halfway = session.getSnapshot();
  assert.deepEqual(halfway.bottles.map(b => b.id), before.bottles.map(b => b.id));
  assert.equal(halfway.bottles.find(b => b.id === 'I')?.status, 'ready');
  assert.equal(halfway.bottles.find(b => b.id === 'K')?.status, 'receive-only');
  assert.deepEqual(session.dispatch({ type: 'pour', from: 'K', to: 'J' }), {
    accepted: false, reason: 'receive-only-source', events: [],
  });
  assert.deepEqual(session.getSnapshot(), halfway);
  const second = session.dispatch({ type: 'pour', from: 'L', to: 'K' });
  assert.deepEqual(second.events, [
    { type: 'poured', from: 'L', to: 'K', units: 1 },
    { type: 'released', bottleId: 'K' },
  ]);
  assert.equal(session.getSnapshot().bottles.find(b => b.id === 'K')?.status, 'ready');
  assert.equal(session.getSnapshot().bottles.filter(b => b.status === 'ad-locked').length, 2);
  assert.equal(session.getSnapshot().bottles.filter(b => b.status === 'available' && b.layers.length === 0).length >= 2, true);
});

test('receive-only level data must start known, partial, monochrome and unsealed', () => {
  const withFixed = (bottle: object) => createGameSession({
    ...opening,
    bottles: [...opening.bottles, { id: 'I', layers: ['honey', 'honey', 'honey', 'honey'], ...bottle }],
    upcomingTargets: ['honey'],
  });
  assert.throws(() => withFixed({ layers: [], receiveOnly: true }), /receive-only/);
  assert.throws(() => withFixed({ receiveOnly: true }), /receive-only/);
  assert.throws(() => withFixed({ layers: ['honey', 'honey', 'coral'], receiveOnly: true }), /receive-only/);
  assert.throws(() => withFixed({ layers: ['honey', 'honey', 'honey'], hiddenLayers: [0], receiveOnly: true }), /receive-only/);
  assert.throws(() => withFixed({ layers: ['honey', 'honey', 'honey'], sealThreshold: 2, receiveOnly: true }), /receive-only/);
});

test('a matching receive-only bottle releases and collects exactly once in the same pour', () => {
  const fixed = { id: 'I', layers: ['honey', 'honey', 'honey'], receiveOnly: true };
  const session = createGameSession({
    ...opening,
    bottles: [...opening.bottles, fixed, { id: 'J', layers: ['honey'] }],
    targets: ['moss', 'coral', 'honey'], upcomingTargets: ['blue'],
  });
  const before = session.getSnapshot();
  fixed.receiveOnly = false;
  assert.deepEqual(session.dispatch({ type: 'pour', from: 'A', to: 'I' }), {
    accepted: false, reason: 'different-color', events: [],
  });
  assert.deepEqual(session.getSnapshot(), before);
  assert.deepEqual(session.dispatch({ type: 'pour', from: 'J', to: 'I' }).events, [
    { type: 'poured', from: 'J', to: 'I', units: 1 },
    { type: 'released', bottleId: 'I' },
    { type: 'collected', bottleId: 'I', color: 'honey', units: 4, slotId: 'slot-3' },
  ]);
  const after = session.getSnapshot();
  assert.equal(after.collected.length, 1);
  assert.equal(after.bottles.find(b => b.id === 'I')?.status, 'collected');
  assert.equal(after.bottles.find(b => b.id === 'I')?.receiveOnly, true);
  assert.deepEqual(after.bottles.map(b => b.id), before.bottles.map(b => b.id));
});

test('a pending simulated ad freezes gameplay and non-success outcomes leave bottles unchanged', () => {
  for (const outcome of ['cancelled', 'failed', 'unavailable'] as const) {
    const session = createGameSession(opening);
    const start = session.getSnapshot();
    const requested = session.dispatch({ type: 'request-ad-bottle', bottleId: 'ad-1' });
    assert.equal(requested.accepted, true);
    const pending = session.getSnapshot().pendingAd!;
    assert.equal(pending.reward, 'empty-bottle');
    assert.equal(pending.targetId, 'ad-1');
    assert.equal(pending.levelId, start.levelId);
    assert.equal(pending.sessionId, start.sessionId);
    assert.ok(pending.requestId);
    assert.deepEqual(requested.events, [{ type: 'ad-requested', request: pending }]);
    const waiting = session.getSnapshot();
    for (const action of [
      { type: 'pour', from: 'A', to: 'D' },
      { type: 'select-bottle', bottleId: 'A' },
      { type: 'cancel-selection' },
      { type: 'set-feedback', kind: 'sound', enabled: true },
      { type: 'request-ad-bottle', bottleId: 'ad-2' },
    ] as const) {
      assert.deepEqual(session.dispatch(action), { accepted: false, reason: 'ad-request-pending', events: [] });
      assert.deepEqual(session.getSnapshot(), waiting);
    }
    assert.deepEqual(session.dispatch({ type: 'resolve-ad', request: pending, outcome }).events, [
      { type: 'ad-result', reward: 'empty-bottle', targetId: 'ad-1', outcome },
    ]);
    const after = session.getSnapshot();
    assert.equal(after.pendingAd, null);
    assert.deepEqual(after.bottles, start.bottles);
    assert.equal(after.moveCount, 0);
    assert.equal(after.collected.length, 0);
    assert.equal(session.dispatch({ type: 'request-ad-bottle', bottleId: 'ad-1' }).accepted, true);
    assert.notEqual(session.getSnapshot().pendingAd?.requestId, pending.requestId);
  }
});

test('a completed simulated ad unlocks only its requested bottle and never awards twice', () => {
  const session = createGameSession(opening);
  assert.deepEqual(session.dispatch({ type: 'request-ad-bottle', bottleId: 'A' }), {
    accepted: false, reason: 'not-ad-bottle', events: [],
  });
  session.dispatch({ type: 'request-ad-bottle', bottleId: 'ad-1' });
  const request = session.getSnapshot().pendingAd!;
  for (const changed of [
    { ...request, targetId: 'ad-2' },
    { ...request, reward: 'fourth-slot' },
    { ...request, levelId: 'other' },
    { ...request, sessionId: 'other' },
    { ...request, requestId: 'other' },
  ]) {
    const before = session.getSnapshot();
    assert.deepEqual(session.dispatch({ type: 'resolve-ad', request: changed, outcome: 'success' }), {
      accepted: false, reason: 'stale-ad-result', events: [],
    });
    assert.deepEqual(session.getSnapshot(), before);
  }
  assert.deepEqual(session.dispatch({ type: 'resolve-ad', request, outcome: 'success' }).events, [
    { type: 'ad-result', reward: 'empty-bottle', targetId: 'ad-1', outcome: 'success' },
    { type: 'ad-bottle-unlocked', bottleId: 'ad-1' },
  ]);
  const unlocked = session.getSnapshot();
  assert.deepEqual(unlocked.bottles.slice(-2).map(b => [b.id, b.status, b.layers]), [
    ['ad-1', 'available', []], ['ad-2', 'ad-locked', []],
  ]);
  assert.equal(unlocked.collected.length, 0);
  assert.equal(unlocked.moveCount, 0);
  assert.deepEqual(session.dispatch({ type: 'resolve-ad', request, outcome: 'success' }), {
    accepted: false, reason: 'stale-ad-result', events: [],
  });
  assert.deepEqual(session.getSnapshot(), unlocked);
  assert.deepEqual(session.dispatch({ type: 'request-ad-bottle', bottleId: 'ad-1' }), {
    accepted: false, reason: 'ad-already-unlocked', events: [],
  });
  session.dispatch({ type: 'request-ad-bottle', bottleId: 'ad-2' });
  const second = session.getSnapshot().pendingAd!;
  session.dispatch({ type: 'resolve-ad', request: second, outcome: 'success' });
  assert.deepEqual(session.getSnapshot().bottles.slice(-2).map(b => b.status), ['available', 'available']);
});

test('an unlocked ad bottle can receive, pour and be collected without refilling its position', () => {
  const session = createGameSession(opening);
  session.dispatch({ type: 'request-ad-bottle', bottleId: 'ad-1' });
  session.dispatch({ type: 'resolve-ad', request: session.getSnapshot().pendingAd!, outcome: 'success' });
  session.dispatch({ type: 'pour', from: 'A', to: 'ad-1' });
  assert.deepEqual(session.getSnapshot().bottles.find(b => b.id === 'ad-1')?.layers, ['coral', 'coral']);
  assert.equal(session.dispatch({ type: 'pour', from: 'ad-1', to: 'D' }).accepted, true);
  assert.deepEqual(session.getSnapshot().bottles.find(b => b.id === 'ad-1')?.layers, []);
  session.dispatch({ type: 'pour', from: 'D', to: 'ad-1' });
  session.dispatch({ type: 'pour', from: 'C', to: 'A' });
  session.dispatch({ type: 'pour', from: 'B', to: 'C' });
  const last = session.dispatch({ type: 'pour', from: 'B', to: 'ad-1' });
  assert.deepEqual(last.events.flatMap(event => event.type === 'collected' ? [event.bottleId] : []), ['ad-1']);
  const end = session.getSnapshot();
  assert.equal(end.phase, 'won');
  assert.equal(end.bottles.find(b => b.id === 'ad-1')?.status, 'collected');
  assert.equal(end.bottles.find(b => b.id === 'ad-2')?.status, 'ad-locked');
  assert.equal(session.dispatch({ type: 'pour', from: 'D', to: 'ad-1' }).accepted, false);
});

test('old-session ad results cannot unlock a new game of the same or another level', async () => {
  const old = createGameSession(opening);
  old.dispatch({ type: 'request-ad-bottle', bottleId: 'ad-1' });
  const oldRequest = old.getSnapshot().pendingAd!;
  const { BASIC_LEVELS } = await import('../src/levels.ts');
  for (const level of [opening, BASIC_LEVELS[1]!.definition]) {
    const next = createGameSession(level);
    const before = next.getSnapshot();
    assert.notEqual(before.sessionId, oldRequest.sessionId);
    assert.deepEqual(next.dispatch({ type: 'resolve-ad', request: oldRequest, outcome: 'success' }), {
      accepted: false, reason: 'stale-ad-result', events: [],
    });
    assert.deepEqual(next.getSnapshot(), before);
    assert.deepEqual(before.bottles.slice(-2).map(b => b.status), ['ad-locked', 'ad-locked']);
  }
});

test('unknown ad outcomes and edits to a returned request cannot poison the pending request', () => {
  const session = createGameSession(opening);
  const result = session.dispatch({ type: 'request-ad-bottle', bottleId: 'ad-1' });
  const request = result.events.flatMap(event => event.type === 'ad-requested' ? [event.request] : [])[0];
  assert.ok(request);
  Reflect.set(request, 'targetId', 'ad-2');
  const pending = session.getSnapshot().pendingAd!;
  assert.equal(pending.targetId, 'ad-1');
  const before = session.getSnapshot();
  assert.deepEqual(Reflect.apply(session.dispatch, null, [{ type: 'resolve-ad', request: pending, outcome: 'unexpected' }]), {
    accepted: false, reason: 'stale-ad-result', events: [],
  });
  assert.deepEqual(session.getSnapshot(), before);
});

test('a late result from a cancelled request cannot replace a retry for the same bottle', () => {
  const session = createGameSession(opening);
  session.dispatch({ type: 'select-bottle', bottleId: 'A' });
  const selected = session.getSnapshot();
  session.dispatch({ type: 'request-ad-bottle', bottleId: 'ad-1' });
  const oldRequest = session.getSnapshot().pendingAd!;
  session.dispatch({ type: 'resolve-ad', request: oldRequest, outcome: 'cancelled' });
  assert.equal(session.getSnapshot().selectedBottleId, selected.selectedBottleId);
  session.dispatch({ type: 'request-ad-bottle', bottleId: 'ad-1' });
  const retry = session.getSnapshot();
  assert.notEqual(retry.pendingAd?.requestId, oldRequest.requestId);
  assert.deepEqual(session.dispatch({ type: 'resolve-ad', request: oldRequest, outcome: 'success' }), {
    accepted: false, reason: 'stale-ad-result', events: [],
  });
  assert.deepEqual(session.getSnapshot(), retry);
  session.dispatch({ type: 'resolve-ad', request: retry.pendingAd!, outcome: 'success' });
  assert.equal(session.getSnapshot().selectedBottleId, 'A');
  assert.equal(session.dispatch({ type: 'select-bottle', bottleId: 'ad-1' }).accepted, true);
  assert.deepEqual(session.getSnapshot().bottles.find(b => b.id === 'ad-1')?.layers, ['coral', 'coral']);
});

test('the auxiliary collection slot is locked when no target remains to assign', () => {
  const session = createGameSession(opening);
  const before = session.getSnapshot();
  assert.deepEqual(before.auxiliarySlot, { id: 'slot-4', unlocked: false, color: null, fulfilled: false });
  assert.equal(before.nextTarget, null);
  assert.deepEqual(session.dispatch({ type: 'request-fourth-slot' }), {
    accepted: false, reason: 'no-pending-target', events: [],
  });
  assert.deepEqual(session.getSnapshot(), before);
});

test('a fourth-slot reward takes one queued target and chains waiting full bottles without copying demand', async () => {
  const { BASIC_LEVELS } = await import('../src/levels.ts');
  const level = BASIC_LEVELS.find(candidate => candidate.definition.id === 'S05')!.definition;
  const session = createGameSession(level);
  const initial = session.getSnapshot();
  assert.equal(initial.nextTarget, 'coral');
  assert.equal(initial.collected.length, 0);
  assert.deepEqual(initial.bottles.filter(b => b.status === 'ad-locked').map(b => b.id), ['ad-1', 'ad-2']);
  const requested = session.dispatch({ type: 'request-fourth-slot' });
  assert.equal(requested.accepted, true);
  const pending = session.getSnapshot().pendingAd!;
  assert.deepEqual([pending.reward, pending.targetId, pending.levelId, pending.sessionId], ['fourth-slot', 'slot-4', level.id, initial.sessionId]);
  assert.deepEqual(session.dispatch({ type: 'resolve-ad', request: pending, outcome: 'success' }).events, [
    { type: 'ad-result', reward: 'fourth-slot', targetId: 'slot-4', outcome: 'success' },
    { type: 'ad-slot-unlocked', slotId: 'slot-4', color: 'coral' },
    { type: 'collected', bottleId: 'E', color: 'coral', units: 4, slotId: 'slot-4' },
    { type: 'collected', bottleId: 'F', color: 'blue', units: 4, slotId: 'slot-4' },
  ]);
  const after = session.getSnapshot();
  assert.deepEqual(after.auxiliarySlot, { id: 'slot-4', unlocked: true, color: null, fulfilled: true });
  assert.equal(after.nextTarget, null);
  assert.equal(after.collected.length, 2);
  assert.deepEqual(after.bottles.filter(b => b.status === 'ad-locked').map(b => b.id), ['ad-1', 'ad-2']);
  assert.deepEqual(session.dispatch({ type: 'request-fourth-slot' }), {
    accepted: false, reason: 'slot-already-unlocked', events: [],
  });
  for (const [from, to] of [['B', 'A'], ['C', 'B'], ['D', 'C']] as const) {
    assert.equal(session.dispatch({ type: 'pour', from, to }).accepted, true);
  }
  assert.equal(session.getSnapshot().phase, 'won');
  assert.equal(session.getSnapshot().collected.length, 5);
});

test('empty-bottle and fourth-slot rewards remain separate across failed and stale results', async () => {
  const { BASIC_LEVELS } = await import('../src/levels.ts');
  const level = BASIC_LEVELS.find(candidate => candidate.definition.id === 'S05')!.definition;
  const session = createGameSession(level);
  session.dispatch({ type: 'request-ad-bottle', bottleId: 'ad-1' });
  session.dispatch({ type: 'resolve-ad', request: session.getSnapshot().pendingAd!, outcome: 'success' });
  const bottleOnly = session.getSnapshot();
  assert.equal(bottleOnly.bottles.find(b => b.id === 'ad-1')?.status, 'available');
  assert.equal(bottleOnly.auxiliarySlot.unlocked, false);
  assert.equal(bottleOnly.nextTarget, 'coral');
  session.dispatch({ type: 'request-fourth-slot' });
  const pending = session.getSnapshot().pendingAd!;
  assert.equal(pending.reward, 'fourth-slot');
  assert.deepEqual(session.dispatch({ type: 'request-ad-bottle', bottleId: 'ad-2' }), {
    accepted: false, reason: 'ad-request-pending', events: [],
  });
  for (const changed of [
    { ...pending, targetId: 'ad-2' },
    { ...pending, reward: 'empty-bottle' },
    { ...pending, sessionId: 'old-session' },
    { ...pending, requestId: 'old-request' },
  ]) {
    const before = session.getSnapshot();
    assert.deepEqual(session.dispatch({ type: 'resolve-ad', request: changed, outcome: 'success' }), {
      accepted: false, reason: 'stale-ad-result', events: [],
    });
    assert.deepEqual(session.getSnapshot(), before);
  }
  assert.deepEqual(session.dispatch({ type: 'resolve-ad', request: pending, outcome: 'failed' }).events, [
    { type: 'ad-result', reward: 'fourth-slot', targetId: 'slot-4', outcome: 'failed' },
  ]);
  assert.equal(session.getSnapshot().auxiliarySlot.unlocked, false);
  assert.equal(session.getSnapshot().nextTarget, 'coral');
  assert.equal(session.getSnapshot().bottles.find(b => b.id === 'ad-1')?.status, 'available');
  session.dispatch({ type: 'request-fourth-slot' });
  const retry = session.getSnapshot();
  assert.notEqual(retry.pendingAd?.requestId, pending.requestId);
  assert.deepEqual(session.dispatch({ type: 'resolve-ad', request: pending, outcome: 'success' }), {
    accepted: false, reason: 'stale-ad-result', events: [],
  });
  assert.deepEqual(session.getSnapshot(), retry);
  session.dispatch({ type: 'resolve-ad', request: retry.pendingAd!, outcome: 'cancelled' });
  assert.equal(session.getSnapshot().auxiliarySlot.unlocked, false);
});

test('the fourth slot cannot request a reward after normal play consumes the shared queue', async () => {
  const { BASIC_LEVELS } = await import('../src/levels.ts');
  const level = BASIC_LEVELS.find(candidate => candidate.definition.id === 'S05')!.definition;
  const session = createGameSession(level);
  session.dispatch({ type: 'pour', from: 'B', to: 'A' });
  const before = session.getSnapshot();
  assert.equal(before.phase, 'playing');
  assert.equal(before.nextTarget, null);
  assert.equal(before.collected.length, 3);
  assert.deepEqual(session.dispatch({ type: 'request-fourth-slot' }), {
    accepted: false, reason: 'no-pending-target', events: [],
  });
  assert.deepEqual(session.getSnapshot(), before);
});

test('an undo reward grants one separate chance before restoring the last successful pour', () => {
  const session = createGameSession(opening);
  const initial = session.getSnapshot();
  assert.equal(initial.undoCredits, 0);
  assert.equal(initial.canUndo, false);
  assert.deepEqual(session.dispatch({ type: 'request-undo' }), { accepted: false, reason: 'no-undo-history', events: [] });
  session.dispatch({ type: 'pour', from: 'A', to: 'D' });
  const poured = session.getSnapshot();
  assert.equal(poured.canUndo, true);
  assert.equal(session.dispatch({ type: 'request-undo' }).accepted, true);
  const pending = session.getSnapshot().pendingAd!;
  assert.deepEqual([pending.reward, pending.targetId], ['undo', 'undo']);
  session.dispatch({ type: 'resolve-ad', request: pending, outcome: 'success' });
  assert.equal(session.getSnapshot().undoCredits, 1);
  assert.deepEqual(session.getSnapshot().bottles, poured.bottles);
  assert.deepEqual(session.dispatch({ type: 'undo' }).events, [{ type: 'undone' }]);
  const restored = session.getSnapshot();
  assert.equal(restored.undoCredits, 0);
  assert.equal(restored.canUndo, false);
  assert.deepEqual(restored.bottles, initial.bottles);
  assert.equal(restored.moveCount, initial.moveCount);
  assert.deepEqual(session.dispatch({ type: 'undo' }), { accepted: false, reason: 'no-undo-history', events: [] });
});

test('undo restores hidden information and a collection-seal chain without revoking ad entitlements', () => {
  const level = {
    ...opening,
    bottles: [
      { id: 'A', layers: ['moss', 'moss', 'coral', 'coral'], hiddenLayers: [1] },
      ...opening.bottles.slice(1),
      { id: 'I', layers: ['honey', 'honey', 'honey', 'honey'], sealThreshold: 1 },
      { id: 'K', layers: ['violet', 'violet', 'violet'], receiveOnly: true },
      { id: 'L', layers: ['violet'] },
    ],
    upcomingTargets: ['honey', 'violet'],
  };
  const session = createGameSession(level);
  session.dispatch({ type: 'pour', from: 'A', to: 'D' });
  const revealed = session.getSnapshot();
  assert.deepEqual(revealed.bottles.find(b => b.id === 'A')?.layers, ['moss', 'moss']);
  session.dispatch({ type: 'request-fourth-slot' });
  session.dispatch({ type: 'resolve-ad', request: session.getSnapshot().pendingAd!, outcome: 'success' });
  session.dispatch({ type: 'request-ad-bottle', bottleId: 'ad-1' });
  session.dispatch({ type: 'resolve-ad', request: session.getSnapshot().pendingAd!, outcome: 'success' });
  const constrained = session.getSnapshot();
  assert.deepEqual(session.dispatch({ type: 'pour', from: 'L', to: 'K' }).events, [
    { type: 'poured', from: 'L', to: 'K', units: 1 },
    { type: 'released', bottleId: 'K' },
  ]);
  assert.equal(session.getSnapshot().bottles.find(b => b.id === 'K')?.status, 'ready');
  const before = session.getSnapshot();
  const chain = session.dispatch({ type: 'pour', from: 'C', to: 'A' });
  assert.deepEqual(chain.events.flatMap(event => event.type === 'collected' ? [event.bottleId] : []), ['A', 'I', 'K']);
  assert.equal(session.getSnapshot().auxiliarySlot.fulfilled, true);
  assert.equal(session.getSnapshot().targets[0]?.fulfilled, true);
  session.dispatch({ type: 'request-undo' });
  session.dispatch({ type: 'resolve-ad', request: session.getSnapshot().pendingAd!, outcome: 'success' });
  session.dispatch({ type: 'undo' });
  const after = session.getSnapshot();
  assert.deepEqual(after.bottles, before.bottles);
  assert.deepEqual(after.targets, before.targets);
  assert.deepEqual(after.auxiliarySlot, before.auxiliarySlot);
  assert.deepEqual(after.collected, before.collected);
  assert.equal(after.moveCount, before.moveCount);
  assert.equal(after.undoCredits, 0);
  session.dispatch({ type: 'request-undo' });
  session.dispatch({ type: 'resolve-ad', request: session.getSnapshot().pendingAd!, outcome: 'success' });
  session.dispatch({ type: 'undo' });
  assert.deepEqual(session.getSnapshot().bottles, constrained.bottles);
  assert.equal(session.getSnapshot().bottles.find(b => b.id === 'K')?.status, 'receive-only');
  session.dispatch({ type: 'request-undo' });
  session.dispatch({ type: 'resolve-ad', request: session.getSnapshot().pendingAd!, outcome: 'success' });
  session.dispatch({ type: 'undo' });
  const original = session.getSnapshot();
  assert.deepEqual(original.bottles.find(b => b.id === 'A')?.layers, ['moss', null, 'coral', 'coral']);
  assert.equal(original.bottles.find(b => b.id === 'ad-1')?.status, 'available');
  assert.equal(original.auxiliarySlot.unlocked, true);
  assert.equal(original.auxiliarySlot.color, 'honey');
  assert.equal(original.nextTarget, 'violet');
  assert.equal(original.collected.length, 0);
});

test('undo cannot duplicate a credit, an ad result, or an already consumed turn', () => {
  const session = createGameSession(opening);
  session.dispatch({ type: 'pour', from: 'A', to: 'D' });
  session.dispatch({ type: 'request-undo' });
  const request = session.getSnapshot().pendingAd!;
  assert.deepEqual(session.dispatch({ type: 'undo' }), { accepted: false, reason: 'ad-request-pending', events: [] });
  session.dispatch({ type: 'resolve-ad', request, outcome: 'failed' });
  assert.equal(session.getSnapshot().undoCredits, 0);
  session.dispatch({ type: 'request-undo' });
  const retry = session.getSnapshot().pendingAd!;
  assert.notEqual(retry.requestId, request.requestId);
  assert.deepEqual(session.dispatch({ type: 'resolve-ad', request, outcome: 'success' }), { accepted: false, reason: 'stale-ad-result', events: [] });
  session.dispatch({ type: 'resolve-ad', request: retry, outcome: 'success' });
  assert.deepEqual(session.dispatch({ type: 'resolve-ad', request: retry, outcome: 'success' }), { accepted: false, reason: 'stale-ad-result', events: [] });
  assert.equal(session.getSnapshot().undoCredits, 1);
  assert.deepEqual(session.dispatch({ type: 'request-undo' }), { accepted: false, reason: 'undo-credit-available', events: [] });
  session.dispatch({ type: 'undo' });
  const after = session.getSnapshot();
  assert.deepEqual(session.dispatch({ type: 'undo' }), { accepted: false, reason: 'no-undo-history', events: [] });
  assert.deepEqual(session.getSnapshot(), after);
});

test('undo reopens a completed level and restores a receive-only bottle', () => {
  const session = createGameSession(opening);
  for (const [from, to] of [['A', 'D'], ['C', 'A'], ['B', 'C'], ['B', 'D']] as const) session.dispatch({ type: 'pour', from, to });
  assert.equal(session.getSnapshot().phase, 'won');
  session.dispatch({ type: 'request-undo' });
  session.dispatch({ type: 'resolve-ad', request: session.getSnapshot().pendingAd!, outcome: 'success' });
  assert.equal(session.getSnapshot().phase, 'won');
  session.dispatch({ type: 'undo' });
  assert.equal(session.getSnapshot().phase, 'playing');
  assert.equal(session.getSnapshot().collected.length, 2);
  assert.equal(session.getSnapshot().moveCount, 3);
  assert.equal(session.dispatch({ type: 'pour', from: 'B', to: 'D' }).events.at(-1)?.type, 'won');

  const receiveOnly = createGameSession({
    ...opening,
    bottles: [...opening.bottles, { id: 'I', layers: ['honey', 'honey', 'honey'], receiveOnly: true }, { id: 'J', layers: ['honey'] }],
    upcomingTargets: ['honey'],
  });
  const before = receiveOnly.getSnapshot();
  receiveOnly.dispatch({ type: 'pour', from: 'J', to: 'I' });
  assert.equal(receiveOnly.getSnapshot().bottles.find(b => b.id === 'I')?.status, 'ready');
  receiveOnly.dispatch({ type: 'request-undo' });
  receiveOnly.dispatch({ type: 'resolve-ad', request: receiveOnly.getSnapshot().pendingAd!, outcome: 'success' });
  receiveOnly.dispatch({ type: 'undo' });
  assert.deepEqual(receiveOnly.getSnapshot().bottles, before.bottles);
});

test('unlocking the fourth slot after a pour survives undo without duplicating targets', () => {
  const session = createGameSession({
    ...opening,
    bottles: [...opening.bottles, { id: 'I', layers: ['honey', 'honey', 'honey', 'honey'] }],
    upcomingTargets: ['honey'],
  });
  session.dispatch({ type: 'pour', from: 'A', to: 'D' });
  session.dispatch({ type: 'request-fourth-slot' });
  session.dispatch({ type: 'resolve-ad', request: session.getSnapshot().pendingAd!, outcome: 'success' });
  assert.equal(session.getSnapshot().bottles.find(b => b.id === 'I')?.status, 'collected');
  session.dispatch({ type: 'request-undo' });
  session.dispatch({ type: 'resolve-ad', request: session.getSnapshot().pendingAd!, outcome: 'success' });
  session.dispatch({ type: 'undo' });
  const restored = session.getSnapshot();
  assert.equal(restored.moveCount, 0);
  assert.equal(restored.auxiliarySlot.unlocked, true);
  assert.equal(restored.bottles.find(b => b.id === 'I')?.status, 'collected');
  assert.equal(restored.collected.length, 1);
  assert.equal(restored.nextTarget, null);
  assert.equal(restored.requiredCollections, 4);
});

test('non-success undo ads and wrong reward callbacks never grant a chance', () => {
  const session = createGameSession(opening);
  session.dispatch({ type: 'pour', from: 'A', to: 'D' });
  const board = session.getSnapshot().bottles;
  for (const outcome of ['cancelled', 'failed', 'unavailable'] as const) {
    session.dispatch({ type: 'request-undo' });
    const request = session.getSnapshot().pendingAd!;
    assert.deepEqual(session.dispatch({ type: 'resolve-ad', request: { ...request, reward: 'empty-bottle' }, outcome: 'success' }), {
      accepted: false, reason: 'stale-ad-result', events: [],
    });
    assert.deepEqual(session.dispatch({ type: 'resolve-ad', request: { ...request, targetId: 'ad-1' }, outcome: 'success' }), {
      accepted: false, reason: 'stale-ad-result', events: [],
    });
    assert.equal(session.dispatch({ type: 'resolve-ad', request, outcome }).accepted, true);
    assert.equal(session.getSnapshot().undoCredits, 0);
    assert.deepEqual(session.getSnapshot().bottles, board);
    assert.equal(session.getSnapshot().bottles.find(b => b.id === 'ad-1')?.status, 'ad-locked');
  }
});

test('rapid repeated undo spends one chance and leaves earlier history available', () => {
  const session = createGameSession(opening);
  session.dispatch({ type: 'pour', from: 'A', to: 'D' });
  const afterFirst = session.getSnapshot();
  session.dispatch({ type: 'pour', from: 'C', to: 'A' });
  session.dispatch({ type: 'request-undo' });
  session.dispatch({ type: 'resolve-ad', request: session.getSnapshot().pendingAd!, outcome: 'success' });
  assert.equal(session.dispatch({ type: 'undo' }).accepted, true);
  const restored = session.getSnapshot();
  assert.deepEqual(restored.bottles, afterFirst.bottles);
  assert.equal(restored.canUndo, true);
  assert.equal(restored.undoCredits, 0);
  assert.deepEqual(session.dispatch({ type: 'undo' }), { accepted: false, reason: 'no-undo-credit', events: [] });
  assert.deepEqual(session.getSnapshot(), restored);
});

test('recovery export keeps full rule history and credits separate from the player snapshot', () => {
  const session = createGameSession({
    ...opening,
    bottles: [{ id: 'A', layers: ['moss', 'moss', 'coral', 'coral'], hiddenLayers: [1] }, ...opening.bottles.slice(1)],
  });
  assert.deepEqual(session.getSnapshot().bottles.find(b => b.id === 'A')?.layers, ['moss', null, 'coral', 'coral']);
  session.dispatch({ type: 'pour', from: 'A', to: 'D' });
  session.dispatch({ type: 'request-undo' });
  session.dispatch({ type: 'resolve-ad', request: session.getSnapshot().pendingAd!, outcome: 'success' });
  const recovery = session.getRecoveryState();
  assert.equal(recovery.version, 1);
  assert.equal(recovery.undoCredits, 1);
  assert.equal(recovery.history.length, 1);
  assert.deepEqual(recovery.history[0]?.bottles[0]?.layers[1], { color: 'moss', revealed: false });
  assert.equal(session.getSnapshot().undoCredits, 1);
  recovery.history[0]!.bottles[0]!.layers[1]!.color = 'invented';
  recovery.rules.bottles[0]!.layers[0]!.color = 'invented';
  assert.equal(session.getRecoveryState().history[0]?.bottles[0]?.layers[1]?.color, 'moss');
  session.dispatch({ type: 'undo' });
  assert.deepEqual(session.getSnapshot().bottles.find(b => b.id === 'A')?.layers, ['moss', null, 'coral', 'coral']);
});

test('a budgeted session search distinguishes a replayable solution from an unknown result without changing play', () => {
  const session = createGameSession(opening);
  const before = session.getRecoveryState();
  assert.deepEqual(session.findSolution(0), { status: 'unknown', moves: [], explored: 0 });
  const result = session.findSolution(5000);
  assert.equal(result.status, 'solved');
  if (result.status !== 'solved') return;
  const replay = createGameSession(opening);
  for (const [from, to] of result.moves) assert.equal(replay.dispatch({ type: 'pour', from, to }).accepted, true);
  assert.equal(replay.getSnapshot().phase, 'won');
  assert.deepEqual(session.getRecoveryState(), before);
});

test('exhaustive deadlock is unsolvable, while an insufficient budget remains unknown', () => {
  const deadlock = createGameSession(blockedLevel);
  const before = deadlock.getRecoveryState();
  assert.deepEqual(deadlock.findSolution(0), { status: 'unknown', moves: [], explored: 0 });
  assert.equal(deadlock.findSolution(10).status, 'unsolvable');
  assert.deepEqual(deadlock.getRecoveryState(), before);
  assert.equal(createGameSession(opening).findSolution(1).status, 'unknown');
  assert.throws(() => deadlock.findSolution(-1), RangeError);
});

test('search obeys receive-only and collected positions through the real session rules', () => {
  const level = {
    id: 'restricted-search', title: 'Limited transfer', targets: ['moss', 'coral', 'blue'],
    bottles: [
      { id: 'A', layers: ['moss', 'moss', 'moss', 'moss'] },
      { id: 'B', layers: ['coral', 'coral', 'coral', 'coral'] },
      { id: 'I', layers: ['blue', 'blue', 'blue'], receiveOnly: true },
      { id: 'J', layers: ['blue'] },
    ],
  };
  const session = createGameSession(level);
  const before = session.getRecoveryState();
  const result = session.findSolution(20);
  assert.equal(result.status, 'solved');
  assert.deepEqual(result.moves, [['J', 'I']]);
  assert.deepEqual(session.getRecoveryState(), before);
  assert.deepEqual(session.getSnapshot().bottles.slice(0, 2).map(b => b.status), ['collected', 'collected']);
});

test('all authored witnesses are revalidated from fixed input and a suffix works after progress', async () => {
  const { BASIC_LEVELS } = await import('../src/levels.ts');
  for (const level of BASIC_LEVELS) {
    assert.equal(level.version, 1);
    assert.equal(level.seed, null);
    const session = createGameSession(level.definition);
    const original = session.getRecoveryState();
    const result = session.findSolution(0, level.solution);
    assert.equal(result.status, 'solved', level.definition.id);
    assert.deepEqual(result.moves, level.solution, level.definition.id);
    assert.deepEqual(session.getRecoveryState(), original);
    const [from, to] = level.solution[0]!;
    session.dispatch({ type: 'pour', from, to });
    assert.equal(session.findSolution(0, level.solution.slice(1)).status, 'solved', level.definition.id);
  }
  assert.equal(createGameSession(BASIC_LEVELS[0]!.definition).findSolution(0, [['A', 'B']]).status, 'unknown');
});

test('a hint reveals only a visible, executable step and labels its confidence honestly', async () => {
  const { BASIC_LEVELS } = await import('../src/levels.ts');
  const first = BASIC_LEVELS[0]!;
  const session = createGameSession(first.definition);
  const before = session.getRecoveryState();
  assert.deepEqual(session.getHint(0, first.solution), {
    status: 'step', from: 'A', to: 'D', color: 'coral', basis: 'verified-route', reason: 'empty-target',
  });
  assert.deepEqual(session.getRecoveryState(), before);
  assert.deepEqual(session.getHint(0, [['A', 'B']]), { status: 'unavailable', reason: 'budget-exhausted' });
  const hidden = BASIC_LEVELS.find(level => level.definition.id === 'S06')!;
  const concealed = createGameSession(hidden.definition);
  assert.deepEqual(concealed.getHint(0, hidden.solution), {
    status: 'step', from: 'A', to: 'D', color: 'coral', basis: 'legal-only', reason: 'empty-target',
  });
  assert.deepEqual(concealed.getSnapshot().bottles[0]?.layers, ['moss', null, 'coral', 'coral']);
});

test('candidate checks include already unlocked auxiliary slots and ad bottles without consuming rights', async () => {
  const { BASIC_LEVELS } = await import('../src/levels.ts');
  const level = BASIC_LEVELS.find(candidate => candidate.definition.id === 'S05')!;
  const session = createGameSession(level.definition);
  session.dispatch({ type: 'request-ad-bottle', bottleId: 'ad-1' });
  session.dispatch({ type: 'resolve-ad', request: session.getSnapshot().pendingAd!, outcome: 'success' });
  session.dispatch({ type: 'request-fourth-slot' });
  session.dispatch({ type: 'resolve-ad', request: session.getSnapshot().pendingAd!, outcome: 'success' });
  const before = session.getRecoveryState();
  const result = session.findSolution(0, level.solution);
  assert.equal(result.status, 'solved');
  assert.deepEqual(session.getRecoveryState(), before);
  assert.equal(session.getSnapshot().bottles.find(b => b.id === 'ad-1')?.status, 'available');
  assert.equal(session.getSnapshot().auxiliarySlot.unlocked, true);
  session.dispatch({ type: 'pour', from: 'B', to: 'A' });
  session.dispatch({ type: 'request-undo' });
  const pending = session.getRecoveryState();
  assert.deepEqual(session.findSolution(100), { status: 'unknown', moves: [], explored: 0 });
  assert.deepEqual(session.getRecoveryState(), pending);
});

test('a deadlocked session offers no false executable hint', () => {
  const session = createGameSession(blockedLevel);
  assert.deepEqual(session.getHint(0), { status: 'unavailable', reason: 'budget-exhausted' });
  assert.deepEqual(session.getHint(10), { status: 'unavailable', reason: 'unsolvable' });
});

test('a proposed within-bottle reorder is checked from the current mid-game state without committing it', () => {
  const level = {
    ...opening,
    bottles: [...opening.bottles, { id: 'F', layers: ['honey', 'violet'] }, { id: 'G', layers: ['honey', 'honey', 'honey'] }, { id: 'H', layers: ['violet', 'violet', 'violet'] }],
    upcomingTargets: ['honey', 'violet'],
  };
  const session = createGameSession(level);
  session.dispatch({ type: 'pour', from: 'A', to: 'D' });
  session.dispatch({ type: 'request-ad-bottle', bottleId: 'ad-1' });
  session.dispatch({ type: 'resolve-ad', request: session.getSnapshot().pendingAd!, outcome: 'success' });
  const before = session.getRecoveryState();
  const result = session.checkReorderCandidate(300, [{ bottleId: 'F', layers: [
    { color: 'violet', revealed: true }, { color: 'honey', revealed: true },
  ] }]);
  assert.equal(result.status, 'solved');
  assert.deepEqual(session.getRecoveryState(), before);
  assert.deepEqual(session.checkReorderCandidate(0, [{ bottleId: 'F', layers: [
    { color: 'violet', revealed: true }, { color: 'honey', revealed: true },
  ] }]).status, 'unknown');
  assert.deepEqual(session.checkReorderCandidate(300, [{ bottleId: 'A', layers: [
    { color: 'moss', revealed: true }, { color: 'moss', revealed: true },
  ] }]).status, 'invalid');
  assert.equal(session.checkReorderCandidate(300, [{ bottleId: 'B', layers: before.rules.bottles.find(b => b.id === 'B')!.layers }]).status, 'invalid');
  assert.deepEqual(session.checkReorderCandidate(300, [{ bottleId: 'F', layers: [
    { color: 'moss', revealed: true }, { color: 'honey', revealed: true },
  ] }]).status, 'invalid');
  assert.equal(session.checkReorderCandidate(300, [{ bottleId: 'F', layers: before.rules.bottles.find(b => b.id === 'F')!.layers }]).status, 'invalid');
  assert.deepEqual(session.getRecoveryState(), before);
});
