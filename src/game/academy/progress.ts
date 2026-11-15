/**
 * 実績・学院内評価(成績表)・寮内ランキング(世界設定書 Phase 6b でげんたが承認:https://claude.ai/artifact/C3Lrh6wJBye3aeku4V7z3w)。
 * どれも記録を「読むだけ」の純粋関数。能力値・性格・魔法適性は変えない。もらえるのは称号と少しの EXP だけ。
 */
import type { BattleLog, Character, ExperienceEvent, ExploreLog, LessonLog, ResearchLog, SanctuaryLog, StatHistory, TalkLog } from "../../schemas";
import { P } from "../growth/rules";
import { addExp } from "../growth/engine";
import { SPELLS } from "./content";
import { COMPOUNDS } from "./compound";
import { CREATURES } from "./creatures";
import { DISCOVERIES } from "./explore";
import { NPCS } from "./npc";
import { POTIONS } from "./potions";
import { rankOf as arenaRank } from "./battle";

export type Logs = { experiences: ExperienceEvent[]; lessons: LessonLog[]; explorations: ExploreLog[]; battles: BattleLog[]; talks: TalkLog[]; sanctuary: SanctuaryLog[]; research: ResearchLog[] };
const applied = (l: Logs) => l.experiences.filter((e) => e.analysisStatus === "applied");
const realDays = (l: Logs) => new Set(applied(l).map((e) => e.date)).size;
const trust = (ch: Character, id: string) => ch.relationships.find((r) => r.id === id)?.bond ?? 0;
const tierAll = (ch: Character, t: string) => SPELLS.filter((s) => s.tier === t).every((s) => ch.learnedSpells.includes(s.id));
const friends = (ch: Character) => CREATURES.filter((c) => ch.world.creatures[c.id]?.friend);

/* ---------- 実績 ---------- */
export type AchGroup = "real" | "learn" | "adventure" | "bond";
export const ACH_GROUPS: Record<AchGroup, string> = { real: "現実の歩み", learn: "学び", adventure: "冒険", bond: "絆" };
export type Achievement = { id: string; group: AchGroup; name: string; cond: string; title?: boolean; check: (ch: Character, l: Logs) => { met: boolean; now?: number; goal?: number } };
const count = (now: number, goal: number) => ({ met: now >= goal, now: Math.min(now, goal), goal });
const flag = (met: boolean) => ({ met });

