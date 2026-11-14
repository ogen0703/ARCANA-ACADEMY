import { useRef, useState } from "react";
import { useGame } from "../../stores/game";
import { deleteAllData, exportAll, importAll } from "../../services/storage/repo";
import { db } from "../../services/storage/db";
import { PlayerProfileSchema } from "../../schemas";
import { analyzer } from "../../services/ai";
import { nowIso } from "../../utils/id";
import { Panel } from "../../components/ui";

function download(name: string, data: unknown) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: "application/json" }));
  a.download = name; document.body.append(a); a.click(); a.remove();
}
const stamp = () => new Date().toISOString().slice(0, 10).replace(/-/g, "");

export default function SettingsPage() {
  const { player, experiences, history, run } = useGame();
  const [msg, setMsg] = useState("");
  const [pending, setPending] = useState<unknown>(null);
  const [delText, setDelText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  if (!player) return null;
  const savePlayer = (patch: Partial<typeof player>) => run(() => db.player.put(PlayerProfileSchema.parse({ ...player, ...patch, updatedAt: nowIso() })));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="プレイヤー(現実のあなた)">
        <p className="mb-3 text-xs text-arcane-300">ゲーム内の魔法使いとは分けて保存しています。この端末の中だけにあり、外には送りません。</p>
        <div className="grid gap-3 text-sm">
          <label className="grid gap-1"><span className="label">呼び名</span><input id="pl-name" className="field" defaultValue={player.displayName} onBlur={(e) => e.target.value.trim() && savePlayer({ displayName: e.target.value.trim() })} /></label>
          <label className="grid gap-1"><span className="label">誕生日</span><input id="pl-bd" type="date" className="field" defaultValue={player.birthday} onBlur={(e) => savePlayer({ birthday: e.target.value || undefined })} /></label>
          <label className="flex items-center gap-2"><input id="pl-photo" type="checkbox" checked={player.photoConsent} onChange={(e) => savePlayer({ photoConsent: e.target.checked })} />本人の写真を外見づくりに使ってよい(使うのは Phase 5 以降)</label>
          <label className="flex items-center gap-2"><input id="pl-ai" type="checkbox" checked={player.aiSendConsent} onChange={(e) => savePlayer({ aiSendConsent: e.target.checked })} />外部AIへの送信を許可する(Phase 3。送る前に毎回確認します)</label>
        </div>
      </Panel>

      <Panel title="使っているデータ">
        <ul className="grid gap-1 text-sm">
          <li>経験の記録:<span className="num">{experiences.length}</span> 件</li>
          <li>成長の履歴:<span className="num">{history.length}</span> 件</li>
          <li>分析のしかた:{analyzer.name}{analyzer.sendsDataExternally ? "(外部に送信)" : "(外部に送信しない)"}</li>
          <li>保存場所:この端末のブラウザ(IndexedDB)</li>
        </ul>
      </Panel>

      <Panel title="バックアップと読み込み">
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-primary" onClick={async () => { download(`arcana-academy_${stamp()}.json`, await exportAll()); setMsg("書き出した。大切に保管してね"); }}>データを書き出す</button>
          <button className="btn" onClick={() => fileRef.current?.click()}>ファイルから読み込む</button>
          <input ref={fileRef} id="import-file" type="file" accept="application/json,.json" hidden onChange={async (e) => {
            const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
            try { setPending(JSON.parse(await f.text())); setMsg(""); } catch { setMsg("このファイルは読み込めませんでした"); }
          }} />
        </div>
        {pending != null && (
          <div className="mt-3 rounded-xl bg-candle/10 p-3 text-sm">
            今のデータを、このファイルの内容で置きかえる?(置きかえる前の状態は自動でファイルに書き出します)
            <div className="mt-2 flex gap-2">
              <button className="btn btn-primary" onClick={async () => {
                try { const backup = await run(() => importAll(pending)); download(`arcana-academy_読み込み前_${stamp()}.json`, backup); setMsg("読み込んだ"); }
                catch (err) { setMsg(err instanceof Error && err.message.includes("バージョン") ? err.message : "形式が合わないので読み込めませんでした"); }
                setPending(null);
              }}>置きかえる</button>
              <button className="btn" onClick={() => setPending(null)}>やめる</button>
            </div>
          </div>
        )}
        {msg && <p className="mt-2 text-sm text-gold-200" role="status">{msg}</p>}
      </Panel>

      <Panel title="データの削除">
        <p className="text-sm text-arcane-300">魔法使いと、すべての経験・成長の記録を消して最初からにします。元に戻せないので、先に書き出しておいてね。</p>
        <label className="mt-2 grid gap-1 text-sm"><span>確認のため「さくじょ」と入力</span><input id="del-confirm" className="field" value={delText} onChange={(e) => setDelText(e.target.value)} /></label>
        <button className="btn mt-2 border-candle/60 text-candle" disabled={delText !== "さくじょ"} onClick={async () => { await run(deleteAllData); setDelText(""); setMsg("すべてのデータを削除した"); }}>すべて削除する</button>
      </Panel>
    </div>
  );
}
