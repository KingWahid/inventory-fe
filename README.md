This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## API (Kong)

REST calls go through **`NEXT_PUBLIC_API_BASE_URL`** (see [`.env.example`](.env.example)), usually Kong at `http://localhost:8000`. HTTP client: [`lib/api/`](lib/api/). Plaintext probes: `GET /api/v1/inventory/health`, `GET /api/v1/auth/health` — see [backend/README.md](../backend/README.md).

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

