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
  /** 루틴 관리 */
  Routines: undefined;
  /** AI 리포트 */
  Reports: undefined;
  /** 사진첩 */
  Gallery: undefined;
};

export type MainTabParamList = {
  Calendar: undefined;
  Today: undefined;
  /** 실제 화면 없음 — 탭 버튼이 루트 스택의 Camera를 연다 */
  CameraTab: undefined;
  Search: undefined;
  Settings: undefined;
};

export type RootScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;
