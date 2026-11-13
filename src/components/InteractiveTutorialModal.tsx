import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Compass, Dices, Shield, Sparkles, Trophy, X } from 'lucide-react';

interface InteractiveTutorialModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const STEPS = [
  {
    icon: Compass,
    title: 'Jelajahi Papan Fantasi 3D',
    body: 'Seret dengan jari atau mouse untuk memutar kamera di sekitar pulau suci. Gunakan cubitan dua jari atau scroll untuk memperbesar, lalu ketuk petak mana saja untuk melihat detail mantra dan jalurnya.',
    tip: 'Anda juga dapat memilih sudut pandang Isometrik, Ikuti Bidak, atau Atas dari bilah kontrol bawah.',
  },
  {
    icon: Dices,
    title: 'Lempar Dadu & Capai Petak 100',
    body: 'Tekan tombol Lempar Dadu, tekan tombol Spasi, atau ketuk langsung dadu 3D di atas altar batu untuk melempar. Jika angka dadu melebihi 100, bidak akan memantul mundur sesuai sisa langkah.',
    tip: 'Lemparan angka 6 memberi Anda kesempatan lempar tambahan!',
  },
  {
    icon: Sparkles,
    title: 'Tangga Suci & Ular Mistis',
    body: 'Mendarat di pangkal Tangga Emas akan mengangkat bidak Anda naik cepat ke petak lebih tinggi. Hati-hati terhadap kepala Ular Mistis yang siap meluncurkan Anda kembali ke bawah.',
    tip: 'Papan 3D menampilkan arah panah naik (↑) dan turun (↓) pada setiap petak portal.',
  },
  {
    icon: Shield,
    title: 'Kotak Khusus & Perisai Suci',
    body: 'Singgahi petak bercahaya: Angin Aether (+4 langkah), Dadu Berkah (lempar lagi), Perisai Suci (melindungi 1x dari gigitan ular atau kabut penyesat), dan hindari Kabut Penyesat (-3 langkah).',
    tip: 'Perisai yang aktif terlihat sebagai cincin cahaya biru yang mengorbit bidak 3D Anda.',
  },
  {
    icon: Trophy,
    title: 'Skor, AI Adaptif & Arena Daring',
    body: 'Kumpulkan skor dari setiap langkah, tangga, perisai, dan kecepatan menang. Bermainlah melawan AI Adaptif yang menyesuaikan kemampuan Anda, atau ajak teman di Multiplayer Lokal dan Ruang Daring.',
    tip: 'Progres Anda otomatis tersimpan lokal dan bisa disinkronkan ke awan kapan saja.',
  },
];

export const InteractiveTutorialModal: React.FC<InteractiveTutorialModalProps> = ({
  open,
  onClose,
  onComplete,
}) => {
  const [stepIndex, setStepIndex] = useState(0);

  if (!open) return null;

  const step = STEPS[stepIndex];
  const Icon = step.icon;
  const isLast = stepIndex === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-amber-500/35 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <span className="font-mono-num text-xs font-semibold text-amber-300">
            Panduan {stepIndex + 1} dari {STEPS.length}
          </span>
          <button
            type="button"
            onClick={() => {
              onComplete();
              onClose();
            }}
            aria-label="Tutup Tutorial"
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Icon className="w-6 h-6 text-amber-300" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-white">{step.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">{step.body}</p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 px-3.5 py-2.5 text-xs text-amber-200/90">
          Tips: {step.tip}
        </div>

        {/* Progress Bars */}
        <div className="mt-5 flex gap-1.5">
          {STEPS.map((_, idx) => (
            <button
              key={idx}
              type="button"
              aria-label={`Langkah ${idx + 1}`}
              onClick={() => setStepIndex(idx)}
              className={`h-1.5 flex-1 rounded-full transition-colors cursor-pointer ${
                idx <= stepIndex ? 'bg-amber-400' : 'bg-slate-700'
              }`}
            />
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={stepIndex === 0}
            onClick={() => setStepIndex((s) => Math.max(0, s - 1))}
            className="inline-flex items-center gap-1 min-h-[42px] px-4 rounded-xl border border-slate-700 bg-slate-800 text-xs font-semibold text-slate-200 hover:bg-slate-700 disabled:opacity-40 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            Sebelumnya
          </button>

          {isLast ? (
            <button
              type="button"
              onClick={() => {
                onComplete();
                onClose();
              }}
              className="inline-flex items-center gap-1 min-h-[42px] px-5 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-400 transition-colors cursor-pointer"
            >
              Mulai Bermain
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStepIndex((s) => Math.min(STEPS.length - 1, s + 1))}
              className="inline-flex items-center gap-1 min-h-[42px] px-5 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-400 transition-colors cursor-pointer"
            >
              Berikutnya
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
