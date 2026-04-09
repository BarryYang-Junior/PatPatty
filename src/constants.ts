import { PetType } from './types';
import { 
  Flame, 
  Droplets, 
  Leaf, 
  Zap, 
  Brain, 
  Moon, 
  Sun, 
  Mountain, 
  Wind, 
  Snowflake, 
  Shield, 
  Dna 
} from 'lucide-react';

export const PET_TEMPLATES: Record<PetType, { name: string; color: string; icon: any; images: string[]; stages: string[]; skills: { name: string; damage: number; effect: string; type: 'attack' | 'buff' | 'debuff' }[] }> = {
  fire: { 
    name: '烈焰狐', 
    color: 'bg-red-500', 
    icon: Flame, 
    images: ['/pets/fire_1.png', '/pets/fire_2.png', '/pets/fire_3.png', '/pets/fire_4.png', '/pets/fire_5.png'],
    stages: ['小火狐', '烈焰狐', '九天狐王', '焚天妖狐', '红莲业火皇'],
    skills: [
      { name: '火之牙', damage: 25, effect: '基础物理攻击', type: 'attack' },
      { name: '硝化冲锋', damage: 0, effect: '提升自身攻击力', type: 'buff' },
      { name: '红莲业火', damage: 60, effect: '终极奥义', type: 'attack' }
    ]
  },
  water: { 
    name: '蓝海灵', 
    color: 'bg-blue-500', 
    icon: Droplets, 
    images: ['/pets/water_1.png', '/pets/water_2.png', '/pets/water_3.png', '/pets/water_4.png', '/pets/water_5.png'],
    stages: ['水滴灵', '蓝海灵', '沧海神龙', '深海主宰', '极北冰洋神'],
    skills: [
      { name: '水弹', damage: 20, effect: '基础魔法攻击', type: 'attack' },
      { name: '祈雨', damage: 0, effect: '提升自身防御力', type: 'buff' },
      { name: '沧海之怒', damage: 55, effect: '神级水压', type: 'attack' }
    ]
  },
  grass: { 
    name: '森之芽', 
    color: 'bg-green-500', 
    icon: Leaf, 
    images: ['/pets/grass_1.png', '/pets/grass_2.png', '/pets/grass_3.png', '/pets/grass_4.png', '/pets/grass_5.png'],
    stages: ['小嫩芽', '森之芽', '万物之灵', '翡翠圣树', '盖亚生命神'],
    skills: [
      { name: '飞叶快刀', damage: 22, effect: '锋利的叶片攻击', type: 'attack' },
      { name: '寄生种子', damage: 0, effect: '降低对手攻击力', type: 'debuff' },
      { name: '万物复苏', damage: 50, effect: '自然之力的制裁', type: 'attack' }
    ]
  },
  electric: { 
    name: '雷鸣兔', 
    color: 'bg-yellow-400', 
    icon: Zap, 
    images: ['/pets/electric_1.png', '/pets/electric_2.png', '/pets/electric_3.png', '/pets/electric_4.png', '/pets/electric_5.png'],
    stages: ['闪电兔', '雷鸣兔', '雷霆领主', '九天雷劫', '宙斯裁决者'],
    skills: [
      { name: '电光一闪', damage: 25, effect: '极速电击', type: 'attack' },
      { name: '充电', damage: 0, effect: '大幅提升下次攻击', type: 'buff' },
      { name: '雷霆万钧', damage: 65, effect: '毁灭性的雷暴', type: 'attack' }
    ]
  },
  psychic: { 
    name: '幻念猫', 
    color: 'bg-purple-500', 
    icon: Brain, 
    images: ['/pets/psychic_1.png', '/pets/psychic_2.png', '/pets/psychic_3.png', '/pets/psychic_4.png', '/pets/psychic_5.png'],
    stages: ['念力猫', '幻念猫', '星空智者', '虚空行者', '至高真理神'],
    skills: [
      { name: '念力波', damage: 20, effect: '精神力冲击', type: 'attack' },
      { name: '催眠术', damage: 0, effect: '降低对手防御力', type: 'debuff' },
      { name: '真理之眼', damage: 55, effect: '直击灵魂的审判', type: 'attack' }
    ]
  },
  dark: { 
    name: '影之狼', 
    color: 'bg-gray-800', 
    icon: Moon, 
    images: ['/pets/dark_1.png', '/pets/dark_2.png', '/pets/dark_3.png', '/pets/dark_4.png', '/pets/dark_5.png'],
    stages: ['小影狼', '影之狼', '暗夜主宰', '深渊魔狼', '永夜冥王'],
    skills: [
      { name: '暗影袭', damage: 24, effect: '潜行后的突袭', type: 'attack' },
      { name: '诡计', damage: 0, effect: '极大提升攻击力', type: 'buff' },
      { name: '永夜降临', damage: 60, effect: '吞噬一切的黑暗', type: 'attack' }
    ]
  },
  light: { 
    name: '圣光鹿', 
    color: 'bg-yellow-100', 
    icon: Sun, 
    images: ['/pets/light_1.png', '/pets/light_2.png', '/pets/light_3.png', '/pets/light_4.png', '/pets/light_5.png'],
    stages: ['光之鹿', '圣光鹿', '永恒之光', '神圣独角', '创世大天使'],
    skills: [
      { name: '圣光弹', damage: 20, effect: '纯净的光能攻击', type: 'attack' },
      { name: '光墙', damage: 0, effect: '极大提升防御力', type: 'buff' },
      { name: '创世神辉', damage: 55, effect: '净世的圣光', type: 'attack' }
    ]
  },
  earth: { 
    name: '岩石怪', 
    color: 'bg-amber-700', 
    icon: Mountain, 
    images: ['/pets/earth_1.png', '/pets/earth_2.png', '/pets/earth_3.png', '/pets/earth_4.png', '/pets/earth_5.png'],
    stages: ['小石怪', '岩石怪', '大地守护者', '不朽巨像', '泰坦地心神'],
    skills: [
      { name: '落石术', damage: 22, effect: '召唤巨石砸击', type: 'attack' },
      { name: '变圆', damage: 0, effect: '提升自身防御力', type: 'buff' },
      { name: '泰坦重击', damage: 55, effect: '地动山摇的一击', type: 'attack' }
    ]
  },
  wind: { 
    name: '疾风鹰', 
    color: 'bg-sky-300', 
    icon: Wind, 
    images: ['/pets/wind_1.png', '/pets/wind_2.png', '/pets/wind_3.png', '/pets/wind_4.png', '/pets/wind_5.png'],
    stages: ['小风鹰', '疾风鹰', '九天神鹰', '裂空座驾', '无尽风暴皇'],
    skills: [
      { name: '风刃', damage: 20, effect: '锐利的气流切割', type: 'attack' },
      { name: '顺风', damage: 0, effect: '提升自身攻击力', type: 'buff' },
      { name: '裂空神风', damage: 55, effect: '撕裂空间的飓风', type: 'attack' }
    ]
  },
  ice: { 
    name: '冰晶龙', 
    color: 'bg-cyan-200', 
    icon: Snowflake, 
    images: ['/pets/ice_1.png', '/pets/ice_2.png', '/pets/ice_3.png', '/pets/ice_4.png', '/pets/ice_5.png'],
    stages: ['小冰龙', '冰晶龙', '极寒冰皇', '绝对零度', '永恒冰封神'],
    skills: [
      { name: '冰锥', damage: 22, effect: '寒冷的冰刺', type: 'attack' },
      { name: '白雾', damage: 0, effect: '降低对手攻击力', type: 'debuff' },
      { name: '永恒冻土', damage: 60, effect: '绝对零度的封印', type: 'attack' }
    ]
  },
  metal: { 
    name: '钢甲犀', 
    color: 'bg-slate-400', 
    icon: Shield, 
    images: ['/pets/metal_1.png', '/pets/metal_2.png', '/pets/metal_3.png', '/pets/metal_4.png', '/pets/metal_5.png'],
    stages: ['铁甲犀', '钢甲犀', '合金战神', '机械主宰', '不灭金刚神'],
    skills: [
      { name: '铁头功', damage: 24, effect: '坚硬的头部撞击', type: 'attack' },
      { name: '铁壁', damage: 0, effect: '大幅提升防御力', type: 'buff' },
      { name: '不灭神拳', damage: 55, effect: '无坚不摧的重拳', type: 'attack' }
    ]
  },
  dragon: { 
    name: '星空龙', 
    color: 'bg-indigo-600', 
    icon: Dna, 
    images: ['/pets/dragon_1.png', '/pets/dragon_2.png', '/pets/dragon_3.png', '/pets/dragon_4.png', '/pets/dragon_5.png'],
    stages: ['幼星龙', '星空龙', '宇宙神龙', '万龙之祖', '混沌虚空神'],
    skills: [
      { name: '龙之吐息', damage: 28, effect: '古老的龙息攻击', type: 'attack' },
      { name: '龙之舞', damage: 0, effect: '同时提升攻防', type: 'buff' },
      { name: '混沌龙吟', damage: 65, effect: '震撼宇宙的咆哮', type: 'attack' }
    ]
  },
};

