import { describe, expect, it } from "vitest";
import { ACHIEVEMENTS, HOUSE_MEMBERS, houseRanking, memberWeekPoints, reportCard, syncProgress, weekStart, type Logs } from "./progress";
import { createCharacter } from "../character/create";
import type { Character, ExperienceEvent } from "../../schemas";

let n = 0; const id = () => "a" + n++;
const ev = (date: string, over: Partial<ExperienceEvent> = {}) => ({ id: "e" + date + n++, date, source: "manual", category: "sports", title: "t", description: "", difficulty: 3, duration: 0, reflection: "", analysisStatus: "applied", proposedGrowth: null, approvedGrowth: null, createdAt: date, appliedAt: null, ...over }) as unknown as ExperienceEvent;
const empty = (o: Partial<Logs> = {}): Logs => ({ experiences: [], lessons: [], explorations: [], battles: [], talks: [], sanctuary: [], research: [], ...o });

describe("実績(Phase 6b)", () => {
  it("32+第3章の2つ=34、称号は各種類の最後の1つ", () => {
    expect(ACHIEVEMENTS).toHaveLength(34); expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(34);
    expect(ACHIEVEMENTS.filter((a) => a.title).map((a) => a.name)).toEqual(["一年の天球", "すべての呪文", "金の徽章", "かけがえのない人"]);
  });
  it("満たしたものを日付つきで記録、EXP+10ずつ、何度呼んでも同じ。能力値は変えない", () => {
    const ch = { ...createCharacter("げんた", "t"), learnedSpells: ["astral-1"] } as Character;
    const logs = empty({ experiences: Array.from({ length: 10 }, (_, i) => ev(`2026-11-${String(i + 1).padStart(2, "0")}`)) });
    const r = syncProgress(ch, logs, "2026-11-15", "t", id);
    expect(r.got.map((a) => a.id)).toEqual(expect.arrayContaining(["r-first", "r-10", "l-first"]));
    expect(r.character.world.achievements["r-10"]).toBe("2026-11-15");
    expect(r.character.experience).toBe(r.got.length * 10);
    expect(r.character.basicStats).toEqual(ch.basicStats);
    expect(syncProgress(r.character, logs, "2026-11-16", "t", id).got).toHaveLength(0);
  });
});

describe("成績表と寮内ランキング(Phase 6b)", () => {
  it("成績表:0回は「—」、ひとことはいちばん良い項目の先生", () => {
    const ch = createCharacter("げんた", "t");
    const logs = empty({ experiences: Array.from({ length: 12 }, (_, i) => ev(`2026-10-${String(i + 1).padStart(2, "0")}`)), lessons: [{ id: "l", at: "t", date: "2026-10-03", course: "astral", unit: 0, correct: true, prof: 1, exp: 1 }] });
    const r = reportCard(ch, logs, "2026-10");
    expect(r.items.find((i) => i.key === "real")?.grade).toBe("A");
    expect(r.items.find((i) => i.key === "lesson")?.grade).toBe("C");
    expect(r.items.find((i) => i.key === "practice")?.grade).toBe("—");
    expect(r.comment?.teacher).toBe("リュネ先生");
    expect(reportCard(ch, empty(), "2026-10").total).toBe("—");
  });
  it("ランキング:週は月曜から、仲間の点は週で決まり(10〜60)、途中の週は日数ぶん", () => {
    expect(weekStart("2026-11-15")).toBe("2026-11-09");
    const ch = { ...createCharacter("げんた", "t"), history: { origin: "", house: "月影の寮", wand: null, wizardAge: null } } as Character;
    for (const m of HOUSE_MEMBERS["月影の寮"]) { const p = memberWeekPoints(m, "2026-11-09"); expect(p).toBeGreaterThanOrEqual(5); expect(p).toBeLessThanOrEqual(60); expect(memberWeekPoints(m, "2026-11-09")).toBe(p); }
    const logs = empty({ experiences: [ev("2026-11-10"), ev("2026-11-11")] });
    const done = houseRanking(ch, logs, "2026-11-02", "2026-11-15")!; expect(done.done).toBe(true); expect(done.rows).toHaveLength(6);
    const mid = houseRanking(ch, logs, "2026-11-09", "2026-11-10")!;
    expect(mid.rows.find((r) => r.me)?.points).toBe(6);
    expect(houseRanking(createCharacter("g", "t"), logs, "2026-11-09", "2026-11-10")).toBeNull();
  });
  it("先週1位なら寮の星(称号は初めての1回)", () => {
    const ch = { ...createCharacter("げんた", "t"), history: { origin: "", house: "月影の寮", wand: null, wizardAge: null } } as Character;
    const logs = empty({ experiences: Array.from({ length: 7 }, (_, i) => ev(`2026-11-0${i + 2}`)), lessons: Array.from({ length: 30 }, (_, i) => ({ id: "x" + i, at: "t", date: "2026-11-03", course: "astral" as const, unit: 0, correct: true, prof: 1, exp: 1 })) });
    const r = syncProgress(ch, logs, "2026-11-15", "t", id);
    expect(r.star).toBe(true); expect(r.character.titles.some((t) => t.name === "寮の星")).toBe(true);
    expect(syncProgress(r.character, logs, "2026-11-15", "t", id).star).toBe(false);
  });
});
