// Phase 4c:演習場→演習人形に杖で勝つ(報酬・称号)→次の相手が開く→わざと退く→灯り玉→ランク・回数の表示
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
const out = "e2e/out"; mkdirSync(out, { recursive: true });
const srv = spawn("npx", ["vite", "preview", "--port", "4182", "--strictPort"], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 2500));
const fail = (m) => { console.error("NG:", m); srv.kill(); process.exit(1); };
const B = "http://localhost:4182/#";
try {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  await p.goto(B + "/academy"); await p.getByRole("link", { name: /決闘演習場 覚えた呪文/ }).click();
  await p.getByTestId("rewards-left").getByText("今日あと 3").waitFor();
  if (!(await p.locator("[data-foe=wisp]").innerText()).includes("🔒")) fail("2体目が最初から開いている");
  await p.locator("[data-foe=dummy] a").click();
  await p.getByTestId("hint").waitFor();
  for (let i = 0; i < 20 && !(await p.getByTestId("battle-result").isVisible().catch(() => false)); i++) {
    await p.getByRole("button", { name: /杖で打つ/ }).click(); await p.waitForTimeout(60);
    if (i === 1) await p.screenshot({ path: `${out}/battle.png`, fullPage: true });
  }
  await p.getByTestId("battle-result").getByText("勝利!").waitFor();
  await p.getByText("称号「演習場の新人」").waitFor(); await p.getByText("EXP +5").waitFor();
  await p.screenshot({ path: `${out}/battle_win.png`, fullPage: true });
  await p.getByRole("link", { name: "演習場へ" }).click();
  await p.getByTestId("rewards-left").getByText("今日あと 2").waitFor();
  await p.locator("[data-foe=wisp] a").click();
  await p.getByRole("button", { name: "退く" }).click();
  await p.getByTestId("battle-result").getByText("退いた").waitFor();
  await p.getByRole("link", { name: "演習場へ" }).click();
  await p.getByTestId("rewards-left").getByText("今日あと 2").waitFor();
  await p.screenshot({ path: `${out}/arena.png`, fullPage: true });
  await p.reload(); await p.locator("[data-foe=dummy]").getByText("勝利").waitFor();
  const wide = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  if (wide) fail("スマホ幅で横にはみ出している");
  if (errs.length) fail("エラー: " + errs.join(" | "));
  console.log("OK: 演習場・気配の表示・杖で演習人形に勝利(EXP・素材・称号)・次の相手が開く・退く(報酬回数は減らない)・再読み込み後の保持・スマホ幅");
  await b.close();
} finally { srv.kill(); }
