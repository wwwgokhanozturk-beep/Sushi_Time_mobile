import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { io } from 'socket.io-client';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ApiConstants } from '../core/api';
import { Colors, Radius, Spacing, Typography } from '../core/theme';
import { PrimaryButton } from '../components/SharedWidgets';
import ContactCard from '../components/ContactCard';
import { useProfileStore } from '../store/profileStore';
import { chatService } from '../services/chatService';

const formatTime = (value) => {
  if (!value) return '';
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export default function ChatScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const token = useProfileStore((s) => s.token);
  const isLoggedIn = useProfileStore((s) => s.isLoggedIn);
  const loadProfile = useProfileStore((s) => s.loadProfile);
  const socketRef = useRef(null);
  const listRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [thread, setThread] = useState(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    let mounted = true;

    const loadChat = async () => {
      if (!token) {
        setLoading(false);
        setMessages([]);
        setThread(null);
        return;
      }

      setLoading(true);
      try {
        const res = await chatService.getMyChat();
        if (!mounted) return;
        setThread(res.data.data.thread);
        setMessages(res.data.data.messages || []);
      } catch {
        if (mounted) setMessages([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadChat();
    return () => {
      mounted = false;
    };
  }, [token]);

  useEffect(() => {
    if (!token) return undefined;

    console.log('[SushiTime] Socket connecting to:', ApiConstants.socketUrl);
    const socket = io(ApiConstants.socketUrl, {
      // polling first: guaranteed to connect over the same HTTPS that REST uses,
      // then auto-upgrades to websocket when the transport is available.
      transports: ['polling', 'websocket'],
      auth: { token },
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[SushiTime] Socket connected:', socket.id);
      setConnected(true);
    });
    socket.on('disconnect', (reason) => {
      console.log('[SushiTime] Socket disconnected:', reason);
      setConnected(false);
    });
    socket.on('connect_error', (err) => {
      console.log('[SushiTime] Socket connect_error:', err?.message, err);
      setConnected(false);
    });
    socket.on('chat:message', ({ thread: nextThread, message }) => {
      setThread(nextThread);
      setMessages((current) => {
        if (current.some((item) => item._id === message._id)) return current;
        return [...current, message];
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [token]);

  useEffect(() => {
    if (messages.length) {
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    }
  }, [messages.length]);

  const handleSend = async () => {
    const value = text.trim();
    if (!value || sending) return;

    setText('');
    setSending(true);

    const socket = socketRef.current;
    if (socket?.connected) {
      socket.emit('chat:message', { text: value }, (ack) => {
        setSending(false);
        if (!ack?.success) setText(value);
      });
      return;
    }

    try {
      const res = await chatService.sendMessage(value);
      setThread(res.data.data.thread);
      setMessages((current) => [...current, res.data.data.message]);
    } catch {
      setText(value);
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }) => {
    const mine = item.sender === 'customer';
    return (
      <View style={[styles.messageRow, mine ? styles.messageRowMine : styles.messageRowAdmin]}>
        <View style={[styles.bubble, mine ? styles.myBubble : styles.adminBubble]}>
          <Text style={[styles.messageText, mine ? styles.myText : styles.adminText]}>
            {item.text}
          </Text>
          <Text style={[styles.timeText, mine ? styles.myTime : styles.adminTime]}>
            {formatTime(item.createdAt)}
          </Text>
        </View>
      </View>
    );
  };

  if (!isLoggedIn) {
    return (
      <View style={[styles.authContainer, { paddingTop: insets.top + Spacing.xl }]}>
        <View style={styles.authIcon}>
          <Ionicons name="chatbubbles-outline" size={42} color={Colors.primary} />
        </View>
        <Text style={Typography.heading2}>Chat with admin</Text>
        <Text style={[Typography.bodySmall, styles.authText]}>
          Sign in to message the restaurant team.
        </Text>
        <PrimaryButton label="Sign In" onPress={() => navigation.navigate('Login')} />
        <TouchableOpacity style={styles.createAccount} onPress={() => navigation.navigate('Register')}>
          <Text style={styles.createAccountText}>Create Account</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <View>
          <Text style={Typography.heading2}>Support chat</Text>
          <Text style={Typography.bodySmall}>
            {connected ? 'Online' : 'Connecting...'}
          </Text>
        </View>
        <View style={[styles.statusDot, connected && styles.statusDotOnline]} />
      </View>

      <ContactCard variant="compact" />

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          style={styles.list}
          keyExtractor={(item) => item._id}
          renderItem={renderMessage}
          contentContainerStyle={[
            styles.listContent,
            messages.length === 0 && styles.emptyListContent,
          ]}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="chatbubble-ellipses-outline" size={44} color={Colors.textLight} />
              <Text style={[Typography.heading3, { marginTop: Spacing.sm }]}>
                No messages yet
              </Text>
              <Text style={[Typography.bodySmall, styles.emptyText]}>
                Send a question and the admin panel will receive it instantly.
              </Text>
            </View>
          }
        />
      )}

      <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, Spacing.sm) }]}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Type your message"
          placeholderTextColor={Colors.textLight}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!text.trim() || sending) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Ionicons name="send" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: Radius.full,
    backgroundColor: Colors.textLight,
  },
  statusDotOnline: { backgroundColor: Colors.success },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { flex: 1 },
  listContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyText: {
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  messageRowMine: { justifyContent: 'flex-end' },
  messageRowAdmin: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '78%',
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  myBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: Radius.sm,
  },
  adminBubble: {
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  myText: { color: '#fff' },
  adminText: { color: Colors.textPrimary },
  timeText: {
    fontSize: 11,
    marginTop: Spacing.xs,
    alignSelf: 'flex-end',
  },
  myTime: { color: 'rgba(255,255,255,0.76)' },
  adminTime: { color: Colors.textSecondary },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  input: {
    flex: 1,
    minHeight: 46,
    maxHeight: 110,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.divider,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
    fontSize: 15,
  },
  sendButton: {
    width: 46,
    height: 46,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  authContainer: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  authIcon: {
    width: 82,
    height: 82,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  authText: {
    textAlign: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  createAccount: {
    marginTop: Spacing.md,
  },
  createAccountText: {
    color: Colors.primary,
    fontWeight: '800',
  },
});
