import { useEffect, useState } from 'react';

export function AppLoadingScreen({ complete = false }: { complete?: boolean }) {
  const [progress, setProgress] = useState(0);

  // Phase 1: Initial burst (0 → 40 in 0.5s)
  useEffect(() => {
    if (complete) return;

    const start = Date.now();
    const duration = 500;

    const burst = setInterval(() => {
      const elapsed = Date.now() - start;
      const percent = Math.min((elapsed / duration) * 40, 40);
      setProgress(percent);

      if (percent >= 40) clearInterval(burst);
    }, 16);

    return () => clearInterval(burst);
  }, [complete]);

  // Phase 2: Slow simulated progress (40 → 80)
  useEffect(() => {
    if (complete) return;
    if (progress < 40) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev < 65) return prev + 2;
        if (prev < 75) return prev + 1;
        if (prev < 80) return prev + 0.5;
        return 80;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [progress, complete]);

  // Phase 3: Finish when complete = true (→ 100)
  useEffect(() => {
    if (!complete) return;

    const finish = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(finish);
          return 100;
        }
        return prev + 5;
      });
    }, 30);

    return () => clearInterval(finish);
  }, [complete]);

  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center">
      {/* Card */}
      <div className="w-105 p-8 rounded-2xl bg-slate-900 shadow-2xl border border-slate-800">
        {/* Logo / Title */}
        <div className="flex flex-col items-center mb-6">
          <h1 className="mt-4 text-xl font-semibold text-white tracking-wide">ElliHub Finance</h1>
          <p className="text-sm text-slate-400 mt-1">
            {progress < 80 ? 'Initializing application...' : 'Finalizing setup...'}
          </p>
        </div>

        {/* Progress Section */}
        <div className="space-y-2">
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-linear-to-r from-accent via-primary to-secondary transition-all duration-200 ease-out relative"
              style={{ width: `${progress}%` }}
            >
              {/* Shimmer Effect */}
              <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
            </div>
          </div>

          <div className="flex justify-between text-xs text-slate-400">
            <span>Loading...</span>
            <span>{Math.floor(progress)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
