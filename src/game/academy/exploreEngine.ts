/** 探索とクエスト(Phase 4b)。純粋関数。基本ステータス・性格・魔法の兆しは変えない */
import { MAGIC_KEYS, type Character, type ExperienceEvent, type StatHistory } from "../../schemas";
import { P } from "../growth/rules";
import { addExp } from "../growth/engine";
import { learnSpells, unitCounts } from "./engine";
import { companionCanPass } from "./creaturesEngine";
import { creatureById } from "./creatures";
import { DISCOVERIES, MATERIALS, PLACES, TEACHER_QUESTS, TITLES, WAND_WOOD, WEEKLY_QUESTS, materialById, placeById, type Place, type WeeklyQuest } from "./explore";

type Inv = Character["inventory"];
export const qty = (ch: Character, id: string) => ch.inventory.find((i) => i.id === id)?.qty ?? 0;
function addItem(inv: Inv, id: string, n: number): Inv {
  const name = materialById(id)?.name ?? id;
  const has = inv.find((i) => i.id === id);
  return has ? inv.map((i) => (i.id === id ? { ...i, qty: i.qty + n } : i)) : [...inv, { id, name, qty: n }];
}
function addTitle(ch: Character, name: string, now: string): Character {
  if (ch.titles.some((t) => t.name === name)) return ch;
  return { ...ch, titles: [...ch.titles, { id: `t-${ch.titles.length + 1}`, name, at: now }] };
}

/* ---------- 探索 ---------- */
export function canEnter(ch: Character, place: Place) {
  if (!place.requires) return { ok: true, reason: "" };
  const ok = unitCounts(ch, place.requires.course)[place.requires.unit] > 0;
  return { ok, reason: ok ? "" : `入るには「${place.requires.label}」が必要` };
}
/** 部屋で使える方法(呪文は覚えたものだけ) */
export function roomOptions(ch: Character, placeId: string, roomIdx: number) {
  const room = placeById(placeId)!.rooms[roomIdx];
  return {
    room,
    spells: room.spells.map((id) => ({ id, method: `spell:${id}`, learned: ch.learnedSpells.includes(id) })),
    alts: room.alts.map((label, i) => ({ label, method: `alt:${i}` })),
    canSkip: !!room.passWithout,
    companion: companionCanPass(ch, room.id) ? { method: `companion:${ch.world.companion}`, label: `相棒の${creatureById(ch.world.companion!)!.name}に${creatureById(ch.world.companion!)!.explore.label}` } : null,
  };
}

export type Step = { room: string; method: string };
export function applyExploration(ch: Character, input: { id: string; place: string; steps: Step[]; todayCount: number }, now: string, newId: () => string) {
  const place = placeById(input.place);
  if (!place) throw new Error("その場所はありません");
  if (input.todayCount >= P.explorePerDay) throw new Error(`今日の探索はもう${P.explorePerDay}回しました。また明日`);
  if (!canEnter(ch, place).ok) throw new Error(canEnter(ch, place).reason);
  if (input.steps.length > place.rooms.length) throw new Error("記録が正しくありません");
  let inv = ch.inventory; const discoveries = [...ch.world.discoveries]; const clears = { ...ch.world.clears };
  const gotItems: Record<string, number> = {}; const gotDisc: string[] = []; let cleared = 0;
  input.steps.forEach((st, i) => {
    const room = place.rooms[i];
    if (st.room !== room.id) throw new Error("部屋の順番が正しくありません");
    const [kind, arg] = st.method.split(":");
    let ok = false;
    if (kind === "spell") { if (!room.spells.includes(arg) || !ch.learnedSpells.includes(arg)) throw new Error("その呪文は使えません"); ok = true; }
    else if (kind === "alt") { if (!(Number(arg) >= 0 && Number(arg) < room.alts.length)) throw new Error("その方法は選べません"); ok = true; }
    else if (kind === "companion") { if (arg !== ch.world.companion || !companionCanPass(ch, room.id)) throw new Error("相棒はここでは手伝えない"); ok = true; }
    else if (kind === "skip") { if (!room.passWithout) throw new Error("この部屋は素通りできません"); }
    else throw new Error("方法が正しくありません");
    if (i < input.steps.length - 1 && !ok && !room.passWithout) throw new Error("通れない部屋の先には進めません");
    if (!ok) return;
    cleared++;
    clears[room.id] = [...new Set([...(clears[room.id] ?? []), st.method])];
    for (const it of room.items) { inv = addItem(inv, it, 1); gotItems[it] = (gotItems[it] ?? 0) + 1; }
    if (room.discovery && !discoveries.includes(room.discovery)) { discoveries.push(room.discovery); gotDisc.push(room.discovery); }
  });
  const last = place.rooms[place.rooms.length - 1];
  const completed = input.steps.length === place.rooms.length && (clears[last.id]?.length ?? 0) > 0 && input.steps[input.steps.length - 1].method !== "skip";
  const exp = Math.min(P.exploreExpMax, cleared * P.exploreExpPerRoom);
  const history: StatHistory[] = [];
  let next: Character = { ...ch, inventory: inv, world: { ...ch.world, discoveries, clears } };
  if (exp > 0) next = addExp(next, exp, input.id, now, newId, history);
  next = awardTitles(next, now);
  return { character: { ...next, updatedAt: now }, history, items: gotItems, discoveries: gotDisc, exp, completed };
}

