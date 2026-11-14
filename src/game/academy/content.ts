/**
 * 学院の中身(世界設定書 Phase 4a でげんたが承認した内容:https://claude.ai/artifact/9LAR9PYzPVZAcwzPzqjWHG)。
 * 先生・講座・単元・呪文・寮。名前や設定を変えるときは設定書と docs/WORLD.md も直す。
 */
import type { MagicKey, StatKey } from "../../schemas";

export type Teacher = { name: string; title: string; persona: string; catchphrase: string };
export type Course = { key: MagicKey; name: string; teacher: Teacher; stat: StatKey };
export type Unit = { title: string; lecture: string; q: string; choices: [string, string, string]; answer: 0 | 1 | 2; spell?: string };
export type SpellTier = "basic" | "intermediate" | "advanced";
export type Spell = { id: string; system: MagicKey; tier: SpellTier; name: string; reading?: string; effect: string; use: string };

export const COURSES: Record<MagicKey, Course> = {
  astral: { key: "astral", name: "星辰学", stat: "intellect", teacher: { name: "セレスティン・ヴァーレ", title: "教授", persona: "白髪の物静かな天文学者。星図を指でなぞりながら話す", catchphrase: "星は急がない" } },
  mind: { key: "mind", name: "心象学", stat: "spirit", teacher: { name: "ミラ・オルデン", title: "先生", persona: "穏やかで聞き上手。生徒の表情の変化にすぐ気づく", catchphrase: "いま、どんな色？" } },
  creation: { key: "creation", name: "錬成学", stat: "creativity", teacher: { name: "ブラム・ケスター", title: "先生", persona: "豪快な職人肌。工房は煤だらけで、失敗作ほどほめる", catchphrase: "壊した数だけ、手が覚える" } },
  nature: { key: "nature", name: "生命学", stat: "sensitivity", teacher: { name: "リュネ・アンバーグローヴ", title: "先生", persona: "温室に住む若い研究者。植物に話しかけるのが癖", catchphrase: "待つのも、育てるうち" } },
  elemental: { key: "elemental", name: "元素学", stat: "physical", teacher: { name: "ガレス・フォルトナー", title: "先生", persona: "元決闘選手。厳しいけど公平で、基礎の反復を大事にする", catchphrase: "もう一本" } },
  ancient: { key: "ancient", name: "古代文字学", stat: "willpower", teacher: { name: "オーリック・ザイン", title: "先生", persona: "禁書庫の番人も務める謎の多い学者。いつも遺跡帰りで砂まみれ", catchphrase: "文字は、書いた者の声だ" } },
};

export const SPELLS: Spell[] = [
  { id: "astral-1", system: "astral", tier: "basic", name: "星灯", reading: "ほしあかり", effect: "手のひらに星の光を灯し、暗がりを照らす", use: "探索で暗い場所を進める" },
  { id: "astral-2", system: "astral", tier: "intermediate", name: "星図の眼", effect: "隠れた道や仕掛けを、星の配置として見抜く", use: "探索で隠し通路を見つける" },
  { id: "astral-3", system: "astral", tier: "advanced", name: "天球の盾", effect: "星の軌道を盾にして攻撃をそらす", use: "戦闘で守る" },
  { id: "mind-1", system: "mind", tier: "basic", name: "静心の環", effect: "心を落ち着け、精神力を回復する", use: "戦闘で精神力を回復" },
  { id: "mind-2", system: "mind", tier: "intermediate", name: "共鳴の声", effect: "相手の感情に寄り添い、心を通わせる", use: "NPCとの交流で信頼を深める" },
  { id: "mind-3", system: "mind", tier: "advanced", name: "記憶の回廊", effect: "失われた記憶の断片をたどる", use: "物語の謎を解く" },
  { id: "creation-1", system: "creation", tier: "basic", name: "形成の指", effect: "小さな道具を形づくる", use: "探索で道具を作る" },
  { id: "creation-2", system: "creation", tier: "intermediate", name: "光の織機", effect: "光の糸で足場や網を織る", use: "探索で道をつなぐ" },
  { id: "creation-3", system: "creation", tier: "advanced", name: "具現の扉", effect: "思い描いたものを、ひととき実体にする", use: "戦闘・探索で切り札になる" },
  { id: "nature-1", system: "nature", tier: "basic", name: "芽吹きの息", effect: "種を芽吹かせる", use: "庭園や保護区で使う" },
  { id: "nature-2", system: "nature", tier: "intermediate", name: "癒やしの露", effect: "体力を回復する", use: "戦闘で体力を回復" },
  { id: "nature-3", system: "nature", tier: "advanced", name: "獣語り", effect: "魔法生物と言葉を交わす", use: "魔法生物保護区で使う" },
  { id: "elemental-1", system: "elemental", tier: "basic", name: "灯火の術", effect: "小さな炎を起こす", use: "戦闘の基本の攻撃" },
  { id: "elemental-2", system: "elemental", tier: "intermediate", name: "風の刃", effect: "風を刃にして放つ", use: "戦闘で素早く攻める" },
  { id: "elemental-3", system: "elemental", tier: "advanced", name: "雷鳴の槍", effect: "雷をまとった槍を放つ", use: "戦闘の大技" },
  { id: "ancient-1", system: "ancient", tier: "basic", name: "古文字の解読", effect: "碑文や古文書を読む", use: "探索で碑文を読む" },
  { id: "ancient-2", system: "ancient", tier: "intermediate", name: "封印の鍵", effect: "簡単な封印を解く", use: "探索で封じられた扉をひらく" },
  { id: "ancient-3", system: "ancient", tier: "advanced", name: "時の残響", effect: "その場所に残った過去の光景を一瞬見る", use: "物語の謎を解く" },
];
export const TIER_LABELS: Record<SpellTier, string> = { basic: "初級", intermediate: "中級", advanced: "上級" };
export const spellById = (id: string) => SPELLS.find((s) => s.id === id);

