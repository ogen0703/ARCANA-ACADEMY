/**
 * 授業と魔法の習得(Phase 4a)。純粋関数。基本ステータスは変えない(現実の経験だけで伸びる)。
 */
import { MAGIC_KEYS, STAT_LABELS, type Character, type MagicKey, type StatHistory } from "../../schemas";
import { P } from "../growth/rules";
import { addExp } from "../growth/engine";
import { COURSES, SPELLS, UNITS, type Spell } from "./content";
export { houseFor } from "./content";

const r1 = (n: number) => Math.round(n * 10) / 10;
export const proficiencyOf = (ch: Character, k: MagicKey) => ch.academy.proficiency[k] ?? 0;
export const unitCounts = (ch: Character, k: MagicKey) => UNITS[k].map((_, i) => ch.academy.units[k]?.[i] ?? 0);
/** 次に受けられる単元(順番どおり。全部終わっていれば復習で好きな単元) */
export const nextUnit = (ch: Character, k: MagicKey) => { const c = unitCounts(ch, k); const i = c.findIndex((n) => n === 0); return i === -1 ? null : i; };
export const unitOpen = (ch: Character, k: MagicKey, i: number) => i === 0 || unitCounts(ch, k)[i - 1] > 0;

/** 1コマで得るもの */
export function lessonGain(ch: Character, k: MagicKey, unit: number, correct: boolean) {
  const repeat = unitCounts(ch, k)[unit] > 0;
  const aff = ch.magicAffinity[k].value;
  const mult = (aff == null ? 1 : 0.8 + aff / 250) * (repeat ? P.lessonRepeatFactor : 1);
  const prof = r1(Math.min(100 - proficiencyOf(ch, k), (P.lessonProf + (correct ? P.lessonProfCorrect : 0)) * mult));
  const exp = P.lessonExp + (correct ? P.lessonExpCorrect : 0);
  return { prof: Math.max(0, prof), exp, repeat, mult };
}

/** 呪文の習得条件と、満たしているか */
export function spellConditions(ch: Character, sp: Spell) {
  const k = sp.system, c = COURSES[k], prof = proficiencyOf(ch, k), counts = unitCounts(ch, k);
  const stat = ch.basicStats[c.stat], sig = ch.magicAffinity[k].signals, aff = ch.magicAffinity[k].value;
  const conds: { label: string; met: boolean; now: string }[] = [];
  if (sp.tier === "basic") {
    conds.push({ label: `${c.name}の熟練度 ${P.spellBasicProf}`, met: prof >= P.spellBasicProf, now: `${prof}` });
    conds.push({ label: "単元3を受講", met: counts[2] > 0, now: counts[2] > 0 ? "済" : "未" });
  } else if (sp.tier === "intermediate") {
    conds.push({ label: `${c.name}の熟練度 ${P.spellMidProf}`, met: prof >= P.spellMidProf, now: `${prof}` });
    conds.push({ label: "単元5を受講", met: counts[4] > 0, now: counts[4] > 0 ? "済" : "未" });
    conds.push({ label: `${STAT_LABELS[c.stat].name} ${P.spellMidStat}`, met: stat >= P.spellMidStat, now: stat.toFixed(1) });
    conds.push({ label: `現実の経験からの兆し ${P.spellMidSignals}`, met: sig >= P.spellMidSignals, now: sig.toFixed(1) });
  } else {
    conds.push({ label: `${c.name}の熟練度 ${P.spellAdvProf}`, met: prof >= P.spellAdvProf, now: `${prof}` });
    conds.push({ label: `${STAT_LABELS[c.stat].name} ${P.spellAdvStat}`, met: stat >= P.spellAdvStat, now: stat.toFixed(1) });
    conds.push({ label: `魔法適性 ${P.spellAdvAffinity}`, met: (aff ?? 0) >= P.spellAdvAffinity, now: aff == null ? "未診断" : `${aff}` });
    conds.push({ label: "上級の授業(探索・戦闘と一緒に追加予定)", met: false, now: "準備中" });
  }
  return { ok: conds.every((x) => x.met), conds };
}

/** 条件を満たした呪文を覚える(何度呼んでも同じ呪文は1回だけ) */
export function learnSpells(ch: Character, eventId: string, now: string, newId: () => string, history: StatHistory[]): { character: Character; learned: Spell[] } {
  const learned = SPELLS.filter((sp) => !ch.learnedSpells.includes(sp.id) && spellConditions(ch, sp).ok);
  for (const sp of learned) history.push({ id: newId(), at: now, eventId, kind: "spell", key: sp.id, before: 0, after: 1 });
  return { character: learned.length ? { ...ch, learnedSpells: [...ch.learnedSpells, ...learned.map((s) => s.id)] } : ch, learned };
}

/** 授業を1コマ受ける。1日の上限は呼ぶ側(保存の層)で数えて todayCount を渡す */
export function applyLesson(ch: Character, input: { id: string; course: MagicKey; unit: number; correct: boolean; todayCount: number }, now: string, newId: () => string) {
  const { course: k, unit } = input;
  if (input.todayCount >= P.lessonsPerDay) throw new Error(`今日の授業はもう${P.lessonsPerDay}コマ受けました。また明日`);
  if (!UNITS[k][unit]) throw new Error("その単元はありません");
  if (!unitOpen(ch, k, unit)) throw new Error("前の単元を先に受けてね");
  const g = lessonGain(ch, k, unit, input.correct);
  const history: StatHistory[] = [];
  const counts = unitCounts(ch, k); counts[unit]++;
  let next: Character = {
    ...ch,
    academy: { proficiency: { ...ch.academy.proficiency, [k]: r1(proficiencyOf(ch, k) + g.prof) }, units: { ...ch.academy.units, [k]: counts } },
  };
  next = addExp(next, g.exp, input.id, now, newId, history);
  const { character, learned } = learnSpells(next, input.id, now, newId, history);
  return { character: { ...character, updatedAt: now }, history, gain: g, learned };
}

export const basesOf = (ch: Character) => Object.fromEntries(MAGIC_KEYS.map((k) => [k, ch.magicAffinity[k].base])) as Record<MagicKey, number | null>;
