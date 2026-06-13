import axios from "axios";
import { initLlama, releaseAllLlama } from "llama.rn";
import RNFS from "react-native-fs";

import { downloadModel } from "../api/model";

export type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  thought?: string;
  showThought?: boolean;
};

export type LlamaContext = Awaited<ReturnType<typeof initLlama>>;

export const MODEL_FORMATS = [
  { label: "Llama-3.2-1B-Instruct" },
  { label: "Qwen2-0.5B-Instruct" },
  { label: "DeepSeek-R1-Distill-Qwen-1.5B" },
  { label: "SmolLM2-1.7B-Instruct" },
] as const;

export const HF_TO_GGUF = {
  "Llama-3.2-1B-Instruct": "medmekk/Llama-3.2-1B-Instruct.GGUF",
  "DeepSeek-R1-Distill-Qwen-1.5B":
    "medmekk/DeepSeek-R1-Distill-Qwen-1.5B.GGUF",
  "Qwen2-0.5B-Instruct": "medmekk/Qwen2.5-0.5B-Instruct.GGUF",
  "SmolLM2-1.7B-Instruct": "medmekk/SmolLM2-1.7B-Instruct.GGUF",
} as const;

export type ModelFormatLabel = keyof typeof HF_TO_GGUF;

export const RECOMMENDED_MODEL_FORMAT: ModelFormatLabel =
  "Llama-3.2-1B-Instruct";

export const COMPLETION_STOP_WORDS = [
  "</s>",
  "<|end|>",
  "user:",
  "assistant:",
  "<|im_end|>",
  "<|eot_id|>",
  "<|end▁of▁sentence|>",
  "<|end_of_text|>",
  "<｜end▁of▁sentence｜>",
];

export function getHfRepo(modelFormat: string): string | undefined {
  return HF_TO_GGUF[modelFormat as ModelFormatLabel];
}

export function getModelFilePath(modelName: string): string {
  return `${RNFS.DocumentDirectoryPath}/${modelName}`;
}

export function buildGgufDownloadUrl(
  modelFormat: string,
  file: string
): string {
  const repo = getHfRepo(modelFormat);
  if (!repo) {
    throw new Error(`Unknown model format: ${modelFormat}`);
  }
  return `https://huggingface.co/${repo}/resolve/main/${file}`;
}

/** Resolve o arquivo Q6_K do Llama 3.2 1B no repositório HF configurado. */
export async function resolveRecommendedGgufFilename(): Promise<string> {
  const files = await fetchAvailableGGUFs(RECOMMENDED_MODEL_FORMAT);
  const preferred = files.find(
    (file) =>
      /q6_k/i.test(file) &&
      (/llama-3\.2-1b/i.test(file) || /3\.2-1b/i.test(file))
  );
  if (preferred) {
    return preferred;
  }
  const anyQ6 = files.find((file) => /q6_k/i.test(file));
  if (anyQ6) {
    return anyQ6;
  }
  if (files.length === 0) {
    throw new Error("Nenhum arquivo .gguf encontrado para o modelo recomendado.");
  }
  return files[0];
}

export async function fetchAvailableGGUFs(modelFormat: string): Promise<string[]> {
  const repo = getHfRepo(modelFormat);
  if (!repo) {
    throw new Error(`Unknown model format: ${modelFormat}`);
  }

  console.log(repo);
  const response = await axios.get(
    `https://huggingface.co/api/models/${repo}`
  );
  console.log(response);

  const files = response.data.siblings.filter((file: { rfilename: string }) =>
    file.rfilename.endsWith(".gguf")
  );
  return files.map((file: { rfilename: string }) => file.rfilename);
}

export async function checkFileExists(filePath: string): Promise<boolean> {
  try {
    const fileExists = await RNFS.exists(filePath);
    console.log("File exists:", fileExists);
    return fileExists;
  } catch (error) {
    console.error("Error checking file existence:", error);
    return false;
  }
}

export async function listDownloadedGgufModels(): Promise<string[]> {
  const files = await RNFS.readDir(RNFS.DocumentDirectoryPath);
  return files
    .filter((file) => file.name.endsWith(".gguf"))
    .map((file) => file.name);
}

export async function downloadGgufModel(
  file: string,
  modelFormat: string,
  onProgress: (progress: number) => void
): Promise<string> {
  const downloadUrl = buildGgufDownloadUrl(modelFormat, file);
  return downloadModel(file, downloadUrl, onProgress);
}

/** Tamanho mínimo do contexto GGUF (tokens) na inicialização do llama.cpp. */
const LLAMA_MIN_N_CTX = 1024;
const LLAMA_N_CTX = 2048;

