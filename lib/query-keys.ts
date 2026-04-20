/**
 * TanStack Query v5 key factories — extend inventory stubs in F5+.
 */

const authRoot = ["auth"] as const;

const inventoryRoot = ["inventory"] as const;

export const queryKeys = {
  auth: {
    all: authRoot,
    /** GET /api/v1/auth/me (future). */
    me: () => [...authRoot, "me"] as const,
  },
  inventory: {
    all: inventoryRoot,
    /** Aligns with plaintext probe in `lib/api/health.ts`. */
    health: () => [...inventoryRoot, "health"] as const,
    products: {
      all: () => [...inventoryRoot, "products"] as const,
      list: (params: {
        page?: number;
        per_page?: number;
        search?: string;
        sort?: string;
        order?: "asc" | "desc";
        category_id?: string;
      }) => [...inventoryRoot, "products", "list", params] as const,
      detail: (id: string) =>
        [...inventoryRoot, "products", "detail", id] as const,
    },
    categories: {
      all: () => [...inventoryRoot, "categories"] as const,
      list: (params: {
        page?: number;
        per_page?: number;
        search?: string;
        sort?: string;
        order?: "asc" | "desc";
      }) => [...inventoryRoot, "categories", "list", params] as const,
      detail: (id: string) =>
        [...inventoryRoot, "categories", "detail", id] as const,
    },
    warehouses: {
      all: () => [...inventoryRoot, "warehouses"] as const,
      list: (params: {
        page?: number;
        per_page?: number;
        search?: string;
        sort?: string;
        order?: "asc" | "desc";
      }) => [...inventoryRoot, "warehouses", "list", params] as const,
      detail: (id: string) =>
        [...inventoryRoot, "warehouses", "detail", id] as const,
    },
  },
} as const;
