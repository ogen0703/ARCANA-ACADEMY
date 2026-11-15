/**
 * 探索とクエストの中身(世界設定書 Phase 4b でげんたが承認:https://claude.ai/artifact/Bhi2vMR5LAqqLXmZg1pJ9J)。
 */
import type { MagicKey } from "../../schemas";

export type Material = { id: string; name: string; use: string };
export const MATERIALS: Material[] = [
  { id: "stardust", name: "星砂", use: "星辰系の魔法薬(予定)" },
  { id: "glowmoss", name: "光る苔", use: "癒やしの魔法薬(予定)" },
  { id: "starshard", name: "星の欠片", use: "杖や装飾品の錬成" },
  { id: "candlestand", name: "古びた燭台", use: "寮の部屋の飾り(予定)" },
  { id: "staremblem", name: "古い星の紋章", use: "物語の鍵" },
  { id: "violetink", name: "紫のインク", use: "古代文字の写し(予定)" },
  { id: "oldpaper", name: "古紙片", use: "封印の研究(予定)" },
  { id: "oldcodex", name: "古い写本", use: "物語の鍵" },
];
export const materialById = (id: string) => MATERIALS.find((m) => m.id === id);

export type Discovery = { id: string; name: string; text: string; place: string };
export const DISCOVERIES: Discovery[] = [
  { id: "d-stele", place: "temple", name: "落ちた星の碑文", text: "「星は落ちたのではない。自ら降りてきたのだ」" },
  { id: "d-ceiling", place: "temple", name: "天井の星図", text: "今の夜空にはない「七つ目の星」が描かれている" },
  { id: "d-altar", place: "temple", name: "祭壇の光", text: "祭壇に触れると、主人公の魔力にだけかすかに応える" },
  { id: "d-diary", place: "archive", name: "書きかけの日誌", text: "昔の学院生の日誌。「星が消えた夜から、誰もその名を口にしない」" },
  { id: "d-chain", place: "archive", name: "鎖の書の一節", text: "「魂は形を変えて受け継がれる。継ぐ者は、継いだことを知らない」" },
  { id: "d-codex", place: "archive", name: "魂を継ぐ者の写本", text: "名前の欄だけが空白の、古い魔法使いの記録" },
];
export const discoveryById = (id: string) => DISCOVERIES.find((d) => d.id === id);

/** 部屋:呪文(どれか1つ)か代わりの方法で通る。passWithout は「通れるが、部屋の発見は得られない」 */
export type Room = { id: string; name: string; desc: string; spells: string[]; alts: string[]; passWithout?: boolean; items: string[]; discovery?: string };
export type Place = { id: string; name: string; kind: string; desc: string; requires?: { course: MagicKey; unit: number; label: string }; rooms: Room[] };

