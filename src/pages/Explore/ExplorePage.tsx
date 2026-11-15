import { Link } from "react-router-dom";
import { useGame } from "../../stores/game";
import { PLACES, DISCOVERIES } from "../../game/academy/explore";
import { canEnter } from "../../game/academy/exploreEngine";
import { P } from "../../game/growth/rules";
import { todayLocal } from "../../utils/id";
import { Panel } from "../../components/ui";
import { ART } from "../../game/world/art";

export default function ExplorePage() {
  const { character: ch, explorations } = useGame();
  if (!ch) return null;
  const left = Math.max(0, P.explorePerDay - explorations.filter((e) => e.date === todayLocal()).length);
  return (
    <div className="grid gap-4">
      <Panel title="探索" right={<span className="num text-sm text-gold-200" data-testid="explore-left">今日あと {left} 回</span>}>
        <p className="mb-3 text-sm text-arcane-300">覚えた呪文で道をひらく。通れない場所は「また今度」。失敗はない。探索では能力値は上がらない。</p>
        <ul className="grid gap-3 sm:grid-cols-2">
          {PLACES.map((p) => {
            const enter = canEnter(ch, p);
            const found = DISCOVERIES.filter((d) => d.place === p.id);
            const got = found.filter((d) => ch.world.discoveries.includes(d.id)).length;
            const img = ART.place(p.id);
            const body = (
              <>
                <div className="relative mb-2 aspect-[3/2] overflow-hidden rounded-lg bg-[radial-gradient(circle_at_50%_60%,rgba(244,214,140,0.18),rgba(42,46,110,0.45)_65%)]">
                  <img src={img} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display = "none"; }} className="absolute inset-0 h-full w-full object-cover" />
                  <span className="absolute left-2 top-2 rounded bg-night-950/70 px-2 py-0.5 text-[11px] text-arcane-300">{p.kind}</span>
                </div>
                <p className="font-serif text-lg text-gold-200">{p.name}</p>
                <p className="text-xs text-arcane-300">{p.desc}</p>
                <p className="mt-1 text-xs"><span className="text-arcane-300">部屋 {p.rooms.length} ・ 発見 </span><span className="num text-gold-200">{got}/{found.length}</span></p>
                <p className={`mt-1 text-xs ${enter.ok ? "text-candle" : "text-arcane-300/70"}`}>{enter.ok ? (left > 0 ? "探索する →" : "今日はもうおしまい") : `🔒 ${enter.reason}`}</p>
              </>
            );
            return <li key={p.id} data-place={p.id}>{enter.ok && left > 0 ? <Link to={`/explore/${p.id}`} className="block rounded-xl border border-gold-500/30 p-3 hover:bg-gold-500/10">{body}</Link> : <div className="rounded-xl border border-arcane-500/15 p-3 opacity-80">{body}</div>}</li>;
          })}
        </ul>
      </Panel>
      <Link to="/quests" className="panel block p-4 hover:bg-gold-500/5"><p className="font-serif text-gold-200">クエスト ・ 杖えらび ・ 称号 →</p><p className="text-xs text-arcane-300">先生の課題、現実とつながる週替わりの課題</p></Link>
    </div>
  );
}
