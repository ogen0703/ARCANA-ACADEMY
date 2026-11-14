import { useRef, useState } from "react";
import { useGame } from "../../stores/game";
import { importExperiences, parseMarkdownExperiences } from "../../services/storage/repo";
import { CATEGORY_DEFS } from "../../game/growth/rules";
import { ImportFileSchema, type ExperienceEvent, type ImportItem } from "../../schemas";
import { Panel } from "../../components/ui";

/** 記録(第2の脳から作ったファイル・Markdown)から経験を取り込む。全部「承認まち」で入る */
export default function ImportPanel() {
  const { run } = useGame();
  const ref = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<ImportItem[]>([]);
  const [pick, setPick] = useState<boolean[]>([]);
  const [source, setSource] = useState<ExperienceEvent["source"]>("markdown");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState("");

  const load = async (f: File) => {
    const text = await f.text();
    try {
      let list: ImportItem[] = [], src: ExperienceEvent["source"] = "markdown", nt = "";
      if (/\.json$/i.test(f.name) || text.trim().startsWith("{")) {
        const d = ImportFileSchema.parse(JSON.parse(text)); list = d.items; src = d.source; nt = d.note ?? "";
      } else list = parseMarkdownExperiences(text);
      if (!list.length) { setMsg("取り込める経験が見つかりませんでした"); return; }
      setItems(list); setPick(list.map(() => true)); setSource(src); setNote(nt); setMsg("");
    } catch { setMsg("このファイルは読み込めませんでした(形式を確認してね)"); }
  };
  const chosen = items.filter((_, i) => pick[i]);

  return (
    <Panel title="記録から取り込む">
      <p className="text-sm text-arcane-300">第2の脳から作った取り込みファイル(.json)や、「- 2026-11-14 [スポーツ・運動] タイトル | くわしく | 振り返り」の形のMarkdownを読み込めます。取り込んだ経験は全部「承認まち」になり、承認するまで成長しません。同じ記録は2回取り込まれません。</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button className="btn" onClick={() => ref.current?.click()}>ファイルを選ぶ</button>
        <input ref={ref} id="exp-import" type="file" accept=".json,.md,.txt,application/json,text/markdown,text/plain" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) load(f); }} />
      </div>
      {items.length > 0 && (
        <div className="mt-3">
          {note && <p className="mb-2 text-xs text-arcane-300/80">{note}</p>}
          <div className="mb-2 flex items-center justify-between text-sm">
            <span>{items.length}件見つかった(選択 {chosen.length}件)</span>
            <span className="flex gap-1 text-xs"><button className="btn-ghost rounded px-2" onClick={() => setPick(items.map(() => true))}>全部選ぶ</button><button className="btn-ghost rounded px-2" onClick={() => setPick(items.map(() => false))}>全部外す</button></span>
          </div>
          <ul className="max-h-80 space-y-1 overflow-y-auto pr-1">
            {items.map((it, i) => (
              <li key={i}>
                <label className="flex cursor-pointer items-start gap-2 rounded-lg bg-night-800/50 px-2 py-1.5 text-sm">
                  <input type="checkbox" className="mt-1" checked={!!pick[i]} onChange={(e) => setPick((p) => p.map((v, j) => (j === i ? e.target.checked : v)))} />
                  <span className="min-w-0"><span className="text-xs text-arcane-300">{it.date} ・ {CATEGORY_DEFS[it.category].label} ・ 大きさ{it.difficulty}{it.duration ? ` ・ ${it.duration}分` : ""}</span><br />{it.title}</span>
                </label>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-2">
            <button className="btn btn-primary" disabled={!chosen.length} onClick={async () => {
              const r = await run(() => importExperiences(chosen, source));
              setItems([]); setPick([]); setMsg(`${r.added}件を取り込んだ(承認まち)${r.skipped ? `。${r.skipped}件はもう入っていたのでスキップ` : ""}`);
            }}>選んだ{chosen.length}件を取り込む</button>
            <button className="btn" onClick={() => { setItems([]); setPick([]); }}>やめる</button>
          </div>
        </div>
      )}
      {msg && <p className="mt-2 text-sm text-gold-200" role="status">{msg}</p>}
    </Panel>
  );
}
