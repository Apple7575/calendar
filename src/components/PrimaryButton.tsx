import React, { useMemo,useState } from "react";
import {useReducedMotion} from '../features/routine/motion';
import {tapLight} from '../lib/haptics';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { ThemeColors } from "../theme/themes";
import { fontSizes, minTouch, radii, spacing } from "../theme/tokens";

type Props = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "secondary" | "danger";
};

export function PrimaryButton({ title, onPress, disabled, loading, variant = "primary" }: Props) {
  const { colors: c,isDark } = useTheme(),reduced=useReducedMotion(),[pressed,setPressed]=useState(false);
  const styles = useMemo(() => createStyles(c), [c]);
  const isDisabled = disabled || loading;
  return (
    <TouchableOpacity
      style={[styles.button, styles[variant],{borderBottomWidth:pressed?1:4,borderColor:c.border,transform:[{translateY:pressed&&!reduced?3:0}]}, isDisabled && styles.disabled]}
      onPress={()=>{tapLight();onPress()}} onPressIn={()=>setPressed(true)} onPressOut={()=>setPressed(false)}
      disabled={isDisabled}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={variant === "secondary" ? c.primary : c.white} />
      ) : (
        <Text style={[styles.label, variant === "secondary" && styles.labelSecondary,isDark&&variant==='primary'?{color:c.background}:null]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    button: {
      minHeight: minTouch + 6,
      borderRadius: radii.button,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
    },
    primary: {
      backgroundColor: c.primary,
      shadowColor: c.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 3,
    },
    secondary: {
      backgroundColor: c.primarySoft,
      borderWidth: 1.5,
      borderColor: c.primary,
    },
    danger: { backgroundColor: c.danger },
    disabled: { opacity: 0.5 },
    label: { color: c.white, fontSize: fontSizes.body, fontWeight: "700" },
    labelSecondary: { color: c.primary },
  });
