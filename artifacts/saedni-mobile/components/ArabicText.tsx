import React from "react";
import { Text, Platform, StyleProp, TextStyle } from "react-native";

type ArabicTextProps = React.ComponentProps<typeof Text> & {
  style?: StyleProp<TextStyle>;
};

/**
 * Right-aligned Arabic text — platform-safe.
 *
 * iOS:  `textAlign:"right"` + `writingDirection:"rtl"`.
 *       iOS handles Arabic direction natively; no I18nManager override needed.
 *
 * Android: `textAlign:"right"` + `alignSelf:"stretch"`.
 *       Fabric/New Architecture sizes Text to its intrinsic content width by
 *       default.  With a narrow box, textAlign:"right" looks left-aligned.
 *       `alignSelf:"stretch"` expands the box to the parent width so the
 *       alignment is visible.  I18nManager.forceRTL is set at app start
 *       (Android only, in _layout.tsx).
 *
 * Row-layout usage (icon + label):
 *   Pass style={{ flex: 1 }} — it overrides alignSelf and lets the text fill
 *   the remaining space next to the icon.
 */
export default function ArabicText({ style, ...props }: ArabicTextProps) {
  const baseStyle: TextStyle = {
    textAlign: "right",
    ...Platform.select({
      ios: {
        writingDirection: "rtl",
      },
      android: {
        alignSelf: "stretch",
      },
    }),
  };

  return (
    <Text
      {...props}
      style={[baseStyle, style]}
    />
  );
}
