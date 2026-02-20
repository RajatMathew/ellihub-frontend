import { useState } from 'react';

import { MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';

import { Button } from '@app/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@app/components/ui/dropdown-menu';
import { CategoryFormDialog } from '@modules/catalog/components/category-form-dialog';
import {
  PageHeader,
  SectionTable,
  type SectionTableColumn,
} from '@modules/catalog/components/reference';
import {
  useCostCodeCategoriesQuery,
  useCreateCostCodeCategoryMutation,
  useDeleteCostCodeCategoryMutation,
  useUpdateCostCodeCategoryMutation,
} from '@modules/catalog/hooks';
import type { CostCodeCategory } from '@modules/catalog/schemas/costcode-category.schema';

export default function CostCodeCategoriesListPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CostCodeCategory | null>(null);
  const [search, setSearch] = useState('');

  const { data: categories = [], isLoading } = useCostCodeCategoriesQuery();
  const createMutation = useCreateCostCodeCategoryMutation();
  const updateMutation = useUpdateCostCodeCategoryMutation();
  const deleteMutation = useDeleteCostCodeCategoryMutation();

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const filteredCategories = search
    ? categories.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          (c.description ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : categories;

  const handleSubmit = (data: { id?: string; name: string; description?: string | null }) => {
    if ('id' in data && data.id) {
      updateMutation.mutate(
        { id: data.id, name: data.name, description: data.description ?? null },
        {
          onSuccess: () => {
            setDialogOpen(false);
            setEditingCategory(null);
          },
        }
      );
    } else {
      createMutation.mutate(
        { name: data.name, description: data.description ?? null },
        {
          onSuccess: () => {
            setDialogOpen(false);
          },
        }
      );
    }
  };

  const handleEdit = (cat: CostCodeCategory) => {
    setEditingCategory(cat);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (
      window.confirm('Delete this category? Cost codes in this category may need to be reassigned.')
    ) {
      deleteMutation.mutate(id);
    }
  };

  const openCreate = () => {
    setEditingCategory(null);
    setDialogOpen(true);
  };

  const columns: SectionTableColumn<CostCodeCategory>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (row) => <span className="text-[13px] font-bold text-gray-900">{row.name}</span>,
    },
    {
      key: 'description',
      header: 'Description',
      render: (row) => <span className="text-[13px] text-gray-600">{row.description ?? '—'}</span>,
    },
    {
      key: 'actions',
      header: '',
      className: 'w-0',
      headerClassName: 'w-0',
      render: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0 text-gray-500 hover:text-gray-900"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="size-4" />
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => handleEdit(row)}>
              <Pencil className="size-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => handleDelete(row.id)}
            >
              <Trash2 className="size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="container-fluid pb-6">
        <PageHeader
          breadcrumbs={[
            { label: 'Catalog', href: '/' },
            { label: 'Cost Codes', href: '/catalog' },
            { label: 'Categories' },
          ]}
          title="Cost Code Categories"
        />
        <p className="text-[13px] text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="container-fluid pb-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Catalog', href: '/catalog' },
          { label: 'Cost Codes', href: '/catalog/cost-codes' },
          { label: 'Categories' },
        ]}
        title="Cost Code Categories"
        actions={[
          {
            label: 'New Category',
            icon: Plus,
            onClick: openCreate,
            variant: 'primary',
            className: 'bg-gray-900 text-white hover:bg-gray-800',
          },
          {
            label: 'Back to Cost Codes',
            href: '..',
            variant: 'outline',
          },
        ]}
      />

      <SectionTable<CostCodeCategory>
        title={`COST CODE CATEGORIES (${filteredCategories.length})`}
        columns={columns}
        data={filteredCategories}
        getRowKey={(row) => row.id}
        searchPlaceholder="Search..."
        onSearch={setSearch}
        emptyMessage="No categories. Create one to use with cost codes."
        pageSize={25}
      />

      <CategoryFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        category={editingCategory}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
