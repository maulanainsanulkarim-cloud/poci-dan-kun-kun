import React, { useState } from 'react';
import { Loader2, RotateCcw, Send, Sparkles } from 'lucide-react';
import { AIDirectiveResponse, EpisodeConfig } from '../types/studio';

interface AIDirectorPanelProps {
  episode: EpisodeConfig;
  onApplyDirective: (directive: AIDirectiveResponse) => void;
  onResetEpisodeToPreset: () => void;
}

const QUICK_INSTRUCTIONS = [
  'Tambahkan hujan deras di scene 3 dengan pencahayaan badai',
  'Tampilkan kartu informasi pop-up di scene 2 tentang anggaran gaib',
  'Ubah pencahayaan scene 4 jadi merah dramatis dan tambah guncangan kamera',
  'Tambahkan Nyi Blorong-X sebagai cameo di scene 2 dengan kilau emas',
];

export const AIDirectorPanel: React.FC<AIDirectorPanelProps> = ({
  episode,
  onApplyDirective,
  onResetEpisodeToPreset,
}) => {
  const [instruction, setInstruction] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);

  const submitInstruction = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || isLoading) return;

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/ai/director', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instruction: trimmed,
          episode,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal memproses instruksi AI.');
      }
      if (data.directive) {
        onApplyDirective(data.directive as AIDirectiveResponse);
        setHistory((prev) => [data.directive.summary || trimmed, ...prev].slice(0, 8));
        setInstruction('');
      }
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Terjadi kesalahan saat menghubungi server AI.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="font-display text-xs font-bold text-zinc-200 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-amber-500" />
          Keterangan Tambahan / Perintah Lanjutan untuk AI
        </h3>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Tulis instruksi sutradara mendadak per episode. Terhubung langsung ke Gemini API di backend untuk memodifikasi cuaca, pencahayaan, kartu informasi pop-up, kamera, atau cameo karakter secara instan.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submitInstruction(instruction);
        }}
        className="space-y-2.5"
      >
        <textarea
          rows={4}
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder='Contoh: "Tambahkan hujan deras di scene 3" atau "Tampilkan kartu informasi pop-up di scene 2"'
          className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-amber-500 leading-relaxed"
        />

        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onResetEpisodeToPreset}
            className="px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 text-xs text-zinc-300 flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Episode
          </button>

          <button
            type="submit"
            disabled={isLoading || !instruction.trim()}
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            {isLoading ? 'Mengarahkan Adegan...' : 'Terapkan Perintah AI'}
          </button>
        </div>
      </form>

      {errorMsg && (
        <div className="p-3 rounded-lg border border-red-500/40 bg-red-950/30 text-xs text-red-200 leading-relaxed">
          {errorMsg}
        </div>
      )}

      {/* Quick Instruction Suggestions */}
      <div className="space-y-2 pt-2 border-t border-zinc-800">
        <span className="text-[11px] font-semibold text-zinc-400">
          Contoh Perintah Cepat:
        </span>
        <div className="space-y-1.5">
          {QUICK_INSTRUCTIONS.map((preset) => (
            <button
              key={preset}
              type="button"
              disabled={isLoading}
              onClick={() => void submitInstruction(preset)}
              className="w-full text-left px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-950 hover:border-amber-500/40 hover:bg-zinc-900 text-xs text-zinc-300 transition-colors cursor-pointer"
            >
              “{preset}”
            </button>
          ))}
        </div>
      </div>

      {/* Applied Directives Log */}
      {history.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-zinc-800">
          <span className="text-[11px] font-semibold text-emerald-400">
            Perubahan AI Diterapkan:
          </span>
          <ul className="space-y-1.5">
            {history.map((item, idx) => (
              <li
                key={idx}
                className="p-2.5 rounded-lg border border-emerald-500/25 bg-emerald-950/15 text-xs text-emerald-100"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
