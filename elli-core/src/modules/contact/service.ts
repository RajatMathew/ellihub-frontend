import { Contact, Lookup, Prisma } from '@db/client';
import { prisma } from '@lib/prisma';
import { PaginationParams } from '@middleware';
import { ActivityLogService, activityChange } from '@modules/activity-log';
import { LookupType } from '@modules/lookup/models';
import { BadRequestError, ConflictError, NotFoundError } from '@utils';
import { generateNanoId } from '@utils/generateNanoId';
import { checkDeletedAt } from '@utils/soft-delete';

import {
    AddTagToContactRequest,
    ContactCreateRequest,
    ContactUpdateRequest,
    LinkContactRequest,
    RemoveTagFromContactRequest,
    UnlinkContactRequest,
} from './models';

type ContactWriteClient = Pick<typeof prisma, 'contact'>;
type LookupWriteClient = Pick<typeof prisma, 'lookup'>;
type ActivityLogTransaction = Parameters<typeof ActivityLogService.log>[0]['tx'];
type ContactLinkTarget = {
    entityType: 'vendor' | 'gc';
    entityId: string;
    label: string;
};
type ContactRoleRequest = Pick<
    ContactCreateRequest,
    'professionalRoleId' | 'professionalRoleLabel'
>;

function normalizeLookupLabel(label: string) {
    return label.trim().replace(/\s+/g, ' ');
}

async function findContactProfessionalRoleByLabel(label: string, client: LookupWriteClient) {
    return client.lookup.findFirst({
        where: {
            type: LookupType.CONTACT_PROFESSIONAL_ROLE,
            label: { equals: label, mode: 'insensitive' },
        },
    });
}

async function findOrCreateContactProfessionalRoleByLabel(
    professionalRoleLabel: string,
    client: LookupWriteClient
): Promise<Lookup> {
    const label = normalizeLookupLabel(professionalRoleLabel);
    if (!label) throw new BadRequestError('Professional role is required');

    const existing = await findContactProfessionalRoleByLabel(label, client);
    if (existing) return existing;

    try {
        return await client.lookup.create({
            data: {
                id: generateNanoId(),
                type: LookupType.CONTACT_PROFESSIONAL_ROLE,
                label,
            },
        });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            const duplicate = await findContactProfessionalRoleByLabel(label, client);
            if (duplicate) return duplicate;
        }
        throw error;
    }
}

async function ensureContactProfessionalRoleExists(
    professionalRoleId?: string | null,
    client: LookupWriteClient = prisma
) {
    if (!professionalRoleId) return null;

    const role = await client.lookup.findUnique({ where: { id: professionalRoleId } });
    if (!role || role.type !== LookupType.CONTACT_PROFESSIONAL_ROLE) {
        throw new NotFoundError('Professional role not found');
    }

    return role;
}

async function resolveContactProfessionalRole(
    request: ContactRoleRequest,
    client: LookupWriteClient = prisma
) {
    if (request.professionalRoleId && request.professionalRoleLabel) {
        throw new BadRequestError(
            'Use either an existing professional role or a custom professional role'
        );
    }

    if (request.professionalRoleLabel) {
        return findOrCreateContactProfessionalRoleByLabel(request.professionalRoleLabel, client);
    }

    return ensureContactProfessionalRoleExists(request.professionalRoleId, client);
}

const stringArraysEqual = (first: string[], second: string[]) =>
    first.length === second.length && first.every((value, index) => value === second[index]);

const hasContactProfileChanged = (
    contact: Contact,
    request: ContactUpdateRequest,
    nextProfessionalRoleId: string | null
) =>
    request.fullName !== contact.fullName ||
    nextProfessionalRoleId !== contact.professionalRoleId ||
    request.email !== contact.email ||
    (request.phoneNumber ?? null) !== contact.phoneNumber ||
    !stringArraysEqual(request.tags ?? [], contact.tags);

