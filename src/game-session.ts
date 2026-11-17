export const BOTTLE_CAPACITY = 4;

export interface BottleDefinition {
  readonly id: string;
  /** Colours are ordered from bottom to top. */
  readonly layers: readonly string[];
}

export interface LevelDefinition {
  readonly id: string;
  readonly title: string;
  readonly bottles: readonly BottleDefinition[];
  readonly targets: readonly string[];
  readonly upcomingTargets?: readonly string[];
}

export type BottleStatus = 'available' | 'ready' | 'collected' | 'ad-locked';

export interface BottleView extends BottleDefinition {
  readonly status: BottleStatus;
}

export interface CollectionReceipt {
  readonly bottleId: string;
  readonly color: string;
  readonly units: number;
  readonly slotId: string;
}

export interface SessionSnapshot {
  readonly sessionId: string;
  readonly levelId: string;
  readonly phase: 'playing' | 'won';
  readonly bottles: readonly BottleView[];
  readonly targets: readonly { readonly id: string; readonly color: string | null; readonly fulfilled: boolean }[];
  readonly nextTarget: string | null;
  readonly collected: readonly CollectionReceipt[];
  readonly requiredCollections: number;
  readonly moveCount: number;
  readonly selectedBottleId: string | null;
}

export type PlayerAction =
  | { readonly type: 'pour'; readonly from: string; readonly to: string }
  | { readonly type: 'select-bottle'; readonly bottleId: string }
  | { readonly type: 'cancel-selection' };
export type RejectionReason = 'unknown-bottle' | 'empty-source' | 'same-bottle' | 'locked-bottle' | 'full-target' | 'different-color' | 'completed-source' | 'collected-bottle' | 'level-complete';
export type GameEvent =
  | { readonly type: 'poured'; readonly from: string; readonly to: string; readonly units: number }
  | ({ readonly type: 'collected' } & CollectionReceipt)
  | { readonly type: 'won'; readonly levelId: string }
  | { readonly type: 'selection-changed'; readonly bottleId: string | null };
export type ActionResult =
  | { readonly accepted: true; readonly events: readonly GameEvent[] }
  | { readonly accepted: false; readonly reason: RejectionReason; readonly events: readonly [] };

function validateLevel(level: LevelDefinition): void {
  if (!level.id.trim() || !level.title.trim()) throw new Error('Invalid level: identity and title are required.');
  if (level.bottles.length < 1 || level.bottles.length > 22) throw new Error('Invalid level: total bottle positions must fit within 24, including two ad positions.');
  const ids = new Set<string>();
  const inventory = new Map<string, number>();
  for (const bottle of level.bottles) {
    if (!bottle.id.trim() || ids.has(bottle.id)) throw new Error('Invalid level: bottle IDs must be non-empty and unique.');
    if (bottle.id === 'ad-1' || bottle.id === 'ad-2') throw new Error('Invalid level: ad bottle IDs are reserved.');
    ids.add(bottle.id);
    if (bottle.layers.length > BOTTLE_CAPACITY) throw new Error('Invalid level: bottle capacity exceeded.');
    for (const color of bottle.layers) {
      if (typeof color !== 'string' || !color.trim()) throw new Error('Invalid level: colour IDs must be non-empty strings.');
      inventory.set(color, (inventory.get(color) ?? 0) + 1);
    }
  }
  if (!inventory.size || [...inventory.values()].some(units => units % BOTTLE_CAPACITY !== 0)) {
    throw new Error('Invalid level: each colour inventory must consist of complete bottles.');
  }
  if (level.targets.length !== 3 || level.targets.some(color => typeof color !== 'string' || !color.trim())) {
    throw new Error('Invalid level: exactly three current colour targets are required.');
  }
  const demand = new Map<string, number>();
  for (const color of [...level.targets, ...(level.upcomingTargets ?? [])]) {
    if (typeof color !== 'string' || !color.trim()) throw new Error('Invalid level: target inventory contains an invalid colour.');
    demand.set(color, (demand.get(color) ?? 0) + 1);
  }
  if (demand.size !== inventory.size || [...inventory].some(([color, units]) => demand.get(color) !== units / BOTTLE_CAPACITY)) {
    throw new Error('Invalid level: target inventory must match bottle colour inventory.');
  }
}

