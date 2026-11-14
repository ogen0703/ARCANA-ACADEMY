/** 世界の主要エリア(GDD 3章)。説明は GDD の記載のみ。機能の開く時期は GDD 15章の開発優先順位に合わせる */
export type Area = { id: string; name: string; desc: string; glyph: string; open: boolean; to?: string; action?: string; when?: string };
export const AREAS: Area[] = [
  { id: "academy", name: "アルカナ学院", desc: "主人公の生活拠点", glyph: "♜", open: true, to: "/", action: "ホームへ" },
  { id: "library", name: "星辰の大図書館", desc: "魔法や歴史の研究", glyph: "✧", open: true, to: "/encyclopedia", action: "図鑑をひらく" },
  { id: "potions", name: "魔法薬研究棟", desc: "魔法薬の調合", glyph: "⚗", open: false, when: "授業・クエスト(Phase 4)とともに開く" },
  { id: "archive", name: "禁書庫", desc: "封印された古代魔法の研究", glyph: "✠", open: false, when: "探索(Phase 4)とともに開く" },
  { id: "sanctuary", name: "魔法生物保護区", desc: "魔法生物との出会いと育成", glyph: "❦", open: false, when: "魔法生物(Phase 5)とともに開く" },
  { id: "arena", name: "決闘演習場", desc: "魔法戦闘", glyph: "⚔", open: false, when: "戦闘(Phase 4)とともに開く" },
  { id: "ruins", name: "古代遺跡", desc: "探索・謎解き・物語進行", glyph: "⌘", open: false, when: "探索(Phase 4)とともに開く" },
  { id: "garden", name: "星影の庭園", desc: "精神・魔力の回復", glyph: "❀", open: false, when: "開く時期は未定" },
];
