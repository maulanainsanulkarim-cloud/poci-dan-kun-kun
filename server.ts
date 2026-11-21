import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '4mb' }));

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function generateWithRetry<T>(fn: () => Promise<T>, maxAttempts = 2): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      const isTransient =
        msg.includes('503') ||
        msg.includes('429') ||
        msg.includes('UNAVAILABLE') ||
        msg.includes('RESOURCE_EXHAUSTED');
      if (!isTransient || attempt === maxAttempts) {
        throw err;
      }
      await new Promise((r) => setTimeout(r, 650 * Math.pow(2, attempt - 1)));
    }
  }
  throw lastErr;
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'indis-studio-2d' });
});

app.post('/api/ai/director', async (req, res) => {
  try {
    const { instruction, episode } = req.body ?? {};
    if (!instruction || typeof instruction !== 'string' || !instruction.trim()) {
      res.status(400).json({ error: 'Instruksi untuk AI tidak boleh kosong.' });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error:
          'GEMINI_API_KEY belum terkonfigurasi di Settings > Secrets. Silakan atur kunci API agar Pengarah Adegan AI dapat memproses instruksi.',
      });
      return;
    }

    const episodeSummary = episode
      ? {
          title: episode.title,
          scenes: (episode.scenes || []).map((s: Record<string, unknown>, idx: number) => ({
            sceneNumber: idx + 1,
            title: s.title,
            backgroundId: s.backgroundId,
            weather: s.weather,
            lighting: s.lighting,
            transitionIn: s.transitionIn,
            popupText: (s.popup as Record<string, unknown> | undefined)?.text ?? '',
            cast: s.cast,
          })),
        }
      : {};

    const systemInstruction = `Kamu adalah Sutradara & Penata Animasi 2D untuk seri "Arsip Kelam Kelurahan Indis" (format video vertikal 9:16, 60 detik = 4 scene x 15 detik, index scene 0 sampai 3).
Tugasmu adalah menerjemahkan instruksi bebas dari kreator menjadi konfigurasi patch JSON terstruktur yang langsung mengubah visual animasi kanvas.

Nilai yang valid:
- backgroundId: "kantor_bocor" | "meja_lpj" | "ruang_server" | "kuburan_berkabut" | "gerbang_syuting" | "ruang_sidang_mkk" | "vila_puncak" | "jalan_berlubang" | "bukit_tambang" | "gudang_buzzer" | "istana_mewah" | "bilik_suara"
- weather: "none" | "rain" | "snow" | "petals" | "sparkles" | "ash"
- lighting: "normal" | "moonlight" | "dramatic_red" | "neon_dark" | "golden" | "storm"
- transitionIn: "cut" | "fade" | "flash_white" | "slide_left" | "zoom_whip"
- popupColor: "red" | "yellow" | "blue" | "green" | "stamp"
- cameraAction: "auto" | "zoom_speaker" | "wide" | "dramatic_shake" | "slow_pan"
- cast IDs: "poci" | "kunkun" | "gendu" | "tuyul" | "blorong" | "gustuyul" | "hakim" | "warga" | "host"

Hanya sertakan scene yang relevan dengan permintaan pengguna. Jika pengguna menyebut "scene 3", gunakan sceneIndex: 2 (karena 0-based).`;

    const response = await generateWithRetry(() =>
      ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Episode saat ini:\n${JSON.stringify(episodeSummary, null, 2)}\n\nInstruksi pengguna:\n"${instruction.trim()}"`,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: {
                type: Type.STRING,
                description: 'Ringkasan singkat perubahan yang diterapkan dalam Bahasa Indonesia.',
              },
              watermarkText: {
                type: Type.STRING,
                description: 'Opsional: ubah teks watermark pojok layar jika diminta.',
              },
              scenePatches: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    sceneIndex: {
                      type: Type.INTEGER,
                      description: 'Index scene 0..3 (Scene 1 = 0, Scene 2 = 1, Scene 3 = 2, Scene 4 = 3).',
                    },
                    weather: { type: Type.STRING },
                    lighting: { type: Type.STRING },
                    backgroundId: { type: Type.STRING },
                    transitionIn: { type: Type.STRING },
                    cameraAction: { type: Type.STRING },
                    cameraShakeIntensity: { type: Type.NUMBER },
                    popupText: { type: Type.STRING },
                    popupColor: { type: Type.STRING },
                    infoCardTitle: {
                      type: Type.STRING,
                      description: 'Judul kartu informasi pop-up jika diminta menampilkan kartu informasi.',
                    },
                    infoCardBody: {
                      type: Type.STRING,
                      description: 'Isi teks kartu informasi pop-up.',
                    },
                    arsipBoxText: {
                      type: Type.STRING,
                      description: 'Isi kotak ARSIP KELAM INDIS jika diminta.',
                    },
                    addCastIds: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: 'Karakter tambahan yang dimunculkan di scene ini.',
                    },
                    extraDialogueSpeaker: { type: Type.STRING },
                    extraDialogueText: { type: Type.STRING },
                  },
                  required: ['sceneIndex'],
                },
              },
            },
            required: ['summary', 'scenePatches'],
          },
        },
      })
    );

    const rawText = (response.text ?? '{}').trim();
    const parsed = JSON.parse(rawText);
    res.json({ ok: true, directive: parsed });
  } catch (err: unknown) {
    console.error('AI Director error:', err);
    const rawMsg = err instanceof Error ? err.message : 'Gagal menghubungi Gemini API.';
    const isOverloaded = rawMsg.includes('503') || rawMsg.includes('UNAVAILABLE');
    const isRateLimited = rawMsg.includes('429') || rawMsg.includes('RESOURCE_EXHAUSTED');
    const friendlyMsg = isOverloaded
      ? 'Server Gemini sedang padat sementara (503). Silakan klik "Terapkan Perintah AI" lagi dalam beberapa detik.'
      : isRateLimited
      ? 'Batas kuota permintaan Gemini tercapai (429). Tunggu sebentar atau periksa API key di Settings > Secrets.'
      : rawMsg;
    res.status(isOverloaded ? 503 : isRateLimited ? 429 : 500).json({ error: friendlyMsg });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Indis Studio 2D running at http://localhost:${PORT}`);
  });
}

startServer();
