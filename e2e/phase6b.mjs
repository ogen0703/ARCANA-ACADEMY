// Phase 6b:読み込み時に実績と寮の星(演出)→図鑑の実績→成績表(月を戻る)→寮の廊下(週のランキング)
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
const out = "e2e/out"; mkdirSync(out, { recursive: true });
const srv = spawn("npx", ["vite", "preview", "--port", "4178", "--strictPort"], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 2500));
const fail = (m) => { console.error("NG:", m); srv.kill(); process.exit(1); };
const B = "http://localhost:4178/#";
try {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  await p.goto(B + "/"); await p.getByTestId("art-scene").waitFor(); await p.waitForTimeout(400);
  await p.evaluate(async () => {
    const db = await new Promise((res) => { const r = indexedDB.open("arcana-academy"); r.onsuccess = () => res(r.result); });
    const get = (st, k) => new Promise((res) => { const r = db.transaction(st).objectStore(st).get(k); r.onsuccess = () => res(r.result); });
    const put = (st, v) => new Promise((res) => { const t = db.transaction(st, "readwrite"); t.objectStore(st).put(v); t.oncomplete = res; });
    const ch = await get("characters", "hero"); ch.history.house = "星環の寮"; ch.diagnosedAt = new Date().toISOString(); await put("characters", ch);
    const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const now = new Date(); const mon = new Date(now); mon.setDate(now.getDate() - ((now.getDay() + 6) % 7) - 7); // 先週の月曜
    for (let i = 0; i < 7; i++) {
      const d = new Date(mon); d.setDate(mon.getDate() + i);
      const g = { exp: 30, stats: {}, personalitySignals: {}, magicSignals: {}, notes: [], engine: "t" };
      await put("experiences", { id: "w" + i, date: ymd(d), source: "manual", category: i % 2 ? "learning" : "sports", title: "先週の経験" + i, description: "", difficulty: 3, duration: 60, reflection: "", analysisStatus: "applied", proposedGrowth: g, approvedGrowth: g, createdAt: new Date().toISOString(), appliedAt: null });
      for (let j = 0; j < 5; j++) await put("lessonLog", { id: `l${i}-${j}`, at: d.toISOString(), date: ymd(d), course: "astral", unit: 0, correct: true, prof: 1, exp: 1 });
    }
  });
  await p.reload();
  const ov = p.getByTestId("effect-overlay"); await ov.getByText("ACHIEVEMENT").waitFor();
  await ov.getByText("はじめの一歩", { exact: false }).waitFor(); await ov.getByText("1位").waitFor();
  await p.screenshot({ path: `${out}/achievement.png` }); await ov.click();
  await p.goto(B + "/encyclopedia"); await p.getByRole("tab", { name: "実績" }).click();
  await p.locator("[data-ach=r-first]").getByText("達成").waitFor();
  await p.locator("[data-ach=r-30]").getByText("いま 7/30").waitFor();
  await p.goto(B + "/academy"); await p.getByRole("link", { name: /成績表/ }).click();
  await p.getByTestId("report-card").waitFor();
  await p.screenshot({ path: `${out}/report-card.png`, fullPage: true });
  await p.goto(B + "/academy"); await p.getByRole("link", { name: /寮の廊下/ }).click();
  await p.getByRole("button", { name: "‹ 前の週" }).click();
  const n = await p.getByTestId("ranking").locator("li").count(); if (n !== 6) fail(`ランキングの人数が${n}`);
  const first = await p.getByTestId("ranking").locator("li").first().getAttribute("data-me"); if (first !== "true") fail("先週1位になっていない");
  await p.screenshot({ path: `${out}/house.png`, fullPage: true });
  await p.goto(B + "/character"); await p.getByText("寮の星").first().waitFor({ state: "attached" }).catch(() => {});
  const wide = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  if (wide) fail("スマホ幅で横にはみ出している");
  if (errs.length) fail("エラー: " + errs.join(" | "));
  console.log("OK: 読み込み時の実績と寮の星の演出・図鑑の実績(達成日・進み具合)・成績表・寮の廊下(先週1位・6人)・スマホ幅");
  await b.close();
} finally { srv.kill(); }
