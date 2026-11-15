import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useGame } from "../../stores/game";
import { CHAPTER1, ROUTES, type Scene, type StoryState } from "../../game/story/chapter1";
import { CHAPTER2, ROUTES2 } from "../../game/story/chapter2";
import { CHAPTER3, ROUTES3 } from "../../game/story/chapter3";
import { SEVENSTAR_APPROACHES, nextScene, nextScene2, nextScene3, type StoryCtx } from "../../game/story/engine";
import { meetStar, readStory, readStory2, readStory3, storyCtx } from "../../services/storage/repo";
import { ART } from "../../game/world/art";
import { Panel } from "../../components/ui";
import FallbackImg from "../../components/FallbackImg";

const bgOf = (b: Scene["bg"]) => b === "hall-night" ? [ART.hall.night] : b === "library" ? [ART.areas.library] : b === "temple" ? [ART.place("temple")] : b === "archive" ? [ART.place("archive")] : b === "altar" ? [ART.altar, ART.place("temple")] : b === "sanctuary" ? [ART.sanctuary] : b === "tower" ? [ART.place("tower"), ART.place("archive")] : b === "skypath" ? [ART.place("skypath"), ART.place("tower")] : b === "sky" ? [ART.sky, ART.hall.night] : [ART.arena];
type Chap = 1 | 2 | 3;
const CHAPTERS = { 1: { name: "七つ目の星", scenes: CHAPTER1 }, 2: { name: "星を降ろした人", scenes: CHAPTER2 }, 3: { name: "星を還す夜", scenes: CHAPTER3 } } as const;
/** 第2章でセイルが姿を見せる場面 */
const SEIL_SCENES = [1, 4, 8];

/** 場面の一枚(背景の絵と文章) */
export function SceneView({ scene, lines, children, seil }: { scene: Scene; lines: string[]; children?: React.ReactNode; seil?: boolean }) {
  return (
    <div className="panel overflow-hidden" data-testid="scene">
      <div className="relative h-44 sm:h-56">
        <FallbackImg srcs={bgOf(scene.bg)} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-night-950 via-night-950/30 to-transparent" />
        {seil && <FallbackImg srcs={[ART.seil]} className="absolute bottom-0 right-3 h-[95%] w-auto object-contain opacity-90 drop-shadow-[0_0_18px_rgba(185,205,245,0.45)]" alt="セイル・アーデン" />}
        <p className="absolute bottom-2 left-4 font-serif text-xl text-gold-200 drop-shadow">第{scene.no}場 ・ {scene.title}</p>
      </div>
      <div className="space-y-3 p-4 font-serif text-[15px] leading-relaxed text-[#ece6fb]">
        {lines.map((l, i) => <p key={i} className={l.startsWith("【課題】") ? "rounded-lg bg-gold-500/10 px-3 py-2 font-sans text-sm text-gold-200" : ""}>{l}</p>)}
        {children}
      </div>
    </div>
  );
}

