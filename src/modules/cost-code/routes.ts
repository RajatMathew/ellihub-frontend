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
    '/categories',
    requirePermission({ costCodeGroup: ['update'] }),
    zValidator('json', CostCodeCategoryUpdateSchema),
    async (c) => {
        const data = c.req.valid('json');

        const category = await CostCodeService.updateCostCodeCategory(data);

        return success(c, category);
    }
);

app.delete('/categories/:id', requirePermission({ costCodeGroup: ['delete'] }), async (c) => {
    const id = c.req.param('id');

    await CostCodeService.deleteCostCodeCategory(id);

    return success(c, null);
});

// Cost Code Routes
app.get(
    '/',
    requirePermission({ costCode: ['read'] }),
    paginationMiddleware({ defaultSize: 10 }),
    async (c: Context) => {
        const pagination = c.get('pagination');

        const costCodes = await CostCodeService.getCostCodes(pagination);
        return success(c, costCodes);
    }
);

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
    '/',
    requirePermission({ costCode: ['update'] }),
    zValidator('json', CostCodeUpdateSchema),
    async (c) => {
        const data = c.req.valid('json');

        const costCode = await CostCodeService.updateCostCode(data);

        return success(c, costCode);
    }
);

app.delete('/:id', requirePermission({ costCode: ['delete'] }), async (c) => {
    const id = c.req.param('id');

    await CostCodeService.deleteCostCode(id);

    return success(c, null);
});

export default app;
