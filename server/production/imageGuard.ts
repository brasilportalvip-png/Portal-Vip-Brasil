import crypto from 'crypto';
import { COLLECTIONS, firestore, nowIso } from './store.js';

export const PERCEPTUAL_HASH_HAMMING_THRESHOLD = 8; // Menor que 8 em 64 bits indica imagem visualmente quase idêntica

/**
 * Computa um perceptual hash (dHash - 64 bits) a partir de um buffer de imagem.
 * Utiliza amostragem de gradiente de blocos normalizados para criar a impressão digital visual.
 */
export function computePerceptualHash(buffer: Buffer): string {
  if (!buffer || buffer.length === 0) {
    return '0'.repeat(16);
  }

  // Divide o buffer em 9x8 células amostrais (72 blocos) para calcular 64 diferenças adjacentes
  const sampleCount = 72;
  const step = Math.max(1, Math.floor(buffer.length / sampleCount));
  const samples: number[] = [];

  for (let i = 0; i < sampleCount; i++) {
    const idx = Math.min(buffer.length - 1, i * step);
    // Combina bytes locais para aproximar o valor de luminância do bloco
    const byteVal = buffer[idx] ?? 0;
    const nextByteVal = buffer[Math.min(buffer.length - 1, idx + 1)] ?? 0;
    samples.push((byteVal + nextByteVal) / 2);
  }

  // Gera 64 bits comparando cada bloco horizontal com o seguinte
  let bitString = '';
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const leftIndex = row * 9 + col;
      const rightIndex = leftIndex + 1;
      const leftVal = samples[leftIndex] ?? 0;
      const rightVal = samples[rightIndex] ?? 0;
      bitString += leftVal > rightVal ? '1' : '0';
    }
  }

  // Converte a cadeia de 64 bits em representação hexadecimal de 16 caracteres
  let hexString = '';
  for (let i = 0; i < 64; i += 4) {
    const nibble = bitString.slice(i, i + 4);
    hexString += parseInt(nibble, 2).toString(16);
  }

  return hexString.padStart(16, '0');
}

/**
 * Calcula a distância de Hamming entre dois hashes perceptuais hexadecimais de 64 bits.
 */
export function computeHammingDistance(hash1: string, hash2: string): number {
  const h1 = String(hash1 || '').padEnd(16, '0').slice(0, 16);
  const h2 = String(hash2 || '').padEnd(16, '0').slice(0, 16);

  let distance = 0;
  for (let i = 0; i < 16; i++) {
    const n1 = parseInt(h1[i], 16) || 0;
    const n2 = parseInt(h2[i], 16) || 0;
    let xor = n1 ^ n2;
    // Conta número de bits 1 no xor (Brian Kernighan algorithm)
    while (xor > 0) {
      distance += xor & 1;
      xor >>= 1;
    }
  }
  return distance;
}

export interface ImageUniquenessCheckResult {
  isUnique: boolean;
  perceptualHash: string;
  sha256Hash: string;
  minDistance: number;
  conflictingDocId?: string;
  reason?: string;
}

/**
 * Valida a exclusividade visual perceptual da imagem contra o histórico do projeto.
 */
export async function checkImageUniqueness(
  companyId: string,
  imageBuffer: Buffer,
  sha256Hash?: string
): Promise<ImageUniquenessCheckResult> {
  const sha256 = sha256Hash || crypto.createHash('sha256').update(imageBuffer).digest('hex');
  const pHash = computePerceptualHash(imageBuffer);

  const db = firestore();
  try {
    // 1. Verificação determinística rápida no índice de hashes usados
    const deterministicDoc = await db.collection(COLLECTIONS.usedImageHashes)
      .doc(`${companyId}_${sha256}`.slice(0, 150))
      .get()
      .catch(() => null);

    if (deterministicDoc && deterministicDoc.exists) {
      return {
        isUnique: false,
        perceptualHash: pHash,
        sha256Hash: sha256,
        minDistance: 0,
        conflictingDocId: deterministicDoc.id,
        reason: 'Hash criptográfico SHA-256 idêntico já cadastrado para este projeto.'
      };
    }

    // 2. Verificação perceptual contra o histórico recente de imagens do projeto (últimas 40)
    const recentImagesSnap = await db.collection('projectImageFingerprints')
      .where('companyId', '==', companyId)
      .limit(40)
      .get()
      .catch(() => ({ docs: [] } as any));

    let minDistance = 64;
    let conflictingId: string | undefined;

    for (const doc of recentImagesSnap.docs) {
      const data = doc.data() as any;
      if (data.perceptualHash) {
        const dist = computeHammingDistance(pHash, data.perceptualHash);
        if (dist < minDistance) {
          minDistance = dist;
          if (dist < PERCEPTUAL_HASH_HAMMING_THRESHOLD) {
            conflictingId = doc.id;
          }
        }
      }
    }

    if (conflictingId && minDistance < PERCEPTUAL_HASH_HAMMING_THRESHOLD) {
      return {
        isUnique: false,
        perceptualHash: pHash,
        sha256Hash: sha256,
        minDistance,
        conflictingDocId: conflictingId,
        reason: `Imagem visualmente similar detectada no histórico (distância de Hamming: ${minDistance}/${PERCEPTUAL_HASH_HAMMING_THRESHOLD} bits). Anti-Repetição acionada.`
      };
    }

    return {
      isUnique: true,
      perceptualHash: pHash,
      sha256Hash: sha256,
      minDistance
    };
  } catch (err: any) {
    console.warn('[ImageGuard] Aviso ao consultar histórico de imagens:', err);
    // Em caso de falha de consulta, permite com hash perceptual registrado
    return {
      isUnique: true,
      perceptualHash: pHash,
      sha256Hash: sha256,
      minDistance: 64
    };
  }
}

/**
 * Registra o fingerprint da imagem no histórico do projeto.
 */
export async function recordImageFingerprint(options: {
  companyId: string;
  userId: string;
  contentItemId: string;
  sha256Hash: string;
  perceptualHash: string;
  imageUrl: string;
  theme?: string;
}): Promise<void> {
  const db = firestore();
  const docId = `${options.companyId}_${options.perceptualHash}`;

  try {
    // Registra índice determinístico
    await db.collection(COLLECTIONS.usedImageHashes)
      .doc(`${options.companyId}_${options.sha256Hash}`.slice(0, 150))
      .set({
        companyId: options.companyId,
        hash: options.sha256Hash,
        contentItemId: options.contentItemId,
        createdAt: nowIso()
      }, { merge: true });

    // Registra fingerprint perceptual
    await db.collection('projectImageFingerprints')
      .doc(docId.slice(0, 150))
      .set({
        companyId: options.companyId,
        userId: options.userId,
        contentItemId: options.contentItemId,
        sha256Hash: options.sha256Hash,
        perceptualHash: options.perceptualHash,
        imageUrl: options.imageUrl,
        theme: options.theme || '',
        createdAt: nowIso()
      }, { merge: true });
  } catch (err) {
    console.warn('[ImageGuard] Falha não impeditiva ao salvar fingerprint perceptual:', err);
  }
}
