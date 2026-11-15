import { Link } from "react-router-dom";
import { useGame } from "../../stores/game";
import { BATTLE, OPPONENTS, ctxOf, maxes, rankOf, storyOpen, unlocked } from "../../game/academy/battle";
import { todayLocal } from "../../utils/id";
import { Panel } from "../../components/ui";
import { ART } from "../../game/world/art";

export default function ArenaPage() {
  const { character: ch, battles } = useGame();
  if (!ch) return null;
  const today = todayLocal();
  const left = Math.max(0, BATTLE.rewardsPerDay - battles.filter((b) => b.date === today && b.rewarded).length);
  const m = maxes(ctxOf(ch)); const rank = rankOf(ch.world.defeated);
  return (
    <div className="grid gap-4">
      <Panel title="決闘演習場" right={<span className="text-sm text-gold-200" data-testid="rank">{rank.name}</span>}>
        <p className="text-sm text-arcane-300">番はフォルトナー先生。戦うのは何回でも自由。EXPと素材がもらえるのは1日{BATTLE.rewardsPerDay}勝まで(<span className="num text-gold-200" data-testid="rewards-left">今日あと {left}</span>)。負けても失うものはない。</p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
          {[["体力", m.hp, "身体能力"], ["魔力", m.mp, "知性・創造性"], ["精神力", m.sp, "精神"]].map(([l, v, f]) => (
            <div key={l} className="rounded-xl bg-night-800/60 p-2"><p className="label">{l}</p><p className="num font-display text-xl text-gold-200">{v}</p><p className="text-[10px] text-arcane-300/70">{f}で増える</p></div>
          ))}
        </div>
      </Panel>
      <Panel title="演習の相手">
        <ul className="grid gap-2 sm:grid-cols-2">
          {OPPONENTS.filter((o) => !o.story || storyOpen(ch) || ch.world.defeated.includes(o.id)).map((o) => {
            const open = unlocked(ch.world.defeated, o.id, storyOpen(ch)), won = ch.world.defeated.includes(o.id);
            const body = (
              <div className="flex gap-3">
                <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-[radial-gradient(circle_at_50%_40%,rgba(180,156,255,0.25),rgba(20,17,42,0.9)_70%)]">
                  <img key={o.id} src={ART.foe(o.id)} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display = "none"; }} className="absolute inset-0 h-full w-full object-cover object-top" />
                </div>
                <div className="min-w-0">
                  <p className="font-serif text-gold-200">{o.story ? "物語" : `${OPPONENTS.filter((x) => !x.story).indexOf(o) + 1}.`} {o.name} {won && <span className="pill ml-1 bg-gold-500/15 text-[10px] text-gold-200">勝利</span>}</p>
                  <p className="text-xs text-arcane-300">{o.desc}</p>
                  <p className="num mt-0.5 text-[11px] text-arcane-300/80">体力 {o.hp} ・ 攻撃 {o.atk}</p>
                  {!open && <p className="text-[11px] text-arcane-300/70">🔒 {o.id === "teacher" ? "1〜5に勝つと挑める" : "前の相手に勝つと挑める"}</p>}
                </div>
              </div>
            );
            return <li key={o.id} data-foe={o.id}>{open ? <Link to={`/arena/${o.id}`} className="block rounded-xl border border-gold-500/30 p-2 hover:bg-gold-500/10">{body}</Link> : <div className="rounded-xl border border-arcane-500/10 p-2 opacity-60">{body}</div>}</li>;
          })}
        </ul>
      </Panel>
    </div>
  );
}
