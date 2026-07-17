import { customAlphabet } from 'nanoid';

// Custom alphabet: A-Z a-z 0-9 (62 characters)
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

// Create reusable ID generator with 8-character size
export const generateNanoId = customAlphabet(alphabet, 8);
