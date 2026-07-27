import React from "react";
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  TouchableWithoutFeedback,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  visible: boolean;
  onClose: () => void;
  message?: string;
}

export default function GuestWall({ visible, onClose, message }: Props) {
  const colors = useColors();
  const router = useRouter();
  const { exitGuestMode } = useAuth();
  const s = makeStyles(colors);

  function handleLogin() {
    onClose();
    exitGuestMode();
    router.replace("/(auth)/login");
  }

  function handleRegister() {
    onClose();
    exitGuestMode();
    router.replace("/(auth)/register");
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={s.overlay} />
      </TouchableWithoutFeedback>

      <View style={s.sheetWrapper} pointerEvents="box-none">
        <View style={s.sheet}>
          {/* Handle */}
          <View style={s.handle} />

          {/* Icon */}
          <View style={s.iconWrap}>
            <Ionicons name="lock-closed" size={32} color={colors.primary} />
          </View>

          {/* Title */}
          <Text style={s.title}>تسجيل الدخول مطلوب</Text>

          {/* Message */}
          <Text style={s.message}>
            {message ?? "سجّل الدخول أو أنشئ حساباً للتواصل مع أصحاب الطلبات وقبولها"}
          </Text>

          {/* Actions */}
          <TouchableOpacity style={s.loginBtn} onPress={handleLogin} activeOpacity={0.85}>
            <Text style={s.loginBtnTxt}>تسجيل الدخول</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.registerBtn} onPress={handleRegister} activeOpacity={0.85}>
            <Text style={s.registerBtnTxt}>إنشاء حساب جديد</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.cancelBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={s.cancelBtnTxt}>تصفح كضيف</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (c: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.5)",
    },
    sheetWrapper: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: c.card,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingHorizontal: 24,
      paddingTop: 12,
      paddingBottom: 36,
      alignItems: "center",
    },
    handle: {
      width: 40, height: 4, borderRadius: 2,
      backgroundColor: c.border, marginBottom: 24,
    },
    iconWrap: {
      width: 64, height: 64, borderRadius: 20,
      backgroundColor: c.secondary,
      alignItems: "center", justifyContent: "center",
      marginBottom: 16,
    },
    title: {
      fontSize: 20, fontWeight: "800", color: c.foreground,
      textAlign: "center", marginBottom: 10,
    },
    message: {
      fontSize: 14, color: c.mutedForeground, textAlign: "center",
      lineHeight: 22, marginBottom: 28, paddingHorizontal: 8,
    },
    loginBtn: {
      backgroundColor: c.primary, borderRadius: 14,
      paddingVertical: 15, alignItems: "center",
      width: "100%", marginBottom: 10,
    },
    loginBtnTxt: {
      color: c.primaryForeground, fontSize: 16, fontWeight: "700",
    },
    registerBtn: {
      backgroundColor: c.secondary, borderRadius: 14,
      paddingVertical: 15, alignItems: "center",
      width: "100%", marginBottom: 10,
      borderWidth: 1.5, borderColor: c.primary,
    },
    registerBtnTxt: {
      color: c.primary, fontSize: 16, fontWeight: "700",
    },
    cancelBtn: {
      paddingVertical: 10, alignItems: "center", width: "100%",
    },
    cancelBtnTxt: {
      color: c.mutedForeground, fontSize: 14, fontWeight: "500",
    },
  });
