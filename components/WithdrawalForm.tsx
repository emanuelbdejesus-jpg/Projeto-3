
import React, { useState } from 'react';
import { Tool, Withdrawal, TeamType } from '../types';
import { REASONS, SUPERVISORS, RIG_TAGS } from '../constants';
import { Send, User, MessageSquare, Hash, Tag, HardHat, Users } from 'lucide-react';

interface Props {
  inventory: Tool[];
  onSubmit: (data: Omit<Withdrawal, 'id' | 'toolName'>) => void;
}

const WithdrawalForm: React.FC<Props> = ({ inventory, onSubmit }) => {
  const [toolId, setToolId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState(REASONS[0]);
  const [supervisor, setSupervisor] = useState('');
  const [operator, setOperator] = useState('');
  const [rigTag, setRigTag] = useState('');
  const [team, setTeam] = useState<TeamType>('Turma A');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!toolId || !supervisor || !operator || !rigTag || !team) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }
    onSubmit({
      toolId,
      quantity,
      reason,
      supervisor,
      operator,
      rigTag,
      team,
      date: new Date().toISOString(),
    });
    // Reset form
    setToolId('');
    setQuantity(1);
    setSupervisor('');
    setOperator('');
    setRigTag('');
  };

  const selectedTool = inventory.find(t => t.id === toolId);

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Ferramenta para Retirada</label>
          <select 
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            value={toolId}
            onChange={(e) => setToolId(e.target.value)}
          >
            <option value="">Selecione a ferramenta...</option>
            {inventory.map(tool => (
              <option key={tool.id} value={tool.id} disabled={tool.quantity <= 0}>
                {tool.type} {tool.model} (Disponível: {tool.quantity})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
              <Hash size={16} /> Quantidade
            </label>
            <input 
              type="number"
              min="1"
              max={selectedTool?.quantity || 1}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
              <Users size={16} /> Turma
            </label>
            <select 
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              value={team}
              onChange={(e) => setTeam(e.target.value as TeamType)}
            >
              <option value="Turma A">Turma A</option>
              <option value="Turma B">Turma B</option>
              <option value="Turma C">Turma C</option>
              <option value="Turma D">Turma D</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
            <Tag size={16} /> TAG da Perfuratriz
          </label>
          <select 
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            value={rigTag}
            onChange={(e) => setRigTag(e.target.value)}
          >
            <option value="">Selecione a TAG...</option>
            {RIG_TAGS.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
              <User size={16} /> Supervisor Responsável
            </label>
            <select 
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              value={supervisor}
              onChange={(e) => setSupervisor(e.target.value)}
            >
              <option value="">Selecione o supervisor...</option>
              {SUPERVISORS.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
              <HardHat size={16} /> Operador Responsável
            </label>
            <input 
              type="text"
              placeholder="Nome do Operador"
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              value={operator}
              onChange={(e) => setOperator(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
            <MessageSquare size={16} /> Motivo da Retirada
          </label>
          <select 
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          >
            {REASONS.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        <button 
          type="submit"
          className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2"
        >
          <span className="sr-only">Registrar</span>
          <Send size={18} />
          Registrar Retirada
        </button>
      </form>
    </div>
  );
};

export default WithdrawalForm;
