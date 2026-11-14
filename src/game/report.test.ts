import { describe, expect, it } from "vitest";
import { buildReport, periodRange } from "./report";
import type { ExperienceEvent, StatHistory } from "../schemas";

describe("成長レポート", () => {
  it("週は月曜はじまり、月は1日〜末日", () => {
    const now = new Date(2026, 10, 15); // 2026-11-15(日)
    expect(periodRange("thisWeek", now)).toMatchObject({ from: "2026-11-09", to: "2026-11-15" });
    expect(periodRange("lastWeek", now)).toMatchObject({ from: "2026-11-02", to: "2026-11-08" });
    expect(periodRange("lastMonth", now)).toMatchObject({ from: "2026-10-01", to: "2026-10-31" });
  });
  it("期間内の反映済みだけを集計し、AIには振り返りを渡さない", () => {
    const g = { exp: 45, stats: {}, personalitySignals: { competitiveness: 2 }, magicSignals: { elemental: 2 }, notes: [], engine: "t" };
    const mk = (id: string, date: string, st: ExperienceEvent["analysisStatus"]): ExperienceEvent => ({ id, date, source: "manual", category: "sports", title: "試合" + id, description: "", difficulty: 3, duration: 0, reflection: "ひみつの振り返り", analysisStatus: st, proposedGrowth: g, approvedGrowth: st === "applied" ? g : null, createdAt: "t", appliedAt: null });
    const hs: StatHistory[] = [{ id: "h", at: "t", eventId: "a", kind: "stat", key: "physical", before: 10, after: 12.1 }];
    const r = buildReport([mk("a", "2026-11-10", "applied"), mk("b", "2026-11-11", "proposed"), mk("c", "2026-10-01", "applied")], hs, "2026-11-09", "2026-11-15");
    expect(r.evs.length).toBe(1); expect(r.exp).toBe(45); expect(r.topStats[0]).toEqual(["physical", 2.1]);
    expect(r.comment).toContain("身体能力");
    expect(r.forAi).not.toContain("ひみつ");
  });
});
