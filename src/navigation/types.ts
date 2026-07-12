import { NativeStackScreenProps } from "@react-navigation/native-stack";

/** 사진 뷰어에 넘기는 사진 한 장 (메타데이터는 있을 때만) */
export type ViewerPhoto = {
  url: string;
  /** diary_photos id — 있으면 하트 토글 가능 */
  id?: string;
  /** 촬영 시각 ISO */
  takenAt?: string | null;
  liked?: boolean;
  /** 원본 파일 storage 경로 (오버레이 합성 사진일 때) */
  originalPath?: string | null;
  /** 촬영 위치 */
  lat?: number | null;
  lng?: number | null;
  place?: string | null;
};

export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  /** date: "YYYY-MM-DD" */
  DayDetail: { date: string };
  /** eventId가 없으면 새 일정 생성. hour는 주간 보기 빈 칸 탭 시 시작 시각 */
  EventEdit: {
    date: string;
    eventId?: string;
    hour?: number;
    /** 자연어 일정 등록(AI 파싱) 결과 프리필 */
    prefill?: {
      title: string;
      startISO: string;
      endISO: string;
      allDay: boolean;
      repeatFreq: "daily" | "weekly" | "monthly" | null;
      reminderMinutes: number | null;
    };
  };
  /** 자연어 일정 등록 */
  QuickAdd: undefined;
  DiaryEdit: { date: string };
  /** 사진 전체화면 보기 */
  PhotoViewer: { photos: ViewerPhoto[]; index: number };
  /** 순간 기록 카메라 (시각 오버레이) */
  Camera: undefined;
  /** 표현 카드 (일기에서 뽑은 영어/일본어 표현) */
  Expressions: undefined;
  /** D-day / 기념일 관리 */
  Anniversaries: undefined;
  /** 방면별 목표 + 갓생 코칭 */
  Goals: undefined;
  /** 인생 타임라인 */
  Timeline: undefined;
  /** 스피치 · 대화 가이드 */
  Speech: undefined;
  /** 운동 기록 */
  Workout: undefined;
  /** 식단 기록 */
  Meals: undefined;
  /** 하지 않기 */
  Avoid: undefined;
  /** 주간 회고 위저드 */
  WeeklyReview: undefined;
  /** 몸·습관 대시보드 */
  Body: undefined;
  /** 리캡: "2026" 또는 "2026-07" */
  Recap: { periodKey: string };
  /** 루틴 플레이어 (풀스크린 진행). slot 없으면 오늘 전체 */
  RoutinePlayer: { slot?: "morning" | "evening" } | undefined;
  /** 뽀모도로 타이머 */
  Pomodoro: undefined;
  /** 생활 기록 (기록용 화면) */
  LifeLog: undefined;
  /** 루틴 관리 */
  Routines: undefined;
  /** 사진첩 (리포트 탭 안에서도 접근하지만, 다른 화면에서 바로 열 때 사용) */
  Gallery: undefined;
  /** 설정 (관심사 탭의 톱니바퀴로 진입) */
  Settings: undefined;
  /** 추억 지도 (위치가 있는 사진 모음) */
  MemoryMap: undefined;
};

export type MainTabParamList = {
  Calendar: undefined;
  Today: undefined;
  /** 실제 화면 없음 — 탭 버튼이 루트 스택의 Camera를 연다 */
  CameraTab: undefined;
  Report: undefined;
  Interests: undefined;
};

export type RootScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;
