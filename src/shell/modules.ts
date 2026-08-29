/**
 * ---------------------------------------------------------------------------
 * FINANCE SUPPORT — MODULE REGISTRY
 * ---------------------------------------------------------------------------
 * Finance Support is a platform: each area of finance and accounting is a
 * self-contained module under src/modules/, and this registry is the only
 * place the shell learns about them.
 *
 * Adding a module is two steps:
 *   1. create src/modules/<id>/ exporting a FinanceModule (see the costing
 *      module for the shape: pages, provider, header actions, print documents)
 *   2. add it to MODULES below
 *
 * Nothing else in the shell needs to change: navigation, routing, the home
 * page and the module switcher are all derived from this list.
 * ---------------------------------------------------------------------------
 */

import type { ComponentType, ReactNode } from 'react';

import { costingPricingModule } from '@modules/costing-pricing';

/** Areas of the finance function, used to group the registry. */
export type ModuleGroup =
  | 'Costing & Pricing'
  | 'Planning'
  | 'Receivables'
  | 'Payables'
  | 'Inventory'
  | 'Accounting'
  | 'Payroll'
  | 'Treasury'
  | 'Tax'
  | 'Reporting';

/** One page inside a module — becomes a tab in the module navigation. */
export interface ModulePage {
  /** Path segment below the module's base path, e.g. "costing". */
  path: string;
  label: string;
  element: ReactNode;
}

export interface AvailableModule {
  id: string;
  name: string;
  description: string;
  group: ModuleGroup;
  status: 'available';
  /** Route prefix, e.g. "/costing-pricing". */
  basePath: string;
  /** One or two characters shown in the module tile and the shell brand. */
  mark: string;
  pages: ModulePage[];
  /** Wraps the whole app so the module's state survives navigation. */
  Provider?: ComponentType<{ children: ReactNode }>;
  /** Buttons contributed to the shell header while the module is open. */
  Actions?: ComponentType;
  /** Hidden printable documents, mounted while the module is open. */
  PrintDocuments?: ComponentType;
  /** Optional live figures shown on the module's home tile. */
  HomeSummary?: ComponentType;
}

/** A module that is part of the plan but not built yet. Never linked. */
export interface PlannedModule {
  id: string;
  name: string;
  description: string;
  group: ModuleGroup;
  status: 'planned';
}

export type FinanceModule = AvailableModule | PlannedModule;

/**
 * The system's scope. Only `available` modules are routed and linked — planned
 * entries are listed on the home page as a roadmap and are deliberately inert,
 * so nothing in the UI pretends to work before it exists.
 */
export const MODULES: FinanceModule[] = [
  costingPricingModule,

  {
    id: 'budgeting',
    name: 'Budgeting & Forecasting',
    description: 'Annual budgets, rolling forecasts and variance against actuals.',
    group: 'Planning',
    status: 'planned',
  },
  {
    id: 'receivables',
    name: 'Invoicing & Receivables',
    description: 'Customer invoices, ageing, collections and credit notes.',
    group: 'Receivables',
    status: 'planned',
  },
  {
    id: 'payables',
    name: 'Purchasing & Payables',
    description: 'Supplier bills, purchase orders, ageing and payment runs.',
    group: 'Payables',
    status: 'planned',
  },
  {
    id: 'inventory',
    name: 'Inventory & Stock Valuation',
    description: 'Stock movements, valuation methods and cost of goods sold.',
    group: 'Inventory',
    status: 'planned',
  },
  {
    id: 'ledger',
    name: 'General Ledger',
    description: 'Chart of accounts, journals, trial balance and period close.',
    group: 'Accounting',
    status: 'planned',
  },
  {
    id: 'fixed-assets',
    name: 'Fixed Assets',
    description: 'Asset register, depreciation schedules and disposals.',
    group: 'Accounting',
    status: 'planned',
  },
  {
    id: 'payroll',
    name: 'Payroll',
    description: 'Salaries, social insurance, payroll taxes and cost allocation.',
    group: 'Payroll',
    status: 'planned',
  },
  {
    id: 'treasury',
    name: 'Cash & Treasury',
    description: 'Bank accounts, cash-flow position and reconciliation.',
    group: 'Treasury',
    status: 'planned',
  },
  {
    id: 'tax',
    name: 'Tax & VAT Returns',
    description: 'VAT returns, withholding tax and filing calendar.',
    group: 'Tax',
    status: 'planned',
  },
  {
    id: 'reporting',
    name: 'Financial Reporting',
    description: 'Profit & loss, balance sheet, cash-flow statement and KPIs.',
    group: 'Reporting',
    status: 'planned',
  },
];

export const AVAILABLE_MODULES = MODULES.filter(
  (m): m is AvailableModule => m.status === 'available',
);

export const PLANNED_MODULES = MODULES.filter(
  (m): m is PlannedModule => m.status === 'planned',
);

/** The module a path belongs to, or undefined on the home page. */
export function findModuleByPath(pathname: string): AvailableModule | undefined {
  return AVAILABLE_MODULES.find(
    (m) => pathname === m.basePath || pathname.startsWith(`${m.basePath}/`),
  );
}

/** System-level identity, used by the shell and the printed documents. */
export const SYSTEM = {
  name: 'Finance Support',
  tagline: 'Finance & accounting workspace',
} as const;
