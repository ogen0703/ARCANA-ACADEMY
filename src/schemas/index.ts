import { z } from "zod";

/* ---------- 定数(GDD 5章・6章) ---------- */
export const STAT_KEYS = ["intellect", "spirit", "sensitivity", "creativity", "willpower", "bond", "physical"] as const;
export type StatKey = (typeof STAT_KEYS)[number];
export const STAT_LABELS: Record<StatKey, { name: string; desc: string }> = {
  intellect: { name: "知性", desc: "知識、分析、学習能力" },
  spirit: { name: "精神", desc: "忍耐、冷静さ、精神耐性" },
  sensitivity: { name: "感受性", desc: "感情理解、共感、芸術性" },
  creativity: { name: "創造性", desc: "発想、表現、創作能力" },
  willpower: { name: "意志力", desc: "決断、挑戦、継続力" },
  bond: { name: "絆", desc: "信頼、協力、人間関係" },
  physical: { name: "身体能力", desc: "体力、運動、反応能力" },
};

export const PERSONALITY_KEYS = ["curiosity", "inquisitiveness", "independence", "empathy", "competitiveness", "adventurousness", "prudence", "patience", "decisiveness", "responsibility"] as const;
export type PersonalityKey = (typeof PERSONALITY_KEYS)[number];
export const PERSONALITY_LABELS: Record<PersonalityKey, string> = {
  curiosity: "好奇心", inquisitiveness: "探究心", independence: "独立心", empathy: "共感性", competitiveness: "負けず嫌い",
  adventurousness: "冒険心", prudence: "慎重さ", patience: "忍耐力", decisiveness: "決断力", responsibility: "責任感",
};

export const MAGIC_KEYS = ["astral", "mind", "creation", "nature", "elemental", "ancient"] as const;
export type MagicKey = (typeof MAGIC_KEYS)[number];
export const MAGIC_LABELS: Record<MagicKey, { name: string; desc: string }> = {
  astral: { name: "星辰魔法", desc: "星、空間、天体、運命" },
  mind: { name: "精神魔法", desc: "精神、記憶、感情、認識" },
  creation: { name: "創造魔法", desc: "具現化、錬成、構築、創作" },
  nature: { name: "自然魔法", desc: "植物、生命、動物、自然" },
  elemental: { name: "元素魔法", desc: "炎、水、風、土、雷" },
  ancient: { name: "古代魔法", desc: "未知の法則、特殊能力、禁術" },
};

/* ---------- 共通 ---------- */
const iso = z.string().min(1);
const stat0to100 = z.number().min(0).max(100);
export const StatsSchema = z.object(Object.fromEntries(STAT_KEYS.map((k) => [k, stat0to100])) as Record<StatKey, typeof stat0to100>);
export type Stats = z.infer<typeof StatsSchema>;

/** 性格:長期の行動から形成。根拠(evidence:経験の数、weight:兆しの強さの合計)がたまるまでは未形成(null) */
const personalityValue = z.object({ value: z.number().min(0).max(100).nullable(), evidence: z.number().int().min(0), weight: z.number().min(0).default(0) });
export const PersonalitySchema = z.object(Object.fromEntries(PERSONALITY_KEYS.map((k) => [k, personalityValue])) as Record<PersonalityKey, typeof personalityValue>);

/** 魔法適性:入学診断で base を決め、経験の兆し(signals)で伸びる。診断前は未診断(null) */
const affinityValue = z.object({ value: z.number().min(0).max(100).nullable(), signals: z.number().min(0), base: z.number().min(0).max(100).nullable().default(null) });
export const MagicAffinitySchema = z.object(Object.fromEntries(MAGIC_KEYS.map((k) => [k, affinityValue])) as Record<MagicKey, typeof affinityValue>);

/* ---------- プレイヤー(現実の情報。ゲーム内キャラクターとは分離) ---------- */
export const PlayerProfileSchema = z.object({
  id: z.literal("player"),
  displayName: z.string().min(1),
  gender: z.string().optional(),
  birthday: z.string().optional(),
  photoConsent: z.boolean(),
  aiSendConsent: z.boolean(),
  updatedAt: iso,
});
export type PlayerProfile = z.infer<typeof PlayerProfileSchema>;

