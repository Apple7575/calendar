import React, { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, fontSizes, radii, spacing } from "../theme/tokens";

type Props = {
  title: string;
  children: ReactNode;
  right?: ReactNode;
};

export function Section({ title, children, right }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {right}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  title: { fontSize: fontSizes.emphasis, fontWeight: "700", color: colors.text },
});
