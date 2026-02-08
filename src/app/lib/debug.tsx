import React from 'react';

const safeStringify = (value: unknown) => {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

export function DebugViteConfig() {
  const viteEnv = import.meta.env;

  const config = {
    // Vite core
    MODE: viteEnv.MODE,
    DEV: viteEnv.DEV,
    PROD: viteEnv.PROD,
    BASE_URL: viteEnv.BASE_URL,

    // All exposed env vars (VITE_*)
    ENV_VARS: Object.keys(viteEnv)
      .filter((key) => key.startsWith('VITE_'))
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = viteEnv[key as keyof ImportMetaEnv];
        return acc;
      }, {}),

    // Browser / runtime info
    RUNTIME: {
      userAgent: navigator.userAgent,
      language: navigator.language,
      online: navigator.onLine,
      cookieEnabled: navigator.cookieEnabled,
    },

    // Window info
    WINDOW: {
      location: {
        href: window.location.href,
        origin: window.location.origin,
        pathname: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash,
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio,
      },
    },

    // React info
    REACT: {
      version: React.version,
      strictMode:
        (window as unknown as Record<string, unknown>).__REACT_DEVTOOLS_GLOBAL_HOOK__ === false
          ? 'enabled'
          : 'unknown',
    },
  };

  return (
    <div className="container-fluid py-7.5">
      <div className="p-4 font-mono bg-red-100 text-gray-900 rounded-lg text-sm overflow-auto">
        <h2 className="mb-3 text-red-400 text-lg font-semibold">Runtime Debug Info</h2>
        <pre>{safeStringify(config)}</pre>
      </div>
    </div>
  );
}
