
import React, { useState, useMemo } from 'react';
import { Withdrawal } from '../types';
import { 
  Calendar as Cal, 
  User as Usr, 
  Info as Inf, 
  FileText as FileT, 
  Tag as TagI, 
  Filter as Filt, 
  Search as Sea, 
  HardHat as HardH, 
  Users as Usrs, 
  Download as Down, 
  ChevronRight as ChevR,
  Trash2,
  AlertTriangle,
  RotateCcw,
  X
} from 'lucide-react';

interface Props {
  withdrawals: Withdrawal[];
  onDeleteWithdrawal: (id: string) => void;
}

const HistoryList: React.FC<Props> = ({ withdrawals, onDeleteWithdrawal }) => {
  const [filterRange, setFilterRange] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [itemToDelete, setItemToDelete] = useState<Withdrawal | null>(null);

  const filteredWithdrawals = useMemo(() => {
    let list = withdrawals;

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      list = list.filter(w => 
        w.toolName.toLowerCase().includes(lowerSearch) || 
        w.supervisor.toLowerCase().includes(lowerSearch) || 
        (w.operator && w.operator.toLowerCase().includes(lowerSearch)) ||
        w.rigTag.toLowerCase().includes(lowerSearch) ||
        (w.team && w.team.toLowerCase().includes(lowerSearch))
      );
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (filterRange === 'today') {
      list = list.filter(w => new Date(w.date) >= today);
    } else if (filterRange === 'week') {
      const lastWeek = new Date(today);
      lastWeek.setDate(today.getDate() - 7);
      list = list.filter(w => new Date(w.date) >= lastWeek);
    } else if (filterRange === 'month') {
      const lastMonth = new Date(today);
      lastMonth.setMonth(today.getMonth() - 1);
      list = list.filter(w => new Date(w.date) >= lastMonth);
    } else if (filterRange === 'custom' && startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      list = list.filter(w => {
        const d = new Date(w.date);
        return d >= start && d <= end;
      });
    }

    return list;
  }, [withdrawals, filterRange, startDate, endDate, searchTerm]);

  const handleExportCSV = () => {
    if (filteredWithdrawals.length === 0) return;

    const headers = [
      'Data',
      'Ferramenta',
      'Quantidade',
      'TAG Perfuratriz',
      'Turma',
      'Supervisor',
      'Operador Responsável',
      'Motivo'
    ];

    const csvContent = [
      headers.join(';'),
      ...filteredWithdrawals.map(w => [
        new Date(w.date).toLocaleString('pt-BR'),
        w.toolName,
        w.quantity,
        w.rigTag,
        w.team,
        w.supervisor,
        w.operator,
        `"${w.reason.replace(/"/g, '""')}"`
      ].join(';'))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `historico_stoper_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const confirmAndClose = () => {
    if (itemToDelete) {
      onDeleteWithdrawal(itemToDelete.id);
      setItemToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-800 font-bold">
            <Filt size={20} className="text-blue-600" />
            <span>Filtrar Histórico por Período</span>
          </div>

          <div className="flex flex-wrap gap-2 p-1 bg-slate-100 rounded-xl">
            {[
              { id: 'all', label: 'Tudo' },
              { id: 'today', label: 'Diário' },
              { id: 'week', label: 'Semanal' },
              { id: 'month', label: 'Mensal' },
              { id: 'custom', label: 'Customizado' },
            ].map((option) => (
              <button
                key={option.id}
                onClick={() => setFilterRange(option.id as any)}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                  filterRange === option.id
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
          <div className={`${filterRange === 'custom' ? 'md:col-span-4' : 'md:col-span-8'} space-y-1`}>
            <label className="block text-[10px] font-bold text-slate-400 uppercase ml-1">Pesquisa Geral</label>
            <div className="relative">
              <Sea className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Ferramenta, Supervisor, Operador, TAG..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {filterRange === 'custom' && (
            <div className="md:col-span-5 space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase ml-1">Intervalo Customizado</label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Cal className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input
                    type="date"
                    className="w-full pl-9 pr-2 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <ChevR size={16} className="text-slate-300" />
                <div className="relative flex-1">
                  <Cal className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input
                    type="date"
                    className="w-full pl-9 pr-2 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          <div className={`${filterRange === 'custom' ? 'md:col-span-3' : 'md:col-span-4'} flex justify-end`}>
            <button
              onClick={handleExportCSV}
              disabled={filteredWithdrawals.length === 0}
              className="w-full flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-emerald-100"
            >
              <Down size={18} />
              Exportar CSV
            </button>
          </div>
        </div>
      </div>

      {/* Results List */}
      {filteredWithdrawals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
          <FileT size={48} className="text-slate-300 mb-4" />
          <p className="text-slate-500 font-medium">Nenhum registro encontrado.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredWithdrawals.map((item) => (
            <div key={item.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center gap-4 transition-all hover:shadow-md group relative">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <span className="text-lg font-bold text-slate-800">{item.toolName}</span>
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded uppercase flex items-center gap-1 border border-blue-100">
                    <TagI size={10} /> {item.rigTag}
                  </span>
                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded uppercase flex items-center gap-1 border border-indigo-100">
                    <Usrs size={10} /> {item.team}
                  </span>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded">
                    Qtd: {item.quantity}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-2 gap-x-4 text-sm text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Cal size={14} className="text-slate-400" />
                    {new Date(item.date).toLocaleString('pt-BR')}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Usr size={14} className="text-slate-400" />
                    <span className="font-semibold text-slate-700">Sup:</span> {item.supervisor}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <HardH size={14} className="text-slate-400" />
                    <span className="font-semibold text-slate-700">Op:</span> {item.operator}
                  </div>
                </div>
              </div>
              
              <div className="md:w-64 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-4 flex items-start justify-between">
                <div className="flex items-start gap-1.5 text-sm">
                  <Inf size={12} className="text-blue-500 mt-1" />
                  <div>
                    <span className="block font-bold text-slate-400 uppercase text-[9px] mb-0.5">Motivo</span>
                    <span className="text-slate-600 text-sm leading-tight">{item.reason}</span>
                  </div>
                </div>
                
                <button 
                  onClick={() => setItemToDelete(item)}
                  className="ml-4 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  title="Excluir Registro (Estornar Estoque)"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Elaborate Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setItemToDelete(null)}
          ></div>
          
          {/* Modal Content */}
          <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-1 bg-orange-500"></div>
            
            <div className="p-8">
              <div className="flex items-center justify-center w-16 h-16 bg-orange-100 text-orange-600 rounded-full mx-auto mb-6">
                <AlertTriangle size={32} />
              </div>
              
              <h3 className="text-2xl font-bold text-slate-800 text-center mb-2">
                Confirmar Estorno?
              </h3>
              <p className="text-slate-500 text-center text-sm mb-8">
                Esta ação irá excluir o registro de saída e devolver os materiais automaticamente para o estoque disponível.
              </p>
              
              {/* Tool Detail Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-8">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ferramenta</span>
                  <span className="text-sm font-bold text-slate-800">{itemToDelete.toolName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quantidade a devolver</span>
                  <span className="flex items-center gap-1.5 text-lg font-black text-emerald-600">
                    <RotateCcw size={16} />
                    +{itemToDelete.quantity} un.
                  </span>
                </div>
              </div>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={confirmAndClose}
                  className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-black transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-2"
                >
                  <RotateCcw size={18} />
                  Confirmar Estorno
                </button>
                <button 
                  onClick={() => setItemToDelete(null)}
                  className="w-full py-4 bg-white text-slate-500 font-bold rounded-2xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                >
                  <X size={18} />
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryList;
