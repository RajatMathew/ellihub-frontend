export type LegalSection = {
  title: string;
  body: string[];
};

export const lastUpdated = 'May 8, 2026';

export const privacySections: LegalSection[] = [
  {
    title: 'Overview',
    body: [
      'This Privacy Policy explains how ElliHub collects, uses, stores, and protects information when customers use the ElliHub application, including optional third-party integrations such as QuickBooks Online.',
      'ElliHub is a project finance and construction management workspace used for project records, purchase orders, invoices, RFQs, files, directory records, HR context, vendor records, and related workflows.',
    ],
  },
  {
    title: 'Information we collect',
    body: [
      'We collect account and business information such as user names, email addresses, company details, project records, vendor records, purchase orders, invoices, attachments, notes, status history, and audit activity created or uploaded by users.',
      'When a customer connects QuickBooks Online, we collect connection metadata such as the QuickBooks company identifier, company name when available, OAuth scopes, connection status, token expiration timestamps, and the user who authorized the connection.',
      'For purchase order payment history, ElliHub may retrieve QuickBooks Online transaction data such as transaction type, transaction identifier, document number, transaction date, amount, currency, payee or display name, memo/private note, and last updated timestamp.',
    ],
  },
  {
    title: 'How we use information',
    body: [
      'We use customer information to provide and secure the application, authenticate users, manage project finance workflows, provide support, troubleshoot issues, maintain audit logs, and improve reliability.',
      'QuickBooks Online data is used to display available payment transactions, allow authorized users to link transactions to purchase orders, calculate purchase order payment history, and support internal reconciliation workflows.',
      'We do not use QuickBooks Online data for advertising, and we do not sell QuickBooks Online data.',
    ],
  },
  {
    title: 'QuickBooks Online connection and tokens',
    body: [
      'ElliHub uses OAuth authorization to connect to QuickBooks Online. Access tokens and refresh tokens are stored server-side and are not exposed in the browser.',
      'Refresh tokens are encrypted at rest using an application-managed encryption key. Token values are used only to maintain the authorized QuickBooks Online connection and call the QuickBooks Online API for customer-authorized workflows.',
      'Disconnecting QuickBooks Online revokes access and prevents future QuickBooks Online API calls unless an authorized user reconnects the company.',
    ],
  },
  {
    title: 'Sharing and service providers',
    body: [
      "We do not provide third parties with access to customer QuickBooks Online data except as needed to operate ElliHub, comply with law, protect rights and security, or follow the customer's instructions.",
      'We may use trusted infrastructure, hosting, database, security, logging, and support providers to operate the service. These providers are permitted to process information only for service operation and support purposes.',
    ],
  },
  {
    title: 'Retention',
    body: [
      'We retain customer information for as long as necessary to provide the service, comply with contractual and legal obligations, resolve disputes, enforce agreements, and preserve audit history.',
      'When a QuickBooks Online transaction link is removed from a purchase order, ElliHub may retain the historical link record, including removal timestamp and user, for audit purposes. The transaction can then be linked to another purchase order if permitted by the application rules.',
    ],
  },
  {
    title: 'Security',
    body: [
      'We use administrative, technical, and organizational safeguards designed to protect customer information, including HTTPS in production, access controls, server-side token storage, encrypted QuickBooks refresh tokens, and audit logging.',
      'No method of transmission or storage is completely secure. Customers should maintain strong account credentials and limit access to authorized users.',
    ],
  },
  {
    title: 'Customer choices',
    body: [
      'Customers may disconnect QuickBooks Online from within ElliHub or through QuickBooks Online app management. Disconnecting stops new access to QuickBooks Online data.',
      'Customers may request access, correction, export, or deletion of their information by contacting support, subject to contractual, legal, security, and audit retention obligations.',
    ],
  },
  {
    title: 'Cookies and similar technologies',
    body: [
      'ElliHub may use cookies or similar technologies for authentication, session management, security, preferences, and application performance. Required authentication and security cookies are necessary for the service to function.',
    ],
  },
  {
    title: 'International use',
    body: [
      'Customer information may be processed in countries where ElliHub or its service providers operate. Customers are responsible for using the service in compliance with laws that apply to their organization and users.',
    ],
  },
  {
    title: 'Children',
    body: [
      'ElliHub is intended for business use and is not directed to children. We do not knowingly collect personal information from children.',
    ],
  },
  {
    title: 'Changes to this policy',
    body: [
      'We may update this Privacy Policy from time to time. The updated policy will be posted on this page with a new last updated date.',
    ],
  },
  {
    title: 'Contact',
    body: [
      'For privacy questions or requests, contact ElliHub at support@ellihub.com.',
    ],
  },
];

