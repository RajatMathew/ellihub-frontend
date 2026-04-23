import { useMemo } from 'react';

import type { PrimeContract } from '@modules/project/schemas/project-contract.schema';
import type { PCOPipeline } from '@modules/project/schemas/pco.schema';

import type { ProjectDetail } from '@modules/project/schemas/project.schema';

interface ComputationInput {
  project: ProjectDetail | undefined;
  contract: PrimeContract | undefined;
  pipeline: PCOPipeline | undefined;
  totalPOCommitted: number;
  invoiceSummary: unknown;
}

export interface PrimeContractComputations {
  original: number;
  approvedCOs: number;
  contractSum: number;
  paidToDate: number;
  balanceDue: number;
  totalPOCommitted: number;
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
  pipeline,
  totalPOCommitted,
  invoiceSummary,
}: ComputationInput): PrimeContractComputations {
  return useMemo(() => {
    // Prioritize project-level values (flattened backend)
    const original = Number(project?.contractValue ?? contract?.contractValue ?? 0);

    const approvedAmt = pipeline?.approved?.totalAmount ?? 0;
    const executedAmt = pipeline?.executed?.totalAmount ?? 0;
    const approvedCOs = approvedAmt + executedAmt;

    const contractSum = original + approvedCOs;

    const summary = invoiceSummary as Record<string, unknown> | null | undefined;
    const paidToDate = Number(summary?.totalPaid ?? 0) || 0;

    const balanceDue = contractSum - paidToDate;

    const retainagePercent = Number(
      project?.retainagePercent ?? contract?.retainagePercent ?? 0
    );
    const retainageAmount = contractSum * (retainagePercent / 100);

    const targetBudgetPercent = Number(
      project?.targetBudgetPercent ?? contract?.targetBudgetPercent ?? 100
    );
    const budgetLimit = contractSum * (targetBudgetPercent / 100);
    const budgetRemaining = budgetLimit - totalPOCommitted;
    const spentUtilization = budgetLimit > 0 ? (totalPOCommitted / budgetLimit) * 100 : 0;

    return {
      original,
      approvedCOs,
      contractSum,
      paidToDate,
      balanceDue,
      totalPOCommitted,
      retainagePercent,
      retainageAmount,
      targetBudgetPercent,
      budgetLimit,
      budgetRemaining,
      spentUtilization,
    };
  }, [project, contract, pipeline, totalPOCommitted, invoiceSummary]);
}
