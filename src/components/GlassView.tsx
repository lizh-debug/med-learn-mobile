// Liquid glass wrapper — backdrop-filter via CSS on web, semi-transparent on native.
import React from 'react';
import { View, type ViewProps } from 'react-native';

interface Props extends ViewProps {
  heavy?: boolean;
}

export default function GlassView({ heavy, style, children, ...props }: Props) {
  return (
    <View
      {...props}
      testID={heavy ? 'glass-heavy' : 'glass'}
      style={[{ backgroundColor: heavy ? 'rgba(10,14,23,0.50)' : 'rgba(15,21,32,0.65)' }, style]}
    >
      {children}
    </View>
  );
}
