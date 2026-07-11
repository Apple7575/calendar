// 사진 위치 기록: 카메라 촬영 시 현재 위치 + 좌표 → 장소명(역지오코딩).
// 전부 best-effort — 권한 거부/실패 시 null을 돌려주고 흐름을 막지 않는다.

import * as Location from "expo-location";

export type PhotoGps = { lat: number; lng: number };
export type PhotoLocation = PhotoGps & { place: string | null };

/** 좌표 → "서울 마포구" 같은 짧은 장소명 (실패 시 null) */
export async function placeNameOf(lat: number, lng: number): Promise<string | null> {
  try {
    const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    const r = results[0];
    if (!r) return null;
    // iOS: city="서울특별시", district="마포구", name="상세 지점"
    const coarse = [r.city ?? r.region, r.district ?? r.street]
      .filter((s): s is string => !!s)
      .join(" ")
      .trim();
    return coarse || r.name || null;
  } catch {
    return null;
  }
}

/**
 * 카메라 촬영 순간의 현재 위치. 권한이 없으면 한 번 물어보고,
 * 거부되면 null (다시 조르지 않는다).
 */
export async function currentPhotoLocation(): Promise<PhotoLocation | null> {
  try {
    let perm = await Location.getForegroundPermissionsAsync();
    if (!perm.granted && perm.canAskAgain) {
      perm = await Location.requestForegroundPermissionsAsync();
    }
    if (!perm.granted) return null;

    // 최근 위치가 있으면 빠르게 사용, 없으면 3.5초 안에서만 새로 측정
    const last = await Location.getLastKnownPositionAsync();
    const position =
      last ??
      (await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 3500)),
      ]));
    if (!position) return null;

    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    return { lat, lng, place: await placeNameOf(lat, lng) };
  } catch {
    return null;
  }
}

/** Apple 지도에서 이 위치 열기 URL */
export function appleMapsUrl(lat: number, lng: number, label?: string | null): string {
  const q = encodeURIComponent(label || "사진 위치");
  return `http://maps.apple.com/?ll=${lat},${lng}&q=${q}`;
}
