import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useGame } from "../../stores/game";
import { diagnoseHero } from "../../services/storage/repo";
import { DIAGNOSIS, diagnose } from "../../game/growth/formation";
import { MAGIC_KEYS, MAGIC_LABELS, type MagicKey } from "../../schemas";
import { Bar, MagicCircle, Panel } from "../../components/ui";
import { houseFor } from "../../game/academy/content";

/** 入学診断(GDD 4章:魔法適性は初期診断で判定)。1回だけ受けられる */
export default function DiagnosisPage() {
  const { character: ch, run } = useGame();
  const nav = useNavigate();
  const [answers, setAnswers] = useState<number[]>([]);
  const [msg, setMsg] = useState("");
  if (!ch) return null;
  if (ch.diagnosedAt) {
    return (
      <Panel title="入学診断">
        <p className="text-sm text-arcane-300">入学診断は {new Date(ch.diagnosedAt).toLocaleDateString("ja-JP")} に受けました。所属寮は「{ch.history.house ?? "未定"}」。魔法適性は、これからの経験で少しずつ育っていきます。</p>
        <Link to="/magic" className="btn btn-primary mt-3 inline-block">魔法適性を見る</Link>
      </Panel>
    );
  }
  const i = answers.length;
  const done = i >= DIAGNOSIS.length;
  const result = done ? diagnose(answers) : null;
  const ranked = result ? [...MAGIC_KEYS].sort((a, b) => result[b] - result[a]) : [];
  return (
    <div className="mx-auto grid max-w-xl gap-4">
      <Panel title="入学診断 ・ 魔法適性">
        {!done ? (
          <div>
            <p className="label">問 {i + 1} / {DIAGNOSIS.length}</p>
            <div className="mt-1 h-1 overflow-hidden rounded bg-night-800"><div className="h-full bg-gold-400 transition-all" style={{ width: `${(i / DIAGNOSIS.length) * 100}%` }} /></div>
            <p className="mt-4 font-serif text-xl text-gold-200">{DIAGNOSIS[i].q}</p>
            <ul className="mt-3 grid gap-2">
              {DIAGNOSIS[i].options.map((o, j) => (
                <li key={j}><button className="w-full rounded-xl border border-arcane-500/30 px-4 py-3 text-left hover:border-gold-400 hover:bg-gold-500/10" onClick={() => setAnswers([...answers, j])}>{o.text}</button></li>
              ))}
            </ul>
            {i > 0 && <button className="btn-ghost mt-3 rounded px-2 text-xs" onClick={() => setAnswers(answers.slice(0, -1))}>← ひとつ戻る</button>}
            <p className="mt-4 text-[11px] text-arcane-300/70">直感で選んでね。診断は1回だけで、結果は「適性の出発点」。そのあとは経験で育っていきます。</p>
          </div>
        ) : (
          <div>
            <div className="relative mx-auto grid h-40 w-40 place-items-center">
              <MagicCircle className="absolute inset-0 text-gold-400/70" />
              <p className="relative text-center font-serif text-lg text-gold-200">{MAGIC_LABELS[ranked[0]].name}</p>
            </div>
            <p className="mt-2 text-center text-sm text-arcane-300">いちばん強い適性は「{MAGIC_LABELS[ranked[0]].name}」({MAGIC_LABELS[ranked[0]].desc})</p>
            <p className="mt-1 text-center text-sm">入る寮:<span className="font-serif text-gold-200" data-testid="house">{houseFor(result!).name}</span><span className="text-xs text-arcane-300">({houseFor(result!).value})</span></p>
            <ul className="mt-4 space-y-2">
              {ranked.map((k: MagicKey) => (
                <li key={k}>
                  <div className="flex justify-between text-sm"><span>{MAGIC_LABELS[k].name}</span><span className="num text-gold-200">{result![k]}</span></div>
                  <Bar value={result![k]} />
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="btn btn-primary" onClick={async () => {
                try { await run(() => diagnoseHero(answers)); nav("/magic"); } catch (e) { setMsg(e instanceof Error ? e.message : "保存できませんでした"); }
              }}>この結果で決める</button>
              <button className="btn" onClick={() => setAnswers([])}>最初から答えなおす</button>
            </div>
            <p className="mt-2 text-[11px] text-arcane-300/70">決めたあとは変えられません(経験で育っていきます)。</p>
            {msg && <p className="mt-2 text-sm text-candle">{msg}</p>}
          </div>
        )}
      </Panel>
    </div>
  );
}
