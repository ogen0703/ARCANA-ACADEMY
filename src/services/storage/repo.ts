import { CATEGORY_KEYS, CharacterSchema, ExperienceEventSchema, ExportSchema, ImportItemSchema, PlayerProfileSchema, type Character, type ExperienceEvent, type ExportData, type Growth, type ImportItem } from "../../schemas";
import { CATEGORY_DEFS } from "../../game/growth/rules";
import { createCharacter, createPlayer } from "../../game/character/create";
import { applyGrowth } from "../../game/growth/engine";
import { applyLesson, learnSpells } from "../../game/academy/engine";
import { applyBattle, type Command } from "../../game/academy/battle";
import { feed as feedCreature, play as playCreature, realBoost, setCompanion, visit as visitCreature } from "../../game/academy/creaturesEngine";
import { gift as giftTo, receive as receiveFromNpc, talk as talkWith } from "../../game/academy/npcEngine";
import { applyExploration, claimTeacherQuest, claimWeekly, makeWand, type Step } from "../../game/academy/exploreEngine";
import type { MagicKey } from "../../schemas";
import { todayLocal } from "../../utils/id";
import { applyDiagnosis, diagnose } from "../../game/growth/formation";
import { migrateCharacterV3 } from "./migrations";
import type { AiInsight } from "../../schemas";
import { analyzer } from "../ai";
import { newId, nowIso } from "../../utils/id";
import { db, SCHEMA_VERSION } from "./db";

export async function ensureInitialized() {
  await db.transaction("rw", db.player, db.characters, db.meta, async () => {
    const now = nowIso();
    if (!(await db.player.get("player"))) await db.player.put(createPlayer(now));
    if (!(await db.characters.get("hero"))) await db.characters.put(createCharacter("げんた", now));
    if (!(await db.meta.get("schemaVersion"))) await db.meta.put({ key: "schemaVersion", value: SCHEMA_VERSION });
  });
  try { await navigator.storage?.persist?.(); } catch { /* 任意 */ }
}

export const getCharacter = async () => CharacterSchema.parse(await db.characters.get("hero"));
export const getPlayer = async () => PlayerProfileSchema.parse(await db.player.get("player"));
export const listExperiences = () => db.experiences.orderBy("createdAt").reverse().toArray();
export const getExperience = (id: string) => db.experiences.get(id);
export const listHistory = () => db.statHistory.orderBy("at").reverse().toArray();
export const listLessons = () => db.lessonLog.orderBy("at").reverse().toArray();
export const listExplorations = () => db.exploreLog.orderBy("at").reverse().toArray();
export const listBattles = () => db.battleLog.orderBy("at").reverse().toArray();
export const listTalks = () => db.talkLog.orderBy("at").reverse().toArray();
export const listSanctuary = () => db.sanctuaryLog.orderBy("at").reverse().toArray();

const todaySanctuary = () => db.sanctuaryLog.where("date").equals(todayLocal()).toArray();
/** 保護区を訪れる(1日3回) */
export async function visitSanctuary(creature: string, actions: string[]) {
  return db.transaction("rw", [db.characters, db.sanctuaryLog], async () => {
    const logs = await todaySanctuary(); const now = nowIso();
    const r = visitCreature(await getCharacter(), { creature, actions, visitsToday: logs.filter((l) => l.kind === "visit").length }, now);
    await db.characters.put(CharacterSchema.parse(r.character));
    await db.sanctuaryLog.put({ id: newId(), at: now, date: todayLocal(), kind: "visit", creature, result: r.friend ? "friend" : "left", actions });
    return r;
  });
}
/** 相棒の世話(えさ1日1回・遊ぶ1日2回) */
export async function careCreature(creature: string, kind: "feed" | "play") {
  return db.transaction("rw", [db.characters, db.sanctuaryLog], async () => {
    const logs = (await todaySanctuary()).filter((l) => l.creature === creature && l.kind === kind); const now = nowIso();
    const ch = await getCharacter();
    const r = kind === "feed" ? feedCreature(ch, creature, logs.length > 0, now) : playCreature(ch, creature, logs.length, now);
    await db.characters.put(CharacterSchema.parse(r.character));
    await db.sanctuaryLog.put({ id: newId(), at: now, date: todayLocal(), kind, creature, result: "", actions: [] });
    return r;
  });
}
export async function chooseCompanion(creature: string) {
  const next = setCompanion(await getCharacter(), creature, nowIso());
  await db.characters.put(CharacterSchema.parse(next));
}

