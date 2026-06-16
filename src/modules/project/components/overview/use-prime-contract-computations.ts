import { useMemo } from 'react';

import type { PrimeChangeOrderFinancialSummary } from '@/modules/project/schemas/prime-change-order';
import type { PrimeContract } from '@/modules/project/schemas/project-contract.schema';
import type { ProjectDetail } from '@/modules/project/schemas/project.schema';

interface ComputationInput {
  project: ProjectDetail | undefined;
  contract: PrimeContract | undefined;
  primeChangeOrderSummary: PrimeChangeOrderFinancialSummary | undefined;
  totalPOCommitted: number;
  totalSpent?: number;
  invoiceSummary: unknown;
}

export interface PrimeContractComputations {
  original: number;
  approvedCOs: number;
  contractSum: number;
  paidToDate: number;
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
  invoiceSummary,
}: ComputationInput): PrimeContractComputations {
  return useMemo(() => {
    // Prioritize project-level values (flattened backend)
    const original = Number(
      primeChangeOrderSummary?.originalContractValue ??
        project?.contractValue ??
        contract?.contractValue ??
        0
    );

    const approvedCOs = Number(primeChangeOrderSummary?.approvedChangeOrdersTotal ?? 0);
    const contractSum = original + approvedCOs;

    const summary = invoiceSummary as Record<string, unknown> | null | undefined;
    const paidToDate = Number(summary?.totalPaid ?? 0) || 0;

    const balanceDue = contractSum;

    const retainagePercent = Number(
      project?.retainagePercent ?? contract?.retainagePercent ?? 0
    );
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
  }, [project, contract, primeChangeOrderSummary, totalPOCommitted, totalSpent, invoiceSummary]);
}
