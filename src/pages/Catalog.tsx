import React, { useState, useMemo } from 'react';
import { Package, Plus, Search, Edit2, Trash2, TrendingUp, AlertCircle, Download, Filter, X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { Modal } from '../components/Modal';
import { Toast, ToastType } from '../components/Toast';

export const Catalog: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const { token, fetchWithAuth } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showFilterModal, setShowFilterModal] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    category: 'Produto',
    price: '',
    stock: '',
    description: ''
  });

  React.useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const res = await fetchWithAuth('/api/catalog');
        if (res.ok) {
          const data = await res.json();
          setItems(data);
        } else {
          throw new Error('API Error');
        }
      } catch (e) {
        if (import.meta.env.DEV) {
          setItems([
            { id: 1, name: 'Troca de Óleo', category: 'Serviço', price: 150.00, stock: 999, description: 'Serviço completo com filtro' },
            { id: 2, name: 'Pneu Aro 14', category: 'Produto', price: 350.00, stock: 4, description: 'Pneu Goodyear' },
            { id: 3, name: 'Alinhamento 3D', category: 'Serviço', price: 120.00, stock: 999, description: 'Alinhamento computadorizado' },
            { id: 4, name: 'Bateria 60Ah', category: 'Produto', price: 450.00, stock: 12, description: 'Bateria Moura' },
          ]);
        }
        console.error(e);
      }
    };
    fetchCatalog();
  }, [token]);

  // Filtragem em tempo real
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [items, searchTerm, filterCategory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingItem) {
        // Atualizar item existente
        const res = await fetchWithAuth(`/api/catalog/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            price: Number(formData.price),
            stock: Number(formData.stock)
          })
        });
        
        if (res.ok) {
          setItems(items.map(i => i.id === editingItem.id ? { ...formData, id: editingItem.id, price: Number(formData.price), stock: Number(formData.stock) } : i));
          setToast({ message: 'Item atualizado com sucesso!', type: 'success' });
        } else {
          // Fallback local
          setItems(items.map(i => i.id === editingItem.id ? { ...formData, id: editingItem.id, price: Number(formData.price), stock: Number(formData.stock) } : i));
          setToast({ message: 'Item atualizado (local)!', type: 'success' });
        }
      } else {
        // Criar novo item
        const res = await fetchWithAuth('/api/catalog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            price: Number(formData.price),
            stock: Number(formData.stock)
          })
        });
        
        if (res.ok) {
          const newItem = await res.json();
          setItems([...items, newItem]);
          setToast({ message: 'Item criado com sucesso!', type: 'success' });
        } else {
          // Fallback local
          setItems([...items, { ...formData, id: Date.now(), price: Number(formData.price), stock: Number(formData.stock) }]);
          setToast({ message: 'Item criado (local)!', type: 'success' });
        }
      }
    } catch (e) {
      // Fallback local em caso de erro
      if (editingItem) {
        setItems(items.map(i => i.id === editingItem.id ? { ...formData, id: editingItem.id, price: Number(formData.price), stock: Number(formData.stock) } : i));
      } else {
        setItems([...items, { ...formData, id: Date.now(), price: Number(formData.price), stock: Number(formData.stock) }]);
      }
      setToast({ message: 'Operação realizada localmente!', type: 'info' });
    }
    
    setIsModalOpen(false);
    setEditingItem(null);
    setFormData({ name: '', category: 'Produto', price: '', stock: '', description: '' });
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      price: item.price.toString(),
      stock: item.stock.toString(),
      description: item.description || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Tem certeza que deseja excluir este item?')) {
      try {
        const res = await fetchWithAuth(`/api/catalog/${id}`, { method: 'DELETE' });
        if (res.ok) {
          setItems(items.filter(i => i.id !== id));
          setToast({ message: 'Item excluído.', type: 'info' });
        } else {
          throw new Error('API Error');
        }
      } catch (e) {
        // Fallback local
        setItems(items.filter(i => i.id !== id));
        setToast({ message: 'Item excluído (local).', type: 'info' });
      }
    }
  };

  // Função de Exportar para CSV
  const handleExport = () => {
    const headers = ['Nome', 'Categoria', 'Preço', 'Estoque', 'Descrição'];
    const csvContent = [
      headers.join(';'),
      ...filteredItems.map(item => [
        item.name,
        item.category,
        `R$ ${Number(item.price).toFixed(2)}`,
        item.stock,
        item.description || ''
      ].join(';'))
    ].join('\n');
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `catalogo_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    setToast({ message: 'Catálogo exportado com sucesso!', type: 'success' });
  };

  // Aplicar filtros
  const handleApplyFilters = () => {
    setShowFilterModal(false);
    setToast({ message: 'Filtros aplicados!', type: 'info' });
  };

  // Limpar filtros
  const handleClearFilters = () => {
    setSearchTerm('');
    setFilterCategory('all');
    setToast({ message: 'Filtros limpos!', type: 'info' });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">Catálogo de Produtos e Serviços</h2>
          <p className="text-muted-foreground">Estes são os itens que sua IA irá oferecer aos clientes.</p>
        </div>
        <button 
          onClick={() => {
            setEditingItem(null);
            setFormData({ name: '', category: 'Produto', price: '', stock: '', description: '' });
            setIsModalOpen(true);
          }}
          className="bg-primary text-primary-foreground px-6 py-3 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-transform flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Novo Item
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-bold uppercase">Total de Itens</p>
            <p className="text-xl font-bold">{items.length}</p>
          </div>
        </div>
        <div className="glass-card p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-bold uppercase">Estoque Baixo</p>
            <p className="text-xl font-bold">{items.filter(i => i.category === 'Produto' && i.stock < 5).length}</p>
          </div>
        </div>
        <div className="glass-card p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-bold uppercase">Categorias</p>
            <p className="text-xl font-bold">{new Set(items.map(i => i.category)).size}</p>
          </div>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="p-6 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Buscar no catálogo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:border-primary/50 transition-colors"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowFilterModal(true)}
              className={`px-4 py-2 rounded-xl border text-xs font-bold hover:bg-muted transition-colors flex items-center gap-2 ${filterCategory !== 'all' ? 'border-primary text-primary bg-primary/5' : 'border-border'}`}
            >
              <Filter className="w-4 h-4" />
              Filtrar
              {filterCategory !== 'all' && (
                <span className="bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full text-[10px]">1</span>
              )}
            </button>
            <button 
              onClick={handleExport}
              className="px-4 py-2 rounded-xl border border-border text-xs font-bold hover:bg-muted transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Exportar
            </button>
          </div>
        </div>

        {/* Mostrando filtros ativos */}
        {(searchTerm || filterCategory !== 'all') && (
          <div className="px-6 py-3 bg-muted/10 border-b border-border flex items-center gap-4 text-sm">
            <span className="text-muted-foreground">Filtros ativos:</span>
            {searchTerm && (
              <span className="bg-muted px-2 py-1 rounded-lg flex items-center gap-1">
                Busca: "{searchTerm}"
                <button onClick={() => setSearchTerm('')} className="hover:text-destructive"><X className="w-3 h-3" /></button>
              </span>
            )}
            {filterCategory !== 'all' && (
              <span className="bg-muted px-2 py-1 rounded-lg flex items-center gap-1">
                Categoria: {filterCategory}
                <button onClick={() => setFilterCategory('all')} className="hover:text-destructive"><X className="w-3 h-3" /></button>
              </span>
            )}
            <button onClick={handleClearFilters} className="ml-auto text-primary hover:underline text-xs">
              Limpar todos
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-muted/30">
                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Nome</th>
                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Categoria</th>
                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Preço</th>
                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Estoque</th>
                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    {items.length === 0 ? 'Nenhum item cadastrado. Clique em "Novo Item" para começar.' : 'Nenhum item encontrado com os filtros atuais.'}
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/20 transition-colors group">
                    <td className="px-6 py-4">
                      <p className="font-bold">{item.name}</p>
                      <p className="text-[10px] text-muted-foreground line-clamp-1">{item.description}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-1 rounded-lg text-[10px] font-bold uppercase",
                        item.category === 'Serviço' ? "bg-blue-500/10 text-blue-500" : "bg-purple-500/10 text-purple-500"
                      )}>
                        {item.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold">
                      R$ {Number(item.price).toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          item.stock > 10 ? "bg-emerald-500" : item.stock > 0 ? "bg-amber-500" : "bg-red-500"
                        )} />
                        <span className="text-sm font-medium">{item.stock}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(item)} className="p-2 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(item.id)} className="p-2 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Paginação info */}
        <div className="px-6 py-3 bg-muted/10 border-t border-border text-sm text-muted-foreground">
          Mostrando {filteredItems.length} de {items.length} itens
        </div>
      </div>

      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}

      {/* Modal de Filtros */}
      <Modal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        title="Filtrar Catálogo"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Categoria</label>
            <select 
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full p-2 rounded-lg border border-border bg-background"
            >
              <option value="all">Todas</option>
              <option value="Produto">Produtos</option>
              <option value="Serviço">Serviços</option>
            </select>
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <button 
              type="button" 
              onClick={handleClearFilters}
              className="px-4 py-2 rounded-lg hover:bg-muted transition-colors"
            >
              Limpar
            </button>
            <button 
              type="button" 
              onClick={handleApplyFilters}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity"
            >
              Aplicar Filtros
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal de Criar/Editar */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? "Editar Item" : "Novo Item"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nome do Item</label>
            <input 
              type="text" 
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full p-2 rounded-lg border border-border bg-background" 
              required 
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Categoria</label>
              <select 
                value={formData.category}
                onChange={e => setFormData({...formData, category: e.target.value})}
                className="w-full p-2 rounded-lg border border-border bg-background"
              >
                <option value="Produto">Produto</option>
                <option value="Serviço">Serviço</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Preço (R$)</label>
              <input 
                type="number" 
                step="0.01"
                value={formData.price}
                onChange={e => setFormData({...formData, price: e.target.value})}
                className="w-full p-2 rounded-lg border border-border bg-background" 
                required 
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Estoque / Disponibilidade</label>
            <input 
              type="number" 
              value={formData.stock}
              onChange={e => setFormData({...formData, stock: e.target.value})}
              className="w-full p-2 rounded-lg border border-border bg-background" 
              required 
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Descrição</label>
            <textarea 
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              className="w-full p-2 rounded-lg border border-border bg-background h-24 resize-none" 
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg hover:bg-muted transition-colors">Cancelar</button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity">
              {editingItem ? 'Salvar Alterações' : 'Criar Item'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
