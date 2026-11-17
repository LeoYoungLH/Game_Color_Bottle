import './style.css';
import { hydrateIcons } from './icons.ts';
import { createGameSession, isAdOutcome, type ActionResult, type PlayerAction, type RejectionReason } from './game-session.ts';
import { BASIC_LEVELS, type AuthoredLevel } from './levels.ts';
import { colorName, renderGame, renderHome } from './view.ts';

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('Application root is missing.');
const app = root;

const reasons: Record<RejectionReason, string> = {
  'unknown-bottle': '没有找到这个瓶子，请重新选择。',
  'empty-source': '这是一只空瓶。先选有颜色的瓶子，再选它接水。',
  'same-bottle': '请选择另一只瓶子接水。',
  'locked-bottle': '这个广告空瓶尚未解锁，请使用其他空瓶。',
  'sealed-bottle': '封签还未开启。先收取足够数量的满瓶。',
  'receive-only-source': '定色瓶只能接水，装满同色后才会解除固定。',
  'full-target': '目标瓶已经装满，请换一只瓶子。',
  'different-color': '顶层颜色不同，暂时不能倒入。',
  'completed-source': '这瓶已经装好，正在等待匹配的收集槽。',
  'collected-bottle': '这瓶已经收取，留下的位置不能再接水。',
  'level-complete': '这一关已经完成，可以回到关卡或再玩一次。',
  'not-ad-bottle': '请选择一个尚未解锁的广告空瓶。',
  'ad-already-unlocked': '这只广告空瓶已经解锁。',
  'ad-request-pending': '请先完成或关闭当前模拟广告。',
  'stale-ad-result': '这次模拟广告结果已过期，局面没有变化。',
};

let current: { level: AuthoredLevel; session: ReturnType<typeof createGameSession> } | null = null;
let screen: 'home' | 'game' = 'home';
let notice = '';
let confirmRestart = false;
let audioContext: AudioContext | null = null;

function playFeedback(result: ActionResult): void {
  if (!result.accepted || !result.events.some(event => event.type === 'poured')) return;
  const settings = current?.session.getSnapshot().feedback;
  if (settings?.vibration) {
    try { navigator.vibrate?.(result.events.some(event => event.type === 'won') ? 55 : 20); }
    catch { /* Some devices reject vibration; the game state still renders. */ }
  }
  if (!settings?.sound || !window.AudioContext) return;
  try {
    audioContext ??= new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const now = audioContext.currentTime;
    oscillator.type = 'sine';
    oscillator.frequency.value = result.events.some(event => event.type === 'collected') ? 660 : 440;
    gain.gain.setValueAtTime(0.045, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.14);
  } catch { /* Visual feedback remains available when audio is blocked. */ }
}

function nextLevelAfter(level: AuthoredLevel): AuthoredLevel | null {
  return BASIC_LEVELS[BASIC_LEVELS.indexOf(level) + 1] ?? null;
}

function resultMessage(result: ActionResult): string {
  if (!result.accepted) return reasons[result.reason];
  const requested = result.events.find(event => event.type === 'ad-requested');
  if (requested) return `正在模拟解锁 ${requested.request.bottleId}。`;
  const adResult = result.events.find(event => event.type === 'ad-result');
  if (adResult) {
    if (adResult.outcome === 'success') return `广告空瓶 ${adResult.bottleId} 已解锁。`;
    const message = { cancelled: '模拟广告已提前关闭', failed: '模拟广告加载失败', unavailable: '当前没有可用的模拟广告' }[adResult.outcome];
    return `${message}，瓶位未改变。`;
  }
  const receipts = result.events.filter(event => event.type === 'collected');
  if (result.events.some(event => event.type === 'won')) return '所有颜色已经收取，这一关完成了。';
  const released = result.events.filter(event => event.type === 'released');
  if (released.length) return `${released.map(event => `定色瓶 ${event.bottleId} 已解除固定`).join('、')}。${receipts.length ? `已收取${receipts.map(event => colorName(event.color)).join('、')}。` : '单色满瓶等待匹配目标。'}`;
  const unsealed = result.events.filter(event => event.type === 'unsealed');
  if (unsealed.length) return `${unsealed.map(event => `封签瓶 ${event.bottleId} 已开启`).join('、')}。${receipts.length ? `已收取${receipts.map(event => colorName(event.color)).join('、')}。` : ''}`;
  if (receipts.length) return `已收取${receipts.map(event => colorName(event.color)).join('、')}。空出的位置会保留。`;
  const revealed = result.events.find(event => event.type === 'revealed');
  if (revealed) return `${revealed.bottleId} 的新顶层显露为${colorName(revealed.color)}。`;
  const poured = result.events.find(event => event.type === 'poured');
  if (poured) return `已从 ${poured.from} 向 ${poured.to} 倒入 ${poured.units} 层。`;
  const selection = result.events.find(event => event.type === 'selection-changed');
  return selection?.bottleId ? `已选中 ${selection.bottleId}，请选择空瓶或顶层同色的目标。` : '已取消选择。再选一瓶，慢慢来。';
}

