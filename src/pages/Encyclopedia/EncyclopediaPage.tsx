import { useEffect, useState } from "react";
import { buildReport, periodRange, PERIOD_LABELS, type PeriodKey } from "../../game/report";
import { getMeta, setMeta } from "../../services/storage/repo";
import { buildReportPrompt } from "../../services/ai/bridge";
import AiBridge from "../../components/AiBridge";
import { Bar } from "../../components/ui";
import { MAGIC_LABELS as ML, PERSONALITY_LABELS } from "../../schemas";
import { useGame } from "../../stores/game";
import { MAGIC_KEYS, MAGIC_LABELS, STAT_LABELS, type StatKey } from "../../schemas";
import { CATEGORY_DEFS } from "../../game/growth/rules";
import { Panel } from "../../components/ui";
import { spellById } from "../../game/academy/content";
import { COMPOUNDS } from "../../game/academy/compound";
import { turningPoints } from "../../game/growth/personalityHistory";
import { StoryLog } from "../Story/StoryPage";
import { AchievementBook } from "../Progress/ProgressPages";
import { CHAPTER1 } from "../../game/story/chapter1";
import { CHAPTER2 } from "../../game/story/chapter2";
import { DISCOVERIES, placeById } from "../../game/academy/explore";
import { NPCS, stageOf } from "../../game/academy/npc";
import { CREATURES, SEVENSTAR, sevenstarLights } from "../../game/academy/creatures";
import { recOf } from "../../game/academy/creaturesEngine";
import { materialById } from "../../game/academy/explore";
import { episodesOf, trustOf } from "../../game/academy/npcEngine";
import { Link } from "react-router-dom";

const TABS = [
  { id: "report", label: "成長レポート" },
  { id: "timeline", label: "成長年表" },
  { id: "story", label: "物語" },
  { id: "achievements", label: "実績" },
  { id: "magic", label: "魔法図鑑" },
  { id: "people", label: "人物" },
  { id: "creatures", label: "魔法生物図鑑" },
  { id: "explore", label: "探索記録" },
] as const;
type Tab = (typeof TABS)[number]["id"];

type Comment = { text: string; at: string };
function Report() {
  const { experiences, history } = useGame();
  const [pk, setPk] = useState<PeriodKey>("thisWeek");
  const range = periodRange(pk, new Date());
  const r = buildReport(experiences, history, range.from, range.to);
  const [comment, setComment] = useState<Comment | undefined>();
  useEffect(() => { let alive = true; getMeta<Comment>("report:" + range.id).then((c) => alive && setComment(c)); return () => { alive = false; }; }, [range.id]);
  const maxStat = Math.max(1, ...r.topStats.map(([, v]) => v));
  return (
    <div className="grid gap-4" data-testid="report">
      <div className="flex flex-wrap gap-1">
        {(Object.keys(PERIOD_LABELS) as PeriodKey[]).map((k) => (
          <button key={k} onClick={() => setPk(k)} className={`rounded-lg border px-3 py-1 text-xs ${pk === k ? "border-gold-300 bg-gold-500/20 text-gold-200" : "border-arcane-500/30 text-arcane-300"}`}>{PERIOD_LABELS[k]}</button>
        ))}
        <span className="ml-auto self-center text-[11px] text-arcane-300/70">{range.from} 〜 {range.to}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        {[["経験", `${r.evs.length}件`], ["EXP", `+${r.exp}`], ["レベル", r.levels.length ? `${r.levels[0].before}→${r.levels[r.levels.length - 1].after}` : "—"]].map(([l, v]) => (
          <div key={l} className="rounded-xl bg-night-800/60 p-2"><p className="label">{l}</p><p className="num font-display text-xl text-gold-200">{v}</p></div>
        ))}
      </div>
      <p className="rounded-xl border-l-2 border-gold-500/50 bg-night-800/40 p-3 text-sm">{r.comment}</p>
      {r.evs.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="label mb-1">伸びた能力</p>
            <ul className="space-y-1.5">{r.topStats.map(([k, v]) => <li key={k}><div className="flex justify-between text-sm"><span>{STAT_LABELS[k].name}</span><span className="num text-gold-200">+{v}</span></div><Bar value={v} max={maxStat} /></li>)}</ul>
          </div>
          <div className="space-y-2 text-sm">
            <p className="label">表れた性格の傾向</p>
            <p>{r.topPers.map(([k]) => PERSONALITY_LABELS[k]).join(" ・ ") || "—"}</p>
            <p className="label">強まった魔法の兆し</p>
            <p>{r.topMagic.map(([k]) => ML[k].name).join(" ・ ") || "—"}</p>
          </div>
        </div>
      )}
      {r.evs.length > 0 && (
        <div className="grid gap-2">
          <p className="label">教官の講評(AI)</p>
          {comment && <blockquote className="rounded-xl bg-arcane-500/10 p-3 font-serif text-sm leading-relaxed" data-testid="report-comment">{comment.text}<span className="mt-1 block text-[10px] text-arcane-300/60">{new Date(comment.at).toLocaleDateString("ja-JP")} にもらった講評</span></blockquote>}
          <AiBridge testId="ai-bridge-report" prompt={buildReportPrompt(r.forAi)} replyLabel="AIの講評を貼り付ける" submitLabel="講評を残す"
            onReply={async (t) => { const c = { text: t.trim().slice(0, 1200), at: new Date().toISOString() }; await setMeta("report:" + range.id, c); setComment(c); return "講評を残した"; }} />
          <p className="text-[11px] text-arcane-300/60">AIに渡すのは数字と経験のタイトルだけ(くわしい内容や振り返りは渡しません)。</p>
        </div>
      )}
    </div>
  );
}

