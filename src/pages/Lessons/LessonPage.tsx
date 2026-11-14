import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useGame } from "../../stores/game";
import { COURSES, UNITS, spellById } from "../../game/academy/content";
import { nextUnit, proficiencyOf, unitCounts, unitOpen } from "../../game/academy/engine";
import { P } from "../../game/growth/rules";
import { MAGIC_KEYS, type MagicKey } from "../../schemas";
import { todayLocal } from "../../utils/id";
import { Bar, MagicCircle, Panel } from "../../components/ui";
import { ART } from "../../game/world/art";

/** 先生の立ち絵(読み込めなければ出さない) */
function Portrait({ k, className = "" }: { k: string; className?: string }) {
  const [ok, setOk] = useState(true);
  return ok ? <img src={ART.teacher(k)} alt="" onError={() => setOk(false)} className={`pointer-events-none select-none object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)] ${className}`} /> : null;
}

type Phase = { step: "pick" } | { step: "lecture"; unit: number } | { step: "question"; unit: number } | { step: "result"; unit: number; correct: boolean; prof: number; exp: number; repeat: boolean; learned: string[] };

export default function LessonPage() {
  const { course = "" } = useParams();
  const { character: ch, lessons, lesson } = useGame();
  const [ph, setPh] = useState<Phase>({ step: "pick" });
  const [pick, setPick] = useState<number | null>(null);
  const [err, setErr] = useState("");
  if (!ch) return null;
  if (!(MAGIC_KEYS as readonly string[]).includes(course)) return <Panel title="授業"><p className="text-sm">その講座はありません。<Link to="/lessons" className="text-candle">講義棟へ</Link></p></Panel>;
  const k = course as MagicKey, c = COURSES[k], units = UNITS[k], counts = unitCounts(ch, k);
  const left = Math.max(0, P.lessonsPerDay - lessons.filter((l) => l.date === todayLocal()).length);

  return (
    <div className="mx-auto grid max-w-2xl gap-4">
      <Panel title={c.name} right={<Link to="/lessons" className="shrink-0 text-xs text-candle">講義棟へ</Link>}>
        <div className="flex gap-3">
          <div className="h-24 w-20 shrink-0 overflow-hidden rounded-lg bg-[radial-gradient(circle_at_50%_30%,rgba(244,214,140,0.25),rgba(42,46,110,0.4)_70%)]"><Portrait k={k} className="h-[260%] w-full object-cover object-top" /></div>
          <div className="min-w-0">
            <p className="text-sm text-gold-200">{c.teacher.name} {c.teacher.title}</p>
            <p className="text-xs text-arcane-300">{c.teacher.persona}</p>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-3 text-xs"><span>熟練度</span><div className="flex-1"><Bar value={proficiencyOf(ch, k)} /></div><span className="num text-gold-200">{proficiencyOf(ch, k)}</span><span className="num text-arcane-300">今日あと {left} コマ</span></div>
      </Panel>

      {ph.step === "pick" && (
        <Panel title="単元をえらぶ">
          <ul className="grid gap-2">
            {units.map((u, i) => {
              const open = unitOpen(ch, k, i), sp = u.spell ? spellById(u.spell) : null;
              return (
                <li key={i}>
                  <button disabled={!open || left === 0} onClick={() => { setErr(""); setPick(null); setPh({ step: "lecture", unit: i }); }}
                    className={`w-full rounded-xl border px-3 py-2 text-left ${open ? "border-arcane-500/30 hover:border-gold-400 hover:bg-gold-500/10" : "border-arcane-500/10 opacity-50"} ${i === nextUnit(ch, k) ? "border-gold-400/70" : ""}`}>
                    <span className="text-xs text-arcane-300">単元{i + 1}{counts[i] ? ` ・ 受講${counts[i]}回` : ""}{!open ? " ・ 🔒前の単元から" : ""}</span>
                    <span className="block font-serif">{u.title}{sp && <span className="pill ml-2 bg-gold-500/15 text-[10px] text-gold-200">呪文の実習:{sp.name}</span>}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          {left === 0 && <p className="mt-3 text-sm text-candle">今日の授業はおしまい(1日{P.lessonsPerDay}コマまで)。また明日。</p>}
          <p className="mt-2 text-[11px] text-arcane-300/60">同じ単元の2回目からは熟練度が半分。</p>
        </Panel>
      )}

      {ph.step === "lecture" && (
        <Panel title={`単元${ph.unit + 1} ・ ${units[ph.unit].title}`}>
          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <p className="font-serif text-lg leading-relaxed text-[#ece6fb]" data-testid="lecture">「{units[ph.unit].lecture}」</p>
              <p className="mt-2 text-right text-xs text-arcane-300">— {c.teacher.name}</p>
            </div>
            <Portrait k={k} className="h-56 w-auto shrink-0 sm:h-72" />
          </div>
          <button className="btn btn-primary mt-4" onClick={() => setPh({ step: "question", unit: ph.unit })}>確認の問いへ</button>
        </Panel>
      )}

      {ph.step === "question" && (
        <Panel title="確認の問い">
          <p className="font-serif text-lg">{units[ph.unit].q}</p>
          <ul className="mt-3 grid gap-2">
            {units[ph.unit].choices.map((ch2, j) => (
              <li key={j}><button onClick={() => setPick(j)} aria-pressed={pick === j} className={`w-full rounded-xl border px-3 py-2 text-left ${pick === j ? "border-gold-300 bg-gold-500/15" : "border-arcane-500/30"}`}>{ch2}</button></li>
            ))}
          </ul>
          <button className="btn btn-primary mt-3" disabled={pick == null} onClick={async () => {
            const correct = pick === units[ph.unit].answer;
            try { const r = await lesson(k, ph.unit, correct); setPh({ step: "result", unit: ph.unit, correct, ...r }); }
            catch (e) { setErr(e instanceof Error ? e.message : "うまくいきませんでした"); }
          }}>答える</button>
          {err && <p className="mt-2 text-sm text-candle">{err}</p>}
        </Panel>
      )}

      {ph.step === "result" && (
        <Panel title="実習">
          <div className="relative mx-auto grid h-36 w-36 place-items-center">
            <MagicCircle className="absolute inset-0 text-gold-400/70" />
            <span className="relative text-4xl text-gold-200" aria-hidden="true">{ph.correct ? "✧" : "·"}</span>
          </div>
          <p className="text-center font-serif text-lg" data-testid="lesson-result">{ph.correct ? "正解。" : `答えは「${units[ph.unit].choices[units[ph.unit].answer]}」。`}「{c.teacher.catchphrase}」</p>
          <ul className="mt-3 flex flex-wrap justify-center gap-2">
            <li className="pill num bg-gold-500/15 text-gold-200">熟練度 +{ph.prof}{ph.repeat ? "(復習)" : ""}</li>
            <li className="pill num bg-arcane-500/20 text-arcane-300">EXP +{ph.exp}</li>
          </ul>
          {ph.learned.length > 0 && <p className="mt-3 text-center text-gold-200">✧ 新しい呪文「{ph.learned.join("」「")}」を覚えた</p>}
          {units[ph.unit].spell && !ph.learned.length && !ch.learnedSpells.includes(units[ph.unit].spell!) && (
            <p className="mt-3 text-center text-xs text-arcane-300">「{spellById(units[ph.unit].spell!)!.name}」を覚えるには、まだ条件が足りない。<Link to="/magic" className="text-candle">条件を見る</Link></p>
          )}
          <div className="mt-4 flex justify-center gap-2">
            <button className="btn btn-primary" onClick={() => { setPick(null); setPh({ step: "pick" }); }}>単元一覧へ</button>
            <Link to="/lessons" className="btn">講義棟へ</Link>
          </div>
        </Panel>
      )}
    </div>
  );
}
