import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { ArcanaDB, useDb } from "../storage/db";
import { ensureInitialized, listExperiences } from "../storage/repo";
import { checkInbox, setInboxPass } from "./index";
import { openSealed, seal } from "./crypto";

let k = 0;
beforeEach(async () => { useDb(new ArcanaDB("inbox-" + k++)); await ensureInitialized(); });
const payload = JSON.stringify({ app: "arcana-academy-experiences", source: "diary", items: [{ date: "2026-11-15", category: "sports", title: "サッカーの練習", difficulty: 2, sourceRef: "daily:2026-11-15:soccer" }] });

describe("自動受け取り", () => {
  it("暗号化→復号で元に戻る", async () => {
    expect(await openSealed(await seal("こんにちは", "pw"), "pw")).toBe("こんにちは");
    await expect(openSealed(await seal("x", "pw"), "ちがう")).rejects.toThrow();
  });
  it("受け取り箱から取り込み、同じファイルは2回読まない", async () => {
    const files: Record<string, unknown> = { "index.json": { files: [{ name: "20261115.enc.json", date: "2026-11-15" }] }, "20261115.enc.json": await seal(payload, "secret") };
    const fake = (async (url: string) => { const n = String(url).split("/").pop()!.split("?")[0]; return { ok: n in files, json: async () => files[n] }; }) as unknown as typeof fetch;
    expect((await checkInbox(fake, "x/")).error).toBe("合言葉が未設定");
    await setInboxPass("secret");
    expect(await checkInbox(fake, "x/")).toMatchObject({ added: 1, files: 1 });
    expect(await checkInbox(fake, "x/")).toMatchObject({ added: 0, files: 0 });
    expect((await listExperiences())[0].analysisStatus).toBe("proposed");
  });
  it("合言葉が違うと取り込まない", async () => {
    const files: Record<string, unknown> = { "index.json": { files: [{ name: "a.enc.json", date: "2026-11-15" }] }, "a.enc.json": await seal(payload, "secret") };
    const fake = (async (url: string) => { const n = String(url).split("/").pop()!.split("?")[0]; return { ok: true, json: async () => files[n] }; }) as unknown as typeof fetch;
    await setInboxPass("wrong");
    expect((await checkInbox(fake, "x/")).error).toContain("合言葉");
  });
});