/** 条件を満たした称号を足す(何度呼んでも同じ) */
export function awardTitles(ch: Character, now: string): Character {
  let c = ch;
  const d = ch.world.discoveries;
  if (ch.history.wand) c = addTitle(c, TITLES.wand, now);
  if ((ch.world.clears["t7"]?.length ?? 0) > 0) c = addTitle(c, TITLES.temple, now);
  if (DISCOVERIES.filter((x) => x.place === "archive" && d.includes(x.id)).length >= 3) c = addTitle(c, TITLES.archive, now);
  if (DISCOVERIES.every((x) => d.includes(x.id))) c = addTitle(c, TITLES.allDiscoveries, now);
  return c;
}

/* ---------- 杖えらびの儀 ---------- */
export function wandFor(ch: Character) {
  const top = [...MAGIC_KEYS].sort((a, b) => (ch.magicAffinity[b].base ?? 0) - (ch.magicAffinity[a].base ?? 0))[0];
  return `${WAND_WOOD[top]}と星の欠片の杖`;
}
export function canMakeWand(ch: Character) {
  if (ch.history.wand) return { ok: false, reason: "杖はもう持っている" };
  if (!ch.diagnosedAt) return { ok: false, reason: "先に入学診断を受けてね" };
  if (qty(ch, "starshard") < 1) return { ok: false, reason: "廃神殿で「星の欠片」を見つけて持ち帰ろう" };
  return { ok: true, reason: "" };
}
export function makeWand(ch: Character, now: string): Character {
  const c = canMakeWand(ch); if (!c.ok) throw new Error(c.reason);
  const inv = ch.inventory.map((i) => (i.id === "starshard" ? { ...i, qty: i.qty - 1 } : i)).filter((i) => i.qty > 0);
  return awardTitles({ ...ch, inventory: inv, history: { ...ch.history, wand: wandFor(ch) }, updatedAt: now }, now);
}

