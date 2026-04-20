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
    /** Placeholders — extend when listing APIs ship. */
    products: [...inventoryRoot, "products"] as const,
    categories: [...inventoryRoot, "categories"] as const,
  },
} as const;
