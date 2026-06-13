import RNFS from "react-native-fs";

export type SettingsStore = {
  accessKey: string;
};

const SETTINGS_DIR = `${RNFS.DocumentDirectoryPath}/chat-history`;
const SETTINGS_FILE = `${SETTINGS_DIR}/settings.json`;

const DEFAULT_SETTINGS: SettingsStore = {
  accessKey: "",
};

async function ensureSettingsDirectory(): Promise<void> {
  const exists = await RNFS.exists(SETTINGS_DIR);
  if (!exists) {
    await RNFS.mkdir(SETTINGS_DIR);
  }
}

export async function loadSettingsStore(): Promise<SettingsStore> {
  await ensureSettingsDirectory();

  const exists = await RNFS.exists(SETTINGS_FILE);
  if (!exists) {
    return { ...DEFAULT_SETTINGS };
  }

  try {
    const raw = await RNFS.readFile(SETTINGS_FILE, "utf8");
    const parsed = JSON.parse(raw) as SettingsStore;
    return {
      accessKey:
        typeof parsed.accessKey === "string" ? parsed.accessKey : "",
    };
  } catch (error) {
    console.error("Failed to load settings:", error);
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettingsStore(settings: SettingsStore): Promise<void> {
  await ensureSettingsDirectory();
  await RNFS.writeFile(SETTINGS_FILE, JSON.stringify(settings), "utf8");
}
