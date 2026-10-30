import { COLLECTIONS, firestore, nowIso } from './store.js';
import { getPortalProjectFromDb, updatePortalProjectInDb } from './almaPortfolio.js';

export interface MasterAutomationControl {
  globalEnabled: boolean;
  costGuardEnabled: boolean;
  mode: 'automatic' | 'manual_approval';
  maxDailyVideos: number;
  maxDailyImages: number;
  maxDailyArticles: number;
  monthlyBudgetCapUsd: number;
  monthlyBudgetCapBrl: number;
  requireManualApproval: boolean;
  pauseAllExternalApis: boolean;
  projectToggles: Record<string, boolean>;
  lastPausedAt?: string | null;
  lastResumedAt?: string | null;
  updatedAt: string;
  updatedBy?: string;
}

import { preflightReserveBudget } from './financialGuardian.js';

export const FIXED_EXCHANGE_RATE_BRL_PER_USD = 5.50;

/**
 * Configuração padrão para quando o documento não existe no banco.
 * O padrão para configuração ausente é estritamente DESLIGADO (fail-closed, Zero Custos).
 */
export const DEFAULT_MASTER_AUTOMATION: MasterAutomationControl = {
  globalEnabled: false,
  costGuardEnabled: true,
  mode: 'automatic',
  maxDailyVideos: 1,
  maxDailyImages: 6,
  maxDailyArticles: 8,
  monthlyBudgetCapUsd: 27.27, // ~ R$ 150,00
  monthlyBudgetCapBrl: 150.00,
  requireManualApproval: false,
  pauseAllExternalApis: true,
  projectToggles: {},
  lastPausedAt: null,
  lastResumedAt: null,
  updatedAt: new Date().toISOString()
};

/**
 * Consulta a chave mestre de automação com política estrita FAIL-CLOSED.
 * 1. O documento global ('master_control_global') é a autoridade máxima.
 * 2. Se o documento global estiver ausente, ilegível ou inválido, a automação permanece desligada (Zero Custos).
 * 3. O Master OFF global PREVALECE sobre qualquer documento individual de usuário ou projeto.
 * 4. Um documento de usuário ausente, desatualizado ou com enabled=true NUNCA ignora o Master OFF global.
 */
export async function getMasterAutomationControl(userId?: string): Promise<MasterAutomationControl> {
  const db = firestore();

  let globalData: Partial<MasterAutomationControl> | null = null;
  try {
    const globalSnap = await db.collection(COLLECTIONS.systemSettings).doc('master_control_global').get();
    if (globalSnap && globalSnap.exists) {
      globalData = globalSnap.data() as Partial<MasterAutomationControl>;
    } else {
      // Documento global ausente: Fail-Closed imediato (Zero Custos)
      return {
        ...DEFAULT_MASTER_AUTOMATION,
        globalEnabled: false,
        pauseAllExternalApis: true,
        updatedAt: nowIso()
      };
    }
  } catch (err: any) {
    console.error('[AutomationGate] FAIL-CLOSED ativado: Falha ao ler documento global no Firestore, bloqueando automações por segurança:', err);
    return {
      ...DEFAULT_MASTER_AUTOMATION,
      globalEnabled: false,
      pauseAllExternalApis: true,
      updatedAt: nowIso()
    };
  }

  // Se o documento global estiver explicitamente desligado ou pausado:
  const isGlobalStrictlyEnabled = Boolean(globalData && globalData.globalEnabled === true && globalData.pauseAllExternalApis !== true);
  if (!isGlobalStrictlyEnabled) {
    // Configuração global OFF PREVALECE sobre qualquer usuário ou projeto!
    const capBrl = typeof globalData?.monthlyBudgetCapBrl === 'number'
      ? globalData.monthlyBudgetCapBrl
      : (typeof globalData?.monthlyBudgetCapUsd === 'number' ? globalData.monthlyBudgetCapUsd * FIXED_EXCHANGE_RATE_BRL_PER_USD : 150);
    const capUsd = typeof globalData?.monthlyBudgetCapUsd === 'number'
      ? globalData.monthlyBudgetCapUsd
      : capBrl / FIXED_EXCHANGE_RATE_BRL_PER_USD;

    return {
      ...DEFAULT_MASTER_AUTOMATION,
      ...(globalData || {}),
      monthlyBudgetCapBrl: capBrl,
      monthlyBudgetCapUsd: capUsd,
      globalEnabled: false,
      pauseAllExternalApis: true,
      updatedAt: globalData?.updatedAt || nowIso()
    };
  }

  // 2. Se a chave global está LIGADA e um userId foi fornecido, verifica se o usuário pausou individualmente
  let userData: Partial<MasterAutomationControl> | null = null;
  if (userId) {
    try {
      const userSnap = await db.collection(COLLECTIONS.systemSettings).doc(`master_control_${userId}`).get();
      if (userSnap && userSnap.exists) {
        userData = userSnap.data() as Partial<MasterAutomationControl>;
      }
    } catch (err) {
      console.warn(`[AutomationGate] Falha ao ler configuração individual do usuário ${userId}, aplicando estado seguro:`, err);
    }
  }

  // Se o usuário desligou individualmente, respeita a pausa.
  const userGlobalEnabled = userData ? (userData.globalEnabled !== false && userData.pauseAllExternalApis !== true) : true;
  const effectiveGlobalEnabled = isGlobalStrictlyEnabled && userGlobalEnabled;

  const mergedData = {
    ...globalData,
    ...(userData || {})
  };

  const capBrl = typeof mergedData.monthlyBudgetCapBrl === 'number'
    ? mergedData.monthlyBudgetCapBrl
    : (typeof mergedData.monthlyBudgetCapUsd === 'number' ? mergedData.monthlyBudgetCapUsd * FIXED_EXCHANGE_RATE_BRL_PER_USD : 150);
  const capUsd = typeof mergedData.monthlyBudgetCapUsd === 'number'
    ? mergedData.monthlyBudgetCapUsd
    : capBrl / FIXED_EXCHANGE_RATE_BRL_PER_USD;

  return {
    ...DEFAULT_MASTER_AUTOMATION,
    ...mergedData,
    monthlyBudgetCapBrl: capBrl,
    monthlyBudgetCapUsd: capUsd,
    globalEnabled: effectiveGlobalEnabled,
    pauseAllExternalApis: !effectiveGlobalEnabled
  };
}