export const ACHIEVEMENTS: Achievement[] = [
  { id: "r-first", group: "real", name: "はじめの一歩", cond: "現実の経験を1件承認する", check: (_, l) => count(applied(l).length, 1) },
  { id: "r-10", group: "real", name: "十日の灯", cond: "経験を承認した日が通算10日", check: (_, l) => count(realDays(l), 10) },
  { id: "r-30", group: "real", name: "三十日の星図", cond: "経験を承認した日が通算30日", check: (_, l) => count(realDays(l), 30) },
  { id: "r-100", group: "real", name: "百日の星座", cond: "経験を承認した日が通算100日", check: (_, l) => count(realDays(l), 100) },
  { id: "r-varied", group: "real", name: "多彩な日々", cond: "5種類の経験を承認する", check: (_, l) => count(new Set(applied(l).map((e) => e.category)).size, 5) },
  { id: "r-reflect", group: "real", name: "振り返る者", cond: "振り返りを30字以上書いた経験を10件", check: (_, l) => count(applied(l).filter((e) => (e.reflection ?? "").length >= 30).length, 10) },
  { id: "r-limit", group: "real", name: "限界突破", cond: "難易度「限界突破」の経験を承認する", check: (_, l) => flag(applied(l).some((e) => e.difficulty >= 5)) },
  { id: "r-365", group: "real", name: "一年の天球", cond: "経験を承認した日が通算365日(称号)", title: true, check: (_, l) => count(realDays(l), 365) },
  { id: "l-first", group: "learn", name: "最初の呪文", cond: "呪文を1つ覚える", check: (ch) => count(ch.learnedSpells.length, 1) },
  { id: "l-basic", group: "learn", name: "初級をすべて", cond: "初級の呪文6つ", check: (ch) => count(SPELLS.filter((s) => s.tier === "basic" && ch.learnedSpells.includes(s.id)).length, 6) },
  { id: "l-mid", group: "learn", name: "中級をすべて", cond: "中級の呪文6つ", check: (ch) => count(SPELLS.filter((s) => s.tier === "intermediate" && ch.learnedSpells.includes(s.id)).length, 6) },
  { id: "l-adv", group: "learn", name: "上級の扉", cond: "上級の呪文を1つ覚える", check: (ch) => flag(SPELLS.some((s) => s.tier === "advanced" && ch.learnedSpells.includes(s.id))) },
  { id: "l-unit8", group: "learn", name: "上級課程修了", cond: "どれかの講座で単元8を受ける", check: (ch) => flag(Object.values(ch.academy.units).some((u) => (u?.[7] ?? 0) > 0)) },
  { id: "l-comp", group: "learn", name: "複合の発見", cond: "複合魔法を1つ覚える", check: (ch) => count(ch.world.compounds.length, 1) },
  { id: "l-compall", group: "learn", name: "研究室の主", cond: "複合魔法9つ", check: (ch) => count(ch.world.compounds.length, COMPOUNDS.length) },
  { id: "l-all", group: "learn", name: "すべての呪文", cond: "呪文18をすべて覚える(称号)", title: true, check: (ch) => count(SPELLS.filter((s) => ch.learnedSpells.includes(s.id)).length, SPELLS.length) },
  { id: "a-wand", group: "adventure", name: "杖を手に", cond: "自分の杖をつくる", check: (ch) => flag(!!ch.history.wand) },
  { id: "a-temple", group: "adventure", name: "廃神殿の最奥", cond: "星降りの廃神殿を最奥まで", check: (_, l) => flag(l.explorations.some((e) => e.place === "temple" && e.completed)) },
  { id: "a-archive", group: "adventure", name: "禁書庫の最奥", cond: "禁書庫を最奥まで", check: (_, l) => flag(l.explorations.some((e) => e.place === "archive" && e.completed)) },
  { id: "a-disc", group: "adventure", name: "世界の断片", cond: "発見をすべて", check: (ch) => count(ch.world.discoveries.length, DISCOVERIES.length) },
  { id: "a-win", group: "adventure", name: "初勝利", cond: "演習で初めて勝つ", check: (ch) => flag(ch.world.defeated.length > 0) },
  { id: "a-silver", group: "adventure", name: "銀の徽章", cond: "演習で銀の徽章", check: (ch) => flag(["silver", "gold"].includes(arenaRank(ch.world.defeated).id)) },
  { id: "a-potion", group: "adventure", name: "魔法薬師", cond: "魔法薬8種を一度ずつ調合", check: (ch) => count(new Set(ch.world.brewLog.map((b) => b.potion)).size, POTIONS.length) },
  { id: "a-skypath", group: "adventure", name: "夜空の回廊の踏破者", cond: "夜空の回廊を最奥まで", check: (_, l) => flag(l.explorations.some((e) => e.place === "skypath" && e.completed)) },
  { id: "a-part1", group: "adventure", name: "第一部 完", cond: "物語 第3章を読み終える", check: (ch) => flag(ch.world.story3.cleared) },
  { id: "a-gold", group: "adventure", name: "金の徽章", cond: "演習で金の徽章(称号)", title: true, check: (ch) => flag(arenaRank(ch.world.defeated).id === "gold") },
  { id: "b-friend", group: "bond", name: "最初の仲間", cond: "魔法生物を1体仲間にする", check: (ch) => count(friends(ch).length, 1) },
  { id: "b-adult", group: "bond", name: "成体の相棒", cond: "仲間の魔法生物が成体になる", check: (ch) => flag(Object.values(ch.world.creatures).some((r) => r.friend && r.affection >= 80)) },
  { id: "b-all", group: "bond", name: "保護区の友", cond: "保護区の7種すべてと仲間になる", check: (ch) => count(friends(ch).length, CREATURES.length) },
  { id: "b-star", group: "bond", name: "七つ星と共に", cond: "七つ星の仔と仲間になる", check: (ch) => flag(!!ch.world.creatures.sevenstar?.friend) },
  { id: "b-faces", group: "bond", name: "顔なじみの輪", cond: "5人の信頼20", check: (ch) => count(NPCS.filter((n) => trust(ch, n.id) >= 20).length, 5) },
  { id: "b-ring", group: "bond", name: "信頼の輪", cond: "10人全員の信頼40", check: (ch) => count(NPCS.filter((n) => trust(ch, n.id) >= 40).length, NPCS.length) },
  { id: "b-ch1", group: "bond", name: "第1章完", cond: "第1章「七つ目の星」を読み終える", check: (ch) => flag(ch.world.story.cleared) },
  { id: "b-dear", group: "bond", name: "かけがえのない人", cond: "誰かの信頼100(称号)", title: true, check: (ch) => flag(NPCS.some((n) => trust(ch, n.id) >= 100)) },
];

