import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.config';

@Injectable()
export class LocationsService {
  constructor(private readonly supabase: SupabaseService) {}

  async findAll() {
    const { data, error } = await this.supabase
      .getClient()
      .from('locations')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data;
  }

  async findOne(id: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('locations')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException('Location not found');
    return data;
  }

  async getHours(locationId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('location_hours')
      .select('*')
      .eq('location_id', locationId)
      .order('day_of_week');

    if (error) throw error;
    return data;
  }

  async getOpenStatus(locationId: string) {
    const location = await this.findOne(locationId);
    if (!location.is_accepting_orders) {
      return { is_open: false, reason: 'Not accepting orders' };
    }

    const now = new Date();
    const dayOfWeek = now.getDay();

    const { data: hours } = await this.supabase
      .getClient()
      .from('location_hours')
      .select('*')
      .eq('location_id', locationId)
      .eq('day_of_week', dayOfWeek)
      .single();

    if (!hours || hours.is_closed) {
      return { is_open: false, reason: 'Closed today' };
    }

    const currentTime = now.toLocaleTimeString('en-US', {
      hour12: false,
      timeZone: location.timezone,
    });

    const isOpen =
      currentTime >= hours.open_time && currentTime <= hours.close_time;

    return {
      is_open: isOpen,
      open_time: hours.open_time,
      close_time: hours.close_time,
      reason: isOpen ? null : 'Outside operating hours',
    };
  }
}
