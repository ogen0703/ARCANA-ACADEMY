import { Link } from "react-router-dom";
import { useGame } from "../../stores/game";
import { levelProgress } from "../../game/growth/engine";
import { CATEGORY_DEFS } from "../../game/growth/rules";
import { STAT_LABELS, type StatKey } from "../../schemas";
import { Bar, Panel } from "../../components/ui";
import Academy3D from "../../components/three/Academy3D";
import { ambienceOf } from "../../game/world/ambience";

const SHORTCUTS = [
  { to: "/academy", name: "学院", desc: "8つの施設と世界" },
  { to: "/encyclopedia", name: "図鑑", desc: "成長年表・魔法図鑑" },
  { to: "/character", name: "キャラクター", desc: "能力・性格・成長の記録" },
  { to: "/magic", name: "魔法", desc: "6つの魔法系統と適性" },
];

export default function HomePage() {
  const { character: ch, experiences, inbox, burst } = useGame();
  if (!ch) return null;
  const prog = levelProgress(ch);
  const lastApplied = experiences.find((e) => e.analysisStatus === "applied");
  const waiting = experiences.filter((e) => e.analysisStatus === "proposed").length;
  return (
    <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
      <section className="panel relative overflow-hidden p-0">
        <div className="relative">
          <Academy3D mode="hall" burst={burst} className="h-[440px] w-full sm:h-[460px]" />
          <p className="label pointer-events-none absolute left-3 top-3 rounded-md bg-night-950/50 px-2 py-0.5" data-testid="ambience">{ambienceOf(new Date()).label}</p>
        </div>
        <div className="relative grid place-items-center px-4 pb-4 pt-3">
          <h1 className="font-serif text-3xl text-gold-200">{ch.name}</h1>
          <p className="text-sm text-arcane-300">見習い魔法使い ・ アルカナ学院</p>
          <div className="mt-4 w-full max-w-sm">
            <div className="mb-1 flex items-baseline justify-between">
              <span className="font-display text-gold-300">Lv. <span className="num text-2xl">{ch.level}</span></span>
              <span className="num text-xs text-arcane-300">EXP {prog.inLevel} / {prog.need}</span>
            </div>
            <Bar value={prog.inLevel} max={prog.need} tone="arcane" />
          </div>
          <p className="mt-3 text-[11px] text-arcane-300/50">主人公の姿は、経験とともに進化していく(Phase 5)</p>
        </div>
      </section>

      <div className="grid content-start gap-4">
        <Panel title="最新の成長" right={<Link to="/experience" className="btn btn-primary text-sm">経験を記録する</Link>}>
          {lastApplied?.approvedGrowth ? (
            <div>
              <p className="text-sm text-arcane-300">{lastApplied.date} ・ {CATEGORY_DEFS[lastApplied.category].label}</p>
              <p className="mt-0.5 font-serif text-lg">{lastApplied.title}</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {Object.entries(lastApplied.approvedGrowth.stats).map(([k, v]) => (
                  <li key={k} className="pill bg-gold-500/15 text-gold-200 num">{STAT_LABELS[k as StatKey].name} +{v}</li>
                ))}
                <li className="pill bg-arcane-500/20 text-arcane-300 num">EXP +{lastApplied.approvedGrowth.exp}</li>
              </ul>
            </div>
          ) : <p className="text-sm text-arcane-300">まだ成長の記録がありません。現実で経験したことを登録すると、魔法使いが成長します。</p>}
          {!!inbox?.added && <p className="mt-3 rounded-xl bg-arcane-500/15 px-3 py-2 text-sm text-arcane-300">✉ 第2の脳から新しい経験が {inbox.added} 件届いた</p>}
          {waiting > 0 && <Link to="/experience" className="mt-3 block rounded-xl bg-candle/10 px-3 py-2 text-sm text-candle">承認まちの成長が {waiting} 件あります →</Link>}
        </Panel>

        <Panel title="学院をめぐる">
          <div className="grid grid-cols-2 gap-2">
            {SHORTCUTS.map((l) => (
              <Link key={l.to} to={l.to} className="rounded-xl border border-gold-500/30 p-3 hover:bg-gold-500/10"><p className="font-serif text-gold-200">{l.name}</p><p className="text-xs text-arcane-300">{l.desc}</p></Link>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
