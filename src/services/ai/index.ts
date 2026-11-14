/**
 * AI分析サービス(指示書 7章)。Phase 1 はルールだけで提案する RulesAnalyzer。
 * Phase 3 で Claude API などをつなぐときは、この interface を実装したものに差し替える。
 * APIキーはフロントに置かず、中継サーバー経由にする。送信前にプレイヤーの確認を取る(GDD 14章)。
 */
import type { ExperienceEvent, Growth } from "../../schemas";
import { GrowthSchema } from "../../schemas";
import { proposeGrowth } from "../../game/growth/engine";

export interface AnalysisService {
  readonly name: string;
  readonly sendsDataExternally: boolean;
  analyze(ev: ExperienceEvent, past: ExperienceEvent[]): Promise<Growth>;
}

export const RulesAnalyzer: AnalysisService = {
  name: "ルール分析(端末内)",
  sendsDataExternally: false,
  async analyze(ev, past) {
    return GrowthSchema.parse(proposeGrowth(ev, past)); // 構造化データとして検証
  },
};

export const analyzer: AnalysisService = RulesAnalyzer;
