import React, { useState, useRef, useEffect } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Alert,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StatusBar,
} from "react-native";

import Markdown from "react-native-markdown-display";

import ChatSidebar from "./src/components/ChatSidebar";
import ProgressBar from "./src/components/ProgressBar";
import SettingsScreen from "./src/components/SettingsScreen";
import { COLORS, markdownStyles } from "./src/theme/amoled";
import {
  type ChatMessage,
  type LlamaContext,
  MODEL_FORMATS,
  buildCompletionMessages,
  DEFAULT_AI_BEHAVIOR,
  DEFAULT_SYSTEM_PROMPT,
  WEB_SEARCH_MAX_RECENT_MESSAGES,
  checkFileExists,
  downloadGgufModel,
  fetchAvailableGGUFs,
  getModelFilePath,
  listDownloadedGgufModels,
  loadLlamaModel,
  RECOMMENDED_MODEL_FORMAT,
  releaseAllLlamaModels,
  resolveRecommendedGgufFilename,
  runChatCompletion,
  stopLlamaCompletion,
} from "./src/services/aiService";
import {
  type ChatSession,
  generateChatId,
  loadChatsStore,
  saveChatsStore,
  titleFromFirstMessage,
} from "./src/services/chatStorage";
import { loadModelPrefs, saveModelPrefs } from "./src/services/modelStorage";
import {
  loadAiSettings,
  saveAiSettings,
  type AiSettingsStore,
} from "./src/services/aiSettingsStorage";
import { loadSettingsStore } from "./src/services/settingsStorage";
import { fetchWebSearchContext } from "./src/services/webSearchService";

type AppStatus = "checking" | "loading_model" | "no_model" | "ready";

const delay = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

