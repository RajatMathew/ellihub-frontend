import { createGraphAccessTokenProvider, type GraphAuthConfig } from './graph-auth';

const GRAPH_ROOT = 'https://graph.microsoft.com/v1.0';

export type GraphFetch = (path: string, init?: RequestInit) => Promise<Response>;

export function createGraphClient(config: GraphAuthConfig) {
    const getGraphAccessToken = createGraphAccessTokenProvider(config);

    const graphFetch: GraphFetch = async (path, init = {}) => {
        const token = await getGraphAccessToken();
        const headers = new Headers(init.headers);
        headers.set('Authorization', `Bearer ${token}`);

        if (init.body && !headers.has('Content-Type')) {
            headers.set('Content-Type', 'application/json');
        }

        return fetch(`${GRAPH_ROOT}${path}`, { ...init, headers });
    };

    return { graphFetch, getGraphAccessToken };
}
