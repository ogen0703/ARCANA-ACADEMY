// Phase 5b:昇格の演出→位・オーラ・魔法陣・相棒→上級課程の条件→魔法研究室→複合魔法の図鑑→性格の移り変わりと心の転機
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
const out = "e2e/out"; mkdirSync(out, { recursive: true });
const srv = spawn("npx", ["vite", "preview", "--port", "4183", "--strictPort"], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 2500));
const fail = (m) => { console.error("NG:", m); srv.kill(); process.exit(1); };
const B = "http://localhost:4183/#";

/** テスト用のデータを入れる(中級呪文3つ・レベル10・適性・相棒・60日ぶんの経験) */
async function seed(p) {
  await p.evaluate(async () => {
    const open = () => new Promise((res, rej) => { const r = indexedDB.open("arcana-academy"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const db = await open();
    const get = (st, k) => new Promise((res) => { const r = db.transaction(st).objectStore(st).get(k); r.onsuccess = () => res(r.result); });
    const put = (st, v) => new Promise((res, rej) => { const t = db.transaction(st, "readwrite"); t.objectStore(st).put(v); t.oncomplete = res; t.onerror = () => rej(t.error); });
    const ch = await get("characters", "hero");
    for (const k of Object.keys(ch.magicAffinity)) ch.magicAffinity[k] = { ...ch.magicAffinity[k], base: 40, value: k === "elemental" ? 66 : 45 };
    ch.diagnosedAt = new Date(Date.now() - 70 * 864e5).toISOString();
    ch.history.house = "暁火の寮";
    ch.level = 10; ch.experience = 2800;
    ch.learnedSpells = ["elemental-1", "elemental-2", "creation-1", "creation-2", "astral-1", "astral-2"];
    ch.academy = { proficiency: { elemental: 65 }, units: { elemental: [1, 1, 1, 1, 1] } };
    ch.world.creatures = { salamander: { friend: true, attempts: 1, affection: 30 } }; ch.world.companion = "salamander";
    await put("characters", ch);
    const day = (n) => { const d = new Date(Date.now() - n * 864e5); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
    for (let i = 0; i < 14; i++) {
      const g = { exp: 30, stats: {}, personalitySignals: { decisiveness: 2, adventurousness: i % 2 }, magicSignals: {}, notes: [], engine: "t" };
      await put("experiences", { id: `seed-${i}`, date: day(60 - i * 4), source: "manual", category: "sports", title: `練習${i + 1}`, description: "", difficulty: 3, duration: 60, reflection: "", analysisStatus: "applied", proposedGrowth: g, approvedGrowth: g, createdAt: new Date().toISOString(), appliedAt: null });
    }
  });
}

try {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  await p.goto(B + "/"); await p.getByTestId("art-scene").waitFor(); await p.waitForTimeout(500);
  await seed(p);
  await p.reload();
  // 位が上がったので昇格の演出
  await p.getByTestId("effect-overlay").getByText("PROMOTION").waitFor();
  await p.getByTestId("effect-overlay").getByText("正魔法使い").waitFor();
  await p.getByTestId("effect-overlay").click();
  // 大広間:オーラ・魔法陣・相棒
  for (const id of ["aura", "floor-rings", "hall-companion"]) await p.getByTestId(id).waitFor({ state: "attached" });
  await p.waitForTimeout(600);
  await p.screenshot({ path: `${out}/hall-5b.png` });
  // キャラクター:位と、性格の移り変わり
  await p.goto(B + "/character");
  if ((await p.getByTestId("rank").innerText()) !== "正魔法使い") fail("位が正魔法使いになっていない");
  await p.getByTestId("personality-shift").waitFor();
  await p.getByTestId("turning-points").getByText("決断力").first().waitFor();
  await p.getByTestId("personality-shift").screenshot({ path: `${out}/personality-shift.png` });
  // 上級課程:先生の信頼が足りない
  await p.goto(B + "/lessons/elemental");
  const head = p.getByTestId("advanced-head"); await head.waitFor();
  if (!(await head.innerText()).includes("信頼")) fail("上級課程の条件に先生の信頼が出ていない");
  // 魔法研究室:自分の寮の秘術(嵐織りの網)を研究
  await p.goto(B + "/academy"); await p.getByRole("link", { name: /魔法研究室/ }).click();
  await p.getByRole("button", { name: /風の刃/ }).click(); await p.getByRole("button", { name: /光の織機/ }).click();
  await p.getByTestId("research").click();
  await p.getByTestId("research-result").getByText("手ごたえあり(1 / 2)").waitFor();
  if (await p.getByTestId("research").isEnabled()) fail("1日1回のはずが、まだ研究できる");
  await p.getByTestId("compounds").getByText("嵐織りの網(研究中 1 / 2)").waitFor();
  await p.screenshot({ path: `${out}/research.png`, fullPage: true });
  // 図鑑:複合魔法の欄と、年表の心の転機
  await p.goto(B + "/encyclopedia"); await p.getByRole("tab", { name: "魔法図鑑" }).click();
  await p.getByTestId("compound-book").getByText("0 / 9").waitFor();
  await p.getByRole("tab", { name: "成長年表" }).click();
  await p.getByTestId("timeline-turn").first().waitFor();
  const wide = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  if (wide) fail("スマホ幅で横にはみ出している");
  if (errs.length) fail("エラー: " + errs.join(" | "));
  console.log("OK: 昇格の演出・位・オーラ/魔法陣/相棒・性格の移り変わりと心の転機・上級課程の条件・魔法研究室(1日1回・寮の秘術2段)・図鑑・スマホ幅");
  await b.close();
} finally { srv.kill(); }
