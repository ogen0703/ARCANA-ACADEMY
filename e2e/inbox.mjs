// 受け取り箱の通しテスト:raw.githubusercontent.com への通信を差しかえ、Pythonで暗号化したファイルを自動で取り込めるか
import { createRequire } from "node:module";
import { spawn, execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
const { chromium } = createRequire(import.meta.url)("playwright");
const dir = "e2e/out/inbox"; mkdirSync(dir, { recursive: true });
writeFileSync("e2e/out/items.json", JSON.stringify({ app: "arcana-academy-experiences", source: "diary", note: "test", items: [{ date: "2026-11-15", category: "music", title: "noir.arcanaのカラオケ配信", difficulty: 3, duration: 90, sourceRef: "daily:2026-11-15:noir" }] }));
writeFileSync(`${dir}/index.json`, '{"files": []}');
execFileSync("python3", ["tools/arcana_encrypt.py", "e2e/out/items.json", "てすと-合言葉", dir, "20261115"]);
const srv = spawn("npx", ["vite", "preview", "--port", "4174", "--strictPort"], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 2500));
try {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await p.route("https://raw.githubusercontent.com/**", (route) => {
    const n = new URL(route.request().url()).pathname.split("/").pop();
    try { route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: readFileSync(`${dir}/${n}`, "utf8") }); } catch { route.fulfill({ status: 404, body: "" }); }
  });
  await p.goto("http://localhost:4174/#/settings");
  await p.fill("#inbox-pass", "てすと-合言葉"); await p.getByRole("button", { name: "保存" }).click();
  await p.getByText("新しい経験 1件").waitFor({ timeout: 10000 });
  await p.reload(); await p.locator("nav").last().getByText("経験登録").click();
  await p.getByText("noir.arcanaのカラオケ配信").first().waitFor();
  await p.locator("nav").last().getByText("設定").click(); await p.getByRole("button", { name: "今すぐ確認" }).click();
  await p.getByText("新しい経験 0件").waitFor();
  console.log("OK: 受け取り箱から自動取り込み・2回目は取り込まない"); await b.close();
} finally { srv.kill(); }
