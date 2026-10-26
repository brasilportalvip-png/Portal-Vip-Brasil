import { COLLECTIONS, firestore, nowIso, newId } from './store.js';
import { getMasterAutomationControl, FIXED_EXCHANGE_RATE_BRL_PER_USD } from './automationGate.js';
import { listAllPortalProjectsFromDb } from './almaPortfolio.js';

export const AI_COST_PRICING_VERSION = '2026.1';

export const AI_UNIT_COSTS_USD = {
  textFlashArticle: 0.0008, // Gemini 3.8 Flash (~3500 tokens)
  textFlashPrompt: 0.0002,  // Gemini 3.8 Flash (~500 tokens)
  imageGen: 0.030,          // Imagen 3 / Gemini 3.1 Flash Image
  videoGenVeo: 0.200        // Veo 3.1 (720p/1080p generation)
} as const;

export interface BudgetReservation {
  id: string;
  userId: string;
  companyId?: string;
  operation: 'article' | 'image' | 'video' | 'agent_chat';
  estimatedCostUsd: number;
  estimatedCostBrl: number;
  status: 'reserved' | 'committed' | 'released';
  actualCostUsd?: number;
  actualCostBrl?: number;
  tokensUsed?: number;
  createdAt: string;
  expiresAt: string;
  reconciledAt?: string;
}

export interface FinancialCostSummary {
  currentMonth: string;
  exchangeRateBrlPerUsd: number;
  pricingVersion: string;
  // Métricas financeiras unificadas
  monthlyBudgetCapBrl: number;
  monthlyBudgetCapUsd: number;
  confirmedCostBrl: number;
  confirmedCostUsd: number;
  reservedCostBrl: number;
  reservedCostUsd: number;
  totalCostBrl: number;
  totalCostUsd: number;
  remainingBudgetBrl: number;
  remainingBudgetUsd: number;
  budgetUsedPercent: number;
  costGuardActive: boolean;
  masterStatus: 'ACTIVE' | 'PAUSED';

  // Campos esperados pelo frontend AutopilotPage.tsx
  estimatedDailyCostBrl: number;
  estimatedMonthlyCostBrl: number;
  todayVideoCount: number;
  todayImageCount: number;
  todayArticleCount: number;
  activeProjectsCount: number;
  totalProjectsCount: number;
  breakdown: {
    videosBrl: number;
    imagesBrl: number;
    articlesBrl: number;
  };
}

/**
 * Realiza pré-reserva atômica de cota antes de qualquer operação paga.
 * Se a cota mensal estiver no teto, rejeita com Fail-Closed.
 */
