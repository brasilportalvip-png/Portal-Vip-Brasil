import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getBlogSettings,
  updateBlogSettings,
  listBlogArticles,
  INITIAL_SEEDED_ARTICLES,
  acquireDailyBlogClaim,
  rescueStuckDraftArticles
} from '../server/production/blogEngine.js';
import { verifyArticleQualityGate } from '../server/production/articleAuditor.js';
import { runSocialPublicationWorker } from '../server/production/socialPublicationWorker.js';
import { processSchedulerTick } from '../server/production/scheduler.js';
import {
  getMasterAutomationControl,
  updateMasterAutomationControl
} from '../server/production/autopilotMultimediaR8.js';
import { resetMemoryDb, firestore, COLLECTIONS, nowIso, stableId } from '../server/production/store.js';

test('1. BlogSettings auto-heals legacy approval mode to automatic without human queue', async () => {
  resetMemoryDb();
  const db = firestore();

  // Simula configuração legada no Firestore com mode: 'approval'
  await db.collection('blogSettings').doc('main').set({
    mode: 'approval',
    frequency: 'daily',
    autoPromoteDrafts: false,
    updatedAt: nowIso()
  });

  // Leitura deve auto-sanar para automatic
  const settings = await getBlogSettings();
  assert.equal(settings.mode, 'automatic', 'Modo deve ser convertido para automatic');
  assert.equal(settings.autoPromoteDrafts, true, 'autoPromoteDrafts deve ser true');

  // Verifica que o Firestore foi curado
  const persisted = (await db.collection('blogSettings').doc('main').get()).data() as any;
  assert.equal(persisted.mode, 'automatic', 'Banco deve ter sido curado para automatic');

  // Tentativa de update para approval deve ser interceptada
  const updated = await updateBlogSettings({ mode: 'approval' as any });
  assert.equal(updated.mode, 'automatic', 'updateBlogSettings não deve permitir modo manual/approval');
});

test('2. listBlogArticles é somente leitura; rascunhos válidos são promovidos apenas no ciclo diário', async () => {
  resetMemoryDb();
  const db = firestore();

  // Cria um artigo pending_approval no Firestore com dados editoriais ricos (>250 palavras)
  const pendingId = 'art_pending_test_01';
  await db.collection(COLLECTIONS.blogArticles).doc(pendingId).set({
    id: pendingId,
    title: 'Guia Editorial Completo de Autoestima e Amor Próprio para 2026',
    slug: 'guia-editorial-completo-de-autoestima-e-amor-proprio-2026',
    metaDescription: 'Descubra como fortalecer sua autoestima, amor próprio e inteligência emocional com práticas cotidianas e reflexões estruturadas para transformar suas relações.',
    introduction: 'Desenvolver uma autoestima saudável e cultivar o amor próprio é o pilar fundamental para qualquer relacionamento próspero e equilibrado. Quando uma pessoa compreende seu valor essencial, ela estabelece limites firmes e acolhedores, recusa relacionamentos desiguais e atrai companhias que verdadeiramente agregam valor e serenidade.',
    sections: [
      {
        h2: 'O Fundamento do Amor Próprio nas Relações Cotidianas',
        content: 'O amor próprio não é arrogância ou vaidade desmedida, mas sim o reconhecimento íntimo da própria dignidade humana. Ao praticar o autocuidado diário, dedicar momentos para a reflexão pessoal e honrar os próprios sentimentos, o indivíduo passa a emanar um magnetismo sereno e confiante.',
        h3s: [
          {
            h3: 'Práticas Diárias de Autovalorização',
            content: 'Comece as manhãs estabelecendo prioridades claras para o seu bem-estar físico e mental. Pratique afirmações conscientes e evite a autocrítica destrutiva que mina o entusiasmo vital ao longo dos dias.'
          },
          {
            h3: 'A Importância de Estabelecer Limites Saudáveis',
            content: 'Dizer não quando algo compromete a sua paz interior é um ato supremo de respeito pessoal. Estabelecer fronteiras claras protege a sua energia e constrói relacionamentos duradouros baseados no respeito mútuo.'
          }
        ]
      },
      {
        h2: 'Construindo Relacionamentos Recíprocos e Inspiradores',
        content: 'Relações equilibradas nascem do encontro de duas pessoas inteiras que escolhem caminhar juntas com lealdade, honestidade e reciprocidade profunda. Quando a base pessoal está consolidada, o afeto floresce com maturidade e alegria compartilhada sem medos irracionais de rejeição. É essencial cultivar diálogos transparentes, ouvir atentamente os anseios do parceiro e manter sempre a empatia ativa em cada decisão compartilhada ao longo da caminhada a dois.'
      }
    ],
    conclusion: 'A verdadeira jornada da transformação pessoal começa de dentro para fora. Cultive o carinho por si mesmo e colha relacionamentos cada vez mais dignos e inspiradores.',
    callToAction: 'Instale o aplicativo oficial na Google Play Store e acompanhe reflexões diárias para transformar sua rotina com equilíbrio e serenidade.',
    coverImage: 'https://images.unsplash.com/photo-1550525811-e5869dd03032?auto=format&fit=crop&w=1200&q=80',
    coverImageAlt: 'Rosas vermelhas expressando autoestima e equilíbrio emocional',
    relatedProjectId: 'proj_maria_padilha',
    primaryKeyword: 'autoestima e amor próprio',
    status: 'pending_approval',
    createdAt: nowIso(),
    updatedAt: nowIso()
  });

  // A listagem pública é SOMENTE LEITURA: não promove rascunhos nem grava no banco durante a visita
  const list = await listBlogArticles({ status: 'published', limit: 10, offset: 0 });
  assert.ok(list.articles.length > 0, 'O blog não pode ficar vazio');
  assert.equal(list.articles.some((a) => a.id === pendingId), false, 'Rascunho não pode aparecer no blog público');
  const untouched = await db.collection(COLLECTIONS.blogArticles).doc(pendingId).get();
  assert.equal(untouched.data()?.status, 'pending_approval', 'GET público não pode alterar o banco');

  // A promoção acontece no ciclo diário (rescueStuckDraftArticles), validada pelo Quality Gate
  const rescue = await rescueStuckDraftArticles();
  assert.ok(rescue.rescuedArticles.some((a) => a.id === pendingId), 'Rascunho válido deve ser promovido no ciclo diário');
  const freshDoc = await db.collection(COLLECTIONS.blogArticles).doc(pendingId).get();
  assert.equal(freshDoc.data()?.status, 'published');
  assert.ok(freshDoc.data()?.publishedAt);
});