const todayTalks = (npc: string) => db.talkLog.where("date").equals(todayLocal()).filter((t) => t.npc === npc).toArray();
/** 話す(1人1日5回まで) */
export async function talkTo(npc: string, choice: number | null) {
  return db.transaction("rw", [db.characters, db.talkLog], async () => {
    const logs = await todayTalks(npc);
    const now = nowIso();
    const r = talkWith(await getCharacter(), npc, choice, logs.filter((l) => l.kind === "talk" || l.kind === "chat").length, now);
    await db.characters.put(CharacterSchema.parse(r.character));
    await db.talkLog.put({ id: newId(), at: now, date: todayLocal(), npc, kind: r.kind, gain: r.gain, detail: r.kind === "talk" ? `choice:${choice}` : "" });
    return r;
  });
}
/** 贈り物(1人1日1回) */
export async function giveGift(npc: string, item: string) {
  return db.transaction("rw", [db.characters, db.talkLog], async () => {
    const logs = await todayTalks(npc); const now = nowIso();
    const r = giftTo(await getCharacter(), npc, item, logs.some((l) => l.kind === "gift"), now);
    await db.characters.put(CharacterSchema.parse(r.character));
    await db.talkLog.put({ id: newId(), at: now, date: todayLocal(), npc, kind: "gift", gain: r.gain, detail: item });
    return r;
  });
}
/** 仲間のお裾分け(1日1回) */
export async function receiveFrom(npc: string) {
  return db.transaction("rw", [db.characters, db.talkLog], async () => {
    const logs = await todayTalks(npc); const now = nowIso();
    const r = receiveFromNpc(await getCharacter(), npc, logs.some((l) => l.kind === "receive"), now);
    await db.characters.put(CharacterSchema.parse(r.character));
    await db.talkLog.put({ id: newId(), at: now, date: todayLocal(), npc, kind: "receive", gain: 0, detail: r.item });
    return r;
  });
}

/** 戦闘を終える:記録したコマンドをルールで再生して結果を決め、報酬は1日3勝まで */
export async function finishBattle(opp: string, seed: number, cmds: Command[]) {
  return db.transaction("rw", [db.characters, db.statHistory, db.battleLog], async () => {
    const date = todayLocal();
    const rewardedToday = await db.battleLog.where("date").equals(date).filter((b) => b.rewarded).count();
    const id = newId(), now = nowIso();
    const r = applyBattle(await getCharacter(), { id, opp, seed, cmds, rewardedToday }, now, newId);
    await db.characters.put(CharacterSchema.parse(r.character));
    await db.statHistory.bulkPut(r.history);
    await db.battleLog.put({ id, at: now, date, opp, result: r.state.over as "win", turns: cmds.length, rewarded: r.rewarded, exp: r.exp, items: r.items });
    return r;
  });
}