function Timeline() {
  const { experiences, history, character } = useGame();
  const storyLog = [...(character?.world.story.log ?? []).map((l) => ({ ...l, ch: 1, scenes: CHAPTER1 })), ...(character?.world.story2.log ?? []).map((l) => ({ ...l, ch: 2, scenes: CHAPTER2 }))];
  const applied = experiences.filter((e) => e.analysisStatus === "applied").sort((a, b) => a.date.localeCompare(b.date));
  if (!applied.length && !storyLog.length) return <p className="text-sm text-arcane-300">まだ記録がありません。経験を承認すると、月ごとの年表になって残ります(消えません)。</p>;
  const levels = history.filter((h) => h.kind === "level");
  const turns = turningPoints(experiences);
  const lvByEvent = new Map(levels.map((h) => [h.eventId, h]));
  const months = new Map<string, typeof applied>();
  applied.forEach((e) => { const m = e.date.slice(0, 7); months.set(m, [...(months.get(m) ?? []), e]); });
  storyLog.forEach((l) => { const m = l.date.slice(0, 7); if (!months.has(m)) months.set(m, []); });
  return (
    <ol className="space-y-5">
      {[...months.entries()].sort((a, b) => a[0].localeCompare(b[0])).reverse().map(([m, evs]) => {
        const exp = evs.reduce((s, e) => s + (e.approvedGrowth?.exp ?? 0), 0);
        const st: Record<string, number> = {};
        evs.forEach((e) => Object.entries(e.approvedGrowth?.stats ?? {}).forEach(([k, v]) => { st[k] = (st[k] ?? 0) + v; }));
        const top = Object.entries(st).sort((a, b) => b[1] - a[1]).slice(0, 3);
        const lvs = evs.map((e) => lvByEvent.get(e.id)).filter(Boolean);
        return (
          <li key={m} className="rounded-xl border border-gold-500/20 bg-night-800/40 p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-display text-lg text-gold-200">{m.replace("-", "年 ")}月</p>
              <p className="num text-xs text-arcane-300">経験 {evs.length}件 ・ EXP +{exp}</p>
            </div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {lvs.map((h) => <span key={h!.id} className="pill num bg-arcane-500/25 text-arcane-300">Lv.{h!.before}→{h!.after}</span>)}
              {top.map(([k, v]) => <span key={k} className="pill num bg-gold-500/15 text-gold-200">{STAT_LABELS[k as StatKey].name} +{Math.round(v * 10) / 10}</span>)}
            </div>
            {storyLog.filter((l) => l.date.startsWith(m)).map((l) => { const sc = l.scenes[l.scene - 1]; return <p key={`st${l.ch}-${l.scene}`} className="mt-1 text-xs text-arcane-300" data-testid="timeline-story">✦ 物語({l.date.slice(5).replace("-", "/")}):第{l.ch}章 第{l.scene}場「{sc.title}」{l.choice && sc.choices ? ` ・ ${sc.choices.find((c) => c.id === l.choice)?.label ?? ""}` : ""}</p>; })}
            {turns.filter((t) => t.date.startsWith(m)).map((t) => <p key={t.date + t.key} className="mt-1 text-xs text-gold-200" data-testid="timeline-turn">✧ 心の転機({t.date.slice(5).replace("-", "/")}):この1か月で{t.label}が +{t.diff}{t.events.length ? `。きっかけ:${t.events.map((e) => e.title).join("、")}` : ""}</p>)}
            <ul className="mt-2 space-y-0.5 text-sm">
              {evs.map((e) => <li key={e.id} className="flex gap-2"><span className="num shrink-0 text-xs text-arcane-300/70">{e.date.slice(5)}</span><span className="truncate">{e.title}</span><span className="ml-auto shrink-0 text-[11px] text-arcane-300/60">{CATEGORY_DEFS[e.category].label}</span></li>)}
            </ul>
          </li>
        );
      })}
    </ol>
  );
}

