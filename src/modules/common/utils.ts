import { IPaginatedResponse, PaginationParams } from '@middleware';
import { BadRequestError } from '@utils';

interface ISoftDeletable {
    deletedAt: Date | null;
}

export const checkDeletedAt = (data?: ISoftDeletable | null) => {
    if (data?.deletedAt) throw new BadRequestError('Cannot work on a deleted resource.');
};

export function getPaginatedResponse<T>(
    data: T[],
    count: number,
    params: PaginationParams
): IPaginatedResponse<T> {
    const totalPages = Math.ceil(count / params.size);
    return {
        data: data,
        info: {
            currentPage: params.page,
            hasNextPage: params.page < totalPages,
            hasPreviousPage: params.page > 1,
            itemsPerPage: params.size,
            totalItems: count,
            totalPages: totalPages,
        },
    } satisfies IPaginatedResponse<T>;
}
