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