/* ---------- キャラクター ---------- */
export const CharacterSchema = z.object({
  id: z.literal("hero"),
  name: z.string().min(1).max(30),
  createdAt: iso,
  updatedAt: iso,
  level: z.number().int().min(1),
  experience: z.number().int().min(0),
  appearance: z.object({ hairColor: z.string(), eyeColor: z.string(), robe: z.string(), aura: z.string() }),
  basicStats: StatsSchema,
  personality: PersonalitySchema,
  magicAffinity: MagicAffinitySchema,
  learnedSpells: z.array(z.string()),
  inventory: z.array(z.object({ id: z.string(), name: z.string(), qty: z.number().int() })),
  titles: z.array(z.object({ id: z.string(), name: z.string(), at: iso })),
  achievements: z.array(z.object({ id: z.string(), name: z.string(), at: iso })),
  relationships: z.array(z.object({ id: z.string(), name: z.string(), bond: z.number() })),
  /** 生い立ち・物語上の設定(出身:未解明 など) */
  history: z.object({ origin: z.string(), house: z.string().nullable(), wand: z.string().nullable(), wizardAge: z.string().nullable() }),
  appliedEventIds: z.array(z.string()),
  /** 入学診断をした日時(1回だけ) */
  diagnosedAt: iso.nullable().default(null),
  /** 学院生活(Phase 4a):講座ごとの熟練度と、単元ごとの受講回数 */
  academy: z.object({
    proficiency: z.record(z.enum(MAGIC_KEYS), z.number().min(0).max(100)).default({}),
    units: z.record(z.enum(MAGIC_KEYS), z.array(z.number().int().min(0))).default({}),
  }).default({ proficiency: {}, units: {} }),
  /** 探索とクエスト(Phase 4b):集めた発見、部屋の通り方の記録(物語で参照。性格の値には使わない)、終えたクエスト、表示する称号 */
  world: z.object({
    discoveries: z.array(z.string()).default([]),
    clears: z.record(z.string(), z.array(z.string())).default({}),
    quests: z.array(z.string()).default([]),
    activeTitle: z.string().nullable().default(null),
    /** 決闘演習場で勝ったことのある相手(Phase 4c) */
    defeated: z.array(z.string()).default([]),
    /** 学院の人たち(Phase 4d):次の話題の番号と、選んだ答えの記録(物語で参照。性格の値には使わない) */
    npcTopics: z.record(z.string(), z.number().int().min(0)).default({}),
    answers: z.array(z.string()).default([]),
    /** 魔法生物(Phase 5a):仲間か・出会った回数・なつき度、相棒、現実の経験で相棒が育った量(1日) */
    creatures: z.record(z.string(), z.object({ friend: z.boolean(), attempts: z.number().int().min(0), affection: z.number().min(0).max(100) })).default({}),
    companion: z.string().nullable().default(null),
    companionDaily: z.object({ date: z.string(), gained: z.number().min(0) }).default({ date: "", gained: 0 }),
  }).default({ discoveries: [], clears: {}, quests: [], activeTitle: null, defeated: [], npcTopics: {}, answers: [], creatures: {}, companion: null, companionDaily: { date: "", gained: 0 } }),
});
export type Character = z.infer<typeof CharacterSchema>;

/* ---------- 経験イベント(GDD 7章・指示書 6章) ---------- */
export const CATEGORY_KEYS = ["sports", "creative", "learning", "relationship", "challenge", "work", "music", "reflection", "other"] as const;
export type CategoryKey = (typeof CATEGORY_KEYS)[number];

export const GrowthSchema = z.object({
  exp: z.number().int().min(0),
  stats: z.record(z.enum(STAT_KEYS), z.number()),
  personalitySignals: z.record(z.enum(PERSONALITY_KEYS), z.number()),
  magicSignals: z.record(z.enum(MAGIC_KEYS), z.number()),
  notes: z.array(z.string()),
  engine: z.string(),
});
export type Growth = z.infer<typeof GrowthSchema>;

/**
 * AIによる経験の読み取り(Phase 3)。能力値には使わず、性格と魔法適性の「兆し」にだけ足す。
 * 数値は 0〜1(その傾向がどれくらい表れているか)。確定データとは分けて持つ
 */
const unit = z.number().min(0).max(1);
export const AiInsightSchema = z.object({
  by: z.string().min(1).max(40),
  at: iso,
  summary: z.string().max(300),
  personality: z.record(z.enum(PERSONALITY_KEYS), unit).default({}),
  magic: z.record(z.enum(MAGIC_KEYS), unit).default({}),
  reasons: z.array(z.string().max(120)).max(5).default([]),
});
export type AiInsight = z.infer<typeof AiInsightSchema>;

