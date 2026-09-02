import { GoogleGenAI, Type } from '@google/genai';
import { config } from '../config/index.js';
import { textAiClient } from './ai.js';
import { COLLECTIONS, firestore, newId, nowIso, queryData } from './store.js';

export interface AlmaIntentResult {
  rawPrompt: string;
  category: string;
  goal: string;
  targetDomain: 'HOME' | 'BUSINESS' | 'MARKETING' | 'INTERNET' | 'CREATIVE' | 'PERSONAL';
  requiredAgents: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  requiresApproval: boolean;
  actionSequence: Array<{
    step: number;
    agent: string;
    action: string;
    target?: string;
    params?: Record<string, any>;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'waiting_approval';
    output?: string;
  }>;
  confidenceScore: number;
  explanation: string;
}

export interface AlmaAgentStepExecution {
  step: number;
  agent: string;
  action: string;
  output: string;
  data?: Record<string, any>;
}

// In-memory / Firestore synced default smart devices
let smartDevicesCache: any[] = [
  {
    id: 'dev_light_living',
    name: 'Luz Central da Sala',
    room: 'sala',
    type: 'light',
    protocol: 'matter',
    state: { power: true, brightness: 80, color: '#38BDF8' },
    capabilities: ['power', 'dimming', 'color'],
    online: true,
    lastUpdated: nowIso()
  },
  {
    id: 'dev_tv_living',
    name: 'Smart TV 75" Sala',
    room: 'sala',
    type: 'tv',
    protocol: 'wifi',
    state: { power: false, volume: 22, channel: 'Netflix / YouTube' },
    capabilities: ['power', 'volume', 'apps', 'input'],
    online: true,
    lastUpdated: nowIso()
  },
  {
    id: 'dev_ac_living',
    name: 'Ar Condicionado Sala',
    room: 'sala',
    type: 'ac',
    protocol: 'matter',
    state: { power: true, temperature: 22 },
    capabilities: ['power', 'temperature', 'mode'],
    online: true,
    lastUpdated: nowIso()
  },
  {
    id: 'dev_curtain_living',
    name: 'Cortina Blackout Sala',
    room: 'sala',
    type: 'curtain',
    protocol: 'zigbee',
    state: { power: true, position: 0 },
    capabilities: ['position', 'open', 'close'],
    online: true,
    lastUpdated: nowIso()
  },
  {
    id: 'dev_light_bedroom',
    name: 'Luz Noturna Quarto',
    room: 'quarto',
    type: 'light',
    protocol: 'matter',
    state: { power: false, brightness: 30, color: '#F59E0B' },
    capabilities: ['power', 'dimming', 'color'],
    online: true,
    lastUpdated: nowIso()
  },
  {
    id: 'dev_ac_bedroom',
    name: 'Ar Condicionado Quarto',
    room: 'quarto',
    type: 'ac',
    protocol: 'matter',
    state: { power: false, temperature: 24 },
    capabilities: ['power', 'temperature'],
    online: true,
    lastUpdated: nowIso()
  },
  {
    id: 'dev_lock_front',
    name: 'Fechadura Biométrica Entrada',
    room: 'externo',
    type: 'lock',
    protocol: 'matter',
    state: { power: true, isLocked: true },
    capabilities: ['lock', 'unlock', 'battery_status'],
    online: true,
    lastUpdated: nowIso()
  }
];

