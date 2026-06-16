/**
 * Local mock axios adapter. When DEV_AUTH_BYPASS is on, this replaces the
 * network layer so every /api/v1/* request is answered from local seed data
 * (see ./data.ts) instead of cofound's backend. Unmatched routes fall back to
 * a valid empty response so no screen ever errors out.
 *
 * Gated on import.meta.env.DEV via DEV_AUTH_BYPASS, so production builds keep
 * the real network adapter.
 */
import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

import * as db from './data';

type Handler = (m: RegExpMatchArray, config: InternalAxiosRequestConfig) => unknown;
type Route = { method: string; pattern: RegExp; handle: Handler };

const list = (rows: unknown[], config: InternalAxiosRequestConfig) => {
  const page = Number(config.params?.page ?? 1) || 1;
  const size = Number(config.params?.size ?? rows.length) || rows.length || 1;
  return { data: rows, pagination: db.makePagination(rows.length, page, size) };
};

const routes: Route[] = [
  // ---- projects
  { method: 'get', pattern: /^\/project\/stats/, handle: () => ({ data: db.projectStats }) },
  { method: 'get', pattern: /^\/project\/fieldwire\/projects/, handle: () => ({ data: [] }) },
  { method: 'get', pattern: /^\/project\/([^/]+)\/cost-codes/, handle: () => ({ data: db.costCodes }) },
  { method: 'get', pattern: /^\/project\/([^/]+)\/employee-options/, handle: () => ({ data: db.employees }) },
  { method: 'get', pattern: /^\/project\/([^/]+)\/invoice-aging/, handle: () => ({ data: {} }) },
  { method: 'get', pattern: /^\/project\/([^/]+)$/, handle: (m) => ({ data: db.buildProjectDetail(m[1]) }) },
  { method: 'get', pattern: /^\/project(\?|$)/, handle: (_m, c) => list(db.projects, c) },

  // ---- monthly bills
  { method: 'get', pattern: /^\/monthly-bills/, handle: () => ({ data: db.monthlyBills }) },

  // ---- vendors
  { method: 'get', pattern: /^\/vendor\/stats/, handle: () => ({ data: db.vendorStats }) },
  { method: 'get', pattern: /^\/vendor\/([^/]+)$/, handle: (m) => ({ data: db.buildVendorDetail(m[1]) }) },
  { method: 'get', pattern: /^\/vendor(\?|$)/, handle: (_m, c) => list(db.vendors, c) },

  // ---- contacts
  { method: 'get', pattern: /^\/contact\/stats/, handle: () => ({ data: db.contactStats }) },
  { method: 'get', pattern: /^\/contact\/([^/]+)$/, handle: (m) => ({ data: db.buildContactDetail(m[1]) }) },
  { method: 'get', pattern: /^\/contact(\?|$)/, handle: (_m, c) => list(db.contacts, c) },

  // ---- general contractors
  { method: 'get', pattern: /^\/gc\/stats/, handle: () => ({ data: db.gcStats }) },
  { method: 'get', pattern: /^\/gc\/([^/]+)$/, handle: (m) => ({ data: db.buildGcDetail(m[1]) }) },
  { method: 'get', pattern: /^\/gc(\?|$)/, handle: (_m, c) => list(db.generalContractors, c) },

  // ---- lookups
  { method: 'get', pattern: /^\/lookup\/type\/([^/?]+)/, handle: (m) => ({ data: db.lookupsByType[m[1]] ?? [] }) },
  { method: 'get', pattern: /^\/lookup(\?|$)/, handle: () => ({ data: Object.values(db.lookupsByType).flat() }) },

  // ---- cost codes
  { method: 'get', pattern: /^\/cost-code\/stats/, handle: () => ({ data: db.costCodeStats }) },
  { method: 'get', pattern: /^\/cost-code\/categories/, handle: () => ({ data: db.costCodeCategories }) },
  { method: 'get', pattern: /^\/cost-code\/([^/]+)$/, handle: (m) => ({ data: db.costCodes.find((c) => c.id === m[1]) ?? db.costCodes[0] }) },
  { method: 'get', pattern: /^\/cost-code(\?|$)/, handle: () => ({ data: db.costCodes, count: db.costCodes.length }) },

  // ---- HR
  { method: 'get', pattern: /^\/hr\/employee\/stats/, handle: () => ({ data: db.employeeStats }) },
  { method: 'get', pattern: /^\/hr\/employee\/([^/]+)\/projects/, handle: () => ({ data: [] }) },
  { method: 'get', pattern: /^\/hr\/employee\/([^/]+)$/, handle: (m) => ({ data: db.employees.find((e) => e.id === m[1]) ?? db.employees[0] }) },
  { method: 'get', pattern: /^\/hr\/employee(\?|$)/, handle: (_m, c) => list(db.employees, c) },
  { method: 'get', pattern: /^\/hr\/department\/stats/, handle: () => ({ data: db.departmentStats }) },
  { method: 'get', pattern: /^\/hr\/department\/([^/]+)$/, handle: (m) => {
      const d = db.departments.find((x) => x.id === m[1]) ?? db.departments[0];
      const emps = db.employees.filter((e) => e.departmentId === d.id).map((e) => ({ id: e.id, employeeId: e.id, name: e.name, fullName: e.name, email: e.email, role: e.role, employee: e }));
      return { data: { ...d, employees: emps } };
    } },
  { method: 'get', pattern: /^\/hr\/department(\?|$)/, handle: (_m, c) => list(db.departments, c) },
  { method: 'get', pattern: /^\/hr\/pto\/stats/, handle: () => ({ data: db.ptoStats }) },
  { method: 'get', pattern: /^\/hr\/pto\/([^/]+)$/, handle: (m) => ({ data: db.ptoRequests.find((p) => p.id === m[1]) ?? db.ptoRequests[0] }) },
  { method: 'get', pattern: /^\/hr\/pto(\?|$)/, handle: (_m, c) => list(db.ptoRequests, c) },

  // ---- files
  { method: 'get', pattern: /^\/file\/root/, handle: () => ({ data: db.rootFolder }) },
  { method: 'get', pattern: /^\/file\/folder\/([^/]+)/, handle: () => ({ data: { ...db.rootFolder, breadcrumbs: [{ id: 'root', name: 'Files' }], children: db.folderChildren } }) },
  { method: 'get', pattern: /^\/file\/search/, handle: (_m, c) => list(db.folderChildren.filter((f) => f.type === 'FILE'), c) },
  { method: 'get', pattern: /^\/file\/project\/([^/]+)\/folder/, handle: () => ({ data: 'folder-projects' }) },

  // ---- activity log
  { method: 'get', pattern: /^\/activity-log/, handle: (_m, c) => list(db.activityLog, c) },

  // ---- integrations
  { method: 'get', pattern: /^\/integrations\/quickbooks\/reference-sync\/status/, handle: () => ({ data: db.quickbooksReferenceSyncStatus }) },
  { method: 'get', pattern: /^\/prime-change-order\/fieldwire\/sync-status/, handle: () => ({ data: db.fieldwireSyncStatus }) },
];

