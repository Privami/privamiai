export const COLORS = {
  background: "#000000",
  surface: "#121212",
  surfaceElevated: "#1E1E1E",
  border: "#2C2C2E",
  textPrimary: "#FFFFFF",
  textSecondary: "#8E8E93",
  accent: "#9F7AEA",
  accentMuted: "rgba(159, 122, 234, 0.2)",
  userBubble: "#9F7AEA",
  assistantBubble: "#1E1E1E",
  overlay: "rgba(0, 0, 0, 0.65)",
  danger: "#FF453A",
} as const;

export const markdownStyles = {
  body: { color: COLORS.textPrimary, fontSize: 16, lineHeight: 22 },
  paragraph: { marginTop: 0, marginBottom: 6 },
  heading1: { color: COLORS.textPrimary, fontSize: 22, fontWeight: "700" as const },
  heading2: { color: COLORS.textPrimary, fontSize: 20, fontWeight: "600" as const },
  code_inline: {
    backgroundColor: COLORS.surface,
    color: COLORS.accent,
    borderRadius: 4,
    paddingHorizontal: 4,
  },
  fence: {
    backgroundColor: COLORS.surface,
    color: COLORS.textPrimary,
    borderRadius: 8,
    padding: 8,
  },
  link: { color: COLORS.accent },
  bullet_list: { color: COLORS.textPrimary },
  ordered_list: { color: COLORS.textPrimary },
};