export async function parseAlmaIntent(prompt: string, contextData?: Record<string, any>): Promise<AlmaIntentResult> {
  const ai = textAiClient();

  const systemInstruction = `Você é o ALMA INTENT ENGINE, o cérebro interpretador do ALMA X (O Regente Digital).
Sua missão é traduzir a linguagem natural do usuário em uma intenção estruturada de altíssima precisão.

O ecossistema ALMA X possui os seguintes 17 Agentes Nativos:
1. RESEARCH (Pesquisa aprofundada na web, fatos, inteligência competitiva)
2. STRATEGY (Tomada de decisão estratégica, planejamento executivo)
3. BUSINESS (Modelos de negócio, precificação, unit economics, concorrência)
4. MARKETING (Branding, posicionamento, campanhas, funis de conversão)
5. SOCIAL (Gestão de redes sociais, calendários, engajamento)
6. ARCHITECT (Design de interiores, espacial, layout, reformas, paletas)
7. CREATIVE (Criação de textos, roteiros, slogans, visual concepts)
8. CODE (Engenharia de software, scripts, arquitetura, automações)
9. DATA (Planilhas, métricas, indicadores, projeções, CSV/JSON)
10. FINANCE (Orçamento, finanças pessoais/empresariais, ROI)
11. PROJECT (Metas, cronogramas, workflows em etapas)
12. PRODUCTIVITY (Tarefas, rotinas, lembretes, foco)
13. WEB (Navegação web, leitura de URLs, serviços digitais)
14. HOME (Automação residencial, luzes, clima, TV, cortinas, segurança, cenas)
15. MAPS (Rotas, trânsito, mobilidade, estabelecimentos)
16. VISION (Análise visual de fotos/câmera, OCR, inspeção de ambientes)
17. MEDIA (Geração de imagens, scripts de vídeo, áudio, áudio-visual)

Classifique o risco:
- low: Leitura de dados, consultas, respostas informativas, pesquisa.
- medium: Alteração de estado em casa (luzes/clima), criação de rascunhos, agendamentos.
- high: Publicação em redes sociais, alteração de configurações críticas, disparos em massa.
- critical: Transações financeiras, exclusão de dados permanentes, abertura de fechaduras externas.

Determine sempre a sequência ordenada de agentes e ações para cumprir a meta do usuário.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.7-flash',
    contents: `Analise a seguinte intenção do usuário: "${prompt}"\nContexto adicional: ${JSON.stringify(contextData || {})}`,
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          category: {
            type: Type.STRING,
            description: 'Categoria principal: CONTROL_HOME, EXECUTE_MARKETING, RESEARCH_WEB, STRATEGY_DECISION, BUSINESS_CONSULTING, CREATIVE_PRODUCTION, CODE_DEVELOPMENT, DATA_ANALYTICS, FINANCIAL_PLAN, PROJECT_MANAGEMENT, PRODUCTIVITY_REMINDER, MAPS_MOBILITY, VISION_INSPECTION, SOCIAL_PUBLISHING, MEDIA_CREATION, GENERAL_CONVERSATION'
          },
          goal: {
            type: Type.STRING,
            description: 'Objetivo claro e sintetizado a ser alcançado'
          },
          targetDomain: {
            type: Type.STRING,
            description: 'HOME, BUSINESS, MARKETING, INTERNET, CREATIVE ou PERSONAL'
          },
          requiredAgents: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Lista de nomes de agentes nativos necessários'
          },
          riskLevel: {
            type: Type.STRING,
            description: 'low, medium, high ou critical'
          },
          requiresApproval: {
            type: Type.BOOLEAN,
            description: 'Se requer confirmação explícita do usuário antes de executar'
          },
          confidenceScore: {
            type: Type.NUMBER,
            description: 'Confiança de 0 a 1'
          },
          explanation: {
            type: Type.STRING,
            description: 'Explicação concisa do regente sobre como o objetivo será executado'
          },
          actionSequence: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                step: { type: Type.INTEGER },
                agent: { type: Type.STRING },
                action: { type: Type.STRING },
                target: { type: Type.STRING },
                output: { type: Type.STRING, description: 'Resultado prévio ou esperado da etapa' }
              },
              required: ['step', 'agent', 'action']
            }
          }
        },
        required: ['category', 'goal', 'targetDomain', 'requiredAgents', 'riskLevel', 'requiresApproval', 'confidenceScore', 'explanation', 'actionSequence']
      }
    }
  });

  const parsed = JSON.parse(response.text || '{}');

  return {
    rawPrompt: prompt,
    category: parsed.category || 'GENERAL_CONVERSATION',
    goal: parsed.goal || prompt,
    targetDomain: parsed.targetDomain || 'PERSONAL',
    requiredAgents: parsed.requiredAgents || ['STRATEGY'],
    riskLevel: parsed.riskLevel || 'low',
    requiresApproval: Boolean(parsed.requiresApproval),
    actionSequence: (parsed.actionSequence || []).map((s: any, idx: number) => ({
      step: s.step || idx + 1,
      agent: s.agent || 'STRATEGY',
      action: s.action || 'Executar etapa',
      target: s.target || '',
      status: 'pending',
      output: s.output || ''
    })),
    confidenceScore: parsed.confidenceScore || 0.95,
    explanation: parsed.explanation || 'Compreendido. Orquestrando recursos necessários.'
  };
}

export async function executeAlmaOrchestration(
  intent: AlmaIntentResult,
  userId: string,
  extraContext?: Record<string, any>
): Promise<{
  planId: string;
  summary: string;
  stepsExecuted: AlmaAgentStepExecution[];
  devicesUpdated?: any[];
  agentOutputs: Record<string, any>;
}> {
  const ai = textAiClient();
  const planId = newId('plan');
  const stepsExecuted: AlmaAgentStepExecution[] = [];
  const agentOutputs: Record<string, any> = {};
  let devicesUpdated: any[] = [];

  // Se a intenção for controle de casa, realizar mutação dos dispositivos
  if (intent.category === 'CONTROL_HOME' || intent.targetDomain === 'HOME') {
    const promptLower = intent.rawPrompt.toLowerCase();
    
    // Tratamento de cenários
    if (promptLower.includes('dormir') || promptLower.includes('sono') || promptLower.includes('boa noite')) {
      smartDevicesCache = smartDevicesCache.map(d => {
        if (d.room === 'sala') return { ...d, state: { ...d.state, power: false }, lastUpdated: nowIso() };
        if (d.id === 'dev_light_bedroom') return { ...d, state: { ...d.state, power: true, brightness: 15, color: '#F59E0B' }, lastUpdated: nowIso() };
        if (d.id === 'dev_ac_bedroom') return { ...d, state: { ...d.state, power: true, temperature: 23 }, lastUpdated: nowIso() };
        if (d.id === 'dev_lock_front') return { ...d, state: { ...d.state, isLocked: true }, lastUpdated: nowIso() };
        return d;
      });
      devicesUpdated = smartDevicesCache;
    } else if (promptLower.includes('filme') || promptLower.includes('cinema')) {
      smartDevicesCache = smartDevicesCache.map(d => {
        if (d.room === 'sala' && d.type === 'light') return { ...d, state: { ...d.state, power: true, brightness: 10, color: '#6366F1' }, lastUpdated: nowIso() };
        if (d.room === 'sala' && d.type === 'tv') return { ...d, state: { ...d.state, power: true, volume: 28 }, lastUpdated: nowIso() };
        if (d.room === 'sala' && d.type === 'curtain') return { ...d, state: { ...d.state, position: 0 }, lastUpdated: nowIso() };
        if (d.room === 'sala' && d.type === 'ac') return { ...d, state: { ...d.state, power: true, temperature: 21 }, lastUpdated: nowIso() };
        return d;
      });
      devicesUpdated = smartDevicesCache;
    } else if (promptLower.includes('apague') || promptLower.includes('desligar') || promptLower.includes('apagar tudo')) {
      smartDevicesCache = smartDevicesCache.map(d => ({
        ...d,
        state: { ...d.state, power: false },
        lastUpdated: nowIso()
      }));
      devicesUpdated = smartDevicesCache;
    } else if (promptLower.includes('acender') || promptLower.includes('ligar')) {
      smartDevicesCache = smartDevicesCache.map(d => ({
        ...d,
        state: { ...d.state, power: true, brightness: 100 },
        lastUpdated: nowIso()
      }));
      devicesUpdated = smartDevicesCache;
    }
  }

  // Executar raciocínio do regente multi-agente
  const orchestrationPrompt = `Você é o ALMA X (O Regente Digital).
Você está orquestrando a execução do seguinte objetivo:
Objetivo: "${intent.goal}"
Categoria: ${intent.category}
Agentes mobilizados: ${intent.requiredAgents.join(', ')}
Dispositivos conectados: ${JSON.stringify(smartDevicesCache.map(d => ({ id: d.id, name: d.name, room: d.room, state: d.state })))}
Contexto do Usuário: ${JSON.stringify(extraContext || {})}

Execute cada etapa dos agentes em sequência, sintetize o plano de ação, elabore as entregas técnicas de cada agente e apresente uma resposta executiva impecável com postura de Regente Digital.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.7-flash',
    contents: orchestrationPrompt,
    config: {
      systemInstruction: 'Você é o ALMA X — O Regente Digital. Seja perspicaz, sofisticado, preciso e orientado a resultados reais.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING, description: 'Mensagem executiva do Regente para o usuário' },
          steps: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                step: { type: Type.INTEGER },
                agent: { type: Type.STRING },
                action: { type: Type.STRING },
                output: { type: Type.STRING }
              },
              required: ['step', 'agent', 'action', 'output']
            }
          },
          proactiveAdvice: { type: Type.STRING, description: 'Conselho proativo ou próximo passo recomendado' }
        },
        required: ['summary', 'steps']
      }
    }
  });

  const parsedExec = JSON.parse(response.text || '{}');

  (parsedExec.steps || []).forEach((s: any) => {
    stepsExecuted.push({
      step: s.step,
      agent: s.agent,
      action: s.action,
      output: s.output
    });
    agentOutputs[s.agent] = s.output;
  });

  return {
    planId,
    summary: parsedExec.summary || 'Execução concluída pelo Regente Digital.',
    stepsExecuted,
    devicesUpdated,
    agentOutputs
  };
}

export function getSmartDevicesList(): any[] {
  return smartDevicesCache;
}

export function updateSmartDeviceState(deviceId: string, newState: Record<string, any>): any {
  const devIndex = smartDevicesCache.findIndex(d => d.id === deviceId);
  if (devIndex >= 0) {
    smartDevicesCache[devIndex] = {
      ...smartDevicesCache[devIndex],
      state: {
        ...smartDevicesCache[devIndex].state,
        ...newState
      },
      lastUpdated: nowIso()
    };
    return smartDevicesCache[devIndex];
  }
  throw new Error(`Dispositivo ${deviceId} não encontrado.`);
}
