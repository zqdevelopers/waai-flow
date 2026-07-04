# Contributing

Thanks for helping improve WAAI Flow.

## Local Setup

1. Install dependencies:

```bash
npm run install:all
```

2. Configure backend:

```bash
cp backend/.env.example backend/.env
cd backend
npx prisma db push
```

3. Run development servers:

```bash
npm run dev
```

## Pull Request Checklist

- Keep changes focused and documented.
- Run `npm run build` before opening a pull request.
- Do not commit `.env`, local database files, `sessions`, `uploads`, or `node_modules`.
- Avoid adding features that enable spam or abusive automation.

## Code Style

- Backend: Express, Prisma, ES modules.
- Frontend: React, Vite, Tailwind CSS classes.
- Prefer clear, small modules over large rewrites.
