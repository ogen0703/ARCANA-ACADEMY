// Phase 7:第3章「星を還す夜」(章タブ・選択・夜空の回廊・道B・星喰い・第一部完・夜空の装い・七つ目の角)→図鑑
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
const out = "e2e/out"; mkdirSync(out, { recursive: true });
const srv = spawn("npx", ["vite", "preview", "--port", "4176", "--strictPort"], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 2500));
const fail = (m) => { console.error("NG:", m); srv.kill(); process.exit(1); };
const B = "http://localhost:4176/#";

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
  ch.diagnosedAt = new Date(Date.now() - 90 * 864e5).toISOString(); ch.history.house = "暁火の寮";
  ch.learnedSpells = ["astral-1", "astral-2", "ancient-1", "ancient-2", "creation-1", "creation-2", "mind-1", "mind-2"];
  ch.world.discoveries = ["d-ceiling", "d-diary", "d-chain", "d-altar", "d-logbook"];
  const done = (n0) => ({ scene: 8, cleared: true, route: "A", choices: {}, lastRead: day(3), log: [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ scene: n, date: day(n0 - n), choice: null })) });
  ch.world.story = done(30); ch.world.story2 = done(10);
  ch.world.creatures = { ...ch.world.creatures, sevenstar: { friend: true, attempts: 1, affection: 85 } }; ch.world.companion = "sevenstar";
  ch.relationships = [...ch.relationships.filter((r) => r.id !== "t-astral"), { id: "t-astral", name: "セレスティン教授", bond: 50 }];
  await put("characters", ch);
  for (let i = 0; i < 52; i++) {
    const g = { exp: 10, stats: {}, personalitySignals: {}, magicSignals: {}, notes: [], engine: "t" };
    await put("experiences", { id: "seed-" + i, date: day(70 - i), source: "manual", category: "learning", title: "勉強" + i, description: "", difficulty: 3, duration: 60, reflection: "", analysisStatus: "applied", proposedGrowth: g, approvedGrowth: g, createdAt: new Date().toISOString(), appliedAt: null });
  }`;
/** 第3章を次の日にする */
const s3 = (p, js = "") => idb(p, `const ch = await get("characters", "hero"); const s = ch.world.story3; s.lastRead = ""; s.log = s.log.map((l) => ({ ...l, date: day(20 - l.scene) })); ${js}; await put("characters", ch);`);
const closeOv = async (p) => { const ov = p.getByTestId("effect-overlay"); if (await ov.count()) { await ov.click(); await p.waitForTimeout(300); } };

try {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  await p.goto(B + "/"); await p.getByTestId("art-scene").waitFor(); await p.waitForTimeout(400);
  await idb(p, seed);
  await p.goto(B + "/explore"); await p.reload();
  await p.locator('[data-place="skypath"]').getByText("第3章の場面3").waitFor({ timeout: 5000 }).catch(() => fail("夜空の回廊が物語の前からひらいている"));
  // 第3章がはじめに出る
  await p.goto(B + "/story"); await closeOv(p);
  await p.getByTestId("chapter-tabs").getByRole("button", { name: "第3章" }).waitFor();
  await p.getByTestId("scene").getByText("第1場 ・ 影の声").waitFor();
  await p.getByTestId("read-on").click(); await p.getByText("つづきは明日").waitFor();
  await p.getByRole("button", { name: "もどる" }).click();
  // 第2場:この子を守りたい(なつき+5)
  await s3(p); await p.reload();
  await p.getByRole("button", { name: "「この子を守りたい」" }).click();
  await p.getByTestId("scene-reply").waitFor();
  // 第3場 → 夜空の回廊がひらく
  await s3(p); await p.reload();
  await p.getByTestId("scene").getByText("第3場 ・ 夜空の回廊").waitFor();
  await p.getByTestId("read-on").click(); await p.getByText("つづきは明日").waitFor();
  await p.goto(B + "/explore"); await p.locator('[data-place="skypath"]').getByText("探索する").waitFor();
  await p.goto(B + "/explore/skypath"); await p.getByText("星の橋").first().waitFor();
  // 影の記憶を見つけた → 第4場 → 第5場で道B
  await s3(p, `ch.world.discoveries = [...ch.world.discoveries, "d-shadowmemory"]`);
  await p.goto(B + "/story"); await p.reload();
  await p.getByTestId("scene").getByText("第4場 ・ 影の記憶").waitFor();
  await p.getByTestId("read-on").click(); await p.getByRole("button", { name: "もどる" }).click();
  await s3(p); await p.reload();
  await p.getByTestId("scene").getByText("第5場 ・ 星の選択").waitFor();
  await p.screenshot({ path: `${out}/ch3-choice.png`, fullPage: true });
  await p.getByRole("button", { name: "光と影を結ぶ" }).click();
  await p.getByTestId("scene-reply").waitFor();
  // 第6場の条件:なつき90と回廊
  await s3(p); await p.reload();
  await p.getByTestId("story-conds").getByText("七つ星の仔のなつき90").waitFor();
  await p.getByTestId("story-conds").getByText("夜空の回廊を最奥まで登る").waitFor();
  await s3(p, `ch.world.creatures.sevenstar.affection = 90`);
  await idb(p, `await put("exploreLog", { id: "sk", at: new Date().toISOString(), date: day(1), place: "skypath", steps: [], items: {}, discoveries: [], exp: 0, completed: true });`);
  await p.reload();
  await p.getByTestId("scene").getByText("第6場 ・ 夜明け前").waitFor();
  await p.getByTestId("read-on").click(); await p.getByText("つづきは明日").waitFor();
  // 星喰い:演習場に現れ、覚醒できる
  await p.goto(B + "/arena"); await p.getByText("星喰い", { exact: false }).first().waitFor();
  await p.goto(B + "/arena/starshadow"); await p.getByTestId("awaken").waitFor(); await p.waitForTimeout(500);
  await p.screenshot({ path: `${out}/battle-starshadow.png` });
  await p.getByTestId("awaken").click(); await p.getByText("星継ぎの覚醒!").first().waitFor();
  // 鎮めた → 第7場 → 第8場
  await s3(p, `ch.world.defeated = [...ch.world.defeated, "starshadow"]`);
  await p.goto(B + "/story"); await p.reload();
  await p.getByTestId("scene").getByText("第7場 ・ 星喰い").waitFor();
  await p.getByTestId("read-on").click(); await p.getByRole("button", { name: "もどる" }).click();
  await s3(p); await p.reload();
  await p.getByTestId("scene").getByText("第8場 ・ 星を還す夜").waitFor();
  await p.getByTestId("read-on").click();
  await p.getByText("第一部「七つ目の星」完。称号「光と影を結ぶ者」").waitFor();
  await p.screenshot({ path: `${out}/ch3-end.png`, fullPage: true });
  const ch = await idb(p, `return await get("characters", "hero");`);
  if (!ch.world.story3.cleared || ch.world.story3.route !== "B") fail("第3章が完になっていない");
  // 夜空の装い・七つ目の角
  await p.goto(B + "/character");
  const ns = p.getByTestId("outfits").getByRole("button", { name: "夜空の装い" });
  if (await ns.isDisabled()) fail("夜空の装いが解放されていない");
  await p.goto(B + "/"); await closeOv(p); await p.getByTestId("seventh-corner").waitFor({ state: "attached" });
  await p.waitForTimeout(800); await p.getByTestId("art-scene").screenshot({ path: `${out}/hall-seventh.png` });
  // 図鑑
  await p.goto(B + "/encyclopedia"); await p.getByRole("tab", { name: "物語" }).click();
  const n = await p.getByTestId("story-log").locator("li").count(); if (n !== 24) fail(`物語の記録が${n}件`);
  await p.getByRole("tab", { name: "実績" }).click(); await p.locator('[data-ach="a-part1"]').getByText("達成").waitFor();
  const wide = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  if (wide) fail("スマホ幅で横にはみ出している");
  if (errs.length) fail("エラー: " + errs.join(" | "));
  console.log("OK: 第3章(章タブ・選択・夜空の回廊・道B・課題・星喰いと覚醒・第一部完・称号)・夜空の装い・七つ目の角・図鑑と実績・スマホ幅");
  await b.close();
} finally { srv.kill(); }
