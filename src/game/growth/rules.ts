/**
 * 成長ルールのパラメータ。
 * GDDに数値の決まりがない項目は「仮」の値。変えるときは docs/GDD.md の「ルールの仮パラメータ」と CHANGELOG を更新する。
 */
import type { CategoryKey, MagicKey, PersonalityKey, StatKey } from "../../schemas";

export const RULES_VERSION = "rules-v2";

export const CATEGORY_DEFS: Record<CategoryKey, {
  label: string; example: string;
  stats: Partial<Record<StatKey, number>>; // 合計 1.0 の配分
  personality: Partial<Record<PersonalityKey, number>>;
  magic: Partial<Record<MagicKey, number>>;
}> = {
  // GDD 7章の変換例に沿う
  sports: { label: "スポーツ・運動", example: "サッカーの試合・練習", stats: { physical: 0.5, spirit: 0.25, willpower: 0.25 }, personality: { competitiveness: 1, patience: 0.5 }, magic: { elemental: 1 } },
  creative: { label: "創作", example: "画像制作・動画編集・文章", stats: { creativity: 0.5, intellect: 0.25, sensitivity: 0.25 }, personality: { curiosity: 0.5 }, magic: { creation: 1 } },
  learning: { label: "学び", example: "新しい知識の習得・勉強", stats: { intellect: 0.7, spirit: 0.3 }, personality: { inquisitiveness: 1 }, magic: { astral: 0.5, ancient: 0.5 } },
  relationship: { label: "人とのつながり", example: "人間関係の構築・オフ会", stats: { bond: 0.6, sensitivity: 0.4 }, personality: { empathy: 1 }, magic: { mind: 1 } },
  challenge: { label: "新しい挑戦", example: "初めてのことに挑む", stats: { willpower: 0.6, spirit: 0.4 }, personality: { adventurousness: 1, decisiveness: 0.5 }, magic: { astral: 1 } },
  work: { label: "仕事", example: "商談・提案・プロジェクト", stats: { intellect: 0.35, bond: 0.35, spirit: 0.3 }, personality: { responsibility: 1 }, magic: { mind: 0.5, astral: 0.5 } },
  music: { label: "音楽・歌", example: "カラオケ配信・歌の練習", stats: { sensitivity: 0.4, creativity: 0.4, spirit: 0.2 }, personality: { curiosity: 0.5 }, magic: { mind: 0.5, creation: 0.5 } },
  reflection: { label: "振り返り・内省", example: "日記・自己分析", stats: { spirit: 0.5, intellect: 0.25, sensitivity: 0.25 }, personality: { prudence: 1 }, magic: { mind: 1 } },
  other: { label: "その他", example: "どれにも当てはまらない経験", stats: { willpower: 0.5, spirit: 0.5 }, personality: {}, magic: {} },
};

export const DIFFICULTY_LABELS = ["", "かんたん", "ふつう", "がんばった", "かなり大変", "限界突破"] as const;

