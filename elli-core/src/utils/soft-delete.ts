import { BadRequestError } from '@utils';

interface ISoftDeletable {
    deletedAt: Date | null;
}

export const checkDeletedAt = (data?: ISoftDeletable | null) => {
    if (data?.deletedAt) throw new BadRequestError('Cannot work on a deleted resource.');
};
