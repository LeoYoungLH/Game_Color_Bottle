import type { BottleView, SessionSnapshot } from './game-session.ts';
import { BASIC_LEVELS, type AuthoredLevel } from './levels.ts';

const COLORS: Record<string, { name: string; hex: string; symbol: string }> = {
  moss: { name: '苔绿', hex: '#78945d', symbol: '●' },
  coral: { name: '珊瑚', hex: '#d18068', symbol: '◆' },
  blue: { name: '靛蓝', hex: '#728fb1', symbol: '▲' },
};

export function colorName(color: string): string {
  return COLORS[color]?.name ?? color;
}

function escape(text: string): string {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function brand(): string {
  return '<a class="brand" href="#" data-action="home" aria-label="拾色工坊，回到关卡"><span class="brand-mark" aria-hidden="true">拾</span><span>拾色工坊<small>SHISE WORKSHOP</small></span></a>';
}

export function renderHome(active: { title: string; moves: number } | null): string {
  return `<main class="home shell">
    <header class="site-header">${brand()}<span class="edition">基础篇 · 01—05</span></header>
    <section class="hero">
      <div class="hero-copy"><span class="eyebrow">一瓶一色，慢慢来。</span><h1>把颜色归好。<br><span>让思路轻一点。</span></h1><p>借一点空位，理清颜色的次序。<br>把满满一瓶，交给它该去的地方。</p><div class="hero-facts"><span>3 种颜色</span><span>每瓶 4 层</span><span>5 个验证关卡</span></div></div>
      <div class="hero-art" aria-hidden="true"><div class="art-ring"></div><div class="art-bottle art-left"><i></i><span class="art-liquid mixed"></span></div><div class="art-bottle art-center"><i></i><span class="art-liquid green"></span></div><div class="art-bottle art-right"><i></i><span class="art-liquid blue"></span></div><span class="art-note">给每一种颜色，一个归处。</span></div>
    </section>
    ${active ? `<section class="continue-card"><div><small>还在工作台上的颜色</small><strong>${escape(active.title)} · 已倒水 ${active.moves} 次</strong></div><button class="primary" data-action="continue">继续这一关 <span aria-hidden="true">→</span></button></section>` : ''}
    <section class="level-section" aria-labelledby="level-heading"><div class="section-heading"><div><span class="eyebrow">从这里开始</span><h2 id="level-heading">挑一张练习卡</h2></div><span class="muted">选择关卡会开启新一局</span></div><div class="level-cards">${BASIC_LEVELS.map((level, index) => `<button class="level-card" data-level="${level.definition.id}" aria-label="开始 ${level.definition.id} ${escape(level.definition.title)}"><span class="card-number">0${index + 1}</span><span class="card-name">${escape(level.definition.title)}</span><span class="card-subtitle">${escape(level.subtitle)}</span><span class="card-bottom">${level.definition.bottles.length + 2} 个瓶位 · 收集 ${level.definition.targets.length + (level.definition.upcomingTargets?.length ?? 0)} 瓶 <span aria-hidden="true">↗</span></span></button>`).join('')}</div></section>
    <footer class="home-footer"><span>点一下选瓶，再点一下倒水。</span><span>没有倒计时，按自己的节奏。</span></footer>
  </main>`;
}

function renderBottle(bottle: BottleView, selected: boolean): string {
  const empty = bottle.layers.length === 0;
  const top = bottle.layers.at(-1);
  const label = bottle.status === 'ad-locked' ? `广告空瓶 ${bottle.id}，尚未解锁`
    : bottle.status === 'collected' ? `瓶 ${bottle.id}，已收取`
    : `瓶 ${bottle.id}，${empty ? '空瓶' : `顶层${colorName(top!)}`}，${bottle.layers.length}/4`;
  let graphic: string;
  let caption: string;
  if (bottle.status === 'collected') {
    graphic = '<div class="collected-space"><span aria-hidden="true">✓</span><small>已收取</small></div>';
    caption = '留下一个位置';
  } else {
    const layers = bottle.layers.map(color => {
      const paint = COLORS[color];
      return `<span class="liquid-layer" style="--paint:${paint?.hex ?? '#778879'}" aria-hidden="true">${paint?.symbol ?? '•'}</span>`;
    }).join('');
    graphic = `<div class="bottle-art"><div class="bottle-neck"></div>${bottle.status === 'ready' ? '<span class="bottle-cap"></span>' : ''}<div class="bottle-body"><div class="liquid-stack">${layers}</div>${bottle.status === 'ad-locked' ? '<div class="ad-lock"><span aria-hidden="true">▷</span><small>广告空瓶</small></div>' : ''}</div></div>`;
    caption = bottle.status === 'ad-locked' ? '尚未解锁' : bottle.status === 'ready' ? '已满 · 等待目标' : empty ? '可接水' : `${bottle.layers.length} / 4`;
  }
  return `<button class="bottle ${bottle.status} ${selected ? 'selected' : ''}" data-bottle="${escape(bottle.id)}" data-focus-key="bottle-${escape(bottle.id)}" aria-label="${escape(label)}" aria-pressed="${selected}" ${bottle.status === 'ad-locked' || bottle.status === 'collected' ? 'aria-disabled="true"' : ''}><span class="bottle-id">${bottle.id.startsWith('ad-') ? '＋' : escape(bottle.id)}</span>${graphic}<span class="bottle-caption">${caption}</span></button>`;
}

/** D01 uses two rows for its seven/eight fixed positions; wider boards belong to D03. */
function renderBoard(snapshot: SessionSnapshot): string {
  const ordinary = snapshot.bottles.filter(b => b.status !== 'ad-locked');
  const ads = snapshot.bottles.filter(b => b.status === 'ad-locked');
  const columns = Math.ceil(snapshot.bottles.length / 2);
  const rows = [ordinary.slice(0, columns), [ads[0]!, ...ordinary.slice(columns), ads[1]!]];
  return rows.map(row => `<div class="bottle-row" style="--columns:${columns}">${row.map(b => renderBottle(b, b.id === snapshot.selectedBottleId)).join('')}</div>`).join('');
}

export function renderGame(level: AuthoredLevel, snapshot: SessionSnapshot, notice: string, confirmRestart: boolean, nextLevel: AuthoredLevel | null): string {
  const completed = snapshot.collected.length;
  const won = snapshot.phase === 'won';
  return `<main class="game shell">
    <header class="site-header">${brand()}<span class="edition">基础篇 · ${level.definition.id}</span></header>
    <div class="game-layout"><aside class="lesson-card"><span class="eyebrow">${level.definition.id} / 练习卡</span><h1>${escape(level.definition.title)}</h1><p>${escape(level.lesson)}</p><div class="lesson-divider"></div><h2>让颜色找到归处</h2><ul><li>一次选一瓶，再选接水的瓶子。</li><li>空瓶，或顶层同色的瓶子可以接水。</li><li>收集槽会收取匹配的单色满瓶。</li></ul><div class="color-key">${Object.values(COLORS).map(c => `<span><i style="--paint:${c.hex}">${c.symbol}</i>${c.name}</span>`).join('')}</div><p class="small-note">两个虚线瓶位暂时锁定。<br>当前关卡无需广告帮助即可完成。</p></aside>
    <section class="workbench" aria-label="颜色工作台"><div class="bench-heading"><div><span class="eyebrow">颜色收集槽</span><h2>一瓶一色，刚刚好。</h2></div><span class="collection-count" aria-label="收取进度">${completed}<small> / ${snapshot.requiredCollections}</small></span></div><div class="progress-track"><span style="width:${completed / snapshot.requiredCollections * 100}%"></span></div>
      <div class="target-cards" aria-label="当前收集目标">${snapshot.targets.map(t => `<div class="target-card ${t.fulfilled ? 'fulfilled' : ''}" style="--paint:${t.color ? COLORS[t.color]?.hex ?? '#778879' : '#778879'}"><span class="target-symbol" aria-hidden="true">${t.fulfilled ? '✓' : t.color ? COLORS[t.color]?.symbol ?? '•' : '✓'}</span><strong>${t.color ? escape(colorName(t.color)) : '已完成'}</strong><small>${t.fulfilled ? '已收取' : '收取单色满瓶'}</small></div>`).join('')}</div>
      <div class="target-preview" aria-label="下一待分配目标">下一待分配目标：${snapshot.nextTarget ? escape(colorName(snapshot.nextTarget)) : '暂无'}</div>
      <div class="bottle-board" aria-label="瓶阵">${renderBoard(snapshot)}</div>
      <div class="notice" role="status" aria-live="polite">${escape(notice)}</div>
      <div class="bench-actions"><button class="text-button" data-action="cancel" ${!snapshot.selectedBottleId || won ? 'disabled' : ''}>取消选择</button><span class="move-count">已倒水 ${snapshot.moveCount} 次</span><button class="text-button" data-action="restart">重新开始</button></div>
    </section></div>
    <footer class="game-footer"><button class="text-button" data-action="home">← 回到关卡</button><span>慢一点，也没关系。</span></footer>
    ${won ? `<dialog class="completion-dialog" id="completion-dialog" aria-labelledby="completion-title"><span class="completion-seal" aria-hidden="true">✓</span><span class="eyebrow">这一批颜色，已归位</span><h2 id="completion-title">${nextLevel ? '本关完成' : '本版验证关卡完成'}</h2><p>${escape(level.definition.title)} · ${snapshot.moveCount} 次倒水<br>${snapshot.requiredCollections} 瓶颜色，都找到了自己的位置。</p><div class="dialog-actions">${nextLevel ? `<button class="primary" data-action="next">进入 ${escape(nextLevel.definition.id)}</button>` : ''}<button class="secondary" data-action="home">回到关卡</button><button class="secondary" data-action="replay">再玩一次</button></div></dialog>` : ''}
    ${confirmRestart && !won ? '<dialog class="restart-dialog" id="restart-dialog" aria-labelledby="restart-title"><h2 id="restart-title">重新开始这一关？</h2><p>颜色会回到开局时的顺序。</p><div class="dialog-actions"><button class="primary" data-action="replay">重新开始</button><button class="secondary" data-action="keep-playing">继续当前局</button></div></dialog>' : ''}
  </main>`;
}
