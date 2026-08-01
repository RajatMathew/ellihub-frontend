export type EmailProvider = 'gmail' | 'outlook' | 'zoho';

export const EMAIL_PROVIDER_DETAILS = {
  gmail: {
    accountLabel: 'Google',
    connectLabel: 'Continue with Google',
    reconnectLabel: 'Gmail',
    iconUrl: 'https://developers.google.com/static/identity/images/g-logo.png',
  },
  outlook: {
    accountLabel: 'Microsoft Outlook',
    connectLabel: 'Continue with Microsoft',
    reconnectLabel: 'Outlook',
    iconUrl:
      'https://learn.microsoft.com/en-us/entra/identity-platform/media/howto-add-branding-in-apps/ms-symbollockup_mssymbol_19.svg',
  },
  zoho: {
    accountLabel: 'Zoho Mail',
    connectLabel: 'Continue with Zoho Mail',
    reconnectLabel: 'Zoho Mail',
    iconUrl: 'https://www.zohowebstatic.com/sites/zweb/images/productlogos/mail.svg',
  },
} as const satisfies Record<
  EmailProvider,
  {
    accountLabel: string;
    connectLabel: string;
    reconnectLabel: string;
    iconUrl: string;
  }
>;