function render(): void {
  const focused = document.activeElement instanceof HTMLElement ? document.activeElement.dataset.focusKey : undefined;
  if (screen === 'home') {
    const active = current?.session.getSnapshot();
    app.innerHTML = renderHome(active?.phase === 'playing' && current ? { title: current.level.definition.title, moves: active.moveCount } : null);
  } else if (current) {
    const nextLevel = nextLevelAfter(current.level);
    app.innerHTML = renderGame(current.level, current.session.getSnapshot(), notice, confirmRestart, nextLevel);
  }
  hydrateIcons(app);
  const dialog = app.querySelector<HTMLDialogElement>('dialog');
  if (dialog) dialog.showModal();
  else if (focused) app.querySelector<HTMLButtonElement>(`[data-focus-key="${CSS.escape(focused)}"]`)?.focus({ preventScroll: true });
}

function start(level: AuthoredLevel): void {
  current = { level, session: createGameSession(level.definition) };
  screen = 'game';
  confirmRestart = false;
  notice = level.lesson;
  render();
  window.scrollTo({ top: 0 });
}

function dispatch(action: PlayerAction): void {
  if (!current) return;
  const result = current.session.dispatch(action);
  notice = resultMessage(result);
  playFeedback(result);
  render();
}

app.addEventListener('click', event => {
  const button = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-action], [data-level], [data-bottle], [data-feedback]') : null;
  if (!button || !app.contains(button)) return;
  event.preventDefault();
  const pending = current?.session.getSnapshot().pendingAd;
  if (pending) {
    const outcome = button.dataset.outcome;
    if (button.dataset.action === 'ad-result' && isAdOutcome(outcome)) {
      dispatch({ type: 'resolve-ad', request: pending, outcome });
    }
    return;
  }
  if (button.dataset.level) {
    const level = BASIC_LEVELS.find(candidate => candidate.definition.id === button.dataset.level);
    if (level) start(level);
    return;
  }
  if (button.dataset.bottle) {
    const bottleId = button.dataset.bottle;
    const bottle = current?.session.getSnapshot().bottles.find(candidate => candidate.id === bottleId);
    dispatch(bottle?.status === 'ad-locked' ? { type: 'request-ad-bottle', bottleId } : { type: 'select-bottle', bottleId });
    return;
  }
  if (button.dataset.feedback === 'sound' || button.dataset.feedback === 'vibration') {
    const kind = button.dataset.feedback;
    const enabled = !current?.session.getSnapshot().feedback[kind];
    current?.session.dispatch({ type: 'set-feedback', kind, enabled });
    notice = `${kind === 'sound' ? '声音' : '震动'}已${enabled ? '开启' : '关闭'}。`;
    render();
    return;
  }
  switch (button.dataset.action) {
    case 'home': screen = 'home'; confirmRestart = false; render(); window.scrollTo({ top: 0 }); break;
    case 'continue': if (current) { screen = 'game'; render(); } break;
    case 'next': {
      if (!current || current.session.getSnapshot().phase !== 'won') break;
      const next = nextLevelAfter(current.level);
      if (next) start(next);
      break;
    }
    case 'cancel': dispatch({ type: 'cancel-selection' }); break;
    case 'restart': confirmRestart = true; render(); break;
    case 'replay': if (current) start(current.level); break;
    case 'keep-playing': confirmRestart = false; render(); break;
  }
});

app.addEventListener('cancel', event => {
  event.preventDefault();
  const pending = current?.session.getSnapshot().pendingAd;
  if (pending) { dispatch({ type: 'resolve-ad', request: pending, outcome: 'cancelled' }); return; }
  if (confirmRestart) { confirmRestart = false; render(); }
}, true);

render();
