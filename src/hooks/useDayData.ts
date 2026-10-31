import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState,useRef } from "react";
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
  const sequence=useRef(0);

  const reload = useCallback(async () => {
    const ticket=++sequence.current;
    setLoading(true);setEventRows([]);setTasks([]);setDiary({diary:null,photos:[]});setRoutines([]);setCheckedRoutineIds(new Set());
    setError(null);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { start, end } = dayBounds(dateKey);
      const [rows, taskRows, diaryData, allRoutines, checked] = await Promise.allSettled([
        listLocalEventsInRange(start, end),
        listTasks(dateKey),
        getDiaryWithPhotos(dateKey),
        listRoutines(),
        listCheckedRoutineIds(dateKey),
      ]);
      if(ticket!==sequence.current)return;
      if(rows.status==='fulfilled')setEventRows(rows.value);
      if(taskRows.status==='fulfilled')setTasks(taskRows.value);
      if(diaryData.status==='fulfilled')setDiary(diaryData.value);
      if(allRoutines.status==='fulfilled')setRoutines(routinesForDate(allRoutines.value,dateKey));
      if(checked.status==='fulfilled')setCheckedRoutineIds(checked.value);
      if([rows,taskRows,diaryData,allRoutines,checked].some(r=>r.status==='rejected'))setError('일부 기록을 불러오지 못했어요. 불러온 기록은 계속 볼 수 있어요. 아래로 당겨 다시 시도해 주세요.');
    } catch (e) {
      if(ticket===sequence.current)setError('기록에 연결하지 못했어요. 계정 연결을 확인하고 다시 시도해 주세요.');
    } finally {
      if(ticket===sequence.current)setLoading(false);
    }
  }, [dateKey]);

  useFocusEffect(
    useCallback(() => {
      void reload();return()=>{sequence.current++};
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