/* ---------- 成績表(月ごと) ---------- */
export type ItemKey = "lesson" | "practice" | "inquiry" | "social" | "real";
export const GRADES = ["S", "A", "B", "C"] as const;
export type Grade = (typeof GRADES)[number] | "—";
export const REPORT_ITEMS: { key: ItemKey; name: string; what: string; th: [number, number, number, number]; teacher: string; say: [string, string] }[] = [
  { key: "lesson", name: "授業", what: "受けた授業のコマ数", th: [40, 20, 8, 1], teacher: "セレスティン教授", say: ["よく星を見上げた月だった。きみの学びは、確かな軌道に乗っている", "星は急がない。一つずつ、きみの速さで"] },
  { key: "practice", name: "実技", what: "演習で勝った回数", th: [15, 8, 3, 1], teacher: "フォルトナー先生", say: ["いい動きだった。基礎の反復が、ちゃんと形になってる", "勝ち負けより、立ち続けたことが大事だ。もう一本"] },
  { key: "inquiry", name: "探究", what: "探索・研究・調合の回数", th: [30, 15, 6, 1], teacher: "オーリック先生", say: ["よく歩き、よく読んだな。文字は、書いた者の声だ", "一つの扉を開けた。それで十分だ"] },
  { key: "social", name: "交流", what: "話した回数と保護区を歩いた回数", th: [40, 20, 8, 1], teacher: "ミラ先生", say: ["たくさんの心と出会えた月ね。いま、どんな色？", "ひとりの時間も、大切な色よ"] },
  { key: "real", name: "現実の歩み", what: "経験を承認した日数", th: [20, 12, 6, 1], teacher: "リュネ先生", say: ["庭がにぎやかな月でした。ちゃんと、育っていますよ", "待つのも、育てるうち。咲いた花を大事にしましょう"] },
];
const inMonth = (d: string, m: string) => d.startsWith(m);
export function monthCounts(ch: Character, l: Logs, m: string): Record<ItemKey, number> {
  return {
    lesson: l.lessons.filter((x) => inMonth(x.date, m)).length,
    practice: l.battles.filter((x) => inMonth(x.date, m) && x.result === "win").length,
    inquiry: l.explorations.filter((x) => inMonth(x.date, m)).length + l.research.filter((x) => inMonth(x.date, m)).length + ch.world.brewLog.filter((x) => inMonth(x.date, m)).length,
    social: l.talks.filter((x) => inMonth(x.date, m) && (x.kind === "talk" || x.kind === "chat")).length + l.sanctuary.filter((x) => inMonth(x.date, m) && x.kind === "visit").length,
    real: new Set(applied(l).filter((e) => inMonth(e.date, m)).map((e) => e.date)).size,
  };
}
export const gradeOf = (n: number, th: [number, number, number, number]): Grade => (n >= th[0] ? "S" : n >= th[1] ? "A" : n >= th[2] ? "B" : n >= th[3] ? "C" : "—");
export function reportCard(ch: Character, l: Logs, m: string) {
  const c = monthCounts(ch, l, m);
  const items = REPORT_ITEMS.map((it) => ({ ...it, n: c[it.key], grade: gradeOf(c[it.key], it.th) }));
  const graded = items.filter((i) => i.grade !== "—");
  const score = (g: Grade) => (g === "S" ? 4 : g === "A" ? 3 : g === "B" ? 2 : 1);
  const avg = graded.length ? graded.reduce((s, i) => s + score(i.grade), 0) / graded.length : 0;
  const total: Grade = !graded.length ? "—" : avg >= 3.5 ? "S" : avg >= 2.5 ? "A" : avg >= 1.5 ? "B" : "C";
  const best = [...graded].sort((a, b) => score(b.grade) - score(a.grade) || b.n / b.th[0] - a.n / a.th[0])[0];
  const comment = best ? { teacher: best.teacher, text: best.say[best.grade === "S" || best.grade === "A" ? 0 : 1] } : null;
  return { month: m, items, total, comment };
}