function MagicBook() {
  const { character: ch } = useGame();
  if (!ch) return null;
  return (
    <div className="grid gap-4">
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {MAGIC_KEYS.map((k) => (
          <li key={k} className="rounded-xl border border-arcane-500/25 p-3">
            <p className="font-serif text-lg text-gold-200">{MAGIC_LABELS[k].name}</p>
            <p className="text-sm text-arcane-300">{MAGIC_LABELS[k].desc}</p>
            <p className="num mt-1 text-xs text-arcane-300/80">適性:{ch.magicAffinity[k].value ?? "未診断"} ・ 経験から見えた兆し {ch.magicAffinity[k].signals.toFixed(1)}</p>
          </li>
        ))}
      </ul>
      <div className="rounded-xl bg-night-800/50 p-3">
        <p className="label mb-1">習得した魔法</p>
        {ch.learnedSpells.length
          ? <ul className="flex flex-wrap gap-1.5">{ch.learnedSpells.map((s) => <li key={s} className="pill bg-gold-500/15 text-gold-200">{spellById(s)?.name ?? s}</li>)}</ul>
          : <p className="text-sm text-arcane-300">まだ覚えた呪文はない。講義棟の授業で覚えられる。</p>}
      </div>
      <div className="rounded-xl bg-night-800/50 p-3" data-testid="compound-book">
        <p className="label mb-1">複合魔法 <span className="num">{ch.world.compounds.length} / {COMPOUNDS.length}</span></p>
        <ul className="flex flex-wrap gap-1.5">{COMPOUNDS.map((c) => <li key={c.id} className={`pill ${ch.world.compounds.includes(c.id) ? "bg-gold-500/15 text-gold-200" : "bg-night-900/60 text-arcane-300/50"}`}>{ch.world.compounds.includes(c.id) ? c.name : "?????"}</li>)}</ul>
        <p className="mt-1 text-[11px] text-arcane-300/70">大図書館の奥の<Link to="/research" className="text-candle">魔法研究室</Link>で見つかる。</p>
      </div>
    </div>
  );
}

function CreatureBook() {
  const { character: ch } = useGame();
  if (!ch) return null;
  return (
    <ul className="grid gap-2 sm:grid-cols-2" data-testid="creature-book">
      {CREATURES.map((c) => {
        const r = recOf(ch, c.id);
        return <li key={c.id} className={`rounded-xl border p-3 ${r.friend ? "border-gold-400/40 bg-gold-500/10" : "border-arcane-500/15"}`}>{r.friend || r.attempts ? <><p className="font-serif text-gold-200">{c.name} <span className="text-[11px] text-arcane-300">{MAGIC_LABELS[c.system].name}</span></p><p className="text-xs">{c.desc}</p><p className="mt-1 text-[11px] text-arcane-300">{r.friend ? `仲間 ・ なつき ${r.affection} ・ 好物:${materialById(c.favorite)?.name}` : `出会った(${r.attempts}回)・まだ仲間ではない`}</p></> : <p className="text-sm text-arcane-300/50">？？？(まだ出会っていない)</p>}</li>;
      })}
      {recOf(ch, SEVENSTAR.id).friend
        ? <li className="rounded-xl border border-gold-300/60 bg-gold-500/10 p-3"><p className="font-serif text-gold-200">{SEVENSTAR.name} <span className="text-[11px] text-arcane-300">物語で出会った</span></p><p className="text-xs">{SEVENSTAR.desc}</p><p className="mt-1 text-[11px] text-arcane-300">仲間 ・ なつき {recOf(ch, SEVENSTAR.id).affection} ・ 体の光 {sevenstarLights(recOf(ch, SEVENSTAR.id).affection)}/7</p></li>
        : <li className="rounded-xl border border-arcane-500/15 p-3"><p className="text-sm text-arcane-300/50">？？？(物語の中で出会う)</p></li>}
    </ul>
  );
}

