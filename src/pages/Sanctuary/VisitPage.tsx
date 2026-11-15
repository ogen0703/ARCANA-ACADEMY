import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useGame } from "../../stores/game";
import { approachOptions, approachValue, encounter, reaction, recOf, startDistance } from "../../game/academy/creaturesEngine";
import { spellById } from "../../game/academy/content";
import { ambienceOf } from "../../game/world/ambience";
import { visitSanctuary } from "../../services/storage/repo";
import { P } from "../../game/growth/rules";
import { MagicCircle, Panel } from "../../components/ui";
import FallbackImg from "../../components/FallbackImg";
import { ART } from "../../game/world/art";

export default function VisitPage() {
  const { character: ch, run } = useGame();
  const seed = useRef(Math.floor(Math.random() * 1e9));
  const cr = useMemo(() => { if (!ch) return null; const a = ambienceOf(new Date()); return encounter(ch, a.time, a.weather, seed.current); }, [ch?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const [actions, setActions] = useState<string[]>([]);
  const [lines, setLines] = useState<string[]>([]);
  const [done, setDone] = useState<null | { friend: boolean }>(null);
  const [err, setErr] = useState("");
  if (!ch || !cr) return null;
  const known = recOf(ch, cr.id).attempts > 0 || recOf(ch, cr.id).friend;
  if (recOf(ch, cr.id).friend && !done) {
    return <Panel title={cr.name}><p className="text-sm">仲間の{cr.name}が、うれしそうに駆け寄ってきた。</p><Link to="/sanctuary" className="btn mt-3 inline-block">保護区へ</Link></Panel>;
  }
  const opts = approachOptions(ch, cr);
  let d = startDistance(ch, cr); const used: string[] = [];
  for (const a of actions) { d -= approachValue(cr, a, used); used.push(a); }
  const finish = async (list: string[]) => {
    try { let r: Awaited<ReturnType<typeof visitSanctuary>> | null = null; await run(async () => { r = await visitSanctuary(cr.id, list); }); setDone({ friend: r!.friend }); }
    catch (e) { setErr(e instanceof Error ? e.message : "うまくいきませんでした"); }
  };
  const choose = (a: string) => {
    const v = approachValue(cr, a, actions); const list = [...actions, a];
    setActions(list); setLines((l) => [...l, reaction(v)]);
    if (d - v <= 0 || list.length >= P.approachesPerVisit) finish(list);
  };
  const label = (o: { action: string; label: string }) => (o.action.startsWith("spell:") ? `呪文「${spellById(o.action.slice(6))?.name}」を使う` : o.label);
  return (
    <div className="mx-auto grid max-w-xl gap-4">
      <div className="panel relative overflow-hidden p-4 text-center">
        <div className="absolute inset-0 bg-cover bg-center opacity-35" style={{ backgroundImage: `url(${ART.sanctuary})` }} />
        <div className="relative">
          <div className="relative mx-auto h-48 w-48">
            {done?.friend && <MagicCircle className="absolute inset-0 text-gold-300" />}
            <FallbackImg srcs={ART.creature(cr.id, 0)} className="relative h-full w-full object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)]" />
          </div>
          <p className="font-serif text-xl text-gold-200" data-testid="creature">{cr.name}</p>
          <p className="text-sm text-arcane-300">{cr.desc}</p>
          {known && <p className="mt-1 text-[11px] text-arcane-300/70">前にも会ったことがある(少し近い)</p>}
        </div>
      </div>
      <Panel title={done ? (done.friend ? "仲間になった!" : "去っていった") : `近づき方をえらぶ(あと ${P.approachesPerVisit - actions.length})`}>
        {lines.length > 0 && <ol className="mb-3 space-y-1 text-sm" data-testid="reactions">{lines.map((l, i) => <li key={i}>・{label(opts.find((o) => o.action === actions[i]) ?? { action: actions[i], label: actions[i] })} → {l}</li>)}</ol>}
        {done ? (
          <div className="text-center">
            <p className="font-serif text-lg" data-testid="visit-result">{done.friend ? `${cr.name}が心を開いてくれた。` : `${cr.name}は森の奥へ帰っていった。また会える。`}</p>
            <Link to="/sanctuary" className="btn btn-primary mt-3 inline-block">保護区へ</Link>
          </div>
        ) : (
          <div className="grid gap-2">
            {opts.filter((o) => o.ok).map((o) => <button key={o.action} className={`btn justify-start text-sm ${o.action.startsWith("spell:") ? "border-gold-400/50" : ""}`} onClick={() => choose(o.action)}>{label(o)}</button>)}
            {actions.length > 0 && <button className="btn-ghost rounded px-2 text-left text-xs text-arcane-300" onClick={() => finish(actions)}>そっと離れる</button>}
            {actions.length === 0 && <Link to="/sanctuary" className="text-xs text-arcane-300">近づかずに戻る(回数は使わない)</Link>}
          </div>
        )}
        {err && <p className="mt-2 text-sm text-candle">{err}</p>}
      </Panel>
    </div>
  );
}
