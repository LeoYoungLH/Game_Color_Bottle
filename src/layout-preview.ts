import './style.css';
import { hydrateIcons } from './icons.ts';
import type { BottleView } from './game-session.ts';
import { layoutBottleRows, renderBoard } from './view.ts';

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('Preview root is missing.');

function createBottles(total: number): BottleView[] {
  const bottles: BottleView[] = Array.from({ length: total - 2 }, (_, index) => ({
    id: `P${index + 1}`,
    layers: Array.from({ length: (index % 4) + 1 }, () => ['moss', 'coral', 'blue'][index % 3]!),
    status: 'available',
  }));
  bottles.push({ id: 'ad-1', layers: [], status: 'ad-locked' }, { id: 'ad-2', layers: [], status: 'ad-locked' });
  return bottles;
}

function render(total: number): void {
  const bottles = createBottles(total);
  const { rows } = layoutBottleRows(bottles);
  root!.innerHTML = `<main class="game shell preview"><header class="site-header"><span class="brand"><span class="brand-mark">拾</span>拾色工坊</span><span class="edition">排布检视</span></header><div class="preview-controls"><h1>瓶阵密度</h1><label for="total">总瓶位 <output id="total-value">${total}</output></label><input id="total" type="range" min="5" max="24" value="${total}" /><p>${rows.map(row => row.length).join(' + ')} · 示意排布，非可玩关卡</p></div><section class="board-area" aria-label="排布预览"><div class="board-heading"><span>瓶阵</span><span>广告瓶位 2</span></div>${renderBoard(bottles, null)}</section></main>`;
  hydrateIcons(root!);
  root!.querySelector<HTMLInputElement>('#total')?.addEventListener('input', event => {
    const count = Number((event.target as HTMLInputElement).value);
    const sample = createBottles(count);
    const layout = layoutBottleRows(sample);
    root!.querySelector<HTMLOutputElement>('#total-value')!.value = String(count);
    root!.querySelector<HTMLElement>('.preview-controls p')!.textContent = `${layout.rows.map(row => row.length).join(' + ')} · 示意排布，非可玩关卡`;
    root!.querySelector<HTMLElement>('.bottle-board')!.outerHTML = renderBoard(sample, null);
    hydrateIcons(root!);
  });
}

const requested = Number(new URLSearchParams(location.search).get('total'));
render(Number.isInteger(requested) && requested >= 5 && requested <= 24 ? requested : 24);

root.addEventListener('click', event => {
  const bottle = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('.bottle[data-bottle]') : null;
  if (!bottle || bottle.classList.contains('ad-locked')) return;
  const selected = bottle.classList.contains('selected');
  root.querySelectorAll<HTMLButtonElement>('.bottle.selected').forEach(current => {
    current.classList.remove('selected');
    current.setAttribute('aria-pressed', 'false');
  });
  if (!selected) {
    bottle.classList.add('selected');
    bottle.setAttribute('aria-pressed', 'true');
  }
});