/* ---------- 寮内ランキング(週ごと) ---------- */
export type Member = { id: string; name: string; trait: string; drive: number };
export const HOUSE_MEMBERS: Record<string, Member[]> = {
  "暁火の寮": [
    { id: "leon", name: "レオン", trait: "演習場の常連", drive: 1.1 }, { id: "dario", name: "ダリオ", trait: "訓練好き", drive: 1.0 },
    { id: "sara", name: "サラ", trait: "鍋を振るう錬成家", drive: 0.9 }, { id: "toby", name: "トビー", trait: "おちゃらけな後輩", drive: 0.6 }, { id: "elsa", name: "エルザ", trait: "寮長", drive: 1.2 },
  ],
  "月影の寮": [
    { id: "noe", name: "ノエ", trait: "薬草のかごを持つ", drive: 1.0 }, { id: "sera", name: "セラ", trait: "詩を書く", drive: 0.7 },
    { id: "yuri", name: "ユーリ", trait: "静かな記録係", drive: 0.9 }, { id: "nel", name: "ネル", trait: "生き物好き", drive: 0.8 }, { id: "aria", name: "アリア", trait: "寮長", drive: 1.2 },
  ],
  "星環の寮": [
    { id: "iris", name: "イリス", trait: "古代文字の本を抱える", drive: 1.2 }, { id: "orin", name: "オリン", trait: "星を数える", drive: 0.9 },
    { id: "mina", name: "ミーナ", trait: "古文書の虫", drive: 1.0 }, { id: "jess", name: "ジェス", trait: "のんびり屋", drive: 0.6 }, { id: "raul", name: "ラウル", trait: "寮長", drive: 1.1 },
  ],
};
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
/** その日を含む週の月曜(週の id) */
export function weekStart(date: string) { const d = new Date(`${date}T00:00:00`); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return ymd(d); }
export function addDays(date: string, n: number) { const d = new Date(`${date}T00:00:00`); d.setDate(d.getDate() + n); return ymd(d); }
const hash = (s: string) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967295; };
/** 仲間の1週間の点(週の日付と名前で決まる。10〜50点くらい) */
export const memberWeekPoints = (m: Member, week: string) => Math.round((P.rankMin + hash(`${week}:${m.id}`) * (P.rankMax - P.rankMin)) * m.drive);
export function myWeekPoints(ch: Character, l: Logs, week: string) {
  const end = addDays(week, 6), inW = (d: string) => d >= week && d <= end;
  const parts = {
    real: new Set(applied(l).filter((e) => inW(e.date)).map((e) => e.date)).size * 3,
    lesson: l.lessons.filter((x) => inW(x.date)).reduce((s, x) => s + 1 + (x.correct ? 1 : 0), 0),
    battle: l.battles.filter((x) => inW(x.date) && x.result === "win").length * 2,
    explore: l.explorations.filter((x) => inW(x.date)).length * 2,
    research: l.research.filter((x) => inW(x.date)).length + ch.world.brewLog.filter((x) => inW(x.date)).length,
    talk: l.talks.filter((x) => inW(x.date) && x.kind === "talk").length,
  };
  return { total: Object.values(parts).reduce((a, b) => a + b, 0), parts };
}
export function houseRanking(ch: Character, l: Logs, week: string, today: string) {
  const members = (ch.history.house && HOUSE_MEMBERS[ch.history.house]) || null;
  if (!members) return null;
  const done = addDays(week, 6) < today;
  const frac = done ? 1 : Math.min(1, (Math.round((new Date(`${today}T00:00:00`).getTime() - new Date(`${week}T00:00:00`).getTime()) / 864e5) + 1) / 7);
  const me = myWeekPoints(ch, l, week);
  const rows = [{ id: "me", name: ch.name, trait: "あなた", points: me.total, me: true },
    ...members.map((m) => ({ id: m.id, name: m.name, trait: m.trait, points: Math.round(memberWeekPoints(m, week) * frac), me: false }))]
    .sort((a, b) => b.points - a.points || (a.me ? -1 : b.me ? 1 : 0));
  return { week, done, rows, myRank: rows.findIndex((r) => r.me) + 1, parts: me.parts };
}

/* ---------- まとめて反映(読み込みのたびに呼ぶ。何度呼んでも同じ) ---------- */
export function syncProgress(ch: Character, l: Logs, today: string, now: string, newId: () => string) {
  const history: StatHistory[] = []; const got: Achievement[] = []; let c = ch;
  const addTitle = (name: string) => { if (!c.titles.some((t) => t.name === name)) c = { ...c, titles: [...c.titles, { id: `t-${c.titles.length + 1}`, name, at: now }] }; };
  for (const a of ACHIEVEMENTS) {
    if (c.world.achievements[a.id] || !a.check(c, l).met) continue;
    c = { ...c, world: { ...c.world, achievements: { ...c.world.achievements, [a.id]: today } } };
    c = addExp(c, P.achievementExp, `ach:${a.id}`, now, newId, history);
    if (a.title) addTitle(a.name);
    got.push(a);
  }
  // 先週の寮内ランキングで1位なら記録(初めてなら称号「寮の星」)
  const last = addDays(weekStart(today), -7); let star = false;
  if (!c.world.houseStars.includes(last)) {
    const r = houseRanking(c, l, last, today);
    if (r && r.myRank === 1 && r.rows[0].points > 0) { c = { ...c, world: { ...c.world, houseStars: [...c.world.houseStars, last] } }; addTitle(P.houseStarTitle); star = true; }
  }
  return { character: c === ch ? ch : { ...c, updatedAt: now }, history, got, star, changed: c !== ch };
}
export { tierAll };
