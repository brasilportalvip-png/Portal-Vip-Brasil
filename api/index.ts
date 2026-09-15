import '@google-cloud/firestore';
import '@google-cloud/storage';
import app from '../server/app.js';

// O ciclo diário processa vários projetos e integrações de IA. A função precisa
// de uma janela compatível com o orçamento controlado do scheduler.
export const config = {
  maxDuration: 300
};

export default app;
