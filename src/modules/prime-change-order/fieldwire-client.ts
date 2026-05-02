import { BadRequestError } from '@utils';
import axios from 'axios';
import z from 'zod';

import {
    FieldwireChangeOrdersSchema,
    FieldwireProjectsSchema,
    FieldwireProjectUsersSchema,
} from './models';

const FIELDWIRE_AUTH_URL = 'https://client-api.super.fieldwire.com/api_keys/jwt';
const FIELDWIRE_API_BASE_URL = 'https://client-api.us.fieldwire.com/api/v3';

const FieldwireTokenSchema = z.object({
    access_token: z.string().min(1),
});

const getFieldwireToken = () => {
    const token = process.env.FIELDWIRE_API_TOKEN;
    if (!token) {
        throw new BadRequestError('FIELDWIRE_API_TOKEN is not configured');
    }
    return token;
};

export const getFieldwireVersionDate = () => new Date().toISOString().slice(0, 10);

export const FieldwireClient = {
    getAccessToken: async (): Promise<string> => {
        const response = await axios.post(
            FIELDWIRE_AUTH_URL,
            { api_token: getFieldwireToken() },
            {
                headers: {
                    accept: 'application/json',
                    'content-type': 'application/json',
                },
            }
        );

        return FieldwireTokenSchema.parse(response.data).access_token;
    },

    getChangeOrders: async (fieldwireProjectId: string, accessToken?: string) => {
        const bearerToken = accessToken ?? (await FieldwireClient.getAccessToken());
        const response = await axios.get(
            `${FIELDWIRE_API_BASE_URL}/projects/${fieldwireProjectId}/change_orders`,
            {
                headers: {
                    'Fieldwire-Version': getFieldwireVersionDate(),
                    accept: 'application/json',
                    authorization: `Bearer ${bearerToken}`,
                },
            }
        );

        return FieldwireChangeOrdersSchema.parse(response.data);
    },

    getProjects: async (accessToken?: string) => {
        const bearerToken = accessToken ?? (await FieldwireClient.getAccessToken());
        const response = await axios.get(`${FIELDWIRE_API_BASE_URL}/account/projects`, {
            headers: {
                'Fieldwire-Filter': 'active',
                'Fieldwire-Version': getFieldwireVersionDate(),
                accept: 'application/json',
                authorization: `Bearer ${bearerToken}`,
            },
        });

        return FieldwireProjectsSchema.parse(response.data);
    },

    getProjectUsers: async (fieldwireProjectId: string, accessToken?: string) => {
        const bearerToken = accessToken ?? (await FieldwireClient.getAccessToken());
        const response = await axios.get(
            `${FIELDWIRE_API_BASE_URL}/account/projects/${encodeURIComponent(
                fieldwireProjectId
            )}/users`,
            {
                headers: {
                    'Fieldwire-Version': getFieldwireVersionDate(),
                    accept: 'application/json',
                    authorization: `Bearer ${bearerToken}`,
                },
            }
        );

        return FieldwireProjectUsersSchema.parse(response.data);
    },
};
