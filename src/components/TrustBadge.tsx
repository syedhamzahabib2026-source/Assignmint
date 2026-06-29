import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from './common/Icon';
import {
  getTrustTier,
  getTrustTierColor,
  getTrustTierLabel,
} from '../services/trust/trustScore';

interface TrustBadgeProps {
  score: number;
  showScore?: boolean;
  size?: 'sm' | 'md';
}

const TrustBadge: React.FC<TrustBadgeProps> = ({
  score,
  showScore = true,
  size = 'md',
}) => {
  const tier  = getTrustTier(score);
  const color = getTrustTierColor(tier);
  const label = getTrustTierLabel(tier);
  const sm    = size === 'sm';

  return (
    <View style={[styles.container, { backgroundColor: color + '20' }, sm && styles.containerSm]}>
      <Icon name="shield-checkmark" size={sm ? 11 : 13} color={color} />
      <Text style={[styles.label, { color }, sm && styles.labelSm]}>
        {showScore ? `${label} · ${score}` : label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  containerSm: {
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
  labelSm: {
    fontSize: 11,
  },
});

export default TrustBadge;
