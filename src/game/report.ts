/** 成長レポート(Phase 3)。反映済みの経験と成長履歴から、期間ごとのまとめを作る。純粋関数 */
import { MAGIC_LABELS, PERSONALITY_LABELS, STAT_LABELS, type ExperienceEvent, type MagicKey, type PersonalityKey, type StatHistory, type StatKey } from "../schemas";
import { CATEGORY_DEFS } from "./growth/rules";

export type PeriodKey = "thisWeek" | "lastWeek" | "thisMonth" | "lastMonth";
export const PERIOD_LABELS: Record<PeriodKey, string> = { thisWeek: "今週", lastWeek: "先週", thisMonth: "今月", lastMonth: "先月" };

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
/** 期間の最初と最後の日(週は月曜はじまり) */
export function periodRange(key: PeriodKey, now: Date): { from: string; to: string; id: string } {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (key === "thisWeek" || key === "lastWeek") {
    const mon = new Date(d); mon.setDate(d.getDate() - ((d.getDay() + 6) % 7) - (key === "lastWeek" ? 7 : 0));
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    return { from: ymd(mon), to: ymd(sun), id: `w:${ymd(mon)}` };
  }
  const first = new Date(d.getFullYear(), d.getMonth() - (key === "lastMonth" ? 1 : 0), 1);
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
  return { from: ymd(first), to: ymd(last), id: `m:${ymd(first).slice(0, 7)}` };
}

const top = <K extends string>(m: Partial<Record<K, number>>, n = 3) => (Object.entries(m) as [K, number][]).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, n);
const r1 = (n: number) => Math.round(n * 10) / 10;

export function buildReport(experiences: ExperienceEvent[], history: StatHistory[], from: string, to: string) {
  const evs = experiences.filter((e) => e.analysisStatus === "applied" && e.date >= from && e.date <= to).sort((a, b) => a.date.localeCompare(b.date));
  const ids = new Set(evs.map((e) => e.id));
  const hs = history.filter((h) => ids.has(h.eventId));
  const stats: Partial<Record<StatKey, number>> = {}, pers: Partial<Record<PersonalityKey, number>> = {}, magic: Partial<Record<MagicKey, number>> = {};
  const cats: Record<string, number> = {};
  for (const h of hs) if (h.kind === "stat") stats[h.key as StatKey] = r1((stats[h.key as StatKey] ?? 0) + h.after - h.before);
  for (const e of evs) {
    cats[e.category] = (cats[e.category] ?? 0) + 1;
    for (const [k, v] of Object.entries(e.approvedGrowth?.personalitySignals ?? {})) pers[k as PersonalityKey] = r1((pers[k as PersonalityKey] ?? 0) + (v ?? 0));
    for (const [k, v] of Object.entries(e.approvedGrowth?.magicSignals ?? {})) magic[k as MagicKey] = r1((magic[k as MagicKey] ?? 0) + (v ?? 0));
  }
  const levels = hs.filter((h) => h.kind === "level").sort((a, b) => a.at.localeCompare(b.at));
  const exp = evs.reduce((s, e) => s + (e.approvedGrowth?.exp ?? 0), 0);
  const days = new Set(evs.map((e) => e.date)).size;
  const topStats = top(stats), topCats = top(cats), topPers = top(pers), topMagic = top(magic);

  // ルールで作るひとこと
  const lines: string[] = [];
  if (!evs.length) lines.push("この期間に反映した経験はまだない。小さなことでも1つ登録すると、ここにまとめが出る。");
  else {
    lines.push(`${days}日・${evs.length}件の経験で EXP +${exp}。` + (levels.length ? `レベルが ${levels[0].before} → ${levels[levels.length - 1].after} に上がった。` : ""));
    if (topCats.length) lines.push(`中心は「${CATEGORY_DEFS[topCats[0][0] as keyof typeof CATEGORY_DEFS].label}」(${topCats[0][1]}件)。`);
    if (topStats.length) lines.push(`いちばん伸びたのは${STAT_LABELS[topStats[0][0]].name}(+${topStats[0][1]})。`);
    if (topPers.length) lines.push(`行動に表れていたのは「${topPers.map(([k]) => PERSONALITY_LABELS[k]).join("・")}」。`);
    if (topMagic.length) lines.push(`${MAGIC_LABELS[topMagic[0][0]].name}の兆しが強まっている。`);
  }
  // AIに渡すまとめ(タイトルと数字だけ。くわしい内容や振り返りは入れない)
  const forAi = [
    `## 期間:${from}〜${to}`,
    `- 経験:${evs.length}件(${days}日) / EXP +${exp}${levels.length ? ` / Lv.${levels[0].before}→${levels[levels.length - 1].after}` : ""}`,
    `- 伸びた能力:${topStats.map(([k, v]) => `${STAT_LABELS[k].name}+${v}`).join("、") || "なし"}`,
    `- 経験の種類:${topCats.map(([k, v]) => `${CATEGORY_DEFS[k as keyof typeof CATEGORY_DEFS].label}${v}件`).join("、") || "なし"}`,
    `- 表れた性格の傾向:${topPers.map(([k]) => PERSONALITY_LABELS[k]).join("、") || "なし"}`,
    `- 強まった魔法の兆し:${topMagic.map(([k]) => MAGIC_LABELS[k].name).join("、") || "なし"}`,
    "- 経験のタイトル:",
    ...evs.slice(-20).map((e) => `  - ${e.date} ${e.title}`),
  ].join("\n");
  return { evs, exp, days, levels, stats, topStats, topCats, topPers, topMagic, comment: lines.join(""), forAi };
}
