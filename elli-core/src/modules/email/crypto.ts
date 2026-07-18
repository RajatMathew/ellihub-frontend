import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

import { BadRequestError } from '@utils';

const TOKEN_VERSION = 'v1';
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

const getEncryptionSecret = (): string => {
    const secret =
        process.env.AURINKO_TOKEN_ENCRYPTION_KEY?.trim() ||
        process.env.AURINKO_CLIENT_SECRET?.trim();

    if (!secret) {
        throw new BadRequestError('Aurinko token encryption secret is not configured');
    }

    return secret;
};

const getEncryptionKey = () => createHash('sha256').update(getEncryptionSecret()).digest();

export const encryptAurinkoToken = (value: string): string => {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, getEncryptionKey(), iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return [
        TOKEN_VERSION,
        iv.toString('base64'),
        authTag.toString('base64'),
        encrypted.toString('base64'),
    ].join(':');
};

export const decryptAurinkoToken = (value: string): string => {
    if (!value) {
        throw new BadRequestError('Aurinko token is missing');
    }

    const [version, iv, authTag, encrypted] = value.split(':');
    if (version !== TOKEN_VERSION || !iv || !authTag || !encrypted) {
        throw new BadRequestError('Aurinko token format is invalid');
    }

    const decipher = createDecipheriv(ALGORITHM, getEncryptionKey(), Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(authTag, 'base64'));

    return Buffer.concat([
        decipher.update(Buffer.from(encrypted, 'base64')),
        decipher.final(),
    ]).toString('utf8');
};
