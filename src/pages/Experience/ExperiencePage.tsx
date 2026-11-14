import { useState } from "react";
import { useGame } from "../../stores/game";
import { addExperience, deleteExperience, rejectExperience, type NewExperience } from "../../services/storage/repo";
import { analyzer } from "../../services/ai";
import { finalizeStats } from "../../game/growth/engine";
import { CATEGORY_DEFS, DIFFICULTY_LABELS } from "../../game/growth/rules";
import { CATEGORY_KEYS, STAT_LABELS, type CategoryKey, type ExperienceEvent, type StatKey } from "../../schemas";
import { Panel, statusPill } from "../../components/ui";
import { todayLocal } from "../../utils/id";
import ImportPanel from "./ImportPanel";
import AiBridge from "../../components/AiBridge";
import { buildAnalysisPrompt, parseInsightReply } from "../../services/ai/bridge";
import { setExperienceAi } from "../../services/storage/repo";
import { MAGIC_LABELS, PERSONALITY_LABELS, type MagicKey, type PersonalityKey } from "../../schemas";

const blank = (): NewExperience => ({ date: todayLocal(), category: "sports", title: "", description: "", difficulty: 3, duration: 60, reflection: "" });

function ProposalCard({ ev }: { ev: ExperienceEvent }) {
  const { character, run, approve } = useGame();
  const [msg, setMsg] = useState("");
  const [confirmDel, setConfirmDel] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  if (!character) return null;
  const g = ev.analysisStatus === "applied" ? ev.approvedGrowth : ev.proposedGrowth;
  const preview = ev.analysisStatus === "proposed" && g ? finalizeStats(g.stats, character.basicStats) : g?.stats ?? {};
  const st = statusPill[ev.analysisStatus];
  const act = async (fn: () => Promise<unknown>, ok: string) => { try { await run(fn); setMsg(ok); } catch (e) { setMsg(e instanceof Error ? e.message : "うまくいきませんでした"); } };
  return (
    <li className="rounded-xl border border-arcane-500/20 bg-night-800/50 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`pill ${st.cls}`}>{st.label}</span>
        <span className="text-xs text-arcane-300">{ev.date} ・ {CATEGORY_DEFS[ev.category].label} ・ {DIFFICULTY_LABELS[ev.difficulty]}{ev.duration ? ` ・ ${ev.duration}分` : ""}</span>
      </div>
      <p className="mt-1 font-serif text-lg">{ev.title}</p>
      {ev.description && <p className="whitespace-pre-wrap text-sm text-arcane-300">{ev.description}</p>}
      {ev.reflection && <p className="mt-1 whitespace-pre-wrap border-l-2 border-gold-500/40 pl-2 text-sm italic text-[#d9d2ef]">{ev.reflection}</p>}
      {ev.ai && (
        <div className="mt-2 rounded-lg border border-arcane-500/25 bg-arcane-500/10 p-2" data-testid="ai-insight">
          <p className="label mb-1">AIの読み取り({ev.ai.by})</p>
          {ev.ai.summary && <p className="text-sm">{ev.ai.summary}</p>}
          <ul className="mt-1 flex flex-wrap gap-1.5">
            {Object.entries(ev.ai.personality).map(([k, v]) => <li key={k} className="pill bg-arcane-500/20 text-arcane-300">{PERSONALITY_LABELS[k as PersonalityKey]} {Math.round(v * 100)}%</li>)}
            {Object.entries(ev.ai.magic).map(([k, v]) => <li key={k} className="pill bg-gold-500/10 text-gold-200">{MAGIC_LABELS[k as MagicKey].name} {Math.round(v * 100)}%</li>)}
          </ul>
          {ev.ai.reasons.length > 0 && <p className="mt-1 text-[11px] text-arcane-300/80">{ev.ai.reasons.join(" ・ ")}</p>}
          <p className="mt-1 text-[10px] text-arcane-300/60">性格と魔法の兆しにだけ使います(能力値はルールで決まります)</p>
        </div>
      )}
      {g && ev.analysisStatus !== "rejected" && (
        <div className="mt-2 rounded-lg bg-night-900/70 p-2">
          <p className="label mb-1">{ev.analysisStatus === "applied" ? "反映した成長" : "成長の見込み(承認すると反映)"}</p>
          <ul className="flex flex-wrap gap-1.5">
            {Object.entries(preview).map(([k, v]) => <li key={k} className="pill num bg-gold-500/15 text-gold-200">{STAT_LABELS[k as StatKey].name} +{v}</li>)}
            <li className="pill num bg-arcane-500/20 text-arcane-300">EXP +{g.exp}</li>
          </ul>
          <p className="mt-1 text-[11px] text-arcane-300/70">{g.notes.join(" ・ ")}</p>
        </div>
      )}
      {ev.analysisStatus === "proposed" && (
        <div className="mt-2 flex flex-wrap gap-2">
          <button className="btn btn-primary" onClick={() => act(() => approve([ev.id]), "成長を反映した!")}>承認して反映</button>
          <button className="btn" onClick={() => act(() => rejectExperience(ev.id), "見送りにした")}>見送る</button>
          <button className="btn-ghost rounded-lg px-2 text-xs text-arcane-300" onClick={() => setAiOpen(!aiOpen)} aria-expanded={aiOpen}>{ev.ai ? "AIに読み取りなおしてもらう" : "AIに読み取ってもらう"}</button>
        </div>
      )}
      {ev.analysisStatus === "proposed" && aiOpen && (
        <div className="mt-2">
          <AiBridge testId="ai-bridge-exp" prompt={buildAnalysisPrompt(ev)} onReply={async (t) => { const ai = parseInsightReply(t); await run(() => setExperienceAi(ev.id, ai)); setAiOpen(false); return "AIの読み取りを付けた"; }} />
        </div>
      )}
      {ev.analysisStatus !== "applied" && (
        <div className="mt-2 text-right">
          {confirmDel
            ? <span className="text-xs">この記録を消す? <button className="btn-ghost rounded px-2 text-candle" onClick={() => act(() => deleteExperience(ev.id), "")}>消す</button><button className="btn-ghost rounded px-2" onClick={() => setConfirmDel(false)}>やめる</button></span>
            : <button className="btn-ghost rounded px-2 text-xs" onClick={() => setConfirmDel(true)}>削除</button>}
        </div>
      )}
      {msg && <p className="mt-1 text-sm text-gold-200" role="status">{msg}</p>}
    </li>
  );
}

