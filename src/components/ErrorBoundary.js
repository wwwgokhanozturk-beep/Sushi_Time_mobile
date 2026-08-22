import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing } from '../core/theme';
import { onFatalError } from '../core/fatalErrors';

export default class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  // React ловит только ошибки рендера. Всё, что падает в эффекте, таймере или
  // обработчике события, минует boundary и в release-сборке закрывает
  // приложение — эти случаи приходят сюда через глобальный обработчик.
  componentDidMount() {
    this.unsubscribe = onFatalError((error) => {
      this.setState({ hasError: true, error });
    });
  }

  componentWillUnmount() {
    this.unsubscribe?.();
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.emoji}>:(</Text>
          <Text style={styles.title}>Something went wrong</Text>
          {/* selectable — чтобы текст ошибки можно было скопировать и прислать. */}
          <Text style={styles.message} selectable>
            {this.state.error?.message || 'Unknown error'}
          </Text>
          <TouchableOpacity style={styles.button} onPress={this.handleReset}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    backgroundColor: Colors.background,
  },
  emoji: { fontSize: 48, marginBottom: Spacing.md },
  title: { ...Typography.heading2, color: Colors.textPrimary, marginBottom: Spacing.sm },
  message: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.lg },
  button: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 12,
  },
  buttonText: { ...Typography.button, color: '#fff' },
});
