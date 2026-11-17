import { AD_BOTTLE_IDS, isAdBottleId, type BottleView, type SessionSnapshot } from './game-session.ts';
import { BASIC_LEVELS, type AuthoredLevel } from './levels.ts';

const COLORS: Record<string, { name: string; hex: string; symbol: string }> = {
  moss: { name: '苔绿', hex: '#63bc86', symbol: '●' },
  coral: { name: '珊瑚', hex: '#ee806f', symbol: '◆' },
  blue: { name: '靛蓝', hex: '#73a9dc', symbol: '▲' },
  honey: { name: '蜜黄', hex: '#e5bc64', symbol: '■' },
  violet: { name: '紫藤', hex: '#b995d8', symbol: '★' },
};

export function colorName(color: string): string {
  return COLORS[color]?.name ?? color;
}

function escape(text: string): string {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function brand(): string {
  return '<span class="brand"><span class="brand-mark" aria-hidden="true">拾</span><span>拾色工坊</span></span>';
}

export function renderHome(active: { title: string; moves: number } | null): string {
  return `<main class="home shell">
    <header class="site-header">${brand()}<span class="edition">验证关卡 01—11</span></header>
    <div class="home-heading"><span class="section-label">选择关卡</span><h1>调色工作台</h1></div>
    ${active ? `<section class="continue-strip"><div><span>继续对局</span><strong>${escape(active.title)} <small>· ${active.moves} 次倒水</small></strong></div><button class="primary" data-action="continue">继续 <i data-lucide="arrow-right" aria-hidden="true"></i></button></section>` : ''}
    <section class="level-section" aria-label="验证关卡"><div class="level-list">${BASIC_LEVELS.map(level => `<button class="level-entry" data-level="${escape(level.definition.id)}" aria-label="开始 ${escape(level.definition.id)} ${escape(level.definition.title)}"><span class="level-number">${escape(level.definition.id)}</span><span class="level-copy"><strong>${escape(level.definition.title)}</strong><small>${escape(level.subtitle)}</small></span><span class="level-meta">${level.definition.bottles.length + 2} 瓶位</span><i data-lucide="chevron-right" aria-hidden="true"></i></button>`).join('')}</div></section>
    <footer class="home-footer">拾色工坊 · 浏览器验证版本</footer>
  </main>`;
}

function renderBottle(bottle: BottleView, selected: boolean, dense: boolean, collectedCount: number): string {
  const empty = bottle.layers.length === 0;
  const top = bottle.layers.at(-1);
  const hiddenCount = bottle.layers.filter(layer => layer === null).length;
  const ad = isAdBottleId(bottle.id);
  const threshold = bottle.sealThreshold ?? 0;
  const label = bottle.status === 'ad-locked' ? `广告空瓶 ${bottle.id}，点击模拟广告解锁`
    : bottle.status === 'collected' ? `瓶 ${bottle.id}，已收取`
    : bottle.status === 'sealed' ? `封签瓶 ${bottle.id}，已收取 ${collectedCount}/${threshold} 瓶，尚未开启`
    : bottle.status === 'receive-only' ? `定色瓶 ${bottle.id}，只接水，${bottle.layers.length}/4`
    : `瓶 ${bottle.id}，${empty ? '空瓶' : top === null ? '顶层未知' : `顶层${colorName(top!)}`}，${bottle.layers.length}/4${hiddenCount ? `，${hiddenCount}层隐藏颜色` : ''}`;
  const layers = bottle.layers.map(color => {
    if (color === null) return '<span class="liquid-layer hidden-layer" aria-hidden="true"><span>?</span></span>';
    const paint = COLORS[color];
    return `<span class="liquid-layer" style="--paint:${paint?.hex ?? '#d8ac5f'}" aria-hidden="true"><span>${paint?.symbol ?? '•'}</span></span>`;
  }).join('');
  const interior = bottle.status === 'collected'
    ? '<span class="collected-mark" aria-hidden="true">✓</span>'
    : bottle.status === 'sealed'
      ? `<span class="bottle-art sealed-art"><span class="bottle-neck"></span><span class="bottle-body"><span class="seal-sheet"><span class="seal-stamp">封</span><strong>${threshold}</strong><small>瓶后开启</small></span></span></span>`
    : `<span class="bottle-art"><span class="bottle-neck"></span><span class="bottle-body"><span class="liquid-stack">${layers}</span>${bottle.status === 'ad-locked' ? '<span class="ad-lock"><i data-lucide="video" aria-hidden="true"></i></span>' : ''}</span>${bottle.status === 'receive-only' ? '<span class="fixed-clamp"><i data-lucide="arrow-down" aria-hidden="true"></i></span>' : ''}</span>`;
  const caption = bottle.status === 'collected' ? '已收取' : bottle.status === 'ad-locked' ? '模拟广告' : bottle.status === 'sealed' ? `收取 ${collectedCount}/${threshold}` : bottle.status === 'receive-only' ? '只接水' : bottle.status === 'ready' ? '待收' : empty ? '空瓶' : `${bottle.layers.length}/4`;
  return `<button class="bottle ${bottle.status} ${selected ? 'selected' : ''}" data-bottle="${escape(bottle.id)}" data-focus-key="bottle-${escape(bottle.id)}" aria-label="${escape(label)}" aria-pressed="${selected}" ${bottle.status === 'collected' || bottle.status === 'sealed' ? 'aria-disabled="true"' : ''}><span class="bottle-id">${ad ? '+' : escape(bottle.id)}</span>${interior}<span class="bottle-caption ${dense ? 'dense-caption' : ''}">${caption}</span></button>`;
}

export function layoutBottleRows(bottles: readonly BottleView[]): { columns: number; rows: BottleView[][] } {
  const total = bottles.length;
  const columns = total >= 22 ? 8 : total >= 19 ? 7 : total >= 12 ? 6 : Math.min(6, Math.ceil(total / 2));
  const counts = total <= 11 ? [columns, total - columns] : [columns, columns, total - columns * 2].filter(count => count > 0);
  const ads = AD_BOTTLE_IDS.map(id => bottles.find(b => b.id === id));
  if (ads.some(b => !b)) throw new Error('Board requires exactly two ad bottle positions.');
  const ordinary = bottles.filter(b => !isAdBottleId(b.id));
  const adRow = counts.findLastIndex(count => count >= 2);
  let offset = 0;
  const rows = counts.map((count, index) => {
    const containsAds = index === adRow;
    const ordinaryCount = count - (containsAds ? 2 : 0);
    const row = ordinary.slice(offset, offset + ordinaryCount);
    offset += ordinaryCount;
    return containsAds ? [ads[0]!, ...row, ads[1]!] : row;
  });
  return { columns, rows };
}

export function renderBoard(bottles: readonly BottleView[], selectedBottleId: string | null, collectedCount = 0): string {
  const { columns, rows } = layoutBottleRows(bottles);
  return `<div class="bottle-board" aria-label="瓶阵" style="--columns:${columns}">${rows.map((row, index) => `<div class="bottle-row" data-row="${index + 1}" style="--row-count:${row.length}">${row.map(b => renderBottle(b, b.id === selectedBottleId, columns >= 7, collectedCount)).join('')}</div>`).join('')}</div>`;
}

export function renderGame(level: AuthoredLevel, snapshot: SessionSnapshot, notice: string, confirmRestart: boolean, nextLevel: AuthoredLevel | null): string {
  const completed = snapshot.collected.length;
  const won = snapshot.phase === 'won';
  return `<main class="game shell">
    <header class="game-header"><button class="icon-button" data-action="home" title="返回关卡" aria-label="返回关卡"><i data-lucide="arrow-left" aria-hidden="true"></i></button><div class="level-title"><span>${escape(level.definition.id)} · 基础篇</span><h1>${escape(level.definition.title)}</h1></div><div class="header-settings"><button class="icon-button ${snapshot.feedback.sound ? 'is-on' : ''}" data-feedback="sound" data-focus-key="feedback-sound" aria-label="声音${snapshot.feedback.sound ? '开' : '关'}" aria-pressed="${snapshot.feedback.sound}" title="声音${snapshot.feedback.sound ? '开' : '关'}"><i data-lucide="${snapshot.feedback.sound ? 'volume-2' : 'volume-x'}" aria-hidden="true"></i></button><button class="icon-button ${snapshot.feedback.vibration ? 'is-on' : ''}" data-feedback="vibration" data-focus-key="feedback-vibration" aria-label="震动${snapshot.feedback.vibration ? '开' : '关'}" aria-pressed="${snapshot.feedback.vibration}" title="震动${snapshot.feedback.vibration ? '开' : '关'}"><i data-lucide="${snapshot.feedback.vibration ? 'vibrate' : 'vibrate-off'}" aria-hidden="true"></i></button></div></header>
    <div class="game-stage"><div class="stage-meta"><span>收集进度 <strong>${completed} / ${snapshot.requiredCollections}</strong></span><span>倒水 <strong>${snapshot.moveCount}</strong></span></div><div class="progress-track" aria-hidden="true"><span style="width:${completed / snapshot.requiredCollections * 100}%"></span></div>
      <section class="collection-area" aria-label="收集槽"><div class="section-heading"><h2>收集槽</h2><span>装满同色后自动收取</span></div><div class="target-cards" aria-label="当前收集目标">${snapshot.targets.map(t => `<div class="target-card ${t.fulfilled ? 'fulfilled' : ''}" style="--paint:${t.color ? COLORS[t.color]?.hex ?? '#d8ac5f' : '#777b77'}"><span class="target-symbol" aria-hidden="true">${t.fulfilled ? '✓' : t.color ? COLORS[t.color]?.symbol ?? '•' : '✓'}</span><strong>${t.color ? escape(colorName(t.color)) : '已完成'}</strong><small>${t.fulfilled ? '已收取' : '待收取'}</small></div>`).join('')}</div><div class="target-preview" aria-label="下一待分配目标">下一待分配：<strong>${snapshot.nextTarget ? escape(colorName(snapshot.nextTarget)) : '暂无'}</strong></div></section>
      <section class="board-area" aria-label="工作台"><div class="board-heading"><span>瓶阵</span><span>${snapshot.bottles.length} 个瓶位</span></div>${renderBoard(snapshot.bottles, snapshot.selectedBottleId, completed)}</section>
      <div class="notice" role="status" aria-live="polite">${escape(notice)}</div>
      <div class="bench-actions"><button class="tool-button" data-action="cancel" ${!snapshot.selectedBottleId || won ? 'disabled' : ''} title="取消选择"><i data-lucide="x" aria-hidden="true"></i><span>取消</span></button><button class="tool-button" data-action="restart" title="重新开始"><i data-lucide="rotate-ccw" aria-hidden="true"></i><span>重开</span></button></div>
    </div>
    ${won ? `<dialog class="completion-dialog" id="completion-dialog" aria-labelledby="completion-title"><span class="completion-seal" aria-hidden="true">✓</span><span class="section-label">${escape(level.definition.id)} · 收取完成</span><h2 id="completion-title">${nextLevel ? '本关完成' : '本版验证关卡完成'}</h2><p>${snapshot.requiredCollections} 瓶已收取 · ${snapshot.moveCount} 次倒水</p><div class="dialog-actions">${nextLevel ? `<button class="primary" data-action="next">进入 ${escape(nextLevel.definition.id)} <i data-lucide="arrow-right" aria-hidden="true"></i></button>` : ''}<button class="secondary" data-action="home">返回关卡</button><button class="secondary" data-action="replay">再玩一次</button></div></dialog>` : ''}
    ${confirmRestart && !won ? '<dialog class="restart-dialog" id="restart-dialog" aria-labelledby="restart-title"><h2 id="restart-title">重新开始？</h2><p>本关颜色将回到开局状态。</p><div class="dialog-actions"><button class="primary" data-action="replay">重新开始</button><button class="secondary" data-action="keep-playing">继续当前局</button></div></dialog>' : ''}
    ${snapshot.pendingAd ? `<dialog class="ad-dialog" aria-labelledby="ad-title"><span class="section-label">模拟广告 · ${escape(snapshot.pendingAd.bottleId)}</span><h2 id="ad-title">解锁广告空瓶</h2><p>规则验证模式，不播放真实广告。</p><div class="dialog-actions"><button class="primary" data-action="ad-result" data-outcome="success">模拟成功</button><button class="secondary" data-action="ad-result" data-outcome="cancelled">提前关闭</button><button class="secondary" data-action="ad-result" data-outcome="failed">加载失败</button><button class="secondary" data-action="ad-result" data-outcome="unavailable">无可用广告</button></div></dialog>` : ''}
  </main>`;
}
