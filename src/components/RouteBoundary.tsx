import { Component, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

/** 画面の中でエラーが起きても、その画面だけを「うまく表示できない」にして、ほかの画面とメニューは使えるままにする */
class Boundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error) { console.error("[ARCANA] 画面の表示エラー", error); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <section className="panel p-5" role="alert" data-testid="route-error">
        <h2 className="panel-title">この画面をうまく表示できませんでした</h2>
        <p className="mt-2 text-sm text-arcane-300">データは消えていません。下のメニューからほかの画面へ移れます。もう一度ためすときは、読み込み直してください。</p>
        <p className="mt-2 break-all text-[11px] text-arcane-300/60">{this.state.error.message}</p>
        <button className="btn btn-primary mt-3" onClick={() => location.reload()}>読み込み直す</button>
      </section>
    );
  }
}
/** 画面が変わるたびに作り直す(前の画面のエラーを引きずらない) */
export default function RouteBoundary({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return <Boundary key={pathname}>{children}</Boundary>;
}