export function createGameSession(level: LevelDefinition) {
  validateLevel(level);
  const sessionId = crypto.randomUUID();
  const levelId = level.id;
  const requiredCollections = level.bottles.reduce((count, b) => count + b.layers.length, 0) / BOTTLE_CAPACITY;
  const bottles: { id: string; layers: string[]; status: BottleStatus }[] = [
    ...level.bottles.map(b => ({ id: b.id, layers: [...b.layers], status: 'available' as const })),
    { id: 'ad-1', layers: [], status: 'ad-locked' },
    { id: 'ad-2', layers: [], status: 'ad-locked' },
  ];
  const targets: { id: string; color: string | null; fulfilled: boolean }[] = level.targets.map((color, index) => ({ id: `slot-${index + 1}`, color, fulfilled: false }));
  const upcomingTargets = [...(level.upcomingTargets ?? [])];
  let nextTargetIndex = 0;
  const collected: CollectionReceipt[] = [];
  let moveCount = 0;
  let phase: SessionSnapshot['phase'] = 'playing';
  let selectedBottleId: string | null = null;

  function getSnapshot(): SessionSnapshot {
    return structuredClone({
      sessionId, levelId, phase, bottles, targets,
      nextTarget: upcomingTargets[nextTargetIndex] ?? null,
      collected, requiredCollections,
      moveCount, selectedBottleId,
    });
  }

  function collectMatchingBottles(events: GameEvent[]): void {
    // Rescan in bottle order after each refill so a waiting full bottle can chain immediately.
    let matched: boolean;
    do {
      matched = false;
      for (const bottle of bottles) {
        if (bottle.status === 'ad-locked' || bottle.status === 'collected') continue;
        const color = bottle.layers[0];
        if (!color || bottle.layers.length !== BOTTLE_CAPACITY || !bottle.layers.every(layer => layer === color)) continue;
        bottle.status = 'ready';
        const target = targets.find(slot => !slot.fulfilled && slot.color === color);
        if (!target) continue;
        const receipt = { bottleId: bottle.id, color, units: BOTTLE_CAPACITY, slotId: target.id };
        bottle.layers = [];
        bottle.status = 'collected';
        target.color = nextTargetIndex < upcomingTargets.length ? upcomingTargets[nextTargetIndex++]! : null;
        target.fulfilled = target.color === null;
        collected.push(receipt);
        events.push({ type: 'collected', ...receipt });
        matched = true;
        break;
      }
    } while (matched);
    if (phase !== 'won' && collected.length === requiredCollections && nextTargetIndex >= upcomingTargets.length && targets.every(t => t.fulfilled)
      && bottles.every(b => b.layers.length === 0)) {
      phase = 'won';
      events.push({ type: 'won', levelId });
    }
  }

  function dispatch(action: PlayerAction): ActionResult {
    if (phase === 'won') return { accepted: false, reason: 'level-complete', events: [] };
    if (action.type === 'cancel-selection') {
      selectedBottleId = null;
      return { accepted: true, events: [{ type: 'selection-changed', bottleId: null }] };
    }
    if (action.type === 'select-bottle') {
      if (selectedBottleId === action.bottleId) return dispatch({ type: 'cancel-selection' });
      if (selectedBottleId) return dispatch({ type: 'pour', from: selectedBottleId, to: action.bottleId });
      const bottle = bottles.find(b => b.id === action.bottleId);
      if (!bottle) return { accepted: false, reason: 'unknown-bottle', events: [] };
      if (bottle.status === 'ad-locked') return { accepted: false, reason: 'locked-bottle', events: [] };
      if (bottle.status === 'collected') return { accepted: false, reason: 'collected-bottle', events: [] };
      if (bottle.status === 'ready') return { accepted: false, reason: 'completed-source', events: [] };
      if (!bottle.layers.length) return { accepted: false, reason: 'empty-source', events: [] };
      selectedBottleId = bottle.id;
      return { accepted: true, events: [{ type: 'selection-changed', bottleId: bottle.id }] };
    }
    const source = bottles.find(b => b.id === action.from);
    const target = bottles.find(b => b.id === action.to);
    if (!source || !target) return { accepted: false, reason: 'unknown-bottle', events: [] };
    if (source === target) return { accepted: false, reason: 'same-bottle', events: [] };
    if (source.status === 'ad-locked' || target.status === 'ad-locked') return { accepted: false, reason: 'locked-bottle', events: [] };
    if (source.status === 'collected' || target.status === 'collected') return { accepted: false, reason: 'collected-bottle', events: [] };
    if (source.status === 'ready') return { accepted: false, reason: 'completed-source', events: [] };
    const color = source.layers.at(-1);
    if (!color) return { accepted: false, reason: 'empty-source', events: [] };
    if (target.layers.length === BOTTLE_CAPACITY) return { accepted: false, reason: 'full-target', events: [] };
    if (target.layers.length && target.layers.at(-1) !== color) return { accepted: false, reason: 'different-color', events: [] };
    let segment = 0;
    for (let index = source.layers.length - 1; index >= 0 && source.layers[index] === color; index--) segment++;
    const units = Math.min(segment, BOTTLE_CAPACITY - target.layers.length);
    target.layers.push(...source.layers.splice(source.layers.length - units, units));
    moveCount++;
    selectedBottleId = null;
    const events: GameEvent[] = [{ type: 'poured', from: source.id, to: target.id, units }];
    collectMatchingBottles(events);
    return { accepted: true, events };
  }

  collectMatchingBottles([]);
  return { getSnapshot, dispatch };
}
