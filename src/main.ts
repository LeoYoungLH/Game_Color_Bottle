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
  'no-pending-target': '目前没有下一待分配目标，辅助收集槽暂时无法解锁。',
  'slot-already-unlocked': '辅助收集槽已经解锁。',
  'no-undo-history': '还没有可以撤回的倒水。',
  'no-undo-credit': '需要先看模拟广告取得一次撤回机会。',
  'undo-credit-available': '已有一次撤回机会，可以直接使用。',
  'no-shuffle-candidate': '当前没有可打乱的未满混色瓶，机会不会消耗。',
  'no-shuffle-credit': '需要先看模拟广告取得一次打乱机会。',
  'shuffle-credit-available': '已有一次打乱机会，可以直接使用。',
  'shuffle-unverified': '未找到可通关的有效重排，打乱机会已保留。',
  'shuffle-unknown': '搜索预算不足，暂不能确认重排可解；打乱机会已保留。',
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
  if (requested) return requested.request.reward === 'undo' ? '正在模拟获取一次撤回机会。'
    : requested.request.reward === 'shuffle' ? '正在模拟获取一次打乱机会。'
      : `正在模拟解锁 ${requested.request.reward === 'fourth-slot' ? '辅助收集槽' : requested.request.targetId}。`;
  const adResult = result.events.find(event => event.type === 'ad-result');
  if (adResult) {
    if (adResult.outcome === 'success') {
      if (adResult.reward === 'undo') return '已获得一次撤回机会，点击撤回才会使用。';
      if (adResult.reward === 'shuffle') return '已获得一次打乱机会，点击打乱才会使用。';
      const receipts = result.events.filter(event => event.type === 'collected');
      const target = adResult.reward === 'fourth-slot' ? '辅助收集槽' : `广告空瓶 ${adResult.targetId}`;
      return `${target}已解锁。${receipts.length ? `已收取${receipts.map(event => colorName(event.color)).join('、')}。` : ''}`;
    }
    const message = { cancelled: '模拟广告已提前关闭', failed: '模拟广告加载失败', unavailable: '当前没有可用的模拟广告' }[adResult.outcome];
    return `${message}，${adResult.reward === 'undo' ? '撤回机会与局面' : adResult.reward === 'shuffle' ? '打乱机会与局面' : adResult.reward === 'fourth-slot' ? '收集槽' : '瓶位'}未改变。`;
  }
  if (result.events.some(event => event.type === 'undone')) return '已撤回上一次倒水及其连锁结果。';
  const shuffled = result.events.find(event => event.type === 'shuffled');
  if (shuffled) return `已打乱 ${shuffled.bottleIds.join('、')} 的瓶内颜色；已验证仍有通关路线。`;
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
  const dialog = app.querySelector<HTMLDialogElement>('.ad-dialog') ?? app.querySelector<HTMLDialogElement>('dialog');
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
    case 'undo': dispatch({ type: current?.session.getSnapshot().undoCredits ? 'undo' : 'request-undo' }); break;
    case 'shuffle': dispatch({ type: current?.session.getSnapshot().shuffleCredits ? 'shuffle' : 'request-shuffle' }); break;
    case 'hint': {
      if (!current) break;
      const moveCount = current.session.getSnapshot().moveCount;
      const hint = current.session.getHint(800, current.level.solution.slice(moveCount));
      if (hint.status === 'step') {
        const reason = hint.reason === 'empty-target' ? `${hint.to} 是可接水的空瓶` : `${hint.to} 顶层同色且尚有空间`;
        const selected = current.session.getSnapshot().selectedBottleId;
        const action = selected === hint.from ? `已选中 ${hint.from}，直接点击 ${hint.to}`
          : selected ? `先取消 ${selected} 的选择，再点 ${hint.from}、${hint.to}` : `依次点击 ${hint.from}、${hint.to}`;
        notice = `提示：${action}，将${colorName(hint.color)}倒入目标；${reason}。${hint.basis === 'verified-route' ? '后续路线已经规则回放验证。' : '当前操作合法；尚有隐藏信息，不保证后续通关。'}`;
      } else {
        notice = {
          complete: '本关已完成，无需提示。',
          'ad-pending': '请先完成或关闭当前模拟广告。',
          'budget-exhausted': '当前搜索预算内无法提供可靠提示；可以继续探索、撤回或重开。',
          unsolvable: '当前已开放瓶位没有可完成路线；可撤回、重开或尝试解锁剩余广告空瓶。',
        }[hint.reason];
      }
      render();
      break;
    }
    case 'request-fourth-slot': dispatch({ type: 'request-fourth-slot' }); break;
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
