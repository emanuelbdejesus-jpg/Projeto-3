
import React, { useState, useEffect, useMemo } from 'react';
import { INITIAL_INVENTORY } from './constants';
import { Tool, Withdrawal, ToolModel } from './types';
import Dashboard from './components/Dashboard';
import InventoryList from './components/InventoryList';
import WithdrawalForm from './components/WithdrawalForm';
import HistoryList from './components/HistoryList';
import { supabase } from './services/supabase';
import { LayoutDashboard, ClipboardList, Package, History, AlertTriangle, X, Bell, Loader2 } from 'lucide-react';

interface Toast {
  id: string;
  message: string;
  type: 'warning' | 'info' | 'success';
}

const App: React.FC = () => {
  const [inventory, setInventory] = useState<Tool[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'withdraw' | 'history'>('dashboard');
  const [inventoryFilter, setInventoryFilter] = useState<string>('');
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Carregamento inicial de dados do Supabase
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // 1. Fetch Inventory
        const { data: invData, error: invError } = await supabase
          .from('inventory')
          .select('*')
          .order('model', { ascending: false });

        if (invError) throw invError;

        if (!invData || invData.length === 0) {
          // Se banco vazio, povoar com INITIAL_INVENTORY
          const { error: seedError } = await supabase
            .from('inventory')
            .insert(INITIAL_INVENTORY);
          if (seedError) throw seedError;
          setInventory(INITIAL_INVENTORY);
        } else {
          setInventory(invData);
        }

        // 2. Fetch Withdrawals
        const { data: witData, error: witError } = await supabase
          .from('withdrawals')
          .select('*')
          .order('date', { ascending: false });

        if (witError) throw witError;
        setWithdrawals(witData || []);

      } catch (err: any) {
        console.error("Erro ao sincronizar com Supabase:", err);
        addToast("Erro de conexão com o banco de dados.", 'warning');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const addToast = (message: string, type: 'warning' | 'info' | 'success' = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  const handleWithdrawal = async (data: Omit<Withdrawal, 'id' | 'toolName'>) => {
    const tool = inventory.find(t => t.id === data.toolId);
    if (!tool) return;

    if (tool.quantity < data.quantity) {
      addToast(`Quantidade insuficiente de ${tool.type} ${tool.model}!`, 'warning');
      return;
    }

    const newQuantity = tool.quantity - data.quantity;
    const toolName = `${tool.type} ${tool.model}`;

    try {
      // 1. Inserir Retirada
      const { data: insertedWit, error: witErr } = await supabase
        .from('withdrawals')
        .insert([{ ...data, toolName }])
        .select()
        .single();

      if (witErr) throw witErr;

      // 2. Atualizar Estoque
      const { error: invErr } = await supabase
        .from('inventory')
        .update({ quantity: newQuantity })
        .eq('id', tool.id);

      if (invErr) throw invErr;

      // 3. Atualizar Estado Local
      setInventory(prev => prev.map(t => t.id === tool.id ? { ...t, quantity: newQuantity } : t));
      setWithdrawals(prev => [insertedWit, ...prev]);

      if (newQuantity <= tool.minThreshold) {
        addToast(`ALERTA: ${toolName} atingiu nível crítico (${newQuantity} un.)`, 'warning');
      }

      addToast("Retirada registrada com sucesso!", 'success');
      setActiveTab('dashboard');
    } catch (err) {
      addToast("Erro ao processar retirada no banco.", 'warning');
    }
  };

  const handleDeleteWithdrawal = async (id: string) => {
    const withdrawal = withdrawals.find(w => w.id === id);
    if (!withdrawal) return;

    const tool = inventory.find(t => t.id === withdrawal.toolId);
    if (!tool) return;

    try {
      // 1. Devolver ao estoque no banco
      const { error: invErr } = await supabase
        .from('inventory')
        .update({ quantity: tool.quantity + withdrawal.quantity })
        .eq('id', tool.id);

      if (invErr) throw invErr;

      // 2. Remover do histórico no banco
      const { error: witErr } = await supabase
        .from('withdrawals')
        .delete()
        .eq('id', id);

      if (witErr) throw witErr;

      // 3. Atualizar Estado Local
      setInventory(prev => prev.map(t => t.id === tool.id ? { ...t, quantity: t.quantity + withdrawal.quantity } : t));
      setWithdrawals(prev => prev.filter(w => w.id !== id));

      addToast(`${withdrawal.toolName}: Registro excluído e estoque estornado.`, 'info');
    } catch (err) {
      addToast("Erro ao estornar registro.", 'warning');
    }
  };

  const handleUpdateStock = async (toolId: string, newQuantity: number) => {
    try {
      const { error } = await supabase
        .from('inventory')
        .update({ quantity: Math.max(0, newQuantity) })
        .eq('id', toolId);

      if (error) throw error;

      setInventory(prev => prev.map(t => t.id === toolId ? { ...t, quantity: Math.max(0, newQuantity) } : t));
      
      const tool = inventory.find(t => t.id === toolId);
      if (tool && newQuantity <= tool.minThreshold) {
        addToast(`Estoque de ${tool.type} ${tool.model} está baixo!`, 'warning');
      }
    } catch (err) {
      addToast("Erro ao atualizar estoque.", 'warning');
    }
  };

  const handleUpdateThreshold = async (toolId: string, newThreshold: number) => {
    try {
      const { error } = await supabase
        .from('inventory')
        .update({ minThreshold: Math.max(0, newThreshold) })
        .eq('id', toolId);

      if (error) throw error;

      setInventory(prev => prev.map(t => t.id === toolId ? { ...t, minThreshold: Math.max(0, newThreshold) } : t));
    } catch (err) {
      addToast("Erro ao atualizar limite.", 'warning');
    }
  };

  const handleNavigateToInventory = (filter: string) => {
    setInventoryFilter(filter);
    setActiveTab('inventory');
  };

  const lowStockTools = useMemo(() => inventory.filter(t => t.quantity <= t.minThreshold), [inventory]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-6">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
        <h2 className="text-xl font-bold">STOPER Cloud</h2>
        <p className="text-slate-400 text-sm mt-2">Sincronizando com o banco de dados...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
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
            </div>
          </div>
        )}
      </aside>

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
            onDeleteWithdrawal={handleDeleteWithdrawal}
          />
        )}
      </main>

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
