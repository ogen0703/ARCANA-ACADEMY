import { MAGIC_KEYS, PERSONALITY_KEYS, type Character, type ExperienceEvent } from "../../schemas";
import { personalityValue } from "../../game/growth/formation";

/** v2→v3:性格の weight を反映済みの経験から数え直し、魔法適性に base(未診断)を足す。既存の値は消さない */
export function migrateCharacterV3(c: Character, evs: ExperienceEvent[]): Character {
  const applied = evs.filter((e) => e.analysisStatus === "applied" && c.appliedEventIds.includes(e.id));
  const w: Record<string, number> = {};
  for (const e of applied) for (const [k, v] of Object.entries(e.approvedGrowth?.personalitySignals ?? {})) w[k] = (w[k] ?? 0) + (v ?? 0);
  const personality = { ...c.personality };
  for (const k of PERSONALITY_KEYS) {
    const cur = personality[k] ?? { value: null, evidence: 0, weight: 0 };
    const weight = Math.round((w[k] ?? 0) * 10) / 10;
    personality[k] = { evidence: cur.evidence, weight, value: personalityValue(cur.evidence, weight) };
  }
  const magicAffinity = { ...c.magicAffinity };
  for (const k of MAGIC_KEYS) magicAffinity[k] = { ...magicAffinity[k], base: magicAffinity[k]?.base ?? null };
  return { ...c, personality, magicAffinity, diagnosedAt: c.diagnosedAt ?? null };
}
