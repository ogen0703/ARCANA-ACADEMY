/**
 * 複合魔法と魔法研究室(世界設定書 Phase 5b でげんたが承認:https://claude.ai/artifact/A33ABXNpMdXdt1CcguN3Hv)。
 * 純粋関数。基本ステータス・性格・魔法適性は変えない(読むだけ)。研究で増えるのは熟練度と、覚えた複合魔法だけ。
 */
import { MAGIC_LABELS, type Character, type MagicKey, type StatHistory } from "../../schemas";
import { P } from "../growth/rules";
import { COURSES, HOUSES, spellById } from "./content";
import { proficiencyOf } from "./engine";

export type Compound = { id: string; name: string; a: string; b: string; effect: string; use: string; house?: string };
export const COMPOUNDS: Compound[] = [
  { id: "c-stormnet", name: "嵐織りの網", a: "elemental-2", b: "creation-2", effect: "風と光の糸で網を張り、動きを止める", use: "戦闘で相手を1ターン止める", house: "dawnfire" },
  { id: "c-mend", name: "寄り添いの雫", a: "mind-2", b: "nature-2", effect: "心と体を同時に癒やす", use: "戦闘で体力と精神力を回復", house: "moonshade" },
  { id: "c-starlock", name: "星読みの錠", a: "astral-2", b: "ancient-2", effect: "星の配置から封印のしくみを読み解く", use: "探索で封じられた場所をひらく", house: "starring" },
  { id: "c-meteor", name: "流星の矢", a: "elemental-2", b: "astral-2", effect: "星の軌道に乗せて矢を放つ", use: "戦闘で硬い殻も貫く攻撃" },
  { id: "c-moonmed", name: "月の瞑想", a: "mind-1", b: "astral-1", effect: "月明かりの下で心を整える", use: "戦闘で毎ターン魔力が多く回復" },
  { id: "c-flamescript", name: "焔文字", a: "elemental-1", b: "ancient-1", effect: "炎で文字を描き、古い仕掛けに語りかける", use: "探索で碑文や写本の仕掛けを動かす" },
  { id: "c-nightbloom", name: "夜咲きの灯", a: "astral-1", b: "nature-1", effect: "夜にだけ咲く光る花を咲かせる", use: "保護区で夜の生き物に出会いやすくなる" },
  { id: "c-sapling", name: "若木の細工", a: "creation-1", b: "nature-1", effect: "生きた木から道具の部品をつくる", use: "杖づくりに星の欠片がいらなくなる" },
  { id: "c-oldvoice", name: "古き声の通訳", a: "mind-2", b: "ancient-1", effect: "古代の言葉で生き物と心を通わせる", use: "保護区で古代の生き物に近づきやすい" },
];
export const compoundById = (id: string) => COMPOUNDS.find((c) => c.id === id);
/** 呪文でも複合魔法でも名前を返す */
export const magicName = (id: string) => spellById(id)?.name ?? compoundById(id)?.name ?? id;
/** 呪文の系統(複合魔法は1つ目の呪文の系統) */
export const magicSystem = (id: string): MagicKey | undefined => spellById(id)?.system ?? spellById(compoundById(id)?.a ?? "")?.system;
/** 呪文か複合魔法を知っているか */
export const knows = (ch: Character, id: string) => ch.learnedSpells.includes(id) || ch.world.compounds.includes(id);

const houseId = (ch: Character) => HOUSES.find((h) => h.name === ch.history.house)?.id;
export const findRecipe = (a: string, b: string) => COMPOUNDS.find((c) => (c.a === a && c.b === b) || (c.a === b && c.b === a));
/** その複合魔法を覚えるのに要る研究の段数(自分の寮の秘術は2段) */
export const stepsFor = (ch: Character, c: Compound) => (c.house && c.house === houseId(ch) ? P.researchStepsHouse : P.researchSteps);
export const progressOf = (ch: Character, id: string) => ch.world.research[id] ?? 0;

