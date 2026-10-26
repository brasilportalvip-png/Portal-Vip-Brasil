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

export const FIXED_EXCHANGE_RATE_BRL_PER_USD = 5.50;

export const DEFAULT_MASTER_AUTOMATION: MasterAutomationControl = {
  globalEnabled: true,
  costGuardEnabled: true,
  mode: 'automatic',
  maxDailyVideos: 1,
  maxDailyImages: 6,
  maxDailyArticles: 8,
  monthlyBudgetCapUsd: 27.27, // ~ R$ 150,00
  monthlyBudgetCapBrl: 150.00,
  requireManualApproval: false,
  pauseAllExternalApis: false,
  projectToggles: {},
  lastPausedAt: null,
  lastResumedAt: null,
  updatedAt: new Date().toISOString()
};

/**
 * Consulta a chave mestre de automação com política estrita FAIL-CLOSED.
 * Se a consulta ao banco falhar, o sistema assume globalEnabled = false (Zero Custos).
 */
export async function getMasterAutomationControl(userId?: string): Promise<MasterAutomationControl> {
  const db = firestore();
  const docId = userId ? `master_control_${userId}` : 'master_control_global';

  try {
    const snap = await db.collection(COLLECTIONS.systemSettings).doc(docId).get();
    if (snap.exists) {
      const data = snap.data() as Partial<MasterAutomationControl>;
      const capBrl = typeof data.monthlyBudgetCapBrl === 'number'
        ? data.monthlyBudgetCapBrl
        : (typeof data.monthlyBudgetCapUsd === 'number' ? data.monthlyBudgetCapUsd * FIXED_EXCHANGE_RATE_BRL_PER_USD : 150);
      const capUsd = typeof data.monthlyBudgetCapUsd === 'number'
        ? data.monthlyBudgetCapUsd
        : capBrl / FIXED_EXCHANGE_RATE_BRL_PER_USD;

      return {
        ...DEFAULT_MASTER_AUTOMATION,
        ...data,
        monthlyBudgetCapBrl: capBrl,
        monthlyBudgetCapUsd: capUsd,
        globalEnabled: Boolean(data.globalEnabled !== false)
      };
    }
  } catch (err: any) {
    console.error('[AutomationGate] FAIL-CLOSED ativado: Falha ao ler Firestore, bloqueando automações por segurança:', err);
    // FAIL-CLOSED: Se a configuração não puder ser consultada, bloqueia novas operações pagas!
    return {
      ...DEFAULT_MASTER_AUTOMATION,
      globalEnabled: false,
      pauseAllExternalApis: true,
      updatedAt: nowIso()
    };
  }

  return { ...DEFAULT_MASTER_AUTOMATION };
}

/**
 * Verifica se a automação global está ligada.
 * Fail-Closed: se houver qualquer erro na leitura, retorna false.
 */
export async function isGlobalAutomationEnabled(userId?: string): Promise<boolean> {
  try {
    const control = await getMasterAutomationControl(userId);
    if (!control.globalEnabled || control.pauseAllExternalApis) {
      return false;
    }
    return true;
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
 */
export async function assertAutomationAllowed(options?: {
  projectId?: string;
  userId?: string;
  operationType?: string;
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
}

/**
 * Atualiza o controle mestre e replica para as chaves necessárias.
 */
export async function updateMasterAutomationControl(
  userId: string,
  patch: Partial<MasterAutomationControl>
): Promise<MasterAutomationControl> {
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
