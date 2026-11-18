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
  readonly sealThreshold?: number;
  readonly receiveOnly?: boolean;
}

export interface LevelDefinition {
  readonly id: string;
  readonly title: string;
  readonly bottles: readonly BottleDefinition[];
  readonly targets: readonly string[];
  readonly upcomingTargets?: readonly string[];
}

export type BottleStatus = 'available' | 'ready' | 'collected' | 'ad-locked' | 'sealed' | 'receive-only';

export interface BottleView {
  readonly id: string;
  readonly layers: readonly (string | null)[];
  readonly status: BottleStatus;
  readonly sealThreshold?: number;
  readonly receiveOnly?: boolean;
}

interface LayerState {
  color: string;
  revealed: boolean;
}

function colorOrder(layers: readonly LayerState[]): string {
  return JSON.stringify(layers.map(layer => layer.color));
}

export interface CollectionReceipt {
  readonly bottleId: string;
  readonly color: string;
  readonly units: number;
  readonly slotId: string;
}

export interface AdRewardRequest {
  readonly reward: 'empty-bottle' | 'fourth-slot' | 'undo' | 'shuffle';
  readonly targetId: string;
  readonly levelId: string;
  readonly sessionId: string;
  readonly requestId: string;
}

export const AD_OUTCOMES = ['success', 'cancelled', 'failed', 'unavailable'] as const;
export type AdOutcome = (typeof AD_OUTCOMES)[number];

export function isAdOutcome(value: unknown): value is AdOutcome {
  return AD_OUTCOMES.some(outcome => outcome === value);
}

export interface SessionSnapshot {
  readonly sessionId: string;
  readonly levelId: string;
  readonly phase: 'playing' | 'won';
  readonly bottles: readonly BottleView[];
  readonly targets: readonly { readonly id: string; readonly color: string | null; readonly fulfilled: boolean }[];
  readonly auxiliarySlot: { readonly id: 'slot-4'; readonly unlocked: boolean; readonly color: string | null; readonly fulfilled: boolean };
  readonly nextTarget: string | null;
  readonly collected: readonly CollectionReceipt[];
  readonly requiredCollections: number;
  readonly moveCount: number;
  readonly selectedBottleId: string | null;
  readonly feedback: Readonly<Record<FeedbackKind, boolean>>;
  readonly pendingAd: AdRewardRequest | null;
  readonly undoCredits: number;
  readonly canUndo: boolean;
  readonly shuffleCredits: number;
  readonly canShuffle: boolean;
}

export type FeedbackKind = 'sound' | 'vibration';
export type PlayerAction =
  | { readonly type: 'pour'; readonly from: string; readonly to: string }
  | { readonly type: 'select-bottle'; readonly bottleId: string }
  | { readonly type: 'cancel-selection' }
  | { readonly type: 'set-feedback'; readonly kind: FeedbackKind; readonly enabled: boolean }
  | { readonly type: 'request-ad-bottle'; readonly bottleId: string }
  | { readonly type: 'request-fourth-slot' }
  | { readonly type: 'request-undo' }
  | { readonly type: 'undo' }
  | { readonly type: 'request-shuffle' }
  | { readonly type: 'shuffle'; readonly nodeBudget?: number }
  | { readonly type: 'resolve-ad'; readonly request: Readonly<Record<keyof AdRewardRequest, string>>; readonly outcome: AdOutcome };
