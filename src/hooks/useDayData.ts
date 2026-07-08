import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { dayBounds } from "../lib/dateUtils";
import { DiaryWithPhotos, getDiaryWithPhotos } from "../lib/diary";
import { CalendarEvent } from "../lib/eventMerge";
import { listLocalEventsInRange, toCalendarEvent } from "../lib/events";
import { EventRow, supabase, TaskRow } from "../lib/supabase";
import { listTasks } from "../lib/tasks";

export type DayData = {
  localEvents: CalendarEvent[];
  eventRows: EventRow[];
  tasks: TaskRow[];
  diary: DiaryWithPhotos;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

/** 특정 날짜의 로컬 데이터(일정/할 일/일기). 화면 포커스마다 새로 불러온다. */
export function useDayData(dateKey: string): DayData {
  const [eventRows, setEventRows] = useState<EventRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [diary, setDiary] = useState<DiaryWithPhotos>({ diary: null, photos: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setError(null);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { start, end } = dayBounds(dateKey);
      const [rows, taskRows, diaryData] = await Promise.all([
        listLocalEventsInRange(start, end),
        listTasks(dateKey),
        getDiaryWithPhotos(dateKey),
      ]);
      setEventRows(rows);
      setTasks(taskRows);
      setDiary(diaryData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "데이터를 불러오지 못했어요.");
    } finally {
      setLoading(false);
    }
  }, [dateKey]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  return {
    localEvents: eventRows.map(toCalendarEvent),
    eventRows,
    tasks,
    diary,
    loading,
    error,
    reload,
  };
}
