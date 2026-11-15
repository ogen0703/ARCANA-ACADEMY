import { useState } from "react";
import { Link } from "react-router-dom";
import { useGame } from "../../stores/game";
import { TEACHER_QUESTS, materialById } from "../../game/academy/explore";
import { COURSES } from "../../game/academy/content";
import { canMakeWand, teacherQuestStatus, wandFor, weekStart, weeklyProgress, weeklyQuestsFor, weeklyStreak } from "../../game/academy/exploreEngine";
import { makeWandNow, receiveWeekly, reportTeacherQuest, setActiveTitle } from "../../services/storage/repo";
import { P } from "../../game/growth/rules";
import { Bar, Panel } from "../../components/ui";

export default function QuestsPage() {
  const { character: ch, experiences, run } = useGame();
  const [msg, setMsg] = useState("");
  if (!ch) return null;
  const act = async (fn: () => Promise<unknown>, ok: string) => { try { await run(fn); setMsg(ok); } catch (e) { setMsg(e instanceof Error ? e.message : "うまくいきませんでした"); } };
  const wand = canMakeWand(ch);
  const ws = weekStart(new Date());
  const weekly = weeklyQuestsFor(ws);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {msg && <p className="rounded-xl bg-gold-500/15 px-3 py-2 text-sm text-gold-200 lg:col-span-2" role="status">{msg}</p>}
      <Panel title="杖えらびの儀">
        {ch.history.wand ? <p className="text-sm">あなたの杖:<span className="font-serif text-gold-200" data-testid="wand">{ch.history.wand}</span></p> : (
          <div className="text-sm">
            <p className="text-arcane-300">ブラム先生の工房で、星の欠片を芯にして杖を作る。木は入学診断でいちばん強い系統で決まる。</p>
            {wand.ok ? (
              <>
                <p className="mt-2">できあがる杖:<span className="font-serif text-gold-200">{wandFor(ch)}</span></p>
                <button className="btn btn-primary mt-2" onClick={() => act(() => makeWandNow(), "杖ができた!")}>杖を作る(星の欠片を1つ使う)</button>
              </>
            ) : <p className="mt-2 text-candle">{wand.reason}</p>}
          </div>
        )}
      </Panel>

      <Panel title="週替わりの課題" right={<span className="text-[11px] text-arcane-300">{ws} の週 ・ 連続 {weeklyStreak(ch, ws)} 週</span>}>
        <p className="mb-2 text-xs text-arcane-300">この週に承認した現実の経験で達成。報酬は EXP +{P.weeklyQuestExp} と素材。</p>
        <ul className="grid gap-2" data-testid="weekly">
          {weekly.map((q, idx) => {
            const pr = weeklyProgress(q, experiences, ws), claimed = ch.world.quests.includes(`w:${ws}:${q.id}`);
            return (
              <li key={q.id} className="rounded-lg bg-night-800/60 p-2 text-sm">
                <div className="flex items-center justify-between gap-2"><span>{q.text}</span><span className="num text-xs text-gold-200">{pr.now}/{pr.need}</span></div>
                <div className="mt-1"><Bar value={pr.now} max={pr.need} /></div>
                {claimed ? <p className="mt-1 text-xs text-gold-200">✓ 受け取り済み</p>
                  : pr.met ? <button className="btn btn-primary mt-1 px-3 py-1 text-xs" onClick={() => act(() => receiveWeekly(ws, q.id), "報酬を受け取った")}>報酬を受け取る({materialById(["stardust", "glowmoss", "violetink"][idx])?.name})</button>
                    : null}
              </li>
            );
          })}
        </ul>
        <Link to="/experience" className="mt-2 inline-block text-xs text-candle">経験を記録する →</Link>
      </Panel>

      <Panel title="先生の課題" className="lg:col-span-2">
        <ul className="grid gap-2 sm:grid-cols-2" data-testid="teacher-quests">
          {TEACHER_QUESTS.map((q) => {
            const st = teacherQuestStatus(ch, q.id), c = COURSES[q.course];
            return (
              <li key={q.id} className={`rounded-lg border p-2 text-sm ${st.unlocked ? "border-arcane-500/30" : "border-arcane-500/10 opacity-60"}`}>
                <p className="text-xs text-arcane-300">{c.teacher.name} {c.teacher.title}</p>
                <p>{st.unlocked ? q.text : `🔒 ${c.name}の単元2を受けると出る`}</p>
                <p className="text-[11px] text-arcane-300">報酬:{c.name}の熟練度 +{P.teacherQuestProf}・称号「{q.title}」</p>
                {st.claimed ? <p className="text-xs text-gold-200">✓ 報告済み</p> : st.unlocked && st.met ? <button className="btn btn-primary mt-1 px-3 py-1 text-xs" onClick={() => act(() => reportTeacherQuest(q.id), `報告した。称号「${q.title}」`)}>先生に報告する</button> : null}
              </li>
            );
          })}
        </ul>
      </Panel>

      <Panel title="称号" className="lg:col-span-2" right={<span className="num text-xs text-gold-200">{ch.titles.length}</span>}>
        {ch.titles.length === 0 ? <p className="text-sm text-arcane-300">まだない。探索やクエストで手に入る。</p> : (
          <>
            <p className="mb-2 text-xs text-arcane-300">ひとつ選ぶと、名前の下に表示される。</p>
            <ul className="flex flex-wrap gap-2" data-testid="titles">
              {ch.titles.map((t) => {
                const on = ch.world.activeTitle === t.name;
                return <li key={t.id}><button aria-pressed={on} onClick={() => act(() => setActiveTitle(on ? null : t.name), on ? "称号の表示をやめた" : `「${t.name}」を表示する`)} className={`rounded-full border px-3 py-1 text-xs ${on ? "border-gold-300 bg-gold-500/20 text-gold-200" : "border-arcane-500/30"}`}>{t.name}</button></li>;
              })}
            </ul>
          </>
        )}
      </Panel>
    </div>
  );
}