export const EVOLUTION_NAMES = [
  ['幼年期', '成长期', '完全体'],
  ['初级', '中级', '高级'],
  ['萌芽', '绽放', '永恒']
];

export const PET_ITEMS: Record<string, { name: string; type: 'food' | 'cleaning' | 'toy'; effect: number; description: string }> = {
  // Food
  'food_1': { name: '普通口粮', type: 'food', effect: 15, description: '基础的宠物口粮，饱食度+15' },
  'food_2': { name: '美味罐头', type: 'food', effect: 30, description: '营养丰富的罐头，饱食度+30' },
  'food_3': { name: '高级能量棒', type: 'food', effect: 50, description: '高能量压缩食品，饱食度+50' },
  'food_4': { name: '满汉全席', type: 'food', effect: 100, description: '豪华大餐，饱食度直接加满' },
  // Cleaning
  'clean_1': { name: '简易毛刷', type: 'cleaning', effect: 15, description: '简单的清洁，整洁度+15' },
  'clean_2': { name: '香氛沐浴露', type: 'cleaning', effect: 30, description: '带有香味的洗澡，整洁度+30' },
  'clean_3': { name: '全自动洗澡机', type: 'cleaning', effect: 50, description: '深度清洁，整洁度+50' },
  'clean_4': { name: '圣泉洗礼', type: 'cleaning', effect: 100, description: '神圣的清洁，整洁度直接加满' },
  // Toys
  'toy_1': { name: '逗宠棒', type: 'toy', effect: 15, description: '简单的互动，心情+15' },
  'toy_2': { name: '皮球', type: 'toy', effect: 30, description: '开心的玩耍，心情+30' },
  'toy_3': { name: '智能游戏机', type: 'toy', effect: 50, description: '沉浸式游戏，心情+50' },
  'toy_4': { name: '游乐场门票', type: 'toy', effect: 100, description: '疯狂的一天，心情直接加满' },
};

