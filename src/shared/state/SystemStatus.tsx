/**
 * System status channel.
 *
 * Modules report problems that the user must know about at system level —
 * storage refused, a sync failed — and the Finance Support shell renders them
 * in one place. Keeps the shell free of any module-specific import.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export interface SystemIssue {
  key: string;
  message: string;
  tone: 'warn' | 'error';
}

interface SystemStatusValue {
  issues: SystemIssue[];
  report: (issue: SystemIssue) => void;
  clear: (key: string) => void;
}

const SystemStatusContext = createContext<SystemStatusValue | null>(null);

export function SystemStatusProvider({ children }: { children: ReactNode }) {
  const [issues, setIssues] = useState<SystemIssue[]>([]);

  const report = useCallback((issue: SystemIssue) => {
    setIssues((current) =>
      current.some((i) => i.key === issue.key && i.message === issue.message)
        ? current
        : [...current.filter((i) => i.key !== issue.key), issue],
    );
  }, []);

  const clear = useCallback((key: string) => {
    setIssues((current) => (current.some((i) => i.key === key) ? current.filter((i) => i.key !== key) : current));
  }, []);

  const value = useMemo(() => ({ issues, report, clear }), [issues, report, clear]);

  return <SystemStatusContext.Provider value={value}>{children}</SystemStatusContext.Provider>;
}

export function useSystemStatus(): SystemStatusValue {
  const ctx = useContext(SystemStatusContext);
  if (!ctx) throw new Error('useSystemStatus must be used inside <SystemStatusProvider>');
  return ctx;
}

/** Declares one issue for as long as `message` is set. */
export function useReportStatus(key: string, message: string | null, tone: SystemIssue['tone'] = 'warn') {
  const { report, clear } = useSystemStatus();

  useEffect(() => {
    if (message) report({ key, message, tone });
    else clear(key);
  }, [key, message, tone, report, clear]);
}
