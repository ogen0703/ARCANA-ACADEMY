/**
 * メインストーリーの進み方(Phase 5c)。純粋関数。
 * 選択は物語の中のこと(誰と動くか・信頼・熟練度・仔の気質・称号)だけを変え、能力値・性格・魔法適性は変えない。
 */
import type { Character, StatHistory } from "../../schemas";
import { P } from "../growth/rules";
import { addExp } from "../growth/engine";
import { setTrust, trustOf } from "../academy/npcEngine";
import { npcById } from "../academy/npc";
import { recOf } from "../academy/creaturesEngine";
import { proficiencyOf } from "../academy/engine";
import { CHAPTER1, ROUTES, type Route, type StoryState } from "./chapter1";
import { CHAPTER2, ROUTES2 } from "./chapter2";
import { CHAPTER3, ROUTES3 } from "./chapter3";

/** 物語の外から渡す事実(保存の層が数える) */
export type StoryCtx = { today: string; talkedMilo: boolean; realDays: number; nightVisits: number; towerCleared?: boolean; bloomsThisMonth?: number; skypathCleared?: boolean };
export type Cond = { label: string; met: boolean; now?: string };

const TEACHERS = ["t-astral", "t-mind", "t-creation", "t-nature", "t-elemental", "t-ancient"];
const CLASSMATES = ["leon", "noe", "iris", "milo"];
const has = (ch: Character, d: string) => ch.world.discoveries.includes(d);
const logDate = (s: StoryState, scene: number) => s.log.find((l) => l.scene === scene)?.date ?? "";

/** 道ごとの課題(場面7がひらく条件) */
export function routeTask(ch: Character, ctx: StoryCtx): Cond[] {
  const r = ch.world.story.route;
  if (r === "A") return [{ label: "決闘演習場で「目覚めた星影」に勝つ", met: ch.world.defeated.includes("starshade") }];
  if (r === "B") return [{ label: `夜の魔法生物保護区を${P.storyNightVisits}回歩く`, met: ctx.nightVisits >= P.storyNightVisits, now: `${Math.min(ctx.nightVisits, P.storyNightVisits)}` }];
  if (r === "C") {
    const t = TEACHERS.filter((id) => trustOf(ch, id) >= P.storyTrustC).length, c = CLASSMATES.filter((id) => trustOf(ch, id) >= P.storyTrustC).length;
    return [{ label: `先生2人の信頼${P.storyTrustC}`, met: t >= 2, now: `${t}人` }, { label: `仲間2人の信頼${P.storyTrustC}`, met: c >= 2, now: `${c}人` }];
  }
  return [];
}

/** 次の場面と、ひらく条件 */
export function nextScene(ch: Character, ctx: StoryCtx) {
  const s = ch.world.story;
  if (s.cleared || s.scene >= CHAPTER1.length) return { scene: null, conds: [] as Cond[], open: false, readToday: s.lastRead === ctx.today };
  const scene = CHAPTER1[s.scene];
  const conds: Cond[] = [];
  switch (scene.no) {
    case 1: conds.push({ label: "入学診断を受ける", met: !!ch.diagnosedAt }); break;
    case 2: conds.push({ label: "談話室でミロと話す", met: ctx.talkedMilo }); break;
    case 3: conds.push({ label: "廃神殿で「天井の星図」を見つける", met: has(ch, "d-ceiling") }); break;
    case 4: conds.push({ label: "禁書庫で「書きかけの日誌」を見つける", met: has(ch, "d-diary") }, { label: "禁書庫で「鎖の書の一節」を見つける", met: has(ch, "d-chain") }); break;
    case 5: conds.push({ label: "廃神殿で「祭壇の光」を見つける", met: has(ch, "d-altar") }, { label: "呪文「封印の鍵」か複合魔法「星読みの錠」を覚える", met: ch.learnedSpells.includes("ancient-2") || ch.world.compounds.includes("c-starlock") }); break;
    case 6: conds.push({ label: "場面5の次の日になる", met: !!logDate(s, 5) && logDate(s, 5) < ctx.today }, { label: `現実の経験を承認した日が通算${P.storyRealDays6}日`, met: ctx.realDays >= P.storyRealDays6, now: `${ctx.realDays}日` }); break;
    case 7: conds.push(...routeTask(ch, ctx)); break;
    case 8: conds.push({ label: "七つ星の仔が仲間になる", met: recOf(ch, "sevenstar").friend }, { label: `現実の経験を承認した日が通算${P.storyRealDays8}日`, met: ctx.realDays >= P.storyRealDays8, now: `${ctx.realDays}日` }); break;
  }
  const readToday = s.lastRead === ctx.today;
  return { scene, conds, open: conds.every((c) => c.met) && !readToday, readToday };
}

