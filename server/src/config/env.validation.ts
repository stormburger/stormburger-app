/**
 * Validates required environment variables at startup.
 * Throws immediately if anything is missing — don't let the server
 * start in a broken state and fail on the first customer request.
 */
export function validateEnv(config: Record<string, any>): Record<string, any> {
  const required = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'STRIPE_SECRET_KEY',
  ];

  const missing = required.filter((key) => !config[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
        `Check your .env file or deployment configuration.`,
    );
  }

  // Validate formats
  if (!config.SUPABASE_URL.startsWith('https://')) {
    throw new Error('SUPABASE_URL must start with https://');
  }

  if (
    !config.STRIPE_SECRET_KEY.startsWith('sk_test_') &&
    !config.STRIPE_SECRET_KEY.startsWith('sk_live_')
  ) {
    throw new Error('STRIPE_SECRET_KEY must start with sk_test_ or sk_live_');
  }

  // Defaults
  config.PORT = parseInt(config.PORT, 10) || 3000;
  config.CA_TAX_RATE = config.CA_TAX_RATE || '0.0975';
  config.NODE_ENV = config.NODE_ENV || 'development';

  return config;
}
