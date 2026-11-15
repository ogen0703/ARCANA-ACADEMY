import { useState } from "react";
import { Link } from "react-router-dom";
import { useGame } from "../../stores/game";
import { FLOWERS, flowerbed, type Bloom } from "../../game/academy/potions";
import { materialById } from "../../game/academy/explore";
import { creatureById } from "../../game/academy/creatures";
import { walkInGarden } from "../../services/storage/repo";
import { CATEGORY_DEFS, P } from "../../game/growth/rules";
import { todayLocal } from "../../utils/id";
import { Panel } from "../../components/ui";
import { ART } from "../../game/world/art";

const shift = (ym: string, n: number) => { const [y, m] = ym.split("-").map(Number); const d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };

/** 花ひとつ(SVG。花びらの数で種類の違いを出す) */
function Flower({ color, petals }: { color: string; petals: number }) {
  return (
    <svg viewBox="-10 -10 20 20" className="h-full w-full" aria-hidden="true">
      {Array.from({ length: petals }, (_, i) => <ellipse key={i} cx="0" cy="-4.6" rx="2.6" ry="4.6" fill={color} fillOpacity=".85" transform={`rotate(${(360 / petals) * i})`} />)}
      <circle r="2.2" fill="#fff6dc" />
    </svg>
  );
}
const PETALS: Record<string, number> = { sports: 5, creative: 7, learning: 4, relationship: 6, challenge: 5, work: 8, music: 6, reflection: 7, other: 5 };

/** 星影の庭園(Phase 6a):承認した日に咲く花壇と、1日1回の散歩 */
export default function GardenPage() {
  const { character: ch, experiences, run } = useGame();
  const today = todayLocal();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [pick, setPick] = useState<Bloom | null>(null);
  const [msg, setMsg] = useState("");
  if (!ch) return null;
  const blooms = flowerbed(experiences, month);
  const thisMonth = flowerbed(experiences, today.slice(0, 7)).length;
  const days = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();
  const byDay = new Map(blooms.map((b) => [Number(b.date.slice(8)), b]));
  const walked = ch.world.garden.lastWalk === today;
  const walk = async () => {
    setMsg("");
    try {
      let r: Awaited<ReturnType<typeof walkInGarden>> | null = null; await run(async () => { r = await walkInGarden(); });
      const c = r!.companion ? creatureById(r!.companion) : null;
      setMsg(`庭をゆっくり歩いた。${materialById(r!.herb)?.name}を${r!.n}つ摘んだ。${c ? `${c.name}もうれしそう(なつき+${P.gardenAffection})。` : ""}今日の演習は、体力・魔力・精神力の最大値が+10%。`);
    } catch (e) { setMsg(e instanceof Error ? e.message : "うまくいきませんでした"); }
  };
  return (
    <div className="mx-auto grid max-w-2xl gap-4">
      <div className="panel relative overflow-hidden p-4">
        <div className="absolute inset-0 bg-cover bg-center opacity-40" style={{ backgroundImage: `url(${ART.areas.garden}), url(${ART.sanctuary})` }} />
        <div className="relative">
          <p className="font-serif text-xl text-gold-200">星影の庭園</p>
          <p className="text-sm text-arcane-300">現実で過ごした日々が、花になって咲く庭。ここは休むための場所。</p>
          <p className="num mt-1 text-xs">今月の花 {thisMonth} 輪</p>
          {walked ? <p className="mt-3 text-sm text-candle" data-testid="walked">今日はもう歩いた。また明日。</p>
            : <button className="btn btn-primary mt-3" data-testid="walk" onClick={walk}>庭を歩く(1日1回)</button>}
        </div>
      </div>
      {msg && <p className="rounded-xl bg-gold-500/15 px-3 py-2 text-sm text-gold-200" role="status" data-testid="garden-msg">{msg}</p>}

      <Panel title="花壇" right={<div className="flex items-center gap-2 text-xs"><button className="text-candle" onClick={() => { setMonth(shift(month, -1)); setPick(null); }}>‹ 前の月</button><span className="num">{month.replace("-", "年")}月</span>{month < today.slice(0, 7) && <button className="text-candle" onClick={() => { setMonth(shift(month, 1)); setPick(null); }}>次の月 ›</button>}</div>}>
        <div className="grid grid-cols-7 gap-1.5" data-testid="flowerbed">
          {Array.from({ length: days }, (_, i) => {
            const b = byDay.get(i + 1);
            return (
              <button key={i} disabled={!b} onClick={() => setPick(b ?? null)} aria-label={b ? `${i + 1}日 ${FLOWERS[b.category].name}` : `${i + 1}日`}
                className={`relative aspect-square rounded-lg ${b ? "bg-night-800/70 hover:bg-gold-500/10" : "bg-night-900/40"} ${pick?.date === b?.date && b ? "ring-1 ring-gold-300" : ""}`}>
                <span className="num absolute left-1 top-0.5 text-[9px] text-arcane-300/60">{i + 1}</span>
                {b && <span className="absolute inset-1.5 top-2.5"><Flower color={FLOWERS[b.category].color} petals={PETALS[b.category]} /></span>}
              </button>
            );
          })}
        </div>
        {pick ? (
          <p className="mt-3 text-sm" data-testid="bloom-detail"><span className="text-gold-200">{pick.date.slice(5).replace("-", "/")} ・ {FLOWERS[pick.category].name}</span>({CATEGORY_DEFS[pick.category].label})<span className="block text-xs text-arcane-300">{pick.titles.join("、")}</span></p>
        ) : <p className="mt-3 text-xs text-arcane-300">現実の経験を承認した日に、その日いちばん多かった種類の花が咲く。花はタップすると、その日の経験が見られる。空いた日はそのまま。枯れたりしない。</p>}
        {blooms.length === 0 && <p className="mt-2 text-xs text-arcane-300/80">この月はまだ花がない。<Link to="/experience" className="text-candle">経験を記録する</Link></p>}
      </Panel>

      <Panel title="花の種類">
        <ul className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
          {Object.entries(FLOWERS).map(([k, f]) => <li key={k} className="flex items-center gap-2"><span className="h-6 w-6"><Flower color={f.color} petals={PETALS[k]} /></span><span>{f.name}<span className="block text-[10px] text-arcane-300">{CATEGORY_DEFS[k as keyof typeof CATEGORY_DEFS].label}</span></span></li>)}
        </ul>
        <p className="mt-2 text-[11px] text-arcane-300/70">摘める薬草:朝・昼は陽だまり草、夕方・夜は月光草。その月の花が{P.gardenBloomsForTwo}輪以上なら2つ。<Link to="/potions" className="text-candle">魔法薬研究棟へ</Link></p>
      </Panel>
    </div>
  );
}
