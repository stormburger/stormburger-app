import { TextStyle } from 'react-native';

export const typography = {
  h1: { fontSize: 28, fontWeight: '700', lineHeight: 34 } as TextStyle,
  h2: { fontSize: 22, fontWeight: '700', lineHeight: 28 } as TextStyle,
  h3: { fontSize: 18, fontWeight: '600', lineHeight: 24 } as TextStyle,
  body: { fontSize: 16, fontWeight: '400', lineHeight: 22 } as TextStyle,
  bodyBold: { fontSize: 16, fontWeight: '600', lineHeight: 22 } as TextStyle,
  caption: { fontSize: 14, fontWeight: '400', lineHeight: 20 } as TextStyle,
  small: { fontSize: 12, fontWeight: '400', lineHeight: 16 } as TextStyle,
  price: { fontSize: 18, fontWeight: '700', lineHeight: 24 } as TextStyle,
  button: { fontSize: 16, fontWeight: '600', lineHeight: 22 } as TextStyle,
} as const;