export default function StoryPage() {
  const { character: ch, run } = useGame();
  const [ctx, setCtx] = useState<StoryCtx | null>(null);
  const [done, setDone] = useState<{ scene: Scene; reply: string; lines: string[] } | null>(null);
  const [acts, setActs] = useState<string[]>([]);
  const [met, setMet] = useState<{ friend: boolean } | null>(null);
  const [err, setErr] = useState("");
  const [chap, setChap] = useState<Chap | null>(null);
  useEffect(() => { storyCtx().then(setCtx).catch(() => setCtx(null)); }, [ch?.updatedAt]);
  if (!ch || !ctx) return null;
  const c2open = ch.world.story.cleared, c3open = ch.world.story2.cleared;
  const opened: Chap[] = c3open ? [1, 2, 3] : c2open ? [1, 2] : [1];
  const cur: Chap = chap ?? opened[opened.length - 1];
  const s = cur === 3 ? ch.world.story3 : cur === 2 ? ch.world.story2 : ch.world.story, nx = cur === 3 ? nextScene3(ch, ctx) : cur === 2 ? nextScene2(ch, ctx) : nextScene(ch, ctx);
  const total = CHAPTERS[cur].scenes.length;
  const routeName = s.route ? (cur === 3 ? ROUTES3[s.route].label : cur === 2 ? ROUTES2[s.route].label : ROUTES[s.route].label) : "";
  const read = async (choice: string | null) => {
    setErr("");
    try {
      const sc = nx.scene!; const lines = sc.lines(s, ch.name); setChap(cur); // 読み終えて章が変わっても、読んだ章のまま
      let r: { reply: string } | null = null; await run(async () => { r = cur === 3 ? await readStory3(choice) : cur === 2 ? await readStory2(choice) : await readStory(choice); });
      setDone({ scene: sc, reply: r!.reply, lines });
    } catch (e) { setErr(e instanceof Error ? e.message : "うまくいきませんでした"); }
  };
  const meet = async () => {
    setErr("");
    try {
      let r: Awaited<ReturnType<typeof meetStar>> | null = null; await run(async () => { r = await meetStar(acts); });
      setMet({ friend: r!.friend }); setActs([]);
      if (r!.friend) useGame.setState((g) => ({ burst: g.burst + 1, effect: { id: Date.now(), kind: "awaken", title: "星継ぎの覚醒", stats: {}, exp: 0, levelFrom: ch.level, levelTo: ch.level } }));
    } catch (e) { setErr(e instanceof Error ? e.message : "うまくいきませんでした"); }
  };

  return (
    <div className="mx-auto grid max-w-2xl gap-4">
      {c2open && (
        <div className="flex gap-2" data-testid="chapter-tabs">
          {opened.map((n) => <button key={n} className={`pill px-3 py-1 text-sm ${cur === n ? "bg-gold-500/25 text-gold-200" : "bg-night-800/60 text-arcane-300"}`} onClick={() => { setChap(n); setDone(null); setErr(""); }}>第{n}章</button>)}
        </div>
      )}
      <div className="panel p-4">
        <p className="font-display text-xs tracking-[0.3em] text-gold-300">CHAPTER {cur}</p>
        <p className="font-serif text-2xl text-gold-200">{CHAPTERS[cur].name}</p>
        <p className="num text-xs text-arcane-300" data-testid="story-progress">{s.cleared ? "完" : `${s.scene} / ${total} 場面`}{routeName ? ` ・ 選んだ道:${routeName}` : ""}</p>
      </div>

      {done ? (
        <SceneView scene={done.scene} lines={done.lines} seil={cur === 2 && SEIL_SCENES.includes(done.scene.no)}>
          {done.reply && <p className="rounded-lg border border-gold-400/30 px-3 py-2 text-gold-200" data-testid="scene-reply">{done.reply}</p>}
          <p className="font-sans text-xs text-arcane-300">{done.scene.no === 8 ? (cur === 3 ? `第3章「星を還す夜」完。第一部「七つ目の星」完。称号「${ch.world.story3.route ? ROUTES3[ch.world.story3.route].title : ""}」と「夜空の装い」を手に入れた。` : cur === 2 ? `第2章「星を降ろした人」完。称号「${ch.world.story2.route ? ROUTES2[ch.world.story2.route].title : ""}」を手に入れた。` : "第1章「七つ目の星」完。称号と「星継ぎの装い」を手に入れた。") : "つづきは明日(物語は1日1場面)。"}</p>
          <button className="btn" onClick={() => setDone(null)}>もどる</button>
        </SceneView>
      ) : nx.scene && nx.open ? (
        cur === 1 && nx.scene.no === 7 ? (
          <SceneView scene={nx.scene} lines={nx.scene.lines(s, ch.name)}>
            {met && !met.friend ? <p className="text-sm text-candle" data-testid="meet-result">仔は祭壇の光の中へ戻ってしまった。明日、また会える(前よりも近く)。</p> : (
              <>
                <p className="font-sans text-xs text-arcane-300">近づき方を3つまで選ぶ(この子は「{ch.world.story.route ? ROUTES[ch.world.story.route].mood : ""}」)</p>
                <div className="flex flex-wrap gap-2 font-sans">
                  {SEVENSTAR_APPROACHES.filter((a) => a.id !== "spell:astral-1" || ch.learnedSpells.includes("astral-1")).map((a) => <button key={a.id} className="btn px-3 py-1.5 text-sm" disabled={acts.length >= 3} onClick={() => setActs([...acts, a.id])}>{a.label}</button>)}
                </div>
                {acts.length > 0 && <p className="font-sans text-xs">選んだ順:{acts.map((a) => SEVENSTAR_APPROACHES.find((x) => x.id === a)!.label).join(" → ")} <button className="text-candle" onClick={() => setActs([])}>やり直す</button></p>}
                <button className="btn btn-primary" data-testid="meet" disabled={!acts.length} onClick={meet}>心を通わせる</button>
              </>
            )}
          </SceneView>
        ) : (
          <SceneView scene={nx.scene} lines={nx.scene.lines(s, ch.name)} seil={cur === 2 && SEIL_SCENES.includes(nx.scene.no)}>
            {nx.scene.choices ? (
              <ul className="grid gap-2 font-sans">{nx.scene.choices.map((c) => <li key={c.id}><button className="w-full rounded-xl border border-gold-500/40 px-3 py-2 text-left hover:bg-gold-500/10" onClick={() => read(c.id)}>{c.label}</button></li>)}</ul>
            ) : <button className="btn btn-primary" data-testid="read-on" onClick={() => read(null)}>読みすすめる</button>}
          </SceneView>
        )
      ) : nx.scene ? (
        <Panel title={`次の場面:第${nx.scene.no}場 ${nx.scene.title}`}>
          {nx.readToday ? <p className="text-sm text-candle" data-testid="story-tomorrow">今日はもう1場面読んだ。つづきは明日。</p> : (
            <>
              <p className="mb-2 text-sm text-arcane-300">ひらくには:</p>
              <ul className="grid gap-1 text-sm" data-testid="story-conds">{nx.conds.map((c) => <li key={c.label} className={c.met ? "text-gold-200" : ""}>{c.met ? "✓" : "・"} {c.label}{c.now ? `(いま ${c.now})` : ""}</li>)}</ul>
            </>
          )}
        </Panel>
      ) : cur === 3 ? (
        <Panel title="第一部「七つ目の星」完">
          <p className="text-sm">七つ目の星の行き先を、自分で選んだ。大広間の七芒星の七つ目の角は、これからずっと灯っている。第二部は、これから。</p>
          <p className="mt-1 text-xs text-arcane-300">キャラクター画面で「夜空の装い」に着替えられる。</p>
        </Panel>
      ) : cur === 2 ? (
        <Panel title="第2章「星を降ろした人」完">
          <p className="text-sm">百年前の魔法使いセイル・アーデンの名前を呼んだ。上の「第3章」から、つづきが読める。</p>
        </Panel>
      ) : (
        <Panel title="第1章「七つ目の星」完">
          <p className="text-sm">七つ星の仔と出会い、自分が「魂を継ぐ者」だと知った。上の「第2章」から、つづきが読める。</p>
          <p className="mt-1 text-xs text-arcane-300">キャラクター画面で「星継ぎの装い」に着替えられる。</p>
        </Panel>
      )}
      {err && <p className="text-sm text-candle">{err}</p>}

      <Panel title="これまでの物語">
        <StoryLog chapter={cur} />
      </Panel>
    </div>
  );
}

