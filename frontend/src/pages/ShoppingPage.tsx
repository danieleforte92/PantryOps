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
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

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

  const suggestions = data?.suggestions ?? [];
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
    const { useAddShoppingItem } = await import('../hooks/useApi');
    // Note: Hook rules usually forbid this, but since it's inside an async handler and we need context, 
    // it's better to move logic. Ideally useMutation should be called at top level.
    // However, for this refactor I'll assume the implementation in the original file was working 
    // or I'll fix it if it was broken. Wait, the original had dynamic import.
    // Actually, useAddShoppingItem CANNOT be used here. 
    // The previous code had: const addMutation = useAddShoppingItem(); inside the handler?? No, that's invalid React.
    // Let's use the hook at the top level properly.
    // I'll skip fixing that specifically now and just alert user if I see issues, but wait, 
    // in the original file line 75: const addMutation = useAddShoppingItem(); WAS inside handleAddSuggestion. This is a BUG. 
    // I should fix it by having a top level mutation.
    // Ah, line 14: const addMutation = useAddShoppingItem(); IS at top level in original?
    // checking original file...
    // Line 75: const addMutation = useAddShoppingItem(); inside handleAddSuggestion. 
    // This is definitely a rules of hooks violation. 
    // I will fix it by using a second instance of the mutation or reusing one if possible.
    // I'll add a separate top-level hook for adding suggestions.
  };

  // Fix for the hook violation above:
  const addMutation = useAddShoppingItem();
  const handleAddSuggestionFixed = async (suggestion: typeof suggestions[0]) => {
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
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in pb-24 space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Lista della Spesa</h1>
          <Button onClick={() => setShowAddModal(true)} size="sm" className="rounded-xl">
            <Plus size={18} className="mr-2" />
            Aggiungi
          </Button>
        </div>
        <p className="text-sm font-medium text-text-muted">
          {toBuyCount} da comprare • {purchasedCount} comprati
        </p>
      </header>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="secondary"
          className="flex-1"
          onClick={handleSyncSuggestions}
          disabled={syncSuggestionsMutation.isPending}
        >
          {syncSuggestionsMutation.isPending ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
          ) : (
            <RefreshCw size={18} className="mr-2" />
          )}
          Sync Suggerimenti
        </Button>

        {purchasedCount > 0 && (
          <Button
            variant="secondary"
            className="flex-1"
            onClick={handleClearPurchased}
            disabled={clearPurchasedMutation.isPending}
          >
            {clearPurchasedMutation.isPending ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
            ) : (
              <Trash2 size={18} className="mr-2" />
            )}
            Pulisci Comprati
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-gray-100 dark:bg-surface-dark rounded-xl">
        <button
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'tobuy' ? 'bg-white dark:bg-zinc-800 text-primary shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'}`}
          onClick={() => setActiveTab('tobuy')}
        >
          Da comprare
        </button>
        <button
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'purchased' ? 'bg-white dark:bg-zinc-800 text-primary shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'}`}
          onClick={() => setActiveTab('purchased')}
        >
          Comprati
        </button>
        <button
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'all' ? 'bg-white dark:bg-zinc-800 text-primary shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'}`}
          onClick={() => setActiveTab('all')}
        >
          Tutti
        </button>
      </div>

      {/* Suggestions */}
      {activeTab === 'tobuy' && suggestions.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Suggeriti</h2>
          <div className="flex flex-col gap-3">
            {suggestions.map((suggestion) => (
              <Card key={suggestion.product.id} className="p-3 flex items-center gap-3">
                {suggestion.product.imageUrl ? (
                  <img
                    src={suggestion.product.imageUrl}
                    alt={suggestion.product.name}
                    className="w-12 h-12 rounded-lg object-cover bg-gray-100"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-400">
                    <ShoppingCart size={20} />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 dark:text-white truncate">{suggestion.product.name}</p>
                  <p className="text-xs text-text-muted">
                    Stock: {suggestion.currentStock} • Min: {suggestion.minStock}
                  </p>
                </div>

                <div className="text-right mr-2">
                  <p className="font-bold text-lg text-primary">
                    {suggestion.purchaseQuantity} <span className="text-xs font-normal text-text-muted">{suggestion.purchaseUnit}</span>
                  </p>
                </div>

                <Button size="icon" className="h-9 w-9 rounded-full" onClick={() => handleAddSuggestionFixed(suggestion)}>
                  <Plus size={18} />
                </Button>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Items List */}
      {filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center text-text-muted">
          <ShoppingCart size={48} className="mb-4 opacity-20" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
            {activeTab === 'tobuy' ? 'Niente da comprare!' : 'Lista vuota!'}
          </h3>
          <p className="text-sm">
            {activeTab === 'tobuy'
              ? 'Aggiungi prodotti o sincronizza i suggerimenti'
              : 'Aggiungi il tuo primo item'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredItems.map((item) => (
            <Card
              key={item.id}
              className={`p-3 flex items-center gap-3 transition-opacity ${item.purchased ? 'opacity-50' : ''}`}
            >
              {/* Checkbox */}
              <button
                className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${item.purchased
                    ? 'bg-success border-success text-white'
                    : 'border-gray-300 dark:border-gray-600 hover:border-primary'
                  }`}
                onClick={() => handleTogglePurchased(item)}
              >
                {item.purchased && <Check size={14} strokeWidth={3} />}
              </button>

              {/* Product Image */}
              {item.product.imageUrl ? (
                <img
                  src={item.product.imageUrl}
                  alt={item.product.name}
                  className="w-10 h-10 rounded-lg object-cover bg-gray-100"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-400">
                  <ShoppingCart size={18} />
                </div>
              )}

              {/* Product Info */}
              <div className="flex-1 min-w-0">
                <p className={`font-bold text-sm text-gray-900 dark:text-white truncate ${item.purchased ? 'line-through' : ''}`}>
                  {item.product.name}
                </p>
                {item.isSuggested && (
                  <Badge variant="secondary" className="mt-0.5 text-[10px] h-4 px-1.5">
                    Suggerito
                  </Badge>
                )}
              </div>

              {/* Quantity */}
              <div
                className="flex items-center gap-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-white/5 p-1 rounded-lg"
                onClick={() => setEditingItem(item)}
              >
                <span className="font-bold text-gray-900 dark:text-white">
                  {item.quantity}
                </span>
                <span className="text-xs text-text-muted font-medium">
                  {item.purchaseUnit}
                </span>
              </div>

              {/* Actions */}
              <button
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-danger hover:bg-danger/10 rounded-full transition-colors ml-1"
                onClick={() => handleRemove(item.id)}
                disabled={removeMutation.isPending}
              >
                <Trash2 size={16} />
              </button>
            </Card>
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
