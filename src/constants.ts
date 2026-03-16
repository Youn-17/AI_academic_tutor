import { Role, Conversation, User } from './types';

export const CURRENT_STUDENT: User = {
  id: 's1',
  name: '林同学',
  role: Role.STUDENT
};

export const CURRENT_SUPERVISOR: User = {
  id: 't1',
  name: '张教授',
  role: Role.SUPERVISOR
};

export const INITIAL_CHATS: Conversation[] = [
  {
    id: 'c1',
    studentId: 's1',
    studentName: '林同学',
    title: '混合式学习环境下的教学交互研究',
    lastActive: '10:42',
    status: 'active',
    tags: ['混合式学习', '交互分析'],
    messages: [
      {
        id: 'm1',
        sender: Role.STUDENT,
        content: '张老师，我在设计混合式学习（Blended Learning）的实验方案时，发现线上和线下的交互数据很难进行统一量化，这会影响我对“深度学习”发生的判断吗？',
        timestamp: '10:30'
      },
      {
        id: 'm2',
        sender: Role.AI,
        content: '这是一个教育技术研究中常见的数据融合问题。根据 Garrison 的探究社区模型（CoI），你需要关注认知临场感、教学临场感和社会临场感。建议你不要仅仅依赖定量数据，可以引入滞后序列分析（LSA）来观察交互行为的序列模式。',
        timestamp: '10:30'
      },
      {
        id: 'm3',
        sender: Role.STUDENT,
        content: 'LSA 确实是个好办法。但是我目前的样本量只有两个班级，共 80 人，做序列分析会不会统计效力不足？',
        timestamp: '10:32'
      },
      {
        id: 'm4',
        sender: Role.SUPERVISOR,
        content: '80人的样本对于LSA来说确实处于边缘。建议你补充质性访谈数据，采用混合研究方法（Mixed Methods）。另外，关注一下 ICAP 交互框架，把交互行为分为被动、主动、建构和交互四层，这样编码会更清晰。',
        timestamp: '10:35',
        isIntervention: true
      }
    ]
  },
  {
    id: 'c2',
    studentId: 's2',
    studentName: '王同学',
    title: '基于多模态数据的认知负荷测量',
    lastActive: '昨天',
    status: 'completed',
    tags: ['认知负荷', '多模态'],
    messages: [
      {
        id: 'm1',
        sender: Role.STUDENT,
        content: '请问目前的眼动追踪设备在测量内在认知负荷时，瞳孔直径的校准基线应该怎么设定？',
        timestamp: '09:00'
      },
      {
        id: 'm2',
        sender: Role.AI,
        content: '根据 Sweller 的认知负荷理论以及 Mayer 的多媒体学习原则，基线通常在被试休息或观看中性灰色屏幕时采集 5-10 秒。注意要剔除光照变化引起的瞳孔反射干扰。',
        timestamp: '09:01'
      }
    ]
  },
  {
    id: 'c3',
    studentId: 's3',
    studentName: '陈同学',
    title: 'STEM 教育中的项目式学习设计',
    lastActive: '刚刚',
    status: 'flagged',
    tags: ['STEM', 'PBL'],
    messages: [
      {
        id: 'm1',
        sender: Role.STUDENT,
        content: '我想探究 PBL 模式对小学生计算思维的影响，但是找不到合适的评估量表。',
        timestamp: '11:00'
      }
    ]
  }
];

export const WEEKLY_STATS = [
  { name: 'Mon', value: 12 },
  { name: 'Tue', value: 19 },
  { name: 'Wed', value: 15 },
  { name: 'Thu', value: 22 },
  { name: 'Fri', value: 28 },
  { name: 'Sat', value: 8 },
  { name: 'Sun', value: 5 },
];

export const MOCK_SANKEY_DATA = {
  nodes: [
    { name: '知识获取' },
    { name: '文献阅读' },
    { name: '实验设计' },
    { name: '数据收集' },
    { name: '论文写作' },
    { name: '深度理解' },
    { name: '一般掌握' },
    { name: '待加强' },
  ],
  links: [
    { source: 0, target: 5, value: 45 },
    { source: 0, target: 6, value: 30 },
    { source: 1, target: 5, value: 20 },
    { source: 1, target: 6, value: 40 },
    { source: 1, target: 7, value: 10 },
    { source: 2, target: 5, value: 15 },
    { source: 2, target: 7, value: 25 },
    { source: 3, target: 6, value: 35 },
    { source: 4, target: 5, value: 50 },
  ],
};

// Generate heatmap data (7 days * 24 hours)
export const MOCK_HEATMAP_DATA = Array.from({ length: 7 }, (_, dayIndex) => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return Array.from({ length: 24 }, (_, hourIndex) => ({
    day: days[dayIndex],
    hour: hourIndex,
    value: Math.floor(Math.random() * 100), // Random activity level
  }));
}).flat();