function addTitle(ch: Character, name: string, now: string): Character {
  return ch.titles.some((t) => t.name === name) ? ch : { ...ch, titles: [...ch.titles, { id: `t-${ch.titles.length + 1}`, name, at: now }] };
}
function trustUp(ch: Character, id: string, now: string) { const n = npcById(id); return n ? setTrust(ch, n, P.storyTrust, now).character : ch; }

/** 場面を読む(場面7は meetSevenstar で進める) */
export function readScene(ch: Character, input: { id: string; choice: string | null }, ctx: StoryCtx, now: string, newId: () => string) {
  const st = nextScene(ch, ctx);
  if (!st.scene) throw new Error("第1章はもう読み終えた");
  if (st.readToday) throw new Error("物語は1日1場面。また明日");
  if (!st.open) throw new Error("この場面はまだひらいていない");
  const sc = st.scene;
  if (sc.no === 7) throw new Error("七つ星の仔と心を通わせよう");
  const pick = sc.choices ? sc.choices.find((c) => c.id === input.choice) : null;
  if (sc.choices && !pick) throw new Error("選択肢を選んでね");
  let c: Character = ch; const s = ch.world.story;
  const choices = pick ? { ...s.choices, [String(sc.no)]: pick.id } : s.choices;
  let route = s.route;
  if (sc.no === 2 && pick) { if (pick.id === "together") c = trustUp(c, "milo", now); if (pick.id === "teacher") c = trustUp(c, "t-astral", now); }
  if (sc.no === 3 && pick) {
    if (pick.id === "wait") c = trustUp(c, "t-astral", now);
    if (pick.id === "self") c = { ...c, academy: { ...c.academy, proficiency: { ...c.academy.proficiency, astral: Math.min(100, Math.round((proficiencyOf(c, "astral") + P.storyProf) * 10) / 10) } } };
  }
  if (sc.no === 5 && pick) route = pick.id as Route;
  const cleared = sc.no === 8;
  if (cleared && route) c = addTitle(c, ROUTES[route].title, now);
  c = { ...c, world: { ...c.world, story: { ...s, choices, route, scene: s.scene + 1, lastRead: ctx.today, cleared, log: [...s.log, { scene: sc.no, date: ctx.today, choice: pick?.id ?? null }] } }, updatedAt: now };
  const history: StatHistory[] = [];
  c = addExp(c, P.storyExp, input.id, now, newId, history);
  return { character: c, history, scene: sc, reply: pick?.reply ?? "", cleared };
}

/** 場面7:七つ星の仔に近づく(近づき方は3つまで。好む近づき方は道で変わる) */
export const SEVENSTAR_APPROACHES = [
  { id: "wait", label: "そっと待つ" }, { id: "call", label: "静かに声をかける" }, { id: "run", label: "一緒に駆け回る" },
  { id: "make", label: "星の光で小さな形を作って見せる" }, { id: "spell:astral-1", label: "呪文「星灯」で光を灯す" },
];
const likedOf = (r: Route | null) => (r === "A" ? "run" : r === "B" ? "wait" : "call");
export function sevenstarValue(route: Route | null, action: string, used: string[]) {
  const v = action === likedOf(route) ? P.sevenstarLiked : action === "spell:astral-1" ? P.sevenstarSpell : P.sevenstarOther;
  return used.includes(action) ? Math.floor(v / 2) : v;
}
export function meetSevenstar(ch: Character, input: { id: string; actions: string[] }, ctx: StoryCtx, now: string, newId: () => string) {
  const st = nextScene(ch, ctx);
  if (!st.scene || st.scene.no !== 7) throw new Error("まだ七つ星の仔には会えない");
  if (st.readToday) throw new Error("物語は1日1場面。また明日");
  if (!st.open) throw new Error("道の課題を終えよう");
  if (input.actions.length < 1 || input.actions.length > 3) throw new Error("近づき方は1〜3つ");
  const s = ch.world.story, rec = recOf(ch, "sevenstar");
  let d = P.sevenstarStart - Math.min(3, rec.attempts); const used: string[] = [];
  for (const a of input.actions) {
    if (!SEVENSTAR_APPROACHES.some((x) => x.id === a)) throw new Error("その近づき方はできない");
    if (a === "spell:astral-1" && !ch.learnedSpells.includes("astral-1")) throw new Error("「星灯」をまだ覚えていない");
    if (d <= 0) throw new Error("記録が正しくありません");
    d -= sevenstarValue(s.route, a, used); used.push(a);
  }
  const friend = d <= 0;
  let c: Character = { ...ch, world: { ...ch.world, creatures: { ...ch.world.creatures, sevenstar: { friend, attempts: rec.attempts + 1, affection: rec.affection } }, companion: friend ? "sevenstar" : ch.world.companion } };
  c = { ...c, world: { ...c.world, story: { ...s, lastRead: ctx.today, scene: friend ? s.scene + 1 : s.scene, log: friend ? [...s.log, { scene: 7, date: ctx.today, choice: null }] : s.log } }, updatedAt: now };
  const history: StatHistory[] = [];
  if (friend) c = addExp(c, P.storyExp, input.id, now, newId, history);
  return { character: c, history, friend, left: Math.max(0, d) };
}

