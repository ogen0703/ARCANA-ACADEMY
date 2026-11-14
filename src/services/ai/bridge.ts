/**
 * 外部AIとの橋わたし(Phase 3)。アプリからは何も送らない。
 * プレイヤーが内容を確認してコピーし、自分でAI(Claude・ChatGPTなど)に貼り付け、返事をアプリに貼り戻す。
 * APIキーは使わない(指示書:フロントにAPIキーを置かない)。返事は検証してから「確定前のデータ」として持つ。
 */
import { z } from "zod";
import { AiInsightSchema, CATEGORY_KEYS, MAGIC_KEYS, MAGIC_LABELS, PERSONALITY_KEYS, PERSONALITY_LABELS, type AiInsight, type ExperienceEvent } from "../../schemas";
import { CATEGORY_DEFS } from "../../game/growth/rules";
import { nowIso } from "../../utils/id";

const personalityList = PERSONALITY_KEYS.map((k) => `${k}(${PERSONALITY_LABELS[k]})`).join(", ");
const magicList = MAGIC_KEYS.map((k) => `${k}(${MAGIC_LABELS[k].name}:${MAGIC_LABELS[k].desc})`).join(", ");
const insightFormat = `{"summary": "経験の要約(100字以内)", "personality": {"キー": 0〜1}, "magic": {"キー": 0〜1}, "reasons": ["そう読んだ理由(1つ60字以内、最大3つ)"]}`;
const rules = [
  "性格の傾向と魔法の系統について、この経験にはっきり表れているものだけを 0〜1 で付ける(表れていないものは書かない。多くて3つずつ)",
  "能力値やレベルは付けない(ゲームのルールが決める)",
  "健康・お金・家族の事情など、ゲームに不要な個人的な情報は summary や reasons に書かない",
  `性格のキー:${personalityList}`,
  `魔法のキー:${magicList}`,
];

/** 1つの経験を読み取ってもらうための文章 */
export function buildAnalysisPrompt(ev: Pick<ExperienceEvent, "date" | "category" | "title" | "description" | "reflection" | "difficulty" | "duration">) {
  return [
    "あなたは育成RPG「ARCANA ACADEMY」の分析役です。現実の経験を読んで、主人公(見習い魔法使い)の性格の傾向と魔法の系統の兆しを読み取ってください。",
    "",
    "## 経験",
    `- 日付:${ev.date}`,
    `- 種類:${CATEGORY_DEFS[ev.category].label}`,
    `- 何をした:${ev.title}`,
    ev.description ? `- くわしく:${ev.description}` : "",
    ev.reflection ? `- 振り返り:${ev.reflection}` : "",
    `- 挑戦の大きさ:${ev.difficulty}/5${ev.duration ? `、かけた時間:${ev.duration}分` : ""}`,
    "",
    "## ルール",
    ...rules.map((r) => `- ${r}`),
    "",
    "## 返事の形",
    "次のJSONだけを返してください(説明文は不要):",
    insightFormat,
  ].filter((l) => l !== "").join("\n").replace(/\n## /g, "\n\n## ");
}

/** 会話や日記から経験を見つけてもらうための文章 */
export function buildConversationPrompt(text: string, today: string) {
  return [
    "あなたは育成RPG「ARCANA ACADEMY」の記録係です。下の会話(または日記)から、プレイヤーが現実でした「経験」を見つけて、取り込み用のJSONにしてください。",
    "",
    "## ルール",
    "- 実際にしたこと・挑戦したこと・学んだこと・人と関わったことだけを拾う(予定や願望、他人の出来事は拾わない)",
    `- 日付が分からないものは ${today} にする`,
    `- category は次から選ぶ:${CATEGORY_KEYS.map((k) => `${k}(${CATEGORY_DEFS[k].label})`).join(", ")}`,
    "- difficulty は 1〜5(1:かんたん 3:がんばった 5:限界突破)、duration は分(分からなければ 0)",
    "- 各経験に ai を付ける:" + insightFormat,
    ...rules.map((r) => `- ${r}`),
    "",
    "## 返事の形",
    "次のJSONだけを返してください:",
    `{"app": "arcana-academy-experiences", "source": "ai", "note": "会話から抽出", "items": [{"date": "YYYY-MM-DD", "category": "...", "title": "何をした(40字以内)", "description": "", "difficulty": 3, "duration": 0, "reflection": "本人の言葉があれば", "ai": {…}}]}`,
    "",
    "## 会話",
    text.trim(),
  ].join("\n");
}

/** 成長レポートに講評をもらうための文章(数字と経験のタイトルだけを渡す) */
export function buildReportPrompt(summary: string) {
  return [
    "あなたは魔法学院「アルカナ学院」の指導教官です。見習い魔法使いの成長レポートを読んで、200字以内で講評してください。",
    "- よく伸びたところを具体的にほめる",
    "- 次の期間に意識するとよいことを1つだけ、やさしく提案する",
    "- 世界観に合った口調で。ただし現実の行動につながる内容にする",
    "",
    summary,
  ].join("\n");
}

/** 返事の文章からJSONを取り出す(```json で囲まれていても読む) */
export function extractJson(text: string): unknown {
  const t = text.trim();
  const fenced = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : t.slice(t.indexOf("{"), t.lastIndexOf("}") + 1);
  if (!body) throw new Error("JSONが見つかりませんでした");
  return JSON.parse(body);
}

const ReplySchema = AiInsightSchema.omit({ by: true, at: true }).extend({ summary: z.string().max(300).default("") });
/** 経験の読み取りの返事を検証する。知らないキーや範囲外の数は受け付けない */
export function parseInsightReply(text: string, by = "外部AI"): AiInsight {
  const raw = extractJson(text) as Record<string, unknown>;
  const clamp = (o: unknown) => Object.fromEntries(Object.entries((o ?? {}) as Record<string, number>).filter(([, v]) => typeof v === "number").map(([k, v]) => [k, Math.max(0, Math.min(1, v))]));
  const r = ReplySchema.parse({ ...raw, personality: clamp(raw.personality), magic: clamp(raw.magic), reasons: Array.isArray(raw.reasons) ? (raw.reasons as unknown[]).slice(0, 5).map((x) => String(x).slice(0, 120)) : [] });
  return AiInsightSchema.parse({ ...r, summary: r.summary.slice(0, 300), by, at: nowIso() });
}
