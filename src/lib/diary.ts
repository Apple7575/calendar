import * as Crypto from "expo-crypto";
import { File } from "expo-file-system";
import { ViewerPhoto } from "../navigation/types";
import { monthsAgoKey } from "./dateUtils";
import { DiaryPhotoRow, DiaryRow, supabase } from "./supabase";

const BUCKET = "diary-photos";
const SIGNED_URL_TTL_SEC = 3600;

export type DiaryPhoto = DiaryPhotoRow & { url: string };
export type DiaryWithPhotos = { diary: DiaryRow | null; photos: DiaryPhoto[] };

async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (!userId) throw new Error("로그인이 필요해요.");
  return userId;
}

export async function getDiaryWithPhotos(dateKey: string): Promise<DiaryWithPhotos> {
  const { data: diary, error } = await supabase
    .from("diaries")
    .select("*")
    .eq("date", dateKey)
    .maybeSingle();
  if (error) throw new Error(`일기를 불러오지 못했어요: ${error.message}`);
  if (!diary) return { diary: null, photos: [] };

  const { data: photoRows, error: photoError } = await supabase
    .from("diary_photos")
    .select("*")
    .eq("diary_id", (diary as DiaryRow).id)
    .order("position")
    .order("created_at");
  if (photoError) throw new Error(`사진을 불러오지 못했어요: ${photoError.message}`);

  const rows = (photoRows ?? []) as DiaryPhotoRow[];
  const photos = await withSignedUrls(rows);
  return { diary: diary as DiaryRow, photos };
}

async function withSignedUrls(rows: DiaryPhotoRow[]): Promise<DiaryPhoto[]> {
  if (rows.length === 0) return [];
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(rows.map((r) => r.storage_path), SIGNED_URL_TTL_SEC);
  if (error) throw new Error(`사진 주소 발급에 실패했어요: ${error.message}`);
  const urlByPath = new Map((data ?? []).map((d) => [d.path, d.signedUrl]));
  return rows.map((r) => ({ ...r, url: urlByPath.get(r.storage_path) ?? "" }));
}

export type DiaryInput = {
  content: string;
  mood: string | null;
  highlight: string | null;
  energy: number | null;
  sleepHours: number | null;
  people: string[];
  gratitude: string | null;
};

export async function upsertDiary(dateKey: string, input: DiaryInput): Promise<DiaryRow> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("diaries")
    .upsert(
      {
        user_id: userId,
        date: dateKey,
        content: input.content,
        mood: input.mood,
        highlight: input.highlight,
        energy: input.energy,
        sleep_hours: input.sleepHours,
        people: input.people,
        gratitude: input.gratitude,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,date" }
    )
    .select()
    .single();
  if (error) throw new Error(`일기 저장에 실패했어요: ${error.message}`);
  return data as DiaryRow;
}

