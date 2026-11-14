/**
 * 性格の形成と魔法適性(Phase 3)。純粋関数。値の決め方は rules.ts の P(仮パラメータ)。
 */
import { MAGIC_KEYS, type Character, type MagicKey } from "../../schemas";
import { P } from "./rules";

/** 性格の値。根拠の経験が足りないあいだは null(1回の行動で決めない) */
export function personalityValue(evidence: number, weight: number): number | null {
  if (evidence < P.personalityMinEvidence) return null;
  return Math.round(20 + 80 * (1 - Math.exp(-weight / P.personalityScale)));
}

/** 魔法適性の値。入学診断の前は null */
export function affinityValue(base: number | null, signals: number): number | null {
  if (base == null) return null;
  return Math.min(100, Math.round(base + P.affinityGrowthMax * (1 - Math.exp(-signals / P.affinityScale))));
}

/* ---------- 入学診断(魔法適性の初期判定) ---------- */
export type DiagnosisQuestion = { q: string; options: { text: string; magic: MagicKey }[] };
export const DIAGNOSIS: DiagnosisQuestion[] = [
  { q: "夜、学院の塔でひとりの時間ができた。何をする?", options: [
    { text: "星図を広げて、星の動きを追う", magic: "astral" }, { text: "今日の会話を思い返す", magic: "mind" },
    { text: "思いついた形を紙に描き起こす", magic: "creation" }, { text: "窓を開けて、夜風と虫の声を感じる", magic: "nature" } ] },
  { q: "むずかしい課題に向き合うとき、まずどうする?", options: [
    { text: "全体の流れを見わたして先を読む", magic: "astral" }, { text: "仲間の気持ちを確かめる", magic: "mind" },
    { text: "とにかく手を動かして試してみる", magic: "creation" }, { text: "体ごとぶつかって突破する", magic: "elemental" } ] },
  { q: "いちばん惹かれる場所は?", options: [
    { text: "古い遺跡の、封じられた扉", magic: "ancient" }, { text: "生き物の気配がする深い森", magic: "nature" },
    { text: "嵐の前の海辺", magic: "elemental" }, { text: "満天の星が見える丘", magic: "astral" } ] },
  { q: "仲間から頼られるのは、どんなとき?", options: [
    { text: "話を聞いて、気持ちを整えるとき", magic: "mind" }, { text: "新しいアイデアを出すとき", magic: "creation" },
    { text: "先頭に立って動くとき", magic: "elemental" }, { text: "誰も知らない答えを探し出すとき", magic: "ancient" } ] },
  { q: "手に入れたい力は?", options: [
    { text: "未来の兆しを読む力", magic: "astral" }, { text: "命を癒やし、育てる力", magic: "nature" },
    { text: "想像したものを形にする力", magic: "creation" }, { text: "失われた法則を解き明かす力", magic: "ancient" } ] },
  { q: "心が満たされるのは、どんな瞬間?", options: [
    { text: "誰かと心が通じたとき", magic: "mind" }, { text: "全力を出し切ったとき", magic: "elemental" },
    { text: "自然の中で深呼吸したとき", magic: "nature" }, { text: "謎が解けたとき", magic: "ancient" } ] },
];

/** 回答(各問の選択肢の番号)から、6系統の基礎値を出す */
export function diagnose(answers: number[]): Record<MagicKey, number> {
  if (answers.length !== DIAGNOSIS.length) throw new Error("すべての問いに答えてください");
  const pts = Object.fromEntries(MAGIC_KEYS.map((k) => [k, 0])) as Record<MagicKey, number>;
  answers.forEach((a, i) => { const o = DIAGNOSIS[i].options[a]; if (!o) throw new Error("回答が正しくありません"); pts[o.magic]++; });
  const max = Math.max(...Object.values(pts));
  return Object.fromEntries(MAGIC_KEYS.map((k) => [k, Math.round(P.diagnosisMin + P.diagnosisRange * (pts[k] / max))])) as Record<MagicKey, number>;
}

/** 診断結果をキャラクターに入れる(1回だけ) */
export function applyDiagnosis(ch: Character, bases: Record<MagicKey, number>, now: string): Character {
  if (ch.diagnosedAt) throw new Error("入学診断はすでに受けています");
  const magicAffinity = { ...ch.magicAffinity };
  for (const k of MAGIC_KEYS) magicAffinity[k] = { ...magicAffinity[k], base: bases[k], value: affinityValue(bases[k], magicAffinity[k].signals) };
  return { ...ch, magicAffinity, diagnosedAt: now, updatedAt: now };
}
