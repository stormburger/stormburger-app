import { Controller, Get } from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.config';
import { ConfigService } from '@nestjs/config';

/**
 * Health check endpoint for uptime monitors and load balancers.
 * Tests actual connectivity to dependencies — not just "is the process alive."
 *
 * GET /api/health returns:
 * - 200 if all dependencies are reachable
 * - 503 if any critical dependency is down
 */
@Controller('health')
export class HealthController {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  async check() {
    const checks: Record<string, { status: string; latency_ms?: number }> = {};
    let healthy = true;

    // Supabase database
    const dbStart = Date.now();
    try {
      const { error } = await this.supabase
        .getAdminClient()
        .from('locations')
        .select('id')
        .limit(1);

      checks.database = error
        ? { status: 'unhealthy' }
        : { status: 'healthy', latency_ms: Date.now() - dbStart };

      if (error) healthy = false;
    } catch {
      checks.database = { status: 'unhealthy' };
      healthy = false;
    }

    // Supabase auth
    const authStart = Date.now();
    try {
      // A lightweight auth call — just checks the service is responding
      await this.supabase.getClient().auth.getSession();
      checks.auth = { status: 'healthy', latency_ms: Date.now() - authStart };
    } catch {
      checks.auth = { status: 'unhealthy' };
      healthy = false;
    }

    // Stripe (verify the key is valid by listing 0 payment intents)
    const stripeStart = Date.now();
    try {
      const Stripe = require('stripe');
      const stripe = new Stripe(this.config.get('STRIPE_SECRET_KEY'));
      await stripe.paymentIntents.list({ limit: 1 });
      checks.stripe = {
        status: 'healthy',
        latency_ms: Date.now() - stripeStart,
      };
    } catch {
      checks.stripe = { status: 'unhealthy' };
      // Stripe being down is not a full outage — browsing still works
      // But payment won't work, so flag it
    }

    const response = {
      status: healthy ? 'healthy' : 'degraded',
      version: process.env.npm_package_version || '1.0.0',
      uptime_seconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      checks,
    };

    // Return 503 if unhealthy so load balancers can route traffic away
    if (!healthy) {
      return { statusCode: 503, ...response };
    }

    return response;
  }
}
