
import React, { useState, useEffect, useMemo } from 'react';
import { INITIAL_INVENTORY } from './constants';
import { Tool, Withdrawal, ToolModel } from './types';
import Dashboard from './components/Dashboard';
import InventoryList from './components/InventoryList';
import WithdrawalForm from './components/WithdrawalForm';
import HistoryList from './components/HistoryList';
import { LayoutDashboard, ClipboardList, Package, History, Info, AlertTriangle, X, Bell } from 'lucide-react';
import { getInventoryInsights } from './services/geminiService';

interface Toast {
  id: string;
  message: string;
  type: 'warning' | 'info' | 'success';
}

const App: React.FC = () => {
  const [inventory, setInventory] = useState<Tool[]>(() => {
    const saved = localStorage.getItem('stoper_inventory');
    return saved ? JSON.parse(saved) : INITIAL_INVENTORY;
  });

  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>(() => {
    const saved = localStorage.getItem('stoper_withdrawals');
    return saved ? JSON.parse(saved) : [];
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'withdraw' | 'history'>('dashboard');
  const [inventoryFilter, setInventoryFilter] = useState<string>('');
  const [aiInsights, setAiInsights] = useState<string>('Carregando insights da IA...');
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    localStorage.setItem('stoper_inventory', JSON.stringify(inventory));
    localStorage.setItem('stoper_withdrawals', JSON.stringify(withdrawals));
  }, [inventory, withdrawals]);

  useEffect(() => {
    const fetchInsights = async () => {
      const insights = await getInventoryInsights(inventory, withdrawals);
      setAiInsights(insights || "Nenhum insight disponível.");
    };
    if (activeTab === 'dashboard') {
      fetchInsights();
    }
  }, [activeTab, inventory, withdrawals]);

  const addToast = (message: string, type: 'warning' | 'info' | 'success' = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  const handleWithdrawal = (data: Omit<Withdrawal, 'id' | 'toolName'>) => {
    const tool = inventory.find(t => t.id === data.toolId);
    if (!tool) return;

    if (tool.quantity < data.quantity) {
      addToast(`Quantidade insuficiente de ${tool.type} ${tool.model}!`, 'warning');
      return;
    }

    const newQuantity = tool.quantity - data.quantity;

    // Check if hitting or falling below threshold
    if (newQuantity <= tool.minThreshold) {
      addToast(`ALERTA: ${tool.type} ${tool.model} atingiu nível crítico (${newQuantity} un.)`, 'warning');
    }

    // Update Inventory
    setInventory(prev => prev.map(t => 
      t.id === data.toolId ? { ...t, quantity: newQuantity } : t
    ));

    // Log Withdrawal
    const newWithdrawal: Withdrawal = {
      ...data,
      id: Math.random().toString(36).substr(2, 9),
      toolName: `${tool.type} ${tool.model}`
    };
    setWithdrawals(prev => [newWithdrawal, ...prev]);
    addToast("Retirada registrada com sucesso!", 'success');
    setActiveTab('dashboard');
  };

  const handleUpdateStock = (toolId: string, newQuantity: number) => {
    const tool = inventory.find(t => t.id === toolId);
    if (tool && newQuantity <= tool.minThreshold && newQuantity < tool.quantity) {
       addToast(`Estoque de ${tool.type} ${tool.model} está baixo!`, 'warning');
    }
    setInventory(prev => prev.map(t => 
      t.id === toolId ? { ...t, quantity: Math.max(0, newQuantity) } : t
    ));
  };

  const handleUpdateThreshold = (toolId: string, newThreshold: number) => {
    setInventory(prev => prev.map(t => 
      t.id === toolId ? { ...t, minThreshold: Math.max(0, newThreshold) } : t
    ));
  };

  const handleNavigateToInventory = (filter: string) => {
    setInventoryFilter(filter);
    setActiveTab('inventory');
  };

  const lowStockTools = useMemo(() => inventory.filter(t => t.quantity <= t.minThreshold), [inventory]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar - Desktop */}
      <aside className="w-full md:w-64 bg-slate-900 text-white flex-shrink-0">
        <div className="p-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="text-blue-400" />
            <span>STOPER</span>
          </h1>
          <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-bold leading-tight">CONTROLE DE FERRAMENTAL DE PERFURAÇÃO</p>
        </div>
        
        <nav className="mt-4 px-3 space-y-1">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'dashboard' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </button>
          <button 
            onClick={() => {
              setActiveTab('inventory');
              setInventoryFilter('');
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'inventory' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <Package size={20} />
            <span>Estoque Atual</span>
          </button>
          <button 
            onClick={() => setActiveTab('withdraw')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'withdraw' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <ClipboardList size={20} />
            <span>Registrar Saída</span>
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'history' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <History size={20} />
            <span>Histórico</span>
          </button>
        </nav>

        {lowStockTools.length > 0 && (
          <div className="mt-8 px-6">
            <div className="bg-red-900/40 border border-red-500/50 p-4 rounded-xl">
              <div className="flex items-center gap-2 text-red-400 mb-2">
                <AlertTriangle size={16} />
                <span className="text-xs font-bold uppercase">Estoque Crítico</span>
              </div>
              <p className="text-xs text-slate-300">
                Existem {lowStockTools.length} itens abaixo do limite mínimo.
              </p>
              <button 
                onClick={() => handleNavigateToInventory('')}
                className="mt-2 text-[10px] font-bold text-red-300 hover:text-white flex items-center gap-1 transition-colors"
              >
                Ver no Estoque <X size={10} className="rotate-45" />
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto pb-24 md:pb-8">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 capitalize">
              {activeTab === 'dashboard' && 'Visão Geral'}
              {activeTab === 'inventory' && 'Controle de Inventário'}
              {activeTab === 'withdraw' && 'Nova Retirada de Ferramenta'}
              {activeTab === 'history' && 'Logs de Movimentação'}
            </h2>
            <p className="text-slate-500">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <Dashboard 
            inventory={inventory} 
            withdrawals={withdrawals} 
            aiInsights={aiInsights}
            onNavigateToInventory={handleNavigateToInventory}
          />
        )}
        
        {activeTab === 'inventory' && (
          <InventoryList 
            inventory={inventory} 
            onUpdateStock={handleUpdateStock}
            onUpdateThreshold={handleUpdateThreshold}
            initialFilter={inventoryFilter}
            onFilterChange={setInventoryFilter}
          />
        )}

        {activeTab === 'withdraw' && (
          <WithdrawalForm 
            inventory={inventory} 
            onSubmit={handleWithdrawal} 
          />
        )}

        {activeTab === 'history' && (
          <HistoryList 
            withdrawals={withdrawals} 
          />
        )}
      </main>

      {/* Toasts Container */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
        {toasts.map(toast => (
          <div 
            key={toast.id} 
            className={`pointer-events-auto flex items-center justify-between gap-3 p-4 rounded-xl shadow-2xl border transition-all animate-in slide-in-from-right duration-300 ${
              toast.type === 'warning' ? 'bg-red-50 border-red-200 text-red-800' :
              toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
              'bg-blue-50 border-blue-200 text-blue-800'
            }`}
          >
            <div className="flex items-center gap-3">
              {toast.type === 'warning' ? <AlertTriangle size={20} /> : <Bell size={20} />}
              <span className="text-sm font-medium">{toast.message}</span>
            </div>
            <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} className="text-slate-400 hover:text-slate-600 transition-colors">
              <X size={16} />
            </button>
          </div>
        ))}
      </div>

      {/* Mobile Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 text-white flex justify-around p-3 z-50 border-t border-slate-800">
        <button onClick={() => setActiveTab('dashboard')} className={activeTab === 'dashboard' ? 'text-blue-400' : 'text-slate-400'}><LayoutDashboard /></button>
        <button onClick={() => {setActiveTab('inventory'); setInventoryFilter('');}} className={activeTab === 'inventory' ? 'text-blue-400' : 'text-slate-400'}><Package /></button>
        <button onClick={() => setActiveTab('withdraw')} className={activeTab === 'withdraw' ? 'text-blue-400' : 'text-slate-400'}><ClipboardList /></button>
        <button onClick={() => setActiveTab('history')} className={activeTab === 'history' ? 'text-blue-400' : 'text-slate-400'}><History /></button>
      </div>
    </div>
  );
};

export default App;