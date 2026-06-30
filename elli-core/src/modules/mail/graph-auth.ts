export type GraphAuthConfig = {
    tenantId: string;
    clientId: string;
    clientSecret: string;
};

type TokenResponse = {
    access_token?: string;
    expires_in?: number;
};

export function createGraphAccessTokenProvider(config: GraphAuthConfig) {
    let tokenCache: { accessToken: string; expiresAt: number } | null = null;

    return async function getGraphAccessToken() {
        const now = Date.now();

        if (tokenCache && tokenCache.expiresAt - 60_000 > now) {
            return tokenCache.accessToken;
        }

        const body = new URLSearchParams({
            client_id: config.clientId,
            client_secret: config.clientSecret,
            scope: 'https://graph.microsoft.com/.default',
            grant_type: 'client_credentials',
        });

        const response = await fetch(
            `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body,
            }
        );
        const payload = (await response.json().catch(() => null)) as TokenResponse | null;

        if (!response.ok || !payload?.access_token) {
            throw new Error(
                `Microsoft token request failed (${response.status}): ${JSON.stringify(payload)}`
            );
        }

        tokenCache = {
            accessToken: payload.access_token,
            expiresAt: now + Number(payload.expires_in ?? 3600) * 1000,
        };

        return tokenCache.accessToken;
    };
}