function normalizePath(config: InternalAxiosRequestConfig): string {
  const raw = `${config.baseURL ?? ''}${config.url ?? ''}`;
  // strip protocol/host if present, then the /api/v1 prefix
  const noHost = raw.replace(/^https?:\/\/[^/]+/, '');
  const noPrefix = noHost.replace(/^\/api\/v1/, '');
  return noPrefix || '/';
}

function ok(data: unknown, config: InternalAxiosRequestConfig): AxiosResponse {
  return { data, status: 200, statusText: 'OK', headers: {}, config, request: {} };
}

export const mockAdapter: AxiosAdapter = async (config) => {
  const method = (config.method ?? 'get').toLowerCase();
  const path = normalizePath(config);

  for (const route of routes) {
    if (route.method !== method) continue;
    const m = path.match(route.pattern);
    if (m) return ok(route.handle(m, config), config);
  }

  // Fallbacks — never error so the UI always renders.
  if (method === 'get') {
    // Works for both list readers (res.data.data) and {data,count}/pagination readers.
    return ok({ data: [], count: 0, pagination: db.makePagination(0) }, config);
  }

  // Mutations: echo back something object-shaped so optimistic UI doesn't crash.
  let body: Record<string, unknown> = {};
  try {
    body = typeof config.data === 'string' ? JSON.parse(config.data) : (config.data ?? {});
  } catch {
    body = {};
  }
  return ok({ data: { id: `mock-${path.replace(/\W+/g, '-')}`, ...body, success: true } }, config);
};
