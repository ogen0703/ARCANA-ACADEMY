import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useGame } from "../../stores/game";
import { placeById, materialById, discoveryById } from "../../game/academy/explore";
import { roomOptions, type Step } from "../../game/academy/exploreEngine";
import { spellById } from "../../game/academy/content";
import { explore } from "../../services/storage/repo";
import { MagicCircle, Panel } from "../../components/ui";
import { ART } from "../../game/world/art";

type Result = Awaited<ReturnType<typeof explore>>;

export default function ExploreRunPage() {
  const { place = "" } = useParams();
  const { character: ch, run } = useGame();
  const [steps, setSteps] = useState<Step[]>([]);
  const [note, setNote] = useState("");
  const [done, setDone] = useState<Result | null>(null);
  const [err, setErr] = useState("");
  const p = placeById(place);
  if (!ch) return null;
  if (!p) return <Panel title="探索"><p className="text-sm">その場所はありません。<Link to="/explore" className="text-candle">探索へ</Link></p></Panel>;
  const i = steps.length;
  const atEnd = i >= p.rooms.length;
  const finish = async (s: Step[]) => {
    try { let r: Result | null = null; await run(async () => { r = await explore(p.id, s); }); setDone(r); }
    catch (e) { setErr(e instanceof Error ? e.message : "うまくいきませんでした"); }
  };
  const choose = (method: string, text: string) => {
    const s = [...steps, { room: p.rooms[i].id, method }];
    setSteps(s); setNote(text);
    if (s.length >= p.rooms.length) finish(s);
  };

  if (done) {
    return (
      <div className="mx-auto grid max-w-xl gap-4">
        <Panel title={`${p.name} ・ 帰還`}>
          <div className="relative mx-auto grid h-28 w-28 place-items-center"><MagicCircle className="absolute inset-0 text-gold-400/60" /><span className="relative text-3xl text-gold-200">{done.completed ? "✦" : "↩"}</span></div>
          <p className="text-center font-serif text-lg" data-testid="explore-result">{done.completed ? "最奥までたどり着いた" : `${steps.length}部屋進んで引き返した`}</p>
          <ul className="mt-3 flex flex-wrap justify-center gap-2">
            {Object.entries(done.items).map(([k, v]) => <li key={k} className="pill bg-gold-500/15 text-gold-200">{materialById(k)?.name} ×{v}</li>)}
            <li className="pill num bg-arcane-500/20 text-arcane-300">EXP +{done.exp}</li>
          </ul>
          {done.discoveries.map((d) => (
            <div key={d} className="mt-3 rounded-xl border border-gold-400/40 bg-gold-500/10 p-3" data-testid="discovery">
              <p className="label">新しい発見</p><p className="font-serif text-gold-200">{discoveryById(d)?.name}</p><p className="text-sm">{discoveryById(d)?.text}</p>
            </div>
          ))}
          <div className="mt-4 flex justify-center gap-2"><Link to="/explore" className="btn btn-primary">探索へ</Link><Link to="/quests" className="btn">クエストを見る</Link></div>
        </Panel>
      </div>
    );
  }

  const opt = !atEnd ? roomOptions(ch, p.id, i) : null;
  const usable = opt ? opt.spells.filter((s) => s.learned) : [];
  const blocked = opt && !usable.length && !opt.alts.length && !opt.canSkip && !opt.companion;
  return (
    <div className="mx-auto grid max-w-xl gap-4">
      <div className="relative -mb-2 aspect-[3/1] overflow-hidden rounded-2xl border border-gold-500/20">
        <img src={ART.place(p.id)} alt="" onError={(e) => { e.currentTarget.style.display = "none"; }} className="absolute inset-0 h-full w-full object-cover transition-[object-position] duration-700" style={{ objectPosition: `${50}% ${Math.round(85 - (i / p.rooms.length) * 60)}%` }} />
        <div className="absolute inset-0 bg-gradient-to-t from-night-950/80 to-transparent" />
        <p className="absolute bottom-2 left-3 text-[11px] text-arcane-300">{p.kind}</p>
      </div>
      <Panel title={p.name} right={<span className="num text-xs text-arcane-300">部屋 {Math.min(i + 1, p.rooms.length)} / {p.rooms.length}</span>}>
        <ol className="flex gap-1" aria-label="進み具合">{p.rooms.map((r, j) => <li key={r.id} className={`h-1.5 flex-1 rounded ${j < i ? "bg-gold-400" : j === i ? "bg-candle" : "bg-night-800"}`} />)}</ol>
        {note && <p className="mt-2 text-xs text-arcane-300">{note}</p>}
      </Panel>
      {opt && (
        <Panel title={opt.room.name}>
          <p className="font-serif text-lg" data-testid="room-desc">{opt.room.desc}</p>
          <div className="mt-3 grid gap-2">
            {usable.map((s) => <button key={s.id} className="btn btn-primary justify-start" onClick={() => choose(s.method, `「${spellById(s.id)?.name}」で通った`)}>✧ 呪文「{spellById(s.id)?.name}」を使う</button>)}
            {opt.companion && <button className="btn justify-start border-gold-400/50" onClick={() => choose(opt.companion!.method, opt.companion!.label)}>❦ {opt.companion.label}</button>}
            {opt.alts.map((a) => <button key={a.method} className="btn justify-start" onClick={() => choose(a.method, `${a.label}`)}>{a.label}</button>)}
            {opt.canSkip && <button className="btn justify-start" onClick={() => choose("skip", "読めないまま先へ進んだ")}>読めないまま先へ進む(発見はなし)</button>}
            {opt.spells.filter((s) => !s.learned).length > 0 && <p className="text-[11px] text-arcane-300/70">ここでは「{opt.spells.filter((s) => !s.learned).map((s) => spellById(s.id)?.name).join("」「")}」も使えそう(まだ覚えていない)</p>}
            {blocked && <p className="text-sm text-candle" data-testid="blocked">今の呪文では通れない。また今度。</p>}
          </div>
          <button className="btn-ghost mt-3 rounded px-2 text-sm text-arcane-300" onClick={() => (i === 0 ? history.back() : finish(steps))}>{i === 0 ? "入らずに戻る" : "ここで引き返す(持ち帰る)"}</button>
          {err && <p className="mt-2 text-sm text-candle">{err}</p>}
        </Panel>
      )}
    </div>
  );
}
