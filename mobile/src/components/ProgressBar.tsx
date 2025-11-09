import React from 'react';
import { View, StyleSheet } from 'react-native';

interface ProgressBarProps {
  progress: number;
  height?: number;
}

export default function ProgressBar({ progress, height = 6 }: ProgressBarProps) {
  const percentage = Math.min(Math.max(progress, 0), 100);

  return (
    <View style={[styles.container, { height }]}>
      <View
        style={[
          styles.fill,
          {
            width: `${percentage}%`,
            height,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    backgroundColor: '#0066cc',
  },
});

