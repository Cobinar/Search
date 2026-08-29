import React, { useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { colors, avatarPalette } from '@/theme/tokens';

interface AvatarProps {
  initial: string;
  colorKey: string; // '', 'bg-blue', 'bg-green', 'bg-purple', 'bg-red'
  avatarUrl?: string;
  size?: number;
}

export function Avatar({ initial, colorKey, avatarUrl, size = 36 }: AvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const bg = avatarPalette[colorKey] ?? colors.orange;
  const showImage = !!avatarUrl && !imageFailed;

  return (
    <View
      style={[
        styles.base,
        { width: size, height: size, backgroundColor: bg },
      ]}
    >
      <Text style={[styles.initial, { fontSize: size * 0.4 }]}>{initial}</Text>
      {showImage && (
        <Image
          source={{ uri: avatarUrl }}
          onError={() => setImageFailed(true)}
          style={StyleSheet.absoluteFillObject}
          accessibilityIgnoresInvertColors
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 2,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initial: {
    color: colors.white,
    fontWeight: '800',
  },
});
