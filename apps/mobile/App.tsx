import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StripeProvider } from '@stripe/stripe-react-native';
import { AppNavigator } from './src/navigation/AppNavigator';

const STRIPE_PUBLISHABLE_KEY =
  'pk_test_51TJQRRDzsKXc9CcJ48S94Jo3cpbV5lKtUY98SV91UUsvfMlum0V9HKGuqKrMOuCtEOo7pQcnhGRHlfT405L1uOWW00Lqbdf2Yx';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
        <AppNavigator />
      </StripeProvider>
    </GestureHandlerRootView>
  );
}
