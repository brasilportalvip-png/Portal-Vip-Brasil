import React, { useState, useEffect } from 'react';
import {
  Home,
  Lightbulb,
  Tv,
  Thermometer,
  Lock,
  Unlock,
  Wind,
  Layers,
  Sparkles,
  Power,
  Sliders,
  CheckCircle2,
  Film,
  Moon,
  Sun,
  Shield,
  Coffee,
  PartyPopper,
  Zap
} from 'lucide-react';
import type { SmartDevice, HomeScene } from '../types';
import { apiRequest } from '../lib/api';

export const AlmaHomeHubPage: React.FC = () => {
  const [devices, setDevices] = useState<SmartDevice[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string>('todos');
  const [loading, setLoading] = useState(true);
  const [activeScene, setActiveScene] = useState<string | null>(null);

  const rooms = [
    { id: 'todos', label: 'Todos os Ambientes' },
    { id: 'sala', label: 'Sala de Estar' },
    { id: 'quarto', label: 'Quarto Master' },
    { id: 'cozinha', label: 'Cozinha' },
    { id: 'escritorio', label: 'Escritório' },
    { id: 'externo', label: 'Área Externa' }
  ];

  const scenes: Array<{ id: string; label: string; icon: any; desc: string; color: string }> = [
    { id: 'cinema', label: 'Cinema', icon: Film, desc: 'Luzes azuis 10%, TV on, cortina fechada, AC 21°C', color: 'from-indigo-600 to-blue-700' },
    { id: 'sono', label: 'Sono / Noite', icon: Moon, desc: 'Tudo desligado na sala, luz noturna 15%, AC 23°C, portas trancadas', color: 'from-amber-600 to-purple-800' },
    { id: 'chegada', label: 'Chegada', icon: Sun, desc: 'Luzes 80%, AC 22°C, destrancar entrada', color: 'from-cyan-600 to-blue-600' },
    { id: 'trabalho', label: 'Foco / Trabalho', icon: Coffee, desc: 'Luz branca 100%, TV off, som ambiente suave', color: 'from-emerald-600 to-teal-700' },
    { id: 'festa', label: 'Festa / Recepção', icon: PartyPopper, desc: 'Luzes dinâmicas, som 60%, AC 20°C', color: 'from-pink-600 to-rose-700' },
    { id: 'economia', label: 'Eco Saver', icon: Zap, desc: 'Standby inteligente e corte de consumo ocioso', color: 'from-green-600 to-emerald-700' }
  ];

  const fetchDevices = async () => {
    try {
      const res = await apiRequest<{ devices: SmartDevice[] }>('/api/alma/devices');
      setDevices(res.devices);
    } catch (err) {
      console.warn('Fallback loading devices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleTogglePower = async (device: SmartDevice) => {
    const newPower = !device.state.power;
    const updated = {
      ...device,
      state: { ...device.state, power: newPower }
    };
    setDevices(prev => prev.map(d => d.id === device.id ? updated : d));

    try {
      await apiRequest(`/api/alma/devices/${device.id}`, {
        method: 'PATCH',
        body: { state: { power: newPower } }
      });
    } catch (err) {
      console.warn('Device toggle error:', err);
    }
  };

  const handleUpdateTemperature = async (device: SmartDevice, delta: number) => {
    const currentTemp = device.state.temperature || 22;
    const newTemp = Math.max(16, Math.min(30, currentTemp + delta));
    const updated = {
      ...device,
      state: { ...device.state, temperature: newTemp }
    };
    setDevices(prev => prev.map(d => d.id === device.id ? updated : d));

    try {
      await apiRequest(`/api/alma/devices/${device.id}`, {
        method: 'PATCH',
        body: { state: { temperature: newTemp } }
      });
    } catch (err) {
      console.warn('Device temp error:', err);
    }
  };

  const handleApplyScene = async (sceneId: string) => {
    setActiveScene(sceneId);
    let prompt = '';
    if (sceneId === 'cinema') prompt = 'Alma, prepare a sala para modo cinema.';
    else if (sceneId === 'sono') prompt = 'Alma, vou dormir, prepare o modo sono.';
    else if (sceneId === 'chegada') prompt = 'Alma, cheguei em casa.';
    else if (sceneId === 'trabalho') prompt = 'Alma, modo foco e trabalho.';
    else if (sceneId === 'festa') prompt = 'Alma, ative o modo festa.';
    else if (sceneId === 'economia') prompt = 'Alma, ative economia de energia.';

    try {
      const intentRes = await apiRequest<{ intent: any }>('/api/alma/intent', {
        method: 'POST',
        body: { prompt }
      });
      await apiRequest('/api/alma/orchestrate', {
        method: 'POST',
        body: { intent: intentRes.intent }
      });
      await fetchDevices();
    } catch (err) {
      console.warn('Scene trigger error:', err);
    }
  };

  const filteredDevices = selectedRoom === 'todos'
    ? devices
    : devices.filter(d => d.room === selectedRoom);

  return (
    <div className="space-y-6 animate-fadeIn max-w-6xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-cyan-950 via-[#0A1329] to-slate-900 border border-cyan-500/30 relative overflow-hidden shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-lg shadow-cyan-500/20">
            <Home size={24} />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">ALMA Home Hub</h2>
            <p className="text-xs text-slate-300">
              Camada unificada de controle residencial via Matter, Wi-Fi, Bluetooth e Home Assistant DAL.
            </p>
          </div>
        </div>
      </div>

      {/* Seção de Cenas Rápidas */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Sparkles size={16} className="text-amber-400" />
          Cenários de Automação Inteligente (Alma Scenes)
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {scenes.map(sc => {
            const Icon = sc.icon;
            const isAct = activeScene === sc.id;
            return (
              <button
                key={sc.id}
                onClick={() => handleApplyScene(sc.id)}
                className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden group ${
                  isAct
                    ? 'bg-gradient-to-br ' + sc.color + ' border-cyan-400 shadow-lg shadow-cyan-500/20'
                    : 'bg-slate-900/80 hover:bg-slate-850 border-slate-800 hover:border-slate-700'
                }`}
              >
                <Icon size={20} className={isAct ? 'text-white' : 'text-cyan-400 group-hover:scale-110 transition-transform'} />
                <h4 className="text-xs font-bold text-white mt-2">{sc.label}</h4>
                <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{sc.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filtro por Cômodos */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {rooms.map(rm => (
          <button
            key={rm.id}
            onClick={() => setSelectedRoom(rm.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedRoom === rm.id
                ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800'
            }`}
          >
            {rm.label}
          </button>
        ))}
      </div>

      {/* Grid de Dispositivos Conectados */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDevices.map(dev => (
          <div
            key={dev.id}
            className={`p-5 rounded-3xl border transition-all ${
              dev.state.power
                ? 'bg-[#0E172A] border-cyan-500/40 shadow-xl shadow-cyan-500/10'
                : 'bg-slate-900/60 border-slate-800/80 opacity-75'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${dev.state.power ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-800 text-slate-500'}`}>
                  {dev.type === 'light' && <Lightbulb size={20} />}
                  {dev.type === 'tv' && <Tv size={20} />}
                  {dev.type === 'ac' && <Thermometer size={20} />}
                  {dev.type === 'curtain' && <Wind size={20} />}
                  {dev.type === 'lock' && (dev.state.isLocked ? <Lock size={20} /> : <Unlock size={20} />)}
                </div>

                <div>
                  <h4 className="text-sm font-bold text-white">{dev.name}</h4>
                  <span className="text-[10px] text-slate-400 uppercase font-mono">{dev.room} • {dev.protocol}</span>
                </div>
              </div>

              {/* Botão de Power */}
              {dev.type !== 'lock' && (
                <button
                  onClick={() => handleTogglePower(dev)}
                  className={`p-2.5 rounded-xl transition-all ${
                    dev.state.power
                      ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/30'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  <Power size={16} />
                </button>
              )}
            </div>

            {/* Controles Específicos por Tipo */}
            {dev.type === 'ac' && dev.state.temperature && (
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400">Temperatura Alvo</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleUpdateTemperature(dev, -1)}
                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center text-xs"
                  >
                    -
                  </button>
                  <span className="text-sm font-bold text-cyan-300 font-mono">{dev.state.temperature}°C</span>
                  <button
                    onClick={() => handleUpdateTemperature(dev, 1)}
                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center text-xs"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {dev.type === 'light' && dev.state.brightness !== undefined && (
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>Brilho</span>
                <span className="font-mono text-cyan-400 font-bold">{dev.state.brightness}%</span>
              </div>
            )}

            {dev.type === 'lock' && (
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400">Status de Segurança</span>
                <span className={`text-xs font-bold font-mono ${dev.state.isLocked ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {dev.state.isLocked ? 'Trancada' : 'Aberta'}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