/** 衣装(Phase 5c) */
const HOUSE_MATE: Record<string, string> = { "暁火の寮": "leon", "月影の寮": "noe", "星環の寮": "iris" };
export function outfitsOf(ch: Character) {
  const mate = ch.history.house ? HOUSE_MATE[ch.history.house] : undefined;
  return [
    { id: "rank" as const, name: "位の装い", ok: true, how: "はじめから(位に合わせて変わる)" },
    { id: "house" as const, name: "寮の正装", ok: !!mate && trustOf(ch, mate) >= P.houseFormalTrust, how: mate ? `${npcById(mate)?.name}の信頼${P.houseFormalTrust}` : "寮が決まってから" },
    { id: "starheir" as const, name: "星継ぎの装い", ok: ch.world.story.cleared, how: "第1章を読み終える" },
    { id: "nightsky" as const, name: "夜空の装い", ok: ch.world.story3.cleared, how: "第3章を読み終える" },
  ];
}
export type OutfitId = "rank" | "house" | "starheir" | "nightsky";
export function setOutfit(ch: Character, id: OutfitId, now: string): Character {
  const o = outfitsOf(ch).find((x) => x.id === id);
  if (!o?.ok) throw new Error("まだ着られない");
  return { ...ch, world: { ...ch.world, outfit: id }, updatedAt: now };
}
export const routeLabel = (r: Route | null) => (r ? ROUTES[r].label : "");

