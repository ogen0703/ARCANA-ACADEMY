// Phase 4b:授業で形成の指→廃神殿を探索(代わりの方法・呪文・通れない部屋で引き返す)→杖えらび→先生の課題→称号の表示→探索記録
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
const out = "e2e/out"; mkdirSync(out, { recursive: true });
const srv = spawn("npx", ["vite", "preview", "--port", "4181", "--strictPort"], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 2500));
const fail = (m) => { console.error("NG:", m); srv.kill(); process.exit(1); };
const B = "http://localhost:4181/#";
try {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  await p.goto(B + "/diagnosis");
  for (let i = 0; i < 6; i++) { await p.getByText(`問 ${i + 1} / 6`).waitFor(); await p.locator("main ul button").nth(2).click(); }
  await p.getByRole("button", { name: "この結果で決める" }).click(); await p.getByText("入学診断の結果を出発点に").waitFor();
  // 錬成学 単元1〜3 → 形成の指
  await p.goto(B + "/lessons/creation");
  const ans = ["素材に触って確かめる", "手に取れるくらいはっきり描く", "手が覚えるための一歩"];
  for (let u = 0; u < 3; u++) {
    await p.locator("main ul button").nth(u).click(); await p.getByRole("button", { name: "確認の問いへ" }).click();
    await p.getByRole("button", { name: ans[u], exact: true }).click(); await p.getByRole("button", { name: "答える" }).click();
    await p.getByTestId("lesson-result").waitFor();
    if (u === 2) await p.getByTestId("effect-overlay").click();
    await p.getByRole("button", { name: "単元一覧へ" }).click();
  }
  // 探索
  await p.goto(B + "/explore"); await p.getByTestId("explore-left").getByText("今日あと 2 回").waitFor();
  await p.screenshot({ path: `${out}/explore.png`, fullPage: true });
  if (!(await p.locator("[data-place=archive]").innerText()).includes("🔒")) fail("禁書庫が単元2なしで開いている");
  await p.locator("[data-place=temple] a").click();
  await p.getByRole("button", { name: "よじ登る" }).click();
  await p.getByRole("button", { name: "壁伝いに手探りで進む" }).click();
  await p.getByRole("button", { name: /読めないまま先へ進む/ }).click();
  await p.getByRole("button", { name: "手で少しずつほどく" }).click();
  await p.getByRole("button", { name: /形成の指/ }).click();
  await p.getByTestId("blocked").waitFor();
  await p.screenshot({ path: `${out}/explore_room.png`, fullPage: true });
  await p.getByRole("button", { name: /ここで引き返す/ }).click();
  await p.getByTestId("explore-result").waitFor(); await p.getByText("星の欠片 ×1").waitFor(); await p.getByText("EXP +8").waitFor();
  await p.screenshot({ path: `${out}/explore_result.png`, fullPage: true });
  // クエスト
  await p.getByRole("link", { name: "クエストを見る" }).click();
  await p.getByRole("button", { name: /杖を作る/ }).click(); await p.getByTestId("wand").waitFor();
  const wand = await p.getByTestId("wand").innerText();
  await p.locator("[data-testid=teacher-quests] li", { hasText: "素材を3種類" }).getByRole("button", { name: "先生に報告する" }).click();
  await p.getByText("報告した。称号「駆け出しの錬成師」").waitFor();
  await p.getByTestId("titles").getByRole("button", { name: "杖を持つ者" }).click();
  await p.getByText("「杖を持つ者」を表示する").waitFor();
  await p.screenshot({ path: `${out}/quests.png`, fullPage: true });
  await p.goto(B + "/"); await p.getByTestId("active-title").getByText("杖を持つ者").waitFor();
  await p.goto(B + "/explore"); await p.getByTestId("explore-left").getByText("今日あと 1 回").waitFor();
  await p.goto(B + "/encyclopedia"); await p.getByRole("tab", { name: "探索記録" }).click(); await p.getByTestId("explore-book").getByText("星降りの廃神殿").waitFor();
  await p.reload(); await p.goto(B + "/character"); await p.getByText(wand).waitFor();
  const wide = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  if (wide) fail("スマホ幅で横にはみ出している");
  if (errs.length) fail("エラー: " + errs.join(" | "));
  console.log(`OK: 授業→形成の指・廃神殿(代わりの方法/呪文/通れない部屋で引き返す)・素材とEXP・杖(${wand})・先生の課題・称号の表示・1日の回数・探索記録・スマホ幅`);
  await b.close();
} finally { srv.kill(); }
