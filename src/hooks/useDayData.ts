import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { dayBounds } from "../lib/dateUtils";
import { DiaryWithPhotos, getDiaryWithPhotos } from "../lib/diary";
import { CalendarEvent } from "../lib/eventMerge";
import { listLocalEventsInRange } from "../lib/events";
import { expandEventRows } from "../lib/recurrence";
import { listCheckedRoutineIds, listRoutines, routinesForDate } from "../lib/routines";
import { EventRow, RoutineRow, supabase, TaskRow } from "../lib/supabase";
import { listTasks } from "../lib/tasks";

export type DayData = {
  localEvents: CalendarEvent[];
  eventRows: EventRow[];
  tasks: TaskRow[];
  routines: RoutineRow[];
  checkedRoutineIds: Set<string>;
  diary: DiaryWithPhotos;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

/** 특정 날짜의 로컬 데이터(일정/할 일/일기). 화면 포커스마다 새로 불러온다. */
export function useDayData(dateKey: string): DayData {
  const [eventRows, setEventRows] = useState<EventRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [routines, setRoutines] = useState<RoutineRow[]>([]);
  const [checkedRoutineIds, setCheckedRoutineIds] = useState<Set<string>>(new Set());
  const [diary, setDiary] = useState<DiaryWithPhotos>({ diary: null, photos: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setError(null);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { start, end } = dayBounds(dateKey);
      const [rows, taskRows, diaryData, allRoutines, checked] = await Promise.all([
        listLocalEventsInRange(start, end),
        listTasks(dateKey),
        getDiaryWithPhotos(dateKey),
        listRoutines(),
        listCheckedRoutineIds(dateKey),
      ]);
      setEventRows(rows);
      setTasks(taskRows);
      setDiary(diaryData);
      setRoutines(routinesForDate(allRoutines, dateKey));
      setCheckedRoutineIds(checked);
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

  const { start, end } = dayBounds(dateKey);
  return {
    localEvents: expandEventRows(eventRows, start, end),
    eventRows,
    tasks,
    routines,
    checkedRoutineIds,
    diary,
    loading,
    error,
    reload,
  };
}
