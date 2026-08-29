import React from 'react';
import { View, Pressable, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { colors, borderWidth as bw } from '@/theme/tokens';

/**
 * React Native has no equivalent of `box-shadow: 3px 3px 0 #16171C` — iOS's
 * shadow* props always blur, and Android's `elevation` is a fixed grey
 * Material shadow, not a solid offset color. So this is built the honest
 * way: a real ink-colored View, sized to match the content and offset
 * down-right by `offset`, sitting behind it. Same visual result as the
 * web version's hard shadows, just made of an actual element instead of
 * a CSS property that doesn't exist here.
 */
export function HardShadowBox({
  offset = 3,
  style,
  children,
}: {
  offset?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  return (
    <View style={{ marginRight: offset, marginBottom: offset }}>
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { top: offset, left: offset, backgroundColor: colors.ink }]}
      />
      <View style={style}>{children}</View>
    </View>
  );
}

interface NeoButtonProps {
  onPress: () => void;
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'danger';
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  accessibilityLabel?: string;
}

/** The web version's press interaction — offset grows on hover, shrinks to
 *  near-zero on press, so the element looks like it lifts and then pushes
 *  back down. No hover on touch, so here it's just rest vs. pressed. */
export function NeoButton({
  onPress, children, variant = 'default', style, disabled, accessibilityLabel,
}: NeoButtonProps) {
  const bg = variant === 'primary' ? colors.orange : colors.bg;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [{ marginRight: 3, marginBottom: 3, opacity: disabled ? 0.5 : 1 }]}
    >
      {({ pressed }) => (
        <View style={{ position: 'relative' }}>
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              {
                top: pressed ? 1 : 3,
                left: pressed ? 1 : 3,
                backgroundColor: colors.ink,
              },
            ]}
          />
          <View
            style={[
              {
                borderWidth: bw.standard,
                borderColor: colors.ink,
                backgroundColor: bg,
                paddingVertical: 9,
                paddingHorizontal: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 7,
                transform: [{ translateX: pressed ? 1 : 0 }, { translateY: pressed ? 1 : 0 }],
              },
              variant === 'danger' && { borderColor: colors.red },
              style,
            ]}
          >
            {children}
          </View>
        </View>
      )}
    </Pressable>
  );
}
