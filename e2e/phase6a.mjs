// Phase 6a:学院→星影の庭園(花壇・庭を歩く)→魔法薬研究棟(調合・上質でない)→演習で休息と魔法薬→図鑑の持ち物
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
const out = "e2e/out"; mkdirSync(out, { recursive: true });
const srv = spawn("npx", ["vite", "preview", "--port", "4179", "--strictPort"], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 2500));
const fail = (m) => { console.error("NG:", m); srv.kill(); process.exit(1); };
const B = "http://localhost:4179/#";
try {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  await p.goto(B + "/"); await p.getByTestId("art-scene").waitFor(); await p.waitForTimeout(400);
  await p.evaluate(async () => {
    const db = await new Promise((res) => { const r = indexedDB.open("arcana-academy"); r.onsuccess = () => res(r.result); });
    const get = (st, k) => new Promise((res) => { const r = db.transaction(st).objectStore(st).get(k); r.onsuccess = () => res(r.result); });
    const put = (st, v) => new Promise((res) => { const t = db.transaction(st, "readwrite"); t.objectStore(st).put(v); t.oncomplete = res; });
    const ch = await get("characters", "hero");
    ch.academy = { proficiency: { nature: 40, creation: 30 }, units: { nature: [1, 1], creation: [1] } };
    ch.inventory = [{ id: "glowmoss", name: "光る苔", qty: 2 }, { id: "candlestand", name: "古びた燭台", qty: 1 }];
    await put("characters", ch);
    const d = new Date(); const day = (n) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(n).padStart(2, "0")}`;
    for (let i = 1; i <= Math.min(3, d.getDate()); i++) {
      const g = { exp: 30, stats: {}, personalitySignals: {}, magicSignals: {}, notes: [], engine: "t" };
      await put("experiences", { id: "g" + i, date: day(i), source: "manual", category: i === 2 ? "music" : "sports", title: "庭の経験" + i, description: "", difficulty: 3, duration: 60, reflection: "", analysisStatus: "applied", proposedGrowth: g, approvedGrowth: g, createdAt: new Date().toISOString(), appliedAt: null });
    }
  });
  await p.goto(B + "/academy"); await p.reload();
  await p.locator("[data-area=garden] a").click();
  await p.getByTestId("flowerbed").getByRole("button", { name: /1日 / }).click();
  await p.getByTestId("bloom-detail").getByText("庭の経験1").waitFor();
  await p.getByTestId("walk").click();
  await p.getByTestId("garden-msg").getByText("を1つ摘んだ").waitFor();
  await p.getByTestId("walked").waitFor();
  await p.screenshot({ path: `${out}/garden.png`, fullPage: true });
  const herb = (await p.getByTestId("garden-msg").innerText()).includes("陽だまり草") ? "sun" : "moon";
  // 研究棟:灯りの香油(錬成学 単元1)を調合。昼なら癒やしの水薬も
  await p.goto(B + "/academy"); await p.locator("[data-area=potions] a").click();
  await p.locator("[data-potion=lamp]").getByRole("button", { name: "調合" }).click();
  await p.getByTestId("brew-msg").getByText("灯りの香油ができた").waitFor();
  if (herb === "sun") { await p.locator("[data-potion=heal]").getByRole("button", { name: "調合" }).click(); await p.getByTestId("brew-msg").getByText("癒やしの水薬ができた").waitFor(); }
  await p.screenshot({ path: `${out}/potions.png`, fullPage: true });
  // 演習:休息の表示と、魔法薬のコマンド
  await p.goto(B + "/arena/dummy"); await p.getByTestId("rested").waitFor();
  if (herb === "sun") { await p.getByTestId("potion-heal").click(); await p.getByText("癒やしの水薬を飲んだ").waitFor(); }
  await p.goto(B + "/explore/temple");
  await p.getByRole("button", { name: /よじ登る/ }).click(); await p.getByTestId("explore-potion").waitFor();
  const wide = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  if (wide) fail("スマホ幅で横にはみ出している");
  if (errs.length) fail("エラー: " + errs.join(" | "));
  console.log(`OK: 星影の庭園(花壇・タップで経験・庭を歩く・1日1回)・魔法薬研究棟(調合)・演習の休息${herb === "sun" ? "と魔法薬" : ""}・探索の魔法薬・スマホ幅`);
  await b.close();
} finally { srv.kill(); }
