import { prisma } from '@lib/prisma';
import { BadRequestError } from '@utils';

import {
    getQuickBooksClientErrorMessage,
    isQuickBooksAuthError,
    QuickBooksClient,
    QuickBooksTokenResponse,
} from './quickbooks-client';
import { decryptQuickBooksToken, encryptQuickBooksToken } from './quickbooks-crypto';

import type { QuickBooksConnection } from '@db/client';

const ACCESS_TOKEN_REFRESH_WINDOW_MS = 5 * 60 * 1000;

const addSeconds = (date: Date, seconds: number): Date => new Date(date.getTime() + seconds * 1000);

export const markQuickBooksConnectionDisconnected = async (connectionId: string): Promise<void> => {
    await prisma.quickBooksConnection.update({
        where: { id: connectionId },
        data: {
            status: 'DISCONNECTED',
            accessToken: '',
            refreshToken: '',
            accessTokenExpiresAt: new Date(0),
            refreshTokenExpiresAt: null,
            disconnectedAt: new Date(),
        },
    });
};

const storeTokenResponse = async (
    connectionId: string,
    token: QuickBooksTokenResponse,
    now = new Date()
): Promise<void> => {
    await prisma.quickBooksConnection.update({
        where: { id: connectionId },
        data: {
            accessToken: encryptQuickBooksToken(token.accessToken),
            refreshToken: encryptQuickBooksToken(token.refreshToken),
            tokenType: token.tokenType,
            accessTokenExpiresAt: addSeconds(now, token.expiresIn),
            refreshTokenExpiresAt: token.refreshTokenExpiresIn
                ? addSeconds(now, token.refreshTokenExpiresIn)
                : undefined,
        },
    });
};

export const getValidQuickBooksAccessToken = async (
    connection: QuickBooksConnection
): Promise<string> => {
    const refreshAt = connection.accessTokenExpiresAt.getTime() - ACCESS_TOKEN_REFRESH_WINDOW_MS;
    if (refreshAt > Date.now()) return decryptQuickBooksToken(connection.accessToken);

    try {
        const token = await QuickBooksClient.refreshToken(
            decryptQuickBooksToken(connection.refreshToken)
        );
        await storeTokenResponse(connection.id, token);
        return token.accessToken;
    } catch (error) {
        if (isQuickBooksAuthError(error)) {
            await markQuickBooksConnectionDisconnected(connection.id);
            throw new BadRequestError(
                'QuickBooks authorization has been revoked. Please reconnect.'
            );
        }

        const message = getQuickBooksClientErrorMessage(error);
        if (message) throw new BadRequestError(`QuickBooks token refresh failed: ${message}`);
        throw error;
    }
};
