
import React, { useState, useEffect, useMemo } from 'react';
import { INITIAL_INVENTORY } from './constants';
import { Tool, Withdrawal, ToolModel } from './types';
import Dashboard from './components/Dashboard';
import InventoryList from './components/InventoryList';
import WithdrawalForm from './components/WithdrawalForm';
import HistoryList from './components/HistoryList';
import { supabase } from './services/supabase';
import { LayoutDashboard, ClipboardList, Package, History, AlertTriangle, X, Bell, Loader2, Database, Copy, Check, RefreshCw, ServerCrash } from 'lucide-react';

interface Toast {
  id: string;
  message: string;
  type: 'warning' | 'info' | 'success';
  technicalDetails?: string;
}

const App: React.FC = () => {
  const [inventory, setInventory] = useState<Tool[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'withdraw' | 'history'>('dashboard');
  const [inventoryFilter, setInventoryFilter] = useState<string>('');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showSqlHelp, setShowSqlHelp] = useState(false);

  /**
   * Enhanced error message extraction to prevent [object Object]
   * Handles Supabase errors, standard JS errors, and nested objects.
   */
  const extractErrorMessage = (error: any): string => {
    if (!error) return "Nenhum detalhe técnico disponível.";
    if (typeof error === 'string') return error;
    
    // Supabase PostgrestError properties
    if (error.message && typeof error.message === 'string') return error.message;
    if (error.details && typeof error.details === 'string') return error.details;
    if (error.hint && typeof error.hint === 'string') return error.hint;
    if (error.code && typeof error.code === 'string') return `Erro Supabase (Código ${error.code})`;

    // Standard Error object (non-enumerable properties)
    if (error instanceof Error) {
      return error.message || error.toString();
    }

    // Check for nested error objects
    if (error.error && typeof error.error === 'object') return extractErrorMessage(error.error);
    if (error.error_description && typeof error.error_description === 'string') return error.error_description;

    // Last resort: Stringify or iterate properties
    try {
      const json = JSON.stringify(error);
      if (json && json !== "{}" && json !== "null") return json;
    } catch (e) {
      // Ignore stringify errors
    }

    // If it's still an object that stringifies to {}, try to get any internal data
    const entries = Object.entries(error);
    if (entries.length > 0) {
      return entries.map(([k, v]) => `${k}: ${typeof v === 'object' ? '[Object]' : v}`).join(' | ');
    }

    // Absolute fallback
    return String(error) === "[object Object]" ? "Erro de objeto indefinido no banco de dados" : String(error);
  };

  const addToast = (message: string, type: 'warning' | 'info' | 'success' = 'info', tech?: any) => {
    const id = Math.random().toString(36).substr(2, 9);
    const techString = extractErrorMessage(tech);

    setToasts(prev => [...prev, { id, message, type, technicalDetails: techString }]);
    
    // Auto-trigger setup modal for schema/table/relation errors
    const lowTech = techString.toLowerCase();
    const isSchemaError = 
      lowTech.includes('not found') || 
      lowTech.includes('does not exist') || 
      lowTech.includes('schema cache') || 
      lowTech.includes('42p01') ||
      lowTech.includes('column') ||
      lowTech.includes('relation') ||
      lowTech.includes('unexpected response') ||
      lowTech.includes('invalid input syntax');

    if (isSchemaError) {
      setShowSqlHelp(true);
      setDbError("A estrutura do banco de dados precisa ser configurada.");
    }

    // Automatically remove toasts
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, type === 'warning' ? 20000 : 10000);
  };

  const mapInventoryFromDB = (data: any): Tool => ({
    id: data.id,
    model: data.model,
    type: data.type,
    quantity: data.quantity,
    minThreshold: data.min_threshold ?? data.minThreshold ?? 0
  });

  const mapWithdrawalFromDB = (data: any): Withdrawal => ({
    id: data.id,
    date: data.date,
    toolId: data.tool_id ?? data.toolId,
    toolName: data.tool_name ?? data.toolName,
    quantity: data.quantity,
    reason: data.reason,
    supervisor: data.supervisor,
    operator: data.operator,
    rigTag: data.rig_tag ?? data.rigTag,
    team: data.team
  });

  const fetchData = async () => {
    setIsLoading(true);
    setDbError(null);
    try {
      // 1. Fetch Inventory
      const { data: invData, error: invError } = await supabase
        .from('inventory')
        .select('*')
        .order('model', { ascending: false });

      if (invError) throw invError;

      if (!invData || invData.length === 0) {
        // Table exists but is empty, try seeding with initial data
        const seedData = INITIAL_INVENTORY.map(item => ({
          id: item.id,
          model: item.model,
          type: item.type,
          quantity: item.quantity,
          min_threshold: item.minThreshold
        }));
        const { error: seedError } = await supabase.from('inventory').insert(seedData);
        if (seedError) console.warn("Seed attempt failed:", seedError);
        setInventory(INITIAL_INVENTORY);
      } else {
        setInventory(invData.map(mapInventoryFromDB));
      }

      // 2. Fetch Withdrawals
      const { data: witData, error: witError } = await supabase
        .from('withdrawals')
        .select('*')
        .order('date', { ascending: false });

      if (witError) throw witError;
      setWithdrawals((witData || []).map(mapWithdrawalFromDB));

    } catch (err: any) {
      console.error("Erro na sincronização Supabase:", err);
      addToast("Erro na sincronização de dados", 'warning', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleWithdrawal = async (data: Omit<Withdrawal, 'id' | 'toolName'>) => {
    const tool = inventory.find(t => t.id === data.toolId);
    if (!tool) return addToast("Ferramenta não encontrada", 'warning');
    if (tool.quantity < data.quantity) return addToast("Estoque insuficiente no momento", 'warning');

    const newQuantity = tool.quantity - data.quantity;
    const toolName = `${tool.type} ${tool.model}`;

    try {
      const { data: insertedRows, error: witErr } = await supabase
        .from('withdrawals')
        .insert([{ 
          date: data.date,
          tool_id: data.toolId,
          tool_name: toolName,
          quantity: data.quantity,
          reason: data.reason,
          supervisor: data.supervisor,
          operator: data.operator,
          rig_tag: data.rigTag,
          team: data.team
        }])
        .select();

      if (witErr) throw witErr;

      const { error: invErr } = await supabase
        .from('inventory')
        .update({ quantity: newQuantity })
        .eq('id', tool.id);

      if (invErr) throw invErr;

      if (insertedRows && insertedRows.length > 0) {
        const newWit = mapWithdrawalFromDB(insertedRows[0]);
        setInventory(prev => prev.map(t => t.id === tool.id ? { ...t, quantity: newQuantity } : t));
        setWithdrawals(prev => [newWit, ...prev]);
        addToast("Saída registrada com sucesso!", 'success');
        setActiveTab('dashboard');
      }
    } catch (err: any) {
      addToast("Falha ao registrar saída", 'warning', err);
    }
  };

  const handleDeleteWithdrawal = async (id: string) => {
    const withdrawal = withdrawals.find(w => w.id === id);
    if (!withdrawal) return;
    const tool = inventory.find(t => t.id === withdrawal.toolId);
    
    try {
      if (tool) {
        await supabase.from('inventory').update({ quantity: tool.quantity + withdrawal.quantity }).eq('id', tool.id);
      }
      const { error } = await supabase.from('withdrawals').delete().eq('id', id);
      if (error) throw error;
      
      if (tool) setInventory(prev => prev.map(t => t.id === tool.id ? { ...t, quantity: t.quantity + withdrawal.quantity } : t));
      setWithdrawals(prev => prev.filter(w => w.id !== id));
      addToast("Registro estornado com sucesso!", 'info');
    } catch (err: any) {
      addToast("Erro ao processar estorno", 'warning', err);
    }
  };

  const handleUpdateStock = async (toolId: string, newQuantity: number) => {
    try {
      const { error } = await supabase.from('inventory').update({ quantity: Math.max(0, newQuantity) }).eq('id', toolId);
      if (error) throw error;
      setInventory(prev => prev.map(t => t.id === toolId ? { ...t, quantity: Math.max(0, newQuantity) } : t));
    } catch (err: any) {
      addToast("Erro ao atualizar estoque", 'warning', err);
    }
  };

  const handleUpdateThreshold = async (toolId: string, newThreshold: number) => {
    try {
      const { error } = await supabase.from('inventory').update({ min_threshold: Math.max(0, newThreshold) }).eq('id', toolId);
      if (error) throw error;
      setInventory(prev => prev.map(t => t.id === toolId ? { ...t, minThreshold: Math.max(0, newThreshold) } : t));
    } catch (err: any) {
      addToast("Erro ao atualizar limite mínimo", 'warning', err);
    }
  };

  const SqlSetupModal = () => (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-xl">
      <div className="bg-white w-full max-w-3xl rounded-[40px] shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-300">
        <div className="bg-blue-600 p-8 flex items-center gap-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10"><Database size={120} /></div>
          <div className="p-4 bg-white/20 rounded-3xl ring-8 ring-white/5"><Database size={48} /></div>
          <div className="relative z-10">
            <h3 className="text-3xl font-black tracking-tight">Configuração de Banco de Dados</h3>
            <p className="text-blue-100 font-medium mt-1">O esquema do Supabase não foi detectado ou está incompleto.</p>
          </div>
        </div>
        <div className="p-10">
          <div className="flex items-start gap-4 mb-8 bg-amber-50 p-6 rounded-3xl border border-amber-100">
             <AlertTriangle className="text-amber-500 shrink-0" size={24} />
             <p className="text-amber-900 text-sm font-medium leading-relaxed">
               As tabelas <strong>inventory</strong> e <strong>withdrawals</strong> ainda não existem no seu banco de dados. 
               Siga as etapas abaixo para criá-las e ativar o sistema.
             </p>
          </div>

          <p className="text-slate-800 font-bold mb-4 flex items-center gap-2 text-sm">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">1</span>
            Copie o script SQL abaixo:
          </p>

          <div className="bg-slate-900 p-6 rounded-3xl relative group mb-8 shadow-2xl">
            <code className="text-blue-300 text-[11px] md:text-sm block leading-relaxed whitespace-pre font-mono overflow-x-auto max-h-60 scrollbar-thin scrollbar-thumb-slate-700">
{`-- 1. CRIAR TABELA DE INVENTÁRIO
CREATE TABLE IF NOT EXISTS public.inventory (
    id TEXT PRIMARY KEY,
    model TEXT NOT NULL,
    type TEXT NOT NULL,
    quantity INTEGER DEFAULT 0,
    min_threshold INTEGER DEFAULT 0
);

-- 2. CRIAR TABELA DE HISTÓRICO DE RETIRADAS
CREATE TABLE IF NOT EXISTS public.withdrawals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date TIMESTAMPTZ DEFAULT now(),
    tool_id TEXT,
    tool_name TEXT,
    quantity INTEGER,
    reason TEXT,
    supervisor TEXT,
    operator TEXT,
    rig_tag TEXT,
    team TEXT
);

-- 3. CONFIGURAR SEGURANÇA (RLS) E ACESSO PÚBLICO
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Full Access" ON public.inventory;
CREATE POLICY "Public Full Access" ON public.inventory FOR ALL USING (true);

DROP POLICY IF EXISTS "Public Full Access" ON public.withdrawals;
CREATE POLICY "Public Full Access" ON public.withdrawals FOR ALL USING (true);`}
            </code>
            <button 
              onClick={() => {
                const sqlText = `CREATE TABLE IF NOT EXISTS public.inventory (id TEXT PRIMARY KEY, model TEXT NOT NULL, type TEXT NOT NULL, quantity INTEGER DEFAULT 0, min_threshold INTEGER DEFAULT 0); CREATE TABLE IF NOT EXISTS public.withdrawals (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), date TIMESTAMPTZ DEFAULT now(), tool_id TEXT, tool_name TEXT, quantity INTEGER, reason TEXT, supervisor TEXT, operator TEXT, rig_tag TEXT, team TEXT); ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY; ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY; DROP POLICY IF EXISTS "Public Full Access" ON public.inventory; CREATE POLICY "Public Full Access" ON public.inventory FOR ALL USING (true); DROP POLICY IF EXISTS "Public Full Access" ON public.withdrawals; CREATE POLICY "Public Full Access" ON public.withdrawals FOR ALL USING (true);`;
                navigator.clipboard.writeText(sqlText);
                addToast("Script SQL copiado!", 'success');
              }}
              className="absolute top-4 right-4 p-4 bg-slate-800 text-blue-400 hover:text-white hover:bg-blue-600 rounded-2xl transition-all shadow-2xl"
              title="Copiar SQL"
            >
              <Copy size={24} />
            </button>
          </div>

          <div className="space-y-4">
            <p className="text-slate-800 font-bold flex items-center gap-2 text-sm">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">2</span>
              Cole e execute (Run) no SQL Editor do seu projeto Supabase.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button 
                onClick={() => window.location.reload()}
                className="flex-1 py-5 bg-blue-600 text-white font-black rounded-3xl hover:bg-blue-700 transition-all flex items-center justify-center gap-3 shadow-xl shadow-blue-200"
              >
                <RefreshCw size={20} />
                RECARREGAR SISTEMA
              </button>
              <button 
                onClick={() => setShowSqlHelp(false)}
                className="px-10 py-5 bg-slate-100 text-slate-500 font-bold rounded-3xl hover:bg-slate-200 transition-all"
              >
                FECHAR
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <div className="relative mb-8">
           <Loader2 className="w-20 h-20 text-blue-500 animate-spin" />
           <Database className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-blue-300" />
        </div>
        <div className="text-center">
          <p className="text-white text-2xl font-black tracking-tight mb-2">STOPER CLOUD</p>
          <p className="text-slate-400 animate-pulse font-medium">Sincronizando com o banco de dados...</p>
        </div>
      </div>
    );
  }

  // Fallback UI when database structure is missing
  if (dbError && inventory.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        {showSqlHelp && <SqlSetupModal />}
        <div className="max-w-md w-full text-center bg-white p-12 rounded-[40px] shadow-2xl border border-slate-100">
          <div className="w-24 h-24 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-8">
            <ServerCrash size={48} />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-4">Conexão Pendente</h2>
          <p className="text-slate-500 mb-8 leading-relaxed font-medium">
            O banco de dados Supabase não possui as tabelas necessárias para o funcionamento do STOPER.
          </p>
          <div className="space-y-4">
            <button 
              onClick={() => setShowSqlHelp(true)}
              className="w-full py-5 bg-blue-600 text-white font-black rounded-3xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 flex items-center justify-center gap-3"
            >
              <Database size={20} />
              EXECUTAR SETUP SQL
            </button>
            <button 
              onClick={() => fetchData()}
              className="w-full py-4 bg-slate-50 text-slate-600 font-bold rounded-3xl hover:bg-slate-100 transition-all flex items-center justify-center gap-3"
            >
              <RefreshCw size={18} />
              Tentar Novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {showSqlHelp && <SqlSetupModal />}
      
      <aside className="w-full md:w-64 bg-slate-900 text-white flex-shrink-0 shadow-2xl relative z-40">
        <div className="p-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/30">
              <Package className="text-white" size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter leading-none">STOPER</h1>
              <p className="text-[9px] text-blue-400/80 mt-1 uppercase tracking-[0.3em] font-black">Mining Log</p>
            </div>
          </div>
        </div>
        
        <nav className="mt-4 px-4 space-y-2">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-4 px-5 py-4 rounded-3xl transition-all font-bold ${activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <LayoutDashboard size={20} /> Dashboard
          </button>
          <button onClick={() => {setActiveTab('inventory'); setInventoryFilter('');}} className={`w-full flex items-center gap-4 px-5 py-4 rounded-3xl transition-all font-bold ${activeTab === 'inventory' ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <Package size={20} /> Estoque
          </button>
          <button onClick={() => setActiveTab('withdraw')} className={`w-full flex items-center gap-4 px-5 py-4 rounded-3xl transition-all font-bold ${activeTab === 'withdraw' ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <ClipboardList size={20} /> Registrar Saída
          </button>
          <button onClick={() => setActiveTab('history')} className={`w-full flex items-center gap-4 px-5 py-4 rounded-3xl transition-all font-bold ${activeTab === 'history' ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <History size={20} /> Histórico
          </button>
        </nav>

        <div className="absolute bottom-8 left-0 w-full px-8">
           <button 
             onClick={() => setShowSqlHelp(true)}
             className="w-full p-4 bg-slate-800/50 rounded-3xl border border-slate-700/50 flex items-center gap-3 hover:bg-slate-800 transition-colors group"
           >
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-white transition-colors">Setup DB</span>
           </button>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-12 overflow-y-auto">
        <header className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="animate-in slide-in-from-left duration-500">
            <h2 className="text-4xl font-black text-slate-800 tracking-tight">
              {activeTab === 'dashboard' ? 'Overview' : activeTab === 'inventory' ? 'Controle de Inventário' : activeTab === 'withdraw' ? 'Nova Saída' : 'Histórico Completo'}
            </h2>
            <p className="text-slate-500 font-semibold mt-2 text-lg">
              {activeTab === 'dashboard' ? 'Análise em tempo real de consumo.' : 'Gestão profissional de ferramentas de perfuração.'}
            </p>
          </div>
          <button 
            onClick={() => fetchData()}
            className="flex items-center gap-3 px-6 py-3 bg-white border border-slate-200 rounded-2xl text-slate-600 font-bold hover:bg-slate-50 transition-all shadow-sm active:scale-95"
          >
            <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
            Sincronizar
          </button>
        </header>

        <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
          {activeTab === 'dashboard' && <Dashboard inventory={inventory} withdrawals={withdrawals} onNavigateToInventory={(f) => { setInventoryFilter(f); setActiveTab('inventory'); }} />}
          {activeTab === 'inventory' && <InventoryList inventory={inventory} onUpdateStock={handleUpdateStock} onUpdateThreshold={handleUpdateThreshold} initialFilter={inventoryFilter} onFilterChange={setInventoryFilter} />}
          {activeTab === 'withdraw' && <WithdrawalForm inventory={inventory} onSubmit={handleWithdrawal} />}
          {activeTab === 'history' && <HistoryList withdrawals={withdrawals} onDeleteWithdrawal={handleDeleteWithdrawal} />}
        </div>
      </main>

      {/* TOAST NOTIFICATIONS */}
      <div className="fixed top-8 right-8 z-[3100] flex flex-col gap-4 w-full max-w-sm pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className={`pointer-events-auto p-6 rounded-[32px] shadow-2xl border backdrop-blur-xl animate-in slide-in-from-right-full duration-500 ${toast.type === 'warning' ? 'bg-white/95 border-red-200 text-red-950' : toast.type === 'success' ? 'bg-white/95 border-emerald-200 text-emerald-950' : 'bg-white/95 border-blue-200 text-blue-950'}`}>
            <div className="flex items-start justify-between gap-6 mb-3">
              <div className="flex items-center gap-4 font-black text-sm">
                <div className={`p-3 rounded-2xl ${toast.type === 'warning' ? 'bg-red-100 text-red-600' : toast.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                   {toast.type === 'warning' ? <AlertTriangle size={20} /> : toast.type === 'success' ? <Check size={20} /> : <RefreshCw size={20} />}
                </div>
                {toast.message}
              </div>
              <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} className="text-slate-400 hover:text-slate-600 p-1"><X size={20} /></button>
            </div>
            {toast.technicalDetails && (
              <div className="mt-4 p-4 bg-slate-900 text-blue-300 text-[10px] font-mono rounded-2xl overflow-hidden leading-relaxed border border-blue-900/30">
                 <p className="opacity-50 mb-2 font-black uppercase tracking-widest text-[8px]">Debugger Details</p>
                 <p className="line-clamp-6 select-all break-words font-mono">{toast.technicalDetails}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;
