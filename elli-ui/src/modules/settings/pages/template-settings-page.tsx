import { useEffect, useMemo, useState, type ReactNode } from 'react';

import { Forbidden } from '@/app/components/error/forbidden';
import { ModuleLoader } from '@/app/components/loader/elegant';
import { ResourcePageHeader } from '@/app/components/resource-page-header';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader } from '@/app/components/ui/card';
import { ConfirmDialog } from '@/app/components/ui/confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Field, FieldDescription, FieldLabel } from '@/app/components/ui/field';
import { Input } from '@/app/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Switch } from '@/app/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Textarea } from '@/app/components/ui/textarea';
import { useAccess } from '@/app/contexts/access-context';
import {
  usePdfNoticeConfigQuery,
  usePdfTermsConfigQuery,
  useUpdatePdfNoticeSettingsMutation,
  useUpdatePdfTermsSettingsMutation,
} from '@/modules/pdf/hooks';
import type { PdfNoticeSection, PdfTermsSection } from '@/modules/pdf/schemas';
import { TermsEditor } from '@/modules/project/components/purchase-order/purchase-order-pdf-dialog';
import {
  useCreateTemplateSettingMutation,
  useDeleteTemplateSettingMutation,
  useSetDefaultTemplateSettingMutation,
  useTemplateSettingsQuery,
  useUpdateTemplateSettingMutation,
} from '@/modules/settings/hooks/template-settings.hooks';
import type {
  MailFeatureTemplateValue,
  MailSenderGroupTemplateValue,
  MailSignatureTemplateValue,
  PdfNoticeTemplateValue,
  PdfProfileTemplateValue,
  PdfTermsTemplateValue,
  TemplateSetting,
  TemplateSettingInput,
  TemplateSettingKind,
} from '@/modules/settings/schemas/template-settings.schema';
import { Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

type Option = { label: string; value: string };
type TemplateTab = {
  kind: TemplateSettingKind;
  label: string;
  title: string;
  description: string;
  addLabel: string;
};

const TEMPLATE_TABS: TemplateTab[] = [
  {
    kind: 'PDF_TERMS',
    label: 'PDF Terms',
    title: 'PDF Terms and Conditions',
    description: 'Terms that can be added to RFQ and purchase order PDFs.',
    addLabel: 'Add Terms',
  },
  {
    kind: 'PDF_NOTICE',
    label: 'PDF Warnings',
    title: 'PDF Warning Boxes',
    description: 'Yellow warning callouts that can be added to RFQ and purchase order PDFs.',
    addLabel: 'Add Warning',
  },
  {
    kind: 'MAIL_FEATURE',
    label: 'Emails',
    title: 'Email Messages',
    description: 'Default subjects and messages used when the app sends emails.',
    addLabel: 'Add Email',
  },
  {
    kind: 'MAIL_SENDER_GROUP',
    label: 'Senders',
    title: 'Sender Emails',
    description: 'Approved from-addresses for each email area.',
    addLabel: 'Add Sender Set',
  },
  {
    kind: 'PDF_PROFILE',
    label: 'PDF Profile',
    title: 'PDF Company Profile',
    description: 'Company information used in generated PDFs.',
    addLabel: 'Add Profile',
  },
  {
    kind: 'MAIL_SIGNATURE',
    label: 'Signature',
    title: 'Email Signature',
    description: 'Default signature appended to outgoing emails.',
    addLabel: 'Add Signature',
  },
];

const PDF_TERMS_SECTION_OPTIONS: Array<Option & { value: PdfTermsSection }> = [
  { value: 'global', label: 'Global' },
  { value: 'rfq', label: 'RFQ' },
  { value: 'purchaseOrder', label: 'PO' },
  { value: 'subChangeOrder', label: 'SCO' },
];

const PDF_NOTICE_SECTION_OPTIONS: Array<Option & { value: PdfNoticeSection }> = [
  { value: 'global', label: 'Global' },
  { value: 'rfq', label: 'RFQ' },
  { value: 'purchaseOrder', label: 'PO' },
  { value: 'subChangeOrder', label: 'SCO' },
];

const KEY_OPTIONS: Record<TemplateSettingKind, Option[]> = {
  PDF_TERMS: PDF_TERMS_SECTION_OPTIONS,
  PDF_NOTICE: PDF_NOTICE_SECTION_OPTIONS,
  MAIL_FEATURE: [
    { value: 'auth.passwordReset', label: 'Forgot password email' },
    { value: 'rfq.vendorRequest', label: 'RFQ email to one vendor' },
    { value: 'rfq.vendorRequestAll', label: 'RFQ email to all vendors' },
    { value: 'purchaseOrder.vendorIssue', label: 'Purchase order email' },
    { value: 'subChangeOrder.vendorApproval', label: 'SCO email' },
  ],
  MAIL_SENDER_GROUP: [
    { value: 'auth', label: 'Account emails' },
    { value: 'rfq', label: 'RFQ emails' },
    { value: 'po', label: 'Purchase order emails' },
    { value: 'changeOrder', label: 'Change order emails' },
  ],
  PDF_PROFILE: [{ value: 'elliDefault', label: 'Default company profile' }],
  MAIL_SIGNATURE: [{ value: 'global', label: 'Default email signature' }],
};

const DEFAULT_SENDER_GROUP_BY_FEATURE: Record<string, string> = {
  'auth.passwordReset': 'auth',
  'rfq.vendorRequest': 'rfq',
  'rfq.vendorRequestAll': 'rfq',
  'purchaseOrder.vendorIssue': 'po',
  'subChangeOrder.vendorApproval': 'changeOrder',
};

const DEFAULT_PDF_PROFILE_BY_FEATURE: Record<string, string | undefined> = {
  'auth.passwordReset': undefined,
  'rfq.vendorRequest': 'elliDefault',
  'rfq.vendorRequestAll': 'elliDefault',
  'purchaseOrder.vendorIssue': 'elliDefault',
  'subChangeOrder.vendorApproval': 'elliDefault',
};

const EMAIL_VARIABLES: Record<string, string[]> = {
  'auth.passwordReset': ['userName', 'resetUrl', 'expiresInMinutes'],
  'rfq.vendorRequest': [
    'vendorName',
    'projectName',
    'projectNumber',
    'rfqNumber',
    'rfqTitle',
    'bidDeadline',
  ],
  'rfq.vendorRequestAll': [
    'vendorName',
    'recipientCount',
    'projectName',
    'projectNumber',
    'rfqNumber',
    'rfqTitle',
    'bidDeadline',
  ],
  'purchaseOrder.vendorIssue': [
    'vendorName',
    'projectName',
    'projectNumber',
    'poNumber',
    'poDescription',
    'expectedDate',
    'issuedDate',
    'tradeCategory',
    'total',
  ],
  'subChangeOrder.vendorApproval': [
    'vendorName',
    'projectName',
    'projectNumber',
    'scoNumber',
    'scoTitle',
    'poNumber',
    'changeType',
    'approvedDate',
    'total',
  ],
};

const EMAIL_PREVIEW_VALUES: Record<string, string> = {
  userName: 'Blake Turner',
  resetUrl: 'https://elli-app/reset-password',
  expiresInMinutes: '60',
  vendorName: 'ABC Supply',
  recipientCount: '4',
  projectName: 'PS 101 Renovation',
  projectNumber: 'ELLI-2408',
  rfqNumber: 'RFQ-014',
  rfqTitle: 'Classroom Casework',
  bidDeadline: 'Jun 18, 2026',
  poNumber: 'PO-135',
  poDescription: 'Classroom millwork materials',
  expectedDate: 'Jul 15, 2026',
  issuedDate: 'Jun 13, 2026',
  tradeCategory: 'Material',
  total: '$36,720.00',
  scoNumber: 'PO-135-01',
  scoTitle: 'Additional hardware allowance',
  changeType: 'Added Scope',
  approvedDate: 'Jun 20, 2026',
};

const DEFAULT_SIGNATURE_IMAGES: MailSignatureTemplateValue['images'] = [
  {
    fileName: 'elli-logo.png',
    contentId: 'elli-logo',
    width: 135,
    height: 41,
    alt: 'Elli NY Design Corp',
    line: 1,
  },
  {
    fileName: 'signature-ribbon.png',
    contentId: 'signature-ribbon',
    width: 67,
    height: 47,
    alt: 'Certification ribbon',
    line: 1,
  },
  {
    fileName: 'mwbe-certified.png',
    contentId: 'mwbe-certified',
    width: 110,
    height: 28,
    alt: 'M/WBE Certified',
    line: 2,
  },
  {
    fileName: 'equal-opportunity.png',
    contentId: 'equal-opportunity',
    width: 179,
    height: 26,
    alt: 'Equal Opportunity Employer',
    line: 2,
  },
  {
    fileName: 'nycsca.png',
    contentId: 'nycsca',
    width: 226,
    height: 30,
    alt: 'NYCSCA',
    line: 2,
  },
];

type TemplateFormState = {
  kind: TemplateSettingKind;
  key: string;
  name: string;
  isDefault: boolean;
  html: string;
  noticeTitle: string;
  subject: string;
  body: string;
  senderGroup: string;
  pdfProfileKey: string;
  allowedEmails: string;
  defaultEmail: string;
  companyName: string;
  addressLines: string;
  companyPhone: string;
  logoPath: string;
  shipToName: string;
  signatureName: string;
  signatureRole: string;
  signatureEmail: string;
  signatureAddress: string;
  signaturePhone: string;
  signatureFax: string;
  certificationLine: string;
  signatureImages: MailSignatureTemplateValue['images'];
};

function splitList(value: string): string[] {
  return value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeEmailList(value: string): string[] {
  return splitList(value).map((email) => email.toLowerCase());
}

function tabForKind(kind: TemplateSettingKind) {
  return TEMPLATE_TABS.find((tab) => tab.kind === kind) ?? TEMPLATE_TABS[0];
}

function optionsForKind(kind: TemplateSettingKind, currentKey?: string): Option[] {
  const options = KEY_OPTIONS[kind];
  if (!currentKey || options.some((option) => option.value === currentKey)) return options;
  return [...options, { value: currentKey, label: currentKey }];
}

function labelForKey(kind: TemplateSettingKind, key: string) {
  return optionsForKind(kind, key).find((option) => option.value === key)?.label ?? key;
}

function defaultNameForKey(kind: TemplateSettingKind, key: string) {
  return labelForKey(kind, key);
}

function renderTemplatePreview(value: string) {
  return value.replace(/{{\s*([\w.]+)\s*}}/g, (_, key: string) => EMAIL_PREVIEW_VALUES[key] ?? '');
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildTermsPreviewDocument(html: string) {
  return `<!doctype html><html><head><style>
    body{margin:0;background:#f6f7f9;font-family:Arial,Helvetica,sans-serif;color:#111827}
    .page{box-sizing:border-box;width:100%;min-height:100%;background:white;padding:28px;border:1px solid #e5e7eb}
    h1{font-size:18px;margin:0 0 18px}
    p{font-size:12px;line-height:1.6;margin:0 0 10px}
  </style></head><body><div class="page"><h1>Terms and Conditions</h1>${html || '<p></p>'}</div></body></html>`;
}

function buildNoticePreviewDocument(title: string, html: string) {
  const safeTitle = escapeHtml(title || 'Important Notice');

  return `<!doctype html><html><head><style>
    body{margin:0;background:#f6f7f9;font-family:Arial,Helvetica,sans-serif;color:#111827}
    .page{box-sizing:border-box;width:100%;min-height:100%;background:white;padding:28px;border:1px solid #e5e7eb}
    .notice{border:1px solid #f2cf83;border-left:5px solid #d89b1d;border-radius:8px;background:#fff7df;color:#2f2412;padding:18px 20px}
    .title{display:flex;gap:10px;align-items:center;font-size:13px;line-height:1.4;font-weight:700;letter-spacing:.06em;text-transform:uppercase;margin-bottom:10px}
    .icon{display:inline-flex;width:18px;height:18px;align-items:center;justify-content:center;border-radius:999px;background:#d89b1d;color:white;font-size:11px;font-weight:700}
    .content{color:#3f3421;font-size:13px;line-height:1.6;font-weight:400}
    .content p{margin:0 0 7px}
    .content p:last-child{margin-bottom:0}
  </style></head><body><div class="page"><section class="notice"><div class="title"><span class="icon">!</span><span>${safeTitle}</span></div><div class="content">${html || '<p></p>'}</div></section></div></body></html>`;
}

function getMailAssetUrl(fileName: string) {
  return `${import.meta.env.VITE_API_BASE_URL}/api/v1/mail/assets/${encodeURIComponent(fileName)}`;
}

function defaultForm(kind: TemplateSettingKind, initialKey?: string): TemplateFormState {
  const key = initialKey ?? KEY_OPTIONS[kind][0].value;

  return {
    kind,
    key,
    name: defaultNameForKey(kind, key),
    isDefault: false,
    html: '',
    noticeTitle:
      kind === 'PDF_NOTICE' ? 'DO NOT START FABRICATION BEFORE READING THIS' : '',
    subject: '',
    body: '',
    senderGroup: DEFAULT_SENDER_GROUP_BY_FEATURE[key] ?? '',
    pdfProfileKey: DEFAULT_PDF_PROFILE_BY_FEATURE[key] ?? '',
    allowedEmails: '',
    defaultEmail: '',
    companyName: '',
    addressLines: '',
    companyPhone: '',
    logoPath: 'assets/logo.png',
    shipToName: '',
    signatureName: '',
    signatureRole: '',
    signatureEmail: '',
    signatureAddress: '',
    signaturePhone: '',
    signatureFax: '',
    certificationLine: '',
    signatureImages: kind === 'MAIL_SIGNATURE' ? DEFAULT_SIGNATURE_IMAGES : [],
  };
}

function formFromTemplate(template: TemplateSetting): TemplateFormState {
  const form = defaultForm(template.kind);
  const common = {
    ...form,
    kind: template.kind,
    key: template.key,
    name: template.name,
    isDefault: template.isDefault,
  };

  switch (template.kind) {
    case 'PDF_TERMS': {
      const value = template.value as PdfTermsTemplateValue;
      return { ...common, html: value.html ?? '' };
    }
    case 'PDF_NOTICE': {
      const value = template.value as PdfNoticeTemplateValue;
      return { ...common, noticeTitle: value.title ?? '', html: value.bodyHtml ?? '' };
    }
    case 'MAIL_FEATURE': {
      const value = template.value as MailFeatureTemplateValue;
      return {
        ...common,
        subject: value.subject ?? '',
        body: value.body ?? '',
        senderGroup: value.senderGroup ?? DEFAULT_SENDER_GROUP_BY_FEATURE[template.key] ?? '',
        pdfProfileKey: value.pdfProfileKey ?? DEFAULT_PDF_PROFILE_BY_FEATURE[template.key] ?? '',
      };
    }
    case 'MAIL_SENDER_GROUP': {
      const value = template.value as MailSenderGroupTemplateValue;
      return {
        ...common,
        allowedEmails: value.allowed.join('\n'),
        defaultEmail: value.default ?? '',
      };
    }
    case 'PDF_PROFILE': {
      const value = template.value as PdfProfileTemplateValue;
      return {
        ...common,
        companyName: value.company.name,
        addressLines: value.company.addressLines.join('\n'),
        companyPhone: value.company.phone,
        logoPath: value.company.logoPath,
        shipToName: value.shipToName ?? '',
      };
    }
    case 'MAIL_SIGNATURE': {
      const value = template.value as MailSignatureTemplateValue;
      return {
        ...common,
        signatureName: value.name,
        signatureRole: value.role,
        signatureEmail: value.email,
        signatureAddress: value.address,
        signaturePhone: value.phone,
        signatureFax: value.fax,
        certificationLine: value.certificationLine,
        signatureImages: value.images,
      };
    }
  }
}

function buildTemplateInput(form: TemplateFormState): TemplateSettingInput | null {
  const name = form.name.trim();
  if (!name) {
    toast.error('Template name is required.');
    return null;
  }

  const common = {
    kind: form.kind,
    key: form.key,
    name,
    description: null,
    tags: [],
    isDefault: form.isDefault,
    status: 'ACTIVE' as const,
  };

  switch (form.kind) {
    case 'PDF_TERMS':
      if (!form.html.trim()) {
        toast.error('Terms content is required.');
        return null;
      }
      return { ...common, value: { html: form.html.trim() } };
    case 'PDF_NOTICE':
      if (!form.noticeTitle.trim() || !form.html.trim()) {
        toast.error('Warning title and content are required.');
        return null;
      }
      return {
        ...common,
        value: {
          title: form.noticeTitle.trim(),
          bodyHtml: form.html.trim(),
        },
      };
    case 'MAIL_FEATURE':
      if (!form.subject.trim() || !form.body.trim()) {
        toast.error('Email subject and message are required.');
        return null;
      }
      return {
        ...common,
        value: {
          subject: form.subject.trim(),
          body: form.body.trim(),
          senderGroup: form.senderGroup.trim() || DEFAULT_SENDER_GROUP_BY_FEATURE[form.key],
          pdfProfileKey: form.pdfProfileKey.trim() || DEFAULT_PDF_PROFILE_BY_FEATURE[form.key],
        },
      };
    case 'MAIL_SENDER_GROUP': {
      const defaultEmail = form.defaultEmail.trim().toLowerCase();
      const allowed = normalizeEmailList(form.allowedEmails);
      const allowedWithDefault =
        defaultEmail && !allowed.includes(defaultEmail) ? [defaultEmail, ...allowed] : allowed;

      if (!defaultEmail) {
        toast.error('Default sender email is required.');
        return null;
      }
      if (!allowedWithDefault.length) {
        toast.error('At least one approved sender email is required.');
        return null;
      }

      return {
        ...common,
        value: { allowed: allowedWithDefault, default: defaultEmail },
      };
    }
    case 'PDF_PROFILE':
      if (!form.companyName.trim() || !form.companyPhone.trim() || !form.addressLines.trim()) {
        toast.error('Company name, address, and phone are required.');
        return null;
      }
      return {
        ...common,
        value: {
          company: {
            name: form.companyName.trim(),
            addressLines: splitList(form.addressLines),
            phone: form.companyPhone.trim(),
            logoPath: form.logoPath.trim() || 'assets/logo.png',
          },
          shipToName: form.shipToName.trim() || undefined,
        },
      };
    case 'MAIL_SIGNATURE':
      if (
        !form.signatureName.trim() ||
        !form.signatureRole.trim() ||
        !form.signatureEmail.trim() ||
        !form.signatureAddress.trim() ||
        !form.signaturePhone.trim()
      ) {
        toast.error('Signature name, role, email, address, and phone are required.');
        return null;
      }
      return {
        ...common,
        value: {
          name: form.signatureName.trim(),
          role: form.signatureRole.trim(),
          email: form.signatureEmail.trim().toLowerCase(),
          address: form.signatureAddress.trim(),
          phone: form.signaturePhone.trim(),
          fax: form.signatureFax.trim(),
          certificationLine: form.certificationLine.trim(),
          images: form.signatureImages,
        },
      };
  }
}

export default function TemplateSettingsPage() {
  const { can, isLoading } = useAccess();
  const [activeKind, setActiveKind] = useState<TemplateSettingKind>('PDF_TERMS');
  const [activePdfTermsSection, setActivePdfTermsSection] =
    useState<PdfTermsSection>('purchaseOrder');
  const [activePdfNoticeSection, setActivePdfNoticeSection] =
    useState<PdfNoticeSection>('purchaseOrder');
  const [search, setSearch] = useState('');
  const [editingTemplate, setEditingTemplate] = useState<TemplateSetting | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TemplateSetting | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const activeTab = tabForKind(activeKind);
  const templatesQuery = useTemplateSettingsQuery({ kind: activeKind, status: 'ACTIVE' });
  const pdfTermsConfigQuery = usePdfTermsConfigQuery(activePdfTermsSection);
  const pdfNoticeConfigQuery = usePdfNoticeConfigQuery(activePdfNoticeSection);
  const createMutation = useCreateTemplateSettingMutation();
  const updateMutation = useUpdateTemplateSettingMutation();
  const setDefaultMutation = useSetDefaultTemplateSettingMutation();
  const deleteMutation = useDeleteTemplateSettingMutation();
  const updatePdfTermsSettingsMutation = useUpdatePdfTermsSettingsMutation();
  const updatePdfNoticeSettingsMutation = useUpdatePdfNoticeSettingsMutation();
  const canRead = can('template', 'read');
  const canCreate = can('template', 'create');
  const canUpdate = can('template', 'update');
  const canSetDefault = can('template', 'set-default');
  const canDelete = can('template', 'delete');
  const isPdfTermsKind = activeKind === 'PDF_TERMS';
  const isPdfNoticeKind = activeKind === 'PDF_NOTICE';
  const showPdfSectionControls = isPdfTermsKind || isPdfNoticeKind;
  const activePdfSection = isPdfNoticeKind ? activePdfNoticeSection : activePdfTermsSection;
  const activePdfSectionOptions = isPdfNoticeKind
    ? PDF_NOTICE_SECTION_OPTIONS
    : PDF_TERMS_SECTION_OPTIONS;
  const activePdfConfig = isPdfNoticeKind ? pdfNoticeConfigQuery.data : pdfTermsConfigQuery.data;
  const activePdfConfigIsLoading = isPdfNoticeKind
    ? pdfNoticeConfigQuery.isLoading
    : pdfTermsConfigQuery.isLoading;

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const templates =
      showPdfSectionControls
        ? (templatesQuery.data ?? []).filter((template) => template.key === activePdfSection)
        : (templatesQuery.data ?? []);
    if (!query) return templates;

    return templates.filter(
      (template) =>
        template.name.toLowerCase().includes(query) ||
        labelForKey(template.kind, template.key).toLowerCase().includes(query)
    );
  }, [activePdfSection, search, showPdfSectionControls, templatesQuery.data]);

  if (isLoading) return <ModuleLoader />;
  if (!canRead) return <Forbidden />;

  function openCreate() {
    setEditingTemplate(null);
    setDialogOpen(true);
  }

  function handlePdfTermsSectionChange(value: string) {
    if (isPdfNoticeKind) {
      setActivePdfNoticeSection(value as PdfNoticeSection);
    } else {
      setActivePdfTermsSection(value as PdfTermsSection);
    }
    setSearch('');
  }

  function handlePdfTermsIncludeDefaultChange(includeByDefault: boolean) {
    if (isPdfNoticeKind) {
      updatePdfNoticeSettingsMutation.mutate({
        section: activePdfNoticeSection,
        includeByDefault,
      });
      return;
    }

    updatePdfTermsSettingsMutation.mutate({ section: activePdfTermsSection, includeByDefault });
  }

  function handleSubmit(input: TemplateSettingInput) {
    if (editingTemplate) {
      updateMutation.mutate(
        { ...input, id: editingTemplate.id },
        { onSuccess: () => setDialogOpen(false) }
      );
      return;
    }

    createMutation.mutate(input, { onSuccess: () => setDialogOpen(false) });
  }

  return (
    <div className="container-fluid py-7.5">
      <ResourcePageHeader
        title="Template Settings"
        totalCount={filtered.length}
        hasActiveFilters={!!search}
        description="Manage the default wording and sender details used by PDFs and emails."
        addLabel={activeTab.addLabel}
        addIcon={<Plus className="size-4" />}
        onAdd={canCreate ? openCreate : undefined}
      />

      <Card>
        <CardHeader className="gap-4">
          <Tabs
            value={activeKind}
            onValueChange={(value) => {
              setActiveKind(value as TemplateSettingKind);
              setSearch('');
            }}
          >
            <TabsList className="flex h-auto flex-wrap justify-start">
              {TEMPLATE_TABS.map((tab) => (
                <TabsTrigger key={tab.kind} value={tab.kind}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-1">
              <h2 className="text-base font-semibold">{activeTab.title}</h2>
              <p className="text-sm text-muted-foreground">{activeTab.description}</p>
            </div>
            <Input
              value={search}
              className="lg:max-w-xs"
              placeholder="Search..."
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          {showPdfSectionControls && (
            <div className="rounded-md border bg-muted/30 p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-2">
                  <FieldLabel>{isPdfNoticeKind ? 'Warning Section' : 'Terms Section'}</FieldLabel>
                  <Tabs value={activePdfSection} onValueChange={handlePdfTermsSectionChange}>
                    <TabsList className="flex h-auto flex-wrap justify-start">
                      {activePdfSectionOptions.map((option) => (
                        <TabsTrigger key={option.value} value={option.value}>
                          {option.label}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                </div>

                {activePdfSection !== 'global' && (
                  <label className="flex max-w-md items-center justify-between gap-4 rounded-md border bg-background p-3 text-sm">
                    <span className="space-y-1">
                      <span className="block font-medium">
                        Add {isPdfNoticeKind ? 'warning box' : 'terms'} by default
                      </span>
                      <span className="block text-muted-foreground">
                        New {labelForKey(activeKind, activePdfSection)} PDFs start with{' '}
                        {isPdfNoticeKind ? 'the warning box' : 'terms'} enabled.
                      </span>
                    </span>
                    <Switch
                      checked={activePdfConfig?.includeByDefault ?? false}
                      disabled={
                        !canUpdate ||
                        activePdfConfigIsLoading ||
                        updatePdfTermsSettingsMutation.isPending ||
                        updatePdfNoticeSettingsMutation.isPending
                      }
                      onCheckedChange={handlePdfTermsIncludeDefaultChange}
                    />
                  </label>
                )}
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent>
          {templatesQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-16 w-full" />
              ))}
            </div>
          ) : templatesQuery.isError ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              Failed to load template settings.
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
              No templates found.
            </div>
          ) : (
            <div className="divide-y rounded-md border">
              {filtered.map((template) => (
                <div
                  key={template.id}
                  className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="truncate font-semibold">{template.name}</div>
                      {template.isDefault && (
                        <Badge variant="success" appearance="light">
                          Default
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {labelForKey(template.kind, template.key)}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    {canSetDefault && !template.isDefault && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={setDefaultMutation.isPending}
                        onClick={() => setDefaultMutation.mutate(template.id)}
                      >
                        <Star className="size-4" />
                        Make Default
                      </Button>
                    )}
                    {canUpdate && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingTemplate(template);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil className="size-4" />
                        Edit
                      </Button>
                    )}
                    {canDelete && !template.isDefault && (
                      <Button
                        variant="outline"
                        size="sm"
                        mode="icon"
                        aria-label={`Delete ${template.name}`}
                        onClick={() => setDeleteTarget(template)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <TemplateSettingDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        activeKind={activeKind}
        activeKey={showPdfSectionControls ? activePdfSection : undefined}
        template={editingTemplate}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Template"
        description={
          <>
            Delete <strong>{deleteTarget?.name}</strong>? The current default cannot be deleted.
          </>
        }
        confirmLabel="Delete"
        variant="destructive"
        isPending={deleteMutation.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
        }}
      />
    </div>
  );
}

function TemplatePreview({ form }: { form: TemplateFormState }) {
  if (form.kind === 'PDF_TERMS') {
    return (
      <PreviewPanel title="PDF Preview">
        <iframe
          title="Terms preview"
          sandbox=""
          srcDoc={buildTermsPreviewDocument(form.html)}
          className="h-[520px] w-full rounded-md border bg-white"
        />
      </PreviewPanel>
    );
  }

  if (form.kind === 'PDF_NOTICE') {
    return (
      <PreviewPanel title="Warning Preview">
        <iframe
          title="Warning preview"
          sandbox=""
          srcDoc={buildNoticePreviewDocument(form.noticeTitle, form.html)}
          className="h-[360px] w-full rounded-md border bg-white"
        />
      </PreviewPanel>
    );
  }

  if (form.kind === 'MAIL_FEATURE') {
    const subjectPreview = renderTemplatePreview(form.subject);
    const bodyPreview = renderTemplatePreview(form.body);
    const hasGeneratedPdf = form.key !== 'auth.passwordReset' && !!form.pdfProfileKey;

    return (
      <PreviewPanel title="Email Preview">
        <div className="rounded-md border bg-white text-slate-950 shadow-xs">
          <div className="border-b p-4">
            <div className="text-xs font-medium uppercase tracking-widest text-slate-500">
              Subject
            </div>
            <div className="mt-1 text-sm font-semibold">
              {subjectPreview || 'Subject preview'}
            </div>
          </div>
          <div className="space-y-4 p-4">
            <div className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
              {bodyPreview || 'Message preview'}
            </div>
            {hasGeneratedPdf && (
              <div className="rounded-md border bg-slate-50 p-3 text-xs text-slate-600">
                Generated RFQ PDF will be attached.
              </div>
            )}
          </div>
        </div>
      </PreviewPanel>
    );
  }

  if (form.kind === 'MAIL_SENDER_GROUP') {
    const senders = normalizeEmailList(form.allowedEmails);

    return (
      <PreviewPanel title="Sender Preview">
        <div className="space-y-4 rounded-md border bg-white p-4 text-sm text-slate-950">
          <div>
            <div className="text-xs font-medium uppercase tracking-widest text-slate-500">
              Default Sender
            </div>
            <div className="mt-1 font-semibold">{form.defaultEmail || 'No default sender'}</div>
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-widest text-slate-500">
              Approved Senders
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {senders.length > 0 ? (
                senders.map((email) => (
                  <Badge key={email} variant="outline">
                    {email}
                  </Badge>
                ))
              ) : (
                <span className="text-slate-500">No approved senders</span>
              )}
            </div>
          </div>
        </div>
      </PreviewPanel>
    );
  }

  if (form.kind === 'PDF_PROFILE') {
    return (
      <PreviewPanel title="PDF Header Preview">
        <div className="rounded-md border bg-white p-5 text-slate-950 shadow-xs">
          <div className="flex items-start justify-between gap-4 border-b pb-5">
            <div>
              <div className="text-base font-bold">{form.companyName || 'Company Name'}</div>
              <div className="mt-2 whitespace-pre-line text-xs leading-5 text-slate-600">
                {form.addressLines || 'Company address'}
              </div>
              <div className="mt-1 text-xs text-slate-600">{form.companyPhone || 'Phone'}</div>
            </div>
            <div className="rounded-md border bg-slate-50 px-3 py-2 text-xs text-slate-500">
              {form.logoPath || 'Logo'}
            </div>
          </div>
          {form.shipToName && (
            <div className="pt-5">
              <div className="text-xs font-medium uppercase tracking-widest text-slate-500">
                Ship To
              </div>
              <div className="mt-1 text-sm font-semibold">{form.shipToName}</div>
            </div>
          )}
        </div>
      </PreviewPanel>
    );
  }

  return (
    <PreviewPanel title="Signature Preview">
      <EmailSignaturePreview form={form} />
    </PreviewPanel>
  );
}

function PreviewPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <aside className="self-start lg:sticky lg:top-0">
      <div className="mb-2 text-sm font-medium">{title}</div>
      <div className="rounded-md border bg-white p-3 shadow-xs">{children}</div>
    </aside>
  );
}

function EmailSignaturePreview({ form }: { form: TemplateFormState }) {
  return (
    <div
      className="rounded-md border bg-white p-4"
      style={{ fontFamily: 'Aptos, Arial, sans-serif' }}
    >
      <SignatureText>Thank you,</SignatureText>
      <SignatureText>{form.signatureName || 'Name'}</SignatureText>
      <SignatureText>{form.signatureRole || 'Role'}</SignatureText>
      <SignatureImageLine images={form.signatureImages} line={1} />
      <SignatureText>{form.signatureAddress || 'Address'}</SignatureText>
      <SignatureText>
        Tel: {form.signaturePhone || 'Phone'}, Fax: {form.signatureFax || 'Fax'}
      </SignatureText>
      <SignatureText>
        Email:{' '}
        <a
          href={`mailto:${form.signatureEmail || 'email@example.com'}`}
          target="_blank"
          rel="noreferrer"
          style={{ color: '#1155cc' }}
        >
          {form.signatureEmail || 'email@example.com'}
        </a>
      </SignatureText>
      <SignatureText>
        <strong>
          <em>{form.certificationLine || 'Certification line'}</em>
        </strong>
      </SignatureText>
      <SignatureImageLine images={form.signatureImages} line={2} />
    </div>
  );
}

function SignatureText({ children }: { children: ReactNode }) {
  return (
    <p
      style={{
        textAlign: 'start',
        color: '#0a2f41',
        backgroundColor: '#ffffff',
        fontSize: 16,
        fontFamily: 'Aptos, sans-serif',
        margin: '0 0 8px',
      }}
    >
      {children}
    </p>
  );
}

function SignatureImageLine({
  images,
  line,
}: {
  images: MailSignatureTemplateValue['images'];
  line: number;
}) {
  const lineImages = images.filter((image) => image.line === line);
  if (!lineImages.length) return null;

  return (
    <p
      style={{
        textAlign: 'start',
        color: '#0a2f41',
        backgroundColor: '#ffffff',
        fontSize: 16,
        fontFamily: 'Aptos, sans-serif',
        margin: '0 0 8px',
      }}
    >
      {lineImages.map((image) => (
        <img
          key={`${image.line}-${image.fileName}`}
          src={getMailAssetUrl(image.fileName)}
          alt={image.alt}
          width={image.width}
          height={image.height}
          style={{
            display: 'inline-block',
            verticalAlign: 'middle',
            border: 0,
            marginRight: 4,
          }}
        />
      ))}
    </p>
  );
}

function TemplateSettingDialog({
  open,
  onOpenChange,
  activeKind,
  activeKey,
  template,
  isSubmitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeKind: TemplateSettingKind;
  activeKey?: string;
  template: TemplateSetting | null;
  isSubmitting: boolean;
  onSubmit: (input: TemplateSettingInput) => void;
}) {
  const [form, setForm] = useState<TemplateFormState>(() =>
    template ? formFromTemplate(template) : defaultForm(activeKind, activeKey)
  );
  const isLockedDefault = template?.isDefault === true;
  const tab = tabForKind(form.kind);
  const keyOptions = optionsForKind(form.kind, form.key);
  const shouldShowKeySelect = !template && !activeKey && keyOptions.length > 1;

  useEffect(() => {
    if (!open) return;
    setForm(template ? formFromTemplate(template) : defaultForm(activeKind, activeKey));
  }, [activeKey, activeKind, open, template]);

  function patch(patch: Partial<TemplateFormState>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function handleKeyChange(key: string) {
    patch({
      key,
      name: defaultNameForKey(form.kind, key),
      senderGroup: DEFAULT_SENDER_GROUP_BY_FEATURE[key] ?? form.senderGroup,
      pdfProfileKey: DEFAULT_PDF_PROFILE_BY_FEATURE[key] ?? '',
    });
  }

  function submit() {
    const input = buildTemplateInput(form);
    if (input) onSubmit(input);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-6xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template ? `Edit ${tab.title}` : tab.addLabel}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.95fr)]">
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              {shouldShowKeySelect && (
                <Field className="sm:col-span-2">
                  <FieldLabel>{form.kind === 'MAIL_FEATURE' ? 'Email Type' : 'Area'}</FieldLabel>
                  <Select value={form.key} onValueChange={handleKeyChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {keyOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
              {!shouldShowKeySelect && keyOptions.length > 1 && (
                <div className="rounded-md border bg-background p-3 text-sm sm:col-span-2">
                  <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    {form.kind === 'MAIL_FEATURE' ? 'Email Type' : 'Area'}
                  </div>
                  <div className="mt-1 font-medium">{labelForKey(form.kind, form.key)}</div>
                </div>
              )}

              <Field>
                <FieldLabel>Template Name</FieldLabel>
                <Input
                  value={form.name}
                  onChange={(event) => patch({ name: event.target.value })}
                />
              </Field>

              <label className="flex items-center gap-2 rounded-md border bg-background p-3 text-sm sm:col-span-2">
                <input
                  type="checkbox"
                  className="accent-primary"
                  checked={form.isDefault}
                  disabled={isLockedDefault}
                  onChange={(event) => patch({ isDefault: event.target.checked })}
                />
                Use this as the default
              </label>
            </div>

            <TemplateValueFields form={form} patch={patch} />
          </div>

          <TemplatePreview form={form} />
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={isSubmitting} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={isSubmitting} onClick={submit}>
            {isSubmitting ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TemplateValueFields({
  form,
  patch,
}: {
  form: TemplateFormState;
  patch: (patch: Partial<TemplateFormState>) => void;
}) {
  if (form.kind === 'PDF_TERMS') {
    return (
      <Field>
        <FieldLabel>Terms Content</FieldLabel>
        <div className="h-[360px]">
          <TermsEditor value={form.html} onChange={(html) => patch({ html })} />
        </div>
        <FieldDescription>Use the toolbar for formatting. The preview updates on the right.</FieldDescription>
      </Field>
    );
  }

  if (form.kind === 'PDF_NOTICE') {
    return (
      <div className="space-y-4">
        <Field>
          <FieldLabel>Warning Title</FieldLabel>
          <Input
            value={form.noticeTitle}
            placeholder="DO NOT START FABRICATION BEFORE READING THIS"
            onChange={(event) => patch({ noticeTitle: event.target.value })}
          />
        </Field>

        <Field>
          <FieldLabel>Warning Message</FieldLabel>
          <div className="h-[320px]">
            <TermsEditor value={form.html} onChange={(html) => patch({ html })} />
          </div>
          <FieldDescription>
            This appears as a yellow warning box in generated PDFs.
          </FieldDescription>
        </Field>
      </div>
    );
  }

  if (form.kind === 'MAIL_FEATURE') {
    const variables = EMAIL_VARIABLES[form.key] ?? [];
    const showPdfAttachment = form.key !== 'auth.passwordReset';

    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel>Sender Group</FieldLabel>
          <Select
            value={form.senderGroup || DEFAULT_SENDER_GROUP_BY_FEATURE[form.key] || 'rfq'}
            onValueChange={(value) => patch({ senderGroup: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {KEY_OPTIONS.MAIL_SENDER_GROUP.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        {showPdfAttachment && (
          <Field>
            <FieldLabel>RFQ PDF Attachment</FieldLabel>
            <Select
              value={form.pdfProfileKey || 'none'}
              onValueChange={(value) => patch({ pdfProfileKey: value === 'none' ? '' : value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Do not attach generated PDF</SelectItem>
                <SelectItem value="elliDefault">Attach generated RFQ PDF</SelectItem>
              </SelectContent>
            </Select>
            <FieldDescription>Uses the PDF Company Profile for the PDF header.</FieldDescription>
          </Field>
        )}

        <Field className="sm:col-span-2">
          <FieldLabel>Subject</FieldLabel>
          <Input
            value={form.subject}
            placeholder="Example: RFQ {{rfqNumber}} - {{projectName}}"
            onChange={(event) => patch({ subject: event.target.value })}
          />
        </Field>

        <Field className="sm:col-span-2">
          <FieldLabel>Message</FieldLabel>
          <Textarea
            value={form.body}
            rows={10}
            placeholder="Write the default email message."
            onChange={(event) => patch({ body: event.target.value })}
          />
        </Field>
        {variables.length > 0 && (
          <div className="space-y-2 sm:col-span-2">
            <div className="text-sm font-medium">Available Variables</div>
            <div className="flex flex-wrap gap-1.5">
              {variables.map((variable) => (
                <code
                  key={variable}
                  className="rounded-md border bg-muted px-2 py-1 text-xs text-muted-foreground"
                >
                  {`{{${variable}}}`}
                </code>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (form.kind === 'MAIL_SENDER_GROUP') {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel>Default Sender</FieldLabel>
          <Input
            value={form.defaultEmail}
            placeholder="purchasing@example.com"
            onChange={(event) => patch({ defaultEmail: event.target.value })}
          />
        </Field>

        <Field className="sm:col-span-2">
          <FieldLabel>Approved Senders</FieldLabel>
          <Textarea
            value={form.allowedEmails}
            rows={6}
            placeholder="One email per line"
            onChange={(event) => patch({ allowedEmails: event.target.value })}
          />
          <FieldDescription>The default sender is added automatically if it is missing.</FieldDescription>
        </Field>
      </div>
    );
  }

  if (form.kind === 'PDF_PROFILE') {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel>Company Name</FieldLabel>
          <Input
            value={form.companyName}
            onChange={(event) => patch({ companyName: event.target.value })}
          />
        </Field>

        <Field>
          <FieldLabel>Phone</FieldLabel>
          <Input
            value={form.companyPhone}
            onChange={(event) => patch({ companyPhone: event.target.value })}
          />
        </Field>

        <Field className="sm:col-span-2">
          <FieldLabel>Address</FieldLabel>
          <Textarea
            value={form.addressLines}
            rows={3}
            placeholder="One address line per row"
            onChange={(event) => patch({ addressLines: event.target.value })}
          />
        </Field>

        <Field>
          <FieldLabel>Logo Path</FieldLabel>
          <Input
            value={form.logoPath}
            placeholder="assets/logo.png"
            onChange={(event) => patch({ logoPath: event.target.value })}
          />
        </Field>

        <Field>
          <FieldLabel>Ship To Name</FieldLabel>
          <Input
            value={form.shipToName}
            onChange={(event) => patch({ shipToName: event.target.value })}
          />
        </Field>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field>
        <FieldLabel>Name</FieldLabel>
        <Input
          value={form.signatureName}
          onChange={(event) => patch({ signatureName: event.target.value })}
        />
      </Field>

      <Field>
        <FieldLabel>Role</FieldLabel>
        <Input
          value={form.signatureRole}
          onChange={(event) => patch({ signatureRole: event.target.value })}
        />
      </Field>

      <Field>
        <FieldLabel>Email</FieldLabel>
        <Input
          value={form.signatureEmail}
          onChange={(event) => patch({ signatureEmail: event.target.value })}
        />
      </Field>

      <Field>
        <FieldLabel>Phone</FieldLabel>
        <Input
          value={form.signaturePhone}
          onChange={(event) => patch({ signaturePhone: event.target.value })}
        />
      </Field>

      <Field>
        <FieldLabel>Fax</FieldLabel>
        <Input
          value={form.signatureFax}
          onChange={(event) => patch({ signatureFax: event.target.value })}
        />
      </Field>

      <Field className="sm:col-span-2">
        <FieldLabel>Address</FieldLabel>
        <Textarea
          value={form.signatureAddress}
          rows={2}
          onChange={(event) => patch({ signatureAddress: event.target.value })}
        />
      </Field>

      <Field className="sm:col-span-2">
        <FieldLabel>Certification Line</FieldLabel>
        <Textarea
          value={form.certificationLine}
          rows={2}
          onChange={(event) => patch({ certificationLine: event.target.value })}
        />
      </Field>
    </div>
  );
}
