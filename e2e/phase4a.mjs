// Phase 4a:入学診断で寮・授業3コマ(1日の上限)・初級呪文の習得演出・魔法画面の呪文一覧
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
const out = "e2e/out"; mkdirSync(out, { recursive: true });
const srv = spawn("npx", ["vite", "preview", "--port", "4179", "--strictPort"], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 2500));
const fail = (m) => { console.error("NG:", m); srv.kill(); process.exit(1); };
try {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  await p.goto("http://localhost:4179/#/diagnosis");
  for (let i = 0; i < 6; i++) { await p.getByText(`問 ${i + 1} / 6`).waitFor(); await p.locator("main ul button").nth(3).click(); }
  const house = await p.getByTestId("house").innerText();
  await p.getByRole("button", { name: "この結果で決める" }).click();
  await p.getByText("入学診断の結果を出発点に").waitFor();
  await p.locator("nav").last().getByText("キャラクター").click(); await p.getByText(house).first().waitFor().catch(async (e) => { await p.screenshot({ path: `${out}/p4fail.png`, fullPage: true }); throw e; });
  // 授業
  await p.locator("nav").last().getByText("学院").click();
  await p.getByText("講義棟 ・ 授業").click();
  await p.getByTestId("lessons-left").getByText("今日あと 3 コマ").waitFor();
  await p.screenshot({ path: `${out}/lessons.png`, fullPage: true });
  await p.locator("[data-course=elemental] a").click();
  const answers = ["光", "息を吐くとき", "小さく確実に何度でも"];
  for (let u = 0; u < 3; u++) {
    await p.locator("main ul button").nth(u).click();
    await p.getByTestId("lecture").waitFor();
    if (u === 2) await p.screenshot({ path: `${out}/lecture.png`, fullPage: true });
    await p.getByRole("button", { name: "確認の問いへ" }).click();
    await p.getByRole("button", { name: answers[u], exact: true }).click();
    await p.getByRole("button", { name: "答える" }).click();
    await p.getByTestId("lesson-result").waitFor();
    if (u === 2) { await p.getByText("NEW SPELL").waitFor(); await p.screenshot({ path: `${out}/spell.png` }); await p.getByTestId("effect-overlay").click(); }
    await p.getByRole("button", { name: "単元一覧へ" }).click();
  }
  await p.getByText("今日の授業はおしまい").waitFor();
  // 魔法画面
  await p.goto("http://localhost:4179/#/magic");
  if ((await p.locator("[data-spell=elemental-1]").getAttribute("data-learned")) !== "true") fail("灯火の術を覚えていない");
  await p.locator("[data-spell=elemental-2] summary").click();
  await p.getByText("身体能力 25").waitFor();
  await p.screenshot({ path: `${out}/magic_spells.png`, fullPage: true });
  await p.reload(); await p.locator("[data-spell=elemental-1][data-learned=true]").waitFor();
  const wide = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  if (wide) fail("スマホ幅で横にはみ出している");
  if (errs.length) fail("エラー: " + errs.join(" | "));
  console.log(`OK: 入学診断で寮(${house})・授業3コマと1日の上限・初級呪文の習得演出・呪文一覧と条件・再読み込み後の保持・スマホ幅`);
  await b.close();
} finally { srv.kill(); }
