import { useState } from 'react';

import {
  Briefcase,
  Building2,
  DollarSign,
  ExternalLink,
  FileText,
  FolderOpen,
  Globe,
  Mail,
  MapPin,
  MoreHorizontal,
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
import { formatCurrency } from '@app/lib/helpers';

import {
  ComingSoonPlaceholder,
  ContactCard,
  DetailSidebar,
  getContactDisplayEmail,
  getContactDisplayPhone,
} from '../components';
import { PAYMENT_TERMS_LABELS } from '../constants/shared.constants';
import { useDeleteGCMutation, useGCDetailQuery, useGCStatsQuery } from '../hooks';
import type { GCStatus, GCTypeCode } from '../schemas/gc.schema';

/* ---- Display maps ---- */

const GC_TYPE_BADGE_VARIANTS: Record<GCTypeCode, 'primary' | 'success' | 'info' | 'warning'> = {
  PUBLIC_STATE: 'primary',
  PRIVATE: 'success',
  INSTITUTIONAL: 'info',
  CIVIL: 'warning',
  SCA: 'primary',
};

const GC_STATUS_COLORS: Record<GCStatus, string> = {
  ACTIVE: 'bg-success',
  PROSPECTING: 'bg-primary',
  INACTIVE: 'bg-muted-foreground',
};

const GC_STATUS_LABELS: Record<GCStatus, string> = {
  ACTIVE: 'Active',
  PROSPECTING: 'Prospect',
  INACTIVE: 'Inactive',
};

/* ---- Page ---- */

export function GCDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: gc, isLoading } = useGCDetailQuery(id ?? '');
  const { data: stats } = useGCStatsQuery();
  const deleteMutation = useDeleteGCMutation();

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  /* ---- Computed values from real API data ---- */
  const contactLinks = gc?.contactLinks ?? [];
  const projectCount = gc?.projects?.length ?? 0;
  const typeName = gc?.gcType?.label || gc?.gcType?.name || 'Unknown';
  const typeCode = gc?.gcType?.code as GCTypeCode | undefined;
  const resolvedStats = stats ?? { totalGCs: 0, activeProjects: 0, totalCommitted: 0 };

  if (isLoading) {
    return (
      <div className="container-fluid py-7.5">
        <div className="text-sm text-muted-foreground">Loading general contractor...</div>
      </div>
    );
  }

  if (!gc) {
    return (
      <div className="container-fluid py-7.5">
        <div className="text-sm text-muted-foreground">General contractor not found.</div>
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
                Directory
              </Link>
              {' / '}
              <Link to=".." relative="path" className="hover:text-foreground">
                General Contractors
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <ToolbarPageTitle>{gc.name}</ToolbarPageTitle>
              <Badge
                variant={typeCode ? (GC_TYPE_BADGE_VARIANTS[typeCode] ?? 'primary') : 'primary'}
                appearance="outline"
                size="sm"
              >
                {typeName}
              </Badge>
              <div className="flex items-center gap-1.5">
                <span
                  className={`size-2 rounded-full ${GC_STATUS_COLORS[gc.status] ?? 'bg-muted-foreground'}`}
                />
                <span className="text-sm text-muted-foreground">
                  {GC_STATUS_LABELS[gc.status] ?? gc.status}
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
                  Archive GC
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
          {/* Stats — from /general-contractors/stats API */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            <StatsCard
              icon={<DollarSign className="size-5 text-success" />}
              bgClass="bg-success/10"
              label="Total Committed"
              value={formatCurrency(resolvedStats.totalCommitted)}
              description="Portfolio value"
            />
            <StatsCard
              icon={<FolderOpen className="size-5 text-info" />}
              bgClass="bg-info/10"
              label="Total Projects"
              value={projectCount}
              description="Linked projects"
            />
            <StatsCard
              icon={<Briefcase className="size-5 text-warning" />}
              bgClass="bg-warning/10"
              label="Team Contacts"
              value={contactLinks.length}
              description="Linked contacts"
            />
            <StatsCard
              icon={<ShieldCheck className="size-5 text-primary" />}
              bgClass="bg-primary/10"
              label="Retainage"
              value={`${gc.retainagePercent}%`}
              description={gc.paymentTerms ? (PAYMENT_TERMS_LABELS[gc.paymentTerms] ?? gc.paymentTerms) : 'No terms'}
            />
          </div>

          {/* Main tabs */}
          <Tabs defaultValue="overview">
            <TabsList variant="line">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="projects">Projects</TabsTrigger>
              <TabsTrigger value="change-orders">Change Orders</TabsTrigger>
              <TabsTrigger value="prime-payments">Prime Payments</TabsTrigger>
            </TabsList>

            {/* ---- Overview tab ---- */}
            <TabsContent value="overview">
              <div className="space-y-5">
                {/* General Info + GC Team Directory */}
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                  {/* General Info — all from API */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                        General Info
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-lg border border-border bg-accent">
                          <Building2 className="size-4 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                            Entity Type
                          </div>
                          <div className="text-sm font-medium text-foreground">
                            {typeName}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-lg border border-border bg-accent">
                          <Briefcase className="size-4 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                            Status
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`size-2 rounded-full ${GC_STATUS_COLORS[gc.status] ?? 'bg-muted-foreground'}`}
                            />
                            <span className="text-sm font-medium text-foreground">
                              {GC_STATUS_LABELS[gc.status] ?? gc.status}
                            </span>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-lg border border-border bg-accent">
                          <FolderOpen className="size-4 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                            Total Projects
                          </div>
                          <div className="text-sm font-medium text-foreground">
                            {projectCount}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-lg border border-border bg-accent">
                          <DollarSign className="size-4 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                            Payment Terms
                          </div>
                          <div className="text-sm font-medium text-foreground">
                            {gc.paymentTerms ? (PAYMENT_TERMS_LABELS[gc.paymentTerms] ?? gc.paymentTerms) : '—'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-lg border border-border bg-accent">
                          <DollarSign className="size-4 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                            Retainage %
                          </div>
                          <div className="text-sm font-medium text-foreground">
                            {gc.retainagePercent}%
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* GC Team Directory — from API contactLinks */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                        GC Team Directory
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {contactLinks.length > 0 ? (
                        contactLinks.map((link) => (
                          <ContactCard
                            key={link.id}
                            fullName={link.contact?.fullName || `Contact ID: ${link.contactId.slice(-6)}`}
                            email={getContactDisplayEmail(link)}
                            phone={getContactDisplayPhone(link)}
                            isPrimary={link.isPrimary}
                          />
                        ))
                      ) : (
                        <div className="flex flex-col items-center gap-2 py-4 text-center">
                          <UserMinus className="size-8 text-muted-foreground/40" />
                          <p className="text-sm text-muted-foreground">No contacts linked yet.</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* ---- Projects tab (API returns empty projects[]) ---- */}
            <TabsContent value="projects">
              <Card>
                <CardContent>
                  <ComingSoonPlaceholder icon={FolderOpen} title="Projects" />
                </CardContent>
              </Card>
            </TabsContent>

            {/* ---- Change Orders tab (no API endpoint yet) ---- */}
            <TabsContent value="change-orders">
              <Card>
                <CardContent>
                  <ComingSoonPlaceholder icon={FileText} title="Prime Change Orders" />
                </CardContent>
              </Card>
            </TabsContent>

            {/* ---- Prime Payments tab (no API endpoint yet) ---- */}
            <TabsContent value="prime-payments">
              <Card>
                <CardContent>
                  <ComingSoonPlaceholder icon={DollarSign} title="Prime Payments" />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* ---- Right sidebar ---- */}
        <DetailSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)}>
          <div className="space-y-6 pt-2">
            {/* Compliance & Safety (no API — placeholder) */}
            <div>
              <div className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-3">
                Compliance & Safety Docs
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

            {/* Main Office — from API */}
            <div>
              <div className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-3">
                Main Office
              </div>
              <Card>
                <CardContent className="p-4 space-y-3">
                  {gc.address ? (
                    <div className="flex items-start gap-3">
                      <MapPin className="size-4 text-muted-foreground mt-0.5" />
                      <span className="text-sm text-foreground">{gc.address}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">No address on file</span>
                  )}
                  {gc.phone && (
                    <>
                      <Separator />
                      <div className="flex items-center gap-3">
                        <Phone className="size-4 text-muted-foreground" />
                        <a href={`tel:${gc.phone}`} className="text-sm text-foreground hover:text-primary">
                          {gc.phone}
                        </a>
                      </div>
                    </>
                  )}
                  {gc.email && (
                    <>
                      <Separator />
                      <div className="flex items-center gap-3">
                        <Mail className="size-4 text-muted-foreground" />
                        <a href={`mailto:${gc.email}`} className="text-sm text-foreground hover:text-primary">
                          {gc.email}
                        </a>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* GC Website — from API */}
            {gc.website && (
              <div>
                <div className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-3">
                  GC Website
                </div>
                <Card>
                  <CardContent className="p-4">
                    <a
                      href={gc.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:text-primary/80"
                    >
                      <Globe className="size-4" />
                      {gc.website.replace(/^https?:\/\//, '')}
                      <ExternalLink className="size-3" />
                    </a>
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
        title="Archive General Contractor"
        description={
          <>
            This will set <strong>{gc.name}</strong> to inactive. Projects that reference this GC
            will keep their association. Are you sure?
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