/** 探索を1回終える(1日の上限は端末の日付で数える) */
export async function explore(place: string, steps: Step[]) {
  return db.transaction("rw", [db.characters, db.statHistory, db.exploreLog], async () => {
    const date = todayLocal();
    const todayCount = await db.exploreLog.where("date").equals(date).count();
    const ch = await getCharacter();
    const id = newId(), now = nowIso();
    const r = applyExploration(ch, { id, place, steps, todayCount }, now, newId);
    await db.characters.put(CharacterSchema.parse(r.character));
    await db.statHistory.bulkPut(r.history);
    await db.exploreLog.put({ id, at: now, date, place, steps, items: r.items, discoveries: r.discoveries, exp: r.exp, completed: r.completed });
    return r;
  });
}
/** 杖えらびの儀 */
export async function makeWandNow() {
  const ch = await getCharacter();
  const next = makeWand(ch, nowIso());
  await db.characters.put(CharacterSchema.parse(next));
  return next;
}
/** 先生の課題を報告する */
export async function reportTeacherQuest(qid: string) {
  return db.transaction("rw", [db.characters, db.statHistory], async () => {
    const r = claimTeacherQuest(await getCharacter(), qid, nowIso(), newId);
    await db.characters.put(CharacterSchema.parse(r.character)); await db.statHistory.bulkPut(r.history);
    return r;
  });
}
/** 週替わりの課題の報酬を受け取る */
export async function receiveWeekly(ws: string, qid: string) {
  return db.transaction("rw", [db.characters, db.statHistory, db.experiences], async () => {
    const r = claimWeekly(await getCharacter(), await db.experiences.toArray(), ws, qid, nowIso(), newId);
    await db.characters.put(CharacterSchema.parse(r.character)); await db.statHistory.bulkPut(r.history);
    return r;
  });
}
/** 名前の下に出す称号 */
export async function setActiveTitle(name: string | null) {
  const ch = await getCharacter();
  await db.characters.put(CharacterSchema.parse({ ...ch, world: { ...ch.world, activeTitle: name }, updatedAt: nowIso() }));
}

/** 授業を1コマ受ける(1日の上限は端末の日付で数える) */
export async function takeLesson(course: MagicKey, unit: number, correct: boolean) {
  return db.transaction("rw", [db.characters, db.statHistory, db.lessonLog], async () => {
    const date = todayLocal();
    const todayCount = await db.lessonLog.where("date").equals(date).count();
    const ch = await getCharacter();
    const id = newId(), now = nowIso();
    const r = applyLesson(ch, { id, course, unit, correct, todayCount }, now, newId);
    await db.characters.put(CharacterSchema.parse(r.character));
    await db.statHistory.bulkPut(r.history);
    await db.lessonLog.put({ id, at: now, date, course, unit, correct, prof: r.gain.prof, exp: r.gain.exp });
    return r;
  });
}

/** 小さな設定・メモ(成長レポートの講評など) */
export const getMeta = async <T,>(key: string) => (await db.meta.get(key))?.value as T | undefined;
export const setMeta = (key: string, value: unknown) => db.meta.put({ key, value });

export async function renameCharacter(name: string) {
  const ch = await getCharacter();
  await db.characters.put(CharacterSchema.parse({ ...ch, name: name.trim(), updatedAt: nowIso() }));
}

export type NewExperience = Pick<ExperienceEvent, "date" | "category" | "title" | "description" | "difficulty" | "duration" | "reflection"> & { source?: ExperienceEvent["source"]; sourceRef?: string; ai?: AiInsight };

/** 経験を登録し、すぐに成長の提案(proposedGrowth)を作る */
export async function addExperience(input: NewExperience): Promise<ExperienceEvent> {
  const ev = ExperienceEventSchema.parse({
    ...input, source: input.source ?? "manual", id: newId(), analysisStatus: "pending",
    proposedGrowth: null, approvedGrowth: null, createdAt: nowIso(), appliedAt: null,
  });
  await db.experiences.put(ev);
  return analyze(ev.id);
}

/** 取り込み:同じ sourceRef(または同じ日付+タイトル)の経験はスキップ。全部「承認まち」で入る */
export async function importExperiences(items: ImportItem[], source: ExperienceEvent["source"]) {
  const existing = await db.experiences.toArray();
  const refs = new Set(existing.map((e) => e.sourceRef).filter(Boolean));
  const keys = new Set(existing.map((e) => e.date + "|" + e.title.trim()));
  let added = 0, skipped = 0;
  for (const it of items) {
    if ((it.sourceRef && refs.has(it.sourceRef)) || keys.has(it.date + "|" + it.title.trim())) { skipped++; continue; }
    await addExperience({ ...it, source });
    if (it.sourceRef) refs.add(it.sourceRef); keys.add(it.date + "|" + it.title.trim()); added++;
  }
  return { added, skipped };
}