export const eulaSections: LegalSection[] = [
  {
    title: 'Acceptance of this agreement',
    body: [
      'This End User License Agreement governs access to and use of ElliHub. By accessing or using ElliHub, the customer and its authorized users agree to this agreement.',
      'If a separate written subscription, services, or enterprise agreement applies, that separate agreement controls to the extent it conflicts with this EULA.',
    ],
  },
  {
    title: 'License and permitted use',
    body: [
      "Subject to this EULA and the customer's applicable order or service agreement, ElliHub grants the customer a limited, non-exclusive, non-transferable, revocable right to access and use ElliHub for internal business purposes.",
      'Authorized users may use the application for project finance workflows, including purchase orders, invoices, RFQs, files, vendor information, reporting, and supported integrations.',
    ],
  },
  {
    title: 'Accounts and responsibility',
    body: [
      'Customers are responsible for maintaining accurate account information, managing authorized users, protecting login credentials, and all activity that occurs under their accounts.',
      'Customers must ensure that only authorized personnel connect third-party services, including QuickBooks Online, and that those users have permission to authorize access to the relevant company data.',
    ],
  },
  {
    title: 'QuickBooks Online integration',
    body: [
      'ElliHub may allow authorized users to connect a QuickBooks Online company through OAuth authorization. The integration is designed to retrieve eligible payment transaction data and link selected transactions to purchase order payment history.',
      'Customers are responsible for the accuracy of their accounting records and for reviewing any data imported, displayed, linked, or used in ElliHub. ElliHub does not replace accounting, tax, legal, or financial advice.',
      'QuickBooks Online availability, data, APIs, and authorization workflows are provided by Intuit Inc. and are subject to Intuit terms and policies.',
    ],
  },
  {
    title: 'Restrictions',
    body: [
      'Users may not misuse the service, attempt unauthorized access, interfere with security controls, reverse engineer the application, copy or resell the service, use the service to violate law, or upload malicious code.',
      'Users may not use QuickBooks Online data accessed through ElliHub for any purpose other than the customer-authorized functional use of the application.',
    ],
  },
  {
    title: 'Customer data',
    body: [
      'Customers retain ownership of data they submit to ElliHub. Customers grant ElliHub the rights necessary to host, process, transmit, display, and use customer data to provide, secure, support, and improve the service.',
      'Customers represent that they have the rights and permissions required to submit data to ElliHub and authorize integrations with third-party services.',
    ],
  },
  {
    title: 'Fees and subscriptions',
    body: [
      'Use of ElliHub may be subject to fees, subscriptions, order forms, or service agreements. Pricing and payment terms are provided separately to each customer.',
      'Unless otherwise stated in a separate agreement, fees are non-refundable except as required by law.',
    ],
  },
  {
    title: 'Confidentiality',
    body: [
      'Each party may receive confidential business, technical, financial, or operational information from the other. Each party will use reasonable care to protect confidential information and use it only for purposes related to the service.',
    ],
  },
  {
    title: 'Intellectual property',
    body: [
      'ElliHub and its software, interfaces, workflows, design, documentation, and related materials are owned by ElliHub or its licensors. No rights are granted except those expressly stated in this EULA.',
    ],
  },
  {
    title: 'Third-party services',
    body: [
      'The service may interoperate with third-party services such as QuickBooks Online. ElliHub is not responsible for third-party services, their availability, or changes to their APIs, terms, or functionality.',
      'Customers are responsible for maintaining their third-party accounts and complying with third-party terms.',
    ],
  },
  {
    title: 'Suspension and termination',
    body: [
      'ElliHub may suspend or terminate access if a customer or user violates this EULA, creates security risk, fails to pay applicable fees, or uses the service unlawfully.',
      "Upon termination, the customer's right to use the service ends. Certain records may be retained as required for legal, security, billing, backup, and audit purposes.",
    ],
  },
  {
    title: 'Disclaimers',
    body: [
      'ElliHub is provided on an as-is and as-available basis unless a separate written agreement provides otherwise. We disclaim warranties of merchantability, fitness for a particular purpose, non-infringement, and uninterrupted or error-free operation to the maximum extent permitted by law.',
    ],
  },
  {
    title: 'Limitation of liability',
    body: [
      'To the maximum extent permitted by law, ElliHub will not be liable for indirect, incidental, special, consequential, exemplary, or punitive damages, or for lost profits, revenue, goodwill, or data.',
      "Except where prohibited by law or a separate written agreement, ElliHub's total liability is limited to the amounts paid by the customer for the service during the three months before the event giving rise to the claim.",
    ],
  },
  {
    title: 'Governing law',
    body: [
      'Unless a separate written agreement states otherwise, this EULA is governed by the laws of the State of New York, USA, without regard to conflict of laws rules.',
    ],
  },
  {
    title: 'Contact',
    body: ['For questions about this EULA, contact ElliHub at support@ellihub.com.'],
  },
];
