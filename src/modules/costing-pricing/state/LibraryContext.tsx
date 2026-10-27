/**
 * Product Library state.
 *
 * Owns everything that talks to the database: the list of saved products, the
 * save/open/duplicate/delete actions, and the status of each one. Components
 * render what they find here — they never call the API directly.
 *
 * Loading, error and empty are explicit states rather than an absent list, so
 * the UI can tell "nothing saved yet" apart from "could not reach the server".
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { API_ENABLED, errorMessage } from '@shared/api/client';
import type { ListProductsQuery, ProductSort, SavedProductDetail, SavedProductSummary } from '@shared/contracts/products';

import { createThumbnail } from '../lib/image';
import {
  createProduct,
  deleteProduct,
  duplicateProduct,
  fetchProduct,
  fetchProducts,
  modelHash,
  toAppState,
  toSaveRequest,
  updateProduct,
} from '../lib/productsApi';
import { useApp } from './AppStateContext';

export type ListStatus = 'loading' | 'ready' | 'error';

export interface SaveState {
  status: 'idle' | 'saving' | 'saved' | 'error';
  message: string | null;
  /** When the last successful save happened, for the "Saved HH:MM" label. */
  at: string | null;
}

interface LibraryValue {
  /** Products as last loaded from the database, already filtered and sorted. */
  products: SavedProductSummary[];
  categories: string[];
  /** Total rows in the database, ignoring the current filters. */
  total: number;
  status: ListStatus;
  error: string | null;

  query: ListProductsQuery;
  setSearch: (value: string) => void;
  setCategory: (value: string) => void;
  setSort: (value: ProductSort) => void;
  clearFilters: () => void;
  /** True when filters are hiding products that exist. */
  filtered: boolean;

  refresh: () => Promise<void>;

  saveState: SaveState;
  /** Saves the workspace: updates the linked product, or creates one. */
  save: () => Promise<SavedProductDetail | null>;
  /** Always creates a new product from the workspace. */
  saveAsNew: () => Promise<SavedProductDetail | null>;
  dismissSaveMessage: () => void;

  /** Loads a saved product into the workspace. */
  open: (id: string) => Promise<SavedProductDetail | null>;
  duplicate: (id: string) => Promise<SavedProductDetail | null>;
  remove: (id: string) => Promise<boolean>;
  /** Ids with an action in flight, so rows can show their own spinner. */
  busyIds: string[];

  /** True when the workspace differs from the product it was loaded from. */
  hasUnsavedChanges: boolean;
  savedProductId: string | null;
  /** The saved product the workspace is linked to, if it is in the list. */
  linkedProduct: SavedProductSummary | undefined;
  apiEnabled: boolean;
}

const LibraryContext = createContext<LibraryValue | null>(null);