function PeopleBook() {
  const { character: ch } = useGame();
  if (!ch) return null;
  return (
    <ul className="grid gap-3 sm:grid-cols-2" data-testid="people-book">
      {NPCS.map((n) => {
        const t = trustOf(ch, n.id), eps = episodesOf(ch, n.id);
        return (
          <li key={n.id} className="rounded-xl border border-arcane-500/20 p-3">
            <p className="font-serif text-gold-200">{n.name} <span className="text-[11px] text-arcane-300">{n.role}</span></p>
            <p className="text-xs text-arcane-300">{stageOf(t).name}(信頼 {t})</p>
            {eps.length ? <ul className="mt-1 space-y-1 text-xs">{eps.map((e, i) => <li key={i}>・{e}</li>)}</ul> : <p className="mt-1 text-xs text-arcane-300/50">まだ昔話を聞いていない</p>}
          </li>
        );
      })}
    </ul>
  );
}

function ExploreBook() {
  const { character: ch, explorations } = useGame();
  if (!ch) return null;
  return (
    <div className="grid gap-4" data-testid="explore-book">
      <div>
        <p className="label mb-1">発見(世界の断片) {ch.world.discoveries.length}/{DISCOVERIES.length}</p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {DISCOVERIES.map((d) => {
            const got = ch.world.discoveries.includes(d.id);
            return <li key={d.id} className={`rounded-xl border p-3 ${got ? "border-gold-400/40 bg-gold-500/10" : "border-arcane-500/15"}`}>{got ? <><p className="font-serif text-gold-200">{d.name}</p><p className="text-sm">{d.text}</p></> : <p className="text-sm text-arcane-300/50">？？？(まだ見つけていない)</p>}</li>;
          })}
        </ul>
      </div>
      <div>
        <p className="label mb-1">持ち物</p>
        {ch.inventory.length ? <ul className="flex flex-wrap gap-1.5">{ch.inventory.map((i) => <li key={i.id} className="pill bg-night-800 text-xs">{i.name} ×{i.qty}</li>)}</ul> : <p className="text-sm text-arcane-300">まだない。</p>}
      </div>
      <div>
        <p className="label mb-1">探索の記録</p>
        {explorations.length ? <ul className="space-y-1 text-sm">{explorations.slice(0, 20).map((e) => <li key={e.id} className="flex gap-2"><span className="num text-xs text-arcane-300/70">{e.date.slice(5)}</span><span>{placeById(e.place)?.name}</span><span className="text-xs text-arcane-300">{e.completed ? "最奥まで" : `${e.steps.length}部屋`}</span>{e.discoveries.length > 0 && <span className="text-xs text-gold-200">発見 {e.discoveries.length}</span>}</li>)}</ul> : <p className="text-sm text-arcane-300">まだ探索していない。<Link to="/explore" className="text-candle">探索へ</Link></p>}
      </div>
    </div>
  );
}

export default function EncyclopediaPage() {
  const [tab, setTab] = useState<Tab>("report");
  return (
    <Panel title="図鑑 ・ 星辰の大図書館">
      <div className="-mx-1 mb-4 flex gap-1 overflow-x-auto px-1" role="tablist" aria-label="図鑑の種類">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-sm ${tab === t.id ? "bg-gold-500/20 text-gold-200" : "text-arcane-300 hover:text-gold-200"}`}>{t.label}</button>
        ))}
      </div>
      <div role="tabpanel">
        {tab === "report" && <Report />}
        {tab === "timeline" && <Timeline />}
        {tab === "story" && <StoryLog />}
        {tab === "achievements" && <AchievementBook />}
        {tab === "magic" && <MagicBook />}
        {tab === "people" && <PeopleBook />}
        {tab === "creatures" && <CreatureBook />}
        {tab === "explore" && <ExploreBook />}
      </div>
    </Panel>
  );
}
