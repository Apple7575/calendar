import React, { useLayoutEffect } from "react";
import { DayOverview } from "../components/DayOverview";
import { formatKoreanDate } from "../lib/dateUtils";
import { RootScreenProps } from "../navigation/types";

export function DayDetailScreen({ route, navigation }: RootScreenProps<"DayDetail">) {
  const { date } = route.params;

  useLayoutEffect(() => {
    navigation.setOptions({ title: formatKoreanDate(date) });
  }, [navigation, date]);

  return (
    <DayOverview
      dateKey={date}
      onEditEvent={(eventId) => navigation.navigate("EventEdit", { date, eventId })}
      onEditDiary={() => navigation.navigate("DiaryEdit", { date })}
      onGoSettings={() => navigation.navigate("Main")}
      onOpenPhotos={(photos, index) => navigation.navigate("PhotoViewer", { photos, index })}
      onManageRoutines={() => navigation.navigate("Routines")}
    />
  );
}
