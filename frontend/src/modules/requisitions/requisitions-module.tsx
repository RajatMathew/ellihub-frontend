/**
 * Route entry for the Requisitions module.
 * The actual shell lives in ./module — this file only exists because the
 * lazy() import in routes.tsx points at this path. Keep it a re-export so
 * routing stays stable while the module surface evolves.
 */
export { default } from './module';
