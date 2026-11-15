// Phase 5c:物語(1日1場面・選択・道B)→七つ星の仔と心を通わせる(覚醒の演出)→第1章完→衣装・図鑑・年表
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
const out = "e2e/out"; mkdirSync(out, { recursive: true });
const srv = spawn("npx", ["vite", "preview", "--port", "4181", "--strictPort"], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 2500));
const fail = (m) => { console.error("NG:", m); srv.kill(); process.exit(1); };
const B = "http://localhost:4181/#";

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
  for (const k of Object.keys(ch.magicAffinity)) ch.magicAffinity[k] = { ...ch.magicAffinity[k], base: 40, value: 45 };
  ch.diagnosedAt = new Date(Date.now() - 40 * 864e5).toISOString(); ch.history.house = "月影の寮";
  ch.learnedSpells = ["astral-1", "ancient-1", "ancient-2"];
  ch.world.discoveries = ["d-ceiling", "d-diary", "d-chain", "d-altar"];
  await put("characters", ch);
  await put("talkLog", { id: "t-milo", at: new Date().toISOString(), date: day(1), npc: "milo", kind: "chat", gain: 1, detail: "" });
  for (let i = 0; i < 15; i++) {
    const g = { exp: 30, stats: {}, personalitySignals: {}, magicSignals: {}, notes: [], engine: "t" };
    await put("experiences", { id: "seed-" + i, date: day(30 - i), source: "manual", category: "sports", title: "練習" + i, description: "", difficulty: 3, duration: 60, reflection: "", analysisStatus: "applied", proposedGrowth: g, approvedGrowth: g, createdAt: new Date().toISOString(), appliedAt: null });
  }`;
const patchStory = (p) => idb(p, `const ch = await get("characters", "hero"); ch.world.story = { ...ch.world.story, lastRead: "" }; await put("characters", ch);`);

try {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  await p.goto(B + "/"); await p.getByTestId("art-scene").waitFor(); await p.waitForTimeout(400);
  await idb(p, seed);
  await p.goto(B + "/academy"); await p.reload();
  await p.getByTestId("story-link").click();
  // 第1場:読みすすめる → 1日1場面
  await p.getByTestId("scene").getByText("第1場 ・ 星の降る夜").waitFor();
  await p.getByTestId("read-on").click();
  await p.getByText("つづきは明日").waitFor();
  await p.getByRole("button", { name: "もどる" }).click();
  await p.getByTestId("story-tomorrow").waitFor();
  // 次の日:第2場で「一緒に調べよう」
  await patchStory(p); await p.reload();
  await p.getByRole("button", { name: "「一緒に調べよう」" }).click();
  await p.getByTestId("scene-reply").getByText("探検隊").waitFor();
  // 第5場まで進めた状態にして、道Bを選ぶ
  await idb(p, `const ch = await get("characters", "hero"); ch.world.story = { ...ch.world.story, scene: 4, lastRead: "", choices: { "2": "together", "3": "wait" }, log: [1, 2, 3, 4].map((n) => ({ scene: n, date: day(10 - n), choice: null })) }; await put("characters", ch);`);
  await p.reload();
  await p.getByTestId("scene").getByText("封印の祭壇").waitFor();
  await p.screenshot({ path: `${out}/story-altar.png`, fullPage: true });
  await p.getByRole("button", { name: "封印を守って、目覚めを待つ" }).click();
  await p.getByTestId("scene-reply").waitFor();
  // 次の日:第6場(道B)→ 課題
  await idb(p, `const ch = await get("characters", "hero"); ch.world.story.lastRead = ""; ch.world.story.log = ch.world.story.log.map((l) => l.scene === 5 ? { ...l, date: day(1) } : l); await put("characters", ch);`);
  await p.reload();
  await p.getByText("【課題】夜の魔法生物保護区を3回歩く").waitFor();
  await p.getByTestId("read-on").click(); await p.getByRole("button", { name: "もどる" }).click();
  await patchStory(p); await p.reload();
  await p.getByTestId("story-conds").getByText("夜の魔法生物保護区を3回歩く").waitFor();
  // 夜の保護区を3回歩いた記録を入れる → 第7場
  await idb(p, `const d = new Date(); d.setHours(23, 0, 0, 0); for (let i = 0; i < 3; i++) await put("sanctuaryLog", { id: "n" + i, at: d.toISOString(), date: day(0), kind: "visit", creature: "starfox", result: "left", actions: ["wait"] });`);
  await p.reload();
  await p.getByTestId("scene").getByText("七つ星の仔").first().waitFor();
  for (const n of ["そっと待つ", "静かに声をかける", "星の光で小さな形を作って見せる"]) await p.getByRole("button", { name: n }).click();
  await p.getByTestId("meet").click();
  await p.getByTestId("effect-overlay").getByText("AWAKENING").waitFor();
  await p.getByTestId("effect-overlay").click();
  // 保護区に七つ星の仔
  await p.goto(B + "/sanctuary"); await p.getByTestId("friends").getByText("七つ星の仔").first().waitFor(); await p.getByTestId("star-lights").waitFor();
  // 次の日:第8場 → 第1章完
  await patchStory(p); await p.goto(B + "/story"); await p.reload();
  await p.getByTestId("scene").getByText("魂を継ぐ者").waitFor();
  await p.getByTestId("read-on").click();
  await p.getByText("第1章「七つ目の星」完。称号").waitFor();
  // 衣装と図鑑・年表
  await p.goto(B + "/character");
  const star = p.getByTestId("outfits").getByRole("button", { name: "星継ぎの装い" });
  if (await star.isDisabled()) fail("星継ぎの装いが解放されていない");
  await star.click(); await p.waitForTimeout(300);
  if ((await star.getAttribute("aria-pressed")) !== "true") fail("衣装を着替えられない");
  await p.goto(B + "/encyclopedia"); await p.getByRole("tab", { name: "物語" }).click();
  const n = await p.getByTestId("story-log").locator("li").count(); if (n !== 8) fail(`物語の記録が${n}件`);
  await p.getByRole("tab", { name: "成長年表" }).click(); await p.getByTestId("timeline-story").first().waitFor();
  const wide = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  if (wide) fail("スマホ幅で横にはみ出している");
  if (errs.length) fail("エラー: " + errs.join(" | "));
  console.log("OK: 物語(1日1場面・選択・道B・課題)・七つ星の仔と覚醒の演出・保護区・第1章完・称号と衣装・図鑑の物語・年表・スマホ幅");
  await b.close();
} finally { srv.kill(); }