export default function ExperiencePage() {
  const { experiences, run, approve } = useGame();
  const [f, setF] = useState<NewExperience>(blank);
  const [msg, setMsg] = useState("");
  const [filter, setFilter] = useState<"all" | "proposed" | "applied">("all");
  const set = <K extends keyof NewExperience>(k: K, v: NewExperience[K]) => setF((p) => ({ ...p, [k]: v }));
  const [bulk, setBulk] = useState(false);
  // 古い順に反映する(繰り返しの判定と年表の順番を自然にするため)
  const waiting = experiences.filter((e) => e.analysisStatus === "proposed").sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
  const shown = experiences.filter((e) => filter === "all" || e.analysisStatus === filter);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
      <div className="grid content-start gap-4">
      <Panel title="経験を登録する">
        <form className="grid gap-3" onSubmit={async (e) => {
          e.preventDefault();
          if (!f.title.trim()) { setMsg("何をしたか(タイトル)を入れてね"); return; }
          try { await run(() => addExperience({ ...f, title: f.title.trim() })); setF(blank()); setMsg("登録した。「登録した経験」で成長の見込みを確認して承認してね"); }
          catch (err) { setMsg(err instanceof Error ? "入力を確認してね" : "保存できませんでした"); }
        }}>
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1 text-sm"><span className="label">日付</span><input id="ex-date" type="date" className="field" value={f.date} onChange={(e) => set("date", e.target.value)} required /></label>
            <label className="grid gap-1 text-sm"><span className="label">種類</span>
              <select id="ex-cat" className="field" value={f.category} onChange={(e) => set("category", e.target.value as CategoryKey)}>
                {CATEGORY_KEYS.map((k) => <option key={k} value={k}>{CATEGORY_DEFS[k].label}</option>)}
              </select>
            </label>
          </div>
          <p className="-mt-1 text-xs text-arcane-300/80">例:{CATEGORY_DEFS[f.category].example} → {Object.keys(CATEGORY_DEFS[f.category].stats).map((k) => STAT_LABELS[k as StatKey].name).join("・")}が伸びやすい</p>
          <label className="grid gap-1 text-sm"><span className="label">何をした?</span><input id="ex-title" className="field" maxLength={80} value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="例:会社のサッカー部の練習試合" /></label>
          <label className="grid gap-1 text-sm"><span className="label">くわしく(任意)</span><textarea id="ex-desc" className="field min-h-[64px]" maxLength={2000} value={f.description} onChange={(e) => set("description", e.target.value)} /></label>
          <div className="grid gap-1 text-sm"><span className="label">挑戦の大きさ</span>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="挑戦の大きさ">
              {[1, 2, 3, 4, 5].map((d) => (
                <button type="button" key={d} role="radio" aria-checked={f.difficulty === d} onClick={() => set("difficulty", d)} className={`rounded-lg border px-2.5 py-1 text-xs ${f.difficulty === d ? "border-gold-300 bg-gold-500/20 text-gold-200" : "border-arcane-500/30 text-arcane-300"}`}>{d} {DIFFICULTY_LABELS[d]}</button>
              ))}
            </div>
          </div>
          <label className="grid gap-1 text-sm"><span className="label">かけた時間(分)</span><input id="ex-dur" type="number" min={0} max={1440} className="field" value={f.duration} onChange={(e) => set("duration", Math.max(0, Math.min(1440, Number(e.target.value) || 0)))} /></label>
          <label className="grid gap-1 text-sm"><span className="label">振り返り(30字以上で成長+20%)</span><textarea id="ex-refl" className="field min-h-[80px]" maxLength={2000} value={f.reflection} onChange={(e) => set("reflection", e.target.value)} placeholder="うまくいったこと・悔しかったこと・次にやりたいこと" /><span className="num text-right text-[11px] text-arcane-300/60">{f.reflection.trim().length}字</span></label>
          <button className="btn btn-primary">登録して成長を見る</button>
          {msg && <p className="text-sm text-gold-200" role="status">{msg}</p>}
          <p className="text-[11px] text-arcane-300/60">分析:{analyzer.name}(データは外に送りません)。成長の量はルールで決まり、承認するまで反映されません。</p>
        </form>
      </Panel>
      <ImportPanel />
      </div>

      <Panel title="登録した経験" right={
        <div className="flex gap-1 text-xs">
          {([["all", "すべて"], ["proposed", "承認まち"], ["applied", "反映済み"]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)} className={`rounded-lg px-2 py-1 ${filter === k ? "bg-gold-500/20 text-gold-200" : "text-arcane-300"}`}>{l}</button>
          ))}
        </div>
      }>
        {waiting.length > 1 && (
          <div className="mb-3 rounded-xl bg-candle/10 px-3 py-2 text-sm">
            {bulk ? (
              <span>承認まちの{waiting.length}件を、見込みどおりに全部反映する? <button className="btn btn-primary ml-1 px-3 py-1 text-xs" onClick={async () => {
                // 反映済みなどは飛ばして続ける
                const ok = await approve(waiting.map((e) => e.id)).catch(() => 0); setBulk(false); setMsg(`${ok}件を反映した`);
              }}>反映する</button> <button className="btn ml-1 px-3 py-1 text-xs" onClick={() => setBulk(false)}>やめる</button></span>
            ) : <button className="text-candle underline-offset-2 hover:underline" onClick={() => setBulk(true)}>承認まちの{waiting.length}件をまとめて反映する…</button>}
          </div>
        )}
        {shown.length === 0 ? <p className="text-sm text-arcane-300">まだありません。左のフォームから、今日の経験を1つ登録してみよう。</p>
          : <ul className="grid gap-3">{shown.map((e) => <ProposalCard key={e.id} ev={e} />)}</ul>}
      </Panel>
    </div>
  );
}
