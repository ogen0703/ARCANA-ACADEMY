import { useState } from "react";
import { useGame } from "../../stores/game";
import { renameCharacter } from "../../services/storage/repo";
import { levelProgress } from "../../game/growth/engine";
import { MAGIC_KEYS, MAGIC_LABELS, PERSONALITY_KEYS, PERSONALITY_LABELS, STAT_KEYS, STAT_LABELS, type StatKey } from "../../schemas";
import { Bar, HeroSilhouette, Panel, StatRadar } from "../../components/ui";

export default function CharacterPage() {
  const { character: ch, experiences, history, run } = useGame();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(ch?.name ?? "");
  if (!ch) return null;
  const prog = levelProgress(ch);
  const byEvent = new Map<string, typeof history>();
  history.forEach((h) => byEvent.set(h.eventId, [...(byEvent.get(h.eventId) ?? []), h]));
  const timeline = experiences.filter((e) => e.analysisStatus === "applied");

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="プロフィール">
        <div className="flex gap-4">
          <HeroSilhouette className="h-36 shrink-0" />
          <div className="min-w-0 flex-1 space-y-1 text-sm">
            {editing ? (
              <form className="flex gap-2" onSubmit={async (e) => { e.preventDefault(); if (name.trim()) { await run(() => renameCharacter(name)); setEditing(false); } }}>
                <input id="char-name" className="field" value={name} maxLength={30} onChange={(e) => setName(e.target.value)} aria-label="名前" />
                <button className="btn btn-primary">保存</button>
              </form>
            ) : (
              <p className="font-serif text-2xl text-gold-200">{ch.name} <button className="btn-ghost ml-1 rounded-lg px-2 text-xs" onClick={() => { setName(ch.name); setEditing(true); }}>名前を変える</button></p>
            )}
            <p className="num">Lv.{ch.level} ・ 経験値 {ch.experience}(次まで {prog.need - prog.inLevel})</p>
            <dl className="grid grid-cols-[5.5em_1fr] gap-y-1 text-arcane-300">
              <dt>出身</dt><dd className="text-[#e9e4f7]">{ch.history.origin}</dd>
              <dt>所属寮</dt><dd className="text-[#e9e4f7]">{ch.history.house ?? "入学時の診断で決まる"}</dd>
              <dt>魔法の杖</dt><dd className="text-[#e9e4f7]">{ch.history.wand ?? "初期イベントで決まる"}</dd>
              <dt>ローブ</dt><dd className="text-[#e9e4f7]">{ch.appearance.robe}</dd>
              <dt>オーラ</dt><dd className="text-[#e9e4f7]">{ch.appearance.aura}</dd>
            </dl>
          </div>
        </div>
      </Panel>

      <Panel title="基本ステータス">
        <div className="grid items-center gap-4 sm:grid-cols-[auto_1fr]">
          <div className="grid place-items-center"><StatRadar stats={ch.basicStats} size={220} /></div>
          <ul className="space-y-2">
            {STAT_KEYS.map((k) => (
              <li key={k}>
                <div className="flex items-baseline justify-between text-sm"><span title={STAT_LABELS[k].desc}>{STAT_LABELS[k].name}<span className="ml-2 text-[11px] text-arcane-300/70">{STAT_LABELS[k].desc}</span></span><span className="num text-gold-200">{ch.basicStats[k].toFixed(1)}</span></div>
                <Bar value={ch.basicStats[k]} />
              </li>
            ))}
          </ul>
        </div>
      </Panel>

      <Panel title="性格" right={<span className="text-xs text-arcane-300">Phase 3 で形成</span>}>
        <p className="mb-3 text-sm text-arcane-300">性格は1回の行動では決めず、たくさんの経験から少しずつ形づくられます。今は根拠になる経験の数だけを記録しています。</p>
        <ul className="grid gap-2 text-sm sm:grid-cols-2">
          {PERSONALITY_KEYS.map((k) => (
            <li key={k} className="flex items-center justify-between rounded-lg bg-night-800/60 px-3 py-1.5">
              <span>{PERSONALITY_LABELS[k]}</span>
              <span className="num text-xs text-arcane-300">{ch.personality[k].value == null ? `未形成・根拠${ch.personality[k].evidence}件` : ch.personality[k].value}</span>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="魔法適性" right={<span className="text-xs text-arcane-300">初期診断は Phase 3</span>}>
        <ul className="space-y-2 text-sm">
          {MAGIC_KEYS.map((k) => (
            <li key={k} className="flex items-center justify-between gap-3">
              <span>{MAGIC_LABELS[k].name}</span>
              <span className="num text-xs text-arcane-300">{ch.magicAffinity[k].value ?? "未診断"} ・ 兆し {ch.magicAffinity[k].signals.toFixed(1)}</span>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="成長の記録" className="lg:col-span-2">
        {timeline.length === 0 ? <p className="text-sm text-arcane-300">まだありません。経験を登録して承認すると、ここに年表のように残っていきます(消えません)。</p> : (
          <ol className="relative space-y-3 border-l border-gold-500/30 pl-4">
            {timeline.map((e) => {
              const hs = byEvent.get(e.id) ?? [];
              const lv = hs.find((h) => h.kind === "level");
              return (
                <li key={e.id}>
                  <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full bg-gold-400" />
                  <p className="text-xs text-arcane-300">{e.date}</p>
                  <p className="font-serif">{e.title}{lv && <span className="pill ml-2 bg-arcane-500/25 text-arcane-300">Lv.{lv.before}→{lv.after}</span>}</p>
                  <p className="num text-xs text-gold-200/90">
                    {hs.filter((h) => h.kind === "stat").map((h) => `${STAT_LABELS[h.key as StatKey].name} ${h.before.toFixed(1)}→${h.after.toFixed(1)}`).join(" / ")}
                    {e.approvedGrowth && ` / EXP +${e.approvedGrowth.exp}`}
                  </p>
                </li>
              );
            })}
          </ol>
        )}
      </Panel>
    </div>
  );
}
