import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const variantStyles = {
  default: {
    container: { backgroundColor: '#f1f5f9' },
    text: { color: '#475569' },
  },
  success: {
    container: { backgroundColor: '#dcfce7' },
    text: { color: '#16a34a' },
  },
  warning: {
    container: { backgroundColor: '#fef3c7' },
    text: { color: '#d97706' },
  },
  danger: {
    container: { backgroundColor: '#fee2e2' },
    text: { color: '#dc2626' },
  },
  info: {
    container: { backgroundColor: '#e0f2fe' },
    text: { color: '#0284c7' },
  },
};

export function Badge({ children, variant = 'default', style, textStyle }: BadgeProps) {
  const variantStyle = variantStyles[variant];

  return (
    <View style={[styles.container, variantStyle.container, style]}>
      <Text style={[styles.text, variantStyle.text, textStyle]}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});
