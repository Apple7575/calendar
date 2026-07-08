import { useCallback, useEffect, useState } from "react";
import { monthFetchRange } from "../lib/dateUtils";
import { CalendarEvent, mapGoogleEvent } from "../lib/eventMerge";
import * as googleCalendar from "../lib/googleCalendar";
import { GoogleNotLinkedError } from "../lib/googleTokens";

// 월 단위 메모리 캐시. DB에는 캐시하지 않는다 (staleness 문제 회피).
const cache = new Map<string, CalendarEvent[]>();

export function invalidateGoogleCache(): void {
  cache.clear();
}

export type GoogleEventsState = {
  events: CalendarEvent[];
  loading: boolean;
  /** 구글 미연결 (재연결 필요) */
  notLinked: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

/** monthKey("YYYY-MM") 기준 ±1개월의 구글 일정 */
export function useGoogleEvents(monthKey: string): GoogleEventsState {
  const [events, setEvents] = useState<CalendarEvent[]>(cache.get(monthKey) ?? []);
  const [loading, setLoading] = useState(false);
  const [notLinked, setNotLinked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (force: boolean) => {
      if (!force && cache.has(monthKey)) {
        setEvents(cache.get(monthKey)!);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const { timeMin, timeMax } = monthFetchRange(monthKey);
        const items = await googleCalendar.listEvents(timeMin, timeMax);
        const mapped = items
          .map(mapGoogleEvent)
          .filter((e): e is CalendarEvent => e !== null);
        cache.set(monthKey, mapped);
        setEvents(mapped);
        setNotLinked(false);
      } catch (e) {
        if (e instanceof GoogleNotLinkedError) {
          setNotLinked(true);
          setEvents([]);
        } else {
          setError(e instanceof Error ? e.message : "구글 일정을 불러오지 못했어요.");
        }
      } finally {
        setLoading(false);
      }
    },
    [monthKey]
  );

  useEffect(() => {
    load(false);
  }, [load]);

  const refresh = useCallback(async () => {
    await load(true);
  }, [load]);

  return { events, loading, notLinked, error, refresh };
}
