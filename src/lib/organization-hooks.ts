import { randomUUID } from 'crypto';

import { owner } from './permissions';
import { prisma } from './prisma';

/**
 * Initialize default roles for a newly created organization
 */
export async function initializeOrganizationRoles(organizationId: string) {
    try {
        // Create the owner role in the database
        await prisma.organizationRole.create({
            data: {
                id: randomUUID(),
                organizationId,
                role: 'owner',
                // Store the permissions as a JSON string
                permission: JSON.stringify(owner.statements),
            },
        });
    } catch (error) {
        console.error(`Failed to initialize roles for organization ${organizationId}:`, error);
        throw error;
    }
}
