import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { ArcanaDB, useDb } from "./db";
import { addExperience, approveExperience, deleteExperience, ensureInitialized, exportAll, getCharacter, importAll, listHistory } from "./repo";

let k = 0;
beforeEach(async () => { useDb(new ArcanaDB("test-" + k++)); await ensureInitialized(); });
const input = { date: "2026-11-14", category: "creative" as const, title: "もしもシリーズの画像制作", description: "", difficulty: 3, duration: 60, reflection: "" };

describe("保存とルールの通り道", () => {
  it("登録→提案→承認で反映され、2回目は拒否される", async () => {
    const ev = await addExperience(input);
    expect(ev.analysisStatus).toBe("proposed");
    expect(ev.proposedGrowth?.stats.creativity).toBeGreaterThan(0);
    await approveExperience(ev.id);
    const ch = await getCharacter();
    expect(ch.basicStats.creativity).toBeGreaterThan(10);
    expect(ch.magicAffinity.creation.signals).toBeGreaterThan(0);
    await expect(approveExperience(ev.id)).rejects.toThrow();
    expect((await listHistory()).length).toBeGreaterThan(0);
    await expect(deleteExperience(ev.id)).rejects.toThrow();
  });
  it("書き出し→読み込みで同じ状態に戻る", async () => {
    const ev = await addExperience(input); await approveExperience(ev.id);
    const dump = await exportAll();
    useDb(new ArcanaDB("test-import-" + k++)); await ensureInitialized();
    await importAll(JSON.parse(JSON.stringify(dump)));
    const ch = await getCharacter();
    expect(ch.appliedEventIds).toContain(ev.id);
    expect(ch.basicStats.creativity).toBe(dump.character!.basicStats.creativity);
  });
  it("壊れたデータは読み込まない", async () => {
    await expect(importAll({ app: "other" })).rejects.toThrow();
  });
});

import { importExperiences, parseMarkdownExperiences, listExperiences } from "./repo";
describe("経験の取り込み", () => {
  it("Markdownを読み、2回目は重複としてスキップする", async () => {
    const items = parseMarkdownExperiences("# メモ\n- 2026-11-11 [音楽・歌] noirのカラオケ配信 | 2回配信 | 楽しかった\n- 2026-11-13 [仕事] クレジット研修\nただの文\n");
    expect(items).toHaveLength(2);
    expect(items[0].category).toBe("music");
    expect(items[0].reflection).toBe("楽しかった");
    expect(await importExperiences(items, "markdown")).toEqual({ added: 2, skipped: 0 });
    expect(await importExperiences(items, "markdown")).toEqual({ added: 0, skipped: 2 });
    const list = await listExperiences();
    expect(list.every((e) => e.analysisStatus === "proposed")).toBe(true);
  });
});

describe("まとめて反映", () => {
  it("同じ経験を続けて反映すると、2回目は伸びが小さい", async () => {
    const a = await addExperience({ ...input, title: "サッカー練習", category: "sports", date: "2026-11-10" });
    const b = await addExperience({ ...input, title: "サッカー練習", category: "sports", date: "2026-11-12" });
    const r1 = await approveExperience(a.id); const r2 = await approveExperience(b.id);
    const exp = (r: typeof r1) => r.history.find((h) => h.kind === "exp")!;
    expect(exp(r2).after - exp(r2).before).toBeLessThan(exp(r1).after - exp(r1).before);
  });
});

import Dexie from "dexie";
import { getCharacter as getCh2 } from "./repo";
describe("データ構造の移行(v2→v3)", () => {
  it("古い形のキャラクターが消えずに、性格の重みが数え直される", async () => {
    const name = "test-migrate-" + k++;
    const old = new Dexie(name);
    old.version(2).stores({ player: "id", characters: "id", experiences: "id, date, category, analysisStatus, createdAt, sourceRef", statHistory: "id, at, eventId, kind, key", meta: "key" });
    const { createCharacter } = await import("../../game/character/create");
    const c = createCharacter("げんた", "t") as unknown as Record<string, unknown> & { personality: Record<string, { value: null; evidence: number }>; magicAffinity: Record<string, unknown>; appliedEventIds: string[] };
    delete c.diagnosedAt;
    for (const v of Object.values(c.personality)) delete (v as Record<string, unknown>).weight;
    for (const v of Object.values(c.magicAffinity)) delete (v as Record<string, unknown>).base;
    c.personality.competitiveness.evidence = 1; c.appliedEventIds = ["e1"];
    await old.table("characters").put(c);
    await old.table("experiences").put({ id: "e1", date: "2026-11-01", source: "manual", category: "sports", title: "試合", description: "", difficulty: 3, duration: 0, reflection: "", analysisStatus: "applied", proposedGrowth: null, approvedGrowth: { exp: 30, stats: {}, personalitySignals: { competitiveness: 1.5 }, magicSignals: {}, notes: [], engine: "rules-v1" }, createdAt: "t", appliedAt: "t" });
    old.close();
    useDb(new ArcanaDB(name)); await ensureInitialized();
    const ch = await getCh2();
    expect(ch.personality.competitiveness.weight).toBe(1.5);
    expect(ch.personality.competitiveness.evidence).toBe(1);
    expect(ch.magicAffinity.astral.base).toBeNull();
    expect(ch.diagnosedAt).toBeNull();
    expect(ch.appliedEventIds).toEqual(["e1"]);
  });
});

import { takeLesson } from "./repo";
describe("授業の保存", () => {
  it("1日3コマまで。記録が残り、書き出しに入る", async () => {
    await takeLesson("astral", 0, true); await takeLesson("astral", 1, false); await takeLesson("astral", 2, true);
    await expect(takeLesson("astral", 3, true)).rejects.toThrow();
    const ch = await getCh2();
    expect(ch.learnedSpells).toContain("astral-1");
    const dump = await exportAll();
    expect(dump.lessonLog).toHaveLength(3);
    const { listLessons } = await import("./repo");
    expect((await listLessons())[0].unit).toBe(2); // 新しい順(at の索引が要る)
    expect(dump.statHistory.some((h) => h.kind === "spell")).toBe(true);
  });
});
