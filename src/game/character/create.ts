import { MAGIC_KEYS, PERSONALITY_KEYS, STAT_KEYS, type Character, type PlayerProfile } from "../../schemas";
import { P } from "../growth/rules";

/** GDD 4章:初期プロフィール。プレイヤー本人の情報(PlayerProfile)とキャラクターは分けて持つ */
export function createPlayer(now: string): PlayerProfile {
  return { id: "player", displayName: "げんた", gender: "男性", birthday: "1997-07-03", photoConsent: false, aiSendConsent: false, updatedAt: now };
}

export function createCharacter(name: string, now: string): Character {
  return {
    id: "hero", name, createdAt: now, updatedAt: now, level: 1, experience: 0,
    appearance: { hairColor: "夜の黒", eyeColor: "深い藍", robe: "見習いのローブ(紺)", aura: "まだ見えない" },
    basicStats: Object.fromEntries(STAT_KEYS.map((k) => [k, P.initialStat])) as Character["basicStats"],
    personality: Object.fromEntries(PERSONALITY_KEYS.map((k) => [k, { value: null, evidence: 0, weight: 0 }])) as Character["personality"],
    magicAffinity: Object.fromEntries(MAGIC_KEYS.map((k) => [k, { value: null, signals: 0, base: null }])) as Character["magicAffinity"],
    learnedSpells: [], inventory: [], titles: [], achievements: [], relationships: [],
    history: { origin: "未解明", house: null, wand: null, wizardAge: null },
    appliedEventIds: [],
    diagnosedAt: null,
    academy: { proficiency: {}, units: {} },
    world: { discoveries: [], clears: {}, quests: [], activeTitle: null, defeated: [], npcTopics: {}, answers: [], creatures: {}, companion: null, companionDaily: { date: "", gained: 0 }, research: {}, compounds: [], story: { scene: 0, choices: {}, route: null, lastRead: "", cleared: false, log: [] }, story2: { scene: 0, choices: {}, route: null, lastRead: "", cleared: false, log: [] }, outfit: "rank", garden: { lastWalk: "", restDate: "" }, brew: { date: "", count: 0 }, brewLog: [], achievements: {}, houseStars: [] },
  };
}
