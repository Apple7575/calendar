import React from "react";
import { Action } from "../features/routine/ui";

type Props = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "secondary" | "danger";
};

/** Action의 예전 이름. 기존 화면이 그대로 같은 버튼을 쓰도록 위임한다. */
export function PrimaryButton({ title, onPress, disabled, loading, variant = "primary" }: Props) {
  return <Action compact label={title} onPress={onPress} disabled={disabled} loading={loading} variant={variant} />;
}