/**
 * Verifica se a automação global está ligada.
 * Fail-Closed: se houver qualquer erro na leitura ou configuração ausente, retorna false.
 */
export async function isGlobalAutomationEnabled(userId?: string): Promise<boolean> {
  try {
    const control = await getMasterAutomationControl(userId);
    return Boolean(control.globalEnabled && !control.pauseAllExternalApis);
  } catch {
    return false;
  }
}

/**
 * Verifica se a automação está autorizada para um projeto específico.
 * Depende da chave global E do switch individual do projeto.
 * Fail-Closed: em caso de erro, retorna false.
 */
export async function isProjectAutomationEnabled(projectId: string, userId?: string): Promise<boolean> {
  if (!projectId) return false;

  const globalOn = await isGlobalAutomationEnabled(userId);
  if (!globalOn) return false;

  try {
    const control = await getMasterAutomationControl(userId);
    // Switch explícito no controle mestre
    if (control.projectToggles && control.projectToggles[projectId] === false) {
      return false;
    }

    // Consulta estado ativo do projeto
    const project = await getPortalProjectFromDb(projectId);
    if (!project || project.active === false) {
      return false;
    }

    return true;
  } catch (err) {
    console.error(`[AutomationGate] FAIL-CLOSED ativado para o projeto ${projectId}:`, err);
    return false;
  }
}

/**
 * Lança exceção se a automação estiver desligada para a operação / projeto.
 * Garante reserva atômica pré-voo de orçamento para operações com custo.
 */
export async function assertAutomationAllowed(options?: {
  projectId?: string;
  userId?: string;
  operationType?: 'article' | 'image' | 'video' | 'agent_chat' | string;
}): Promise<void> {
  const globalOn = await isGlobalAutomationEnabled(options?.userId);
  if (!globalOn) {
    const error: any = new Error(
      `Automação bloqueada pelo Botão Mestre central (Zero Custos). Nenhuma operação paga ou geração automática permitida enquanto o motor estiver pausado.`
    );
    error.statusCode = 423; // Locked
    error.code = 'GLOBAL_AUTOMATION_LOCKED';
    throw error;
  }

  if (options?.projectId) {
    const projectOn = await isProjectAutomationEnabled(options.projectId, options?.userId);
    if (!projectOn) {
      const error: any = new Error(
        `Automação bloqueada para o projeto "${options.projectId}". As rotinas de blog, marketing e geração multimídia deste projeto estão pausadas individualmente.`
      );
      error.statusCode = 423; // Locked
      error.code = 'PROJECT_AUTOMATION_LOCKED';
      throw error;
    }
  }

  // Reserva orçamentária atômica antes de chamadas pagas
  if (options?.operationType && ['article', 'image', 'video', 'agent_chat'].includes(options.operationType)) {
    const budgetRes = await preflightReserveBudget({
      userId: options?.userId || 'portal_vip_system',
      operation: options.operationType as any,
      companyId: options?.projectId
    });
    if (!budgetRes.allowed) {
      const error: any = new Error(
        budgetRes.reason || 'Orçamento mensal de automação esgotado. Operação paga bloqueada para proteção de custos.'
      );
      error.statusCode = 423;
      error.code = 'BUDGET_CAP_EXCEEDED';
      throw error;
    }
  }
}