export const PLACES: Place[] = [
  {
    id: "temple", name: "星降りの廃神殿", kind: "古代遺跡", desc: "学院の外れ、霧の谷に沈んだ神殿跡。",
    rooms: [
      { id: "t1", name: "崩れた参道", desc: "瓦礫が道をふさいでいる。", spells: [], alts: ["よじ登る", "回り道を探す"], items: ["stardust"] },
      { id: "t2", name: "暗い回廊", desc: "真っ暗で先が見えない。", spells: ["astral-1", "elemental-1"], alts: ["壁伝いに手探りで進む"], items: ["candlestand"] },
      { id: "t3", name: "碑文の間", desc: "壁一面に古代文字が刻まれている。", spells: ["ancient-1"], alts: [], passWithout: true, items: [], discovery: "d-stele" },
      { id: "t4", name: "つたの扉", desc: "つたに覆われた扉がある。", spells: ["nature-1", "elemental-1"], alts: ["手で少しずつほどく"], items: ["glowmoss"] },
      { id: "t5", name: "割れた床の大穴", desc: "向こう岸まで床がない。", spells: ["creation-2", "creation-1"], alts: [], items: ["starshard"] },
      { id: "t6", name: "星図の天井", desc: "天井の星図に、何かが隠れている。", spells: ["astral-2"], alts: [], items: [], discovery: "d-ceiling" },
      { id: "t7", name: "封印の祭壇", desc: "最奥。祭壇は封じられている。", spells: ["ancient-2"], alts: [], items: ["staremblem"], discovery: "d-altar" },
    ],
  },
  {
    id: "archive", name: "第一書架層", kind: "禁書庫", desc: "星辰の大図書館の地下。番人はオーリック先生。",
    requires: { course: "ancient", unit: 1, label: "古代文字学の単元2を受講" },
    rooms: [
      { id: "a1", name: "番人の受付", desc: "オーリック先生が帳面から顔を上げる。「通っていい」", spells: [], alts: ["一礼して入る"], items: [] },
      { id: "a2", name: "囁く書架", desc: "惑わせる声が聞こえる。", spells: ["mind-1"], alts: ["耳をふさいで一気に抜ける"], items: ["violetink"] },
      { id: "a3", name: "崩れた書架の山", desc: "本が崩れて道がない。", spells: ["creation-1"], alts: ["本を片付けながら進む"], items: ["oldpaper"] },
      { id: "a4", name: "灯りのない閲覧室", desc: "暗い。火を使うと本が危ない。", spells: ["astral-1"], alts: ["灯火の術をごく小さく使う"], items: [], discovery: "d-diary" },
      { id: "a5", name: "鎖の書", desc: "鎖で封じられた本がある。", spells: ["ancient-2"], alts: [], items: [], discovery: "d-chain" },
      { id: "a6", name: "写本室", desc: "最奥。読めない文字の写本が並ぶ。", spells: ["ancient-1"], alts: [], items: ["oldcodex"], discovery: "d-codex" },
    ],
  },
];
export const placeById = (id: string) => PLACES.find((p) => p.id === id);

/** 杖の木(入学診断でいちばん強い系統) */
export const WAND_WOOD: Record<MagicKey, string> = { astral: "銀樺", mind: "月桂", creation: "黒檀", nature: "若樫", elemental: "赤樫", ancient: "石化した古木" };

/** 先生の課題(その講座の単元2で出る) */
export type TeacherQuest = { id: string; course: MagicKey; text: string; title: string };
export const TEACHER_QUESTS: TeacherQuest[] = [
  { id: "q-astral", course: "astral", text: "廃神殿で「天井の星図」を見つける", title: "星を読む者" },
  { id: "q-mind", course: "mind", text: "囁く書架を「静心の環」で抜ける", title: "静かな心" },
  { id: "q-creation", course: "creation", text: "素材を3種類持ち帰る", title: "駆け出しの錬成師" },
  { id: "q-nature", course: "nature", text: "「光る苔」を持ち帰る", title: "芽吹きを待つ者" },
  { id: "q-elemental", course: "elemental", text: "暗い回廊を「灯火の術」で抜ける", title: "最初の灯火" },
  { id: "q-ancient", course: "ancient", text: "禁書庫の写本室にたどり着く", title: "書架の奥へ" },
];

/** 週替わりの課題(現実の経験で達成) */
export type WeeklyQuest = { id: string; text: string };
export const WEEKLY_QUESTS: WeeklyQuest[] = [
  { id: "w-challenge", text: "新しい挑戦の経験を1つ記録する" },
  { id: "w-reflect", text: "振り返りが30字以上の経験を2つ記録する" },
  { id: "w-variety", text: "3種類以上の経験を記録する" },
  { id: "w-bond", text: "人とのつながりの経験を1つ記録する" },
  { id: "w-days", text: "4日以上、経験を記録する" },
  { id: "w-learn", text: "学びの経験を1つ記録する" },
];

export const TITLES = {
  wand: "杖を持つ者", temple: "廃神殿の踏破者", archive: "禁書の読み手", allDiscoveries: "七つ目の星を追う者", streak: "続ける魔法使い",
} as const;
