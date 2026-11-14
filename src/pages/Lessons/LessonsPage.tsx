import { Link } from "react-router-dom";
import { useGame } from "../../stores/game";
import { COURSES, UNITS } from "../../game/academy/content";
import { nextUnit, proficiencyOf, unitCounts } from "../../game/academy/engine";
import { P } from "../../game/growth/rules";
import { MAGIC_KEYS, MAGIC_LABELS } from "../../schemas";
import { todayLocal } from "../../utils/id";
import { Bar, Panel } from "../../components/ui";

/** 講義棟:6つの講座。1日3コマまで */
export default function LessonsPage() {
  const { character: ch, lessons } = useGame();
  if (!ch) return null;
  const today = todayLocal();
  const used = lessons.filter((l) => l.date === today).length;
  const left = Math.max(0, P.lessonsPerDay - used);
  return (
    <div className="grid gap-4">
      <Panel title="講義棟 ・ 授業" right={<span className="num text-sm text-gold-200" data-testid="lessons-left">今日あと {left} コマ</span>}>
        <p className="mb-3 text-sm text-arcane-300">先生の講義を聞いて問いに答えると、講座の熟練度が上がり、呪文を覚えられる。授業では基本ステータスは上がらない(伸びるのは現実の経験だけ)。</p>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MAGIC_KEYS.map((k) => {
            const c = COURSES[k], prof = proficiencyOf(ch, k), n = nextUnit(ch, k), done = unitCounts(ch, k).filter((x) => x > 0).length;
            return (
              <li key={k} data-course={k}>
                <Link to={`/lessons/${k}`} className="block h-full rounded-xl border border-gold-500/30 p-3 transition hover:bg-gold-500/10">
                  <div className="flex items-baseline justify-between"><p className="font-serif text-lg text-gold-200">{c.name}</p><span className="text-[11px] text-arcane-300">{MAGIC_LABELS[k].name}</span></div>
                  <p className="text-xs text-arcane-300">{c.teacher.name} {c.teacher.title}</p>
                  <div className="mt-2 flex justify-between text-xs"><span>熟練度</span><span className="num text-gold-200">{prof}</span></div>
                  <Bar value={prof} />
                  <p className="mt-2 text-xs text-candle">{n == null ? `全${UNITS[k].length}単元修了 ・ 復習できる` : `次:単元${n + 1}「${UNITS[k][n].title}」`} <span className="text-arcane-300/60">({done}/{UNITS[k].length})</span></p>
                </Link>
              </li>
            );
          })}
        </ul>
      </Panel>
    </div>
  );
}
