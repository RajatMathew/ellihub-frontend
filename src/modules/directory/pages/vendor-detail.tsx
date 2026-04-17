import { useState } from 'react';

import {
  Briefcase,
  DollarSign,
  ExternalLink,
  FileText,
  FolderOpen,
  Globe,
  Mail,
  MapPin,
  MoreHorizontal,
  Package,
  PanelRightOpen,
  Pencil,
  Phone,
  ShieldCheck,
  Trash2,
  UserMinus,
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarWrapper,
} from '@app/components/toolbar/toolbar';
import { Badge } from '@app/components/ui/badge';
import { Button } from '@app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@app/components/ui/card';
import { ConfirmDialog } from '@app/components/ui/confirm-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@app/components/ui/dropdown-menu';
import { Separator } from '@app/components/ui/separator';
import { StatsCard } from '@app/components/ui/stats-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@app/components/ui/tabs';

import {
  ComingSoonPlaceholder,
  ContactCard,
  DetailSidebar,
  getContactDisplayEmail,
  getContactDisplayPhone,
} from '../components';
import { PAYMENT_TERMS_LABELS } from '../constants/shared.constants';
import { useDeleteVendorMutation, useVendorDetailQuery } from '../hooks';
import type {
  VendorStatus,
  VendorTypeEnum,
} from '../schemas/vendor.schema';

/* ---- Display maps ---- */

const VENDOR_TYPE_LABELS: Record<VendorTypeEnum, string> = {
  MATERIAL: 'Material',
  FABRICATION: 'Fabrication',
  INSTALLATION: 'Installation',
  SUBCONTRACTOR: 'Subcontractor',
};

const VENDOR_STATUS_COLORS: Record<VendorStatus, string> = {
  ACTIVE: 'bg-success',
  INACTIVE: 'bg-muted-foreground',
};

const VENDOR_STATUS_LABELS: Record<VendorStatus, string> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
};

/* ---- Page ---- */

