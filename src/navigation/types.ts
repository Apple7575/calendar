import { NativeStackScreenProps } from "@react-navigation/native-stack";

export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  /** date: "YYYY-MM-DD" */
  DayDetail: { date: string };
  /** eventId가 없으면 새 일정 생성 */
  EventEdit: { date: string; eventId?: string };
  DiaryEdit: { date: string };
};

export type MainTabParamList = {
  Calendar: undefined;
  Today: undefined;
  Settings: undefined;
};

export type RootScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;
