// 현재 날씨: 위치 권한(있으면) + Open-Meteo(키 불필요).
// 전부 best-effort — 실패하면 null을 돌려주고 흐름을 막지 않는다.

import * as Location from "expo-location";

export type Weather = {
  tempC: number;
  code: number;
  emoji: string;
  desc: string;
};

/** Open-Meteo weather code → 이모지·설명 */
export function weatherOf(code: number): { emoji: string; desc: string } {
  if (code === 0) return { emoji: "☀️", desc: "맑음" };
  if (code <= 2) return { emoji: "⛅", desc: "구름 조금" };
  if (code === 3) return { emoji: "☁️", desc: "흐림" };
  if (code <= 48) return { emoji: "🌫️", desc: "안개" };
  if (code <= 57) return { emoji: "🌦️", desc: "이슬비" };
  if (code <= 67) return { emoji: "🌧️", desc: "비" };
  if (code <= 77) return { emoji: "❄️", desc: "눈" };
  if (code <= 82) return { emoji: "🌧️", desc: "소나기" };
  if (code <= 86) return { emoji: "🌨️", desc: "눈보라" };
  return { emoji: "⛈️", desc: "뇌우" };
}

// 30분 메모리 캐시 (날씨는 자주 안 바뀐다)
let cached: { at: number; weather: Weather } | null = null;
const CACHE_MS = 30 * 60 * 1000;

export async function getCurrentWeather(): Promise<Weather | null> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.weather;
  try {
    let perm = await Location.getForegroundPermissionsAsync();
    if (!perm.granted && perm.canAskAgain) {
      perm = await Location.requestForegroundPermissionsAsync();
    }
    if (!perm.granted) return null;
    const last = await Location.getLastKnownPositionAsync();
    const position =
      last ??
      (await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000)),
      ]));
    if (!position) return null;

    const { latitude, longitude } = position.coords;
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude.toFixed(3)}` +
      `&longitude=${longitude.toFixed(3)}&current=temperature_2m,weather_code`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = (await res.json()) as {
      current?: { temperature_2m?: number; weather_code?: number };
    };
    const tempC = json.current?.temperature_2m;
    const code = json.current?.weather_code ?? 0;
    if (tempC == null) return null;

    const weather: Weather = { tempC: Math.round(tempC), code, ...weatherOf(code) };
    cached = { at: Date.now(), weather };
    return weather;
  } catch {
    return null;
  }
}
