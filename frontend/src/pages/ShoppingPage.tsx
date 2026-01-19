import { useState } from 'react';
import { ShoppingCart, Plus, Trash2, RefreshCw, Check } from 'lucide-react';
import {
  useShoppingList,
  useAddShoppingItem,
  useRemoveShoppingItem,
  useToggleShoppingPurchased,
  useClearPurchasedItems,
  useSyncShoppingSuggestions,
} from '../hooks/useApi';
import AddShoppingItemModal from '../components/modals/AddShoppingItemModal';
import EditQuantityModal from '../components/modals/EditQuantityModal';
import type { ShoppingListItem } from '../api/client';

type Tab = 'all' | 'tobuy' | 'purchased';

export default function ShoppingPage() {
  const { data, isLoading } = useShoppingList();
  const togglePurchasedMutation = useToggleShoppingPurchased();
  const removeMutation = useRemoveShoppingItem();
  const clearPurchasedMutation = useClearPurchasedItems();
  const syncSuggestionsMutation = useSyncShoppingSuggestions();

  const [activeTab, setActiveTab] = useState<Tab>('tobuy');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ShoppingListItem | null>(null);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  const suggestions = data?.suggestions ?? [];
  const manualItems = data?.manualItems ?? [];
  const allItems = data?.all ?? [];

  const handleSyncSuggestions = async () => {
    try {
      await syncSuggestionsMutation.mutateAsync();
    } catch (error) {
      console.error('Failed to sync suggestions:', error);
    }
  };

  const handleTogglePurchased = async (item: ShoppingListItem) => {
    try {
      await togglePurchasedMutation.mutateAsync({
        id: item.id,
        purchased: !item.purchased,
      });
    } catch (error) {
      console.error('Failed to toggle purchased:', error);
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm('Rimuovere questo item dalla lista?')) return;

    try {
      await removeMutation.mutateAsync(id);
    } catch (error) {
      console.error('Failed to remove item:', error);
    }
  };

  const handleClearPurchased = async () => {
    if (!confirm('Rimuovere tutti gli item comprati?')) return;

    try {
      await clearPurchasedMutation.mutateAsync();
    } catch (error) {
      console.error('Failed to clear purchased:', error);
    }
  };

  const handleAddSuggestion = async (suggestion: typeof suggestions[0]) => {
    const { household } = (await import('../hooks/useApi')).useAuth();
    const { useAddShoppingItem } = await import('../hooks/useApi');
    const addMutation = useAddShoppingItem();

    try {
      await addMutation.mutateAsync({
        productId: suggestion.product.id,
        quantity: suggestion.purchaseQuantity,
      });
    } catch (error) {
      console.error('Failed to add suggestion:', error);
    }
  };

  const filterItems = () => {
    switch (activeTab) {
      case 'tobuy':
        return allItems.filter(i => !i.purchased);
      case 'purchased':
        return allItems.filter(i => i.purchased);
      default:
        return allItems;
    }
  };

  const filteredItems = filterItems();
  const toBuyCount = allItems.filter(i => !i.purchased).length;
  const purchasedCount = allItems.filter(i => i.purchased).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center" style={{ padding: 'var(--space-2xl)' }}>
        <div className="loader" />
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <header className="mb-lg">
        <div className="flex items-center justify-between mb-sm">
          <h1>Lista della Spesa</h1>
          <button
            className="btn btn-primary"
            onClick={() => setShowAddModal(true)}
          >
            <Plus size={18} />
            Aggiungi
          </button>
        </div>
        <p className="text-muted">
          {toBuyCount} da comprare • {purchasedCount} comprati
        </p>
      </header>

      {/* Actions */}
      <div className="flex gap-sm mb-lg">
        <button
          className="btn btn-secondary flex-1"
          onClick={handleSyncSuggestions}
          disabled={syncSuggestionsMutation.isPending}
        >
          {syncSuggestionsMutation.isPending ? (
            <div className="loader" style={{ width: '1rem', height: '1rem' }} />
          ) : (
            <>
              <RefreshCw size={18} />
              Sync Suggerimenti
            </>
          )}
        </button>
        {purchasedCount > 0 && (
          <button
            className="btn btn-secondary flex-1"
            onClick={handleClearPurchased}
            disabled={clearPurchasedMutation.isPending}
          >
            {clearPurchasedMutation.isPending ? (
              <div className="loader" style={{ width: '1rem', height: '1rem' }} />
            ) : (
              <>
                <Trash2 size={18} />
                Pulisci Comprati
              </>
            )}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-sm mb-lg">
        <button
          className={`btn ${activeTab === 'tobuy' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('tobuy')}
        >
          Da comprare ({toBuyCount})
        </button>
        <button
          className={`btn ${activeTab === 'purchased' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('purchased')}
        >
          Comprati ({purchasedCount})
        </button>
        <button
          className={`btn ${activeTab === 'all' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('all')}
        >
          Tutti ({allItems.length})
        </button>
      </div>

      {/* Suggestions */}
      {activeTab === 'tobuy' && suggestions.length > 0 && (
        <section className="mb-lg">
          <h2 className="mb-md" style={{ fontSize: 'var(--font-size-md)' }}>
            Suggeriti
          </h2>
          <div className="flex flex-col gap-sm">
            {suggestions.map((suggestion) => (
              <div
                key={suggestion.product.id}
                className="card"
                style={{ padding: 'var(--space-md)' }}
              >
                <div className="flex items-center gap-md">
                  {suggestion.product.imageUrl ? (
                    <img
                      src={suggestion.product.imageUrl}
                      alt={suggestion.product.name}
                      style={{
                        width: '2.5rem',
                        height: '2.5rem',
                        objectFit: 'cover',
                        borderRadius: 'var(--radius-sm)',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '2.5rem',
                        height: '2.5rem',
                        background: 'var(--color-surface)',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <ShoppingCart size={18} className="text-muted" />
                    </div>
                  )}

                  <div className="flex-1">
                    <p style={{ fontWeight: 500 }}>{suggestion.product.name}</p>
                    <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>
                      Stock: {suggestion.currentStock} • Min: {suggestion.minStock}
                    </p>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontWeight: 600, fontSize: 'var(--font-size-lg)' }}>
                      {suggestion.purchaseQuantity} {suggestion.purchaseUnit}
                    </p>
                  </div>

                  <button
                    className="btn btn-primary"
                    onClick={() => handleAddSuggestion(suggestion)}
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Items List */}
      {filteredItems.length === 0 ? (
        <div className="empty-state">
          <ShoppingCart size={48} />
          <h3>
            {activeTab === 'tobuy' ? 'Niente da comprare!' : 'Lista vuota!'}
          </h3>
          <p className="text-muted">
            {activeTab === 'tobuy'
              ? 'Aggiungi prodotti o sincronizza i suggerimenti'
              : 'Aggiungi il tuo primo item'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-sm">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`card ${item.purchased ? 'opacity-60' : ''}`}
              style={{ padding: 'var(--space-md)' }}
            >
              <div className="flex items-center gap-md">
                {/* Checkbox */}
                <button
                  className="btn btn-icon"
                  style={{
                    width: '1.5rem',
                    height: '1.5rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '2px solid var(--color-text-muted)',
                    background: item.purchased ? 'var(--color-success)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onClick={() => handleTogglePurchased(item)}
                >
                  {item.purchased && <Check size={14} color="white" />}
                </button>

                {/* Product Image */}
                {item.product.imageUrl ? (
                  <img
                    src={item.product.imageUrl}
                    alt={item.product.name}
                    style={{
                      width: '2.5rem',
                      height: '2.5rem',
                      objectFit: 'cover',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '2.5rem',
                      height: '2.5rem',
                      background: 'var(--color-surface)',
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ShoppingCart size={18} className="text-muted" />
                  </div>
                )}

                {/* Product Info */}
                <div className="flex-1">
                  <p
                    style={{
                      fontWeight: 500,
                      textDecoration: item.purchased ? 'line-through' : undefined,
                    }}
                  >
                    {item.product.name}
                  </p>
                  {item.isSuggested && (
                    <span
                      className="badge"
                      style={{
                        background: 'var(--color-accent-soft)',
                        color: 'var(--color-accent)',
                        fontSize: 'var(--font-size-xs)',
                      }}
                    >
                      Suggerito
                    </span>
                  )}
                </div>

                {/* Quantity */}
                <div
                  className="flex items-center gap-sm cursor-pointer"
                  onClick={() => setEditingItem(item)}
                >
                  <span
                    style={{
                      fontWeight: 600,
                      fontSize: 'var(--font-size-lg)',
                    }}
                  >
                    {item.quantity} {item.purchaseUnit}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-sm">
                  <button
                    className="btn btn-icon btn-danger"
                    onClick={() => handleRemove(item.id)}
                    disabled={removeMutation.isPending}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showAddModal && <AddShoppingItemModal onClose={() => setShowAddModal(false)} />}
      {editingItem && (
        <EditQuantityModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
        />
      )}
    </div>
  );
}
