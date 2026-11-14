// Phase 3:入学診断・性格の表示・AIの読み取り(コピー→貼り戻し)・会話からの取り込み・成長レポート
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
const out = "e2e/out"; mkdirSync(out, { recursive: true });
const srv = spawn("npx", ["vite", "preview", "--port", "4178", "--strictPort"], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 2500));
const fail = (m) => { console.error("NG:", m); srv.kill(); process.exit(1); };
try {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: "http://localhost:4178" });
  const p = await ctx.newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  await p.goto("http://localhost:4178/");
  await p.getByRole("heading", { name: "げんた" }).waitFor();
  // 入学診断
  await p.getByText("入学診断を受けて").click();
  for (let i = 0; i < 6; i++) { await p.getByText(`問 ${i + 1} / 6`).waitFor(); await p.locator("main ul button").first().click(); }
  await p.getByText("いちばん強い適性は").waitFor();
  await p.screenshot({ path: `${out}/diagnosis.png`, fullPage: true });
  await p.getByRole("button", { name: "この結果で決める" }).click();
  await p.getByText("入学診断の結果を出発点に").waitFor();
  const astral = await p.locator("li", { hasText: "星辰魔法" }).first().innerText();
  if (!/適性\s*\n?\s*\d+/.test(astral)) fail("診断後に適性の値が出ていない: " + astral);
  // 外部AIを使う許可
  await p.goto("http://localhost:4178/#/settings"); await p.locator("#pl-ai").click(); await p.waitForFunction(() => document.querySelector("#pl-ai")?.checked);
  // 経験を登録 → AIに読み取ってもらう
  await p.goto("http://localhost:4178/#/experience");
  await p.fill("#ex-title", "会社のサッカー部の練習試合");
  await p.getByRole("button", { name: "登録して成長を見る" }).click();
  await p.getByRole("button", { name: "AIに読み取ってもらう" }).click();
  await p.getByTestId("ai-bridge-exp").getByRole("button", { name: "② 内容をコピーする" }).click();
  const clip = await p.evaluate(() => navigator.clipboard.readText()).catch(() => "");
  if (clip && !clip.includes("会社のサッカー部の練習試合")) fail("コピーした内容が違う");
  await p.getByTestId("ai-bridge-exp").locator("textarea").fill('```json\n{"summary":"仲間に声をかけて守備を立て直した","personality":{"empathy":0.7,"responsibility":0.6},"magic":{"mind":0.5},"reasons":["声かけで連携"]}\n```');
  await p.getByRole("button", { name: "読み込む" }).click();
  await p.getByTestId("ai-insight").waitFor();
  await p.getByText("AIの読み取り(外部AI)を性格・魔法の兆しに反映").waitFor();
  await p.screenshot({ path: `${out}/ai_insight.png`, fullPage: true });
  await p.getByRole("button", { name: "承認して反映" }).click(); await p.getByTestId("effect-overlay").click();
  // 会話から経験を見つける
  await p.getByText("会話や日記から経験を見つける").click();
  await p.fill("#convo-text", "今日は初めてカラオケ配信で新曲に挑戦した");
  await p.getByTestId("ai-bridge-convo").getByRole("button", { name: "② 内容をコピーする" }).click();
  await p.getByTestId("ai-bridge-convo").locator("textarea").fill('{"app":"arcana-academy-experiences","source":"ai","items":[{"date":"2026-11-14","category":"music","title":"カラオケ配信で新曲に挑戦","difficulty":4,"duration":60,"ai":{"by":"外部AI","at":"2026-11-15T00:00:00Z","summary":"新曲に挑戦","personality":{"adventurousness":0.8},"magic":{"creation":0.5},"reasons":[]}}]}');
  await p.getByRole("button", { name: "経験の候補を見る" }).click();
  await p.getByText("AI読み取りつき").waitFor();
  await p.getByRole("button", { name: /選んだ1件を取り込む/ }).click();
  await p.getByText("1件を取り込んだ").waitFor();
  // 成長レポート
  await p.locator("nav").last().getByText("図鑑").click();
  await p.getByTestId("report").waitFor();
  await p.getByRole("button", { name: "今月" }).click();
  await p.getByText("いちばん伸びたのは").waitFor();
  await p.getByTestId("ai-bridge-report").getByRole("button", { name: "② 内容をコピーする" }).click();
  await p.getByTestId("ai-bridge-report").locator("textarea").fill("仲間を支える声が、君の魔力を確かに強めている。次は振り返りを一言添えてみよう。");
  await p.getByRole("button", { name: "講評を残す" }).click();
  await p.getByTestId("report-comment").waitFor();
  await p.reload(); await p.getByTestId("report").waitFor(); await p.getByRole("button", { name: "今月" }).click();
  await p.getByTestId("report-comment").waitFor();
  await p.screenshot({ path: `${out}/report.png`, fullPage: true });
  // 性格の表示
  await p.locator("nav").last().getByText("キャラクター").click();
  await p.getByText("性格の傾向").waitFor();
  if ((await p.locator("[data-trait]").count()) !== 10) fail("性格が10個並んでいない");
  const wide = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  if (wide) fail("スマホ幅で横にはみ出している");
  if (errs.length) fail("エラー: " + errs.join(" | "));
  console.log("OK: 入学診断・AIの読み取り・会話からの取り込み・成長レポート(講評の保存)・性格の表示・スマホ幅");
  await b.close();
} finally { srv.kill(); }
