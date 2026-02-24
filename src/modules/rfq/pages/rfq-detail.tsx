import { useCallback, useState } from 'react';

import { useNavigate, useParams } from 'react-router-dom';

import type { VendorRow } from '@modules/rfq/types';

import { AttachmentsSection } from '../components/attachments-section';
import { BidComparisonModal } from '../components/bid-comparison-modal';
import { DeliverablesSection } from '../components/deliverables-section';
import { DetailsSidebar } from '../components/details-sidebar';
import { QuickActionsBar } from '../components/quick-actions-bar';
import { RfqDetailHeader } from '../components/rfq-detail-header';
import { StatCard } from '../components/stat-card';
import { UploadQuotationModal } from '../components/upload-quotation-modal';
import { VendorStatusTable } from '../components/vendor-status-table';
import {
  MOCK_ATTACHMENTS,
  MOCK_DELIVERABLES,
  MOCK_RFQ,
  MOCK_VENDORS,
  formatCurrency,
} from '../constants/rfq.constants';

export default function RfqDetailPage() {
  const { projectId, rfqNumber: _rfqNumber } = useParams<{
    projectId: string;
    rfqNumber: string;
  }>();
  const navigate = useNavigate();
  const rfq = MOCK_RFQ;

  const backPath = projectId ? `/project/${projectId}/rfqs` : '/app/rfqs';

  const [compareOpen, setCompareOpen] = useState(false);
  const handleCloseCompare = useCallback(() => setCompareOpen(false), []);

  const [uploadQuoteVendor, setUploadQuoteVendor] = useState<VendorRow | null>(null);
  const handleCloseUploadQuote = useCallback(() => setUploadQuoteVendor(null), []);

  return (
    <div className="container-fluid py-7.5">
      <RfqDetailHeader rfq={rfq} onBack={() => navigate(backPath)} />

      {/* Summary stats bar */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Track" value={rfq.tradeCategory} />
        <StatCard label="Vendors Invited" value={rfq.vendorsInvited} />
        <StatCard
          label="Quotes Received"
          value={rfq.quotesReceived}
          valueClassName="text-success"
        />
        <StatCard
          label="Lowest Quote"
          value={formatCurrency(rfq.lowestQuote)}
          valueClassName="text-success"
        />
      </div>

      <QuickActionsBar
        quotesReceived={rfq.quotesReceived}
        onCompare={() => setCompareOpen(true)}
      />

      {/* Two-column layout */}
      <div className="flex gap-5 items-start">
        {/* Main column */}
        <div className="min-w-0 flex-1 flex flex-col gap-5">
          <VendorStatusTable
            vendors={MOCK_VENDORS}
            onUploadQuote={setUploadQuoteVendor}
          />
          <AttachmentsSection attachments={MOCK_ATTACHMENTS} />
          <DeliverablesSection deliverables={MOCK_DELIVERABLES} />
        </div>

        {/* Right sidebar */}
        <DetailsSidebar rfq={rfq} />
      </div>

      {/* Bid comparison modal */}
      {compareOpen && <BidComparisonModal onClose={handleCloseCompare} />}

      {/* Upload quotation modal */}
      {uploadQuoteVendor && (
        <UploadQuotationModal vendor={uploadQuoteVendor} onClose={handleCloseUploadQuote} />
      )}
    </div>
  );
}