/** 최근 일기들에서 자주 등장한 사람 태그 (입력 추천용) */
export async function recentPeople(limit = 12): Promise<string[]> {
  const { data } = await supabase
    .from("diaries")
    .select("people")
    .order("date", { ascending: false })
    .limit(30);
  const counts = new Map<string, number>();
  for (const row of (data ?? []) as { people: string[] }[]) {
    for (const p of row.people ?? []) counts.set(p, (counts.get(p) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([p]) => p);
}

function contentTypeOf(uri: string): { contentType: string; ext: string } {
  const lower = uri.toLowerCase();
  if (lower.endsWith(".png")) return { contentType: "image/png", ext: "png" };
  if (lower.endsWith(".heic") || lower.endsWith(".heif")) {
    return { contentType: "image/heic", ext: "heic" };
  }
  return { contentType: "image/jpeg", ext: "jpg" };
}

/**
 * EXIF에서 GPS 좌표를 읽는다. iOS는 평평한 GPSLatitude 키 또는
 * "{GPS}" 중첩 딕셔너리 두 형태가 있어 둘 다 처리한다.
 */
export function parseExifGps(
  exif: Record<string, unknown> | null | undefined
): { lat: number; lng: number } | null {
  if (!exif) return null;
  const nested = (exif["{GPS}"] ?? null) as Record<string, unknown> | null;
  const rawLat = (exif.GPSLatitude ?? nested?.Latitude) as number | undefined;
  const rawLng = (exif.GPSLongitude ?? nested?.Longitude) as number | undefined;
  if (typeof rawLat !== "number" || typeof rawLng !== "number") return null;
  const latRef = (exif.GPSLatitudeRef ?? nested?.LatitudeRef) as string | undefined;
  const lngRef = (exif.GPSLongitudeRef ?? nested?.LongitudeRef) as string | undefined;
  const lat = latRef === "S" ? -Math.abs(rawLat) : rawLat;
  const lng = lngRef === "W" ? -Math.abs(rawLng) : rawLng;
  if (lat === 0 && lng === 0) return null;
  return { lat, lng };
}

/** EXIF "YYYY:MM:DD HH:MM:SS" → ISO (기기 로컬 시간대 기준). 없거나 못 읽으면 null */
export function parseExifTakenAt(
  exif: Record<string, unknown> | null | undefined
): string | null {
  const raw = (exif?.DateTimeOriginal ?? exif?.DateTime) as string | undefined;
  if (typeof raw !== "string") return null;
  const m = /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(raw);
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * 그 날짜의 일기 행을 보장한다 (없으면 빈 일기 생성).
 * 카메라 등 일기 화면 밖에서 사진을 붙일 때 사용 — 기존 내용은 건드리지 않는다.
 */
export async function ensureDiary(dateKey: string): Promise<DiaryRow> {
  const { data: existing, error: selectError } = await supabase
    .from("diaries")
    .select("*")
    .eq("date", dateKey)
    .maybeSingle();
  if (selectError) throw new Error(`일기를 확인하지 못했어요: ${selectError.message}`);
  if (existing) return existing as DiaryRow;

  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("diaries")
    .insert({ user_id: userId, date: dateKey, content: "" })
    .select()
    .single();
  if (!error) return data as DiaryRow;
  // 동시 생성 경합(unique user_id,date) — 다시 조회
  const { data: retry, error: retryError } = await supabase
    .from("diaries")
    .select("*")
    .eq("date", dateKey)
    .maybeSingle();
  if (retryError || !retry) throw new Error(`일기 생성에 실패했어요: ${error.message}`);
  return retry as DiaryRow;
}

/** 일기에 이미 붙은 사진 수 — 새 사진의 position 계산용 */
export async function countPhotos(diaryId: string): Promise<number> {
  const { count, error } = await supabase
    .from("diary_photos")
    .select("id", { count: "exact", head: true })
    .eq("diary_id", diaryId);
  if (error) throw new Error(`사진 수를 확인하지 못했어요: ${error.message}`);
  return count ?? 0;
}

async function uploadImage(userId: string, diaryId: string, localUri: string): Promise<string> {
  const { contentType, ext } = contentTypeOf(localUri);
  const path = `${userId}/${diaryId}/${Crypto.randomUUID()}.${ext}`;
  const bytes = await new File(localUri).arrayBuffer();
  const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, { contentType });
  if (error) throw new Error(`사진 업로드에 실패했어요: ${error.message}`);
  return path;
}

export type AddPhotoOptions = {
  /** 촬영 시각 ISO (EXIF 또는 카메라 촬영 순간) */
  takenAt?: string | null;
  /** 시각 오버레이 합성본을 올릴 때 함께 보관할 원본 사진 URI */
  originalUri?: string | null;
  /** 촬영 위치 */
  location?: { lat: number; lng: number; place: string | null } | null;
};

/** 기기 사진을 Storage에 올리고 diary_photos 행을 만든다 */
export async function addPhoto(
  diary: DiaryRow,
  localUri: string,
  position: number,
  opts: AddPhotoOptions = {}
): Promise<DiaryPhotoRow> {
  const userId = await requireUserId();
  const path = await uploadImage(userId, diary.id, localUri);
  const uploaded = [path];

  let originalPath: string | null = null;
  if (opts.originalUri) {
    try {
      originalPath = await uploadImage(userId, diary.id, opts.originalUri);
      uploaded.push(originalPath);
    } catch {
      // 원본 업로드 실패는 치명적이지 않음 — 합성본만 보관
      originalPath = null;
    }
  }

  const { data, error } = await supabase
    .from("diary_photos")
    .insert({
      user_id: userId,
      diary_id: diary.id,
      storage_path: path,
      position,
      taken_at: opts.takenAt ?? null,
      original_path: originalPath,
      lat: opts.location?.lat ?? null,
      lng: opts.location?.lng ?? null,
      place: opts.location?.place ?? null,
    })
    .select()
    .single();
  if (error) {
    // DB 기록 실패 시 고아 파일 정리 (best-effort)
    await supabase.storage.from(BUCKET).remove(uploaded);
    throw new Error(`사진 정보 저장에 실패했어요: ${error.message}`);
  }
  return data as DiaryPhotoRow;
}

/** 사진 좋아요(하트) 토글 */
export async function setPhotoLiked(photoId: string, liked: boolean): Promise<void> {
  const { error } = await supabase.from("diary_photos").update({ liked }).eq("id", photoId);
  if (error) throw new Error(`좋아요 저장에 실패했어요: ${error.message}`);
}

/** 원본 사진 storage 경로의 signed URL */
export async function getOriginalUrl(originalPath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(originalPath, SIGNED_URL_TTL_SEC);
  if (error || !data?.signedUrl) {
    throw new Error(`원본 주소 발급에 실패했어요: ${error?.message ?? "unknown"}`);
  }
  return data.signedUrl;
}

/** DiaryPhoto → 사진 뷰어 파라미터 */
export function toViewerPhoto(p: DiaryPhoto): ViewerPhoto {
  return {
    url: p.url,
    id: p.id,
    takenAt: p.taken_at,
    liked: p.liked,
    originalPath: p.original_path,
    lat: p.lat,
    lng: p.lng,
    place: p.place,
  };
}

export async function deletePhoto(photo: DiaryPhotoRow): Promise<void> {
  const { error: storageError } = await supabase.storage
    .from(BUCKET)
    .remove([photo.storage_path]);
  if (storageError) throw new Error(`사진 파일 삭제에 실패했어요: ${storageError.message}`);
  const { error } = await supabase.from("diary_photos").delete().eq("id", photo.id);
  if (error) throw new Error(`사진 삭제에 실패했어요: ${error.message}`);
}

export type DiaryEntry = { date: string; mood: string | null };

/** 기간 내 일기 목록 (날짜 + 기분) — 캘린더 dot/기분 모아보기/스트릭용 */
export async function listDiaryEntriesInRange(
  startKey: string,
  endKey: string
): Promise<DiaryEntry[]> {
  const { data, error } = await supabase
    .from("diaries")
    .select("date, mood")
    .gte("date", startKey)
    .lte("date", endKey)
    .order("date");
  if (error) throw new Error(`일기 날짜를 불러오지 못했어요: ${error.message}`);
  return (data ?? []) as DiaryEntry[];
}

export type Memory = {
  /** "1달 전" 같은 라벨 */
  label: string;
  date: string;
  content: string;
  mood: string | null;
  photoUrl: string | null;
};

const MEMORY_OFFSETS: { months: number; label: string }[] = [
  { months: 1, label: "1달 전" },
  { months: 3, label: "3달 전" },
  { months: 6, label: "6달 전" },
  { months: 12, label: "1년 전" },
  { months: 24, label: "2년 전" },
];

/** "과거의 오늘" — 1달/3달/6달/1년/2년 전 같은 날의 일기 */
export async function getMemories(todayKey: string): Promise<Memory[]> {
  const keyToLabel = new Map(
    MEMORY_OFFSETS.map(({ months, label }) => [monthsAgoKey(todayKey, months), label])
  );
  const { data, error } = await supabase
    .from("diaries")
    .select("*")
    .in("date", [...keyToLabel.keys()]);
  if (error) throw new Error(`추억을 불러오지 못했어요: ${error.message}`);
  const diaries = (data ?? []) as DiaryRow[];
  if (diaries.length === 0) return [];

  // 각 일기의 첫 사진 하나씩
  const { data: photoRows } = await supabase
    .from("diary_photos")
    .select("*")
    .in("diary_id", diaries.map((d) => d.id))
    .order("position")
    .order("created_at");
  const firstPhotoByDiary = new Map<string, DiaryPhotoRow>();
  for (const p of (photoRows ?? []) as DiaryPhotoRow[]) {
    if (!firstPhotoByDiary.has(p.diary_id)) firstPhotoByDiary.set(p.diary_id, p);
  }
  const signed = await withSignedUrls([...firstPhotoByDiary.values()]);
  const urlByDiary = new Map(signed.map((p) => [p.diary_id, p.url]));

  return diaries
    .map((d) => ({
      label: keyToLabel.get(d.date) ?? "",
      date: d.date,
      // 추억 카드에는 하이라이트가 있으면 그걸 먼저 보여준다
      content: d.highlight || d.content,
      mood: d.mood,
      photoUrl: urlByDiary.get(d.id) ?? null,
    }))
    .sort((a, b) => (a.date < b.date ? 1 : -1)); // 최근 것부터
}
