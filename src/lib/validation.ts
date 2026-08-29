/**
 * Validation rules. Pure functions returning issue lists so the same rules can
 * be reused server-side later.
 */

import type { AppState, CostLine, MarketingLine } from '../types/model';

export type IssueLevel = 'error' | 'warning';

export interface ValidationIssue {
  level: IssueLevel;
  /** Dot-path of the offending field, e.g. "directCosts.0.quantity". */
  field: string;
  message: string;
}

export const RULES = {
  quantityProduced: 'Quantity Produced is required and must be greater than 0.',
  quantity: 'Quantity must be 0 or greater.',
  unitPrice: 'Unit Price must be 0 or greater.',
  vat: 'VAT must be between 0% and 100%.',
  exchangeRate: 'Exchange Rate Valuation must be between 0% and 100%.',
  overheads: 'Overheads Per Unit must be 0 or greater.',
  grossMargin: 'Gross Profit Margin must be at least 0% and less than 100%.',
  directRequired: 'Direct Cost is mandatory - add at least one direct cost line.',
} as const;

function checkLine(line: CostLine | MarketingLine, path: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!(line.quantity >= 0)) {
    issues.push({ level: 'error', field: `${path}.quantity`, message: RULES.quantity });
  }
  if (!(line.unitPrice >= 0)) {
    issues.push({ level: 'error', field: `${path}.unitPrice`, message: RULES.unitPrice });
  }
  if (!(line.vatRate >= 0 && line.vatRate <= 1)) {
    issues.push({ level: 'error', field: `${path}.vatRate`, message: RULES.vat });
  }
  return issues;
}

/** Validates the costing model. Sample & Marketing sections may be empty. */
export function validateCosting(state: AppState): ValidationIssue[] {
  const { costing } = state;
  const issues: ValidationIssue[] = [];

  if (!(costing.quantityProduced > 0)) {
    issues.push({ level: 'error', field: 'quantityProduced', message: RULES.quantityProduced });
  }

  // Direct Cost is mandatory: at least one line carrying an actual value.
  const hasDirectValue = costing.directCosts.some(
    (l) => l.quantity > 0 && l.unitPrice > 0,
  );
  if (!hasDirectValue) {
    issues.push({ level: 'warning', field: 'directCosts', message: RULES.directRequired });
  }

  costing.directCosts.forEach((l, i) => issues.push(...checkLine(l, `directCosts.${i}`)));
  costing.sampleCosts.forEach((l, i) => issues.push(...checkLine(l, `sampleCosts.${i}`)));
  costing.marketingExpenses.forEach((l, i) =>
    issues.push(...checkLine(l, `marketingExpenses.${i}`)),
  );

  if (!(costing.overheadsPerUnit >= 0)) {
    issues.push({ level: 'error', field: 'overheadsPerUnit', message: RULES.overheads });
  }
  if (!(costing.exchangeRateValuation >= 0 && costing.exchangeRateValuation <= 1)) {
    issues.push({ level: 'error', field: 'exchangeRateValuation', message: RULES.exchangeRate });
  }

  return issues;
}

/** Validates the pricing model. */
export function validatePricing(state: AppState): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const margin = state.pricing.targetGrossMargin;
  if (!(margin >= 0 && margin < 1)) {
    issues.push({ level: 'error', field: 'targetGrossMargin', message: RULES.grossMargin });
  }
  return issues;
}

export function errorsOnly(issues: ValidationIssue[]): ValidationIssue[] {
  return issues.filter((i) => i.level === 'error');
}

export function issueFor(issues: ValidationIssue[], field: string): ValidationIssue | undefined {
  return issues.find((i) => i.field === field);
}
