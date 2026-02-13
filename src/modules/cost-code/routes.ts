import { paginationMiddleware } from '@middleware';
import { success, zValidator } from '@utils';
import { Context, Hono } from 'hono';
import { requirePermission } from 'src/middleware/auth';

import {
    CostCodeCategoryCreateSchema,
    CostCodeCategoryUpdateSchema,
    CostCodeCreateSchema,
    CostCodeUpdateSchema,
} from './models';
import { CostCodeService } from './services';

const app = new Hono();

// Cost Code Category Routes
app.get('/categories', requirePermission({ costCodeGroup: ['read'] }), async (c) => {
    const categories = await CostCodeService.getCostCodeCategories();
    return success(c, categories);
});

app.get('/categories/:id', requirePermission({ costCodeGroup: ['read'] }), async (c) => {
    const id = c.req.param('id');
    const category = await CostCodeService.getCostCodeCategory(id);
    return success(c, category);
});

app.post(
    '/categories',
    requirePermission({ costCodeGroup: ['create'] }),
    zValidator('json', CostCodeCategoryCreateSchema),
    async (c) => {
        const data = c.req.valid('json');
        const category = await CostCodeService.createCostCodeCategory(data);
        return success(c, category, 201);
    }
);

app.put(
    '/categories/:id',
    requirePermission({ costCodeGroup: ['update'] }),
    zValidator('json', CostCodeCategoryUpdateSchema),
    async (c) => {
        const id = c.req.param('id');
        const data = c.req.valid('json');
        const category = await CostCodeService.updateCostCodeCategory(id, data);
        return success(c, category);
    }
);

app.delete(
    '/categories/:id',
    requirePermission({ costCodeGroup: ['delete'] }),
    async (c) => {
        const id = c.req.param('id');
        await CostCodeService.deleteCostCodeCategory(id);
        return success(c, null);
    }
);

// Cost Code Routes
app.get(
    '/',
    requirePermission({ costCode: ['read'] }),
    paginationMiddleware({ defaultSize: 25, defaultSortBy: 'code', defaultSortOrder: 'asc' }),
    async (c: Context) => {
        const pagination = c.get('pagination');
        const { data, count } = await CostCodeService.getCostCodes(pagination);
        return success(c, data, 200, 'OK', count);
    }
);

app.get('/:id', requirePermission({ costCode: ['read'] }), async (c) => {
    const id = c.req.param('id');
    const costCode = await CostCodeService.getCostCode(id);
    return success(c, costCode);
});

app.post(
    '/',
    requirePermission({ costCode: ['create'] }),
    zValidator('json', CostCodeCreateSchema),
    async (c) => {
        const data = c.req.valid('json');
        const costCode = await CostCodeService.createCostCode(data);
        return success(c, costCode, 201);
    }
);

app.put(
    '/:id',
    requirePermission({ costCode: ['update'] }),
    zValidator('json', CostCodeUpdateSchema),
    async (c) => {
        const id = c.req.param('id');
        const data = c.req.valid('json');
        const costCode = await CostCodeService.updateCostCode(id, data);
        return success(c, costCode);
    }
);

app.delete(
    '/:id',
    requirePermission({ costCode: ['delete'] }),
    async (c) => {
        const id = c.req.param('id');
        await CostCodeService.deleteCostCode(id);
        return success(c, null);
    }
);

export default app;
