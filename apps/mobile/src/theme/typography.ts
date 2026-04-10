import { TextStyle, Platform } from 'react-native';

const fontFamily = Platform.OS === 'ios' ? 'System' : 'sans-serif';

export const typography = {
  hero: { fontSize: 40, fontWeight: '900', letterSpacing: -1.5 } as TextStyle,
  h1: { fontSize: 30, fontWeight: '900', letterSpacing: -1 } as TextStyle,
  h2: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 } as TextStyle,
  h3: { fontSize: 18, fontWeight: '800' } as TextStyle,
  h4: { fontSize: 15, fontWeight: '700' } as TextStyle,
  body: { fontSize: 14, fontWeight: '400', lineHeight: 20 } as TextStyle,
  bodyBold: { fontSize: 14, fontWeight: '600' } as TextStyle,
  caption: { fontSize: 13, fontWeight: '400' } as TextStyle,
  small: { fontSize: 12, fontWeight: '600' } as TextStyle,
  tiny: { fontSize: 11, fontWeight: '700' } as TextStyle,
  price: { fontSize: 22, fontWeight: '800' } as TextStyle,
  priceSmall: { fontSize: 16, fontWeight: '800' } as TextStyle,
  button: { fontSize: 15, fontWeight: '800', letterSpacing: 0.3, textTransform: 'uppercase' } as TextStyle,
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.7, textTransform: 'uppercase' } as TextStyle,
} as const;
