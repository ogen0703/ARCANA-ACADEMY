import { describe, expect, it } from "vitest";
import { buildAnalysisPrompt, buildConversationPrompt, extractJson, parseInsightReply } from "./bridge";

describe("外部AIとの橋わたし", () => {
  it("プロンプトに経験とキーの一覧が入る", () => {
    const p = buildAnalysisPrompt({ date: "2026-11-14", category: "sports", title: "サッカーの試合", description: "", reflection: "声を出せた", difficulty: 3, duration: 90 });
    expect(p).toContain("サッカーの試合"); expect(p).toContain("competitiveness"); expect(p).toContain("astral");
    expect(buildConversationPrompt("今日はカラオケ配信をした", "2026-11-15")).toContain("arcana-academy-experiences");
  });
  it("```json で囲まれた返事も読める。範囲外は丸め、知らないキーは拒否", () => {
    const ok = parseInsightReply('はい\n```json\n{"summary":"仲間と声を掛け合った","personality":{"empathy":0.8,"competitiveness":1.4},"magic":{"mind":0.6},"reasons":["声かけ"]}\n```');
    expect(ok.personality.competitiveness).toBe(1); expect(ok.personality.empathy).toBe(0.8); expect(ok.by).toBe("外部AI");
    expect(() => parseInsightReply('{"personality":{"strength":1}}')).toThrow();
    expect(() => extractJson("JSONなし")).toThrow();
  });
});
