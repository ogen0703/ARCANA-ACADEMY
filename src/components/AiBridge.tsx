import { useState } from "react";
import { Link } from "react-router-dom";
import { useGame } from "../stores/game";

async function copyText(t: string) {
  try { await navigator.clipboard.writeText(t); return true; }
  catch {
    const ta = document.createElement("textarea"); ta.value = t; document.body.appendChild(ta); ta.select();
    let ok = false; try { ok = document.execCommand("copy"); } catch { ok = false; } ta.remove(); return ok;
  }
}

/**
 * AIに頼む流れ:①送る内容を確認 ②コピー ③自分でAIに貼る ④返事を貼り戻す。
 * アプリからは何も送らない。設定で「外部AIを使う」を許可したときだけ表示する。
 */
export default function AiBridge({ prompt, onReply, replyLabel = "AIの返事を貼り付ける", submitLabel = "読み込む", testId }: {
  prompt: string; onReply: (text: string) => Promise<string>; replyLabel?: string; submitLabel?: string; testId?: string;
}) {
  const { player } = useGame();
  const [step, setStep] = useState<"check" | "copied">("check");
  const [reply, setReply] = useState("");
  const [msg, setMsg] = useState("");
  if (!player?.aiSendConsent) {
    return <p className="rounded-lg bg-night-800/60 p-2 text-xs text-arcane-300">外部AIを使う機能は、<Link to="/settings" className="text-candle underline">設定</Link>で「外部AIを使う」を許可すると使えます。</p>;
  }
  return (
    <div className="grid gap-2 rounded-xl border border-arcane-500/30 bg-night-900/60 p-3 text-sm" data-testid={testId}>
      <details>
        <summary className="cursor-pointer text-xs text-arcane-300">① AIに渡す内容を確認する({prompt.length}字)</summary>
        <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap rounded bg-night-950/80 p-2 text-[11px] text-[#d9d2ef]">{prompt}</pre>
      </details>
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn px-3 py-1 text-xs" onClick={async () => { const ok = await copyText(prompt); setStep("copied"); setMsg(ok ? "コピーした。Claude や ChatGPT に貼り付けて送ってね" : "コピーできなかったので、①を開いて手で選んでコピーしてね"); }}>② 内容をコピーする</button>
        <span className="text-[11px] text-arcane-300/70">このアプリからは送りません。貼り付けるのはあなたです</span>
      </div>
      {step === "copied" && (
        <>
          <label className="grid gap-1"><span className="label">③ {replyLabel}</span>
            <textarea className="field min-h-[90px] text-xs" value={reply} onChange={(e) => setReply(e.target.value)} placeholder="AIの返事をそのまま貼り付け" /></label>
          <button className="btn btn-primary justify-self-start px-3 py-1 text-xs" disabled={!reply.trim()} onClick={async () => {
            try { setMsg(await onReply(reply)); setReply(""); } catch (e) { setMsg(e instanceof Error && !/^\[/.test(e.message) ? `読み込めませんでした:${e.message.slice(0, 80)}` : "返事の形が違うようです。JSONの部分だけ貼り付けてみてね"); }
          }}>{submitLabel}</button>
        </>
      )}
      {msg && <p className="text-xs text-gold-200" role="status">{msg}</p>}
    </div>
  );
}
