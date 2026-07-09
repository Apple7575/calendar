import { NativeStackScreenProps } from "@react-navigation/native-stack";

export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  /** date: "YYYY-MM-DD" */
  DayDetail: { date: string };
  /** eventId가 없으면 새 일정 생성. hour는 주간 보기 빈 칸 탭 시 시작 시각 */
  EventEdit: { date: string; eventId?: string; hour?: number };
  DiaryEdit: { date: string };
  /** 사진 전체화면 보기 */
  PhotoViewer: { urls: string[]; index: number };
  /** 루틴 관리 */
  Routines: undefined;
  /** AI 리포트 */
  Reports: undefined;
};

export type MainTabParamList = {
  Calendar: undefined;
  Today: undefined;
  Search: undefined;
  Settings: undefined;
};

export type RootScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;
