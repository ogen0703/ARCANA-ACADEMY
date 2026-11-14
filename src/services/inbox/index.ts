/**
 * 自動受け取り:毎日の定期タスクが、経験を合言葉で暗号化して GitHub の inbox/ に置く。
 * アプリは起動時にそれを読み、合言葉で開いて「承認まち」として取り込む(反映はプレイヤーが承認してから)。
 */
import { ImportFileSchema } from "../../schemas";
import { db } from "../storage/db";
import { importExperiences } from "../storage/repo";
import { openSealed, type Sealed } from "./crypto";

export const INBOX_BASE = "https://raw.githubusercontent.com/ogen0703/ARCANA-ACADEMY/main/inbox/";
type IndexFile = { files: { name: string; date: string }[] };

export async function getInboxSettings() {
  const pass = (await db.meta.get("inboxPass"))?.value as string | undefined;
  const done = ((await db.meta.get("inboxDone"))?.value as string[] | undefined) ?? [];
  const lastCheck = (await db.meta.get("inboxLastCheck"))?.value as string | undefined;
  return { pass: pass ?? "", done, lastCheck: lastCheck ?? null };
}
export async function setInboxPass(pass: string) {
  if (pass) await db.meta.put({ key: "inboxPass", value: pass.trim() }); else await db.meta.delete("inboxPass");
}

export type InboxResult = { added: number; skipped: number; files: number; error?: string };

/** 受け取り箱を見て、まだ読んでいないファイルを取り込む */
export async function checkInbox(fetchImpl: typeof fetch = fetch, base = INBOX_BASE): Promise<InboxResult> {
  const { pass, done } = await getInboxSettings();
  if (!pass) return { added: 0, skipped: 0, files: 0, error: "合言葉が未設定" };
  const t = Date.now();
  const res = await fetchImpl(`${base}index.json?t=${t}`, { cache: "no-store" });
  if (!res.ok) return { added: 0, skipped: 0, files: 0, error: "受け取り箱に接続できませんでした" };
  const idx = (await res.json()) as IndexFile;
  const todo = (idx.files ?? []).filter((f) => /^[\w.-]+\.enc\.json$/.test(f.name) && !done.includes(f.name));
  let added = 0, skipped = 0, files = 0;
  const newDone = [...done];
  for (const f of todo) {
    const r = await fetchImpl(`${base}${f.name}?t=${t}`, { cache: "no-store" });
    if (!r.ok) continue;
    let text: string;
    try { text = await openSealed((await r.json()) as Sealed, pass); }
    catch { return { added, skipped, files, error: "合言葉が違うようです(設定を確認してね)" }; }
    const data = ImportFileSchema.parse(JSON.parse(text));
    const out = await importExperiences(data.items, data.source === "markdown" ? "markdown" : data.source);
    added += out.added; skipped += out.skipped; files++;
    newDone.push(f.name);
    await db.meta.put({ key: "inboxDone", value: newDone });
  }
  await db.meta.put({ key: "inboxLastCheck", value: new Date().toISOString() });
  return { added, skipped, files };
}