/* ---------- 第2章「星を降ろした人」(Phase 6c) ---------- */
const qtyOf = (ch: Character, id: string) => ch.inventory.find((i) => i.id === id)?.qty ?? 0;
/** 第2章の道ごとの課題(場面6がひらく条件のひとつ) */
export function routeTask2(ch: Character, ctx: StoryCtx): Cond[] {
  const r = ch.world.story2.route;
  if (r === "A") return [{ label: "決闘演習場で「星の残響」に勝つ", met: ch.world.defeated.includes("echo") }];
  if (r === "B") return [{ label: `星影の庭園で、その月の花を${P.story2Blooms}輪咲かせる`, met: (ctx.bloomsThisMonth ?? 0) >= P.story2Blooms, now: `${ctx.bloomsThisMonth ?? 0}輪` }];
  if (r === "C") { const c = CLASSMATES.filter((id) => trustOf(ch, id) >= P.story2Trust).length; return [{ label: `学院の仲間3人の信頼${P.story2Trust}`, met: c >= 3, now: `${c}人` }]; }
  return [];
}
export function nextScene2(ch: Character, ctx: StoryCtx) {
  const s = ch.world.story2, s1 = ch.world.story;
  if (s.cleared || s.scene >= CHAPTER2.length) return { scene: null, conds: [] as Cond[], open: false, readToday: s.lastRead === ctx.today };
  const scene = CHAPTER2[s.scene]; const conds: Cond[] = [];
  switch (scene.no) {
    case 1: conds.push({ label: "第1章を読み終える", met: s1.cleared }, { label: "第1章を読み終えた次の日になる", met: s1.cleared && logDate(s1, 8) < ctx.today }); break;
    case 2: conds.push({ label: `ミラ先生の信頼${P.story2MiraTrust}`, met: trustOf(ch, "t-mind") >= P.story2MiraTrust, now: `${trustOf(ch, "t-mind")}` }); break;
    case 3: conds.push({ label: "素材「古い星の紋章」を持っている", met: qtyOf(ch, "staremblem") > 0 }, { label: "素材「古い写本」を持っている", met: qtyOf(ch, "oldcodex") > 0 }); break;
    case 4: conds.push({ label: "星の塔で「セイルの観測日誌」を見つける", met: has(ch, "d-logbook") }); break;
    case 5: conds.push({ label: "場面4の次の日になる", met: !!logDate(s, 4) && logDate(s, 4) < ctx.today }, { label: `現実の経験を承認した日が通算${P.story2RealDays5}日`, met: ctx.realDays >= P.story2RealDays5, now: `${ctx.realDays}日` }); break;
    case 6: conds.push(...routeTask2(ch, ctx), { label: "星の塔を最奥まで登る", met: !!ctx.towerCleared }); break;
    case 7: conds.push({ label: "決闘演習場で「星喰いの影」に勝つ", met: ch.world.defeated.includes("starhunger") }); break;
    case 8: conds.push({ label: `現実の経験を承認した日が通算${P.story2RealDays8}日`, met: ctx.realDays >= P.story2RealDays8, now: `${ctx.realDays}日` }); break;
  }
  const readToday = s.lastRead === ctx.today;
  return { scene, conds, open: conds.every((c) => c.met) && !readToday, readToday };
}
export function readScene2(ch: Character, input: { id: string; choice: string | null }, ctx: StoryCtx, now: string, newId: () => string) {
  const st = nextScene2(ch, ctx);
  if (!st.scene) throw new Error("第2章はもう読み終えた");
  if (st.readToday) throw new Error("物語は1日1場面。また明日");
  if (!st.open) throw new Error("この場面はまだひらいていない");
  const sc = st.scene;
  const pick = sc.choices ? sc.choices.find((c) => c.id === input.choice) : null;
  if (sc.choices && !pick) throw new Error("選択肢を選んでね");
  let c: Character = ch; const s = ch.world.story2;
  const choices = pick ? { ...s.choices, [String(sc.no)]: pick.id } : s.choices;
  let route = s.route;
  if (sc.no === 2 && pick?.id === "peek") c = trustUp(c, "t-mind", now);
  if (sc.no === 2 && pick?.id === "deep") c = { ...c, academy: { ...c.academy, proficiency: { ...c.academy.proficiency, mind: Math.min(100, Math.round((proficiencyOf(c, "mind") + P.storyProf) * 10) / 10) } } };
  if (sc.no === 3) { // 物語の鍵を使う
    c = { ...c, inventory: c.inventory.map((i) => (i.id === "staremblem" || i.id === "oldcodex" ? { ...i, qty: i.qty - 1 } : i)).filter((i) => i.qty > 0) };
  }
  if (sc.no === 4 && pick) route = pick.id as Route;
  const cleared = sc.no === 8;
  if (cleared && route) c = addTitle(c, ROUTES2[route].title, now);
  if (cleared && c.world.creatures.sevenstar?.friend) { const r = c.world.creatures.sevenstar; c = { ...c, world: { ...c.world, creatures: { ...c.world.creatures, sevenstar: { ...r, affection: Math.min(100, r.affection + P.story2StarAffection) } } } }; }
  c = { ...c, world: { ...c.world, story2: { ...s, choices, route, scene: s.scene + 1, lastRead: ctx.today, cleared, log: [...s.log, { scene: sc.no, date: ctx.today, choice: pick?.id ?? null }] } }, updatedAt: now };
  const history: StatHistory[] = [];
  c = addExp(c, P.storyExp, input.id, now, newId, history);
  return { character: c, history, scene: sc, reply: pick?.reply ?? "", cleared };
}