export function LibraryProvider({ children }: { children: ReactNode }) {
  const { state, dispatch } = useApp();

  const [products, setProducts] = useState<SavedProductSummary[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<ListStatus>(API_ENABLED ? 'loading' : 'error');
  const [error, setError] = useState<string | null>(null);

  const [search, setSearchValue] = useState('');
  const [category, setCategoryValue] = useState('');
  const [sort, setSortValue] = useState<ProductSort>('updated');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [saveState, setSaveState] = useState<SaveState>({ status: 'idle', message: null, at: null });
  const [busyIds, setBusyIds] = useState<string[]>([]);

  // Typing filters the list without a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timer);
  }, [search]);

  const query = useMemo<ListProductsQuery>(
    () => ({ q: debouncedSearch, category, sort }),
    [debouncedSearch, category, sort],
  );

  // Guards against a slow response overwriting a newer one.
  const requestId = useRef(0);

  const load = useCallback(async (next: ListProductsQuery) => {
    const id = ++requestId.current;
    setStatus((current) => (current === 'ready' ? 'ready' : 'loading'));
    try {
      const data = await fetchProducts(next);
      if (id !== requestId.current) return;
      setProducts(data.products);
      setCategories(data.categories);
      setTotal(data.total);
      setError(null);
      setStatus('ready');
    } catch (e) {
      if (id !== requestId.current) return;
      setError(errorMessage(e));
      setStatus('error');
    }
  }, []);

  // The library is loaded when the app opens, and whenever the filters change.
  useEffect(() => {
    void load(query);
  }, [load, query]);

  const withBusy = useCallback(async <T,>(id: string, action: () => Promise<T>): Promise<T> => {
    setBusyIds((ids) => [...ids, id]);
    try {
      return await action();
    } finally {
      setBusyIds((ids) => ids.filter((busy) => busy !== id));
    }
  }, []);

  const persist = useCallback(
    async (mode: 'link' | 'new'): Promise<SavedProductDetail | null> => {
      setSaveState({ status: 'saving', message: null, at: null });
      try {
        const thumbnail = await createThumbnail(state.costing.product.photo?.dataUrl);
        const body = toSaveRequest(state, thumbnail);
        const existingId = mode === 'link' ? state.savedProductId : null;

        let saved: SavedProductDetail;
        try {
          saved = existingId ? await updateProduct(existingId, body) : await createProduct(body);
        } catch (e) {
          // The linked product was deleted elsewhere: keep the user's work by
          // saving it as a new product rather than losing the save.
          if (existingId && e instanceof Error && 'status' in e && (e as { status: number }).status === 404) {
            saved = await createProduct(body);
          } else {
            throw e;
          }
        }

        dispatch({
          type: 'markSaved',
          productId: saved.id,
          savedAt: saved.updatedAt,
          savedHash: modelHash(state),
        });
        setSaveState({
          status: 'saved',
          message: `“${saved.name}” saved to the product library.`,
          at: saved.updatedAt,
        });
        void load(query);
        return saved;
      } catch (e) {
        setSaveState({ status: 'error', message: errorMessage(e), at: null });
        return null;
      }
    },
    [state, dispatch, load, query],
  );

  const save = useCallback(() => persist('link'), [persist]);
  const saveAsNew = useCallback(() => persist('new'), [persist]);

  const open = useCallback(
    async (id: string) => {
      return withBusy(id, async () => {
        try {
          const product = await fetchProduct(id);
          dispatch({ type: 'loadState', state: toAppState(product, state) });
          setSaveState({ status: 'idle', message: null, at: product.updatedAt });
          return product;
        } catch (e) {
          setError(errorMessage(e));
          return null;
        }
      });
    },
    [dispatch, state, withBusy],
  );

  const duplicate = useCallback(
    async (id: string) => {
      return withBusy(id, async () => {
        try {
          const copy = await duplicateProduct(id);
          await load(query);
          return copy;
        } catch (e) {
          setError(errorMessage(e));
          return null;
        }
      });
    },
    [load, query, withBusy],
  );

  const remove = useCallback(
    async (id: string) => {
      return withBusy(id, async () => {
        try {
          await deleteProduct(id);
          // The workspace keeps its figures but is no longer a saved product.
          if (state.savedProductId === id) dispatch({ type: 'unlinkSavedProduct' });
          await load(query);
          return true;
        } catch (e) {
          setError(errorMessage(e));
          return false;
        }
      });
    },
    [dispatch, load, query, state.savedProductId, withBusy],
  );

  const hasUnsavedChanges = useMemo(
    () => state.savedProductId !== null && state.savedHash !== modelHash(state),
    [state],
  );

  const value = useMemo<LibraryValue>(
    () => ({
      products,
      categories,
      total,
      status,
      error,
      query: { q: search, category, sort },
      setSearch: setSearchValue,
      setCategory: setCategoryValue,
      setSort: setSortValue,
      clearFilters: () => {
        setSearchValue('');
        setCategoryValue('');
        setSortValue('updated');
      },
      filtered: Boolean(search || category),
      refresh: () => load(query),
      saveState,
      save,
      saveAsNew,
      dismissSaveMessage: () => setSaveState((s) => ({ ...s, message: null })),
      open,
      duplicate,
      remove,
      busyIds,
      hasUnsavedChanges,
      savedProductId: state.savedProductId,
      linkedProduct: products.find((p) => p.id === state.savedProductId),
      apiEnabled: API_ENABLED,
    }),
    [
      products, categories, total, status, error, search, category, sort, load, query,
      saveState, save, saveAsNew, open, duplicate, remove, busyIds, hasUnsavedChanges,
      state.savedProductId,
    ],
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary(): LibraryValue {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error('useLibrary must be used inside <LibraryProvider>');
  return ctx;
}
