import RNFS from "react-native-fs";

import { RECOMMENDED_MODEL_FORMAT } from "./aiService";

export type ModelPrefs = {
  lastModelFile: string | null;
  lastModelFormat: string | null;
};

const PREFS_DIR = `${RNFS.DocumentDirectoryPath}/chat-history`;
const PREFS_FILE = `${PREFS_DIR}/model-prefs.json`;

const DEFAULT_PREFS: ModelPrefs = {
  lastModelFile: null,
  lastModelFormat: RECOMMENDED_MODEL_FORMAT,
};

async function ensurePrefsDirectory(): Promise<void> {
  const exists = await RNFS.exists(PREFS_DIR);
  if (!exists) {
    await RNFS.mkdir(PREFS_DIR);
  }
}

export async function loadModelPrefs(): Promise<ModelPrefs> {
  await ensurePrefsDirectory();

  const exists = await RNFS.exists(PREFS_FILE);
  if (!exists) {
    return { ...DEFAULT_PREFS };
  }

  try {
    const raw = await RNFS.readFile(PREFS_FILE, "utf8");
    const parsed = JSON.parse(raw) as ModelPrefs;
    return {
      lastModelFile:
        typeof parsed.lastModelFile === "string" ? parsed.lastModelFile : null,
      lastModelFormat:
        typeof parsed.lastModelFormat === "string"
          ? parsed.lastModelFormat
          : RECOMMENDED_MODEL_FORMAT,
    };
  } catch (error) {
    console.error("Failed to load model preferences:", error);
    return { ...DEFAULT_PREFS };
  }
}

export async function saveModelPrefs(prefs: ModelPrefs): Promise<void> {
  await ensurePrefsDirectory();
  await RNFS.writeFile(PREFS_FILE, JSON.stringify(prefs), "utf8");
}
