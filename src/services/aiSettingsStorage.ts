import RNFS from "react-native-fs";

import {
  DEFAULT_AI_BEHAVIOR,
  DEFAULT_SYSTEM_PROMPT,
} from "./aiService";

export type AiSettingsStore = {
  systemPrompt: string;
  temperature: number;
  topP: number;
  repeatPenalty: number;
};

const SETTINGS_PATH = `${RNFS.DocumentDirectoryPath}/ai_settings.json`;

export const AI_SETTINGS_PATH = SETTINGS_PATH;

const DEFAULT_AI_SETTINGS: AiSettingsStore = {
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  temperature: DEFAULT_AI_BEHAVIOR.temperature,
  topP: DEFAULT_AI_BEHAVIOR.top_p,
  repeatPenalty: DEFAULT_AI_BEHAVIOR.penalty_repeat,
};

function normalizeAiSettings(raw: Partial<AiSettingsStore>): AiSettingsStore {
  return {
    systemPrompt:
      typeof raw.systemPrompt === "string" && raw.systemPrompt.trim()
        ? raw.systemPrompt
        : DEFAULT_AI_SETTINGS.systemPrompt,
    temperature:
      typeof raw.temperature === "number" && !Number.isNaN(raw.temperature)
        ? raw.temperature
        : DEFAULT_AI_SETTINGS.temperature,
    topP:
      typeof raw.topP === "number" && !Number.isNaN(raw.topP)
        ? raw.topP
        : DEFAULT_AI_SETTINGS.topP,
    repeatPenalty:
      typeof raw.repeatPenalty === "number" && !Number.isNaN(raw.repeatPenalty)
        ? raw.repeatPenalty
        : DEFAULT_AI_SETTINGS.repeatPenalty,
  };
}

export async function loadAiSettings(): Promise<AiSettingsStore> {
  const exists = await RNFS.exists(SETTINGS_PATH);

  if (!exists) {
    const defaults = { ...DEFAULT_AI_SETTINGS };
    await saveAiSettings(defaults);
    return defaults;
  }

  try {
    const raw = await RNFS.readFile(SETTINGS_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<AiSettingsStore>;
    return normalizeAiSettings(parsed);
  } catch (error) {
    console.error("Failed to load AI settings:", error);
    const defaults = { ...DEFAULT_AI_SETTINGS };
    await saveAiSettings(defaults);
    return defaults;
  }
}

export async function saveAiSettings(settings: AiSettingsStore): Promise<void> {
  const payload = normalizeAiSettings(settings);
  await RNFS.writeFile(SETTINGS_PATH, JSON.stringify(payload), "utf8");
}