test('3. listBlogArticles faz fallback para INITIAL_SEEDED_ARTICLES quando não há artigos publicados', async () => {
  resetMemoryDb();
  // Com o banco resetado (0 artigos publicados)
  const list = await listBlogArticles({ status: 'published', limit: 10, offset: 0 });
  assert.ok(list.articles.length >= 7, 'Deve conter os artigos padrão dos projetos oficiais');
  assert.equal(list.total >= 7, true);
  for (const art of list.articles) {
    assert.equal(art.status, 'published');
    assert.ok(art.slug);
    assert.ok(art.coverImage);
  }
});

test('4. Social Worker telemetria: distingue Master OFF vs ocioso (zero conteúdo) vs erro real', async () => {
  resetMemoryDb();

  // Cenário A: Master OFF
  await updateMasterAutomationControl({
    globalEnabled: false,
    pauseAllExternalApis: true
  });

  const masterOffResult = await runSocialPublicationWorker({ limit: 5 });
  assert.equal(masterOffResult.status, 'blocked_master_off');
  assert.equal(masterOffResult.executionMode, 'blocked_master_off');
  assert.equal(masterOffResult.reason, 'master_off');
  assert.equal(masterOffResult.attempted, 0);
  assert.equal(masterOffResult.published, 0);

  // Cenário B: Master ON, mas nenhuma publicação agendada
  await updateMasterAutomationControl({
    globalEnabled: true,
    pauseAllExternalApis: false
  });

  const idleResult = await runSocialPublicationWorker({ limit: 5 });
  assert.equal(idleResult.status, 'no_due_posts');
  assert.equal(idleResult.executionMode, 'idle_no_content');
  assert.equal(idleResult.reason, 'zero_content_scheduled');
  assert.equal(idleResult.attempted, 0);
  assert.equal(idleResult.published, 0);
});

test('5. Scheduler: quando Master está OFF, retorna blocked_master_off com custo ZERO', async () => {
  resetMemoryDb();

  await updateMasterAutomationControl({
    globalEnabled: false,
    pauseAllExternalApis: true
  });

  const result = await processSchedulerTick({ trigger: 'test_validation' });
  assert.equal(result.status, 'blocked_master_off');
  assert.equal(result.articlesAttempted, 0);
  assert.equal(result.postsAttempted, 0);
  assert.equal(result.socialWorkerResult?.status, 'blocked_master_off');
});

