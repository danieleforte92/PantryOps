import { useState } from 'react';
import { X, Plus, Trash2, ChevronDown, ChevronRight, Search, Package, AlertCircle, CheckCircle } from 'lucide-react';
import { useCategoriesWithMappings, useAssignProductToCategory, useRemoveProductFromCategory, useUpdateMappingPriority, useProducts } from '../../hooks/useApi';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';

interface MappingManagementModalProps {
  onClose: () => void;
}

export default function MappingManagementModal({ onClose }: MappingManagementModalProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchProductTerm, setSearchProductTerm] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [newPriority, setNewPriority] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Hooks
  const { data: categoriesData, isLoading: isLoadingCategories } = useCategoriesWithMappings();
  const { data: productsData } = useProducts();
  const assignMutation = useAssignProductToCategory();
  const removeMutation = useRemoveProductFromCategory();
  const updatePriorityMutation = useUpdateMappingPriority();

  // Data
  const categories = categoriesData?.categories ?? [];
  const products = productsData?.products ?? [];
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchProductTerm.toLowerCase())
  );

  // Stats calculation
  const totalProducts = products.length;
  const mappedProducts = categories.reduce((sum, cat) => sum + cat.products.length, 0);
  const mappingPercentage = totalProducts > 0 ? Math.round((mappedProducts / totalProducts) * 100) : 0;

  // Helper functions
  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const handleAssign = async () => {
    if (!selectedProductId || !selectedCategoryId) return;

    try {
      await assignMutation.mutateAsync({ categoryId: selectedCategoryId, productId: selectedProductId, priority: newPriority });
      setSuccess('Mapping creato con successo!');
      setShowAddForm(false);
      setSelectedProductId('');
      setSelectedCategoryId('');
      setNewPriority(1);
      setSearchProductTerm('');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err?.message || 'Errore durante la creazione del mapping');
    }
  };

  const handleRemove = async (categoryId: string, productId: string) => {
    try {
      await removeMutation.mutateAsync({ categoryId, productId });
    } catch (err: any) {
      setError(err?.message || 'Errore durante la rimozione del mapping');
    }
  };

  const handleUpdatePriority = async (categoryId: string, productId: string, priority: number) => {
    try {
      await updatePriorityMutation.mutateAsync({ categoryId, productId, priority });
    } catch (err: any) {
      setError(err?.message || 'Errore durante l\'aggiornamento della priorità');
    }
  };

  // Badge color based on percentage
  const getBadgeColor = (percentage: number) => {
    if (percentage > 80) return 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400';
    if (percentage > 50) return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400';
    return 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400';
  };

  if (isLoadingCategories) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
        <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-white dark:bg-surface-dark border-gray-200 dark:border-white/10 shadow-xl">
          <CardContent className="flex-1 flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <Card
        className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-white dark:bg-surface-dark border-gray-200 dark:border-white/10 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-gray-100 dark:border-white/5">
          <CardTitle className="text-xl font-bold">Gestione Categorie Prodotti</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
            <X size={20} />
          </Button>
        </CardHeader>

        <CardContent className="flex-1 overflow-auto p-6 space-y-6">
          {/* Success Message */}
          {success && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-green-900/20 border border-green-800 animate-in fade-in slide-in-from-top-2">
              <CheckCircle size={20} className="text-green-400" />
              <span className="font-bold text-green-300">{success}</span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-red-900/20 border border-red-800 animate-in fade-in slide-in-from-top-2">
              <AlertCircle size={20} className="text-red-400" />
              <span className="font-medium text-red-300">{error}</span>
            </div>
          )}

          {/* Stats Header */}
          <div className="p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-2xl border border-gray-200 dark:border-white/5">
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-gray-900 dark:text-white">Progresso Mapping</span>
              <div className={`px-2 py-1 rounded-full text-xs font-bold ${getBadgeColor(mappingPercentage)}`}>
                {mappingPercentage}%
              </div>
            </div>
            <div className="w-full bg-gray-200 dark:bg-zinc-700 rounded-full h-2 overflow-hidden">
              <div className="h-full bg-primary transition-all duration-300" style={{ width: `${mappingPercentage}%` }} />
            </div>
            <p className="text-xs text-text-muted mt-2">{mappedProducts}/{totalProducts} prodotti mappati</p>
          </div>

          {/* Add Form (expandable) */}
          {showAddForm && (
            <div className="p-4 bg-primary/5 rounded-2xl border border-primary/20">
              <div className="relative mb-3">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-gray-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Cerca prodotto..."
                  value={searchProductTerm}
                  onChange={(e) => setSearchProductTerm(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="max-h-48 overflow-y-auto mb-3">
                {filteredProducts.slice(0, 10).map((product) => (
                  <div
                    key={product.id}
                    className={`flex items-center gap-3 p-2 rounded-xl border cursor-pointer mb-2 ${selectedProductId === product.id ? 'bg-primary/10 border-primary/30' : 'hover:bg-gray-50 dark:hover:bg-white/5 border-transparent'}`}
                    onClick={() => setSelectedProductId(product.id)}
                  >
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} className="w-8 h-8 rounded-lg object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-zinc-800 flex items-center justify-center">
                        <Package size={16} className="text-gray-400" />
                      </div>
                    )}
                    <p className="font-bold text-sm text-gray-900 dark:text-white truncate flex-1">{product.name}</p>
                    <p className="text-xs text-text-muted">{product.currentStock?.quantity ?? 0} {product.stockUnit.abbreviation}</p>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3 mb-3">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap">Categoria:</label>
                <select
                  className="flex-1 h-10 px-3 rounded-xl bg-white dark:bg-zinc-800 border border-gray-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                >
                  <option value="">Seleziona categoria...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3 mb-3">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap">Priorità:</label>
                <div className="flex items-center bg-gray-100 dark:bg-zinc-700 rounded-lg px-1 flex-1">
                  <button onClick={() => setNewPriority(Math.max(0, newPriority - 1))} className="h-8 w-8 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-600">-</button>
                  <span className="w-8 text-center font-bold text-sm">{newPriority}</span>
                  <button onClick={() => setNewPriority(newPriority + 1)} className="h-8 w-8 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-600">+</button>
                </div>
                <span className="text-xs text-text-muted">più basso = più preferito</span>
              </div>

              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => setShowAddForm(false)}>Annulla</Button>
                <Button className="flex-1" onClick={handleAssign} disabled={!selectedProductId || !selectedCategoryId || assignMutation.isPending} isLoading={assignMutation.isPending}>
                  Aggiungi Mapping
                </Button>
              </div>
            </div>
          )}

          {/* Add Button */}
          {!showAddForm && (
            <Button
              onClick={() => setShowAddForm(true)}
              className="w-full border-2 border-dashed border-primary/30 hover:border-primary hover:bg-primary/5"
            >
              <Plus size={18} className="mr-2" />
              Aggiungi nuovo mapping
            </Button>
          )}

          {/* Categories Accordion */}
          <div className="space-y-2">
            {categories.map((category) => (
              <div key={category.id} className="border-b border-gray-100 dark:border-white/5">
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                      {category.products.length}
                    </div>
                    <span className="font-bold text-gray-900 dark:text-white">{category.name}</span>
                    <span className="text-xs text-text-muted">({category.baseUnit.abbreviation})</span>
                  </div>
                  {expandedCategories.has(category.id) ? <ChevronDown size={20} className="text-gray-400" /> : <ChevronRight size={20} className="text-gray-400" />}
                </button>

                {expandedCategories.has(category.id) && (
                  <div className="px-4 pb-4 space-y-2">
                    {category.products.length === 0 ? (
                      <p className="text-sm text-text-muted py-4 text-center border-2 border-dashed border-gray-200 dark:border-white/5 rounded-xl">
                        Nessun prodotto mappato. Aggiungi un mapping +
                      </p>
                    ) : (
                      category.products.map((product) => {
                        const hasStock = product.currentStock > 0;
                        return (
                          <div
                            key={product.id}
                            className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${hasStock ? 'bg-white dark:bg-zinc-800/50 border-gray-100 dark:border-white/5' : 'bg-gray-50 dark:bg-zinc-800/20 border-gray-200 dark:border-white/10 opacity-60'}`}
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              {product.imageUrl ? (
                                <img src={product.imageUrl} alt={product.name} className="w-10 h-10 rounded-lg object-cover bg-gray-100" />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-zinc-800 flex items-center justify-center">
                                  <Package size={18} className="text-gray-400" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{product.name}</p>
                                <p className="text-xs text-text-muted">
                                  Stock: {product.currentStock} {product.stockUnitName}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="flex items-center bg-gray-100 dark:bg-zinc-700 rounded-lg px-1">
                                <button
                                  onClick={() => handleUpdatePriority(category.id, product.id, Math.max(0, product.priority - 1))}
                                  className="h-8 w-8 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-600 transition-colors"
                                >-</button>
                                <span className="w-8 text-center font-bold text-sm">{product.priority}</span>
                                <button
                                  onClick={() => handleUpdatePriority(category.id, product.id, product.priority + 1)}
                                  className="h-8 w-8 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-600 transition-colors"
                                >+</button>
                              </div>
                              <button
                                onClick={() => handleRemove(category.id, product.id)}
                                className="h-8 w-8 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-900/10 transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>

        <div className="p-4 border-t border-gray-100 dark:border-white/5 flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Chiudi
          </Button>
        </div>
      </Card>
    </div>
  );
}
