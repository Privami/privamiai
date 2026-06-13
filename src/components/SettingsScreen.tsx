import React from "react";
import {
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { COLORS } from "../theme/amoled";

const RENEW_SUBSCRIPTION_URL = "https://google.com";

type SettingsScreenProps = {
  onBack: () => void;
  systemPrompt: string;
  onSystemPromptChange: (value: string) => void;
  systemTemperature: string;
  onSystemTemperatureChange: (value: string) => void;
  systemTopP: string;
  onSystemTopPChange: (value: string) => void;
  systemRepeatPenalty: string;
  onSystemRepeatPenaltyChange: (value: string) => void;
};

function clampNumericOnBlur(
  value: string,
  min: number,
  max: number,
  fallback: string
): string {
  const num = parseFloat(value);
  if (Number.isNaN(num)) {
    return fallback;
  }
  return String(Math.min(max, Math.max(min, num)));
}

function handleNumericChange(
  text: string,
  min: number,
  max: number,
  setter: (value: string) => void
): void {
  const cleaned = text.replace(/[^0-9.]/g, "");
  if (cleaned === "" || cleaned === ".") {
    setter(cleaned);
    return;
  }
  const num = parseFloat(cleaned);
  if (Number.isNaN(num)) {
    return;
  }
  if (num > max) {
    setter(String(max));
    return;
  }
  setter(cleaned);
}

function SettingsScreen({
  onBack,
  systemPrompt,
  onSystemPromptChange,
  systemTemperature,
  onSystemTemperatureChange,
  systemTopP,
  onSystemTopPChange,
  systemRepeatPenalty,
  onSystemRepeatPenaltyChange,
}: SettingsScreenProps): React.JSX.Element {
  const openRenewSubscription = () => {
    void Linking.openURL(RENEW_SUBSCRIPTION_URL);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={0.7}
          accessibilityLabel="Voltar ao chat"
        >
          <Text style={styles.backButtonText}>← Return</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >

        <View style={styles.sectionBox}>
          <Text style={styles.sectionTitle}>AI Behavior</Text>

          <Text style={styles.fieldLabel}>System Prompt</Text>
          <TextInput
            style={styles.systemPromptInput}
            value={systemPrompt}
            onChangeText={onSystemPromptChange}
            multiline
            placeholderTextColor={COLORS.textSecondary}
            textAlignVertical="top"
            scrollEnabled={false}
          />

          <Text style={styles.fieldLabel}>Temperature</Text>
          <TextInput
            style={styles.numericInput}
            value={systemTemperature}
            onChangeText={(text) =>
              handleNumericChange(text, 0, 1.5, onSystemTemperatureChange)
            }
            onBlur={() =>
              onSystemTemperatureChange(
                clampNumericOnBlur(systemTemperature, 0, 1.5, "0.2")
              )
            }
            keyboardType="decimal-pad"
            placeholderTextColor={COLORS.textSecondary}
          />

          <Text style={styles.fieldLabel}>Top-P</Text>
          <TextInput
            style={styles.numericInput}
            value={systemTopP}
            onChangeText={(text) =>
              handleNumericChange(text, 0.1, 1, onSystemTopPChange)
            }
            onBlur={() =>
              onSystemTopPChange(clampNumericOnBlur(systemTopP, 0.1, 1, "0.9"))
            }
            keyboardType="decimal-pad"
            placeholderTextColor={COLORS.textSecondary}
          />

          <Text style={styles.fieldLabel}>Repeat Penalty</Text>
          <TextInput
            style={[styles.numericInput, styles.numericInputLast]}
            value={systemRepeatPenalty}
            onChangeText={(text) =>
              handleNumericChange(text, 1, 1.5, onSystemRepeatPenaltyChange)
            }
            onBlur={() =>
              onSystemRepeatPenaltyChange(
                clampNumericOnBlur(systemRepeatPenalty, 1, 1.5, "1.1")
              )
            }
            keyboardType="decimal-pad"
            placeholderTextColor={COLORS.textSecondary}
          />
        </View>

        <TouchableOpacity
          style={styles.renewBox}
          onPress={openRenewSubscription}
          activeOpacity={0.85}
          accessibilityLabel="Renew your subscription"
        >
          <Text style={styles.renewText}>Renew your subscription</Text>
          <Text style={styles.renewIcon}>↗️</Text>
        </TouchableOpacity>
      </ScrollView>

      <Text style={styles.versionFooter}>Version 1.0.2</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    minWidth: 88,
    paddingHorizontal: 8,
    paddingVertical: 8,
    alignSelf: "center",
  },
  backButtonText: {
    color: COLORS.accent,
    fontSize: 16,
    fontWeight: "600",
  },
  headerTitle: {
    position: "absolute",
    left: 0,
    right: 0,
    textAlign: "center",
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: 0.2,
    pointerEvents: "none",
  },
  headerSpacer: {
    minWidth: 88,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32,
    gap: 16,
  },
  sectionBox: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 14,
    textAlign: "center",
  },
  fieldLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 4,
  },
  systemPromptInput: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: "#FFFFFF",
    fontSize: 14,
    lineHeight: 20,
    minHeight: 100,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  numericInput: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: "#FFFFFF",
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  numericInputLast: {
    marginBottom: 0,
  },
  renewBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  renewText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  renewIcon: {
    position: "absolute",
    right: 16,
    fontSize: 18,
  },
  versionFooter: {
    color: COLORS.textSecondary,
    fontSize: 12,
    textAlign: "center",
    paddingVertical: 16,
    paddingBottom: Platform.OS === "ios" ? 8 : 16,
  },
});

export default SettingsScreen;