export const MAX_STUDENTS_PER_CLASS = 10;
export const TICK_RATE = 1000 * 60; // 1 minute for logic updates
export const DEGRADATION_RATE = 0.001; // hunger/cleanliness loss per tick (approx 7 days to 0)

export const TYPE_EFFECTIVENESS: Record<PetType, Partial<Record<PetType, number>>> = {
  fire: { grass: 2, ice: 2, metal: 2, water: 0.5, dragon: 0.5, fire: 0.5, earth: 0.5 },
  water: { fire: 2, earth: 2, water: 0.5, grass: 0.5, dragon: 0.5 },
  grass: { water: 2, earth: 2, fire: 0.5, grass: 0.5, wind: 0.5, metal: 0.5, dragon: 0.5 },
  electric: { water: 2, wind: 2, electric: 0.5, grass: 0.5, dragon: 0.5, earth: 0 },
  earth: { fire: 2, electric: 2, metal: 2, grass: 0.5, wind: 0.5 },
  wind: { grass: 2, electric: 0.5, metal: 0.5 },
  ice: { grass: 2, earth: 2, wind: 2, dragon: 2, fire: 0.5, water: 0.5, ice: 0.5, metal: 0.5 },
  metal: { ice: 2, psychic: 2, fire: 0.5, water: 0.5, electric: 0.5, metal: 0.5 },
  light: { dark: 2, dragon: 2, psychic: 0.5, metal: 0.5 },
  dark: { psychic: 2, light: 2, dark: 0.5, metal: 0.5 },
  dragon: { dragon: 2, metal: 0.5 },
  psychic: { earth: 2, psychic: 0.5, metal: 0.5, dark: 0 },
};