/** かんたんなMarkdown:「- 2026-11-14 [スポーツ] タイトル | くわしく | 振り返り」の行を読む */
export function parseMarkdownExperiences(md: string): ImportItem[] {
  const byLabel = new Map(Object.entries(CATEGORY_DEFS).map(([k, v]) => [v.label, k]));
  const out: ImportItem[] = [];
  for (const line of md.split(/\r?\n/)) {
    const m = line.match(/^\s*[-*]\s*(\d{4}-\d{2}-\d{2})\s*(?:[\[【]([^\]】]+)[\]】])?\s*(.+)$/);
    if (!m) continue;
    const [title, description = "", reflection = ""] = m[3].split("|").map((x) => x.trim());
    const cat = (m[2] && (byLabel.get(m[2].trim()) ?? (CATEGORY_KEYS as readonly string[]).find((k) => k === m[2].trim()))) || "other";
    const r = ImportItemSchema.safeParse({ date: m[1], category: cat, title: title.slice(0, 80), description, reflection, sourceRef: "md:" + m[1] + ":" + title.slice(0, 60) });
    if (r.success) out.push(r.data);
  }
  return out;
}

export async function analyze(id: string): Promise<ExperienceEvent> {
  const ev = ExperienceEventSchema.parse(await db.experiences.get(id));
  if (ev.analysisStatus === "applied") return ev;
  const past = await db.experiences.toArray();
  const proposed = await analyzer.analyze(ev, past);
  const next = { ...ev, proposedGrowth: proposed, analysisStatus: "proposed" as const };
  await db.experiences.put(next);
  return next;
}

/** 未反映の経験だけ内容を直せる(反映済みは成長の記録として残す) */
export async function updateExperience(id: string, patch: Partial<NewExperience>) {
  const ev = ExperienceEventSchema.parse(await db.experiences.get(id));
  if (ev.analysisStatus === "applied") throw new Error("反映済みの経験は変更できません");
  await db.experiences.put(ExperienceEventSchema.parse({ ...ev, ...patch }));
  return analyze(id);
}

/** AIの読み取りを経験に付ける(未反映のものだけ)。成長の見込みを作り直す */
export const setExperienceAi = (id: string, ai: AiInsight | undefined) => updateExperience(id, { ai });

/** 入学診断:回答から魔法適性の基礎値を決める(1回だけ) */
export async function diagnoseHero(answers: number[]) {
  const ch = await getCharacter();
  const next = applyDiagnosis(ch, diagnose(answers), nowIso());
  await db.characters.put(CharacterSchema.parse(next));
  return next;
}

/** プレイヤーの承認 → ルールエンジンで確定 → 1回だけ反映 */
export async function approveExperience(id: string, growth?: Growth) {
  // 反映の直前に、今までに反映した経験を踏まえて見込みを作り直す(まとめて反映しても繰り返しの抑制が効くように)
  if (!growth) { const cur = await db.experiences.get(id); if (cur && cur.analysisStatus === "proposed") await analyze(id); }
  return db.transaction("rw", db.characters, db.experiences, db.statHistory, async () => {
    const ev = ExperienceEventSchema.parse(await db.experiences.get(id));
    const ch = await getCharacter();
    if (ev.analysisStatus === "applied" || ch.appliedEventIds.includes(ev.id)) throw new Error("この経験はすでに反映済みです");
    const g = growth ?? ev.proposedGrowth;
    if (!g) throw new Error("成長の提案がまだありません");
    const now = nowIso();
    const applied = applyGrowth(ch, ev, g, now, newId);
    const history = applied.history;
    // 現実の成長で呪文の条件(能力値・兆し)を満たすこともある
    const learned = learnSpells(applied.character, ev.id, now, newId, history);
    // 相棒も一緒に日々を過ごしている(1日最大+6)
    const character = realBoost(learned.character, todayLocal(), now);
    const approved: Growth = { ...g, stats: Object.fromEntries(history.filter((h) => h.kind === "stat").map((h) => [h.key, Math.round((h.after - h.before) * 10) / 10])) };
    await db.characters.put(CharacterSchema.parse(character));
    await db.statHistory.bulkPut(history);
    await db.experiences.put({ ...ev, approvedGrowth: approved, analysisStatus: "applied", appliedAt: now });
    return { character, history };
  });
}