/**
 * Atualiza o controle mestre e replica para as chaves necessárias.
 */
export async function updateMasterAutomationControl(
  userIdOrPatch?: string | Partial<MasterAutomationControl>,
  maybePatch?: Partial<MasterAutomationControl>
): Promise<MasterAutomationControl> {
  const userId = typeof userIdOrPatch === 'string' ? userIdOrPatch : 'admin_system';
  const patch: Partial<MasterAutomationControl> = typeof userIdOrPatch === 'object' && userIdOrPatch !== null
    ? userIdOrPatch
    : (maybePatch || {});
  const db = firestore();
  const current = await getMasterAutomationControl(userId);
  const now = nowIso();

  let capBrl = current.monthlyBudgetCapBrl;
  let capUsd = current.monthlyBudgetCapUsd;

  if (patch.monthlyBudgetCapBrl !== undefined) {
    capBrl = Math.max(10, Math.min(5000, Number(patch.monthlyBudgetCapBrl) || 150));
    capUsd = capBrl / FIXED_EXCHANGE_RATE_BRL_PER_USD;
  } else if (patch.monthlyBudgetCapUsd !== undefined) {
    capUsd = Math.max(2, Math.min(1000, Number(patch.monthlyBudgetCapUsd) || 27.27));
    capBrl = capUsd * FIXED_EXCHANGE_RATE_BRL_PER_USD;
  }

  const updated: MasterAutomationControl = {
    ...current,
    ...patch,
    monthlyBudgetCapBrl: Math.round(capBrl * 100) / 100,
    monthlyBudgetCapUsd: Math.round(capUsd * 100) / 100,
    projectToggles: {
      ...(current.projectToggles || {}),
      ...(patch.projectToggles || {})
    },
    updatedAt: now,
    updatedBy: userId
  };

  if (patch.globalEnabled !== undefined) {
    if (patch.globalEnabled === false) {
      updated.lastPausedAt = now;
      updated.pauseAllExternalApis = true;
    } else {
      updated.lastResumedAt = now;
      updated.pauseAllExternalApis = false;
    }
  }

  const userDocId = `master_control_${userId}`;
  await db.collection(COLLECTIONS.systemSettings).doc(userDocId).set(updated, { merge: true });
  await db.collection(COLLECTIONS.systemSettings).doc('master_control_global').set(updated, { merge: true });

  return updated;
}

/**
 * Alterna a automação de um projeto individual e sincroniza com a entidade do projeto.
 * Retorna contrato estrito com campo `enabled` esperado pelo frontend.
 */
export async function toggleProjectAutomation(
  userId: string,
  projectId: string,
  enabled: boolean
): Promise<{
  success: boolean;
  enabled: boolean;
  projectId: string;
  project: { id: string; enabled: boolean; active: boolean; dailyBlogEnabled: boolean; dailyMarketingEnabled: boolean };
  control: MasterAutomationControl;
  message: string;
}> {
  if (!projectId) {
    const error: any = new Error('projectId é obrigatório.');
    error.statusCode = 400;
    throw error;
  }

  // 1. Atualiza registro no master control
  const updatedControl = await updateMasterAutomationControl(userId, {
    projectToggles: {
      [projectId]: enabled
    }
  });

  // 2. Sincroniza flags no documento do projeto para garantir que blog e marketing respeitem a pausa
  await updatePortalProjectInDb(projectId, {
    active: enabled,
    dailyBlogEnabled: enabled,
    dailyMarketingEnabled: enabled
  }).catch((err) => {
    console.warn(`[AutomationGate] Aviso ao atualizar projeto ${projectId} no Firestore:`, err);
  });

  return {
    success: true,
    enabled,
    projectId,
    project: {
      id: projectId,
      enabled,
      active: enabled,
      dailyBlogEnabled: enabled,
      dailyMarketingEnabled: enabled
    },
    control: updatedControl,
    message: `Projeto ${projectId} ${enabled ? 'ativado com sucesso' : 'pausado com segurança'} na automação geral (Blog, Marketing e Autopilot pausados).`
  };
}
