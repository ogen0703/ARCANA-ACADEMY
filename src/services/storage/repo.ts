import { CharacterSchema, ExperienceEventSchema, ExportSchema, PlayerProfileSchema, type Character, type ExperienceEvent, type ExportData, type Growth } from "../../schemas";
import { createCharacter, createPlayer } from "../../game/character/create";
import { applyGrowth } from "../../game/growth/engine";
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
export const listHistory = () => db.statHistory.orderBy("at").reverse().toArray();

export async function renameCharacter(name: string) {
  const ch = await getCharacter();
  await db.characters.put(CharacterSchema.parse({ ...ch, name: name.trim(), updatedAt: nowIso() }));
}

export type NewExperience = Pick<ExperienceEvent, "date" | "category" | "title" | "description" | "difficulty" | "duration" | "reflection"> & { source?: ExperienceEvent["source"] };

/** 経験を登録し、すぐに成長の提案(proposedGrowth)を作る */
export async function addExperience(input: NewExperience): Promise<ExperienceEvent> {
  const ev = ExperienceEventSchema.parse({
    ...input, source: input.source ?? "manual", id: newId(), analysisStatus: "pending",
    proposedGrowth: null, approvedGrowth: null, createdAt: nowIso(), appliedAt: null,
  });
  await db.experiences.put(ev);
  return analyze(ev.id);
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

/** プレイヤーの承認 → ルールエンジンで確定 → 1回だけ反映 */
export async function approveExperience(id: string, growth?: Growth) {
  return db.transaction("rw", db.characters, db.experiences, db.statHistory, async () => {
    const ev = ExperienceEventSchema.parse(await db.experiences.get(id));
    const ch = await getCharacter();
    if (ev.analysisStatus === "applied" || ch.appliedEventIds.includes(ev.id)) throw new Error("この経験はすでに反映済みです");
    const g = growth ?? ev.proposedGrowth;
    if (!g) throw new Error("成長の提案がまだありません");
    const now = nowIso();
    const { character, history } = applyGrowth(ch, ev, g, now, newId);
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
    experiences: await db.experiences.toArray(), statHistory: await db.statHistory.toArray(),
  });
}

/** 読み込み:形を検証してから置きかえる(読み込み前に自動でバックアップを返す) */
export async function importAll(raw: unknown) {
  const data = ExportSchema.parse(raw);
  if (data.schemaVersion > SCHEMA_VERSION) throw new Error("新しいバージョンのデータです。アプリを更新してから読み込んでください");
  const backup = await exportAll();
  await db.transaction("rw", db.player, db.characters, db.experiences, db.statHistory, async () => {
    await Promise.all([db.player.clear(), db.characters.clear(), db.experiences.clear(), db.statHistory.clear()]);
    if (data.player) await db.player.put(data.player);
    if (data.character) await db.characters.put(data.character);
    await db.experiences.bulkPut(data.experiences);
    await db.statHistory.bulkPut(data.statHistory);
  });
  await ensureInitialized();
  return backup;
}

export async function deleteAllData() {
  await  db.transaction("rw", [db.player, db.characters, db.experiences, db.statHistory, db.meta], async () => {
    await Promise.all([db.player.clear(), db.characters.clear(), db.experiences.clear(), db.statHistory.clear(), db.meta.clear()]);
  });
  await ensureInitialized();
}

export type { Character };