export async function loadLlamaModel(modelName: string): Promise<LlamaContext> {
  const destPath = getModelFilePath(modelName);
  console.log("destPath : ", destPath);

  const llamaContext = await initLlama({
    model: destPath,
    use_mlock: true,
    n_ctx: Math.max(LLAMA_MIN_N_CTX, LLAMA_N_CTX),
    n_gpu_layers: 1,
  });

  return llamaContext;
}

export async function releaseAllLlamaModels(): Promise<void> {
  await releaseAllLlama();
}

export async function stopLlamaCompletion(
  context: LlamaContext
): Promise<void> {
  await context.stopCompletion();
}

export type CompletionStreamUpdate = {
  visibleContent: string;
  thought?: string;
};

interface CompletionData {
  token: string;
}

interface CompletionResult {
  timings: {
    predicted_per_second: number;
  };
}

const DEFAULT_MAX_RECENT_MESSAGES = 5;

export const WEB_SEARCH_MAX_RECENT_MESSAGES = 3;

export const DEFAULT_SYSTEM_PROMPT =
  "You are Privami, a private AI assistant. Answer facts precisely based on context.";

export type AiBehaviorParams = {
  temperature: number;
  top_p: number;
  penalty_repeat: number;
};

export const DEFAULT_AI_BEHAVIOR: AiBehaviorParams = {
  temperature: 0.2,
  top_p: 0.9,
  penalty_repeat: 1.1,
};

export type BuildCompletionOptions = {
  maxRecent?: number;
  webSearchContext?: string | null;
  systemPrompt?: string;
};

/** Envia mensagem de sistema + as últimas N mensagens do chat para contexto da IA. */
export function buildCompletionMessages(
  messages: ChatMessage[],
  options?: number | BuildCompletionOptions
): ChatMessage[] {
  const resolvedOptions: BuildCompletionOptions =
    typeof options === "number" ? { maxRecent: options } : options ?? {};

  const maxRecent =
    resolvedOptions.maxRecent ?? DEFAULT_MAX_RECENT_MESSAGES;
  const webSearchContext = resolvedOptions.webSearchContext;

  const systemMessage =
    messages.find((message) => message.role === "system") ?? messages[0];

  const recent = messages
    .filter((message) => message.role !== "system")
    .slice(-maxRecent)
    .map((message) => ({
      role: message.role,
      content: message.content,
    }));

  const baseSystemContent =
    resolvedOptions.systemPrompt?.trim() ||
    systemMessage?.content ||
    DEFAULT_SYSTEM_PROMPT;

  const systemContent = webSearchContext
    ? `${baseSystemContent}\n\n${webSearchContext}`
    : baseSystemContent;

  return [{ role: "system" as const, content: systemContent }, ...recent];
}

export async function runChatCompletion(
  context: LlamaContext,
  messages: ChatMessage[],
  onStreamUpdate: (update: CompletionStreamUpdate) => void,
  aiBehavior: AiBehaviorParams = DEFAULT_AI_BEHAVIOR
): Promise<{ predictedPerSecond: number }> {
  let currentAssistantMessage = "";
  let currentThought = "";
  let inThinkBlock = false;

  const result: CompletionResult = await context.completion(
    {
      messages,
      n_predict: 10000,
      stop: COMPLETION_STOP_WORDS,
      temperature: aiBehavior.temperature,
      top_p: aiBehavior.top_p,
      penalty_repeat: aiBehavior.penalty_repeat,
    },
    (data: CompletionData) => {
      const token = data.token;
      currentAssistantMessage += token;

      if (token.includes("<think>")) {
        inThinkBlock = true;
        currentThought = token.replace("<think>", "");
      } else if (token.includes("</think>")) {
        inThinkBlock = false;
        const finalThought = currentThought
          .replace("</think>", "")
          .trim();

        const contentAfterThoughtRemoval = currentAssistantMessage.replace(
          `<think>${finalThought}</think>`,
          ""
        );

        onStreamUpdate({
          visibleContent: contentAfterThoughtRemoval
            .replace(/<think>.*?<\/think>/gs, "")
            .trim(),
          thought: finalThought,
        });

        currentThought = "";
      } else if (inThinkBlock) {
        currentThought += token;
      }

      const visibleContent = currentAssistantMessage
        .replace(/<think>.*?<\/think>/gs, "")
        .trim();

      onStreamUpdate({ visibleContent });
    }
  );

  return {
    predictedPerSecond: parseFloat(
      result.timings.predicted_per_second.toFixed(2)
    ),
  };
}
