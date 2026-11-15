import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useGame } from "../../stores/game";
import { npcById, stageOf } from "../../game/academy/npc";
import { canReceive, canResonate, episodesOf, topicIndex, trustOf } from "../../game/academy/npcEngine";
import { materialById } from "../../game/academy/explore";
import { giveGift, receiveFrom, talkTo } from "../../services/storage/repo";
import { P } from "../../game/growth/rules";
import { todayLocal } from "../../utils/id";
import { Bar, Panel } from "../../components/ui";
import { ART } from "../../game/world/art";

export default function NpcPage() {
  const { id = "" } = useParams();
  const { character: ch, talks, run } = useGame();
  const [reply, setReply] = useState<{ text: string; gain: number; hit: boolean; episodes: number[]; titled: boolean } | null>(null);
  const [msg, setMsg] = useState("");
  const [item, setItem] = useState("");
  const [imgOk, setImgOk] = useState(true);
  const n = npcById(id);
  if (!ch) return null;
  if (!n) return <Panel title="談話室"><p className="text-sm">その人はいません。<Link to="/lounge" className="text-candle">談話室へ</Link></p></Panel>;
  const today = todayLocal();
  const mine = talks.filter((t) => t.date === today && t.npc === n.id);
  const used = mine.filter((t) => t.kind === "talk" || t.kind === "chat").length;
  const gifted = mine.some((t) => t.kind === "gift"), received = mine.some((t) => t.kind === "receive");
  const t = trustOf(ch, n.id);
  const topic = n.topics[topicIndex(ch, n)];
  const act = async (fn: () => Promise<unknown>) => { setMsg(""); try { await run(fn); } catch (e) { setMsg(e instanceof Error ? e.message : "うまくいきませんでした"); } };
  const doTalk = (choice: number | null) => act(async () => { const r = await talkTo(n.id, choice); setReply({ text: r.reply, gain: r.gain, hit: r.hit, episodes: r.episodes, titled: r.titled }); });
  const eps = episodesOf(ch, n.id);

  return (
    <div className="mx-auto grid max-w-xl gap-4">
      <div className="panel relative flex items-end gap-3 overflow-hidden p-3">
        {imgOk && <img src={ART.npc(n.id)} alt="" onError={() => setImgOk(false)} className="h-48 w-auto shrink-0 object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)] sm:h-60" />}
        <div className="min-w-0 flex-1">
          <p className="font-serif text-xl text-gold-200">{n.name}</p>
          <p className="text-xs text-arcane-300">{n.role} ・ {n.persona}</p>
          <div className="mt-2 flex items-center gap-2 text-xs"><span>{stageOf(t).name}</span><div className="flex-1"><Bar value={t} max={100} /></div><span className="num" data-testid="trust">{t}</span></div>
          <p className="mt-1 text-[11px] text-arcane-300/80">響く答え:{n.likes} ・ 好きな贈り物:{materialById(n.gift)?.name}</p>
        </div>
      </div>

      <Panel title="話す" right={<span className="num text-xs text-arcane-300" data-testid="talks-used">今日 {used}/{P.talksPerDay}</span>}>
        {reply ? (
          <div data-testid="reply">
            <p className="font-serif text-lg leading-relaxed">{n.name.split("・")[0]}「{reply.text.replace(/^「|」$/g, "")}」</p>
            <p className="mt-2 text-xs text-gold-200">信頼 +{reply.gain}{reply.hit ? "(響いた)" : ""}</p>
            {reply.episodes.length > 0 && <p className="mt-1 text-sm text-gold-200">✧ 新しい昔話を聞けるようになった</p>}
            {reply.titled && <p className="mt-1 text-sm text-gold-200">✧ 称号「{n.title}」</p>}
            <button className="btn mt-3" onClick={() => setReply(null)}>もどる</button>
          </div>
        ) : used >= P.talksPerDay ? <p className="text-sm text-arcane-300">今日はたくさん話した。また明日。</p>
          : used === 0 ? (
            <div>
              <p className="font-serif text-lg">{n.name.split("・")[0]}「{topic.line}」</p>
              <ul className="mt-3 grid gap-2">
                {topic.choices.map((c2, i) => <li key={i}><button className="w-full rounded-xl border border-arcane-500/30 px-3 py-2 text-left text-sm hover:border-gold-400" onClick={() => doTalk(i)}>{c2.text}</button></li>)}
                {canResonate(ch) && <li><button className="w-full rounded-xl border border-gold-400/50 bg-gold-500/10 px-3 py-2 text-left text-sm" onClick={() => doTalk(3)}>✧ 共鳴の声で、気持ちを汲んで返す</button></li>}
              </ul>
            </div>
          ) : (
            <div>
              <p className="text-sm text-arcane-300">今日の話題はもう話した。少しだけ声をかけてみる?</p>
              <button className="btn btn-primary mt-2" onClick={() => doTalk(null)}>ひとこと話す(信頼 +1)</button>
            </div>
          )}
        {msg && <p className="mt-2 text-sm text-candle">{msg}</p>}
      </Panel>

      <Panel title="贈り物">
        {gifted ? <p className="text-sm text-arcane-300">今日はもう贈り物をした。</p> : ch.inventory.length === 0 ? <p className="text-sm text-arcane-300">持ち物がない。素材は探索や演習で手に入る。</p> : (
          <div className="flex flex-wrap items-center gap-2">
            <select className="field max-w-[14em]" value={item} onChange={(e) => setItem(e.target.value)} aria-label="贈る素材">
              <option value="">素材をえらぶ</option>
              {ch.inventory.map((i) => <option key={i.id} value={i.id}>{i.name} ×{i.qty}{i.id === n.gift ? "(好物)" : ""}</option>)}
            </select>
            <button className="btn" disabled={!item} onClick={() => act(async () => { const r = await giveGift(n.id, item); setItem(""); setMsg(r.liked ? `とても喜んでくれた(信頼 +${r.gain})` : `受け取ってくれた(信頼 +${r.gain})`); })}>贈る</button>
          </div>
        )}
        {n.kind === "classmate" && (canReceive(ch, n.id)
          ? (received ? <p className="mt-2 text-xs text-arcane-300">今日はもうお裾分けをもらった。</p>
            : <button className="btn mt-2" onClick={() => act(async () => { const r = await receiveFrom(n.id); setMsg(`「${materialById(r.item)?.name}」をお裾分けしてもらった`); })}>お裾分けをもらう({materialById(n.gift)?.name})</button>)
          : <p className="mt-2 text-[11px] text-arcane-300/70">信頼40になると、1日1回お裾分けをくれる。</p>)}
        {n.kind === "teacher" && <p className="mt-2 text-[11px] text-arcane-300/70">{t >= P.trustLessonStage ? `信頼${P.trustLessonStage}以上:この講座の熟練度が${P.trustLessonMult}倍で伸びる` : `信頼${P.trustLessonStage}になると、この講座の熟練度が${P.trustLessonMult}倍で伸びる`}</p>}
      </Panel>

      <Panel title="昔話">
        {eps.length ? <ol className="space-y-2 text-sm" data-testid="episodes">{eps.map((e, i) => <li key={i} className="rounded-lg bg-night-800/60 p-2 font-serif leading-relaxed">{e}</li>)}</ol> : <p className="text-sm text-arcane-300">信頼20で、昔話を聞かせてくれる。</p>}
      </Panel>
    </div>
  );
}
