import React, { useState, useEffect } from 'react';
import {
  Clock,
  Plus,
  Trash2,
  Brain,
  Tag,
  Search,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Filter
} from 'lucide-react';
import type { AlmaMemory } from '../types';
import { apiRequest } from '../lib/api';

export const AlmaMemoryPage: React.FC = () => {
  const [memories, setMemories] = useState<AlmaMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');

  // Form para nova memória
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newCategory, setNewCategory] = useState('Geral');
  const [newType, setNewType] = useState<'preference' | 'semantic' | 'episodic' | 'project'>('semantic');
  const [newImportance, setNewImportance] = useState(7);
  const [isAdding, setIsAdding] = useState(false);

  const fetchMemories = async () => {
    try {
      const res = await apiRequest<{ memories: AlmaMemory[] }>('/api/alma/memories');
      setMemories(res.memories);
    } catch (err) {
      console.warn('Memory fetch fallback:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemories();
  }, []);

  const handleSaveMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim() || !newValue.trim()) return;

    try {
      const res = await apiRequest<{ memory: AlmaMemory }>('/api/alma/memories', {
        method: 'POST',
        body: {
          key: newKey,
          value: newValue,
          category: newCategory,
          type: newType,
          importance: newImportance
        }
      });
      setMemories(prev => [res.memory, ...prev]);
      setNewKey('');
      setNewValue('');
      setIsAdding(false);
    } catch (err) {
      console.warn('Error saving memory:', err);
    }
  };

  const handleDeleteMemory = async (id: string) => {
    setMemories(prev => prev.filter(m => m.id !== id));
    try {
      await apiRequest(`/api/alma/memories/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('Error deleting memory:', err);
    }
  };

  const filteredMemories = memories.filter(m => {
    const matchesSearch =
      m.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.value.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'all' || m.type === selectedType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6 animate-fadeIn max-w-5xl mx-auto pb-12">
      {/* Banner */}
      <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-purple-950 via-[#0A1329] to-slate-900 border border-purple-500/30 relative overflow-hidden shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-300 shadow-lg shadow-purple-500/20">
              <Brain size={24} />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">ALMA Memory Engine</h2>
              <p className="text-xs text-slate-300">
                Memória episódica, semântica e de preferências que permite ao Regente evoluir continuamente.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsAdding(!isAdding)}
            className="px-4 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-purple-600/30 self-start sm:self-auto"
          >
            <Plus size={16} />
            <span>Adicionar Memória</span>
          </button>
        </div>
      </div>

      {/* Modal / Form de Adição */}
      {isAdding && (
        <form onSubmit={handleSaveMemory} className="p-6 rounded-3xl bg-[#090E1F] border border-purple-500/40 shadow-xl space-y-4 animate-fadeIn">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Sparkles size={16} className="text-purple-400" />
            Registrar Nova Memória no Alma Core
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400">Tipo de Memória</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as any)}
                className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white"
              >
                <option value="semantic">Semântica (Fatos, Negócio, Metas)</option>
                <option value="preference">Preferência (Gostos, Hábitos, Casa)</option>
                <option value="episodic">Episódica (Eventos passados, Reuniões)</option>
                <option value="project">Projeto (Workflows ativos)</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400">Categoria</label>
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Ex: Casa, Vendas, Rotina, Família"
                className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400">Chave / Título da Memória</label>
            <input
              type="text"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder="Ex: Temperatura ideal para trabalhar"
              className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white"
              required
            />
          </div>

          <div>
            <label className="text-xs text-slate-400">Conteúdo / Valor</label>
            <textarea
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="Ex: Manter 22°C com luz azul e café pronto às 09:00"
              className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white h-20 resize-none"
              required
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-400 hover:bg-slate-700 text-xs"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
            >
              Gravar Memória
            </button>
          </div>
        </form>
      )}

      {/* Barra de Busca e Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-3.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar nas memórias do Alma..."
            className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl pl-10 pr-4 py-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-400"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-xs text-slate-300 focus:outline-none focus:border-purple-400"
          >
            <option value="all">Todos os Tipos</option>
            <option value="preference">Preferências</option>
            <option value="semantic">Semântica</option>
            <option value="episodic">Episódica</option>
            <option value="project">Projetos</option>
          </select>
        </div>
      </div>

      {/* Lista de Memórias */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredMemories.map(mem => (
          <div
            key={mem.id}
            className="p-5 rounded-3xl bg-[#090E1F] border border-slate-800 hover:border-purple-500/40 transition-all shadow-xl relative group"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {mem.type}
                </span>
                <span className="text-[11px] text-slate-400 font-medium">#{mem.category}</span>
              </div>

              <button
                onClick={() => handleDeleteMemory(mem.id)}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-all"
                title="Esquecer memória"
              >
                <Trash2 size={14} />
              </button>
            </div>

            <h4 className="text-sm font-bold text-white mt-2.5">{mem.key}</h4>
            <p className="text-xs text-slate-300 mt-1.5 leading-relaxed bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
              {mem.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
