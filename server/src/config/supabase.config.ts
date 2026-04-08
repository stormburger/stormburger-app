import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SupabaseService {
  private client: SupabaseClient;
  private adminClient: SupabaseClient;

  constructor(private config: ConfigService) {
    this.client = createClient(
      config.getOrThrow('SUPABASE_URL'),
      config.getOrThrow('SUPABASE_ANON_KEY'),
    );

    const serviceKey = config.get('SUPABASE_SERVICE_KEY');
    this.adminClient = createClient(
      config.getOrThrow('SUPABASE_URL'),
      serviceKey || config.getOrThrow('SUPABASE_ANON_KEY'),
    );
  }

  /** Public client — respects RLS */
  getClient(): SupabaseClient {
    return this.client;
  }

  /** Authenticated client — uses the user's JWT to respect RLS as that user */
  getClientForUser(jwt: string): SupabaseClient {
    return createClient(
      this.config.getOrThrow('SUPABASE_URL'),
      this.config.getOrThrow('SUPABASE_ANON_KEY'),
      { global: { headers: { Authorization: `Bearer ${jwt}` } } },
    );
  }

  /** Service role client — bypasses RLS for backend operations */
  getAdminClient(): SupabaseClient {
    return this.adminClient;
  }
}
