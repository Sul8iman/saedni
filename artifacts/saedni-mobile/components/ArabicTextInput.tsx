/**
 * ArabicTextInput — RTL-aware TextInput for Arabic content.
 *
 * Default behaviour:
 *  - textAlign: "right"      — text and cursor anchor to the right on both platforms
 *  - writingDirection: "rtl" — iOS: placeholder text and insertion-point start from the
 *                              right; on Android this prop is silently ignored (Android
 *                              respects I18nManager.forceRTL set in _layout.tsx instead)
 *
 * Overriding:
 *   Pass textAlign or writingDirection as direct props to override the defaults.
 *   Examples:
 *     <ArabicTextInput textAlign="center" keyboardType="number-pad" /> ← OTP / PIN
 *     <ArabicTextInput writingDirection="ltr" />                       ← rare LTR content
 *
 * The component is a forwardRef so parent code can hold a ref to the underlying
 * TextInput (e.g. for focus management or selectTextOnFocus).
 */
import React from "react";
import { TextInput, type TextInputProps } from "react-native";

const ArabicTextInput = React.forwardRef<TextInput, TextInputProps>(
  function ArabicTextInput(
    { textAlign = "right", writingDirection = "rtl", ...props },
    ref,
  ) {
    return (
      <TextInput
        ref={ref}
        textAlign={textAlign}
        writingDirection={writingDirection}
        {...props}
      />
    );
  },
);

ArabicTextInput.displayName = "ArabicTextInput";
export default ArabicTextInput;
