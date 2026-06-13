import React, { useEffect, useRef } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { COLORS } from "../theme/amoled";
import type { ChatSession } from "../services/chatStorage";

const SIDEBAR_WIDTH = 300;

type ChatSidebarProps = {
  isOpen: boolean;
  chats: ChatSession[];
  activeChatId: string | null;
  editingChatId: string | null;
  newChatTitle: string;
  onChangeNewChatTitle: (title: string) => void;
  onClose: () => void;
  onNewChat: () => void;
  onSelectChat: (chatId: string) => void;
  onRenameChat: (chatId: string) => void;
  onSaveChatRename: () => void;
  onDeleteChat: (chatId: string) => void;
  onOpenSettings: () => void;
};

function ChatSidebar({
  isOpen,
  chats,
  activeChatId,
  editingChatId,
  newChatTitle,
  onChangeNewChatTitle,
  onClose,
  onNewChat,
  onSelectChat,
  onRenameChat,
  onSaveChatRename,
  onDeleteChat,
  onOpenSettings,
}: ChatSidebarProps): React.JSX.Element {
  const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;

  const sortedChats = [...chats].sort((a, b) => b.updatedAt - a.updatedAt);

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isOpen ? 0 : -SIDEBAR_WIDTH,
      duration: 260,
      useNativeDriver: true,
    }).start();
  }, [isOpen, slideAnim]);

  return (
    <>
      {isOpen && (
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close Menu"
        />
      )}
      <Animated.View
        style={[styles.sidebar, { transform: [{ translateX: slideAnim }] }]}
        pointerEvents={isOpen ? "auto" : "none"}
      >
        <View style={styles.sidebarInner}>
          <TouchableOpacity
            style={styles.newChatButton}
            onPress={onNewChat}
            activeOpacity={0.85}
          >
            <Text style={styles.newChatIcon}>+</Text>
            <Text style={styles.newChatText}>New Chat</Text>
          </TouchableOpacity>

          <Text style={styles.sectionLabel}>Chat History</Text>
          <ScrollView
            style={styles.historyList}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.historyContent}
            keyboardShouldPersistTaps="handled"
          >
            {sortedChats.length === 0 ? (
              <Text style={styles.emptyHistory}>
                No conversation saved yet. Send a message to get started.
              </Text>
            ) : (
              sortedChats.map((chat) => {
                const isActive = chat.id === activeChatId;
                const isEditing = chat.id === editingChatId;

                return (
                  <View
                    key={chat.id}
                    style={[styles.historyRow, isActive && styles.historyRowActive]}
                  >
                    {isEditing ? (
                      <>
                        <View style={styles.historyItemMain}>
                          <TextInput
                            style={styles.editTitleInput}
                            value={newChatTitle}
                            onChangeText={onChangeNewChatTitle}
                            placeholder="Chat Name"
                            placeholderTextColor={COLORS.textSecondary}
                            selectionColor={COLORS.accent}
                            autoFocus
                            maxLength={80}
                            returnKeyType="done"
                            onSubmitEditing={onSaveChatRename}
                          />
                        </View>
                        <TouchableOpacity
                          style={styles.historyAction}
                          onPress={onSaveChatRename}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          accessibilityLabel="Salvar nome do chat"
                        >
                          <Text style={styles.historyActionIcon}>✔️</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <>
                        <TouchableOpacity
                          style={styles.historyItemMain}
                          activeOpacity={0.7}
                          onPress={() => onSelectChat(chat.id)}
                        >
                          <Text
                            style={[
                              styles.historyTitle,
                              isActive && styles.historyTitleActive,
                            ]}
                            numberOfLines={1}
                          >
                            {chat.title}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.historyAction}
                          onPress={() => onRenameChat(chat.id)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          accessibilityLabel="Rename chat"
                        >
                          <Text style={styles.historyActionIcon}>✏️</Text>
                        </TouchableOpacity>
                      </>
                    )}
                    <TouchableOpacity
                      style={styles.historyAction}
                      onPress={() => onDeleteChat(chat.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityLabel="Delete chat"
                    >
                      <Text style={styles.historyActionIcon}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={onOpenSettings}
              activeOpacity={0.85}
            >
              <Text style={styles.settingsIcon}>⚙</Text>
              <Text style={styles.settingsText}>Settings</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.overlay,
    zIndex: 20,
  },
  sidebar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: COLORS.surface,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    zIndex: 30,
    elevation: 16,
  },
  sidebarInner: {
    flex: 1,
    paddingTop: 16,
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  newChatButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 20,
  },
  newChatIcon: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: "600",
    lineHeight: 24,
  },
  newChatText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  sectionLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  historyList: {
    flex: 1,
  },
  historyContent: {
    paddingBottom: 12,
  },
  emptyHistory: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    marginBottom: 4,
    paddingRight: 4,
  },
  historyRowActive: {
    backgroundColor: COLORS.accentMuted,
  },
  historyItemMain: {
    flex: 1,
    paddingVertical: 8,
    paddingLeft: 12,
    paddingRight: 4,
  },
  historyTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "500",
  },
  historyTitleActive: {
    color: COLORS.accent,
    fontWeight: "600",
  },
  editTitleInput: {
    backgroundColor: COLORS.surfaceElevated,
    color: COLORS.textPrimary,
    fontSize: 15,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  historyAction: {
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  historyActionIcon: {
    fontSize: 16,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
  },
  settingsButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  settingsIcon: {
    color: COLORS.textSecondary,
    fontSize: 20,
    lineHeight: 22,
  },
  settingsText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "500",
  },
});

export default ChatSidebar;