export type RejectionReason = 'unknown-bottle' | 'empty-source' | 'same-bottle' | 'locked-bottle' | 'sealed-bottle' | 'receive-only-source' | 'full-target' | 'different-color' | 'completed-source' | 'collected-bottle' | 'level-complete' | 'not-ad-bottle' | 'ad-already-unlocked' | 'ad-request-pending' | 'stale-ad-result' | 'no-pending-target' | 'slot-already-unlocked' | 'no-undo-history' | 'no-undo-credit' | 'undo-credit-available' | 'no-shuffle-candidate' | 'no-shuffle-credit' | 'shuffle-credit-available' | 'shuffle-unverified' | 'shuffle-unknown';
export type GameEvent =
  | { readonly type: 'poured'; readonly from: string; readonly to: string; readonly units: number }
  | { readonly type: 'revealed'; readonly bottleId: string; readonly color: string }
  | { readonly type: 'unsealed'; readonly bottleId: string; readonly threshold: number }
  | { readonly type: 'released'; readonly bottleId: string }
  | { readonly type: 'ad-requested'; readonly request: AdRewardRequest }
  | { readonly type: 'ad-result'; readonly reward: AdRewardRequest['reward']; readonly targetId: string; readonly outcome: AdOutcome }
  | { readonly type: 'ad-bottle-unlocked'; readonly bottleId: string }
  | { readonly type: 'ad-slot-unlocked'; readonly slotId: 'slot-4'; readonly color: string }
  | { readonly type: 'undo-credit-granted' }
  | { readonly type: 'undone' }
  | { readonly type: 'shuffle-credit-granted' }
  | { readonly type: 'shuffled'; readonly bottleIds: readonly string[] }
  | ({ readonly type: 'collected' } & CollectionReceipt)
  | { readonly type: 'won'; readonly levelId: string }
  | { readonly type: 'selection-changed'; readonly bottleId: string | null }
  | { readonly type: 'feedback-changed'; readonly kind: FeedbackKind; readonly enabled: boolean };
export type ActionResult =
  | { readonly accepted: true; readonly events: readonly GameEvent[] }
  | { readonly accepted: false; readonly reason: RejectionReason; readonly events: readonly [] };

export interface RuleCheckpoint {
  bottles: { id: string; layers: LayerState[]; status: BottleStatus; sealThreshold?: number; receiveOnly?: boolean }[];
  targets: { id: string; color: string | null; fulfilled: boolean }[];
  auxiliarySlot: { id: 'slot-4'; color: string | null; fulfilled: boolean; unlocked: boolean };
  nextTargetIndex: number;
  collected: CollectionReceipt[];
  moveCount: number;
  phase: SessionSnapshot['phase'];
}

export interface SessionRecoveryState {
  readonly version: 1;
  readonly sessionId: string;
  readonly levelId: string;
  readonly rules: RuleCheckpoint;
  readonly history: readonly RuleCheckpoint[];
  readonly undoCredits: number;
  readonly shuffleCredits: number;
  readonly pendingAd: AdRewardRequest | null;
  readonly selectedBottleId: string | null;
  readonly feedback: Readonly<Record<FeedbackKind, boolean>>;
}

export type PourStep = readonly [from: string, to: string];
export type SolutionResult =
  | { readonly status: 'solved'; readonly moves: readonly PourStep[]; readonly explored: number }
  | { readonly status: 'unsolvable' | 'unknown'; readonly moves: readonly []; readonly explored: number };
export type HintResult =
  | { readonly status: 'step'; readonly from: string; readonly to: string; readonly color: string; readonly basis: 'verified-route' | 'legal-only'; readonly reason: 'empty-target' | 'matching-top' }
  | { readonly status: 'unavailable'; readonly reason: 'complete' | 'ad-pending' | 'budget-exhausted' | 'unsolvable' };