/** はずれたときのヒント(まだ覚えていない複合魔法で、選んだ呪文を使うもの) */
function hintFor(ch: Character, a: string, b: string) {
  for (const id of [a, b]) {
    const c = COMPOUNDS.find((x) => !ch.world.compounds.includes(x.id) && (x.a === id || x.b === id));
    if (c) {
      const partner = c.a === id ? c.b : c.a, sys = spellById(partner)!.system;
      return `「${spellById(id)!.name}」は、${MAGIC_LABELS[sys].name}の呪文と響き合いそうだ`;
    }
  }
  return "この2つは、いまは何も起きないようだ。ほかの組み合わせを試そう";
}

export type ResearchResult = { kind: "progress" | "learned" | "weak" | "miss"; compound: Compound | null; step: number; steps: number; hint: string; prof: Partial<Record<MagicKey, number>> };

/** 研究を1回する(1日1回。数は呼ぶ側が数えて todayCount を渡す) */
export function research(ch: Character, input: { id: string; a: string; b: string; todayCount: number }, now: string, newId: () => string) {
  const { a, b } = input;
  if (input.todayCount >= P.researchPerDay) throw new Error(`今日の研究はもう${P.researchPerDay}回しました。また明日`);
  const sa = spellById(a), sb = spellById(b);
  if (!sa || !sb || !ch.learnedSpells.includes(a) || !ch.learnedSpells.includes(b)) throw new Error("覚えた呪文を2つ選んでね");
  if (sa.system === sb.system) throw new Error("違う系統の呪文を組み合わせよう");
  const history: StatHistory[] = [];
  // 研究そのもので、選んだ2つの講座の熟練度が少し上がる
  const prof: Partial<Record<MagicKey, number>> = {}; const p = { ...ch.academy.proficiency };
  for (const k of [sa.system, sb.system]) { const add = Math.min(P.researchProf, 100 - proficiencyOf(ch, k)); prof[k] = add; p[k] = Math.round((proficiencyOf(ch, k) + add) * 10) / 10; }
  let next: Character = { ...ch, academy: { ...ch.academy, proficiency: p }, updatedAt: now };
  const c = findRecipe(a, b);
  let r: ResearchResult;
  if (!c || ch.world.compounds.includes(c.id)) {
    r = { kind: "miss", compound: null, step: 0, steps: 0, hint: c ? `「${c.name}」はもう覚えている` : hintFor(ch, a, b), prof };
  } else if ((ch.magicAffinity[sa.system].value ?? 0) < P.researchAffinity || (ch.magicAffinity[sb.system].value ?? 0) < P.researchAffinity) {
    const low = [sa.system, sb.system].filter((k) => (ch.magicAffinity[k].value ?? 0) < P.researchAffinity).map((k) => MAGIC_LABELS[k].name);
    r = { kind: "weak", compound: c, step: progressOf(ch, c.id), steps: stepsFor(ch, c), hint: `何かが起きかけたが、${low.join("と")}の力がまだ足りない(魔法適性${P.researchAffinity}から)。現実の経験で育てよう`, prof };
  } else {
    const steps = stepsFor(ch, c), step = progressOf(ch, c.id) + 1;
    const learned = step >= steps;
    next = { ...next, world: { ...next.world, research: { ...next.world.research, [c.id]: step }, compounds: learned ? [...next.world.compounds, c.id] : next.world.compounds } };
    if (learned) history.push({ id: newId(), at: now, eventId: input.id, kind: "compound", key: c.id, before: 0, after: 1 });
    r = { kind: learned ? "learned" : "progress", compound: c, step, steps, hint: learned ? "" : `「${c.name}」の手ごたえ。あと${steps - step}回の研究で形になる`, prof };
  }
  return { character: next, history, result: r };
}

/** 図鑑用:見つけた数と全体 */
export const compoundCount = (ch: Character) => ({ found: ch.world.compounds.length, total: COMPOUNDS.length });
export const courseName = (k: MagicKey) => COURSES[k].name;