export const HOUSES = [
  { id: "dawnfire", name: "暁火の寮", systems: ["elemental", "creation"] as MagicKey[], value: "振り絞る力と、つくる力" },
  { id: "moonshade", name: "月影の寮", systems: ["mind", "nature"] as MagicKey[], value: "寄り添う力と、育てる力" },
  { id: "starring", name: "星環の寮", systems: ["astral", "ancient"] as MagicKey[], value: "見通す力と、解き明かす力" },
];

/** 単元(各講座5つ。単元3で初級、単元5で中級の呪文を実習する) */
export const UNITS: Record<MagicKey, Unit[]> = {
  astral: [
    { title: "夜空の地図を読む", lecture: "星図は、空をそのまま写した地図だ。まずは北の空で動かない星を見つけなさい。迷ったときは、そこから数えればいい。", q: "星図を読むとき、最初に見つけるものは？", choices: ["いちばん明るい星", "北の空で動かない星", "月のそばの星"], answer: 1 },
    { title: "星の明るさと距離", lecture: "明るく見える星が、近いとはかぎらない。遠くても大きく燃える星もある。見かけにまどわされず、確かめる癖をつけなさい。", q: "明るく見える星について正しいのは？", choices: ["かならず近い", "近いとはかぎらない", "かならず大きい"], answer: 1 },
    { title: "星灯をともす", lecture: "手のひらを空に向け、ひとつの星を思い浮かべなさい。その光を借りるように、静かに息を吐く。急げば光は散る。星は急がない。", q: "星灯をともすときに大切なのは？", choices: ["すばやく唱える", "静かに息を吐き、急がない", "強く手を握る"], answer: 1, spell: "astral-1" },
    { title: "天球の動きと季節", lecture: "星はひと晩で東から西へめぐり、季節ごとに見える顔ぶれが変わる。変わるものと変わらないもの、その両方を知ると、先が読める。", q: "季節ごとに変わるのは？", choices: ["見える星の顔ぶれ", "北の空で動かない星の位置", "星の色"], answer: 0 },
    { title: "星図の眼をひらく", lecture: "目の前の景色を、星図のように点と線で見なさい。隠れた道は、配置のゆがみとして浮かび上がる。全体を見てから、細部へ。", q: "星図の眼で隠れた道を見つけるコツは？", choices: ["細部から順に見る", "全体を見てから細部へ", "目を閉じる"], answer: 1, spell: "astral-2" },
  ],
  mind: [
    { title: "心の水面を静める", lecture: "心は水面に似ています。風が強いと、底は見えません。まずは三回、ゆっくり息をしてみて。いま、どんな色？", q: "心を静めるために、まずすることは？", choices: ["大きな声を出す", "ゆっくり息をする", "考えるのをやめる"], answer: 1 },
    { title: "感情の色を見る", lecture: "感情には色があります。怒りも悲しみも、悪い色ではありません。名前をつけてあげると、それだけで少し落ち着くのです。", q: "感情とのつき合い方として先生が教えたのは？", choices: ["悪い感情は消す", "名前をつけてあげる", "見ないようにする"], answer: 1 },
    { title: "静心の環", lecture: "胸の前で、ゆっくり輪を描いて。散らばった気持ちを、輪の中に集めるように。無理に消さなくていい、集めるだけ。", q: "静心の環で気持ちをどうする？", choices: ["輪の中に集める", "外へ投げ捨てる", "無理に消す"], answer: 0, spell: "mind-1" },
    { title: "相手の心に耳をすます", lecture: "相手の言葉の奥には、言葉にならない気持ちがあります。答えを急がず、まずは最後まで聞くこと。それが一番の魔法です。", q: "相手の気持ちを知るために大切なのは？", choices: ["すぐに答えを出す", "最後まで聞く", "自分の話をする"], answer: 1 },
    { title: "共鳴の声", lecture: "相手の色と、自分の色を重ねるように声を出します。同じ気持ちにならなくてもいい。わかろうとする気持ちが、響きになるの。", q: "共鳴の声で大切なのは？", choices: ["同じ気持ちになること", "わかろうとする気持ち", "大きな声"], answer: 1, spell: "mind-2" },
  ],
  creation: [
    { title: "素材の声を聞く", lecture: "石にも木にも、なりたい形ってのがある。まず触って、重さと冷たさを確かめろ。いきなり作るやつは、素材に嫌われる。", q: "錬成を始める前にすることは？", choices: ["すぐ形を変える", "素材に触って確かめる", "設計図を捨てる"], answer: 1 },
    { title: "形を思い描く", lecture: "頭の中で、完成品を手に取れるくらいはっきり描け。ぼんやりした絵からは、ぼんやりした物しかできない。", q: "形を思い描くときのコツは？", choices: ["手に取れるくらいはっきり描く", "ぼんやりで十分", "人に任せる"], answer: 0 },
    { title: "形成の指", lecture: "指先に魔力を集めて、粘土をこねるように形を整えろ。失敗したら、それでいい。壊した数だけ、手が覚える。", q: "先生は失敗をどう考えている？", choices: ["してはいけない", "手が覚えるための一歩", "才能がない証拠"], answer: 1, spell: "creation-1" },
    { title: "錬成炉の火加減", lecture: "強すぎる火は素材を焦がし、弱すぎる火は形を変えない。火加減は、何度も見てやっとわかる。焦るな、炉の色を見ろ。", q: "火加減を知るために見るものは？", choices: ["炉の色", "時計だけ", "他人の顔"], answer: 0 },
    { title: "光の織機", lecture: "光を糸だと思え。縦糸と横糸を交互に通せば、布にも橋にもなる。一本一本は弱くても、組めば強い。", q: "光の織機の考え方は？", choices: ["一本の太い光を使う", "細い糸を組んで強くする", "光を消す"], answer: 1, spell: "creation-2" },
  ],
  nature: [
    { title: "芽吹きの観察", lecture: "種は、土の中で少しずつ準備をしています。見えないあいだも、ちゃんと育っているんですよ。毎日同じ時間に見てみましょう。", q: "芽が出るまでのあいだ、種は？", choices: ["何もしていない", "見えないところで準備している", "眠り続けている"], answer: 1 },
    { title: "生命の脈を感じる", lecture: "葉にそっと触れてみて。かすかな脈を感じたら、それが命のリズムです。自分の呼吸を、そのリズムに合わせてみましょう。", q: "生命の脈を感じたら、どうする？", choices: ["自分の呼吸を合わせる", "強く押さえる", "すぐ離れる"], answer: 0 },
    { title: "芽吹きの息", lecture: "種に向かって、温かい息を吹きかけるように魔力を送ります。急かさないで。待つのも、育てるうちですから。", q: "芽吹きの息で大切な姿勢は？", choices: ["急かさず待つ", "何度も強く吹く", "種を掘り返す"], answer: 0, spell: "nature-1" },
    { title: "薬草と癒やし", lecture: "癒やしの薬草は、日陰でゆっくり育つものが多いんです。弱っている命には、強い力より、やさしく長い手当てが効きます。", q: "弱っている命に効く手当ては？", choices: ["強い力を一度に", "やさしく長い手当て", "放っておく"], answer: 1 },
    { title: "癒やしの露", lecture: "朝露を手のひらに集めるように、魔力をしずくの形にします。傷の上で、そっとほどいて。癒やしは、相手のペースで進むもの。", q: "癒やしの露はどう進める？", choices: ["自分のペースで一気に", "相手のペースで", "見ないで"], answer: 1, spell: "nature-2" },
  ],
  elemental: [
    { title: "五つの元素", lecture: "炎、水、風、土、雷。この五つが元素魔法の基礎だ。どれか一つだけ強くても勝てん。全部を一度は手で触れておけ。", q: "元素魔法の五つの元素に入らないのは？", choices: ["風", "光", "土"], answer: 1 },
    { title: "呼吸と魔力の流れ", lecture: "魔力は呼吸に乗って体をめぐる。吸って溜め、吐いて放つ。試合と同じだ。息が乱れたら、魔法も乱れる。", q: "魔力を放つのはどのとき？", choices: ["息を吸うとき", "息を吐くとき", "息を止めたとき"], answer: 1 },
    { title: "灯火の術", lecture: "指先に、小さな火種を思い描け。大きな炎はいらん。小さく、確実に、何度でも出せること。もう一本。", q: "灯火の術で先生が求めたのは？", choices: ["一度きりの大きな炎", "小さく確実に何度でも", "炎の色を変えること"], answer: 1, spell: "elemental-1" },
    { title: "風を読む", lecture: "風は目に見えないが、木の葉と旗が教えてくれる。相手の動きも同じだ。小さな兆しを見逃すな。", q: "風を読むときに見るものは？", choices: ["木の葉や旗の動き", "空の色だけ", "自分の足元だけ"], answer: 0 },
    { title: "風の刃", lecture: "風を薄く、鋭く圧縮しろ。大振りはすきが大きい。短く、速く、正確に。基礎の反復が、そのまま刃になる。", q: "風の刃のコツは？", choices: ["大きく振りかぶる", "短く速く正確に", "目を閉じて放つ"], answer: 1, spell: "elemental-2" },
  ],
  ancient: [
    { title: "古代文字の成り立ち", lecture: "古代文字は、もとは絵だった。山、水、星。形の奥にある絵を見つければ、知らない文字でも意味の見当がつく。", q: "知らない古代文字の意味を推し量るには？", choices: ["形の奥にある絵を見つける", "適当に読む", "読まずに飛ばす"], answer: 0 },
    { title: "碑文を写す", lecture: "碑文は、まず一字ずつ正確に写せ。わからない字も、わからないまま写す。勝手に直した瞬間、書いた者の声は消える。", q: "わからない字があったらどうする？", choices: ["自分の考えで直す", "わからないまま正確に写す", "その行を飛ばす"], answer: 1 },
    { title: "古文字の解読", lecture: "文字に指をあて、書いた者の手の動きをなぞれ。速さ、迷い、力の入り方。文字は、書いた者の声だ。", q: "古文字の解読でなぞるものは？", choices: ["書いた者の手の動き", "紙の色", "自分の名前"], answer: 0, spell: "ancient-1" },
    { title: "封印の仕組み", lecture: "封印は錠前に似ている。かけた者は、必ず開け方も残す。力で壊すな。仕組みを読め。", q: "封印を解くときの心得は？", choices: ["力で壊す", "仕組みを読む", "放っておく"], answer: 1 },
    { title: "封印の鍵", lecture: "封印の文字列から、かけた者が残した『開け方』を探せ。見つけたら、その文字を逆の順になぞる。焦れば、封印はさらに固くなる。", q: "封印の鍵で、見つけた文字はどうなぞる？", choices: ["同じ順に何度も", "逆の順に", "なぞらない"], answer: 1, spell: "ancient-2" },
  ],
};

/** 入学診断の結果から寮を決める(2系統の基礎値の合計がいちばん高い寮) */
export function houseFor(bases: Partial<Record<MagicKey, number | null>>) {
  let best = HOUSES[0], score = -1;
  for (const h of HOUSES) { const s = h.systems.reduce((t, k) => t + (bases[k] ?? 0), 0); if (s > score) { best = h; score = s; } }
  return best;
}