export async function preflightReserveBudget(options: {
  userId: string;
  operation: 'article' | 'image' | 'video' | 'agent_chat';
  companyId?: string;
}): Promise<{
  allowed: boolean;
  reservationId: string;
  estimatedCostUsd: number;
  estimatedCostBrl: number;
  remainingBudgetBrl: number;
  reason?: string;
}> {
  const db = firestore();
  const reservationId = newId('res_cost');
  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7);
  const nowIsoStr = now.toISOString();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutos

  let estimatedCostUsd: number = AI_UNIT_COSTS_USD.textFlashPrompt;
  if (options.operation === 'article') estimatedCostUsd = AI_UNIT_COSTS_USD.textFlashArticle;
  if (options.operation === 'image') estimatedCostUsd = AI_UNIT_COSTS_USD.imageGen;
  if (options.operation === 'video') estimatedCostUsd = AI_UNIT_COSTS_USD.videoGenVeo;

  const estimatedCostBrl = Math.round(estimatedCostUsd * FIXED_EXCHANGE_RATE_BRL_PER_USD * 1000) / 1000;

  try {
    const master = await getMasterAutomationControl(options.userId);
    if (!master.globalEnabled) {
      return {
        allowed: false,
        reservationId: '',
        estimatedCostUsd,
        estimatedCostBrl,
        remainingBudgetBrl: 0,
        reason: 'Botão Mestre Desligado: nenhuma operação paga autorizada (Zero Custos).'
      };
    }

    const budgetCapUsd = master.monthlyBudgetCapUsd || 27.27;
    const budgetCapBrl = master.monthlyBudgetCapBrl || (budgetCapUsd * FIXED_EXCHANGE_RATE_BRL_PER_USD);

    // Consulta gastos acumulados do mês no Firestore
    const ledgerDocRef = db.collection(COLLECTIONS.systemSettings).doc(`monthly_ledger_${options.userId}_${currentMonth}`);
    const resDocRef = db.collection('budgetReservations').doc(reservationId);

    const result = await db.runTransaction(async (tx) => {
      const ledgerSnap = await tx.get(ledgerDocRef);
      const ledgerData = ledgerSnap.exists ? ledgerSnap.data() as any : null;

      const confirmedUsd = Number(ledgerData?.confirmedCostUsd || 0);
      const reservedUsd = Number(ledgerData?.reservedCostUsd || 0);
      const projectedTotalUsd = confirmedUsd + reservedUsd + estimatedCostUsd;

      if (projectedTotalUsd > budgetCapUsd) {
        return {
          allowed: false,
          remainingBudgetBrl: Math.max(0, (budgetCapUsd - (confirmedUsd + reservedUsd)) * FIXED_EXCHANGE_RATE_BRL_PER_USD),
          reason: `Teto financeiro mensal atingido: Limite R$ ${budgetCapBrl.toFixed(2)} (US$ ${budgetCapUsd.toFixed(2)}). Gasto atual + reservas: US$ ${(confirmedUsd + reservedUsd).toFixed(3)}.`
        };
      }

      // Atualiza o ledger atômico com a reserva
      tx.set(ledgerDocRef, {
        userId: options.userId,
        currentMonth,
        confirmedCostUsd: confirmedUsd,
        reservedCostUsd: Math.round((reservedUsd + estimatedCostUsd) * 10000) / 10000,
        updatedAt: nowIsoStr
      }, { merge: true });

      // Salva documento da reserva
      const reservation: BudgetReservation = {
        id: reservationId,
        userId: options.userId,
        companyId: options.companyId,
        operation: options.operation,
        estimatedCostUsd,
        estimatedCostBrl,
        status: 'reserved',
        createdAt: nowIsoStr,
        expiresAt
      };
      tx.set(resDocRef, reservation);

      return {
        allowed: true,
        remainingBudgetBrl: Math.max(0, (budgetCapUsd - projectedTotalUsd) * FIXED_EXCHANGE_RATE_BRL_PER_USD)
      };
    });

    return {
      allowed: result.allowed,
      reservationId,
      estimatedCostUsd,
      estimatedCostBrl,
      remainingBudgetBrl: result.remainingBudgetBrl,
      reason: result.reason
    };
  } catch (err: any) {
    console.error('[FinancialGuardian] Falha ao verificar/gravar cota no Firestore. FAIL-CLOSED ativado:', err);
    // FAIL-CLOSED: Qualquer erro de banco bloqueia a operação para impedir cobranças não monitoradas
    return {
      allowed: false,
      reservationId: '',
      estimatedCostUsd,
      estimatedCostBrl,
      remainingBudgetBrl: 0,
      reason: 'Falha de comunicação com o Guardião Financeiro. Operação bloqueada por segurança (Fail-Closed).'
    };
  }
}

/**
 * Reconcilia a reserva atômica com o custo real medido após a chamada ao provedor.
 */
