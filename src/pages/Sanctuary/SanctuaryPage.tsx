import { useState } from "react";
import { Link } from "react-router-dom";
import { useGame } from "../../stores/game";
import { ALL_CREATURES, HIDDEN_CREATURE, STAGE_NAMES, sevenstarLights, stageIndex } from "../../game/academy/creatures";
import { available, qtyOf, recOf } from "../../game/academy/creaturesEngine";
import { materialById } from "../../game/academy/explore";
import { ambienceOf, TIME, WEATHER } from "../../game/world/ambience";
import { careCreature, chooseCompanion } from "../../services/storage/repo";
import { P } from "../../game/growth/rules";
import { todayLocal } from "../../utils/id";
import { Bar, Panel } from "../../components/ui";
import FallbackImg from "../../components/FallbackImg";
import { ART } from "../../game/world/art";
import { starBound } from "../../game/story/engine";

export default function SanctuaryPage() {
  const { character: ch, sanctuary, run } = useGame();
  const [msg, setMsg] = useState("");
  if (!ch) return null;
  const today = todayLocal();
  const todays = sanctuary.filter((l) => l.date === today);
  const left = Math.max(0, P.sanctuaryPerDay - todays.filter((l) => l.kind === "visit").length);
  const a = ambienceOf(new Date());
  const friends = ALL_CREATURES.filter((c) => recOf(ch, c.id).friend);
  const act = async (fn: () => Promise<unknown>, ok: string) => { setMsg(""); try { await run(fn); setMsg(ok); } catch (e) { setMsg(e instanceof Error ? e.message : "うまくいきませんでした"); } };
  return (
    <div className="grid gap-4">
      <div className="panel relative overflow-hidden p-4">
        <div className="absolute inset-0 bg-cover bg-center opacity-40" style={{ backgroundImage: `url(${ART.sanctuary})` }} />
        <div className="relative">
          <p className="font-serif text-xl text-gold-200">魔法生物保護区</p>
          <p className="text-sm text-arcane-300">管理人はリュネ先生。捕まえるのではなく、心を通わせて仲間になってもらう。</p>
          <p className="mt-1 text-xs">いま:{TIME[a.time].label.replace("の学院", "")} ・ {WEATHER[a.weather]} ・ 会えそうな生物 {available(a.time, a.weather).length}種</p>
          {left > 0 ? <Link to="/sanctuary/visit" className="btn btn-primary mt-3 inline-block" data-testid="visit">保護区を歩く(今日あと {left} 回)</Link> : <p className="mt-3 text-sm text-candle">今日はもう{P.sanctuaryPerDay}回歩いた。また明日。</p>}
        </div>
      </div>
      {msg && <p className="rounded-xl bg-gold-500/15 px-3 py-2 text-sm text-gold-200" role="status">{msg}</p>}
      <Panel title="仲間の魔法生物" right={<span className="num text-xs text-gold-200">{friends.length} / {ALL_CREATURES.length}</span>}>
        {friends.length === 0 ? <p className="text-sm text-arcane-300">まだいない。保護区を歩いて出会おう。生物ごとに好む近づき方がある。</p> : (
          <ul className="grid gap-3" data-testid="friends">
            {friends.map((c) => {
              const r = recOf(ch, c.id), st = stageIndex(r.affection), isComp = ch.world.companion === c.id;
              const fed = todays.some((l) => l.creature === c.id && l.kind === "feed"), plays = todays.filter((l) => l.creature === c.id && l.kind === "play").length;
              return (
                <li key={c.id} className={`flex gap-3 rounded-xl border p-3 ${isComp ? "border-gold-400/70 bg-gold-500/10" : "border-arcane-500/25"}`} data-creature={c.id}>
                  <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-[radial-gradient(circle_at_50%_55%,rgba(244,214,140,0.2),rgba(20,17,42,0.9)_70%)]">
                    <span className="absolute inset-0 grid place-items-center font-serif text-3xl text-gold-200/30">{c.name[0]}</span>
                    <FallbackImg srcs={ART.creature(c.id, st, starBound(ch))} className={`absolute inset-0 h-full w-full object-contain ${st === 0 ? "scale-75" : ""}`} />
                  </div>
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="font-serif text-gold-200">{c.name} {isComp && <span className="pill ml-1 bg-gold-500/20 text-[10px] text-gold-200">相棒</span>}</p>
                    <p className="text-[11px] text-arcane-300">{c.stages[st]}({STAGE_NAMES[st]}){c.id === "sevenstar" && <span className="ml-1 text-gold-200" data-testid="star-lights">{"★".repeat(sevenstarLights(r.affection))}{"☆".repeat(7 - sevenstarLights(r.affection))}</span>}</p>
                    <div className="mt-1 flex items-center gap-2 text-[11px]"><span>なつき</span><div className="flex-1"><Bar value={r.affection} max={100} /></div><span className="num">{r.affection}</span></div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {<button className="btn px-2 py-1 text-xs" disabled={fed || qtyOf(ch, c.favorite) < 1} onClick={() => act(() => careCreature(c.id, "feed"), `${c.name}に好物をあげた(+${P.feedAffection})`)}>えさ({materialById(c.favorite)?.name}{qtyOf(ch, c.favorite) ? `×${qtyOf(ch, c.favorite)}` : "なし"})</button>}
                      <button className="btn px-2 py-1 text-xs" disabled={plays >= P.playsPerDay} onClick={() => act(() => careCreature(c.id, "play"), `${c.name}と遊んだ(+${P.playAffection})`)}>遊ぶ({P.playsPerDay - plays})</button>
                      {!isComp && <button className="btn-ghost rounded px-2 text-xs text-candle" onClick={() => act(() => chooseCompanion(c.id), `${c.name}が相棒になった`)}>相棒にする</button>}
                    </div>
                    {isComp && <p className="mt-1 text-[10px] text-arcane-300/80">戦闘:{c.battle.label} ・ 探索(若体から):{c.explore.label}</p>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-3 text-[11px] text-arcane-300/70">現実の経験を承認すると、相棒も一緒に育つ(1日最大+{P.realAffectionMax}。七つ星の仔は+{P.sevenstarRealMax})。なつき40で若体、80で成体。</p>
      </Panel>
      {!recOf(ch, HIDDEN_CREATURE.id).friend && <p className="text-center text-[11px] text-arcane-300/50">まだ出会っていない生物がいる……({HIDDEN_CREATURE.name.replace(/./g, "？")})</p>}
    </div>
  );
}
