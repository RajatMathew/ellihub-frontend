import { useMemo } from 'react';

import { toCommercialDecimal, toMoneyNumber } from '@/modules/project/lib/commercial-decimal';
import type { PrimeChangeOrderFinancialSummary } from '@/modules/project/schemas/prime-change-order';
import type { PrimeContract } from '@/modules/project/schemas/project-contract.schema';
import type { ProjectDetail } from '@/modules/project/schemas/project.schema';

interface ComputationInput {
  project: ProjectDetail | undefined;
  contract: PrimeContract | undefined;
  primeChangeOrderSummary: PrimeChangeOrderFinancialSummary | undefined;
  totalPOCommitted: number;
  totalSpent?: number;
  /**
   * What has been paid against the project's POs (Monthly Bills and imported
   * payments, from the PO stats). Undefined until it loads, or from an API that
   * does not report it yet.
   */
  paidToDate: number | undefined;
}

export interface PrimeContractComputations {
  original: number;
  approvedCOs: number;
  contractSum: number;
  /** Null when it is not known, so the card shows a dash rather than $0.00. */
  paidToDate: number | null;
  balanceDue: number;
  totalPOCommitted: number;
  totalSpent: number;
  retainagePercent: number;
  retainageAmount: number;
  targetBudgetPercent: number;
  budgetLimit: number;
  budgetRemaining: number;
  spentUtilization: number;
}

export function usePrimeContractComputations({
  project,
  contract,
  primeChangeOrderSummary,
  totalPOCommitted,
  totalSpent,
  paidToDate,
}: ComputationInput): PrimeContractComputations {
  return useMemo(
    () =>
      calculatePrimeContractComputations({
        project,
        contract,
        primeChangeOrderSummary,
        totalPOCommitted,
        totalSpent,
        paidToDate,
      }),
    [project, contract, primeChangeOrderSummary, totalPOCommitted, totalSpent, paidToDate]
  );
}

export function calculatePrimeContractComputations({
  project,
  contract,
  primeChangeOrderSummary,
  totalPOCommitted,
  totalSpent,
  paidToDate: paidToDateInput,
}: ComputationInput): PrimeContractComputations {
  // Prioritize project-level values (flattened backend)
  const original = Number(
    primeChangeOrderSummary?.originalContractValue ??
      project?.contractValue ??
      contract?.contractValue ??
      0
  );

  const approvedCOs = Number(primeChangeOrderSummary?.approvedChangeOrdersTotal ?? 0);
  const contractSum = original + approvedCOs;

  const paidToDate =
    paidToDateInput !== undefined && Number.isFinite(paidToDateInput) ? paidToDateInput : null;
  const balanceDue = toMoneyNumber(toCommercialDecimal(contractSum).minus(paidToDate ?? 0));

  const retainagePercent = Number(project?.retainagePercent ?? contract?.retainagePercent ?? 0);
  const retainageAmount = contractSum * (retainagePercent / 100);

  const targetBudgetPercent = Number(
    project?.targetBudgetPercent ?? contract?.targetBudgetPercent ?? 100
  );
  const budgetLimit = contractSum * (targetBudgetPercent / 100);
  const spentTotal = totalSpent ?? totalPOCommitted;
  const budgetRemaining = budgetLimit - spentTotal;
  const spentUtilization = budgetLimit > 0 ? (spentTotal / budgetLimit) * 100 : 0;

  return {
    original,
    approvedCOs,
    contractSum,
    paidToDate,
    balanceDue,
    totalPOCommitted,
    totalSpent: spentTotal,
    retainagePercent,
    retainageAmount,
    targetBudgetPercent,
    budgetLimit,
    budgetRemaining,
    spentUtilization,
  };
}
