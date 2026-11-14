// 起動・登録・承認・再読み込み後の保持・画面遷移・スマホ幅を確認する
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright"); // 環境に入っている Playwright を使う
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
const out = "e2e/out"; mkdirSync(out, { recursive: true });
const srv = spawn("npx", ["vite", "preview", "--port", "4173", "--strictPort"], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 2500));
const fail = (m) => { console.error("NG:", m); srv.kill(); process.exit(1); };
try {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => m.type() === "error" && !/fonts\.g/.test(m.text()) && errs.push(m.text()));
  await p.goto("http://localhost:4173/");
  await p.getByText("ARCANA ACADEMY").first().waitFor();
  await p.getByRole("heading", { name: "げんた" }).waitFor();
  await p.screenshot({ path: `${out}/home.png`, fullPage: true });
  await p.getByRole("link", { name: "経験を記録する" }).click();
  await p.fill("#ex-title", "会社のサッカー部の練習試合");
  await p.fill("#ex-refl", "前半は動きが重かったけど、後半は声を出してラインを上げられた。次は最初から声を出す");
  await p.getByRole("button", { name: "登録して成長を見る" }).click();
  await p.getByText("承認まち").first().waitFor();
  await p.getByRole("button", { name: "承認して反映" }).click();
  await p.getByText("反映済み").first().waitFor();
  await p.screenshot({ path: `${out}/experience.png`, fullPage: true });
  await p.reload();
  await p.locator("nav").last().getByText("キャラクター").click();
  const phys = await p.locator("li", { hasText: "身体能力" }).first().innerText();
  if (!/1\d\.\d/.test(phys) || /10\.0/.test(phys)) fail("再読み込み後に能力値が残っていない: " + phys);
  await p.getByText("会社のサッカー部の練習試合").waitFor();
  await p.screenshot({ path: `${out}/character.png`, fullPage: true });
  for (const n of ["魔法", "設定", "ホーム"]) { await p.locator("nav").last().getByText(n).click(); await p.waitForTimeout(150); }
  await p.locator("nav").last().getByText("魔法").click(); await p.screenshot({ path: `${out}/magic.png`, fullPage: true });
  const wide = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  if (wide) fail("スマホ幅で横にはみ出している");
  await p.setViewportSize({ width: 1280, height: 860 }); await p.locator("header").getByText("ホーム").click(); await p.screenshot({ path: `${out}/home_pc.png` });
  if (errs.length) fail("エラー: " + errs.join(" | "));
  console.log("OK: 起動・登録・承認・再読み込み後の保持・画面遷移・スマホ幅");
  await b.close();
} finally { srv.kill(); }