/* ---------- 先生の課題 ---------- */
export function teacherQuestStatus(ch: Character, qid: string) {
  const q = TEACHER_QUESTS.find((x) => x.id === qid)!;
  const unlocked = unitCounts(ch, q.course)[1] > 0;
  const cl = ch.world.clears;
  const met = ({
    "q-astral": ch.world.discoveries.includes("d-ceiling"),
    "q-mind": (cl["a2"] ?? []).includes("spell:mind-1"),
    "q-creation": MATERIALS.filter((m) => qty(ch, m.id) > 0).length >= 3,
    "q-nature": qty(ch, "glowmoss") > 0,
    "q-elemental": (cl["t2"] ?? []).includes("spell:elemental-1"),
    "q-ancient": (cl["a6"]?.length ?? 0) > 0,
  } as Record<string, boolean>)[qid] ?? false;
  return { quest: q, unlocked, met, claimed: ch.world.quests.includes(qid) };
}
export function claimTeacherQuest(ch: Character, qid: string, now: string, newId: () => string) {
  const st = teacherQuestStatus(ch, qid);
  if (!st.unlocked || !st.met || st.claimed) throw new Error("まだ報告できない課題です");
  const k = st.quest.course;
  let c: Character = { ...ch, academy: { ...ch.academy, proficiency: { ...ch.academy.proficiency, [k]: Math.min(100, (ch.academy.proficiency[k] ?? 0) + P.teacherQuestProf) } }, world: { ...ch.world, quests: [...ch.world.quests, qid] } };
  c = addTitle(c, st.quest.title, now);
  const history: StatHistory[] = [];
  const r = learnSpells(c, qid, now, newId, history);
  return { character: { ...r.character, updatedAt: now }, history, learned: r.learned };
}

/* ---------- 週替わりの課題 ---------- */
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export function weekStart(date: Date) { const d = new Date(date.getFullYear(), date.getMonth(), date.getDate()); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return ymd(d); }
const addDays = (s: string, n: number) => { const [y, m, d] = s.split("-").map(Number); return ymd(new Date(y, m - 1, d + n)); };
/** その週の3つ(週ごとに決まる) */
export function weeklyQuestsFor(ws: string): WeeklyQuest[] {
  let h = 0; for (const c of ws) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const pool = [...WEEKLY_QUESTS]; const out: WeeklyQuest[] = [];
  for (let i = 0; i < P.weeklyQuestCount; i++) { h = (h * 1103515245 + 12345) >>> 0; out.push(pool.splice(h % pool.length, 1)[0]); }
  return out;
}
export function weeklyProgress(q: WeeklyQuest, evs: ExperienceEvent[], ws: string) {
  const end = addDays(ws, 6);
  const list = evs.filter((e) => e.analysisStatus === "applied" && e.date >= ws && e.date <= end);
  const count = (f: (e: ExperienceEvent) => boolean) => list.filter(f).length;
  const [now, need] = ({
    "w-challenge": [count((e) => e.category === "challenge"), 1],
    "w-reflect": [count((e) => e.reflection.trim().length >= 30), 2],
    "w-variety": [new Set(list.map((e) => e.category)).size, 3],
    "w-bond": [count((e) => e.category === "relationship"), 1],
    "w-days": [new Set(list.map((e) => e.date)).size, 4],
    "w-learn": [count((e) => e.category === "learning"), 1],
  } as Record<string, [number, number]>)[q.id];
  return { now: Math.min(now, need), need, met: now >= need };
}
const WEEKLY_REWARD = ["stardust", "glowmoss", "violetink"];
export function claimWeekly(ch: Character, evs: ExperienceEvent[], ws: string, qid: string, now: string, newId: () => string) {
  const qs = weeklyQuestsFor(ws); const idx = qs.findIndex((q) => q.id === qid);
  const key = `w:${ws}:${qid}`;
  if (idx < 0 || ch.world.quests.includes(key) || !weeklyProgress(qs[idx], evs, ws).met) throw new Error("まだ受け取れない課題です");
  const history: StatHistory[] = [];
  let c: Character = { ...ch, inventory: addItem(ch.inventory, WEEKLY_REWARD[idx], 1), world: { ...ch.world, quests: [...ch.world.quests, key] } };
  c = addExp(c, P.weeklyQuestExp, key, now, newId, history);
  if (weeklyStreak(c, ws) >= P.streakWeeks) c = addTitle(c, TITLES.streak, now);
  return { character: { ...c, updatedAt: now }, history, reward: WEEKLY_REWARD[idx] };
}
/** この週から前へ、毎週1つ以上達成が何週続いているか */
export function weeklyStreak(ch: Character, ws: string) {
  let n = 0, w = ws;
  while (ch.world.quests.some((q) => q.startsWith(`w:${w}:`))) { n++; w = addDays(w, -7); }
  return n;
}
export { PLACES };
