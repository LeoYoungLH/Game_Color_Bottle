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
];
