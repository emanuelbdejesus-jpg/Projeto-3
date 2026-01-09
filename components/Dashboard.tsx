
import React, { useMemo, useState } from 'react';
import { Tool, Withdrawal, ToolModel } from '../types';
import { REASONS } from '../constants';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Zap, Box, TrendingUp, Sparkles, AlertTriangle, Layers, ShieldCheck, Hexagon, FileWarning, Filter, XCircle, ArrowRight, BarChart3 } from 'lucide-react';

interface Props {
  inventory: Tool[];
  withdrawals: Withdrawal[];
  aiInsights: string;
  onNavigateToInventory: (filter: string) => void;
}

type TimeRange = 'diario' | 'semanal' | 'mensal';

const Dashboard: React.FC<Props> = ({ inventory, withdrawals, aiInsights, onNavigateToInventory }) => {
  const [totalTimeRange, setTotalTimeRange] = useState<TimeRange>('diario');
  
  // Date Filters
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Helper to find the earliest withdrawal date
  const earliestWithdrawalDate = useMemo(() => {
    if (withdrawals.length === 0) return null;
    const timestamps = withdrawals.map(w => new Date(w.date).getTime());
    const min = Math.min(...timestamps);
    const date = new Date(min);
    date.setHours(0, 0, 0, 0);
    return date;
  }, [withdrawals]);

  // Filtered withdrawals for consumption charts
  const filteredWithdrawals = useMemo(() => {
    if (!startDate && !endDate) return withdrawals;

    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    if (end) {
      const endOfDay = new Date(end);
      endOfDay.setHours(23, 59, 59, 999);
      return withdrawals.filter(w => {
        const d = new Date(w.date);
        if (start && d < start) return false;
        if (d > endOfDay) return false;
        return true;
      });
    }

    return withdrawals.filter(w => {
      const d = new Date(w.date);
      if (start && d < start) return false;
      return true;
    });
  }, [withdrawals, startDate, endDate]);

  const hasteStock = useMemo(() => {
    return ['T51', 'T50', 'T45'].map(model => {
      const tool = inventory.find(t => t.type === 'Haste' && t.model === model);
      return {
        model,
        quantity: tool ? tool.quantity : 0,
        min: tool ? tool.minThreshold : 0
      };
    });
  }, [inventory]);

  const punhoStock = useMemo(() => {
    return ['T51', 'T50', 'T45'].map(model => {
      const tool = inventory.find(t => t.type === 'Punho' && t.model === model);
      return {
        model,
        quantity: tool ? tool.quantity : 0,
        min: tool ? tool.minThreshold : 0
      };
    });
  }, [inventory]);

  const bitStock = useMemo(() => {
    const bitSpecs = [
      { type: "Bit 4,5''", model: 'T51' },
      { type: "Bit 3,5''", model: 'T51' },
      { type: "Bit 4,5''", model: 'T50' },
      { type: "Bit 4,5''", model: 'T45' },
      { type: "Bit 3,5''", model: 'T45' },
    ];

    return bitSpecs.map(spec => {
      const tool = inventory.find(t => t.type === spec.type && t.model === spec.model as ToolModel);
      return {
        name: `${spec.type} - ${spec.model}`,
        model: spec.model,
        quantity: tool ? tool.quantity : 0,
        min: tool ? tool.minThreshold : 0
      };
    });
  }, [inventory]);

  const withdrawalsToday = withdrawals.filter(w => 
    new Date(w.date).toDateString() === new Date().toDateString()
  ).length;

  const lowStockTools = useMemo(() => inventory.filter(t => t.quantity <= t.minThreshold), [inventory]);

  const detailedTypeConsumptionData = useMemo(() => {
    const data = inventory.map(tool => {
      const total = filteredWithdrawals
        .filter(w => w.toolId === tool.id)
        .reduce((acc, curr) => acc + curr.quantity, 0);
      return { 
        name: `${tool.type} ${tool.model}`, 
        model: tool.model,
        type: tool.type,
        total 
      };
    });
    return data.filter(item => item.total > 0).sort((a, b) => b.total - a.total);
  }, [filteredWithdrawals, inventory]);

  const reasonConsumptionData = useMemo(() => {
    return REASONS.map(reason => ({
      name: reason,
      total: filteredWithdrawals
        .filter(w => w.reason === reason)
        .reduce((acc, curr) => acc + curr.quantity, 0)
    })).sort((a, b) => b.total - a.total);
  }, [filteredWithdrawals]);

  const getStartOfWeek = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); 
    return new Date(d.setDate(diff));
  };

  const getEvolutionDataForRange = (range: TimeRange) => {
    if (!earliestWithdrawalDate) return [];
    
    const data: any[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (range === 'diario') {
      let current = new Date(earliestWithdrawalDate);
      while (current <= today) {
        const dateStr = current.toISOString().split('T')[0];
        const dayWithdrawals = withdrawals.filter(w => w.date.startsWith(dateStr));
        
        data.push({ 
          label: current.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          totalOutput: dayWithdrawals.reduce((sum, w) => sum + w.quantity, 0)
        });
        current.setDate(current.getDate() + 1);
      }
    } else if (range === 'semanal') {
      let current = getStartOfWeek(earliestWithdrawalDate);
      while (current <= today) {
        const weekEnd = new Date(current);
        weekEnd.setDate(current.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        const weekWithdrawals = withdrawals.filter(w => {
          const wd = new Date(w.date);
          return wd >= current && wd <= weekEnd;
        });

        data.push({ 
          label: `Sem. ${current.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`,
          totalOutput: weekWithdrawals.reduce((sum, w) => sum + w.quantity, 0)
        });
        current.setDate(current.getDate() + 7);
      }
    } else {
      let current = new Date(earliestWithdrawalDate.getFullYear(), earliestWithdrawalDate.getMonth(), 1);
      const endLimit = new Date(today.getFullYear(), today.getMonth(), 1);
      
      while (current <= endLimit) {
        const month = current.getMonth();
        const year = current.getFullYear();

        const monthWithdrawals = withdrawals.filter(w => {
          const wd = new Date(w.date);
          return wd.getMonth() === month && wd.getFullYear() === year;
        });

        data.push({ 
          label: current.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
          totalOutput: monthWithdrawals.reduce((sum, w) => sum + w.quantity, 0)
        });
        current.setMonth(current.getMonth() + 1);
      }
    }
    return data;
  };

  const totalEvolutionData = useMemo(() => getEvolutionDataForRange(totalTimeRange), [withdrawals, inventory, totalTimeRange, earliestWithdrawalDate]);

  const modelColors: Record<ToolModel, string> = {
    'T51': '#2563eb',
    'T50': '#059669',
    'T45': '#d97706',
  };

  const reasonColors = [
    '#4f46e5', '#f43f5e', '#f59e0b', '#8b5cf6', '#06b6d4', '#10b981'
  ];

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className="space-y-6">
      {/* Alerts Panel */}
      {lowStockTools.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border-l-4 border-l-red-500 border border-slate-100 overflow-hidden">
          <div className="p-4 bg-red-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle size={20} />
              <h3 className="font-bold">Alertas de Reposição Crítica</h3>
            </div>
            <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-full">
              {lowStockTools.length} Itens
            </span>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {lowStockTools.map(tool => (
              <div key={tool.id} className="flex flex-col justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase">{tool.model}</p>
                    <p className="text-sm font-semibold text-slate-800">{tool.type}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Estoque / Min</p>
                    <p className="text-sm font-black text-red-600">
                      {tool.quantity} <span className="text-slate-300 mx-1">/</span> {tool.minThreshold}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => onNavigateToInventory(`${tool.type} ${tool.model}`)}
                  className="w-full mt-2 py-1.5 text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 rounded-lg hover:bg-blue-100 hover:text-blue-700 transition-all flex items-center justify-center gap-1 uppercase tracking-tight"
                >
                  Ver no Controle de Inventário <ArrowRight size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-green-50 text-green-600 rounded-lg"><Zap size={24} /></div>
            <span className="text-xs font-semibold text-slate-400 uppercase">Saídas Hoje</span>
          </div>
          <p className="text-3xl font-bold text-slate-800">{withdrawalsToday}</p>
          <p className="text-sm text-slate-500 mt-1">Registradas em {new Date().toLocaleDateString()}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-orange-50 text-orange-600 rounded-lg"><TrendingUp size={24} /></div>
            <span className="text-xs font-semibold text-slate-400 uppercase">Modelo Principal</span>
          </div>
          <p className="text-3xl font-bold text-slate-800">T51</p>
          <p className="text-sm text-slate-500 mt-1">Modelo mais estocado</p>
        </div>
      </div>

      {/* JANELAS DE ESTOQUE ATUAL - HASTES E PUNHOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Layers size={22} className="text-blue-500" />
              Estoque Atual - Hastes
            </h3>
            <span className="text-xs font-bold text-slate-400 uppercase">Hastes</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {hasteStock.map((haste) => (
              <div key={haste.model} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col items-center justify-center transition-all hover:shadow-md">
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full mb-2 ${
                  haste.model === 'T51' ? 'bg-blue-600 text-white' : 
                  haste.model === 'T50' ? 'bg-emerald-600 text-white' : 
                  'bg-orange-600 text-white'
                }`}>
                  {haste.model}
                </span>
                <p className="text-[11px] font-semibold text-slate-500 mb-1">Haste {haste.model}</p>
                <div className="flex items-baseline gap-1">
                  <span className={`text-2xl font-black ${haste.quantity <= haste.min ? 'text-red-600' : 'text-slate-800'}`}>
                    {haste.quantity}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">un</span>
                </div>
                <div className="w-full mt-3 bg-slate-200 h-1 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${haste.quantity <= haste.min ? 'bg-red-500' : 'bg-blue-500'}`}
                    style={{ width: `${Math.min(100, (haste.quantity / 25) * 100)}%` }}
                  ></div>
                </div>
                <p className="text-[9px] text-slate-400 mt-2 font-bold uppercase tracking-tighter">Min: {haste.min} un</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <ShieldCheck size={22} className="text-emerald-500" />
              Estoque Atual - Punhos
            </h3>
            <span className="text-xs font-bold text-slate-400 uppercase">Punhos</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {punhoStock.map((punho) => (
              <div key={punho.model} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col items-center justify-center transition-all hover:shadow-md">
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full mb-2 ${
                  punho.model === 'T51' ? 'bg-blue-600 text-white' : 
                  punho.model === 'T50' ? 'bg-emerald-600 text-white' : 
                  'bg-orange-600 text-white'
                }`}>
                  {punho.model}
                </span>
                <p className="text-[11px] font-semibold text-slate-500 mb-1">Punho {punho.model}</p>
                <div className="flex items-baseline gap-1">
                  <span className={`text-2xl font-black ${punho.quantity <= punho.min ? 'text-red-600' : 'text-slate-800'}`}>
                    {punho.quantity}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">un</span>
                </div>
                <div className="w-full mt-3 bg-slate-200 h-1 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${punho.quantity <= punho.min ? 'bg-red-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(100, (punho.quantity / 20) * 100)}%` }}
                  ></div>
                </div>
                <p className="text-[9px] text-slate-400 mt-2 font-bold uppercase tracking-tighter">Min: {punho.min} un</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* JANELA DE ESTOQUE ATUAL - BITS */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Hexagon size={22} className="text-orange-500" />
            Estoque Atual - Bits
          </h3>
          <span className="text-xs font-bold text-slate-400 uppercase">Detalhamento Bits</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {bitStock.map((bit) => (
            <div key={bit.name} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col items-center justify-center transition-all hover:shadow-md">
              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full mb-2 ${
                bit.model === 'T51' ? 'bg-blue-600 text-white' : 
                bit.model === 'T50' ? 'bg-emerald-600 text-white' : 
                'bg-orange-600 text-white'
              }`}>
                {bit.model}
              </span>
              <p className="text-[11px] font-semibold text-slate-700 mb-1 text-center">{bit.name}</p>
              <div className="flex items-baseline gap-1">
                <span className={`text-2xl font-black ${bit.quantity <= bit.min ? 'text-red-600' : 'text-slate-800'}`}>
                  {bit.quantity}
                </span>
                <span className="text-[10px] text-slate-400 font-bold uppercase">un</span>
              </div>
              <div className="w-full mt-3 bg-slate-200 h-1 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${bit.quantity <= bit.min ? 'bg-red-500' : 'bg-orange-500'}`}
                  style={{ width: `${Math.min(100, (bit.quantity / 30) * 100)}%` }}
                ></div>
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Min: {bit.min} un</span>
                {bit.quantity <= bit.min && <AlertTriangle size={10} className="text-red-500" />}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION: TOTAL CONSUMPTION EVOLUTION BAR CHART */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <BarChart3 size={22} className="text-blue-600" />
              Fluxo Total de Saída de Material
            </h3>
            <p className="text-sm text-slate-500 mt-1">Evolução do volume total de ferramental retirado por período</p>
          </div>
          
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {(['diario', 'semanal', 'mensal'] as TimeRange[]).map((range) => (
              <button 
                key={range}
                onClick={() => setTotalTimeRange(range)}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all capitalize ${totalTimeRange === range ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={totalEvolutionData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12}} />
              <Tooltip 
                cursor={{fill: '#f8fafc'}}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                formatter={(value: number) => [`${value} unidades`, 'Total de Saídas']}
              />
              <Bar dataKey="totalOutput" fill="#4f46e5" radius={[6, 6, 0, 0]} maxBarSize={50} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* DASHBOARD CONSUMPTION FILTER SECTION */}
      <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col md:flex-row md:items-end gap-4">
        <div className="flex-1 space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 flex items-center gap-1">
            <Filter size={10} /> Filtro de Período Global para Estatísticas de Consumo
          </label>
          <div className="flex gap-2">
            <input 
              type="date" 
              className="flex-1 p-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <input 
              type="date" 
              className="flex-1 p-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
        <button 
          onClick={clearFilters}
          className="p-2.5 bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-100 rounded-xl transition-all"
          title="Limpar Filtros"
        >
          <XCircle size={20} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* DETAILED CHART: CONSUMPTION BY SPECIFIC TOOL */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Box size={22} className="text-blue-500" />
                Consumo Detalhado por Modelo
              </h3>
              <p className="text-sm text-slate-500 mt-1">Saídas por cada especificação técnica</p>
            </div>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={detailedTypeConsumptionData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, angle: -15, textAnchor: 'end'}} height={60} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="total" radius={[4, 4, 0, 0]} maxBarSize={40}>
                  {detailedTypeConsumptionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={modelColors[entry.model as ToolModel] || '#cbd5e1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CONSUMPTION BY REASON CHART */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <FileWarning size={22} className="text-rose-500" />
                Consumo por Motivo de Retirada
              </h3>
              <p className="text-sm text-slate-500 mt-1">Análise detalhada das causas de saída de material</p>
            </div>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reasonConsumptionData} layout="vertical" margin={{ left: 40, right: 40 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" axisLine={false} tickLine={false} hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={140} tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="total" radius={[0, 4, 4, 0]} barSize={24} label={{ position: 'right', fontSize: 12, fontWeight: 800, fill: '#1e293b' }}>
                  {reasonConsumptionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={reasonColors[index % reasonColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Sparkles size={120} />
        </div>
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Sparkles size={20} className="text-blue-400" />
          Análise Preditiva e Insights
        </h3>
        <div className="prose prose-invert max-w-none text-slate-300 text-sm leading-relaxed max-h-[220px] overflow-y-auto custom-scrollbar">
          {aiInsights.split('\n').map((line, i) => (
            <p key={i} className="mb-2">{line}</p>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-slate-800 flex items-center gap-2 text-xs text-slate-400">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          Processado por Gemini Flash
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.05); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default Dashboard;
