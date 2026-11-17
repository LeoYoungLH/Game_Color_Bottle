export const BOTTLE_CAPACITY = 4;
export const AD_BOTTLE_IDS = ['ad-1', 'ad-2'] as const;

export function isAdBottleId(id: string): boolean {
  return AD_BOTTLE_IDS.some(adId => adId === id);
}

export interface BottleDefinition {
  readonly id: string;
  /** Colours are ordered from bottom to top. */
  readonly layers: readonly string[];
  /** Zero-based positions from bottom to top that start concealed. */
  readonly hiddenLayers?: readonly number[];
}

export interface LevelDefinition {
  readonly id: string;
  readonly title: string;
  readonly bottles: readonly BottleDefinition[];
  readonly targets: readonly string[];
  readonly upcomingTargets?: readonly string[];
}

export type BottleStatus = 'available' | 'ready' | 'collected' | 'ad-locked';

export interface BottleView {
  readonly id: string;
  readonly layers: readonly (string | null)[];
  readonly status: BottleStatus;
}

interface LayerState {
  color: string;
  revealed: boolean;
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
  readonly feedback: Readonly<Record<FeedbackKind, boolean>>;
}

export type FeedbackKind = 'sound' | 'vibration';
export type PlayerAction =
  | { readonly type: 'pour'; readonly from: string; readonly to: string }
  | { readonly type: 'select-bottle'; readonly bottleId: string }
  | { readonly type: 'cancel-selection' }
  | { readonly type: 'set-feedback'; readonly kind: FeedbackKind; readonly enabled: boolean };
export type RejectionReason = 'unknown-bottle' | 'empty-source' | 'same-bottle' | 'locked-bottle' | 'full-target' | 'different-color' | 'completed-source' | 'collected-bottle' | 'level-complete';
export type GameEvent =
  | { readonly type: 'poured'; readonly from: string; readonly to: string; readonly units: number }
  | { readonly type: 'revealed'; readonly bottleId: string; readonly color: string }
  | ({ readonly type: 'collected' } & CollectionReceipt)
  | { readonly type: 'won'; readonly levelId: string }
  | { readonly type: 'selection-changed'; readonly bottleId: string | null }
  | { readonly type: 'feedback-changed'; readonly kind: FeedbackKind; readonly enabled: boolean };
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
    if (isAdBottleId(bottle.id)) throw new Error('Invalid level: ad bottle IDs are reserved.');
    ids.add(bottle.id);
    if (bottle.layers.length > BOTTLE_CAPACITY) throw new Error('Invalid level: bottle capacity exceeded.');
    const hidden = bottle.hiddenLayers ?? [];
    if (!Array.isArray(hidden) || hidden.some(index => !Number.isInteger(index) || index < 0 || index >= bottle.layers.length)
      || new Set(hidden).size !== hidden.length) throw new Error('Invalid level: hidden layer positions must be unique and within the bottle.');
    if (hidden.includes(bottle.layers.length - 1)) throw new Error('Invalid level: top layer must be visible at the start.');
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
  const bottles: { id: string; layers: LayerState[]; status: BottleStatus }[] = [
    ...level.bottles.map(b => ({ id: b.id, layers: b.layers.map((color, index) => ({ color, revealed: !b.hiddenLayers?.includes(index) })), status: 'available' as const })),
    ...AD_BOTTLE_IDS.map(id => ({ id, layers: [], status: 'ad-locked' as const })),
  ];
  const collectionOrder = [...bottles].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const targets: { id: string; color: string | null; fulfilled: boolean }[] = level.targets.map((color, index) => ({ id: `slot-${index + 1}`, color, fulfilled: false }));
  const upcomingTargets = [...(level.upcomingTargets ?? [])];
  let nextTargetIndex = 0;
  const collected: CollectionReceipt[] = [];
  let moveCount = 0;
  let phase: SessionSnapshot['phase'] = 'playing';
  let selectedBottleId: string | null = null;
  const feedback = { sound: false, vibration: false };

  function getSnapshot(): SessionSnapshot {
    return structuredClone({
      sessionId, levelId, phase,
      bottles: bottles.map(b => ({ id: b.id, layers: b.layers.map(layer => layer.revealed ? layer.color : null), status: b.status })),
      targets,
      nextTarget: upcomingTargets[nextTargetIndex] ?? null,
      collected, requiredCollections,
      moveCount, selectedBottleId, feedback,
    });
  }

  function collectMatchingBottles(events: GameEvent[]): void {
    // Rescan in bottle order after each refill so a waiting full bottle can chain immediately.
    let matched: boolean;
    do {
      matched = false;
      for (const bottle of collectionOrder) {
        if (bottle.status === 'ad-locked' || bottle.status === 'collected') continue;
        const color = bottle.layers[0]?.color;
        if (!color || bottle.layers.length !== BOTTLE_CAPACITY || !bottle.layers.every(layer => layer.color === color)) continue;
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
    if (action.type === 'set-feedback') {
      feedback[action.kind] = action.enabled;
      return { accepted: true, events: [{ type: 'feedback-changed', kind: action.kind, enabled: action.enabled }] };
    }
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
    const color = source.layers.at(-1)?.color;
    if (!color) return { accepted: false, reason: 'empty-source', events: [] };
    if (target.layers.length === BOTTLE_CAPACITY) return { accepted: false, reason: 'full-target', events: [] };
    if (target.layers.length && target.layers.at(-1)?.color !== color) return { accepted: false, reason: 'different-color', events: [] };
    let segment = 0;
    for (let index = source.layers.length - 1; index >= 0 && source.layers[index]?.color === color; index--) segment++;
    const units = Math.min(segment, BOTTLE_CAPACITY - target.layers.length);
    target.layers.push(...source.layers.splice(source.layers.length - units, units).map(layer => ({ color: layer.color, revealed: true })));
    moveCount++;
    selectedBottleId = null;
    const events: GameEvent[] = [{ type: 'poured', from: source.id, to: target.id, units }];
    const exposed = source.layers.at(-1);
    if (exposed && !exposed.revealed) {
      exposed.revealed = true;
      events.push({ type: 'revealed', bottleId: source.id, color: exposed.color });
    }
    collectMatchingBottles(events);
    return { accepted: true, events };
  }

  collectMatchingBottles([]);
  return { getSnapshot, dispatch };
}
