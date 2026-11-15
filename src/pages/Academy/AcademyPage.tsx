import { Link } from "react-router-dom";
import { AREAS } from "../../game/world/areas";
import { Panel } from "../../components/ui";
import { ART } from "../../game/world/art";
import { useImageReady } from "../../components/three/useImageReady";

/** 施設の絵(あれば)。無いあいだは紋章を表示 */
function AreaArt({ id, glyph, open }: { id: string; glyph: string; open: boolean }) {
  const src = ART.areas[id];
  const st = useImageReady(src);
  if (src && st === "ok") return <img src={src} alt="" className="mb-2 aspect-[3/2] w-full rounded-lg object-cover" loading="lazy" />;
  return (
    <div className={`mb-2 grid h-14 place-items-center rounded-lg sm:h-20 ${open ? "bg-[radial-gradient(circle_at_50%_60%,rgba(244,214,140,0.22),rgba(42,46,110,0.35)_60%,transparent)]" : "bg-night-800/60"}`}>
      <span className={`font-serif text-4xl ${open ? "text-gold-300 drop-shadow-[0_0_10px_rgba(244,214,140,0.5)]" : "text-arcane-300/40"}`} aria-hidden="true">{glyph}</span>
    </div>
  );
}

export default function AcademyPage() {
  return (
    <div className="grid gap-4">
      <Panel title="学院と世界の施設">
        <p className="mb-3 text-sm text-arcane-300">魔法文明エルディアの中心、アルカナ学院。今ひらいている施設と、これから開いていく場所。</p>
        <ul className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          {AREAS.map((a) => {
            const body = (
              <>
                <AreaArt id={a.id} glyph={a.glyph} open={a.open} />
                <p className="font-serif text-base text-gold-200 sm:text-lg">{a.name}</p>
                <p className="text-sm text-arcane-300">{a.desc}</p>
                <p className={`mt-2 text-xs ${a.open ? "text-candle" : "text-arcane-300/60"}`}>{a.open ? `${a.action} →` : `🔒 ${a.when}`}</p>
              </>
            );
            return (
              <li key={a.id} data-area={a.id}>
                {a.open && a.to
                  ? <Link to={a.to} className="block h-full rounded-xl border border-gold-500/35 p-3 transition hover:bg-gold-500/10">{body}</Link>
                  : <div className="h-full rounded-xl border border-arcane-500/15 p-3 opacity-75" aria-disabled="true">{body}</div>}
              </li>
            );
          })}
        </ul>
      </Panel>
      <Panel title="学院の中で">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Link to="/lessons" className="rounded-xl border border-gold-400/60 bg-gold-500/10 p-3 hover:bg-gold-500/20"><p className="font-serif text-gold-200">講義棟 ・ 授業</p><p className="text-xs text-arcane-300">6つの講座で呪文を覚える(1日3コマ)</p></Link>
          <Link to="/explore" className="rounded-xl border border-gold-400/60 bg-gold-500/10 p-3 hover:bg-gold-500/20"><p className="font-serif text-gold-200">探索</p><p className="text-xs text-arcane-300">廃神殿と禁書庫(1日2回)</p></Link>
          <Link to="/quests" className="rounded-xl border border-gold-500/30 p-3 hover:bg-gold-500/10"><p className="font-serif text-gold-200">クエスト・称号</p><p className="text-xs text-arcane-300">杖えらび・先生の課題・週替わり</p></Link>
          <Link to="/character" className="rounded-xl border border-gold-500/30 p-3 hover:bg-gold-500/10"><p className="font-serif text-gold-200">キャラクター</p><p className="text-xs text-arcane-300">能力・性格・成長の記録</p></Link>
          <Link to="/magic" className="rounded-xl border border-gold-500/30 p-3 hover:bg-gold-500/10"><p className="font-serif text-gold-200">魔法</p><p className="text-xs text-arcane-300">6つの魔法系統と適性</p></Link>
          <Link to="/settings" className="rounded-xl border border-gold-500/30 p-3 hover:bg-gold-500/10"><p className="font-serif text-gold-200">設定</p><p className="text-xs text-arcane-300">自動受け取り・データの保存</p></Link>
        </div>
      </Panel>
    </div>
  );
}
