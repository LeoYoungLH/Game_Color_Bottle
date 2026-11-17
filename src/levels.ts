import type { LevelDefinition } from './game-session.ts';

export interface AuthoredLevel {
  readonly definition: LevelDefinition;
  readonly subtitle: string;
  readonly lesson: string;
  readonly version: 1;
  /** A hand-authored witness; no minimum-move claim. */
  readonly solution: readonly (readonly [string, string])[];
}

export const BASIC_LEVELS: readonly AuthoredLevel[] = [
  {
    definition: {
      id: 'S01', title: '初次交付', targets: ['moss', 'coral', 'blue'],
      bottles: [
        { id: 'A', layers: ['moss', 'moss', 'coral', 'coral'] },
        { id: 'B', layers: ['coral', 'coral', 'blue', 'blue'] },
        { id: 'C', layers: ['blue', 'blue', 'moss', 'moss'] },
        { id: 'D', layers: [] }, { id: 'E', layers: [] },
      ],
    },
    subtitle: '从两层同色开始',
    lesson: '先选一瓶，再选空瓶或顶层同色的瓶子。装满同一种颜色，匹配的收集槽就会收取它。',
    version: 1,
    solution: [['A', 'D'], ['C', 'A'], ['B', 'C'], ['B', 'D']],
  },
  {
    definition: {
      id: 'S02', title: '交错配色', targets: ['moss', 'coral', 'blue'],
      bottles: [
        { id: 'A', layers: ['moss', 'coral', 'moss', 'coral'] },
        { id: 'B', layers: ['coral', 'blue', 'coral', 'blue'] },
        { id: 'C', layers: ['blue', 'moss', 'blue', 'moss'] },
        { id: 'D', layers: [] }, { id: 'E', layers: [] }, { id: 'F', layers: [] },
      ],
    },
    subtitle: '给每种颜色找个落点',
    lesson: '顶层相邻的同色会一起倒出。先借空瓶腾出空间，再把散开的颜色聚起来。',
    version: 1,
    solution: [['A', 'D'], ['C', 'A'], ['B', 'C'], ['B', 'D'], ['C', 'B'], ['A', 'C'], ['A', 'D'], ['C', 'A'], ['B', 'C'], ['B', 'D']],
  },
  {
    definition: {
      id: 'S03', title: '留一点余地', targets: ['moss', 'coral', 'blue'],
      bottles: [
        { id: 'A', layers: ['blue', 'coral', 'coral', 'coral'] },
        { id: 'B', layers: ['moss', 'moss', 'coral'] },
        { id: 'C', layers: ['blue', 'blue', 'blue', 'moss'] },
        { id: 'D', layers: ['moss'] },
        { id: 'E', layers: [] }, { id: 'F', layers: [] },
      ],
    },
    subtitle: '倒入多少，由剩余空间决定',
    lesson: '每瓶最多四层。目标只剩一层空间时，会接住一层，其余颜色留在原瓶。',
    version: 1,
    solution: [['A', 'B'], ['B', 'E'], ['A', 'E'], ['C', 'B'], ['D', 'B'], ['C', 'A']],
  },
  {
    definition: {
      id: 'S04', title: '等下一单', targets: ['moss', 'moss', 'moss'], upcomingTargets: ['coral'],
      bottles: [
        { id: 'A', layers: ['moss', 'moss', 'moss'] },
        { id: 'B', layers: ['moss', 'moss', 'moss'] },
        { id: 'C', layers: ['moss', 'moss', 'moss'] },
        { id: 'D', layers: ['moss', 'moss', 'moss'] },
        { id: 'E', layers: ['coral', 'coral', 'coral', 'coral'] },
        { id: 'G', layers: [] }, { id: 'H', layers: [] },
      ],
    },
    subtitle: '满瓶也会等待目标',
    lesson: '珊瑚色已经装满，但当前收集槽没有它。先收取苔绿，下一待分配目标出现后，它会自动收走。',
    version: 1,
    solution: [['B', 'A'], ['C', 'B'], ['D', 'C']],
  },
  {
    definition: {
      id: 'S05', title: '连续收取', targets: ['moss', 'moss', 'moss'], upcomingTargets: ['coral', 'blue'],
      bottles: [
        { id: 'A', layers: ['moss', 'moss', 'moss'] },
        { id: 'B', layers: ['moss', 'moss', 'moss'] },
        { id: 'C', layers: ['moss', 'moss', 'moss'] },
        { id: 'D', layers: ['moss', 'moss', 'moss'] },
        { id: 'E', layers: ['coral', 'coral', 'coral', 'coral'] },
        { id: 'F', layers: ['blue', 'blue', 'blue', 'blue'] },
        { id: 'G', layers: [] }, { id: 'H', layers: [] },
      ],
    },
    subtitle: '一个动作，接连交付',
    lesson: '两只满瓶正在等候。收取苔绿后，目标依次补位；匹配的瓶子会在同一次动作中连续收走。',
    version: 1,
    solution: [['B', 'A'], ['C', 'B'], ['D', 'C']],
  },
  {
    definition: {
      id: 'S06', title: '纸下的颜色', targets: ['moss', 'coral', 'blue'],
      bottles: [
        { id: 'A', layers: ['moss', 'moss', 'coral', 'coral'], hiddenLayers: [1] },
        { id: 'B', layers: ['coral', 'coral', 'blue', 'blue'], hiddenLayers: [1] },
        { id: 'C', layers: ['blue', 'blue', 'moss', 'moss'] },
        { id: 'D', layers: [] }, { id: 'E', layers: [] },
      ],
    },
    subtitle: '先露出一层，再决定下一步',
    lesson: '问号仍占一层。先把 A 顶部的珊瑚倒入空瓶，纸片下的新顶层才会显露。',
    version: 1,
    solution: [['A', 'D'], ['C', 'A'], ['B', 'C'], ['B', 'D']],
  },
  {
    definition: {
      id: 'S07', title: '逐层辨认', targets: ['moss', 'coral', 'blue'],
      bottles: [
        { id: 'A', layers: ['moss', 'coral', 'moss', 'coral'], hiddenLayers: [2] },
        { id: 'B', layers: ['coral', 'blue', 'coral', 'blue'], hiddenLayers: [2] },
        { id: 'C', layers: ['blue', 'moss', 'blue', 'moss'], hiddenLayers: [2] },
        { id: 'D', layers: [] }, { id: 'E', layers: [] }, { id: 'F', layers: [] },
      ],
    },
    subtitle: '已知层不会重新遮住',
    lesson: '每只瓶子的顶层起初可见。先让 A 的珊瑚进入空瓶，再根据显露的颜色继续分层。',
    version: 1,
    solution: [['A', 'D'], ['C', 'A'], ['B', 'C'], ['B', 'D'], ['C', 'B'], ['A', 'C'], ['A', 'D'], ['C', 'A'], ['B', 'C'], ['B', 'D']],
  },
  {
    definition: {
      id: 'S08', title: '封签初试', targets: ['moss', 'coral', 'blue'], upcomingTargets: ['honey'],
      bottles: [
        { id: 'A', layers: ['moss', 'moss', 'coral', 'coral'] },
        { id: 'B', layers: ['coral', 'coral', 'blue', 'blue'] },
        { id: 'C', layers: ['blue', 'blue', 'moss', 'moss'] },
        { id: 'D', layers: [] }, { id: 'E', layers: [] },
        { id: 'I', layers: ['honey', 'honey', 'honey'], sealThreshold: 2 },
        { id: 'J', layers: ['honey'] },
      ],
    },
    subtitle: '收走两瓶，打开封签',
    lesson: '封签瓶暂时不能倒水或接水。先收取两只单色满瓶，再把剩余的蜜黄倒入已开放的瓶子。',
    version: 1,
    solution: [['A', 'D'], ['C', 'A'], ['B', 'C'], ['J', 'I'], ['B', 'D']],
  },
  {
    definition: {
      id: 'S09', title: '第五次收取', targets: ['moss', 'moss', 'moss'], upcomingTargets: ['coral', 'blue', 'honey'],
      bottles: [
        { id: 'A', layers: ['moss', 'moss', 'moss'] },
        { id: 'B', layers: ['moss', 'moss', 'moss'] },
        { id: 'C', layers: ['moss', 'moss', 'moss'] },
        { id: 'D', layers: ['moss', 'moss', 'moss'] },
        { id: 'E', layers: ['coral', 'coral', 'coral', 'coral'] },
        { id: 'F', layers: ['blue', 'blue', 'blue', 'blue'] },
        { id: 'G', layers: [] }, { id: 'H', layers: [] },
        { id: 'I', layers: ['honey', 'honey', 'honey', 'honey'], sealThreshold: 5 },
      ],
    },
    subtitle: '倒满不等于收走',
    lesson: '数的是已收取的满瓶，不是倒水次数。收走第五只时，封签才会打开并参与后续收取。',
    version: 1,
    solution: [['B', 'A'], ['C', 'B'], ['D', 'C']],
  },
  {
    definition: {
      id: 'S10', title: '只能接水', targets: ['moss', 'coral', 'blue'], upcomingTargets: ['honey'],
      bottles: [
        { id: 'A', layers: ['moss', 'moss', 'coral', 'coral'] },
        { id: 'B', layers: ['coral', 'coral', 'blue', 'blue'] },
        { id: 'C', layers: ['blue', 'blue', 'moss', 'moss'] },
        { id: 'D', layers: [] }, { id: 'E', layers: [] },
        { id: 'I', layers: ['honey', 'honey', 'honey'], receiveOnly: true },
        { id: 'J', layers: ['honey'] },
      ],
    },
    subtitle: '装满后解除固定',
    lesson: '定色瓶 I 只能接水。先把 J 的蜜黄倒给 I，装满后解除固定；没有匹配目标时会原地待收。',
    version: 1,
    solution: [['J', 'I'], ['A', 'D'], ['C', 'A'], ['B', 'C'], ['B', 'D']],
  },
  {
    definition: {
      id: 'S11', title: '分别固定', targets: ['moss', 'coral', 'blue'], upcomingTargets: ['honey', 'violet'],
      bottles: [
        { id: 'A', layers: ['moss', 'moss', 'coral', 'coral'] },
        { id: 'B', layers: ['coral', 'coral', 'blue', 'blue'] },
        { id: 'C', layers: ['blue', 'blue', 'moss', 'moss'] },
        { id: 'I', layers: ['honey', 'honey', 'honey'], receiveOnly: true },
        { id: 'K', layers: ['violet', 'violet', 'violet'], receiveOnly: true },
        { id: 'J', layers: ['honey'] }, { id: 'L', layers: ['violet'] },
        { id: 'D', layers: [] }, { id: 'E', layers: [] },
      ],
    },
    subtitle: '同一排，各自解除',
    lesson: 'I 与 K 同在一行，却各自固定。先装满 I，观察 K 仍只能接水，再把 L 的紫色倒给 K。',
    version: 1,
    solution: [['J', 'I'], ['L', 'K'], ['A', 'D'], ['C', 'A'], ['B', 'C'], ['B', 'D']],
  },
];
