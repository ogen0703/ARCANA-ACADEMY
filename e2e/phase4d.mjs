// Phase 4d:談話室→レオンと話す(話題→ひとこと×4→上限)→演習で星砂→ヴァーレ教授に贈る(好物)→図鑑の人物
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
const out = "e2e/out"; mkdirSync(out, { recursive: true });
const srv = spawn("npx", ["vite", "preview", "--port", "4183", "--strictPort"], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 2500));
const fail = (m) => { console.error("NG:", m); srv.kill(); process.exit(1); };
const B = "http://localhost:4183/#";
try {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  await p.goto(B + "/academy"); await p.getByRole("link", { name: /談話室 先生や仲間/ }).click();
  await p.screenshot({ path: `${out}/lounge.png`, fullPage: true });
  await p.locator("[data-npc=leon] a").click();
  await p.getByRole("button", { name: "「もう一回やろう。今度は一緒に」" }).click();
  await p.getByTestId("reply").getByText("(響いた)").waitFor();
  if ((await p.getByTestId("trust").innerText()) !== "9") fail("信頼が9になっていない");
  await p.screenshot({ path: `${out}/npc_talk.png`, fullPage: true });
  for (let i = 0; i < 4; i++) { await p.getByRole("button", { name: "もどる" }).click(); await p.getByRole("button", { name: /ひとこと話す/ }).click(); await p.getByTestId("reply").waitFor(); }
  await p.getByRole("button", { name: "もどる" }).click();
  await p.getByText("今日はたくさん話した").waitFor(); await p.getByTestId("talks-used").getByText("今日 5/5").waitFor();
  if ((await p.getByTestId("trust").innerText()) !== "13") fail("ひとことで信頼が増えていない");
  // 演習で星砂 → ヴァーレ教授へ
  await p.goto(B + "/arena/dummy");
  for (let i = 0; i < 20 && !(await p.getByTestId("battle-result").isVisible().catch(() => false)); i++) { await p.getByRole("button", { name: /杖で打つ/ }).click(); await p.waitForTimeout(50); }
  await p.goto(B + "/lounge/t-astral");
  await p.getByLabel("贈る素材").selectOption("stardust"); await p.getByRole("button", { name: "贈る" }).click();
  await p.getByText(/とても喜んでくれた/).waitFor();
  await p.getByText("今日はもう贈り物をした").waitFor();
  await p.reload(); await p.getByTestId("trust").waitFor();
  await p.goto(B + "/encyclopedia"); await p.getByRole("tab", { name: "人物" }).click(); await p.getByTestId("people-book").getByText("レオン・ハーヴィル").waitFor();
  const wide = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  if (wide) fail("スマホ幅で横にはみ出している");
  if (errs.length) fail("エラー: " + errs.join(" | "));
  console.log("OK: 談話室・話題の会話(響く答え・信頼)・ひとこと×4と1日5回の上限・演習の素材を先生に贈る(好物)・図鑑の人物・スマホ幅");
  await b.close();
} finally { srv.kill(); }
