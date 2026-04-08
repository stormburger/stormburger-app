import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

export function useOrders(locationId?: string) {
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrders = async () => {
    let query = supabase
      .from('orders')
      .select(`
        *,
        location:locations(name),
        order_items(
          *,
          order_item_modifiers(*)
        )
      `)
      .in('status', ['pending', 'confirmed', 'preparing', 'ready'])
      .order('created_at', { ascending: false });

    if (locationId) {
      query = query.eq('location_id', locationId);
    }

    const { data, error } = await query;
    if (!error && data) {
      setOrders(data);
    }
    setIsLoading(false);
  };

  const updateStatus = async (orderId: string, status: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId);

    if (!error) {
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status } : o)),
      );
    }
    return !error;
  };

  useEffect(() => {
    fetchOrders();

    // Realtime subscription for new/updated orders
    const channel = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          fetchOrders();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [locationId]);

  return { orders, isLoading, updateStatus, refetch: fetchOrders };
}