export async function rejectExperience(id: string) {
  const ev = ExperienceEventSchema.parse(await db.experiences.get(id));
  if (ev.analysisStatus === "applied") throw new Error("反映済みの経験は見送りにできません");
  await db.experiences.put({ ...ev, analysisStatus: "rejected" });
}

/** 未反映の経験だけ削除できる */
export async function deleteExperience(id: string) {
  const ev = await db.experiences.get(id);
  if (ev?.analysisStatus === "applied") throw new Error("反映済みの経験は削除できません(成長の記録として残します)");
  await db.experiences.delete(id);
}

export async function exportAll(): Promise<ExportData> {
  return ExportSchema.parse({
    app: "arcana-academy", schemaVersion: SCHEMA_VERSION, exportedAt: nowIso(),
    player: (await db.player.get("player")) ?? null, character: (await db.characters.get("hero")) ?? null,
    experiences: await db.experiences.toArray(), statHistory: await db.statHistory.toArray(), lessonLog: await db.lessonLog.toArray(), exploreLog: await db.exploreLog.toArray(), battleLog: await db.battleLog.toArray(), talkLog: await db.talkLog.toArray(), sanctuaryLog: await db.sanctuaryLog.toArray(),
  });
}

/** 読み込み:形を検証してから置きかえる(読み込み前に自動でバックアップを返す) */
export async function importAll(raw: unknown) {
  const data = ExportSchema.parse(raw);
  if (data.schemaVersion > SCHEMA_VERSION) throw new Error("新しいバージョンのデータです。アプリを更新してから読み込んでください");
  const backup = await exportAll();
  await db.transaction("rw", [db.player, db.characters, db.experiences, db.statHistory, db.lessonLog, db.exploreLog, db.battleLog, db.talkLog, db.sanctuaryLog], async () => {
    await Promise.all([db.player.clear(), db.characters.clear(), db.experiences.clear(), db.statHistory.clear(), db.lessonLog.clear(), db.exploreLog.clear(), db.battleLog.clear(), db.talkLog.clear(), db.sanctuaryLog.clear()]);
    if (data.player) await db.player.put(data.player);
    // 古い形のデータは今の形に直してから入れる
    if (data.character) await db.characters.put(data.schemaVersion < 3 ? migrateCharacterV3(data.character, data.experiences) : data.character);
    await db.experiences.bulkPut(data.experiences);
    await db.statHistory.bulkPut(data.statHistory);
    await db.lessonLog.bulkPut(data.lessonLog);
    await db.exploreLog.bulkPut(data.exploreLog);
    await db.battleLog.bulkPut(data.battleLog);
    await db.talkLog.bulkPut(data.talkLog);
    await db.sanctuaryLog.bulkPut(data.sanctuaryLog);
  });
  await ensureInitialized();
  return backup;
}

export async function deleteAllData() {
  await db.transaction("rw", [db.player, db.characters, db.experiences, db.statHistory, db.meta, db.lessonLog, db.exploreLog, db.battleLog, db.talkLog, db.sanctuaryLog], async () => {
    await Promise.all([db.player.clear(), db.characters.clear(), db.experiences.clear(), db.statHistory.clear(), db.meta.clear(), db.lessonLog.clear(), db.exploreLog.clear(), db.battleLog.clear(), db.talkLog.clear(), db.sanctuaryLog.clear()]);
  });
  await ensureInitialized();
}

export type { Character };
