import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';

const { width, height } = Dimensions.get('window');

interface Props {
  onFinish: () => void;
}

export function SplashScreen({ onFinish }: Props) {
  // Animation values
  const lightning1 = useRef(new Animated.Value(0)).current;
  const lightning2 = useRef(new Animated.Value(0)).current;
  const flash = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const stormOpacity = useRef(new Animated.Value(0)).current;
  const burgerOpacity = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const boltOpacity = useRef(new Animated.Value(0)).current;
  const boltTranslateY = useRef(new Animated.Value(-100)).current;
  const bgGlow = useRef(new Animated.Value(0)).current;
  const fadeOut = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const sequence = Animated.sequence([
      // Beat 1: Dark pause (500ms)
      Animated.delay(300),

      // Beat 2: First lightning flash
      Animated.parallel([
        Animated.sequence([
          Animated.timing(flash, { toValue: 0.8, duration: 80, useNativeDriver: true }),
          Animated.timing(flash, { toValue: 0, duration: 150, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(lightning1, { toValue: 1, duration: 80, useNativeDriver: true }),
          Animated.timing(lightning1, { toValue: 0.3, duration: 200, useNativeDriver: true }),
        ]),
      ]),

      Animated.delay(200),

      // Beat 3: Second lightning flash (stronger) + bolt drops
      Animated.parallel([
        Animated.sequence([
          Animated.timing(flash, { toValue: 1, duration: 60, useNativeDriver: true }),
          Animated.timing(flash, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(lightning2, { toValue: 1, duration: 60, useNativeDriver: true }),
          Animated.timing(lightning2, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]),
        // Bolt drops from sky
        Animated.parallel([
          Animated.timing(boltOpacity, { toValue: 1, duration: 100, useNativeDriver: true }),
          Animated.spring(boltTranslateY, { toValue: 0, speed: 20, bounciness: 4, useNativeDriver: true }),
        ]),
      ]),

      Animated.delay(100),

      // Beat 4: Logo reveals with impact
      Animated.parallel([
        // Background glow
        Animated.timing(bgGlow, { toValue: 1, duration: 400, useNativeDriver: true }),
        // Logo scales up with spring
        Animated.spring(logoScale, { toValue: 1, speed: 8, bounciness: 6, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        // "STORM" appears first
        Animated.timing(stormOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]),

      Animated.delay(150),

      // Beat 5: "BURGER" slams in
      Animated.timing(burgerOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),

      // Quick flash on BURGER reveal
      Animated.sequence([
        Animated.timing(flash, { toValue: 0.3, duration: 50, useNativeDriver: true }),
        Animated.timing(flash, { toValue: 0, duration: 100, useNativeDriver: true }),
      ]),

      Animated.delay(200),

      // Beat 6: Tagline fades in
      Animated.timing(taglineOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),

      // Hold for a moment
      Animated.delay(800),

      // Beat 7: Fade out everything
      Animated.timing(fadeOut, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]);

    sequence.start(() => {
      onFinish();
    });
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: fadeOut }]}>
      <StatusBar barStyle="light-content" />

      {/* Dark storm background */}
      <View style={styles.background} />

      {/* Background glow (subtle navy pulse behind logo) */}
      <Animated.View
        style={[
          styles.glow,
          {
            opacity: Animated.multiply(bgGlow, new Animated.Value(0.3)),
          },
        ]}
      />

      {/* Lightning bolt 1 (left) */}
      <Animated.Text
        style={[
          styles.lightningLeft,
          { opacity: lightning1 },
        ]}
      >
        ⚡
      </Animated.Text>

      {/* Lightning bolt 2 (right) */}
      <Animated.Text
        style={[
          styles.lightningRight,
          { opacity: lightning2 },
        ]}
      >
        ⚡
      </Animated.Text>

      {/* Flash overlay */}
      <Animated.View
        style={[
          styles.flash,
          { opacity: flash },
        ]}
      />

      {/* Center content */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        {/* Lightning bolt icon above text */}
        <Animated.Text
          style={[
            styles.boltIcon,
            {
              opacity: boltOpacity,
              transform: [{ translateY: boltTranslateY }],
            },
          ]}
        >
          ⚡
        </Animated.Text>

        {/* Logo text */}
        <View style={styles.logoRow}>
          <Animated.Text style={[styles.storm, { opacity: stormOpacity }]}>
            STORM
          </Animated.Text>
          <Animated.Text style={[styles.burger, { opacity: burgerOpacity }]}>
            BURGER
          </Animated.Text>
        </View>

        {/* Tagline */}
        <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
          Fresh. Bold. Unforgettable.
        </Animated.Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0A0F1E',
  },
  glow: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#1F3F99',
  },
  flash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
    zIndex: 10,
  },
  lightningLeft: {
    position: 'absolute',
    top: height * 0.15,
    left: width * 0.1,
    fontSize: 60,
    transform: [{ rotate: '-15deg' }],
  },
  lightningRight: {
    position: 'absolute',
    top: height * 0.12,
    right: width * 0.08,
    fontSize: 48,
    transform: [{ rotate: '20deg' }],
  },
  logoContainer: {
    alignItems: 'center',
    zIndex: 5,
  },
  boltIcon: {
    fontSize: 56,
    marginBottom: 8,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  storm: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  burger: {
    fontSize: 48,
    fontWeight: '900',
    color: '#E53E3E',
    letterSpacing: 2,
  },
  tagline: {
    fontSize: 16,
    fontWeight: '500',
    color: '#8B9DC3',
    marginTop: 12,
    letterSpacing: 3,
  },
});
