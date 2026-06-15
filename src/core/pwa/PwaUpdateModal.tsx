// import { usePwaUpdater } from './usePwaUpdater';

// export function PwaUpdateModal() {
//   const { needRefresh, updating, progress, updateApp, close } = usePwaUpdater();

//   if (!needRefresh) return null;

//   return (
//     <div className="fixed bottom-6 right-6 z-99999 w-[calc(100%-2rem)] max-w-md">
//       <div className="rounded-xl border border-gray-200 bg-white shadow-lg">
//         <div className="flex items-start gap-4 border-b border-gray-100 p-5">
//           <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
//             <span className="text-xl font-semibold">↻</span>
//           </div>

//           <div className="min-w-0 flex-1">
//             <h3 className="text-base font-semibold text-gray-900">System Update Available</h3>

//             <p className="mt-1 text-sm text-gray-600">
//               A newer version of ElliHub is ready to install.
//             </p>
//           </div>

//           {!updating && (
//             <button
//               type="button"
//               onClick={close}
//               className="rounded-md p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
//               aria-label="Close update popup"
//             >
//               ✕
//             </button>
//           )}
//         </div>

//         <div className="p-5">
//           {updating ? (
//             <div>
//               <div className="mb-2 flex items-center justify-between text-sm">
//                 <span className="font-medium text-gray-700">
//                   {progress === 100 ? 'Restarting application...' : 'Installing update...'}
//                 </span>

//                 <span className="font-semibold text-gray-900">{progress}%</span>
//               </div>

//               <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
//                 <div
//                   className="h-full rounded-full bg-primary transition-all duration-300"
//                   style={{ width: `${progress}%` }}
//                 />
//               </div>

//               <p className="mt-3 text-xs text-gray-500">
//                 Please keep this window open while the update finishes.
//               </p>
//             </div>
//           ) : (
//             <div className="flex items-center justify-end gap-3">
//               <button
//                 type="button"
//                 onClick={close}
//                 className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
//               >
//                 Remind me later
//               </button>

//               <button
//                 type="button"
//                 onClick={updateApp}
//                 className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"
//               >
//                 Update now
//               </button>
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }

import { Button } from '@/app/components/ui/button';

import { usePwaUpdater } from './usePwaUpdater';

export function PwaUpdateModal() {
  const { needRefresh, updating, progress, updateApp, close } = usePwaUpdater();

  if (!needRefresh) return null;

  if (updating) {
    return (
      <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-2xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
            <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-primary border-t-transparent" />
          </div>

          <h2 className="mt-6 text-lg font-semibold text-gray-900">Updating ElliHub</h2>

          <p className="mt-2 text-xs leading-5 text-gray-600">
            Installing the latest version. Please keep this window open while we restart the
            application.
          </p>

          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
              <span>{progress === 100 ? 'Restarting app...' : 'Preparing update...'}</span>

              <span className="font-semibold text-gray-900">{progress}%</span>
            </div>

            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-5 left-5 z-[99999] w-[calc(100%-2rem)] max-w-xs">
      <div className="origin-bottom-left animate-[pwaPopupBottom_0.38s_cubic-bezier(0.22,1,0.36,1)] rounded-xl border border-gray-200 bg-white shadow-2xl">
        <div className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold tracking-tight text-gray-900">
                Update Available
              </h3>

              <p className="mt-1 text-xs leading-5 text-gray-600">
                A newer version of ElliHub is ready to install.
              </p>

              <div className="mt-3 flex items-center gap-2">
                <Button type="button" onClick={close} variant="outline" size="xs">
                  Later
                </Button>

                <Button type="button" variant="primary" onClick={updateApp} size="xs">
                  Update now
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