async function clearPrimaryContact(
    client: ContactWriteClient,
    target: {
        vendorId?: string | null;
        generalContractorId?: string | null;
        excludeContactId?: string;
    }
) {
    const exclude = target.excludeContactId ? { id: { not: target.excludeContactId } } : {};

    if (target.vendorId) {
        await client.contact.updateMany({
            where: {
                vendorId: target.vendorId,
                deletedAt: null,
                isPrimary: true,
                ...exclude,
            },
            data: { isPrimary: false },
        });
    }

    if (target.generalContractorId) {
        await client.contact.updateMany({
            where: {
                generalContractorId: target.generalContractorId,
                deletedAt: null,
                isPrimary: true,
                ...exclude,
            },
            data: { isPrimary: false },
        });
    }
}

async function getContactLinkTarget(
    contact: Pick<Contact, 'vendorId' | 'generalContractorId'>
): Promise<ContactLinkTarget | null> {
    if (contact.vendorId) {
        const vendor = await prisma.vendor.findUnique({
            where: { id: contact.vendorId },
            select: { id: true, name: true },
        });

        return {
            entityType: 'vendor',
            entityId: contact.vendorId,
            label: vendor ? `vendor ${vendor.name}` : 'vendor',
        };
    }

    if (contact.generalContractorId) {
        const gc = await prisma.generalContractor.findUnique({
            where: { id: contact.generalContractorId },
            select: { id: true, name: true },
        });

        return {
            entityType: 'gc',
            entityId: contact.generalContractorId,
            label: gc ? `GC ${gc.name}` : 'GC',
        };
    }

    return null;
}

function contactLinkTargetsMatch(
    first: ContactLinkTarget | null,
    second: ContactLinkTarget | null
) {
    return first?.entityType === second?.entityType && first?.entityId === second?.entityId;
}

async function logContactLinkChange(params: {
    userId: string;
    contactId: string;
    contactName: string;
    target: ContactLinkTarget;
    action: 'link' | 'unlink';
    isPrimary?: boolean;
    tx: ActivityLogTransaction;
}) {
    const { userId, contactId, contactName, target, action, isPrimary, tx } = params;
    const verb = action === 'link' ? 'Linked' : 'Unlinked';
    const preposition = action === 'link' ? 'to' : 'from';
    const primarySuffix = action === 'link' && isPrimary ? ' as primary' : '';
    const description = `${verb} contact ${contactName} ${preposition} ${target.label}${primarySuffix}`;

    await ActivityLogService.log({
        userId,
        entityType: target.entityType,
        entityId: target.entityId,
        action,
        description,
        affectedEntityIds: [contactId],
        tx,
    });
}

async function logContactPrimaryChange(params: {
    userId: string;
    contactId: string;
    contactName: string;
    target: ContactLinkTarget;
    isPrimary: boolean;
    tx: ActivityLogTransaction;
}) {
    const { userId, contactId, contactName, target, isPrimary, tx } = params;
    const description = isPrimary
        ? `Marked contact ${contactName} as primary for ${target.label}`
        : `Removed contact ${contactName} as primary for ${target.label}`;

    await ActivityLogService.log({
        userId,
        entityType: target.entityType,
        entityId: target.entityId,
        action: 'update',
        description,
        affectedEntityIds: [contactId],
        tx,
    });
}