export async function reconcileBudgetReservation(options: {
  reservationId: string;
  userId: string;
  success: boolean;
  actualTokens?: number;
  actualCostUsd?: number;
}): Promise<void> {
  if (!options.reservationId) return;
  const db = firestore();
  const currentMonth = new Date().toISOString().slice(0, 7);
  const ledgerDocRef = db.collection(COLLECTIONS.systemSettings).doc(`monthly_ledger_${options.userId}_${currentMonth}`);
  const resDocRef = db.collection('budgetReservations').doc(options.reservationId);

  try {
    await db.runTransaction(async (tx) => {
      const resSnap = await tx.get(resDocRef);
      if (!resSnap.exists) return;
      const resData = resSnap.data() as BudgetReservation;
      if (resData.status !== 'reserved') return;

      const estimatedUsd = resData.estimatedCostUsd;
      let realCostUsd = options.success
        ? (options.actualCostUsd !== undefined ? options.actualCostUsd : estimatedUsd)
        : 0;

      const ledgerSnap = await tx.get(ledgerDocRef);
      const ledgerData = ledgerSnap.exists ? ledgerSnap.data() as any : null;

      const currentConfirmed = Number(ledgerData?.confirmedCostUsd || 0);
      const currentReserved = Number(ledgerData?.reservedCostUsd || 0);

      const nextConfirmed = Math.round((currentConfirmed + realCostUsd) * 10000) / 10000;
      const nextReserved = Math.max(0, Math.round((currentReserved - estimatedUsd) * 10000) / 10000);

      tx.set(ledgerDocRef, {
        confirmedCostUsd: nextConfirmed,
        reservedCostUsd: nextReserved,
        confirmedCostBrl: Math.round(nextConfirmed * FIXED_EXCHANGE_RATE_BRL_PER_USD * 100) / 100,
        updatedAt: nowIso()
      }, { merge: true });

      tx.set(resDocRef, {
        status: options.success ? 'committed' : 'released',
        actualCostUsd: realCostUsd,
        actualCostBrl: Math.round(realCostUsd * FIXED_EXCHANGE_RATE_BRL_PER_USD * 1000) / 1000,
        tokensUsed: options.actualTokens || 0,
        reconciledAt: nowIso()
      }, { merge: true });
    });
  } catch (err) {
    console.warn('[FinancialGuardian] Aviso na reconciliação de reserva:', err);
  }
}

/**
 * Calcula o resumo financeiro auditável do usuário para exibição no painel.
 */
