import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { COLORS } from '../constants';
import Icon, { Icons } from '../components/common/Icon';
import { firestoreService } from '../services/firestoreService';
import { useAuth } from '../state/AuthProvider';
import { Chat } from '../types/firestore';

const formatTime = (date: Date | undefined): string => {
  if (!date) return '';
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days < 7 ? `${days}d ago` : date.toLocaleDateString();
};

const MessagesScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }
    const unsubscribe = firestoreService.subscribeToChats(
      { participants: [user.uid] },
      (data) => {
        setChats(data);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [user?.uid]);

  const getOtherName = (chat: Chat): string => {
    if (!user?.uid) return 'Unknown';
    const otherId = chat.participants.find(id => id !== user.uid);
    if (!otherId) return 'Unknown';
    return chat.participantNames[otherId] || 'Unknown';
  };

  const filteredChats = chats.filter(chat => {
    const name = getOtherName(chat).toLowerCase();
    const q = searchQuery.toLowerCase();
    return name.includes(q) || chat.taskTitle.toLowerCase().includes(q);
  });

  const handleChatPress = (chat: Chat) => {
    navigation.navigate('ChatThread', {
      chatId: chat.id,
      chatName: getOtherName(chat),
      taskTitle: chat.taskTitle,
    });
  };

  const renderChatItem = (chat: Chat) => {
    const name = getOtherName(chat);
    const lastText = chat.lastMessage?.text ?? '';
    const lastTime = formatTime(chat.lastMessage?.timestamp ?? chat.updatedAt);

    return (
      <TouchableOpacity
        key={chat.id}
        style={styles.chatItem}
        onPress={() => handleChatPress(chat)}
      >
        <View style={styles.chatAvatar}>
          <Icon name={Icons.user} size={24} color={COLORS.textSecondary} />
        </View>

        <View style={styles.chatContent}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatName}>{name}</Text>
            <Text style={styles.chatTime}>{lastTime}</Text>
          </View>
          <Text style={styles.taskTitle}>{chat.taskTitle}</Text>
          <View style={styles.messageRow}>
            <Text style={styles.lastMessage} numberOfLines={1}>
              {lastText}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity style={styles.newMessageButton}>
          <Icon name={Icons.edit} size={20} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Icon name={Icons.search} size={20} color={COLORS.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search conversations..."
            placeholderTextColor="#8E8E93"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => setSearchQuery('')}
            >
              <Icon name={Icons.close} size={16} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickActionsScroll}
        >
          <TouchableOpacity style={styles.quickActionButton}>
            <Icon name={Icons.edit} size={20} color={COLORS.text} />
            <Text style={styles.quickActionText}>New Task</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionButton}>
            <Icon name={Icons.users} size={20} color={COLORS.text} />
            <Text style={styles.quickActionText}>Group Chat</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionButton}>
            <Icon name={Icons.star} size={20} color={COLORS.text} />
            <Text style={styles.quickActionText}>Favorites</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionButton}>
            <Icon name={Icons.task} size={20} color={COLORS.text} />
            <Text style={styles.quickActionText}>Archived</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Chats List */}
      <ScrollView
        style={styles.chatsList}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : filteredChats.length > 0 ? (
          filteredChats.map(renderChatItem)
        ) : (
          <View style={styles.emptyState}>
            <Icon name={Icons.messages} size={48} color={COLORS.textSecondary} />
            <Text style={styles.emptyStateTitle}>No conversations found</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery
                ? 'Try adjusting your search terms'
                : 'Start a conversation by posting a task or reaching out to experts'
              }
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 24,
    color: '#007AFF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  newMessageButton: {
    padding: 8,
  },
  searchContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
    marginLeft: 8,
  },
  clearButton: {
    padding: 4,
  },
  quickActions: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  quickActionsScroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  quickActionButton: {
    alignItems: 'center',
    marginRight: 24,
    minWidth: 60,
  },
  quickActionText: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
    marginTop: 4,
  },
  chatsList: {
    flex: 1,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  chatAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  chatContent: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  chatTime: {
    fontSize: 12,
    color: '#8E8E93',
  },
  taskTitle: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
    marginBottom: 4,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lastMessage: {
    fontSize: 14,
    color: '#8E8E93',
    flex: 1,
    marginRight: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});

export default MessagesScreen;
