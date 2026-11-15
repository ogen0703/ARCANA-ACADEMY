import { useEffect } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import { useGame } from "../stores/game";
import HomePage from "../pages/Home/HomePage";
import CharacterPage from "../pages/Character/CharacterPage";
import ExperiencePage from "../pages/Experience/ExperiencePage";
import MagicPage from "../pages/Magic/MagicPage";
import SettingsPage from "../pages/Settings/SettingsPage";
import AcademyPage from "../pages/Academy/AcademyPage";
import EncyclopediaPage from "../pages/Encyclopedia/EncyclopediaPage";
import EffectOverlay from "../components/EffectOverlay";
import DiagnosisPage from "../pages/Diagnosis/DiagnosisPage";
import LessonsPage from "../pages/Lessons/LessonsPage";
import LessonPage from "../pages/Lessons/LessonPage";
import ExplorePage from "../pages/Explore/ExplorePage";
import ExploreRunPage from "../pages/Explore/ExploreRunPage";
import QuestsPage from "../pages/Quests/QuestsPage";

// GDD 12章の画面構成。スマホの下のメニューは5つまで(魔法・設定は学院から行ける)
const NAV = [
  { to: "/", label: "ホーム", icon: "✦", mobile: true },
  { to: "/character", label: "キャラクター", icon: "♜", mobile: true },
  { to: "/experience", label: "経験登録", icon: "✎", mobile: true },
  { to: "/magic", label: "魔法", icon: "✧", mobile: false },
  { to: "/academy", label: "学院", icon: "⌂", mobile: true },
  { to: "/encyclopedia", label: "図鑑", icon: "❖", mobile: true },
  { to: "/settings", label: "設定", icon: "⚙", mobile: false },
];

export default function App() {
  const { ready, error, load, pullInbox } = useGame();
  useEffect(() => { load().then(() => pullInbox()); }, [load, pullInbox]);
  // アプリに戻ってきたときも確認する(30分に1回まで)
  useEffect(() => {
    let last = Date.now();
    const onVis = () => { if (document.visibilityState === "visible" && Date.now() - last > 30 * 60 * 1000) { last = Date.now(); pullInbox(); } };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [pullInbox]);
  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col" style={{ paddingTop: "env(safe-area-inset-top)", paddingLeft: "max(16px, env(safe-area-inset-left))", paddingRight: "max(16px, env(safe-area-inset-right))" }}>
      <header className="flex items-center justify-between py-4">
        <div className="flex items-baseline gap-3">
          <span className="font-display text-xl tracking-[0.25em] text-gold-300 sm:text-2xl">ARCANA ACADEMY</span>
          <span className="hidden text-xs text-arcane-300/70 sm:inline">失われた星と、魂を継ぐ魔法使い</span>
        </div>
        <nav className="hidden gap-1 lg:flex" aria-label="メニュー">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end className={({ isActive }) => `rounded-lg px-3 py-1.5 text-sm ${isActive ? "bg-gold-500/15 text-gold-200" : "text-arcane-300 hover:text-gold-200"}`}>{n.label}</NavLink>
          ))}
        </nav>
        <NavLink to="/settings" className="rounded-lg px-2 py-1 text-lg text-arcane-300 lg:hidden" aria-label="設定">⚙</NavLink>
      </header>
      <main className="flex-1 pb-28 lg:pb-10">
        {!ready ? <p className="py-20 text-center text-arcane-300">学院の扉をひらいています…</p>
          : error ? <p className="py-20 text-center text-candle">データを読み込めませんでした:{error}</p>
            : (
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/character" element={<CharacterPage />} />
                <Route path="/experience" element={<ExperiencePage />} />
                <Route path="/magic" element={<MagicPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/academy" element={<AcademyPage />} />
                <Route path="/diagnosis" element={<DiagnosisPage />} />
                <Route path="/lessons" element={<LessonsPage />} />
                <Route path="/lessons/:course" element={<LessonPage />} />
                <Route path="/explore" element={<ExplorePage />} />
                <Route path="/explore/:place" element={<ExploreRunPage />} />
                <Route path="/quests" element={<QuestsPage />} />
                <Route path="/encyclopedia" element={<EncyclopediaPage />} />
                <Route path="*" element={<HomePage />} />
              </Routes>
            )}
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-gold-500/20 bg-night-950/95 backdrop-blur lg:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }} aria-label="メニュー">
        <div className="mx-auto grid max-w-md grid-cols-5">
          {NAV.filter((n) => n.mobile).map((n) => (
            <NavLink key={n.to} to={n.to} end className={({ isActive }) => `flex flex-col items-center gap-0.5 py-2 text-[11px] ${isActive ? "text-gold-300" : "text-arcane-300/70"}`}>
              <span className="text-lg leading-none" aria-hidden="true">{n.icon}</span>{n.label}
            </NavLink>
          ))}
        </div>
      </nav>
      <EffectOverlay />
    </div>
  );
}
