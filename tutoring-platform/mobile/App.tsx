import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";

import { enableRTL } from "./src/i18n/rtl";
import { USER_ROLES, ROLE_LABELS_AR } from "./src/types/roles";

// تفعيل اتجاه RTL عند إقلاع التطبيق (قبل رسم الواجهة).
enableRTL();

/**
 * شاشة تحقّق مؤقتة تؤكد أن الإعداد الأساسي يعمل:
 * - اتجاه RTL مُفعّل.
 * - الأدوار الثلاثة معرّفة.
 * لم تُبنَ أي شاشات فعلية بعد (تسجيل دخول/طالب/معلّم/أدمن) حسب المطلوب.
 */
export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>مدرستي</Text>
      <Text style={styles.subtitle}>منصة تعليمية عربية</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>الإعداد الأساسي جاهز ✅</Text>
        <Text style={styles.line}>• اتجاه RTL مُفعّل</Text>
        <Text style={styles.line}>• عميل Supabase مُهيّأ</Text>
        <Text style={styles.line}>
          • الأدوار: {USER_ROLES.map((r) => ROLE_LABELS_AR[r]).join("، ")}
        </Text>
      </View>

      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 34,
    fontWeight: "700",
    color: "#0f766e",
  },
  subtitle: {
    fontSize: 16,
    color: "#475569",
    marginTop: 4,
    marginBottom: 28,
  },
  card: {
    width: "100%",
    backgroundColor: "#f0fdfa",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#99f6e4",
    padding: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0f766e",
    marginBottom: 12,
  },
  line: {
    fontSize: 15,
    color: "#334155",
    lineHeight: 26,
  },
});