export const ContactService = {
    createContact: async (request: ContactCreateRequest, userId: string): Promise<Contact> => {
        const { vendorId, generalContractorId, email, phoneNumber, tags, isPrimary, fullName } =
            request;

        if (vendorId) {
            const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
            if (!vendor) throw new NotFoundError('Vendor not found');
            checkDeletedAt(vendor);
        }

        if (generalContractorId) {
            const gc = await prisma.generalContractor.findUnique({
                where: { id: generalContractorId },
            });
            if (!gc) throw new NotFoundError('General contractor not found');
            checkDeletedAt(gc);
        }

        return await prisma.$transaction(async (tx) => {
            const professionalRole = await resolveContactProfessionalRole(request, tx);

            if (isPrimary) {
                await clearPrimaryContact(tx, { vendorId, generalContractorId });
            }

            const created = await tx.contact.create({
                data: {
                    id: generateNanoId(),
                    fullName,
                    professionalRoleId: professionalRole?.id ?? null,
                    email: email ?? null,
                    phoneNumber: phoneNumber ?? null,
                    tags: tags ?? [],
                    isPrimary: Boolean(isPrimary && (vendorId || generalContractorId)),
                    vendorId: vendorId ?? null,
                    generalContractorId: generalContractorId ?? null,
                },
                include: {
                    professionalRole: true,
                    vendor: true,
                    generalContractor: true,
                },
            });

            await ActivityLogService.log({
                userId,
                entityType: 'contact',
                entityId: created.id,
                action: 'create',
                description: `Created contact ${created.fullName}`,
                affectedEntityIds: [vendorId, generalContractorId].filter((v): v is string => !!v),
                tx,
            });

            const target = created.vendor
                ? {
                      entityType: 'vendor' as const,
                      entityId: created.vendor.id,
                      label: `vendor ${created.vendor.name}`,
                  }
                : created.generalContractor
                  ? {
                        entityType: 'gc' as const,
                        entityId: created.generalContractor.id,
                        label: `GC ${created.generalContractor.name}`,
                    }
                  : null;

            if (target) {
                await logContactLinkChange({
                    userId,
                    contactId: created.id,
                    contactName: created.fullName,
                    target,
                    action: 'link',
                    isPrimary: created.isPrimary,
                    tx,
                });
            }

            return created;
        });
    },

    getContact: async (id: string): Promise<Contact> => {
        const contact = await prisma.contact.findUnique({
            where: { id },
            include: {
                professionalRole: true,
                vendor: true,
                generalContractor: true,
            },
        });

        if (!contact) {
            throw new NotFoundError('Contact not found');
        }

        checkDeletedAt(contact);

        return contact;
    },

    getContacts: async (
        params: PaginationParams
    ): Promise<{
        data: Contact[];
        count: number;
    }> => {
        const { filter, skip, take, sortBy, sortOrder, search } = params;
        const { professionalRoleId, ...restFilter } = filter || {};

        const whereClause = {
            deletedAt: null,
            ...restFilter,
            ...(professionalRoleId && { professionalRoleId }),
            ...(search && {
                OR: [
                    { fullName: { contains: search, mode: 'insensitive' as const } },
                    { email: { contains: search, mode: 'insensitive' as const } },
                    { phoneNumber: { contains: search, mode: 'insensitive' as const } },
                ],
            }),
        };

        const [count, data] = await prisma.$transaction([
            prisma.contact.count({
                where: whereClause,
            }),

            prisma.contact.findMany({
                where: whereClause,
                skip,
                take,
                orderBy: {
                    [sortBy as keyof Contact]: sortOrder,
                },
                include: {
                    professionalRole: true,
                    vendor: true,
                    generalContractor: true,
                },
            }),
        ]);

        return { data, count };
    },

    getStats: async () => {
        const [totalContacts, primaryContacts, vendorLinks, gcLinks] = await prisma.$transaction([
            prisma.contact.count({ where: { deletedAt: null } }),
            prisma.contact.count({ where: { deletedAt: null, isPrimary: true } }),
            prisma.contact.count({ where: { deletedAt: null, vendorId: { not: null } } }),
            prisma.contact.count({
                where: { deletedAt: null, generalContractorId: { not: null } },
            }),
        ]);

        return {
            totalContacts,
            primaryContacts,
            vendorLinks,
            gcLinks,
        };
    },

    searchUnlinkedContacts: async (
        search?: string
    ): Promise<{ id: string; fullName: string }[]> => {
        return prisma.contact.findMany({
            where: {
                deletedAt: null,
                vendorId: null,
                generalContractorId: null,
                ...(search && {
                    fullName: { contains: search, mode: 'insensitive' as const },
                }),
            },
            select: { id: true, fullName: true },
            orderBy: { fullName: 'asc' },
            take: 25,
        });
    },

    updateContact: async (request: ContactUpdateRequest, userId: string): Promise<Contact> => {
        const {
            id,
            vendorId,
            generalContractorId,
            email,
            phoneNumber,
            tags,
            isPrimary,
            fullName,
            replaceExisting,
        } = request;

        const contact = await prisma.contact.findUnique({
            where: { id },
            include: { professionalRole: true },
        });

        if (!contact) {
            throw new NotFoundError('Contact not found');
        }

        checkDeletedAt(contact);

        if (vendorId) {
            const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
            if (!vendor) throw new NotFoundError('Vendor not found');
            checkDeletedAt(vendor);
        }

        if (generalContractorId) {
            const gc = await prisma.generalContractor.findUnique({
                where: { id: generalContractorId },
            });
            if (!gc) throw new NotFoundError('General contractor not found');
            checkDeletedAt(gc);
        }

        const currentTarget = await getContactLinkTarget(contact);

        // Enforce exclusivity: setting one side clears the other so callers can flip in one call.
        let nextVendorId: string | null | undefined;
        let nextGcId: string | null | undefined;
        if (vendorId) {
            nextVendorId = vendorId;
            nextGcId = null;
        } else if (generalContractorId) {
            nextGcId = generalContractorId;
            nextVendorId = null;
        } else {
            nextVendorId = vendorId === null ? null : undefined;
            nextGcId = generalContractorId === null ? null : undefined;
        }

        const effectiveVendorId = nextVendorId === undefined ? contact.vendorId : nextVendorId;
        const effectiveGcId = nextGcId === undefined ? contact.generalContractorId : nextGcId;
        const linkChanged =
            effectiveVendorId !== contact.vendorId || effectiveGcId !== contact.generalContractorId;
        const nextIsPrimary =
            effectiveVendorId || effectiveGcId
                ? (isPrimary ?? (linkChanged ? false : contact.isPrimary))
                : false;
        const nextTarget = await getContactLinkTarget({
            vendorId: effectiveVendorId ?? null,
            generalContractorId: effectiveGcId ?? null,
        });
        const primaryChanged = !linkChanged && nextIsPrimary !== contact.isPrimary;
        if (linkChanged && currentTarget && nextTarget && !replaceExisting) {
            throw new ConflictError(
                `This contact is already linked to a ${currentTarget.entityType === 'gc' ? 'GC' : 'vendor'}. Confirm replacement to continue.`
            );
        }

        return await prisma.$transaction(async (tx) => {
            const professionalRole = await resolveContactProfessionalRole(request, tx);
            const nextProfessionalRoleId = professionalRole?.id ?? null;
            const profileChanged = hasContactProfileChanged(
                contact,
                request,
                nextProfessionalRoleId
            );

            if (nextIsPrimary) {
                await clearPrimaryContact(tx, {
                    vendorId: effectiveVendorId,
                    generalContractorId: effectiveGcId,
                    excludeContactId: id,
                });
            }

            const updated = await tx.contact.update({
                where: { id },
                data: {
                    fullName,
                    professionalRoleId: nextProfessionalRoleId,
                    email: email ?? null,
                    phoneNumber: phoneNumber ?? null,
                    tags: tags ?? [],
                    isPrimary: nextIsPrimary,
                    vendorId: nextVendorId,
                    generalContractorId: nextGcId,
                },
                include: {
                    professionalRole: true,
                    vendor: true,
                    generalContractor: true,
                },
            });

            if (linkChanged) {
                if (currentTarget) {
                    await logContactLinkChange({
                        userId,
                        contactId: updated.id,
                        contactName: updated.fullName,
                        target: currentTarget,
                        action: 'unlink',
                        tx,
                    });
                }

                if (nextTarget) {
                    await logContactLinkChange({
                        userId,
                        contactId: updated.id,
                        contactName: updated.fullName,
                        target: nextTarget,
                        action: 'link',
                        isPrimary: nextIsPrimary,
                        tx,
                    });
                }
            } else if (primaryChanged && nextTarget) {
                await logContactPrimaryChange({
                    userId,
                    contactId: updated.id,
                    contactName: updated.fullName,
                    target: nextTarget,
                    isPrimary: nextIsPrimary,
                    tx,
                });
            }

            if (profileChanged) {
                await ActivityLogService.logFieldUpdate({
                    userId,
                    entityType: 'contact',
                    entityId: updated.id,
                    subject: { label: 'Contact', name: updated.fullName },
                    changes: [
                        activityChange('Name', contact.fullName, updated.fullName, undefined, {
                            section: 'Profile',
                        }),
                        activityChange(
                            'Professional role',
                            contact.professionalRole?.label,
                            professionalRole?.label,
                            undefined,
                            { section: 'Profile' }
                        ),
                        activityChange('Email', contact.email, updated.email, undefined, {
                            section: 'Contact',
                            valueType: 'email',
                        }),
                        activityChange(
                            'Phone number',
                            contact.phoneNumber,
                            updated.phoneNumber,
                            undefined,
                            {
                                section: 'Contact',
                                valueType: 'phone',
                            }
                        ),
                        activityChange('Tags', contact.tags, updated.tags, undefined, {
                            section: 'Profile',
                            valueType: 'list',
                        }),
                    ],
                    affectedEntityIds: [
                        updated.vendorId,
                        updated.generalContractorId,
                        contact.vendorId !== updated.vendorId ? contact.vendorId : null,
                        contact.generalContractorId !== updated.generalContractorId
                            ? contact.generalContractorId
                            : null,
                    ].filter((v): v is string => !!v),
                    tx,
                });
            }

            return updated;
        });
    },

    deleteContact: async (id: string, userId: string): Promise<void> => {
        const contact = await prisma.contact.findUnique({
            where: { id },
        });

        if (!contact) {
            throw new NotFoundError('Contact not found');
        }

        checkDeletedAt(contact);

        const linkTarget = await getContactLinkTarget(contact);
        if (linkTarget) {
            throw new ConflictError(
                `Cannot delete contact because it is linked to ${linkTarget.label}. Unlink the contact before deleting it.`
            );
        }

        await prisma.contact.update({
            where: { id },
            data: { deletedAt: new Date() },
        });

        await ActivityLogService.log({
            userId,
            entityType: 'contact',
            entityId: id,
            action: 'delete',
            description: `Deleted contact ${contact.fullName}`,
        });
    },

    addTagToContact: async (request: AddTagToContactRequest, userId: string): Promise<Contact> => {
        const { contactId, tag } = request;

        const contact = await prisma.contact.findUnique({
            where: { id: contactId },
        });

        if (!contact) {
            throw new NotFoundError('Contact not found');
        }

        checkDeletedAt(contact);

        if (contact.tags.includes(tag)) {
            throw new ConflictError('Tag already exists on this contact');
        }

        const updated = await prisma.contact.update({
            where: { id: contactId },
            data: { tags: [...contact.tags, tag] },
        });

        await ActivityLogService.log({
            userId,
            entityType: 'contact',
            entityId: contactId,
            action: 'addTag',
            description: `Added tag '${tag}' to contact ${contact.fullName}`,
        });

        return updated;
    },

    removeTagFromContact: async (
        request: RemoveTagFromContactRequest,
        userId: string
    ): Promise<Contact> => {
        const { contactId, tag } = request;

        const contact = await prisma.contact.findUnique({
            where: { id: contactId },
        });

        if (!contact) {
            throw new NotFoundError('Contact not found');
        }

        checkDeletedAt(contact);

        if (!contact.tags.includes(tag)) {
            throw new NotFoundError('Tag not found on this contact');
        }

        const updated = await prisma.contact.update({
            where: { id: contactId },
            data: { tags: contact.tags.filter((t) => t !== tag) },
        });

        await ActivityLogService.log({
            userId,
            entityType: 'contact',
            entityId: contactId,
            action: 'removeTag',
            description: `Removed tag '${tag}' from contact ${contact.fullName}`,
        });

        return updated;
    },

    linkContact: async (request: LinkContactRequest, userId: string): Promise<Contact> => {
        const { contactId, vendorId, generalContractorId, isPrimary, replaceExisting } = request;

        const contact = await prisma.contact.findUnique({ where: { id: contactId } });
        if (!contact) throw new NotFoundError('Contact not found');
        checkDeletedAt(contact);

        const currentTarget = await getContactLinkTarget(contact);
        let target: ContactLinkTarget;
        if (vendorId) {
            const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
            if (!vendor) throw new NotFoundError('Vendor not found');
            checkDeletedAt(vendor);
            target = {
                entityType: 'vendor',
                entityId: vendor.id,
                label: `vendor ${vendor.name}`,
            };
        } else {
            const gc = await prisma.generalContractor.findUnique({
                where: { id: generalContractorId! },
            });
            if (!gc) throw new NotFoundError('General contractor not found');
            checkDeletedAt(gc);
            target = {
                entityType: 'gc',
                entityId: gc.id,
                label: `GC ${gc.name}`,
            };
        }

        const targetChanged = !contactLinkTargetsMatch(currentTarget, target);
        const nextIsPrimary = isPrimary ?? false;
        const primaryChanged = !targetChanged && nextIsPrimary !== contact.isPrimary;
        if (currentTarget && targetChanged && !replaceExisting) {
            throw new ConflictError(
                `This contact is already linked to a ${currentTarget.entityType === 'gc' ? 'GC' : 'vendor'}. Confirm replacement to continue.`
            );
        }

        return await prisma.$transaction(async (tx) => {
            if (nextIsPrimary) {
                await clearPrimaryContact(tx, {
                    vendorId,
                    generalContractorId,
                    excludeContactId: contactId,
                });
            }

            const updated = await tx.contact.update({
                where: { id: contactId },
                data: {
                    vendorId: vendorId ?? null,
                    generalContractorId: generalContractorId ?? null,
                    isPrimary: nextIsPrimary,
                },
                include: {
                    professionalRole: true,
                    vendor: true,
                    generalContractor: true,
                },
            });

            if (currentTarget && targetChanged) {
                await logContactLinkChange({
                    userId,
                    contactId,
                    contactName: updated.fullName,
                    target: currentTarget,
                    action: 'unlink',
                    tx,
                });
            }

            if (targetChanged) {
                await logContactLinkChange({
                    userId,
                    contactId,
                    contactName: updated.fullName,
                    target,
                    action: 'link',
                    isPrimary: nextIsPrimary,
                    tx,
                });
            } else if (primaryChanged) {
                await logContactPrimaryChange({
                    userId,
                    contactId,
                    contactName: updated.fullName,
                    target,
                    isPrimary: nextIsPrimary,
                    tx,
                });
            }

            return updated;
        });
    },

    unlinkContact: async (request: UnlinkContactRequest, userId: string): Promise<Contact> => {
        const { contactId } = request;

        const contact = await prisma.contact.findUnique({ where: { id: contactId } });
        if (!contact) throw new NotFoundError('Contact not found');
        checkDeletedAt(contact);

        if (!contact.vendorId && !contact.generalContractorId) {
            throw new NotFoundError('Contact is not linked to a vendor or GC');
        }

        const currentTarget = await getContactLinkTarget(contact);

        return await prisma.$transaction(async (tx) => {
            const updated = await tx.contact.update({
                where: { id: contactId },
                data: { vendorId: null, generalContractorId: null, isPrimary: false },
                include: {
                    professionalRole: true,
                    vendor: true,
                    generalContractor: true,
                },
            });

            if (currentTarget) {
                await logContactLinkChange({
                    userId,
                    contactId,
                    contactName: contact.fullName,
                    target: currentTarget,
                    action: 'unlink',
                    tx,
                });
            }

            return updated;
        });
    },
};
