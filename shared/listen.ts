/** Browser speech voice order for the 收聽 control. The page script applies the same order. */

export interface VoiceLike {
  lang: string;
  name?: string;
}

/** zh-HK, then zh-TW, then zh-CN, then any other Chinese voice. */
export const VOICE_ORDER = ['zh-HK', 'zh-TW', 'zh-CN'] as const;

export const LISTEN_RATES = [0.75, 1, 1.25, 1.5] as const;

export function pickVoice<T extends VoiceLike>(voices: T[]): T | null {
  const chinese = voices.filter((voice) => /^zh/i.test(voice.lang || ''));
  for (const prefix of VOICE_ORDER) {
    const hit = chinese.find((voice) => voice.lang.toLowerCase().startsWith(prefix.toLowerCase()));
    if (hit) return hit;
  }
  return chinese[0] ?? null;
}

/** Article kinds that show 收聽. Topic pages use the same control when they exist. */
export function listens(kind: string): boolean {
  return kind === 'briefing' || kind === 'compare' || kind === 'explainer' || kind === 'topic' || kind === 'story';
}