export const P = {
  initialStat: 10, // 仮:初期ステータス(初期診断はPhase 3)
  basePoints: [0, 1, 2, 3, 5, 8], // 難易度ごとの基本ポイント
  durationFullMinutes: 120, // この時間で継続ボーナス最大
  durationMaxBonus: 0.5, // 最大+50%
  reflectionMinChars: 30, // これ以上の振り返りで+20%
  reflectionBonus: 0.2,
  repeatWindowDays: 7, // 同じ経験の繰り返し判定の期間
  repeatDecay: 0.5, // 1回繰り返すごとに 1/(1+0.5n)
  expPerPoint: 10,
  perEventStatCap: 3, // 1回の経験で1能力が上がる上限
  imbalanceMargin: 30, // 平均+30を超えた能力は伸びが半分
  statMax: 100,
  // ---- Phase 3(仮)----
  aiSignalWeight: 1, // AIが読み取った傾向(0〜1)を、ルールの兆しと同じ重みで足す
  personalityMinEvidence: 5, // 根拠になる経験がこの数たまったら性格の値が形になる
  personalityScale: 15, // 性格の値 = 20 + 80×(1−e^(−兆しの合計/15))
  affinityGrowthMax: 30, // 魔法適性 = 診断の基礎値 + 30×(1−e^(−兆しの合計/20))
  affinityScale: 20,
  diagnosisMin: 20, // 入学診断の基礎値:いちばん強い系統が 70、ほかは割合で 20〜70
  diagnosisRange: 50,
  // ---- Phase 4a 授業と魔法(世界設定書で承認)----
  lessonsPerDay: 3, // 全講座あわせて1日3コマ
  lessonProf: 10, // 1コマの熟練度
  lessonProfCorrect: 5, // 確認の問いに正解
  lessonRepeatFactor: 0.5, // 同じ単元の2回目以降
  lessonExp: 5,
  lessonExpCorrect: 3,
  spellBasicProf: 30, // 初級:熟練度30(単元3まで)
  spellMidProf: 60, spellMidStat: 25, spellMidSignals: 5, // 中級:熟練度60(単元5まで)+能力値25+兆し5
  spellAdvProf: 100, spellAdvStat: 45, spellAdvAffinity: 60, // 上級:熟練度100+単元8+能力値45+適性60
  // ---- Phase 5b 上級課程・複合魔法・見た目(世界設定書で承認)----
  advancedProf: 60, advancedTrust: 40, // 上級課程(単元6〜8):単元5+熟練度60+先生の信頼40
  lessonProfAdvanced: 12, lessonProfAdvancedCorrect: 6,
  researchPerDay: 1, researchSteps: 3, researchStepsHouse: 2, researchAffinity: 35, researchProf: 3,
  rankApprentice: { level: 1 }, rankMage: { level: 10, mid: 3 }, rankArchmage: { level: 20, adv: 2 },
  auraSteps: [40, 60, 80], // オーラが強くなる適性
  turningPoint: 5, turningDays: 30, // 30日で性格が5以上動いたら「心の転機」
  // ---- Phase 5c 第1章「七つ目の星」(世界設定書で承認)----
  storyExp: 5, // 場面を読むと EXP +5(1日1場面)
  storyRealDays6: 10, storyRealDays8: 14, // 場面6・8:現実の経験を承認した日の通算
  storyTrust: 5, storyProf: 5, // 選択で信頼+5・熟練度+5
  storyNightVisits: 3, storyTrustC: 40, // 道B:夜の保護区3回 / 道C:先生2人と仲間2人の信頼40
  sevenstarStart: 8, sevenstarLiked: 4, sevenstarOther: 2, sevenstarSpell: 3, // 七つ星の仔と心を通わせる
  sevenstarReal: 3, sevenstarRealMax: 9, // 現実の経験で+3(1日最大+9)
  awakenTurns: 3, awakenMult: 1.5, // 覚醒:3ターン、呪文の魔力半分・威力1.5倍
  houseFormalTrust: 70, // 寮の正装:自分の寮の仲間の信頼70
  // ---- Phase 4b 探索とクエスト(世界設定書で承認)----
  explorePerDay: 2,
  exploreExpPerRoom: 2, exploreExpMax: 10,
  teacherQuestProf: 10,
  weeklyQuestExp: 20, weeklyQuestCount: 3, streakWeeks: 4,
  // ---- Phase 4d 交流(世界設定書で承認。会話は1人1日5回にげんたが変更)----
  talksPerDay: 5, // 1人あたり。1回目は話題つき、2回目からはひとこと
  trustHit: 8, trustOther: 4, trustResonate: 10, trustChat: 1, trustGiftLiked: 10, trustGift: 3,
  trustLessonStage: 40, trustLessonMult: 1.2, trustTitle: 70,
  // ---- Phase 5a 魔法生物と相棒(世界設定書で承認)----
  sanctuaryPerDay: 3, approachesPerVisit: 3,
  distanceStart: 10, distanceAffinity: 2, distancePersonality: 1, distanceCarryMax: 3,
  approachLiked: 4, approachOffer: 4, approachSpell: 3, approachOther: 1,
  feedAffection: 8, playAffection: 3, playsPerDay: 2,
  realAffection: 2, realAffectionMax: 6,
  companionStageMult: [1, 1.2, 1.5],
};

/** 次のレベルまでに必要な経験値(レベルLからL+1) */
export const expToNext = (level: number) => 100 + 50 * (level - 1);
