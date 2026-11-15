import { useState } from "react";
import { Link } from "react-router-dom";
import { useGame } from "../../stores/game";
import { POTIONS, isFine, potionCount, qty, recipeOpen } from "../../game/academy/potions";
import { COURSES, UNITS } from "../../game/academy/content";
import { materialById } from "../../game/academy/explore";
import { brewPotion } from "../../services/storage/repo";
import { P } from "../../game/growth/rules";
import { todayLocal } from "../../utils/id";
import { Panel } from "../../components/ui";
import { ART } from "../../game/world/art";

const USE = { battle: "戦闘", explore: "探索", sanctuary: "保護区" } as const;

/** 魔法薬研究棟(Phase 6a):素材と薬草を調合して魔法薬をつくる(1日2回) */
export default function PotionsPage() {
  const { character: ch, run } = useGame();
  const [msg, setMsg] = useState("");
  if (!ch) return null;
  const today = todayLocal();
  const left = Math.max(0, P.brewPerDay - (ch.world.brew.date === today ? ch.world.brew.count : 0));
  const fine = isFine(ch);
  const make = async (id: string) => {
    setMsg("");
    try {
      let r: Awaited<ReturnType<typeof brewPotion>> | null = null; await run(async () => { r = await brewPotion(id); });
      setMsg(`${r!.potion.name}${r!.fine ? "(上質)" : ""}ができた。${COURSES[r!.potion.course].name}の熟練度+${Math.round(r!.prof * 10) / 10}`);
    } catch (e) { setMsg(e instanceof Error ? e.message : "うまくいきませんでした"); }
  };
  return (
    <div className="mx-auto grid max-w-2xl gap-4">
      <div className="panel relative overflow-hidden p-4">
        <div className="absolute inset-0 bg-cover bg-center opacity-40" style={{ backgroundImage: `url(${ART.areas.potions}), url(${ART.areas.library})` }} />
        <div className="relative">
          <p className="font-serif text-xl text-gold-200">魔法薬研究棟</p>
          <p className="text-sm text-arcane-300">リュネ先生とブラム先生の調合室。素材と薬草を合わせて、魔法薬をつくる。</p>
          <p className="num mt-1 text-xs">今日あと {left} 回 ・ {fine ? "上質ができる(生命学+錬成学の熟練度100以上)" : `上質まで:生命学+錬成学の熟練度 ${P.brewFineProf}`}</p>
        </div>
      </div>
      {msg && <p className="rounded-xl bg-gold-500/15 px-3 py-2 text-sm text-gold-200" role="status" data-testid="brew-msg">{msg}</p>}
      <Panel title="調合法">
        <ul className="grid gap-2" data-testid="recipes">
          {POTIONS.map((p) => {
            const open = recipeOpen(ch, p), have = potionCount(ch.inventory, p.id);
            const ok = open && left > 0 && have < P.potionMax && p.mats.every((m) => qty(ch.inventory, m) > 0);
            return (
              <li key={p.id} className={`rounded-xl border px-3 py-2 ${open ? "border-arcane-500/30" : "border-arcane-500/10 opacity-60"}`} data-potion={p.id}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-serif text-gold-200">{p.name} <span className="pill bg-night-800 text-[10px] text-arcane-300">{USE[p.use]}</span> {have > 0 && <span className="num text-[11px] text-arcane-300">所持 {have}/{P.potionMax}</span>}</p>
                    <p className="text-xs">{p.effect}</p>
                    {open ? <p className="text-[11px] text-arcane-300">材料:{p.mats.map((m) => `${materialById(m)?.name}(${qty(ch.inventory, m)})`).join(" + ")}</p>
                      : <p className="text-[11px] text-arcane-300">🔒 {COURSES[p.course].name}の単元{p.unit}「{UNITS[p.course][p.unit - 1].title}」で調合法がわかる</p>}
                  </div>
                  {open && <button className="btn btn-primary shrink-0 px-3 py-1 text-xs" disabled={!ok} onClick={() => make(p.id)}>調合</button>}
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-[11px] text-arcane-300/70">1種類{P.potionMax}個まで持てる。薬草は<Link to="/garden" className="text-candle">星影の庭園</Link>で、ほかの素材は探索や演習で手に入る。戦闘の薬は1戦に1回、ターンを使って飲む。</p>
      </Panel>
    </div>
  );
}
