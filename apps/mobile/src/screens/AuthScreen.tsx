import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Image,
} from 'react-native';
import { useAuthStore } from '../stores/authStore';
import { colors, typography, spacing, radius, shadow } from '../theme';

type Mode = 'signin' | 'signup';

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const { signIn, signUp, isLoading } = useAuthStore();

  const handleSubmit = async () => {
    try {
      if (mode === 'signup') {
        if (!name.trim()) { Alert.alert('Error', 'Please enter your name'); return; }
        await signUp(email.trim(), password, name.trim());
      } else {
        await signIn(email.trim(), password);
      }
    } catch (err: any) { Alert.alert('Error', err.message); }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Image source={{ uri: 'https://www.stormburger.com/StormLogo.png' }} style={styles.logo} resizeMode="contain" />
          <Text style={styles.tagline}>ORDER AHEAD · SKIP THE LINE</Text>

          {/* Tab toggle */}
          <View style={styles.tabs}>
            <TouchableOpacity style={[styles.tab, mode === 'signin' && styles.tabActive]} onPress={() => setMode('signin')}>
              <Text style={[styles.tabText, mode === 'signin' && styles.tabTextActive]}>Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tab, mode === 'signup' && styles.tabActive]} onPress={() => setMode('signup')}>
              <Text style={[styles.tabText, mode === 'signup' && styles.tabTextActive]}>Create Account</Text>
            </TouchableOpacity>
          </View>

          {mode === 'signup' && (
            <TextInput style={styles.input} placeholder="Full Name" placeholderTextColor={colors.textMuted}
              value={name} onChangeText={setName} autoCapitalize="words" />
          )}
          <TextInput style={styles.input} placeholder="Email" placeholderTextColor={colors.textMuted}
            value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <TextInput style={styles.input} placeholder="Password" placeholderTextColor={colors.textMuted}
            value={password} onChangeText={setPassword} secureTextEntry />

          <TouchableOpacity style={[styles.submitBtn, isLoading && styles.disabled]} onPress={handleSubmit} disabled={isLoading}>
            {isLoading ? <ActivityIndicator color={colors.textInverse} /> : (
              <Text style={styles.submitText}>{mode === 'signin' ? 'SIGN IN' : 'CREATE ACCOUNT'}</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl },
  card: {
    backgroundColor: colors.card, borderRadius: radius.xl, padding: 40,
    borderWidth: 1, borderColor: colors.border, ...shadow.medium, alignItems: 'center',
  },
  logo: { width: 180, height: 56, marginBottom: spacing.md },
  tagline: { ...typography.label, color: colors.textMuted, marginBottom: spacing.xl },
  tabs: {
    flexDirection: 'row', borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, overflow: 'hidden', marginBottom: spacing.xl, alignSelf: 'stretch',
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: colors.surface },
  tabActive: { backgroundColor: colors.primary },
  tabText: { ...typography.bodyBold, color: colors.textSecondary },
  tabTextActive: { color: colors.textInverse, fontWeight: '700' },
  input: {
    ...typography.body, backgroundColor: colors.surface, borderRadius: radius.md,
    padding: 12, marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.borderStrong,
    color: colors.text, alignSelf: 'stretch',
  },
  submitBtn: {
    backgroundColor: colors.secondary, borderRadius: radius.md, padding: 14,
    alignItems: 'center', alignSelf: 'stretch',
    ...shadow.medium,
  },
  submitText: { ...typography.button, color: colors.textInverse },
  disabled: { opacity: 0.6 },
});
