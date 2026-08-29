import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/theme/tokens';

/**
 * Only ever true for mail written by handleSendMail's cobinar-to-cobinar
 * fast path — meaning the sender was a Firebase-authenticated mailbox
 * holder at send time, not just a "From" header on an arbitrary inbound
 * SMTP message. Regular inbound mail is unverified by default, same as
 * real email always is without your own SPF/DKIM/DMARC checks — this
 * badge deliberately does NOT appear on that mail, rather than guess.
 */
export function VerifiedBadge() {
  return (
    <View style={styles.pill}>
      <Text style={styles.text}>✓ Verified sender</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderWidth: 1.5,
    borderColor: colors.green,
    backgroundColor: '#E9F9EF',
    paddingHorizontal: 9,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  text: {
    color: colors.green,
    fontSize: 11,
    fontWeight: '700',
  },
});