export function VendorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: vendor, isLoading } = useVendorDetailQuery(id ?? '');
  const deleteMutation = useDeleteVendorMutation();

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  /* ---- Computed values from real API data ---- */

  // Also keep links that don't have contact object yet for debugging/fallback
  const allLinks = vendor?.contactLinks ?? [];

  if (isLoading) {
    return (
      <div className="container-fluid py-7.5">
        <div className="text-sm text-muted-foreground">Loading vendor...</div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="container-fluid py-7.5">
        <div className="text-sm text-muted-foreground">Vendor not found.</div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-7.5">
      {/* ---- Toolbar ---- */}
      <Toolbar>
        <ToolbarWrapper>
          <ToolbarHeading>
            <div className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
              <Link to="../.." relative="path" className="hover:text-foreground">
                Vendors
              </Link>
              {' > '}
              <span>Profile</span>
            </div>
            <ToolbarPageTitle>{vendor.name}</ToolbarPageTitle>
            <div className="flex items-center gap-4 text-xs font-medium tracking-widest text-muted-foreground uppercase">
              <span>
                Type:{' '}
                <span className="text-foreground">
                  {typeof vendor.type === 'string'
                    ? (VENDOR_TYPE_LABELS[vendor.type as VendorTypeEnum] ?? vendor.type)
                    : (vendor.type?.label || vendor.type?.type || 'Unknown')}
                </span>
              </span>
              {vendor.taxId && (
                <span>
                  Tax ID:{' '}
                  <span className="text-foreground">{vendor.taxId}</span>
                </span>
              )}
              <div className="flex items-center gap-1.5">
                <span
                  className={`size-2 rounded-full ${VENDOR_STATUS_COLORS[vendor.status] ?? 'bg-muted-foreground'}`}
                />
                <span className="text-foreground">
                  {VENDOR_STATUS_LABELS[vendor.status] ?? vendor.status}
                </span>
              </div>
            </div>
          </ToolbarHeading>
          <ToolbarActions>
            <Button variant="outline" size="sm" asChild>
              <Link to="edit">
                <Pencil className="size-4" />
                Edit Profile
              </Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" mode="icon">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem asChild>
                  <Link to="edit">
                    <Pencil className="size-4" />
                    Edit Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="size-4" />
                  Archive Vendor
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {!sidebarOpen && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSidebarOpen(true)}
              >
                <PanelRightOpen className="size-4" />
                View Details
              </Button>
            )}
          </ToolbarActions>
        </ToolbarWrapper>
      </Toolbar>

      {/* ---- Main layout ---- */}
      <div className="flex gap-6 pt-5">
        {/* Left column */}
        <div className="flex-1 min-w-0 space-y-5">
          {/* Stats cards — no /vendors/stats API, show placeholders */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            <StatsCard
              icon={<DollarSign className="size-5 text-foreground" />}
              bgClass="bg-muted"
              label="Total Committed"
              value="—"
              description="Coming soon"
            />
            <StatsCard
              icon={<DollarSign className="size-5 text-info" />}
              bgClass="bg-info/10"
              label="Paid to Date"
              value="—"
              description="Coming soon"
            />
            <StatsCard
              icon={<DollarSign className="size-5 text-success" />}
              bgClass="bg-success/10"
              label="Current Balance"
              value="—"
              description="Coming soon"
            />
            <StatsCard
              icon={<ShieldCheck className="size-5 text-destructive" />}
              bgClass="bg-destructive/10"
              label="Compliance Status"
              value="—"
              description="Coming soon"
            />
          </div>

          {/* Main tabs */}
          <Tabs defaultValue="overview">
            <TabsList variant="line">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="projects">Projects</TabsTrigger>
              <TabsTrigger value="purchase-orders">Purchase Orders</TabsTrigger>
              <TabsTrigger value="change-orders">Change Orders</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
            </TabsList>

            {/* ---- Overview tab ---- */}
            <TabsContent value="overview">
              <div className="space-y-5">
                {/* Financial Overview + Info */}
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                  {/* Financial Overview — no API data yet */}
                  <Card>
                    <CardHeader className="bg-card-foreground rounded-t-lg">
                      <CardTitle className="text-xs font-semibold tracking-widest text-card uppercase">
                        Financial Overview
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Total Committed</span>
                        <span className="text-sm font-semibold text-foreground">—</span>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Total Paid</span>
                        <span className="text-sm font-semibold text-muted-foreground">—</span>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Retainage Held</span>
                        <span className="text-sm font-semibold text-muted-foreground">—</span>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-foreground">
                          Current Balance
                        </span>
                        <span className="text-sm font-semibold text-muted-foreground">—</span>
                      </div>
                      <p className="text-xs text-muted-foreground text-center pt-2">
                        Financial data will be available in a future update.
                      </p>
                    </CardContent>
                  </Card>

                  {/* Info — from API */}
                  <Card>
                    <CardHeader className="bg-card-foreground rounded-t-lg">
                      <CardTitle className="text-xs font-semibold tracking-widest text-card uppercase">
                        Info
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Payment Terms</span>
                        <Badge variant="secondary" size="sm">
                          {vendor.paymentTerms ? (PAYMENT_TERMS_LABELS[vendor.paymentTerms] ?? vendor.paymentTerms) : '—'}
                        </Badge>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Retainage %</span>
                        <Badge variant="secondary" size="sm">
                          —
                        </Badge>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Default Status</span>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`size-2 rounded-full ${VENDOR_STATUS_COLORS[vendor.status] ?? 'bg-muted-foreground'}`}
                          />
                          <span className="text-sm font-medium">
                            {VENDOR_STATUS_LABELS[vendor.status] ?? vendor.status}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Team Directory — from API contactLinks */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                      Team Directory
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {allLinks.length > 0 ? (
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {allLinks.map((link) => (
                          <div
                            key={link.id}
                            className="p-4 rounded-lg border border-border"
                          >
                            <ContactCard
                              fullName={link.contact?.fullName || `Contact ID: ${link.contactId.slice(-6)}`}
                              email={getContactDisplayEmail(link)}
                              phone={getContactDisplayPhone(link)}
                              isPrimary={link.isPrimary}
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 py-6 text-center">
                        <UserMinus className="size-8 text-muted-foreground/40" />
                        <p className="text-sm text-muted-foreground">No contacts linked yet.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ---- Projects tab (no API endpoint yet) ---- */}
            <TabsContent value="projects">
              <Card>
                <CardContent>
                  <ComingSoonPlaceholder icon={FolderOpen} title="Project Assignments" />
                </CardContent>
              </Card>
            </TabsContent>

            {/* ---- Purchase Orders tab (no API endpoint yet) ---- */}
            <TabsContent value="purchase-orders">
              <Card>
                <CardContent>
                  <ComingSoonPlaceholder icon={Package} title="Purchase Order History" />
                </CardContent>
              </Card>
            </TabsContent>

            {/* ---- Change Orders tab (no API endpoint yet) ---- */}
            <TabsContent value="change-orders">
              <Card>
                <CardContent>
                  <ComingSoonPlaceholder icon={FileText} title="Change Order History" />
                </CardContent>
              </Card>
            </TabsContent>

            {/* ---- Payments tab (no API endpoint yet) ---- */}
            <TabsContent value="payments">
              <Card>
                <CardContent>
                  <ComingSoonPlaceholder icon={DollarSign} title="Payment Log" />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* ---- Right sidebar ---- */}
        <DetailSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)}>
          <div className="space-y-6 pt-2">
            {/* Verification & Compliance — partial real data */}
            <div>
              <div className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-3">
                Verification & Compliance
              </div>
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">
                      Established Date
                    </span>
                    <span className="text-sm font-semibold text-foreground">
                      {vendor.createdAt
                        ? new Date(vendor.createdAt).toISOString().split('T')[0]
                        : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">
                      Last Review Date
                    </span>
                    <span className="text-sm font-semibold text-foreground">
                      {vendor.updatedAt
                        ? new Date(vendor.updatedAt).toISOString().split('T')[0]
                        : '—'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Compliance Documents — no API, placeholder */}
            <div>
              <div className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-3">
                Compliance Documents
              </div>
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col items-center gap-2 py-4 text-center">
                    <ShieldCheck className="size-8 text-muted-foreground/40" />
                    <p className="text-xs text-muted-foreground">
                      Compliance document tracking will be available in a future update.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Account Manager — no API, placeholder */}
            <div>
              <div className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-3">
                Account Manager
              </div>
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col items-center gap-2 py-2 text-center">
                    <Briefcase className="size-8 text-muted-foreground/40" />
                    <p className="text-xs text-muted-foreground">
                      Account manager assignment will be available in a future update.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Official Website — from API */}
            {vendor.website && (
              <div>
                <div className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-3">
                  Official Website
                </div>
                <Card>
                  <CardContent className="p-4">
                    <a
                      href={vendor.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:text-primary/80"
                    >
                      <Globe className="size-4" />
                      {vendor.website.replace(/^https?:\/\//, '')}
                      <ExternalLink className="size-3" />
                    </a>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Contact Info — from API */}
            {(vendor.phone || vendor.email || vendor.address) && (
              <div>
                <div className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-3">
                  Contact Info
                </div>
                <Card>
                  <CardContent className="p-4 space-y-3">
                    {vendor.address && (
                      <div className="flex items-start gap-3">
                        <MapPin className="size-4 text-muted-foreground mt-0.5" />
                        <span className="text-sm text-foreground">{vendor.address}</span>
                      </div>
                    )}
                    {vendor.phone && (
                      <>
                        {vendor.address && <Separator />}
                        <div className="flex items-center gap-3">
                          <Phone className="size-4 text-muted-foreground" />
                          <a
                            href={`tel:${vendor.phone}`}
                            className="text-sm text-foreground hover:text-primary"
                          >
                            {vendor.phone}
                          </a>
                        </div>
                      </>
                    )}
                    {vendor.email && (
                      <>
                        {(vendor.address || vendor.phone) && <Separator />}
                        <div className="flex items-center gap-3">
                          <Mail className="size-4 text-muted-foreground" />
                          <a
                            href={`mailto:${vendor.email}`}
                            className="text-sm text-foreground hover:text-primary"
                          >
                            {vendor.email}
                          </a>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </DetailSidebar>
      </div>

      {/* ---- Archive confirmation dialog ---- */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Archive Vendor"
        description={
          <>
            This will set <strong>{vendor.name}</strong> to inactive. Purchase orders and projects
            referencing this vendor will keep their association. Are you sure?
          </>
        }
        confirmLabel="Archive"
        onConfirm={() => {
          if (id) {
            deleteMutation.mutate(id, {
              onSuccess: () => navigate('..', { relative: 'path' }),
            });
          }
        }}
        variant="destructive"
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}