export const ANALYSIS_STATUS = ["pending", "proposed", "applied", "rejected"] as const;
export const ExperienceEventSchema = z.object({
  id: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  source: z.enum(["manual", "diary", "markdown", "csv", "ai"]),
  category: z.enum(CATEGORY_KEYS),
  title: z.string().min(1).max(80),
  description: z.string().max(2000),
  difficulty: z.number().int().min(1).max(5),
  /** 分 */
  duration: z.number().int().min(0).max(24 * 60),
  reflection: z.string().max(2000),
  analysisStatus: z.enum(ANALYSIS_STATUS),
  proposedGrowth: GrowthSchema.nullable(),
  approvedGrowth: GrowthSchema.nullable(),
  createdAt: iso,
  appliedAt: iso.nullable(),
  /** 取り込み元の目印(同じ記録を2回取り込まないため)。手入力は無し */
  sourceRef: z.string().max(200).optional(),
  ai: AiInsightSchema.optional(),
});
export type ExperienceEvent = z.infer<typeof ExperienceEventSchema>;

/* ---------- 成長履歴 ---------- */
export const StatHistorySchema = z.object({
  id: z.string(),
  at: iso,
  eventId: z.string(),
  kind: z.enum(["stat", "exp", "level", "spell"]),
  key: z.string(),
  before: z.number(),
  after: z.number(),
});
export type StatHistory = z.infer<typeof StatHistorySchema>;

/* ---------- 授業の記録(Phase 4a) ---------- */
export const LessonLogSchema = z.object({
  id: z.string(),
  at: iso,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  course: z.enum(MAGIC_KEYS),
  unit: z.number().int().min(0),
  correct: z.boolean(),
  prof: z.number(),
  exp: z.number().int().min(0),
});
export type LessonLog = z.infer<typeof LessonLogSchema>;

/* ---------- 探索の記録(Phase 4b) ---------- */
export const ExploreLogSchema = z.object({
  id: z.string(),
  at: iso,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  place: z.string(),
  steps: z.array(z.object({ room: z.string(), method: z.string() })),
  items: z.record(z.string(), z.number().int()),
  discoveries: z.array(z.string()),
  exp: z.number().int().min(0),
  completed: z.boolean(),
});
export type ExploreLog = z.infer<typeof ExploreLogSchema>;

/* ---------- 戦闘の記録(Phase 4c) ---------- */
export const BattleLogSchema = z.object({
  id: z.string(),
  at: iso,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  opp: z.string(),
  result: z.enum(["win", "lose", "draw", "retreat"]),
  turns: z.number().int().min(0),
  rewarded: z.boolean(),
  exp: z.number().int().min(0),
  items: z.record(z.string(), z.number().int()),
});
export type BattleLog = z.infer<typeof BattleLogSchema>;

/* ---------- 交流の記録(Phase 4d) ---------- */
export const TalkLogSchema = z.object({
  id: z.string(),
  at: iso,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  npc: z.string(),
  kind: z.enum(["talk", "chat", "gift", "receive"]),
  gain: z.number().min(0),
  detail: z.string().max(80).default(""),
});
export type TalkLog = z.infer<typeof TalkLogSchema>;

/* ---------- 保護区の記録(Phase 5a) ---------- */
export const SanctuaryLogSchema = z.object({
  id: z.string(),
  at: iso,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  kind: z.enum(["visit", "feed", "play"]),
  creature: z.string(),
  result: z.enum(["friend", "left", ""]).default(""),
  actions: z.array(z.string()).default([]),
});
export type SanctuaryLog = z.infer<typeof SanctuaryLogSchema>;

/* ---------- エクスポート ---------- */
export const ExportSchema = z.object({
  app: z.literal("arcana-academy"),
  schemaVersion: z.number().int(),
  exportedAt: iso,
  player: PlayerProfileSchema.nullable(),
  character: CharacterSchema.nullable(),
  experiences: z.array(ExperienceEventSchema),
  statHistory: z.array(StatHistorySchema),
  lessonLog: z.array(LessonLogSchema).default([]),
  exploreLog: z.array(ExploreLogSchema).default([]),
  battleLog: z.array(BattleLogSchema).default([]),
  talkLog: z.array(TalkLogSchema).default([]),
  sanctuaryLog: z.array(SanctuaryLogSchema).default([]),
});
export type ExportData = z.infer<typeof ExportSchema>;

/* ---------- 経験の取り込み(GDD 7章 入力方法) ---------- */
export const ImportItemSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  category: z.enum(CATEGORY_KEYS),
  title: z.string().min(1).max(80),
  description: z.string().max(2000).default(""),
  difficulty: z.number().int().min(1).max(5).default(2),
  duration: z.number().int().min(0).max(24 * 60).default(0),
  reflection: z.string().max(2000).default(""),
  sourceRef: z.string().max(200).optional(),
  ai: AiInsightSchema.optional(),
});
export type ImportItem = z.infer<typeof ImportItemSchema>;
export const ImportFileSchema = z.object({
  app: z.literal("arcana-academy-experiences"),
  source: z.enum(["markdown", "csv", "diary", "ai"]).default("markdown"),
  note: z.string().optional(),
  items: z.array(ImportItemSchema).max(500),
});
