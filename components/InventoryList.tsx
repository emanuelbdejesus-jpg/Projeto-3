
import React, { useEffect } from 'react';
import { Tool } from '../types';
import { Search, AlertCircle, Plus, Minus, Settings2 } from 'lucide-react';

interface Props {
  inventory: Tool[];
  onUpdateStock: (id: string, qty: number) => void;
  onUpdateThreshold: (id: string, threshold: number) => void;
  initialFilter?: string;
  onFilterChange?: (filter: string) => void;
}

const InventoryList: React.FC<Props> = ({ 
  inventory, 
  onUpdateStock, 
  onUpdateThreshold, 
  initialFilter = '', 
  onFilterChange 
}) => {
  const [filter, setFilter] = React.useState(initialFilter);

  // Sync internal state with prop changes (like when coming from Dashboard)
  useEffect(() => {
    setFilter(initialFilter);
  }, [initialFilter]);

  const handleFilterChange = (value: string) => {
    setFilter(value);
    if (onFilterChange) {
      onFilterChange(value);
    }
  };

  const filtered = inventory.filter(t => 
    t.model.toLowerCase().includes(filter.toLowerCase()) || 
    t.type.toLowerCase().includes(filter.toLowerCase()) ||
    `${t.type} ${t.model}`.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Buscar por modelo ou tipo..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filter}
            onChange={(e) => handleFilterChange(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-4 text-sm text-slate-500">
          <span className="flex items-center gap-1 font-medium"><span className="w-3 h-3 bg-blue-500 rounded-full"></span> Normal</span>
          <span className="flex items-center gap-1 font-medium"><span className="w-3 h-3 bg-red-500 rounded-full"></span> Crítico</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold">
            <tr>
              <th className="px-6 py-4">Equipamento</th>
              <th className="px-6 py-4">Modelo</th>
              <th className="px-6 py-4">Estoque Atual</th>
              <th className="px-6 py-4 flex items-center gap-2">
                <Settings2 size={14} className="text-slate-400" />
                Min. Recomendado
              </th>
              <th className="px-6 py-4 text-center">Gestão Estoque</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">
                  Nenhuma ferramenta encontrada para o filtro selecionado.
                  <button 
                    onClick={() => handleFilterChange('')}
                    className="block mx-auto mt-2 text-blue-600 hover:underline text-sm"
                  >
                    Limpar filtro
                  </button>
                </td>
              </tr>
            ) : (
              filtered.map(tool => (
                <tr key={tool.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-800">{tool.type}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                      tool.model === 'T51' ? 'bg-blue-100 text-blue-700' : 
                      tool.model === 'T50' ? 'bg-green-100 text-green-700' : 
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {tool.model}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className={`text-lg font-bold ${tool.quantity <= tool.minThreshold ? 'text-red-600' : 'text-slate-800'}`}>
                        {tool.quantity}
                      </span>
                      {tool.quantity <= tool.minThreshold && (
                        <AlertCircle size={16} className="text-red-500" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center bg-slate-50 rounded-lg p-1 border border-slate-200">
                        <button 
                          onClick={() => onUpdateThreshold(tool.id, tool.minThreshold - 1)}
                          className="p-1 hover:bg-slate-200 text-slate-500 rounded transition-colors"
                          disabled={tool.minThreshold <= 0}
                        >
                          <Minus size={14} />
                        </button>
                        <span className="px-3 text-sm font-semibold text-slate-600 min-w-[32px] text-center">
                          {tool.minThreshold}
                        </span>
                        <button 
                          onClick={() => onUpdateThreshold(tool.id, tool.minThreshold + 1)}
                          className="p-1 hover:bg-slate-200 text-slate-500 rounded transition-colors"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <span className="text-xs text-slate-400 font-medium">un.</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => onUpdateStock(tool.id, tool.quantity - 1)}
                        className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-colors border border-transparent hover:border-red-100"
                        disabled={tool.quantity <= 0}
                        title="Diminuir Estoque"
                      >
                        <Minus size={18} />
                      </button>
                      <button 
                        onClick={() => onUpdateStock(tool.id, tool.quantity + 1)}
                        className="p-2 hover:bg-green-50 text-green-500 rounded-lg transition-colors border border-transparent hover:border-green-100"
                        title="Aumentar Estoque"
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InventoryList;