test('6. acquireDailyBlogClaim re-acquires claim if previous claim was completed but article was not published', async () => {
  resetMemoryDb();
  const db = firestore();
  const projectId = 'proj_magia_crencas';
  const cycleDate = '2026-08-25';
  const claimId = stableId(`portal-daily-blog:${projectId}:${cycleDate}`);

  // Simula um claim marcado como 'completed' mas sem nenhum artigo gravado ou publicado
  await db.collection(COLLECTIONS.idempotency).doc(claimId).set({
    id: claimId,
    kind: 'portal_daily_blog',
    projectId,
    date: cycleDate,
    status: 'completed',
    completedAt: nowIso(),
    updatedAt: nowIso()
  });

  // O acquireDailyBlogClaim deve detectar que o artigo não está publicado e permitir nova aquisição!
  const reacquiredRef = await acquireDailyBlogClaim(projectId, cycleDate);
  assert.ok(reacquiredRef, 'Deve permitir re-aquisição quando o artigo não existe publicado');

  // Agora simula o artigo gravado com status 'published'
  const deterministicArticleId = 'daily-blog-' + stableId(cycleDate + ':' + projectId).slice(0, 48);
  await db.collection(COLLECTIONS.blogArticles).doc(deterministicArticleId).set({
    id: deterministicArticleId,
    title: 'Artigo Oficial Publicado',
    status: 'published',
    publishedAt: nowIso()
  });
  await db.collection(COLLECTIONS.idempotency).doc(claimId).set({
    status: 'completed',
    articleId: deterministicArticleId,
    completedAt: nowIso()
  });

  // Agora que o artigo realmente está publicado, não deve re-adquirir
  const finalClaim = await acquireDailyBlogClaim(projectId, cycleDate);
  assert.equal(finalClaim, null, 'Com o artigo já publicado, deve retornar null e respeitar a idempotência');
});

test('7. rescueStuckDraftArticles não publica rascunho raso inflado com texto genérico', async () => {
  resetMemoryDb();
  const db = firestore();

  const stuckId = 'art_stuck_draft_99';
  await db.collection(COLLECTIONS.blogArticles).doc(stuckId).set({
    id: stuckId,
    title: 'Orações Diárias e Sabedoria Espiritual no Cotidiano',
    slug: 'oracoes-diarias-e-sabedoria-espiritual-no-cotidiano',
    metaDescription: 'Guia completo de orações diárias e práticas espirituais para harmonizar o lar, cultivar a fé e atrair prosperidade verdadeira em sua vida.',
    sections: [
      {
        h2: 'O Hábito Sagrado da Oração Diária',
        content: 'Dedicar os primeiros minutos do dia à oração e reflexão profunda estabelece uma sintonia imediata com a sabedoria superior. Esse momento de paz ancora a mente em pensamentos elevados e construtivos.',
        h3s: [
          {
            h3: 'Práticas de Gratidão Matinal',
            content: 'Agradecer pelas dádivas recebidas abre caminhos para bênçãos ainda mais abundantes em cada jornada.'
          }
        ]
      },
      {
        h2: 'Integrando a Fé com Ações Conscientes',
        content: 'A verdadeira espiritualidade se manifesta na conduta íntegra, na caridade genuína e na busca contínua por evolução moral no trabalho e na família. Cada atitude consciente reflete a luz das orações.'
      }
    ],
    conclusion: 'A prática regular da oração transforma a percepção da vida e traz serenidade inabalável.',
    callToAction: 'Conheça o aplicativo oficial do Magia das Crenças na Play Store e receba orações diárias no celular.',
    coverImage: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80',
    coverAlt: 'Luz dourada do amanhecer iluminando livro de orações',
    relatedProjectId: 'proj_magia_crencas',
    relatedProjectName: 'Magia das Crenças',
    primaryKeyword: 'orações diárias',
    status: 'draft',
    createdAt: nowIso(),
    updatedAt: nowIso()
  });

  const rescueResult = await rescueStuckDraftArticles();
  // Rascunho curto NÃO pode ser inflado com texto genérico para passar no gate (conteúdo raso/duplicado)
  assert.equal(rescueResult.rescuedArticles.some((a) => a.id === stuckId), false, 'Rascunho curto não pode ser publicado com enchimento');
  const verifiedDoc = await db.collection(COLLECTIONS.blogArticles).doc(stuckId).get();
  assert.equal(verifiedDoc.data()?.status, 'draft', 'Rascunho curto permanece como rascunho até reescrita real');
  const body = JSON.stringify(verifiedDoc.data());
  assert.equal(body.includes('Impacto Estratégico'), false, 'Nenhuma seção genérica pode ser injetada');
});