function App(): React.JSX.Element {
  const INITIAL_CONVERSATION: ChatMessage[] = [
    {
      role: "system",
      content: DEFAULT_SYSTEM_PROMPT,
    },
  ];
  const [context, setContext] = useState<LlamaContext | null>(null);
  const [conversation, setConversation] =
    useState<ChatMessage[]>(INITIAL_CONVERSATION);
  const [userInput, setUserInput] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [selectedModelFormat, setSelectedModelFormat] = useState<string>("");
  const [selectedGGUF, setSelectedGGUF] = useState<string | null>(null);
  const [availableGGUFs, setAvailableGGUFs] = useState<string[]>([]); // List of .gguf files
  const [currentPage, setCurrentPage] = useState<
    "modelSelection" | "conversation" | "settings"
  >("conversation");
  const [accessKey, setAccessKey] = useState<string>("");
  const [systemPrompt, setSystemPrompt] = useState<string>(DEFAULT_SYSTEM_PROMPT);
  const [systemTemperature, setSystemTemperature] = useState<string>(
    String(DEFAULT_AI_BEHAVIOR.temperature)
  );
  const [systemTopP, setSystemTopP] = useState<string>(
    String(DEFAULT_AI_BEHAVIOR.top_p)
  );
  const [systemRepeatPenalty, setSystemRepeatPenalty] = useState<string>(
    String(DEFAULT_AI_BEHAVIOR.penalty_repeat)
  );
  const [appStatus, setAppStatus] = useState<AppStatus>("checking");
  const [loadingOverlayText, setLoadingOverlayText] =
    useState<string>("Loading model...");
  const [showCustomModelPicker, setShowCustomModelPicker] =
    useState<boolean>(false);
  const [tokensPerSecond, setTokensPerSecond] = useState<number[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const [isWebSearchEnabled, setIsWebSearchEnabled] = useState<boolean>(false);
  const [downloadedModels, setDownloadedModels] = useState<string[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [newChatTitle, setNewChatTitle] = useState<string>("");
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollPositionRef = useRef(0);
  const contentHeightRef = useRef(0);
  const conversationRef = useRef<ChatMessage[]>(INITIAL_CONVERSATION);
  const tokensPerSecondRef = useRef<number[]>([]);
  const activeChatIdRef = useRef<string | null>(null);
  const chatsRef = useRef<ChatSession[]>([]);
  const bootstrapStarted = useRef(false);

  const buildAiSettingsPayload = (
    prompt: string,
    temperature: string,
    topP: string,
    repeatPenalty: string
  ): AiSettingsStore => ({
    systemPrompt: prompt,
    temperature: parseFloat(temperature) || DEFAULT_AI_BEHAVIOR.temperature,
    topP: parseFloat(topP) || DEFAULT_AI_BEHAVIOR.top_p,
    repeatPenalty:
      parseFloat(repeatPenalty) || DEFAULT_AI_BEHAVIOR.penalty_repeat,
  });

  const persistAiSettings = (
    prompt: string,
    temperature: string,
    topP: string,
    repeatPenalty: string
  ) => {
    void saveAiSettings(
      buildAiSettingsPayload(prompt, temperature, topP, repeatPenalty)
    );
  };

  const handleSystemPromptChange = (value: string) => {
    setSystemPrompt(value);
    persistAiSettings(
      value,
      systemTemperature,
      systemTopP,
      systemRepeatPenalty
    );
  };

  const handleSystemTemperatureChange = (value: string) => {
    setSystemTemperature(value);
    persistAiSettings(systemPrompt, value, systemTopP, systemRepeatPenalty);
  };

  const handleSystemTopPChange = (value: string) => {
    setSystemTopP(value);
    persistAiSettings(
      systemPrompt,
      systemTemperature,
      value,
      systemRepeatPenalty
    );
  };

  const handleSystemRepeatPenaltyChange = (value: string) => {
    setSystemRepeatPenalty(value);
    persistAiSettings(systemPrompt, systemTemperature, systemTopP, value);
  };

  useEffect(() => {
    conversationRef.current = conversation;
  }, [conversation]);

  useEffect(() => {
    tokensPerSecondRef.current = tokensPerSecond;
  }, [tokensPerSecond]);

  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  useEffect(() => {
    chatsRef.current = chats;
  }, [chats]);

  const persistChatsToDisk = async (
    nextChats: ChatSession[],
    nextActiveId: string | null
  ) => {
    await saveChatsStore({ chats: nextChats, activeChatId: nextActiveId });
  };

  const hasUserMessages = (messages: ChatMessage[]) =>
    messages.some((message) => message.role === "user");

  const persistActiveChatState = async (
    messages: ChatMessage[],
    tokens: number[],
    chatId: string | null = activeChatIdRef.current
  ) => {
    if (!chatId || !hasUserMessages(messages)) {
      return;
    }

    const nextChats = chatsRef.current.map((chat) =>
      chat.id === chatId
        ? {
            ...chat,
            messages,
            tokensPerSecond: tokens,
            updatedAt: Date.now(),
          }
        : chat
    );

    chatsRef.current = nextChats;
    setChats(nextChats);
    await persistChatsToDisk(nextChats, chatId);
  };

  const flushCurrentChatBeforeSwitch = async () => {
    const chatId = activeChatIdRef.current;
    if (!chatId) {
      return;
    }
    await persistActiveChatState(
      conversationRef.current,
      tokensPerSecondRef.current,
      chatId
    );
  };

  const resetToCleanChat = () => {
    setConversation(INITIAL_CONVERSATION);
    conversationRef.current = INITIAL_CONVERSATION;
    setActiveChatId(null);
    activeChatIdRef.current = null;
    setTokensPerSecond([]);
    tokensPerSecondRef.current = [];
    setUserInput("");
  };

  const finishStartupReady = async () => {
    setLoadingOverlayText("Done!");
    await delay(1000);
    resetToCleanChat();
    setShowCustomModelPicker(false);
    setCurrentPage("conversation");
    setAppStatus("ready");
  };

  const pickModelToAutoLoad = (
    ggufFiles: string[],
    prefs: Awaited<ReturnType<typeof loadModelPrefs>>
  ): { file: string; format: string } => {
    if (prefs.lastModelFile && ggufFiles.includes(prefs.lastModelFile)) {
      return {
        file: prefs.lastModelFile,
        format: prefs.lastModelFormat ?? RECOMMENDED_MODEL_FORMAT,
      };
    }

    const q6File =
      ggufFiles.find((file) => /q6_k/i.test(file)) ?? ggufFiles[0];
    const format = /llama-3\.2-1b/i.test(q6File)
      ? RECOMMENDED_MODEL_FORMAT
      : prefs.lastModelFormat ?? RECOMMENDED_MODEL_FORMAT;

    return { file: q6File, format };
  };

  const autoLoadModelFile = async (modelFile: string, modelFormat: string) => {
    setAppStatus("loading_model");
    setLoadingOverlayText("Loading model...");
    const success = await loadModel(modelFile, {
      silent: true,
      modelFormat,
    });
    if (success) {
      await finishStartupReady();
      return true;
    }
    setAppStatus("no_model");
    return false;
  };

  const bootstrapApp = async () => {
    setAppStatus("checking");
    setLoadingOverlayText("Verifying Models...");

    const store = await loadChatsStore();
    setChats(store.chats);
    chatsRef.current = store.chats;

    const ggufFiles = await listDownloadedGgufModels();
    setDownloadedModels(ggufFiles);

    if (ggufFiles.length === 0) {
      setAppStatus("no_model");
      return;
    }

    const prefs = await loadModelPrefs();
    const { file, format } = pickModelToAutoLoad(ggufFiles, prefs);
    await autoLoadModelFile(file, format);
  };

  useEffect(() => {
    if (bootstrapStarted.current) {
      return;
    }
    bootstrapStarted.current = true;
    void bootstrapApp();
  }, []);

  useEffect(() => {
    void loadSettingsStore().then((settings) => {
      setAccessKey(settings.accessKey);
    });
  }, []);

  useEffect(() => {
    void loadAiSettings().then((settings) => {
      setSystemPrompt(settings.systemPrompt);
      setSystemTemperature(String(settings.temperature));
      setSystemTopP(String(settings.topP));
      setSystemRepeatPenalty(String(settings.repeatPenalty));
    });
  }, []);

  const handleGGUFSelection = (file: string) => {
    setSelectedGGUF(file);
    Alert.alert(
      "Confirm Download",
      `Do you want to download ${file} ?`,
      [
        {
          text: "No",
          onPress: () => setSelectedGGUF(null),
          style: "cancel",
        },
        { text: "Yes", onPress: () => handleDownloadAndNavigate(file) },
      ],
      { cancelable: false }
    );
  };

  const handleDownloadAndNavigate = async (file: string) => {
    const success = await handleDownloadModel(file, {
      skipAlerts: true,
      modelFormat: selectedModelFormat || RECOMMENDED_MODEL_FORMAT,
    });
    if (success) {
      await finishStartupReady();
    }
  };

  const handleBackToModelSelection = () => {
    setContext(null);
    releaseAllLlamaModels();
    setConversation(INITIAL_CONVERSATION);
    setSelectedGGUF(null);
    setTokensPerSecond([]);
    setCurrentPage("modelSelection");
  };

  const clearChatTitleEditing = () => {
    setEditingChatId(null);
    setNewChatTitle("");
  };

  const handleNewChat = async () => {
    await flushCurrentChatBeforeSwitch();
    clearChatTitleEditing();
    setActiveChatId(null);
    activeChatIdRef.current = null;
    setConversation(INITIAL_CONVERSATION);
    conversationRef.current = INITIAL_CONVERSATION;
    setTokensPerSecond([]);
    tokensPerSecondRef.current = [];
    setUserInput("");
    setIsSidebarOpen(false);
    await persistChatsToDisk(chatsRef.current, null);
  };

  const handleSelectChat = async (chatId: string) => {
    if (editingChatId === chatId) {
      return;
    }
    clearChatTitleEditing();
    await flushCurrentChatBeforeSwitch();
    const chat = chatsRef.current.find((item) => item.id === chatId);
    if (!chat) {
      return;
    }

    setActiveChatId(chatId);
    activeChatIdRef.current = chatId;
    setConversation(chat.messages);
    conversationRef.current = chat.messages;
    setTokensPerSecond(chat.tokensPerSecond ?? []);
    tokensPerSecondRef.current = chat.tokensPerSecond ?? [];
    setUserInput("");
    setIsSidebarOpen(false);
    await persistChatsToDisk(chatsRef.current, chatId);

    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollToEnd({ animated: false });
    });
  };

  const applyChatRename = async (chatId: string, newTitle: string) => {
    const trimmed = newTitle.trim();
    if (!trimmed) {
      return;
    }

    const nextChats = chatsRef.current.map((chat) =>
      chat.id === chatId
        ? { ...chat, title: trimmed, updatedAt: Date.now() }
        : chat
    );

    chatsRef.current = nextChats;
    setChats(nextChats);
    await persistChatsToDisk(nextChats, activeChatIdRef.current);
  };

  const handleRenameChat = (chatId: string) => {
    const chat = chatsRef.current.find((item) => item.id === chatId);
    if (!chat) {
      return;
    }
    setEditingChatId(chatId);
    setNewChatTitle(chat.title);
  };

  const handleSaveChatRename = async () => {
    if (!editingChatId) {
      return;
    }
    await applyChatRename(editingChatId, newChatTitle);
    clearChatTitleEditing();
  };

  const handleDeleteChat = (chatId: string) => {
    Alert.alert("Delete Chat", "Do you want to delete this chat?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Confirm",
        style: "destructive",
        onPress: async () => {
          if (editingChatId === chatId) {
            clearChatTitleEditing();
          }

          const nextChats = chatsRef.current.filter(
            (item) => item.id !== chatId
          );
          chatsRef.current = nextChats;
          setChats(nextChats);

          const wasActive = activeChatIdRef.current === chatId;
          if (wasActive) {
            setActiveChatId(null);
            activeChatIdRef.current = null;
            setConversation(INITIAL_CONVERSATION);
            conversationRef.current = INITIAL_CONVERSATION;
            setTokensPerSecond([]);
            tokensPerSecondRef.current = [];
            setUserInput("");
          }

          await persistChatsToDisk(
            nextChats,
            wasActive ? null : activeChatIdRef.current
          );
        },
      },
    ]);
  };

  const openModelSelection = () => {
    setIsSidebarOpen(false);
    setCurrentPage("modelSelection");
  };

  const openCustomModelSelection = () => {
    setShowCustomModelPicker(true);
    setSelectedModelFormat(RECOMMENDED_MODEL_FORMAT);
    handleFetchAvailableGGUFs(RECOMMENDED_MODEL_FORMAT);
  };

  const handleDownloadRecommended = async () => {
    try {
      const file = await resolveRecommendedGgufFilename();
      const success = await handleDownloadModel(file, {
        modelFormat: RECOMMENDED_MODEL_FORMAT,
        skipAlerts: true,
      });
      if (success) {
        await finishStartupReady();
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";
      Alert.alert("Erro no download", errorMessage);
      setAppStatus("no_model");
    }
  };

  const handleSwitchDownloadedModel = async (file: string) => {
    setAppStatus("loading_model");
    setLoadingOverlayText("Loading model...");
    const success = await loadModel(file, {
      silent: true,
      modelFormat: selectedModelFormat || RECOMMENDED_MODEL_FORMAT,
      resetConversation: false,
    });
    if (success) {
      setLoadingOverlayText("Done!");
      await delay(1000);
      setCurrentPage("conversation");
      setAppStatus("ready");
      return;
    }
    setAppStatus("ready");
  };

  const handleLoadDownloadedModel = async (file: string) => {
    setAppStatus("loading_model");
    setLoadingOverlayText("Loading model...");
    const success = await loadModel(file, {
      silent: true,
      modelFormat: selectedModelFormat || RECOMMENDED_MODEL_FORMAT,
    });
    if (success) {
      await finishStartupReady();
    } else {
      setAppStatus("no_model");
    }
  };

  const openSettings = () => {
    setIsSidebarOpen(false);
    setCurrentPage("settings");
  };

  const toggleThought = (messageIndex: number) => {
    setConversation((prev) => {
      const next = prev.map((msg, index) =>
        index === messageIndex ? { ...msg, showThought: !msg.showThought } : msg
      );
      conversationRef.current = next;
      void persistActiveChatState(next, tokensPerSecondRef.current);
      return next;
    });
  };
  const handleFetchAvailableGGUFs = async (modelFormat: string) => {
    setIsFetching(true);
    try {
      const files = await fetchAvailableGGUFs(modelFormat);
      setAvailableGGUFs(files);
    } catch {
      Alert.alert(
        "Error",
        "Failed to fetch .gguf files from Hugging Face API."
      );
    } finally {
      setIsFetching(false);
    }
  };

  const handleFormatSelection = (format: string) => {
    setSelectedModelFormat(format);
    setAvailableGGUFs([]);
    handleFetchAvailableGGUFs(format);
  };

  const checkDownloadedModels = async () => {
    try {
      const ggufFiles = await listDownloadedGgufModels();
      setDownloadedModels(ggufFiles);
    } catch (error) {
      console.error("Error checking downloaded models:", error);
    }
  };
  useEffect(() => {
    if (appStatus === "ready") {
      checkDownloadedModels();
    }
  }, [currentPage, appStatus]);

  const handleScroll = (event: any) => {
    const currentPosition = event.nativeEvent.contentOffset.y;
    const contentHeight = event.nativeEvent.contentSize.height;
    const scrollViewHeight = event.nativeEvent.layoutMeasurement.height;

    // Store current scroll position and content height
    scrollPositionRef.current = currentPosition;
    contentHeightRef.current = contentHeight;

    // If user has scrolled up more than 100px from bottom, disable auto-scroll
    const distanceFromBottom =
      contentHeight - scrollViewHeight - currentPosition;
    setAutoScrollEnabled(distanceFromBottom < 100);
  };

  const handleDownloadModel = async (
    file: string,
    options?: { modelFormat?: string; skipAlerts?: boolean }
  ): Promise<boolean> => {
    const format = options?.modelFormat ?? selectedModelFormat;
    if (!format) {
      if (!options?.skipAlerts) {
        Alert.alert("Erro", "Selecione um formato de modelo primeiro.");
      }
      return false;
    }

    setIsDownloading(true);
    setProgress(0);
    setSelectedGGUF(file);
    setSelectedModelFormat(format);

    const destPath = getModelFilePath(file);
    try {
      if (await checkFileExists(destPath)) {
        const success = await loadModel(file, {
          silent: options?.skipAlerts,
          modelFormat: format,
        });
        if (!options?.skipAlerts && success) {
          Alert.alert(
            "Info",
            `O arquivo já existe em ${destPath}. Modelo carregado.`
          );
        }
        return success;
      }

      const downloadedPath = await downloadGgufModel(
        file,
        format,
        (downloadProgress) => setProgress(downloadProgress)
      );
      if (!options?.skipAlerts) {
        Alert.alert("Sucesso", `Modelo baixado em: ${downloadedPath}`);
      }

      return await loadModel(file, {
        silent: options?.skipAlerts,
        modelFormat: format,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";
      if (!options?.skipAlerts) {
        Alert.alert("Erro", `Falha no download: ${errorMessage}`);
      }
      return false;
    } finally {
      setIsDownloading(false);
      await checkDownloadedModels();
    }
  };

  const stopGeneration = async () => {
    if (!context) {
      return;
    }
    try {
      await stopLlamaCompletion(context);
      setIsGenerating(false);
      setIsLoading(false);

      setConversation((prev) => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage.role === "assistant") {
          const next = [
            ...prev.slice(0, -1),
            {
              ...lastMessage,
              content: lastMessage.content + "\n\n*Generation stopped by user*",
            },
          ];
          conversationRef.current = next;
          void persistActiveChatState(next, tokensPerSecondRef.current);
          return next;
        }
        return prev;
      });
    } catch (error) {
      console.error("Error stopping completion:", error);
    }
  };

  const loadModel = async (
    modelName: string,
    options?: {
      silent?: boolean;
      modelFormat?: string;
      resetConversation?: boolean;
    }
  ): Promise<boolean> => {
    const format = options?.modelFormat ?? selectedModelFormat;
    try {
      if (context) {
        await releaseAllLlamaModels();
        setContext(null);
        if (options?.resetConversation !== false) {
          setConversation(INITIAL_CONVERSATION);
          conversationRef.current = INITIAL_CONVERSATION;
        }
      }
      const llamaContext = await loadLlamaModel(modelName);
      setContext(llamaContext);
      setSelectedGGUF(modelName);
      if (format) {
        setSelectedModelFormat(format);
      }
      await saveModelPrefs({
        lastModelFile: modelName,
        lastModelFormat: format || RECOMMENDED_MODEL_FORMAT,
      });
      if (!options?.silent) {
        Alert.alert("Modelo carregado", "O modelo foi carregado com sucesso.");
      }
      return true;
    } catch (error) {
      console.log("error : ", error);
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";
      if (!options?.silent) {
        Alert.alert("Erro ao carregar modelo", errorMessage);
      }
      return false;
    }
  };

  const handleSendMessage = async () => {
    if (!context) {
      Alert.alert("Model Not Loaded", "Please load the model first.");
      return;
    }
    if (!userInput.trim()) {
      Alert.alert("Input Error", "Please enter a message.");
      return;
    }

    const userText = userInput.trim();
    let chatId = activeChatIdRef.current;

    if (!chatId) {
      chatId = generateChatId();
      const newChat: ChatSession = {
        id: chatId,
        title: titleFromFirstMessage(userText),
        messages: [...INITIAL_CONVERSATION],
        updatedAt: Date.now(),
        tokensPerSecond: [],
      };
      const nextChats = [newChat, ...chatsRef.current];
      chatsRef.current = nextChats;
      setChats(nextChats);
      setActiveChatId(chatId);
      activeChatIdRef.current = chatId;
      await persistChatsToDisk(nextChats, chatId);
    }

    const newConversation: ChatMessage[] = [
      ...conversationRef.current,
      { role: "user", content: userText },
    ];
    setConversation(newConversation);
    conversationRef.current = newConversation;
    setUserInput("");
    setIsLoading(true);
    setIsGenerating(true);
    setAutoScrollEnabled(true);

    const webSearchActive = isWebSearchEnabled;
    let webSearchContext: string | null = null;
    let webSearchNotice = "";

    if (webSearchActive) {
      const searchResult = await fetchWebSearchContext(userText);
      webSearchContext = searchResult.contextBlock;

      if (searchResult.errorMessage) {
        webSearchNotice = `*${searchResult.errorMessage}*\n\n`;
      } else if (!searchResult.contextBlock) {
        webSearchNotice =
          "*Web search returned no results. Answering from local knowledge.*\n\n";
      }
    }

    const completionMessages = buildCompletionMessages(newConversation, {
      maxRecent: webSearchActive
        ? WEB_SEARCH_MAX_RECENT_MESSAGES
        : undefined,
      webSearchContext,
      systemPrompt,
    });

    try {
      const withAssistantPlaceholder: ChatMessage[] = [
        ...newConversation,
        {
          role: "assistant",
          content: webSearchNotice,
          thought: undefined,
          showThought: false,
        },
      ];
      setConversation(withAssistantPlaceholder);
      conversationRef.current = withAssistantPlaceholder;

      const result = await runChatCompletion(
        context,
        completionMessages,
        ({ visibleContent, thought }) => {
          setConversation((prev) => {
            const lastIndex = prev.length - 1;
            const updated = [...prev];
            updated[lastIndex] = {
              ...updated[lastIndex],
              content: webSearchNotice + visibleContent,
              ...(thought !== undefined && { thought }),
            };
            conversationRef.current = updated;
            return updated;
          });

          if (autoScrollEnabled && scrollViewRef.current) {
            requestAnimationFrame(() => {
              scrollViewRef.current?.scrollToEnd({ animated: false });
            });
          }
        },
        {
          temperature: parseFloat(systemTemperature),
          top_p: parseFloat(systemTopP),
          penalty_repeat: parseFloat(systemRepeatPenalty),
        }
      );

      const nextTokens = [...tokensPerSecondRef.current, result.predictedPerSecond];
      tokensPerSecondRef.current = nextTokens;
      setTokensPerSecond(nextTokens);
      await persistActiveChatState(
        conversationRef.current,
        nextTokens,
        chatId
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      Alert.alert("Error During Inference", errorMessage);
      await persistActiveChatState(
        conversationRef.current,
        tokensPerSecondRef.current,
        chatId
      );
    } finally {
      setIsLoading(false);
      setIsGenerating(false);
    }
  };

  const renderModelSelection = () => (
    <ScrollView
      style={styles.modelOverlayScroll}
      contentContainerStyle={styles.modelOverlayContent}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.modelOverlayTitle}>Local Models</Text>
      <Text style={styles.modelOverlaySubtitle}>
        Choose the model format and .gguf file to load
      </Text>
      <Text style={styles.sectionTitle}>Model Format</Text>
      {MODEL_FORMATS.map((format) => (
        <TouchableOpacity
          key={format.label}
          style={[
            styles.modelFormatButton,
            selectedModelFormat === format.label && styles.modelFormatButtonActive,
          ]}
          onPress={() => handleFormatSelection(format.label)}
        >
          <Text
            style={[
              styles.modelFormatButtonText,
              selectedModelFormat === format.label &&
                styles.modelFormatButtonTextActive,
            ]}
          >
            {format.label}
          </Text>
        </TouchableOpacity>
      ))}
      {selectedModelFormat && (
        <View style={styles.ggufSection}>
          <Text style={styles.sectionTitle}>GGUF File</Text>
          {isFetching && (
            <ActivityIndicator size="small" color={COLORS.accent} />
          )}
          {availableGGUFs.map((file, index) => {
            const isDownloaded = downloadedModels.includes(file);
            return (
              <View key={index} style={styles.modelContainer}>
                <TouchableOpacity
                  style={[
                    styles.modelButton,
                    selectedGGUF === file && styles.modelButtonSelected,
                    isDownloaded && styles.modelButtonDownloaded,
                  ]}
                  onPress={() =>
                    isDownloaded
                      ? appStatus === "ready"
                        ? void handleSwitchDownloadedModel(file)
                        : void handleLoadDownloadedModel(file)
                      : handleGGUFSelection(file)
                  }
                >
                  <View style={styles.modelButtonContent}>
                    <View style={styles.modelStatusContainer}>
                      {isDownloaded ? (
                        <View style={styles.downloadedIndicator}>
                          <Text style={styles.downloadedIcon}>▼</Text>
                        </View>
                      ) : (
                        <View style={styles.notDownloadedIndicator}>
                          <Text style={styles.notDownloadedIcon}>▽</Text>
                        </View>
                      )}
                      <Text
                        style={[
                          styles.buttonTextGGUF,
                          selectedGGUF === file && styles.selectedButtonText,
                          isDownloaded && styles.downloadedText,
                        ]}
                      >
                        {file.split("-")[-1] == "imat"
                          ? file
                          : file.split("-").pop()}
                      </Text>
                    </View>
                    {isDownloaded && (
                      <View style={styles.loadModelIndicator}>
                        <Text style={styles.loadModelText}>LOAD →</Text>
                      </View>
                    )}
                    {!isDownloaded && (
                      <View style={styles.downloadIndicator}>
                        <Text style={styles.downloadText}>DOWNLOAD →</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}
      {context && currentPage === "modelSelection" && appStatus === "ready" && (
        <TouchableOpacity
          style={styles.backToChatButton}
          onPress={() => setCurrentPage("conversation")}
        >
          <Text style={styles.backToChatText}>Return to chat</Text>
        </TouchableOpacity>
      )}
      {showCustomModelPicker && appStatus === "no_model" && (
        <TouchableOpacity
          style={styles.backToChatButton}
          onPress={() => setShowCustomModelPicker(false)}
        >
          <Text style={styles.backToChatText}>← Return</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );

  const renderStartupOverlay = () => (
    <View style={styles.startupFullscreen}>
      <ActivityIndicator size="large" color={COLORS.accent} />
      <Text style={styles.startupTitle}>{loadingOverlayText}</Text>
    </View>
  );

  const renderNoModelScreen = () => (
    <View style={styles.startupFullscreen}>
      <Text style={styles.startupHeading}>Welcome to Privami Ai</Text>
      <Text style={styles.startupSubtitle}>
        No model found on the device. Download the recommended model to get started.
      </Text>
      <TouchableOpacity
        style={styles.recommendedDownloadButton}
        onPress={() => void handleDownloadRecommended()}
        disabled={isDownloading}
        activeOpacity={0.85}
      >
        <Text style={styles.recommendedDownloadText}>
          Download Recommended Model
        </Text>
        <Text style={styles.recommendedDownloadHint}>
          Llama 3.2 1B Q6_K
        </Text>
      </TouchableOpacity>
      {isDownloading && (
        <View style={styles.noModelProgress}>
          <Text style={styles.noModelProgressLabel} numberOfLines={1}>
            {selectedGGUF ?? "Downloading..."}
          </Text>
          <ProgressBar progress={progress} />
        </View>
      )}
      <TouchableOpacity
        style={styles.customModelButton}
        onPress={openCustomModelSelection}
        disabled={isDownloading}
        accessibilityLabel="Choose another model"
      >
        <Text style={styles.customModelButtonIcon}>⚙️</Text>
      </TouchableOpacity>
    </View>
  );

  const renderMessages = () => (
    <ScrollView
      ref={scrollViewRef}
      style={styles.messagesScroll}
      contentContainerStyle={styles.messagesContent}
      onScroll={handleScroll}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {conversation.length <= 1 && (
        <Text style={styles.emptyChatHint}>
          Chat with Privami Ai running locally on your device.
        </Text>
      )}
      {conversation.slice(1).map((msg, index) => (
        <View
          key={index}
          style={[
            styles.messageRow,
            msg.role === "user" ? styles.messageRowUser : styles.messageRowAssistant,
          ]}
        >
          <View
            style={[
              styles.messageBubble,
              msg.role === "user" ? styles.userBubble : styles.llamaBubble,
            ]}
          >
            {msg.role === "assistant" && msg.thought && (
              <TouchableOpacity
                onPress={() => toggleThought(index + 1)}
                style={styles.toggleButton}
              >
                <Text style={styles.toggleText}>
                  {msg.showThought ? "▼ Hide Thinking" : "▶ Show Thinking"}
                </Text>
              </TouchableOpacity>
            )}
            {msg.showThought && msg.thought && (
              <View style={styles.thoughtContainer}>
                <Text style={styles.thoughtTitle}>Model Thinking</Text>
                <Text style={styles.thoughtText}>{msg.thought}</Text>
              </View>
            )}
            {msg.role === "user" ? (
              <Text style={styles.userMessageText}>{msg.content}</Text>
            ) : (
              <View style={styles.assistantMessageContent}>
                <Markdown style={markdownStyles}>{msg.content}</Markdown>
              </View>
            )}
          </View>
          {msg.role === "assistant" && tokensPerSecond[Math.floor(index / 2)] != null && (
            <Text
              style={styles.tokenInfo}
              onPress={() => console.log("index : ", index)}
            >
              {tokensPerSecond[Math.floor(index / 2)]} tokens/s
            </Text>
          )}
        </View>
      ))}
    </ScrollView>
  );

  const isAppReady = appStatus === "ready";

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior="padding"
      >
        <View style={styles.flex}>
          {isAppReady && (
            <>
              {currentPage !== "settings" && (
                <View style={styles.header}>
                  <TouchableOpacity
                    style={styles.headerIconButton}
                    onPress={() => setIsSidebarOpen(true)}
                    accessibilityLabel="Abrir menu"
                  >
                    <Text style={styles.headerMenuIcon}>☰</Text>
                  </TouchableOpacity>
                  <Text style={styles.headerTitle}>Privami Ai</Text>
                  <View style={styles.headerIconButton} />
                </View>
              )}

              {currentPage === "settings" && (
                <SettingsScreen
                  accessKey={accessKey}
                  onBack={() => setCurrentPage("conversation")}
                  systemPrompt={systemPrompt}
                  onSystemPromptChange={handleSystemPromptChange}
                  systemTemperature={systemTemperature}
                  onSystemTemperatureChange={handleSystemTemperatureChange}
                  systemTopP={systemTopP}
                  onSystemTopPChange={handleSystemTopPChange}
                  systemRepeatPenalty={systemRepeatPenalty}
                  onSystemRepeatPenaltyChange={handleSystemRepeatPenaltyChange}
                />
              )}

              {currentPage === "conversation" && !isDownloading && (
                <KeyboardAvoidingView
                  style={styles.chatKeyboardAvoid}
                  behavior="padding"
                >
                  {renderMessages()}
                  <View style={styles.inputFooter}>
                    <View style={styles.inputPill}>
                      <TouchableOpacity
                        style={[
                          styles.webSearchButton,
                          isWebSearchEnabled && styles.webSearchButtonActive,
                        ]}
                        onPress={() =>
                          setIsWebSearchEnabled((enabled) => !enabled)
                        }
                        activeOpacity={0.85}
                        accessibilityLabel={
                          isWebSearchEnabled
                            ? "Disable web search"
                            : "Enable web search"
                        }
                      >
                        <Text style={styles.webSearchIcon}>🌐</Text>
                      </TouchableOpacity>
                      <TextInput
                        style={styles.input}
                        placeholder="Type a message..."
                        placeholderTextColor={COLORS.textSecondary}
                        value={userInput}
                        onChangeText={setUserInput}
                        multiline
                        maxLength={4000}
                      />
                      <TouchableOpacity
                        style={[
                          styles.sendIconButton,
                          isGenerating && styles.sendIconButtonStop,
                        ]}
                        onPress={isGenerating ? stopGeneration : handleSendMessage}
                        disabled={!isGenerating && isLoading}
                        accessibilityLabel={
                          isGenerating ? "Parar geração" : "Enviar mensagem"
                        }
                      >
                        <Text style={styles.sendIconChar}>
                          {isGenerating ? "■" : "↑"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </KeyboardAvoidingView>
              )}

              {currentPage === "modelSelection" && !isDownloading && (
                <View style={styles.modelOverlay}>{renderModelSelection()}</View>
              )}

              {isDownloading && (
                <View style={styles.downloadOverlay}>
                  <View style={styles.downloadCard}>
                    <Text style={styles.downloadTitle}>Downloading model</Text>
                    <Text style={styles.downloadFileName} numberOfLines={2}>
                      {selectedGGUF}
                    </Text>
                    <ProgressBar progress={progress} />
                  </View>
                </View>
              )}
            </>
          )}

          {(appStatus === "checking" || appStatus === "loading_model") &&
            renderStartupOverlay()}

          {appStatus === "no_model" &&
            !showCustomModelPicker &&
            renderNoModelScreen()}

          {appStatus === "no_model" && showCustomModelPicker && (
            <View style={styles.startupFullscreen}>
              {isDownloading ? (
                <View style={styles.noModelProgress}>
                  <Text style={styles.noModelProgressLabel} numberOfLines={1}>
                    {selectedGGUF ?? "Downloading..."}
                  </Text>
                  <ProgressBar progress={progress} />
                </View>
              ) : (
                renderModelSelection()
              )}
            </View>
          )}

          {isAppReady && (
            <ChatSidebar
            isOpen={isSidebarOpen}
            chats={chats}
            activeChatId={activeChatId}
            editingChatId={editingChatId}
            newChatTitle={newChatTitle}
            onChangeNewChatTitle={setNewChatTitle}
            onClose={() => setIsSidebarOpen(false)}
            onNewChat={handleNewChat}
            onSelectChat={handleSelectChat}
            onRenameChat={handleRenameChat}
            onSaveChatRename={handleSaveChatRename}
            onDeleteChat={handleDeleteChat}
            onOpenSettings={openSettings}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  flex: {
    flex: 1,
  },
  chatKeyboardAvoid: {
    flex: 1,
  },
  startupFullscreen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
    zIndex: 50,
  },
  startupTitle: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: "600",
    marginTop: 20,
    textAlign: "center",
  },
  startupHeading: {
    color: COLORS.textPrimary,
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 12,
  },
  startupSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 32,
  },
  recommendedDownloadButton: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
    alignItems: "center",
    marginBottom: 16,
  },
  recommendedDownloadText: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 4,
  },
  recommendedDownloadHint: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    fontWeight: "500",
  },
  noModelProgress: {
    width: "100%",
    maxWidth: 320,
    marginBottom: 20,
  },
  noModelProgressLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 8,
    textAlign: "center",
  },
  customModelButton: {
    position: "absolute",
    top: Platform.OS === "ios" ? 56 : 24,
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  customModelButtonIcon: {
    fontSize: 22,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 12,
    backgroundColor: COLORS.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  headerIconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  headerMenuIcon: {
    color: COLORS.textPrimary,
    fontSize: 26,
    lineHeight: 28,
    fontWeight: "400",
  },
  sendIconChar: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 22,
  },
  messagesScroll: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  emptyChatHint: {
    textAlign: "center",
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 48,
    marginHorizontal: 24,
  },
  messageRow: {
    marginBottom: 14,
    maxWidth: "100%",
  },
  messageRowUser: {
    alignItems: "flex-end",
  },
  messageRowAssistant: {
    alignItems: "flex-start",
  },
  messageBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    maxWidth: "85%",
    flexShrink: 1,
  },
  userBubble: {
    backgroundColor: COLORS.userBubble,
    borderBottomRightRadius: 6,
  },
  llamaBubble: {
    backgroundColor: COLORS.assistantBubble,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderBottomLeftRadius: 6,
    flexShrink: 1,
    alignSelf: "flex-start",
  },
  assistantMessageContent: {
    flexShrink: 1,
    width: "100%",
  },
  userMessageText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    lineHeight: 22,
  },
  tokenInfo: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 4,
    marginLeft: 4,
  },
  thoughtContainer: {
    marginBottom: 8,
    padding: 10,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
  },
  thoughtTitle: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  thoughtText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontStyle: "italic",
    lineHeight: 18,
  },
  toggleButton: {
    marginBottom: 8,
    paddingVertical: 2,
  },
  toggleText: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: "600",
  },
  inputFooter: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 12 : 14,
    backgroundColor: COLORS.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  inputPill: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingLeft: 6,
    paddingRight: 6,
    paddingVertical: 6,
    minHeight: 48,
  },
  webSearchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
    marginRight: 4,
  },
  webSearchButtonActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  webSearchIcon: {
    fontSize: 18,
    lineHeight: 22,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textPrimary,
    maxHeight: 120,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    paddingRight: 8,
    paddingLeft: 4,
  },
  sendIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  sendIconButtonStop: {
    backgroundColor: COLORS.danger,
  },
  modelOverlay: {
    ...StyleSheet.absoluteFillObject,
    top: 68,
    backgroundColor: COLORS.background,
    zIndex: 10,
  },
  modelOverlayScroll: {
    flex: 1,
  },
  modelOverlayContent: {
    padding: 20,
    paddingBottom: 40,
  },
  modelOverlayTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  modelOverlaySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 24,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
    marginTop: 8,
  },
  modelFormatButton: {
    backgroundColor: COLORS.surface,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modelFormatButtonActive: {
    backgroundColor: COLORS.accentMuted,
    borderColor: COLORS.accent,
  },
  modelFormatButtonText: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "500",
  },
  modelFormatButtonTextActive: {
    color: COLORS.accent,
    fontWeight: "700",
  },
  ggufSection: {
    marginTop: 8,
  },
  backToChatButton: {
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
  },
  backToChatText: {
    color: COLORS.accent,
    fontSize: 15,
    fontWeight: "600",
  },
  downloadOverlay: {
    ...StyleSheet.absoluteFillObject,
    top: 68,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    padding: 24,
    zIndex: 15,
  },
  downloadCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  downloadTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  downloadFileName: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  modelContainer: {
    marginVertical: 6,
    borderRadius: 12,
    overflow: "hidden",
  },
  modelButton: {
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modelButtonSelected: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accentMuted,
  },
  modelButtonDownloaded: {
    borderColor: COLORS.accent,
  },
  modelButtonContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modelStatusContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  downloadedIndicator: {
    backgroundColor: COLORS.accentMuted,
    padding: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  notDownloadedIndicator: {
    backgroundColor: COLORS.surfaceElevated,
    padding: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  downloadedIcon: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: "bold",
  },
  notDownloadedIcon: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: "bold",
  },
  downloadedText: {
    color: COLORS.accent,
  },
  loadModelIndicator: {
    backgroundColor: COLORS.accentMuted,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  loadModelText: {
    color: COLORS.accent,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  downloadIndicator: {
    backgroundColor: "rgba(0, 255, 136, 0.12)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  downloadText: {
    color: "#00FF88",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  buttonTextGGUF: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  selectedButtonText: {
    color: COLORS.accent,
    fontWeight: "700",
  },
});

export default App;
