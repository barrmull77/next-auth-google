
# Next Auth Google Example
This is a simple demo project to familiarize myself with authentication flows in Next.js applications.
It implements simple registration, login, and social authentication (Google) using NextAuth.js.

The authentication demo lives under `src/app`. Its `/api/me` returns only the
authenticated demo user's name and email; `/api/users` is disabled until an
admin authorization policy is implemented. Demo users use hardcoded passwords
and registration is not persistent. Run locally only; do not deploy this demo
or use it for real accounts.

### Technologies Used
- **Next.js** provides a flexible, production-ready environment for building full-stack React apps.
- **NextAuth.js** simplifies authentication, supporting both credentials and OAuth providers with minimal setup.
- **TypeScript** helps catch errors early and improves code quality.
- **Tailwind CSS** enables fast, responsive UI development.
- **bcryptjs** is a widely used library for securely hashing passwords.

## Next Steps
Going forward, I would like to integrate MongoDB or PostgreSQL for persistent database storage of user and product data. This will allow for proper implementation of registration and login flows. I also plan to add unit and integration testing. The design and styling could also be improved.

---

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

Run the API handler and routing tests with `npm test`.

You can start editing the page by modifying `src/app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to load the Inter font.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
