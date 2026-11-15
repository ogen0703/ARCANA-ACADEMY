import { Link } from "react-router-dom";
import { useGame } from "../../stores/game";
import { NPCS, stageOf } from "../../game/academy/npc";
import { trustOf } from "../../game/academy/npcEngine";
import { P } from "../../game/growth/rules";
import { todayLocal } from "../../utils/id";
import { Bar, Panel } from "../../components/ui";
import { ART } from "../../game/world/art";

export default function LoungePage() {
  const { character: ch, talks } = useGame();
  if (!ch) return null;
  const today = todayLocal();
  const count = (id: string) => talks.filter((t) => t.date === today && t.npc === id && (t.kind === "talk" || t.kind === "chat")).length;
  const groups = [["学院の仲間", NPCS.filter((n) => n.kind === "classmate")], ["先生", NPCS.filter((n) => n.kind === "teacher")]] as const;
  return (
    <div className="grid gap-4">
      <Panel title="談話室">
        <p className="text-sm text-arcane-300">学院の人たちと話したり、素材を贈ったりして信頼を深める。話せるのは1人1日{P.talksPerDay}回まで(1回目は話題つき)。現実の「絆」が高いほど、打ち解けやすい(×{(1 + ch.basicStats.bond / 100).toFixed(2)})。</p>
      </Panel>
      {groups.map(([label, list]) => (
        <Panel key={label} title={label}>
          <ul className="grid gap-2 sm:grid-cols-2">
            {list.map((n) => {
              const t = trustOf(ch, n.id), used = count(n.id);
              return (
                <li key={n.id} data-npc={n.id}>
                  <Link to={`/lounge/${n.id}`} className="flex gap-3 rounded-xl border border-gold-500/25 p-2 hover:bg-gold-500/10">
                    <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-[radial-gradient(circle_at_50%_35%,rgba(244,214,140,0.2),rgba(20,17,42,0.9)_70%)]">
                      <span className="absolute inset-0 grid place-items-center font-serif text-2xl text-gold-200/40">{n.name[0]}</span>
                      <img src={ART.npc(n.id)} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display = "none"; }} className="absolute inset-0 h-[260%] w-full object-cover object-top" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-serif text-gold-200">{n.name}</p>
                      <p className="text-[11px] text-arcane-300">{n.role}</p>
                      <div className="mt-1 flex items-center gap-2 text-[11px]"><span>{stageOf(t).name}</span><div className="flex-1"><Bar value={t} max={100} /></div><span className="num">{t}</span></div>
                      <p className="text-[11px] text-arcane-300/80">今日 {used}/{P.talksPerDay} 回</p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Panel>
      ))}
    </div>
  );
}
