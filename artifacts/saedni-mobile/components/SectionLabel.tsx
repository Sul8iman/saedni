import React from "react";
import { Text, StyleSheet, StyleProp, TextStyle } from "react-native";

interface Props {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}

/**
 * RTL-safe Arabic section / field label.
 *
 * Guarantees full-width right-aligned RTL text regardless of the parent
 * container's alignItems setting.  Use this for every section heading,
 * field label, and sub-title across all screens.
 */
export default function SectionLabel({ children, style, numberOfLines }: Props) {
  return (
    <Text style={[styles.base, style]} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    width: "100%",
    textAlign: "right",
    alignSelf: "stretch",
    writingDirection: "rtl",
  },
});
