import { useState } from 'react';
import { useOrders } from '../hooks/useOrders';

const statusColors: Record<string, string> = {
  pending: '#F59E0B',
  confirmed: '#3B82F6',
  preparing: '#8B5CF6',
  ready: '#22C55E',
  picked_up: '#6B7280',
  cancelled: '#EF4444',
};

const statusActions: Record<string, { label: string; next: string }[]> = {
  pending: [
    { label: 'Accept', next: 'confirmed' },
    { label: 'Reject', next: 'cancelled' },
  ],
  confirmed: [{ label: 'Start Preparing', next: 'preparing' }],
  preparing: [{ label: 'Mark Ready', next: 'ready' }],
  ready: [{ label: 'Picked Up', next: 'picked_up' }],
};

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function OrdersDashboard() {
  const { orders, isLoading, updateStatus } = useOrders();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleAction = async (orderId: string, status: string) => {
    setUpdatingId(orderId);
    await updateStatus(orderId, status);
    setUpdatingId(null);
  };

  if (isLoading) {
    return (
      <div style={styles.loading}>
        <p>Loading orders...</p>
      </div>
    );
  }

  const activeOrders = orders.filter((o) => o.status !== 'picked_up' && o.status !== 'cancelled');

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>StormBurger Kitchen</h1>
        <span style={styles.orderCount}>
          {activeOrders.length} active orders
        </span>
      </div>

      {activeOrders.length === 0 ? (
        <div style={styles.empty}>
          <p style={styles.emptyText}>No active orders</p>
          <p style={styles.emptySubtext}>New orders will appear here in real-time</p>
        </div>
      ) : (
        <div style={styles.grid}>
          {activeOrders.map((order) => (
            <div key={order.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <div>
                  <span style={styles.orderNumber}>{order.order_number}</span>
                  <span style={styles.orderTime}>
                    {formatTime(order.created_at)}
                  </span>
                </div>
                <span
                  style={{
                    ...styles.statusBadge,
                    backgroundColor: statusColors[order.status] || '#6B7280',
                  }}
                >
                  {order.status.replace(/_/g, ' ').toUpperCase()}
                </span>
              </div>

              <div style={styles.locationTag}>
                📍 {order.location?.name}
              </div>

              <div style={styles.items}>
                {(order.order_items || []).map((item: any) => (
                  <div key={item.id} style={styles.itemRow}>
                    <span style={styles.itemQty}>{item.quantity}x</span>
                    <div style={styles.itemDetails}>
                      <span style={styles.itemName}>{item.menu_item_name}</span>
                      {(item.order_item_modifiers || []).length > 0 && (
                        <span style={styles.itemMods}>
                          {item.order_item_modifiers
                            .map((m: any) => m.modifier_name)
                            .join(', ')}
                        </span>
                      )}
                      {item.special_instructions && (
                        <span style={styles.itemNote}>
                          ⚠️ {item.special_instructions}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {order.special_instructions && (
                <div style={styles.orderNote}>
                  📝 {order.special_instructions}
                </div>
              )}

              <div style={styles.cardFooter}>
                <span style={styles.total}>{formatPrice(order.total)}</span>
                <div style={styles.actions}>
                  {(statusActions[order.status] || []).map((action) => (
                    <button
                      key={action.next}
                      style={{
                        ...styles.actionButton,
                        backgroundColor:
                          action.next === 'cancelled'
                            ? '#EF4444'
                            : '#1F3F99',
                      }}
                      onClick={() => handleAction(order.id, action.next)}
                      disabled={updatingId === order.id}
                    >
                      {updatingId === order.id ? '...' : action.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#F3F4F6',
    padding: 24,
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    fontSize: 18,
    color: '#6B7280',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    color: '#1F3F99',
    margin: 0,
  },
  orderCount: {
    fontSize: 16,
    color: '#6B7280',
    backgroundColor: '#fff',
    padding: '8px 16px',
    borderRadius: 20,
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 400,
  },
  emptyText: { fontSize: 20, color: '#374151', fontWeight: 600 },
  emptySubtext: { fontSize: 14, color: '#9CA3AF' },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
    gap: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderNumber: {
    fontSize: 20,
    fontWeight: 700,
    color: '#1A1A1A',
    display: 'block',
  },
  orderTime: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  statusBadge: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 700,
    padding: '4px 10px',
    borderRadius: 12,
    letterSpacing: 0.5,
  },
  locationTag: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
  },
  items: {
    borderTop: '1px solid #F3F4F6',
    paddingTop: 12,
  },
  itemRow: {
    display: 'flex',
    padding: '6px 0',
  },
  itemQty: {
    fontWeight: 700,
    color: '#1F3F99',
    width: 28,
    flexShrink: 0,
  },
  itemDetails: {
    display: 'flex',
    flexDirection: 'column',
  },
  itemName: {
    fontWeight: 500,
    color: '#1A1A1A',
  },
  itemMods: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  itemNote: {
    fontSize: 12,
    color: '#F59E0B',
    marginTop: 2,
  },
  orderNote: {
    fontSize: 13,
    color: '#F59E0B',
    backgroundColor: '#FFF7ED',
    padding: '8px 12px',
    borderRadius: 8,
    marginTop: 12,
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTop: '1px solid #F3F4F6',
  },
  total: {
    fontSize: 20,
    fontWeight: 700,
    color: '#1F3F99',
  },
  actions: {
    display: 'flex',
    gap: 8,
  },
  actionButton: {
    color: '#fff',
    border: 'none',
    padding: '8px 16px',
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 14,
    cursor: 'pointer',
  },
};
