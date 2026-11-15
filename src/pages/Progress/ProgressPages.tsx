import { useState } from "react";
import { Link } from "react-router-dom";
import { useGame } from "../../stores/game";
import { ACHIEVEMENTS, ACH_GROUPS, addDays, houseRanking, reportCard, weekStart, type AchGroup, type Logs } from "../../game/academy/progress";
import { todayLocal } from "../../utils/id";
import { Panel } from "../../components/ui";

const useLogs = (): Logs => { const g = useGame(); return { experiences: g.experiences, lessons: g.lessons, explorations: g.explorations, battles: g.battles, talks: g.talks, sanctuary: g.sanctuary, research: g.research }; };
const shiftMonth = (ym: string, n: number) => { const [y, m] = ym.split("-").map(Number); const d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };
const GRADE_CLS: Record<string, string> = { S: "text-gold-200", A: "text-gold-300/90", B: "text-arcane-300", C: "text-arcane-300/80", "—": "text-arcane-300/50" };

/** 図鑑の「実績」タブ */
export function AchievementBook() {
  const { character: ch } = useGame(); const logs = useLogs();
  if (!ch) return null;
  const done = ACHIEVEMENTS.filter((a) => ch.world.achievements[a.id]).length;
  return (
    <div className="grid gap-4" data-testid="achievements">
      <p className="num text-sm">達成 <span className="text-gold-200">{done}</span> / {ACHIEVEMENTS.length}</p>
      {(Object.keys(ACH_GROUPS) as AchGroup[]).map((g) => (
        <div key={g}>
          <p className="label mb-1">{ACH_GROUPS[g]}</p>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {ACHIEVEMENTS.filter((a) => a.group === g).map((a) => {
              const at = ch.world.achievements[a.id], st = a.check(ch, logs);
              return (
                <li key={a.id} className={`rounded-xl border px-3 py-2 ${at ? "border-gold-400/40 bg-gold-500/10" : "border-arcane-500/15"}`} data-ach={a.id}>
                  <p className={`font-serif ${at ? "text-gold-200" : "text-arcane-300"}`}>{at ? "✦" : "・"} {a.name}{a.title && <span className="pill ml-1 bg-gold-500/15 text-[10px] text-gold-200">称号</span>}</p>
                  <p className="text-[11px] text-arcane-300">{a.cond}{at ? ` ・ ${at.slice(5).replace("-", "/")} 達成` : st.goal ? `(いま ${st.now}/${st.goal})` : ""}</p>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <p className="text-[11px] text-arcane-300/70">達成すると EXP +10。現実の歩みは通算で数える(途切れても減らない)。</p>
    </div>
  );
}

/** 学院内評価:月ごとの成績表 */
export function ReportCardPage() {
  const { character: ch } = useGame(); const logs = useLogs();
  const today = todayLocal(); const [m, setM] = useState(today.slice(0, 7));
  if (!ch) return null;
  const r = reportCard(ch, logs, m), current = m === today.slice(0, 7);
  return (
    <div className="mx-auto grid max-w-xl gap-4">
      <Panel title="成績表 ・ 学院内評価" right={<div className="flex items-center gap-2 text-xs"><button className="text-candle" onClick={() => setM(shiftMonth(m, -1))}>‹ 前の月</button><span className="num">{m.replace("-", "年")}月</span>{!current && <button className="text-candle" onClick={() => setM(shiftMonth(m, 1))}>次の月 ›</button>}</div>}>
        <p className="mb-3 text-xs text-arcane-300">{current ? "今月の途中経過。月が終わると、この月の成績表になる。" : "この月の成績表。"}評価で失うものはない。</p>
        <table className="w-full text-sm" data-testid="report-card">
          <tbody>
            {r.items.map((it) => (
              <tr key={it.key} className="border-b border-arcane-500/10">
                <td className="py-2"><span className="font-serif">{it.name}</span><span className="block text-[10px] text-arcane-300">{it.what}</span></td>
                <td className="num py-2 text-right text-xs text-arcane-300">{it.n}</td>
                <td className={`w-20 py-2 text-center font-display text-2xl ${GRADE_CLS[it.grade]}`}>{it.grade === "—" ? <span className="whitespace-nowrap font-sans text-[11px]">これから</span> : it.grade}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-3 flex items-center justify-between rounded-xl bg-night-800/60 px-3 py-2">
          <span className="font-serif">総合</span><span className={`font-display text-3xl ${GRADE_CLS[r.total]}`} data-testid="report-total">{r.total === "—" ? <span className="font-sans text-sm">これから</span> : r.total}</span>
        </div>
        {r.comment && <p className="mt-3 font-serif text-sm leading-relaxed" data-testid="report-comment">「{r.comment.text}」<span className="block text-right text-xs text-arcane-300">— {r.comment.teacher}</span></p>}
        <details className="mt-3 text-[11px] text-arcane-300/80"><summary>評価の目安</summary><ul className="mt-1 space-y-0.5">{r.items.map((it) => <li key={it.key}>{it.name}:S {it.th[0]} ・ A {it.th[1]} ・ B {it.th[2]} ・ C {it.th[3]}</li>)}</ul></details>
      </Panel>
    </div>
  );
}

/** 寮の廊下:週ごとの寮内ランキング */
export function HousePage() {
  const { character: ch } = useGame(); const logs = useLogs();
  const today = todayLocal(); const [week, setWeek] = useState(weekStart(today));
  if (!ch) return null;
  const r = houseRanking(ch, logs, week, today);
  if (!r) return <Panel title="寮の廊下"><p className="text-sm">寮が決まると、寮の仲間とのランキングが見られる。<Link to="/diagnosis" className="text-candle">入学診断へ</Link></p></Panel>;
  const thisWeek = week === weekStart(today);
  const P: Record<string, string> = { real: "現実の経験(日×3)", lesson: "授業", battle: "演習の勝利", explore: "探索", research: "研究・調合", talk: "会話" };
  return (
    <div className="mx-auto grid max-w-xl gap-4">
      <Panel title={`寮の廊下 ・ ${ch.history.house}`} right={<div className="flex items-center gap-2 text-xs"><button className="text-candle" onClick={() => setWeek(addDays(week, -7))}>‹ 前の週</button>{!thisWeek && <button className="text-candle" onClick={() => setWeek(addDays(week, 7))}>次の週 ›</button>}</div>}>
        <p className="mb-2 text-xs text-arcane-300">{week.slice(5).replace("-", "/")}〜{addDays(week, 6).slice(5).replace("-", "/")} の寮への貢献点{thisWeek ? "(今週の途中経過)" : ""}</p>
        <ol className="grid gap-1.5" data-testid="ranking">
          {r.rows.map((row, i) => (
            <li key={row.id} className={`flex items-center gap-3 rounded-xl px-3 py-2 ${row.me ? "border border-gold-400/60 bg-gold-500/10" : "bg-night-800/50"}`} data-me={row.me || undefined}>
              <span className={`num w-6 text-center font-display text-lg ${i === 0 ? "text-gold-200" : "text-arcane-300"}`}>{i + 1}</span>
              <span className="min-w-0 flex-1"><span className={row.me ? "font-serif text-gold-200" : "font-serif"}>{row.name}</span><span className="block text-[10px] text-arcane-300">{row.trait}</span></span>
              <span className="num text-sm">{row.points}<span className="text-[10px] text-arcane-300"> 点</span></span>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs">あなたの点のうちわけ:{Object.entries(r.parts).filter(([, v]) => v > 0).map(([k, v]) => `${P[k]} ${v}`).join(" ・ ") || "まだなし"}</p>
        <p className="mt-2 text-[11px] text-arcane-300/70">点は、現実の経験を承認した日+3、授業1コマ+1(正解+1)、演習の勝利+2、探索+2、研究・調合+1、話題つきの会話+1。初めて週の1位になると称号「寮の星」。1位の週:{ch.world.houseStars.length}回。順位が下でも失うものはない。</p>
      </Panel>
    </div>
  );
}
