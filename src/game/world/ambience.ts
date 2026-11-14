/** 学院の時間帯・季節・天候(GDD 12章:背景や時間帯、天候、季節を表現)。表示だけに使い、ゲームの数値には影響しない */
export type TimeKey = "dawn" | "day" | "dusk" | "night";
export type SeasonKey = "spring" | "summer" | "autumn" | "winter";
export type WeatherKey = "clear" | "mist" | "rain";

export const TIME: Record<TimeKey, { label: string; sky: [string, string]; fog: string; ambient: number; window: string }> = {
  dawn: { label: "朝靄の学院", sky: ["#3b3a6e", "#e8a87c"], fog: "#2a2448", ambient: 0.55, window: "#f3c9a0" },
  day: { label: "昼下がりの学院", sky: ["#5a6fb0", "#c9d6f2"], fog: "#2c2a4a", ambient: 0.7, window: "#e9eefc" },
  dusk: { label: "黄昏の学院", sky: ["#3a1f4f", "#f08a4b"], fog: "#271a33", ambient: 0.5, window: "#ffb27a" },
  night: { label: "星降る夜の学院", sky: ["#07061a", "#1b1740"], fog: "#0b0a14", ambient: 0.32, window: "#7f8cff" },
};
export const SEASON: Record<SeasonKey, { label: string; particle: string; fall: number }> = {
  spring: { label: "春", particle: "#ffc6dd", fall: 0.25 },
  summer: { label: "夏", particle: "#d9ff8a", fall: -0.05 },
  autumn: { label: "秋", particle: "#e8a14a", fall: 0.35 },
  winter: { label: "冬", particle: "#ffffff", fall: 0.45 },
};
export const WEATHER: Record<WeatherKey, string> = { clear: "晴れ", mist: "霧", rain: "雨" };

export function timeOf(d: Date): TimeKey {
  const h = d.getHours();
  return h >= 5 && h < 9 ? "dawn" : h >= 9 && h < 16 ? "day" : h >= 16 && h < 19 ? "dusk" : "night";
}
export function seasonOf(d: Date): SeasonKey {
  const m = d.getMonth() + 1;
  return m >= 3 && m <= 5 ? "spring" : m >= 6 && m <= 8 ? "summer" : m >= 9 && m <= 11 ? "autumn" : "winter";
}
/** その日の天候(日付から決まるので、1日の中では変わらない) */
export function weatherOf(d: Date): WeatherKey {
  let h = d.getFullYear() * 372 + d.getMonth() * 31 + d.getDate();
  h = (h * 2654435761) >>> 0;
  const r = (h % 100) / 100;
  return r < 0.65 ? "clear" : r < 0.85 ? "mist" : "rain";
}
export function ambienceOf(d: Date) {
  const t = timeOf(d), s = seasonOf(d), w = weatherOf(d);
  return { time: t, season: s, weather: w, label: `${TIME[t].label} ・ ${SEASON[s].label} ・ ${WEATHER[w]}` };
}
