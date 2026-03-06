# Energy Monitoring Frontend

This is the **Next.js frontend** for the Energy Monitoring system. It is designed to work with the backend API located in `../backend`.

## 🚀 Getting Started (Local Development)

### 1) Install dependencies

```bash
cd energymonitoring
npm install
```

### 2) Configure environment

Copy the example environment file and adjust values as needed:

```bash
cp .env.local.example .env.local
```

Key values:

- `NEXT_PUBLIC_API_URL` – URL for the backend API (default: `http://localhost:3001/api`)
- `NEXTAUTH_URL` – URL for the NextAuth callback (default: `http://localhost:3000`)
- `NEXTAUTH_SECRET` – secret used by NextAuth for session encryption

### 3) Run the frontend

```bash
npm run dev
```

Open http://localhost:3000 to view the app.

---

## 🧩 What’s Included

- **Next.js App Router** (`app/`)
- Authentication via **NextAuth**
- API client helper in `lib/api.ts` (uses `NEXT_PUBLIC_API_URL`)
- UI components under `components/`
- Theme support with `next-themes`
- Data visualization with `recharts` and `leaflet`

---

## 📌 Useful Scripts

- `npm run dev` – start development server
- `npm run build` – production build
- `npm run start` – run production build
- `npm run lint` – run ESLint

---

## 🔗 Backend Integration

The frontend expects the backend API to be running at `NEXT_PUBLIC_API_URL` and uses JWT (via NextAuth) for auth.

If you need to run both services locally, see the root README (`../README.md`) or run the provided `docker-compose.yml` which includes both backend and frontend.
