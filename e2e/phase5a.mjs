// Phase 5a:保護区→歩く→近づき方を3回選ぶ(反応)→結果→回数が減る→図鑑の魔法生物に記録
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
const out = "e2e/out"; mkdirSync(out, { recursive: true });
const srv = spawn("npx", ["vite", "preview", "--port", "4184", "--strictPort"], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 2500));
const fail = (m) => { console.error("NG:", m); srv.kill(); process.exit(1); };
const B = "http://localhost:4184/#";
try {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  await p.goto(B + "/academy"); await p.getByRole("link", { name: /魔法生物保護区 生き物と/ }).click();
  await p.getByTestId("visit").getByText("今日あと 3 回").waitFor();
  await p.screenshot({ path: `${out}/sanctuary.png`, fullPage: true });
  await p.getByTestId("visit").click();
  const name = await p.getByTestId("creature").innerText();
  for (let i = 0; i < 3 && !(await p.getByTestId("visit-result").isVisible().catch(() => false)); i++) {
    await p.getByRole("button", { name: i === 0 ? "そっと待つ" : i === 1 ? "静かに声をかける" : "一緒に走る" }).click(); await p.waitForTimeout(80);
  }
  await p.getByTestId("visit-result").waitFor();
  await p.screenshot({ path: `${out}/visit.png`, fullPage: true });
  const friend = (await p.getByTestId("visit-result").innerText()).includes("心を開いて");
  await p.getByRole("link", { name: "保護区へ" }).click();
  await p.getByTestId("visit").getByText("今日あと 2 回").waitFor();
  if (friend) await p.getByTestId("friends").getByText(name).waitFor();
  await p.goto(B + "/encyclopedia"); await p.getByRole("tab", { name: "魔法生物図鑑" }).click();
  await p.getByTestId("creature-book").getByText(name).waitFor();
  const wide = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  if (wide) fail("スマホ幅で横にはみ出している");
  if (errs.length) fail("エラー: " + errs.join(" | "));
  console.log(`OK: 保護区・出会い(${name}・${friend ? "仲間になった" : "去っていった"})・近づき方と反応・1日の回数・図鑑に記録・スマホ幅`);
  await b.close();
} finally { srv.kill(); }
