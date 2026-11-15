// Phase 6c:第2章「星を降ろした人」(章の切り替え・選択・星の塔・星喰いの影・称号)→図鑑・年表
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
const out = "e2e/out"; mkdirSync(out, { recursive: true });
const srv = spawn("npx", ["vite", "preview", "--port", "4177", "--strictPort"], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 2500));
const fail = (m) => { console.error("NG:", m); srv.kill(); process.exit(1); };
const B = "http://localhost:4177/#";

/** IndexedDB を直接さわる(テスト用) */
const idb = (p, fn, arg) => p.evaluate(async ([src, a]) => {
  const db = await new Promise((res, rej) => { const r = indexedDB.open("arcana-academy"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const get = (st, k) => new Promise((res) => { const r = db.transaction(st).objectStore(st).get(k); r.onsuccess = () => res(r.result); });
  const put = (st, v) => new Promise((res, rej) => { const t = db.transaction(st, "readwrite"); t.objectStore(st).put(v); t.oncomplete = res; t.onerror = () => rej(t.error); });
  const day = (n) => { const d = new Date(Date.now() - n * 864e5); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
  // eslint-disable-next-line no-new-func
  return new Function("get", "put", "day", "a", `return (async () => { ${src} })()`)(get, put, day, a);
}, [fn, arg]);

const seed = `
  const ch = await get("characters", "hero");
  ch.diagnosedAt = new Date(Date.now() - 60 * 864e5).toISOString(); ch.history.house = "暁火の寮";
  ch.learnedSpells = ["astral-1", "astral-2", "ancient-1", "ancient-2", "creation-1", "creation-2"];
  ch.world.discoveries = ["d-ceiling", "d-diary", "d-chain", "d-altar"];
  ch.world.story = { ...ch.world.story, scene: 8, cleared: true, route: "A", lastRead: day(2), log: [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ scene: n, date: day(12 - n), choice: null })) };
  ch.relationships = [...ch.relationships.filter((r) => r.id !== "t-mind"), { id: "t-mind", name: "ミラ・ルーンウェル", bond: 40 }];
  ch.inventory = [...ch.inventory, { id: "staremblem", name: "古い星の紋章", qty: 1 }, { id: "oldcodex", name: "古い写本", qty: 1 }];
  await put("characters", ch);
  for (let i = 0; i < 32; i++) {
    const g = { exp: 10, stats: {}, personalitySignals: {}, magicSignals: {}, notes: [], engine: "t" };
    await put("experiences", { id: "seed-" + i, date: day(45 - i), source: "manual", category: "learning", title: "勉強" + i, description: "", difficulty: 3, duration: 60, reflection: "", analysisStatus: "applied", proposedGrowth: g, approvedGrowth: g, createdAt: new Date().toISOString(), appliedAt: null });
  }`;
/** 第2章の状態を書きかえる(次の日にする) */
const s2 = (p, js = "") => idb(p, `const ch = await get("characters", "hero"); const s = ch.world.story2; s.lastRead = ""; s.log = s.log.map((l) => ({ ...l, date: day(20 - l.scene) })); ${js}; await put("characters", ch);`);

try {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  await p.goto(B + "/"); await p.getByTestId("art-scene").waitFor(); await p.waitForTimeout(400);
  await idb(p, seed);
  await p.goto(B + "/explore"); await p.reload();
  await p.locator('[data-place="tower"]').getByText("第2章の場面3").waitFor({ timeout: 5000 }).catch(() => fail("星の塔が物語の前からひらいている"));
  // 物語:章のタブ、第2章がはじめに出る
  await p.goto(B + "/story"); await p.getByTestId("chapter-tabs").waitFor();
  await p.getByText("星を降ろした人").first().waitFor();
  await p.getByTestId("scene").getByText("第1場 ・ 夢の観測塔").waitFor();
  const ov = p.getByTestId("effect-overlay"); if (await ov.count()) { await ov.click(); await p.waitForTimeout(400); }
  await p.screenshot({ path: `${out}/ch2-scene1.png`, fullPage: true });
  await p.getByTestId("read-on").click(); await p.getByText("つづきは明日").waitFor();
  await p.getByRole("button", { name: "もどる" }).click();
  // 第1章のタブに切り替えても読める
  await p.getByTestId("chapter-tabs").getByRole("button", { name: "第1章" }).click();
  await p.getByText("第1章「七つ目の星」完").first().waitFor();
  await p.getByTestId("chapter-tabs").getByRole("button", { name: "第2章" }).click();
  // 第2場:そっと覗く
  await s2(p); await p.reload();
  await p.getByRole("button", { name: "そっと覗く" }).click();
  await p.getByTestId("scene-reply").getByText("やさしい触れ方").waitFor();
  // 第3場:鍵を使う → 星の塔がひらく
  await s2(p); await p.reload();
  await p.getByTestId("scene").getByText("第3場 ・ 星の塔の鍵").waitFor();
  await p.getByTestId("read-on").click(); await p.getByText("つづきは明日").waitFor();
  await p.goto(B + "/explore");
  await p.locator('[data-place="tower"]').getByText("探索する").waitFor();
  await p.locator('[data-place="tower"]').screenshot({ path: `${out}/explore-tower.png` });
  await p.goto(B + "/explore/tower"); await p.getByText("崩れた螺旋階段").first().waitFor();
  // 日誌を見つけた状態 → 第4場で道Aを選ぶ
  await s2(p, `ch.world.discoveries = [...ch.world.discoveries, "d-logbook"]`);
  await p.goto(B + "/story"); await p.reload();
  await p.getByTestId("scene").getByText("第4場 ・ 百年前の夜").waitFor();
  await p.waitForTimeout(600); await p.screenshot({ path: `${out}/ch2-seil.png` });
  await p.getByRole("button", { name: "受け入れる" }).click();
  await p.getByTestId("scene-reply").waitFor();
  // 第5場 → 課題(道A)
  await s2(p); await p.reload();
  await p.getByText("【課題】決闘演習場で「星の残響」に勝つ").waitFor();
  await p.getByTestId("read-on").click(); await p.getByRole("button", { name: "もどる" }).click();
  await s2(p); await p.reload();
  await p.getByTestId("story-conds").getByText("星の塔を最奥まで登る").waitFor();
  // 星の残響に勝ち、星の塔を最奥まで登った → 第6場 → 星喰いの影が現れる
  await s2(p, `ch.world.defeated = [...ch.world.defeated, "echo"]`);
  await idb(p, `await put("exploreLog", { id: "tw", at: new Date().toISOString(), date: day(1), place: "tower", steps: [], items: {}, discoveries: [], exp: 0, completed: true });`);
  await p.reload();
  await p.getByTestId("scene").getByText("第6場 ・ 塔の最上階").waitFor();
  await p.getByTestId("read-on").click(); await p.getByText("つづきは明日").waitFor();
  await p.goto(B + "/arena"); await p.getByText("星喰いの影").first().waitFor();
  await p.goto(B + "/arena/starhunger"); await p.getByText("星喰いの影").first().waitFor(); await p.waitForTimeout(600);
  await p.screenshot({ path: `${out}/battle-starhunger.png` });
  // 勝った → 第7場 → 第8場で第2章完
  await s2(p, `ch.world.defeated = [...ch.world.defeated, "starhunger"]`);
  await p.goto(B + "/story"); await p.reload();
  await p.getByTestId("scene").getByText("星喰いの影").first().waitFor();
  await p.getByTestId("read-on").click(); await p.getByRole("button", { name: "もどる" }).click();
  await s2(p); await p.reload();
  await p.getByTestId("scene").getByText("第8場 ・ 名前を呼ぶ").waitFor();
  await p.getByTestId("read-on").click();
  await p.getByText("称号「星継ぎの記憶」").waitFor();
  await p.screenshot({ path: `${out}/ch2-end.png`, fullPage: true });
  const ch = await idb(p, `return await get("characters", "hero");`);
  if (!ch.titles.some((t) => t.name === "星継ぎの記憶")) fail("称号がない");
  if (!ch.world.story2.cleared) fail("第2章が完になっていない");
  // 図鑑と年表
  await p.goto(B + "/encyclopedia"); await p.getByRole("tab", { name: "物語" }).click();
  const n = await p.getByTestId("story-log").locator("li").count(); if (n !== 16) fail(`物語の記録が${n}件`);
  await p.getByTestId("story-log").getByText("第2章 星を降ろした人").waitFor();
  await p.getByRole("tab", { name: "成長年表" }).click(); await p.getByTestId("timeline-story").getByText("第2章").first().waitFor();
  const wide = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  if (wide) fail("スマホ幅で横にはみ出している");
  if (errs.length) fail("エラー: " + errs.join(" | "));
  console.log("OK: 第2章(章タブ・1日1場面・選択・鍵・星の塔・道A課題・星喰いの影・称号)・図鑑・年表・スマホ幅");
  await b.close();
} finally { srv.kill(); }
