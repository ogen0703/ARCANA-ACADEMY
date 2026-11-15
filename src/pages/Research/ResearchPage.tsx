import { useState } from "react";
import { Link } from "react-router-dom";
import { useGame } from "../../stores/game";
import { COMPOUNDS, progressOf, stepsFor, type ResearchResult } from "../../game/academy/compound";
import { spellById } from "../../game/academy/content";
import { doResearch } from "../../services/storage/repo";
import { P } from "../../game/growth/rules";
import { MAGIC_LABELS } from "../../schemas";
import { todayLocal } from "../../utils/id";
import { MagicCircle, Panel } from "../../components/ui";
import { ART } from "../../game/world/art";

/** 魔法研究室(Phase 5b):覚えた呪文を2つ選んで組み合わせを研究する(1日1回) */
export default function ResearchPage() {
  const { character: ch, research, run } = useGame();
  const [pick, setPick] = useState<string[]>([]);
  const [res, setRes] = useState<ResearchResult | null>(null);
  const [err, setErr] = useState("");
  if (!ch) return null;
  const left = Math.max(0, P.researchPerDay - research.filter((r) => r.date === todayLocal()).length);
  const spells = ch.learnedSpells.map((id) => spellById(id)!).filter(Boolean);
  const toggle = (id: string) => setPick((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= 2 ? [p[1], id] : [...p, id]));
  const sameSystem = pick.length === 2 && spellById(pick[0])!.system === spellById(pick[1])!.system;
  const go = async () => {
    setErr("");
    try {
      let r: ResearchResult | null = null; await run(async () => { r = await doResearch(pick[0], pick[1]); }); setRes(r); setPick([]);
      const done = r as ResearchResult | null;
      if (done?.kind === "learned") useGame.setState((s) => ({ burst: s.burst + 1, effect: { id: Date.now(), kind: "spell", spells: [done.compound!.name], title: `新しい魔法「${done.compound!.name}」`, stats: {}, exp: 0, levelFrom: ch.level, levelTo: ch.level } }));
    }
    catch (e) { setErr(e instanceof Error ? e.message : "うまくいきませんでした"); }
  };
  const inProgress = COMPOUNDS.filter((c) => !ch.world.compounds.includes(c.id) && progressOf(ch, c.id) > 0);

  return (
    <div className="mx-auto grid max-w-2xl gap-4">
      <div className="panel relative overflow-hidden p-4">
        <div className="absolute inset-0 bg-cover bg-center opacity-35" style={{ backgroundImage: `url(${ART.areas.library})` }} />
        <div className="relative">
          <p className="font-serif text-xl text-gold-200">魔法研究室</p>
          <p className="text-sm text-arcane-300">大図書館の奥。違う系統の呪文を2つ組み合わせて、新しい魔法を探す。</p>
          <p className="num mt-1 text-xs">今日あと {left} 回 ・ 見つけた複合魔法 {ch.world.compounds.length} / {COMPOUNDS.length}</p>
        </div>
      </div>

      {res && (
        <Panel title="研究の結果">
          <div className="relative mx-auto grid h-28 w-28 place-items-center">
            <MagicCircle className={`absolute inset-0 ${res.kind === "learned" ? "text-gold-300" : "text-arcane-400/60"}`} />
            <span className="relative text-3xl text-gold-200" aria-hidden="true">{res.kind === "learned" ? "✦" : res.kind === "progress" ? "✧" : "·"}</span>
          </div>
          <p className="text-center font-serif text-lg" data-testid="research-result">
            {res.kind === "learned" ? `新しい魔法「${res.compound!.name}」が形になった` : res.kind === "progress" ? `手ごたえあり(${res.step} / ${res.steps})` : res.kind === "weak" ? "あと少しで何かが起きそうだ" : "何も起きなかった"}
          </p>
          {res.kind === "learned" && <p className="mt-1 text-center text-sm text-arcane-300">{res.compound!.effect}。{res.compound!.use}。</p>}
          {res.hint && <p className="mt-1 text-center text-sm text-arcane-300">{res.hint}</p>}
          <ul className="mt-2 flex flex-wrap justify-center gap-2">
            {Object.entries(res.prof).filter(([, v]) => (v ?? 0) > 0).map(([k, v]) => <li key={k} className="pill num bg-gold-500/15 text-gold-200">{MAGIC_LABELS[k as keyof typeof MAGIC_LABELS].name}の熟練度 +{v}</li>)}
          </ul>
        </Panel>
      )}

      <Panel title="呪文を2つえらぶ">
        {spells.length < 2 ? <p className="text-sm text-arcane-300">覚えた呪文が2つ以上になると研究できる。<Link to="/lessons" className="text-candle">講義棟へ</Link></p> : (
          <>
            <ul className="grid grid-cols-2 gap-2">
              {spells.map((sp) => (
                <li key={sp.id}><button aria-pressed={pick.includes(sp.id)} onClick={() => toggle(sp.id)} className={`w-full rounded-xl border px-3 py-2 text-left ${pick.includes(sp.id) ? "border-gold-300 bg-gold-500/15" : "border-arcane-500/30"}`}>
                  <span className="block font-serif text-sm">{sp.name}</span><span className="text-[10px] text-arcane-300">{MAGIC_LABELS[sp.system].name}</span>
                </button></li>
              ))}
            </ul>
            {sameSystem && <p className="mt-2 text-xs text-candle">同じ系統どうしは組み合わせられない。</p>}
            <button className="btn btn-primary mt-3" data-testid="research" disabled={left === 0 || pick.length !== 2 || sameSystem} onClick={go}>この2つで研究する</button>
            {left === 0 && <p className="mt-2 text-sm text-candle">今日の研究はおしまい(1日{P.researchPerDay}回)。また明日。</p>}
            {err && <p className="mt-2 text-sm text-candle">{err}</p>}
            <p className="mt-2 text-[11px] text-arcane-300/60">研究するたびに、選んだ2つの講座の熟練度が+{P.researchProf}。両方の系統の魔法適性が{P.researchAffinity}以上だと研究が進む。</p>
          </>
        )}
      </Panel>

      <Panel title="研究ノート">
        <ul className="grid gap-2" data-testid="compounds">
          {COMPOUNDS.map((c) => {
            const known = ch.world.compounds.includes(c.id), p = progressOf(ch, c.id);
            return (
              <li key={c.id} className="rounded-xl border border-arcane-500/20 px-3 py-2">
                {known ? (
                  <><p className="font-serif text-gold-200">✦ {c.name}</p><p className="text-xs text-arcane-300">{spellById(c.a)!.name} + {spellById(c.b)!.name} ・ {c.use}</p></>
                ) : p > 0 ? (
                  <><p className="font-serif">{c.name}(研究中 {p} / {stepsFor(ch, c)})</p><p className="text-xs text-arcane-300">{spellById(c.a)!.name} + {spellById(c.b)!.name}</p></>
                ) : <p className="text-arcane-300/60">?????</p>}
              </li>
            );
          })}
        </ul>
        {inProgress.length === 0 && ch.world.compounds.length === 0 && <p className="mt-2 text-xs text-arcane-300">まだ何も見つけていない。自分の寮の2つの系統は、とくに響き合いやすいらしい。</p>}
      </Panel>
    </div>
  );
}