export async function calculateFinancialCostSummary(userId: string): Promise<FinancialCostSummary> {
  const db = firestore();
  const currentMonth = new Date().toISOString().slice(0, 7);
  const todayStr = new Date().toISOString().slice(0, 10);

  const master = await getMasterAutomationControl(userId);
  const capBrl = master.monthlyBudgetCapBrl || 150.00;
  const capUsd = master.monthlyBudgetCapUsd || (capBrl / FIXED_EXCHANGE_RATE_BRL_PER_USD);

  let todayVideoCount = 0;
  let todayImageCount = 0;
  let todayArticleCount = 0;

  let monthVideoCount = 0;
  let monthImageCount = 0;
  let monthArticleCount = 0;

  let confirmedCostUsd = 0;
  let reservedCostUsd = 0;

  try {
    const ledgerSnap = await db.collection(COLLECTIONS.systemSettings).doc(`monthly_ledger_${userId}_${currentMonth}`).get();
    if (ledgerSnap.exists) {
      const ld = ledgerSnap.data() as any;
      confirmedCostUsd = Number(ld?.confirmedCostUsd || 0);
      reservedCostUsd = Number(ld?.reservedCostUsd || 0);
    }

    // Consulta contagens reais de itens gerados
    const [aiSnap, videoSnap, blogSnap] = await Promise.all([
      db.collection(COLLECTIONS.aiExecutions).where('userId', '==', userId).limit(300).get().catch(() => ({ docs: [] } as any)),
      db.collection(COLLECTIONS.mediaGenerationJobs).where('userId', '==', userId).limit(100).get().catch(() => ({ docs: [] } as any)),
      db.collection(COLLECTIONS.blogArticles).limit(200).get().catch(() => ({ docs: [] } as any))
    ]);

    for (const doc of aiSnap.docs) {
      const d = doc.data();
      const ts = String(d.timestamp || d.createdAt || '');
      if (ts.startsWith(currentMonth)) {
        if (d.type?.includes('image')) {
          monthImageCount++;
          if (ts.startsWith(todayStr)) todayImageCount++;
        }
      }
    }

    for (const doc of videoSnap.docs) {
      const d = doc.data();
      const ts = String(d.createdAt || '');
      if (ts.startsWith(currentMonth) && d.status !== 'failed') {
        monthVideoCount++;
        if (ts.startsWith(todayStr)) todayVideoCount++;
      }
    }

    for (const doc of blogSnap.docs) {
      const d = doc.data();
      const ts = String(d.publishedAt || d.createdAt || '');
      if (ts.startsWith(currentMonth)) {
        monthArticleCount++;
        if (ts.startsWith(todayStr)) todayArticleCount++;
      }
    }
  } catch (err) {
    console.warn('[FinancialGuardian] Telemetria de contagem parcial:', err);
  }

  // Se o ledger ainda estiver vazio, calcula pelos contadores reais
  if (confirmedCostUsd === 0) {
    confirmedCostUsd = (monthVideoCount * AI_UNIT_COSTS_USD.videoGenVeo) +
      (monthImageCount * AI_UNIT_COSTS_USD.imageGen) +
      (monthArticleCount * AI_UNIT_COSTS_USD.textFlashArticle);
  }

  const confirmedCostBrl = Math.round(confirmedCostUsd * FIXED_EXCHANGE_RATE_BRL_PER_USD * 100) / 100;
  const reservedCostBrl = Math.round(reservedCostUsd * FIXED_EXCHANGE_RATE_BRL_PER_USD * 100) / 100;
  const totalCostUsd = Math.round((confirmedCostUsd + reservedCostUsd) * 1000) / 1000;
  const totalCostBrl = Math.round((confirmedCostBrl + reservedCostBrl) * 100) / 100;

  const remainingBudgetBrl = Math.max(0, Math.round((capBrl - totalCostBrl) * 100) / 100);
  const remainingBudgetUsd = Math.max(0, Math.round((capUsd - totalCostUsd) * 100) / 100);
  const budgetUsedPercent = Math.min(100, Math.round((totalCostBrl / capBrl) * 100));

  // Custos diários estimados
  const todayVideosBrl = todayVideoCount * AI_UNIT_COSTS_USD.videoGenVeo * FIXED_EXCHANGE_RATE_BRL_PER_USD;
  const todayImagesBrl = todayImageCount * AI_UNIT_COSTS_USD.imageGen * FIXED_EXCHANGE_RATE_BRL_PER_USD;
  const todayArticlesBrl = todayArticleCount * AI_UNIT_COSTS_USD.textFlashArticle * FIXED_EXCHANGE_RATE_BRL_PER_USD;
  const estimatedDailyCostBrl = Math.round((todayVideosBrl + todayImagesBrl + todayArticlesBrl) * 100) / 100;

  // Breakdown mensal
  const videosBrl = Math.round(monthVideoCount * AI_UNIT_COSTS_USD.videoGenVeo * FIXED_EXCHANGE_RATE_BRL_PER_USD * 100) / 100;
  const imagesBrl = Math.round(monthImageCount * AI_UNIT_COSTS_USD.imageGen * FIXED_EXCHANGE_RATE_BRL_PER_USD * 100) / 100;
  const articlesBrl = Math.round(monthArticleCount * AI_UNIT_COSTS_USD.textFlashArticle * FIXED_EXCHANGE_RATE_BRL_PER_USD * 100) / 100;

  const allProjects = await listAllPortalProjectsFromDb().catch(() => []);
  const activeProjectsCount = allProjects.filter((p: any) => {
    if (p.active === false) return false;
    if (master.projectToggles && master.projectToggles[p.id] === false) return false;
    return true;
  }).length;

  return {
    currentMonth,
    exchangeRateBrlPerUsd: FIXED_EXCHANGE_RATE_BRL_PER_USD,
    pricingVersion: AI_COST_PRICING_VERSION,
    monthlyBudgetCapBrl: capBrl,
    monthlyBudgetCapUsd: capUsd,
    confirmedCostBrl,
    confirmedCostUsd,
    reservedCostBrl,
    reservedCostUsd,
    totalCostBrl,
    totalCostUsd,
    remainingBudgetBrl,
    remainingBudgetUsd,
    budgetUsedPercent,
    costGuardActive: master.costGuardEnabled !== false,
    masterStatus: master.globalEnabled ? 'ACTIVE' : 'PAUSED',
    estimatedDailyCostBrl,
    estimatedMonthlyCostBrl: totalCostBrl,
    todayVideoCount,
    todayImageCount,
    todayArticleCount,
    activeProjectsCount,
    totalProjectsCount: allProjects.length,
    breakdown: {
      videosBrl,
      imagesBrl,
      articlesBrl
    }
  };
}
