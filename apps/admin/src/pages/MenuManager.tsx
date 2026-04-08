import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

export function MenuManager() {
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: menuItems } = await supabase
      .from('menu_items')
      .select('*')
      .order('sort_order');

    setItems(menuItems || []);
    setIsLoading(false);
  };

  const toggleActive = async (id: string, currentlyActive: boolean) => {
    await supabase
      .from('menu_items')
      .update({ is_active: !currentlyActive })
      .eq('id', id);

    setItems((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, is_active: !currentlyActive } : i,
      ),
    );
  };

  const updatePrice = async (id: string, newPrice: string) => {
    const cents = Math.round(parseFloat(newPrice) * 100);
    if (isNaN(cents)) return;

    await supabase
      .from('menu_items')
      .update({ base_price: cents })
      .eq('id', id);

    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, base_price: cents } : i)),
    );
  };

  if (isLoading) {
    return <div style={styles.loading}>Loading menu...</div>;
  }

  const categories = [...new Set(items.map((i) => i.category))];

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Menu Manager</h1>

      {categories.map((cat) => (
        <div key={cat} style={styles.section}>
          <h2 style={styles.categoryTitle}>
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </h2>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Item</th>
                <th style={styles.th}>Price</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items
                .filter((i) => i.category === cat)
                .map((item) => (
                  <tr key={item.id} style={styles.row}>
                    <td style={styles.td}>
                      <strong>{item.name}</strong>
                      <br />
                      <span style={styles.desc}>{item.description}</span>
                    </td>
                    <td style={styles.td}>
                      <input
                        style={styles.priceInput}
                        defaultValue={(item.base_price / 100).toFixed(2)}
                        onBlur={(e) => updatePrice(item.id, e.target.value)}
                      />
                    </td>
                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.statusBadge,
                          backgroundColor: item.is_active
                            ? '#DEF7EC'
                            : '#FDE8E8',
                          color: item.is_active ? '#03543F' : '#9B1C1C',
                        }}
                      >
                        {item.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <button
                        style={styles.toggleButton}
                        onClick={() => toggleActive(item.id, item.is_active)}
                      >
                        {item.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: 24, minHeight: '100vh', backgroundColor: '#F9FAFB' },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    fontSize: 18,
    color: '#6B7280',
  },
  title: { fontSize: 28, fontWeight: 700, color: '#1F3F99', marginBottom: 24 },
  section: { marginBottom: 32 },
  categoryTitle: {
    fontSize: 20,
    fontWeight: 600,
    color: '#374151',
    marginBottom: 12,
    textTransform: 'capitalize',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  th: {
    textAlign: 'left',
    padding: '12px 16px',
    backgroundColor: '#F3F4F6',
    fontSize: 13,
    fontWeight: 600,
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: { borderBottom: '1px solid #F3F4F6' },
  td: { padding: '12px 16px', verticalAlign: 'middle' },
  desc: { fontSize: 13, color: '#9CA3AF' },
  priceInput: {
    width: 80,
    padding: '6px 8px',
    border: '1px solid #E5E7EB',
    borderRadius: 6,
    fontSize: 14,
    textAlign: 'right',
  },
  statusBadge: {
    padding: '4px 10px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 600,
  },
  toggleButton: {
    padding: '6px 12px',
    border: '1px solid #E5E7EB',
    borderRadius: 6,
    backgroundColor: '#fff',
    cursor: 'pointer',
    fontSize: 13,
  },
};
