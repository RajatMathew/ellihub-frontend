import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import { NotFound } from "@app/components/error/not-found";

import { DebugViteConfig } from "@app/lib/debug";
import DelayForDemo from "@app/lib/delay";
import { lazy, Suspense } from "react";
import { ScreenLoader } from "@app/components/screen-loader";

const isDev = import.meta.env.DEV;

// ✅ Lazy with real suspense delay
const Files = lazy(() => DelayForDemo(import("@modules/files"), 6000));
const Demo = lazy(() => DelayForDemo(import("@app/pages/demo/page"), 0));
const FutureFeature = lazy(() =>
  DelayForDemo(import("@app/components/error/future-feature"), 0),
);

export function AppRoutingSetup() {
  const location = useLocation();
  return (
    <Suspense fallback={<ScreenLoader />} key={location.pathname}>
      <Routes>
        <Route index element={<Navigate to="projects" replace />} />
        <Route path="projects" element={<Demo />} />
        <Route path="hr/*" element={<FutureFeature />} />
        <Route path="files/*" element={<Files />} />
        <Route path="*" element={isDev ? <DebugViteConfig /> : <NotFound />} />
      </Routes>
    </Suspense>
  );
}