/* ---------- 第3章「星を還す夜」(Phase 7) ---------- */
/** 第3章の道ごとの課題(場面7がひらく条件のひとつ) */
export function routeTask3(ch: Character): Cond[] {
  const r = ch.world.story3.route;
  if (r === "A") return [{ label: "星辰学の上級の呪文を覚える", met: ch.learnedSpells.includes("astral-3") }];
  if (r === "B") { const a = recOf(ch, "sevenstar").affection; return [{ label: `七つ星の仔のなつき${P.story3BondAffection}`, met: a >= P.story3BondAffection, now: `${a}` }]; }
  if (r === "C") {
    const t = TEACHERS.filter((id) => trustOf(ch, id) >= P.story3Trust).length, c = CLASSMATES.filter((id) => trustOf(ch, id) >= P.story3Trust).length;
    return [{ label: `先生3人の信頼${P.story3Trust}`, met: t >= 3, now: `${t}人` }, { label: `仲間3人の信頼${P.story3Trust}`, met: c >= 3, now: `${c}人` }];
  }
  return [];
}
export function nextScene3(ch: Character, ctx: StoryCtx) {
  const s = ch.world.story3, s2 = ch.world.story2;
  if (s.cleared || s.scene >= CHAPTER3.length) return { scene: null, conds: [] as Cond[], open: false, readToday: s.lastRead === ctx.today };
  const scene = CHAPTER3[s.scene]; const conds: Cond[] = [];
  switch (scene.no) {
    case 1: conds.push({ label: "第2章を読み終える", met: s2.cleared }, { label: "第2章を読み終えた次の日になる", met: s2.cleared && logDate(s2, 8) < ctx.today }); break;
    case 2: conds.push({ label: `セレスティン教授の信頼${P.story3StarTrust}`, met: trustOf(ch, "t-astral") >= P.story3StarTrust, now: `${trustOf(ch, "t-astral")}` }); break;
    case 3: conds.push({ label: `現実の経験を承認した日が通算${P.story3RealDays3}日`, met: ctx.realDays >= P.story3RealDays3, now: `${ctx.realDays}日` }); break;
    case 4: conds.push({ label: "夜空の回廊で「影の記憶」を見つける", met: has(ch, "d-shadowmemory") }); break;
    case 5: conds.push({ label: "場面4の次の日になる", met: !!logDate(s, 4) && logDate(s, 4) < ctx.today }); break;
    case 6: conds.push(...routeTask3(ch), { label: "夜空の回廊を最奥まで登る", met: !!ctx.skypathCleared }); break;
    case 7: conds.push({ label: "決闘演習場で「星喰い」を鎮める", met: ch.world.defeated.includes("starshadow") }); break;
    case 8: conds.push({ label: `現実の経験を承認した日が通算${P.story3RealDays8}日`, met: ctx.realDays >= P.story3RealDays8, now: `${ctx.realDays}日` }); break;
  }
  const readToday = s.lastRead === ctx.today;
  return { scene, conds, open: conds.every((c) => c.met) && !readToday, readToday };
}
const starAffection = (c: Character, add: number): Character => {
  const r = c.world.creatures.sevenstar; if (!r?.friend) return c;
  return { ...c, world: { ...c.world, creatures: { ...c.world.creatures, sevenstar: { ...r, affection: Math.min(100, r.affection + add) } } } };
};
export function readScene3(ch: Character, input: { id: string; choice: string | null }, ctx: StoryCtx, now: string, newId: () => string) {
  const st = nextScene3(ch, ctx);
  if (!st.scene) throw new Error("第3章はもう読み終えた");
  if (st.readToday) throw new Error("物語は1日1場面。また明日");
  if (!st.open) throw new Error("この場面はまだひらいていない");
  const sc = st.scene;
  const pick = sc.choices ? sc.choices.find((c) => c.id === input.choice) : null;
  if (sc.choices && !pick) throw new Error("選択肢を選んでね");
  let c: Character = ch; const s = ch.world.story3;
  const choices = pick ? { ...s.choices, [String(sc.no)]: pick.id } : s.choices;
  let route = s.route;
  if (sc.no === 2 && pick?.id === "know") c = { ...c, academy: { ...c.academy, proficiency: { ...c.academy.proficiency, mind: Math.min(100, Math.round((proficiencyOf(c, "mind") + P.storyProf) * 10) / 10) } } };
  if (sc.no === 2 && pick?.id === "guard") c = starAffection(c, P.story3GuardAffection);
  if (sc.no === 2 && pick?.id === "together") c = trustUp(c, "t-astral", now);
  if (sc.no === 5 && pick) route = pick.id as Route;
  const cleared = sc.no === 8;
  if (cleared && route) c = addTitle(c, ROUTES3[route].title, now);
  if (cleared && route !== "B") c = starAffection(c, P.story3Affection);
  c = { ...c, world: { ...c.world, story3: { ...s, choices, route, scene: s.scene + 1, lastRead: ctx.today, cleared, log: [...s.log, { scene: sc.no, date: ctx.today, choice: pick?.id ?? null }] } }, updatedAt: now };
  const history: StatHistory[] = [];
  c = addExp(c, P.storyExp, input.id, now, newId, history);
  return { character: c, history, scene: sc, reply: pick?.reply ?? "", cleared };
}
/** 道Bで第3章を読み終えると、七つ星の仔は光と影の結ばれた姿になる */
export const starBound = (ch: Character) => ch.world.story3.cleared && ch.world.story3.route === "B";
/** 大広間の七芒星の七つ目の角が灯る */
export const seventhLit = (ch: Character) => ch.world.story3.cleared;
