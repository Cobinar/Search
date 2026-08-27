import React from 'react';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { FOLDER_ICON_PATHS } from '@/data/constants';

export function Icon({ name, size = 18, color }: { name: string; size?: number; color: string }) {
  const def = FOLDER_ICON_PATHS[name];
  if (!def) return null;

  const strokeProps = def.filled
    ? { fill: color, stroke: undefined }
    : { fill: 'none', stroke: color, strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'bills' && (
        <>
          <Rect x={5} y={3} width={14} height={18} rx={1} fill="none" stroke={color} strokeWidth={1.8} />
          <Path d="M8 8h8M8 12h8M8 16h5" stroke={color} strokeWidth={1.8} fill="none" />
        </>
      )}
      {name === 'spam' && (
        <>
          <Circle cx={12} cy={12} r={9} fill="none" stroke={color} strokeWidth={1.8} />
          <Path d={def.paths[0]} stroke={color} strokeWidth={1.8} fill="none" />
        </>
      )}
      {name !== 'bills' && name !== 'spam' &&
        def.paths.map((d, i) => <Path key={i} d={d} {...strokeProps} />)}
    </Svg>
  );
}