/** 読んだ場面と選んだ答え(図鑑の「物語」タブでも使う。chapter を省くと全章) */
export function StoryLog({ chapter }: { chapter?: Chap }) {
  const { character: ch } = useGame();
  const [open, setOpen] = useState<string | null>(null);
  if (!ch) return null;
  const chs = ([[1, ch.world.story, CHAPTER1, "七つ目の星"], [2, ch.world.story2, CHAPTER2, "星を降ろした人"], [3, ch.world.story3, CHAPTER3, "星を還す夜"]] as [Chap, StoryState, Scene[], string][]).filter(([n, st]) => (chapter ? n === chapter : st.log.length > 0));
  if (!chs.some(([, st]) => st.log.length)) return <p className="text-sm text-arcane-300">まだ読んだ場面はない。<Link to="/story" className="text-candle">物語へ</Link></p>;
  return (
    <div className="grid gap-3" data-testid="story-log">
      {chs.map(([n, st, scenes, name]) => (
        <div key={n}>
          {!chapter && <p className="label mb-1">第{n}章 {name}</p>}
          <ol className="grid gap-2">
            {st.log.map((l) => {
              const sc = scenes[l.scene - 1]; const pick = sc.choices?.find((c) => c.id === l.choice); const k = `${n}-${l.scene}`;
              return (
                <li key={k} className="rounded-xl border border-arcane-500/20 px-3 py-2">
                  <button className="w-full text-left" onClick={() => setOpen(open === k ? null : k)}>
                    <span className="num text-xs text-arcane-300">{l.date.slice(5).replace("-", "/")}</span> <span className="font-serif text-gold-200">第{sc.no}場 {sc.title}</span>
                    {pick && <span className="block text-xs text-arcane-300">選んだ答え:{pick.label}</span>}
                  </button>
                  {open === k && <div className="mt-2 space-y-2 font-serif text-sm leading-relaxed">{sc.lines(st, ch.name).map((t, i) => <p key={i}>{t}</p>)}{pick && <p className="text-gold-200">{pick.reply}</p>}</div>}
                </li>
              );
            })}
          </ol>
        </div>
      ))}
    </div>
  );
}
