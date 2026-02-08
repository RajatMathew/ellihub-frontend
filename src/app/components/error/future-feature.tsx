export default function FutureFeature() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950">
      <div className="w-full max-w-xl rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm px-10 py-14 text-center">
        {/* Badge */}
        <div className="mb-6">
          <span className="inline-flex items-center px-3 py-1 text-xs font-medium tracking-wide uppercase rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            Upcoming Feature
          </span>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 mb-4">
          Coming Soon
        </h1>

        {/* Description */}
        <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-10">
          This feature is currently under development and will be introduced in
          a future release to enhance operational efficiency.
        </p>

        {/* Footer */}
        <div className="flex items-center justify-center gap-6">
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Access will be enabled automatically
          </div>
        </div>
      </div>
    </div>
  );
}
