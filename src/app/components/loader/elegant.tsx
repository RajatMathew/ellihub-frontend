import { useEffect, useState } from 'react';

export function ModuleLoader({ complete = false }: { complete?: boolean }) {
  const [progress, setProgress] = useState(0);

  // Initial burst → 40% in 0.5s
  useEffect(() => {
    if (complete) return;

    const start = Date.now();
    const burstDuration = 500; // 0.5s

    const burst = setInterval(() => {
      const elapsed = Date.now() - start;
      const percentage = Math.min((elapsed / burstDuration) * 40, 40);
      setProgress(percentage);

      if (percentage >= 40) {
        clearInterval(burst);
      }
    }, 16);

    return () => clearInterval(burst);
  }, [complete]);

  // Continue slow progress → up to 80%
  useEffect(() => {
    if (complete) return;
    if (progress < 40) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev < 65) return prev + 2; // medium speed
        if (prev < 75) return prev + 1; // slower
        if (prev < 80) return prev + 0.5; // crawl
        return 80; // stick
      });
    }, 200);

    return () => clearInterval(interval);
  }, [progress, complete]);

  // Finish smoothly when complete = true
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
    <div className="flex items-center justify-center w-full h-full min-h-[calc(100vh-var(--header-height))] bg-background">
      <div className="w-85">
        <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-linear-to-r from-accent via-primary to-secondary transition-all duration-150 ease-out"
            style={{ width: `${progress}%` }}
          />
          <div className="text-foreground">
            <p>Loading Module</p>
          </div>
        </div>
      </div>
    </div>
  );
}
