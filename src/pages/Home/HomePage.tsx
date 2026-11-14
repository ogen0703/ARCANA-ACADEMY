import { Link } from "react-router-dom";
import { useGame } from "../../stores/game";
import { levelProgress } from "../../game/growth/engine";
import { CATEGORY_DEFS } from "../../game/growth/rules";
import { STAT_LABELS, type StatKey } from "../../schemas";
import { Bar, HeroSilhouette, MagicCircle, Panel } from "../../components/ui";

const LOCKED = [
  { name: "学院", desc: "授業・寮・試験", phase: 4 },
  { name: "探索", desc: "古代遺跡・禁書庫", phase: 4 },
  { name: "図鑑", desc: "魔法図鑑・魔法生物図鑑", phase: 2 },
  { name: "ストーリー", desc: "章ごとに進む物語", phase: 5 },
];

function timeOfDay() {
  const h = new Date().getHours();
  return h < 5 ? "深夜の学院" : h < 10 ? "朝靄の学院" : h < 16 ? "昼下がりの学院" : h < 19 ? "黄昏の学院" : "星降る夜の学院";
}

export default function HomePage() {
  const { character: ch, experiences, inbox } = useGame();
  if (!ch) return null;
  const prog = levelProgress(ch);
  const lastApplied = experiences.find((e) => e.analysisStatus === "applied");
  const waiting = experiences.filter((e) => e.analysisStatus === "proposed").length;
  return (
    <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
      <section className="panel relative overflow-hidden p-0">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_80%,rgba(255,180,94,0.18),transparent_55%)]" />
        <div className="relative grid place-items-center px-4 pb-4 pt-8">
          <p className="label">{timeOfDay()}</p>
          <div className="relative mt-2 grid h-[300px] w-[300px] max-w-full place-items-center">
            <MagicCircle className="absolute inset-0 text-gold-400/60" />
            <HeroSilhouette className="relative h-[230px]" />
          </div>
          <h1 className="mt-2 font-serif text-3xl text-gold-200">{ch.name}</h1>
          <p className="text-sm text-arcane-300">見習い魔法使い ・ アルカナ学院</p>
          <div className="mt-4 w-full max-w-sm">
            <div className="mb-1 flex items-baseline justify-between">
              <span className="font-display text-gold-300">Lv. <span className="num text-2xl">{ch.level}</span></span>
              <span className="num text-xs text-arcane-300">EXP {prog.inLevel} / {prog.need}</span>
            </div>
            <Bar value={prog.inLevel} max={prog.need} tone="arcane" />
          </div>
          <p className="mt-3 text-[11px] text-arcane-300/50">※主人公の姿は仮。Phase 2 で3Dの学院と姿に変わります</p>
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

        <Panel title="学院の施設">
          <div className="grid grid-cols-2 gap-2">
            <Link to="/character" className="rounded-xl border border-gold-500/30 p-3 hover:bg-gold-500/10"><p className="font-serif text-gold-200">キャラクター</p><p className="text-xs text-arcane-300">能力・性格・成長の記録</p></Link>
            <Link to="/magic" className="rounded-xl border border-gold-500/30 p-3 hover:bg-gold-500/10"><p className="font-serif text-gold-200">魔法</p><p className="text-xs text-arcane-300">6つの魔法系統と適性</p></Link>
            {LOCKED.map((l) => (
              <div key={l.name} className="rounded-xl border border-arcane-500/15 p-3 opacity-60" aria-disabled="true">
                <p className="font-serif">{l.name} <span className="text-[10px] text-arcane-300">🔒 Phase {l.phase}</span></p>
                <p className="text-xs text-arcane-300">{l.desc}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