export interface ReorderCandidate {
  readonly bottleId: string;
  readonly layers: readonly Readonly<LayerState>[];
}
export type CandidateResult = SolutionResult | { readonly status: 'invalid'; readonly reason: 'invalid-reorder' | 'no-change'; readonly moves: readonly []; readonly explored: 0 };

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
    if (bottle.sealThreshold !== undefined && (!Number.isInteger(bottle.sealThreshold) || bottle.sealThreshold <= 0 || !bottle.layers.length)) {
      throw new Error('Invalid level: sealed bottles need contents and a positive integer threshold.');
    }
    if (bottle.receiveOnly && (!bottle.layers.length || bottle.layers.length === BOTTLE_CAPACITY
      || bottle.layers.some(color => color !== bottle.layers[0]) || bottle.hiddenLayers?.length || bottle.sealThreshold !== undefined)) {
      throw new Error('Invalid level: receive-only bottles need known, partially filled single-colour contents without a seal.');
    }
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
  const totalCollections = [...inventory.values()].reduce((sum, units) => sum + units, 0) / BOTTLE_CAPACITY;
  if (level.bottles.some(b => b.sealThreshold !== undefined && b.sealThreshold >= totalCollections)) {
    throw new Error('Invalid level: seal threshold must precede the last required collection.');
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
  const bottles: { id: string; layers: LayerState[]; status: BottleStatus; sealThreshold?: number; receiveOnly?: boolean }[] = [
    ...level.bottles.map(b => ({ id: b.id, layers: b.layers.map((color, index) => ({ color, revealed: !b.hiddenLayers?.includes(index) })), status: b.sealThreshold !== undefined ? 'sealed' as const : b.receiveOnly ? 'receive-only' as const : 'available' as const, ...(b.sealThreshold === undefined ? {} : { sealThreshold: b.sealThreshold }), ...(b.receiveOnly ? { receiveOnly: true } : {}) })),
    ...AD_BOTTLE_IDS.map(id => ({ id, layers: [], status: 'ad-locked' as const })),
  ];
  const collectionOrder = [...bottles].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const targets: { id: string; color: string | null; fulfilled: boolean }[] = level.targets.map((color, index) => ({ id: `slot-${index + 1}`, color, fulfilled: false }));
  const auxiliarySlot: { id: 'slot-4'; color: string | null; fulfilled: boolean; unlocked: boolean } = { id: 'slot-4', color: null, fulfilled: false, unlocked: false };
  const upcomingTargets = [...(level.upcomingTargets ?? [])];
  let nextTargetIndex = 0;
  const collected: CollectionReceipt[] = [];
  let moveCount = 0;
  let phase: SessionSnapshot['phase'] = 'playing';
  let selectedBottleId: string | null = null;
  const feedback = { sound: false, vibration: false };
  let pendingAd: AdRewardRequest | null = null;
  let undoCredits = 0;
  let shuffleCredits = 0;
  const history: RuleCheckpoint[] = [];

  function captureRules(): RuleCheckpoint {
    return structuredClone({ bottles, targets, auxiliarySlot, nextTargetIndex, collected, moveCount, phase });
  }

  function applyRules(saved: RuleCheckpoint): void {
    const state = structuredClone(saved);
    for (let index = 0; index < bottles.length; index++) Object.assign(bottles[index]!, state.bottles[index]!);
    for (let index = 0; index < targets.length; index++) targets[index] = state.targets[index]!;
    Object.assign(auxiliarySlot, state.auxiliarySlot);
    nextTargetIndex = state.nextTargetIndex;
    collected.splice(0, collected.length, ...state.collected);
    moveCount = state.moveCount;
    phase = state.phase;
  }

  function restoreInspection(saved: RuleCheckpoint, historyLength: number, selection: string | null): void {
    applyRules(saved);
    history.length = historyLength;
    selectedBottleId = selection;
  }

  function restoreRules(saved: RuleCheckpoint): void {
    const unlockedBottles = AD_BOTTLE_IDS.filter(id => bottles.find(b => b.id === id)?.status !== 'ad-locked');
    const fourthUnlocked = auxiliarySlot.unlocked;
    applyRules(saved);
    for (const id of unlockedBottles) {
      const bottle = bottles.find(b => b.id === id)!;
      if (bottle.status === 'ad-locked') bottle.status = 'available';
    }
    if (fourthUnlocked && !auxiliarySlot.unlocked) {
      auxiliarySlot.unlocked = true;
      auxiliarySlot.color = upcomingTargets[nextTargetIndex++]!;
      collectMatchingBottles([]);
    }
    selectedBottleId = null;
  }

  function getSnapshot(): SessionSnapshot {
    return structuredClone({
      sessionId, levelId, phase,
      bottles: bottles.map(b => ({ id: b.id, layers: b.layers.map(layer => b.status === 'sealed' ? null : layer.revealed ? layer.color : null), status: b.status, ...(b.sealThreshold === undefined ? {} : { sealThreshold: b.sealThreshold }), ...(b.receiveOnly ? { receiveOnly: true } : {}) })),
      targets, auxiliarySlot,
      nextTarget: upcomingTargets[nextTargetIndex] ?? null,
      collected, requiredCollections,
      moveCount, selectedBottleId, feedback, pendingAd, undoCredits, canUndo: history.length > 0,
      shuffleCredits, canShuffle: phase === 'playing' && eligibleShuffleBottles().length > 0,
    });
  }

  function getRecoveryState(): SessionRecoveryState {
    return structuredClone({
      version: 1, sessionId, levelId, rules: captureRules(), history,
      undoCredits, shuffleCredits, pendingAd, selectedBottleId, feedback,
    });
  }

  function findSolution(nodeBudget: number, witness?: readonly PourStep[]): SolutionResult {
    if (!Number.isSafeInteger(nodeBudget) || nodeBudget < 0) throw new RangeError('Search budget must be a non-negative safe integer.');
    if (pendingAd) return { status: 'unknown', moves: [], explored: 0 };
    const start = captureRules();
    const originalHistoryLength = history.length;
    const originalSelection = selectedBottleId;
    if (witness) {
      let valid = true;
      try {
        for (const [from, to] of witness) {
          if (!dispatch({ type: 'pour', from, to }).accepted) { valid = false; break; }
        }
        valid &&= phase === 'won';
      } finally {
        restoreInspection(start, originalHistoryLength, originalSelection);
      }
      if (valid) return { status: 'solved', moves: witness.map(([from, to]) => [from, to]), explored: 0 };
    }
    const visited = new Set<string>();
    let explored = 0;
    let truncated = false;

    function visit(depth: number): PourStep[] | null {
      if (phase === 'won') return [];
      if (depth >= 256) { truncated = true; return null; }
      const key = JSON.stringify({
        bottles: bottles.map(b => [b.status, b.layers.map(l => l.color)]),
        targets, auxiliarySlot, nextTargetIndex, collectedCount: collected.length,
      });
      if (visited.has(key)) return null;
      if (explored >= nodeBudget) { truncated = true; return null; }
      visited.add(key);
      explored++;
      const parent = captureRules();
      const parentHistoryLength = history.length;
      for (const source of bottles) {
        if (source.status !== 'available' || !source.layers.length) continue;
        for (const target of bottles) {
          if (target === source || !['available', 'receive-only'].includes(target.status)) continue;
          const result = dispatch({ type: 'pour', from: source.id, to: target.id });
          if (!result.accepted) continue;
          const continuation = visit(depth + 1);
          applyRules(parent);
          history.length = parentHistoryLength;
          if (continuation) return [[source.id, target.id], ...continuation];
        }
      }
      return null;
    }

    try {
      const moves = visit(0);
      return moves ? { status: 'solved', moves, explored }
        : { status: truncated ? 'unknown' : 'unsolvable', moves: [], explored };
    } finally {
      restoreInspection(start, originalHistoryLength, originalSelection);
    }
  }

  function checkReorderCandidate(nodeBudget: number, reorders: readonly ReorderCandidate[]): CandidateResult {
    if (!Number.isSafeInteger(nodeBudget) || nodeBudget < 0) throw new RangeError('Search budget must be a non-negative safe integer.');
    if (pendingAd) return { status: 'unknown', moves: [], explored: 0 };
    if (phase === 'won' || !reorders.length) return { status: 'invalid', reason: 'invalid-reorder', moves: [], explored: 0 };
    const start = captureRules();
    const originalHistoryLength = history.length;
    const originalSelection = selectedBottleId;
    const touched = new Set<string>();
    let changed = false;
    try {
      for (const reorder of reorders) {
        const bottle = bottles.find(b => b.id === reorder.bottleId);
        if (!bottle || touched.has(reorder.bottleId) || bottle.status !== 'available'
          || bottle.layers.length < 2 || bottle.layers.length >= BOTTLE_CAPACITY
          || bottle.layers.every(layer => layer.color === bottle.layers[0]?.color)
          || !Array.isArray(reorder.layers) || reorder.layers.length !== bottle.layers.length
          || reorder.layers.some(layer => !layer || typeof layer.color !== 'string' || typeof layer.revealed !== 'boolean')) {
          return { status: 'invalid', reason: 'invalid-reorder', moves: [], explored: 0 };
        }
        touched.add(reorder.bottleId);
        const pairs = (layers: readonly LayerState[]) => layers.map(layer => JSON.stringify([layer.color, layer.revealed])).sort();
        if (JSON.stringify(pairs(bottle.layers)) !== JSON.stringify(pairs(reorder.layers))) {
          return { status: 'invalid', reason: 'invalid-reorder', moves: [], explored: 0 };
        }
        changed ||= colorOrder(bottle.layers) !== colorOrder(reorder.layers);
        bottle.layers = reorder.layers.map(layer => ({ color: layer.color, revealed: layer.revealed }));
        bottle.layers.at(-1)!.revealed = true;
      }
      if (!changed) return { status: 'invalid', reason: 'no-change', moves: [], explored: 0 };
      return findSolution(nodeBudget);
    } finally {
      restoreInspection(start, originalHistoryLength, originalSelection);
    }
  }

  function eligibleShuffleBottles() {
    return bottles.filter(b => b.status === 'available' && b.layers.length > 1 && b.layers.length < BOTTLE_CAPACITY
      && b.layers.some(layer => layer.color !== b.layers[0]?.color));
  }

  function shuffleCandidates(): ReorderCandidate[][] {
    const options = eligibleShuffleBottles().map(bottle => {
      const variants: ReorderCandidate[] = [];
      const seen = new Set<string>();
      for (let first = 0; first < bottle.layers.length; first++) {
        for (let second = first + 1; second < bottle.layers.length; second++) {
          const layers = structuredClone(bottle.layers);
          [layers[first], layers[second]] = [layers[second]!, layers[first]!];
          const key = JSON.stringify(layers);
          if (colorOrder(layers) !== colorOrder(bottle.layers) && !seen.has(key)) {
            seen.add(key);
            variants.push({ bottleId: bottle.id, layers });
          }
        }
      }
      if (bottle.layers.length === 3) {
        for (const offset of [1, 2]) {
          const layers = [...bottle.layers.slice(offset), ...bottle.layers.slice(0, offset)];
          const key = JSON.stringify(layers);
          if (colorOrder(layers) !== colorOrder(bottle.layers) && !seen.has(key)) {
            seen.add(key);
            variants.push({ bottleId: bottle.id, layers });
          }
        }
      }
      return variants;
    });
    const candidates: ReorderCandidate[][] = [];
    if (options.length > 1) candidates.push(options.map(variants => variants[0]!).filter(Boolean));
    for (const variants of options) for (const variant of variants) candidates.push([variant]);
    return candidates;
  }

  function useShuffle(nodeBudget: number): ActionResult {
    if (!Number.isSafeInteger(nodeBudget) || nodeBudget < 0) throw new RangeError('Search budget must be a non-negative safe integer.');
    if (!shuffleCredits) return { accepted: false, reason: 'no-shuffle-credit', events: [] };
    const candidates = shuffleCandidates();
    if (!candidates.length) return { accepted: false, reason: 'no-shuffle-candidate', events: [] };
    let remaining = nodeBudget;
    let uncertain = false;
    for (const candidate of candidates) {
      const result = checkReorderCandidate(remaining, candidate);
      remaining -= result.explored;
      if (result.status === 'solved') {
        for (const reorder of candidate) {
          const bottle = bottles.find(b => b.id === reorder.bottleId)!;
          bottle.layers = reorder.layers.map(layer => ({ color: layer.color, revealed: layer.revealed }));
          bottle.layers.at(-1)!.revealed = true;
        }
        history.length = 0;
        selectedBottleId = null;
        shuffleCredits--;
        return { accepted: true, events: [{ type: 'shuffled', bottleIds: candidate.map(item => item.bottleId) }] };
      }
      if (result.status === 'unknown') uncertain = true;
      if (!remaining) break;
    }
    return { accepted: false, reason: uncertain ? 'shuffle-unknown' : 'shuffle-unverified', events: [] };
  }

  function getHint(nodeBudget: number, witness?: readonly PourStep[]): HintResult {
    if (phase === 'won') return { status: 'unavailable', reason: 'complete' };
    if (pendingAd) return { status: 'unavailable', reason: 'ad-pending' };
    const result = findSolution(nodeBudget, witness);
    if (result.status !== 'solved') {
      return { status: 'unavailable', reason: result.status === 'unknown' ? 'budget-exhausted' : 'unsolvable' };
    }
    const [from, to] = result.moves[0] ?? [];
    const visible = getSnapshot();
    const source = visible.bottles.find(b => b.id === from);
    const target = visible.bottles.find(b => b.id === to);
    const color = source?.layers.at(-1);
    if (!from || !to || !target || !color) return { status: 'unavailable', reason: 'budget-exhausted' };
    const concealed = bottles.some(b => b.status === 'sealed' || b.layers.some(layer => !layer.revealed));
    return { status: 'step', from, to, color,
      basis: concealed ? 'legal-only' : 'verified-route',
      reason: target.layers.length ? 'matching-top' : 'empty-target' };
  }

  function collectMatchingBottles(events: GameEvent[]): void {
    // Rescan in bottle order after each refill so a waiting full bottle can chain immediately.
    let matched: boolean;
    do {
      matched = false;
      for (const bottle of collectionOrder) {
        if (bottle.status === 'ad-locked' || bottle.status === 'collected' || bottle.status === 'sealed' || bottle.status === 'receive-only') continue;
        const color = bottle.layers[0]?.color;
        if (!color || bottle.layers.length !== BOTTLE_CAPACITY || !bottle.layers.every(layer => layer.color === color)) continue;
        bottle.status = 'ready';
        const target = [...targets, ...(auxiliarySlot.unlocked ? [auxiliarySlot] : [])].find(slot => !slot.fulfilled && slot.color === color);
        if (!target) continue;
        const receipt = { bottleId: bottle.id, color, units: BOTTLE_CAPACITY, slotId: target.id };
        bottle.layers = [];
        bottle.status = 'collected';
        target.color = nextTargetIndex < upcomingTargets.length ? upcomingTargets[nextTargetIndex++]! : null;
        target.fulfilled = target.color === null;
        collected.push(receipt);
        events.push({ type: 'collected', ...receipt });
        for (const sealed of collectionOrder) {
          if (sealed.status !== 'sealed' || sealed.sealThreshold === undefined || collected.length < sealed.sealThreshold) continue;
          sealed.status = 'available';
          events.push({ type: 'unsealed', bottleId: sealed.id, threshold: sealed.sealThreshold });
        }
        matched = true;
        break;
      }
    } while (matched);
    if (phase !== 'won' && collected.length === requiredCollections && nextTargetIndex >= upcomingTargets.length && targets.every(t => t.fulfilled)
      && (!auxiliarySlot.unlocked || auxiliarySlot.fulfilled)
      && bottles.every(b => b.layers.length === 0)) {
      phase = 'won';
      events.push({ type: 'won', levelId });
    }
  }

  function dispatch(action: PlayerAction): ActionResult {
    if (action.type === 'resolve-ad') {
      const request = action.request;
      if (!isAdOutcome(action.outcome)) {
        return { accepted: false, reason: 'stale-ad-result', events: [] };
      }
      if (!pendingAd || request.reward !== pendingAd.reward || request.targetId !== pendingAd.targetId
        || request.levelId !== pendingAd.levelId || request.sessionId !== pendingAd.sessionId || request.requestId !== pendingAd.requestId) {
        return { accepted: false, reason: 'stale-ad-result', events: [] };
      }
      const resolved = pendingAd;
      pendingAd = null;
      const events: GameEvent[] = [{ type: 'ad-result', reward: resolved.reward, targetId: resolved.targetId, outcome: action.outcome }];
      if (action.outcome === 'success') {
        if (resolved.reward === 'empty-bottle') {
          const bottle = bottles.find(b => b.id === resolved.targetId)!;
          bottle.status = 'available';
          events.push({ type: 'ad-bottle-unlocked', bottleId: bottle.id });
        } else if (resolved.reward === 'fourth-slot') {
          auxiliarySlot.unlocked = true;
          auxiliarySlot.color = upcomingTargets[nextTargetIndex++]!;
          events.push({ type: 'ad-slot-unlocked', slotId: auxiliarySlot.id, color: auxiliarySlot.color });
          collectMatchingBottles(events);
        } else if (resolved.reward === 'undo') {
          undoCredits = 1;
          events.push({ type: 'undo-credit-granted' });
        } else {
          shuffleCredits = 1;
          events.push({ type: 'shuffle-credit-granted' });
        }
      }
      return { accepted: true, events };
    }
    if (pendingAd) return { accepted: false, reason: 'ad-request-pending', events: [] };
    if (action.type === 'request-shuffle') {
      if (phase === 'won') return { accepted: false, reason: 'level-complete', events: [] };
      if (shuffleCredits) return { accepted: false, reason: 'shuffle-credit-available', events: [] };
      if (!eligibleShuffleBottles().length) return { accepted: false, reason: 'no-shuffle-candidate', events: [] };
      pendingAd = { reward: 'shuffle', targetId: 'shuffle', levelId, sessionId, requestId: crypto.randomUUID() };
      return { accepted: true, events: [{ type: 'ad-requested', request: structuredClone(pendingAd) }] };
    }
    if (action.type === 'shuffle') {
      if (phase === 'won') return { accepted: false, reason: 'level-complete', events: [] };
      return useShuffle(action.nodeBudget ?? 800);
    }
    if (action.type === 'request-undo') {
      if (!history.length) return { accepted: false, reason: 'no-undo-history', events: [] };
      if (undoCredits) return { accepted: false, reason: 'undo-credit-available', events: [] };
      pendingAd = { reward: 'undo', targetId: 'undo', levelId, sessionId, requestId: crypto.randomUUID() };
      return { accepted: true, events: [{ type: 'ad-requested', request: structuredClone(pendingAd) }] };
    }
    if (action.type === 'undo') {
      if (!history.length) return { accepted: false, reason: 'no-undo-history', events: [] };
      if (!undoCredits) return { accepted: false, reason: 'no-undo-credit', events: [] };
      restoreRules(history.pop()!);
      undoCredits--;
      return { accepted: true, events: [{ type: 'undone' }] };
    }
    if (action.type === 'request-fourth-slot') {
      if (phase === 'won') return { accepted: false, reason: 'level-complete', events: [] };
      if (auxiliarySlot.unlocked) return { accepted: false, reason: 'slot-already-unlocked', events: [] };
      if (nextTargetIndex >= upcomingTargets.length) return { accepted: false, reason: 'no-pending-target', events: [] };
      pendingAd = { reward: 'fourth-slot', targetId: auxiliarySlot.id, levelId, sessionId, requestId: crypto.randomUUID() };
      return { accepted: true, events: [{ type: 'ad-requested', request: structuredClone(pendingAd) }] };
    }
    if (action.type === 'request-ad-bottle') {
      if (phase === 'won') return { accepted: false, reason: 'level-complete', events: [] };
      if (!isAdBottleId(action.bottleId)) return { accepted: false, reason: 'not-ad-bottle', events: [] };
      const bottle = bottles.find(b => b.id === action.bottleId)!;
      if (bottle.status !== 'ad-locked') return { accepted: false, reason: 'ad-already-unlocked', events: [] };
      pendingAd = { reward: 'empty-bottle', targetId: bottle.id, levelId, sessionId, requestId: crypto.randomUUID() };
      return { accepted: true, events: [{ type: 'ad-requested', request: structuredClone(pendingAd) }] };
    }
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
      if (bottle.status === 'sealed') return { accepted: false, reason: 'sealed-bottle', events: [] };
      if (bottle.status === 'receive-only') return { accepted: false, reason: 'receive-only-source', events: [] };
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
    if (source.status === 'sealed' || target.status === 'sealed') return { accepted: false, reason: 'sealed-bottle', events: [] };
    if (source.status === 'receive-only') return { accepted: false, reason: 'receive-only-source', events: [] };
    if (source.status === 'collected' || target.status === 'collected') return { accepted: false, reason: 'collected-bottle', events: [] };
    if (source.status === 'ready') return { accepted: false, reason: 'completed-source', events: [] };
    const color = source.layers.at(-1)?.color;
    if (!color) return { accepted: false, reason: 'empty-source', events: [] };
    if (target.layers.length === BOTTLE_CAPACITY) return { accepted: false, reason: 'full-target', events: [] };
    if (target.layers.length && target.layers.at(-1)?.color !== color) return { accepted: false, reason: 'different-color', events: [] };
    let segment = 0;
    for (let index = source.layers.length - 1; index >= 0 && source.layers[index]?.color === color; index--) segment++;
    const units = Math.min(segment, BOTTLE_CAPACITY - target.layers.length);
    history.push(captureRules());
    target.layers.push(...source.layers.splice(source.layers.length - units, units).map(layer => ({ color: layer.color, revealed: true })));
    moveCount++;
    selectedBottleId = null;
    const events: GameEvent[] = [{ type: 'poured', from: source.id, to: target.id, units }];
    const exposed = source.layers.at(-1);
    if (exposed && !exposed.revealed) {
      exposed.revealed = true;
      events.push({ type: 'revealed', bottleId: source.id, color: exposed.color });
    }
    if (target.status === 'receive-only' && target.layers.length === BOTTLE_CAPACITY && target.layers.every(layer => layer.color === color)) {
      target.status = 'available';
      events.push({ type: 'released', bottleId: target.id });
    }
    collectMatchingBottles(events);
    return { accepted: true, events };
  }

  collectMatchingBottles([]);
  return { getSnapshot, getRecoveryState, dispatch, findSolution, checkReorderCandidate, getHint };
}
