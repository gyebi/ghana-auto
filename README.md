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

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Staff authentication

`/admin` uses Firebase email/password sign-in only for pre-provisioned staff.
There is no public registration, password reset administration, or automatic
staff provisioning.

Before local staff sign-in testing:

1. In Firebase Console, enable **Authentication → Sign-in method → Email/Password**.
2. Create the Firebase users that should be allowed to sign in, and verify each
   user's email address.
3. Add one active Neon `StaffUser` record for each user. Its `firebaseUid` must
   exactly match the Firebase user UID and its `email` must match the verified
   Firebase email (case-insensitively). Use `ADMIN` or `STAFF` for the role.
4. Copy the Firebase web configuration to the `NEXT_PUBLIC_FIREBASE_*` values in
   `.env.local`, and configure a Firebase service-account credential with all
   three `FIREBASE_ADMIN_*` values. Never commit `.env.local` or a service
   account key.
5. Set `DATABASE_URL`, run the development server, sign in at `/admin`, confirm
   the dashboard appears, then sign out and confirm `/admin` returns to the
   login form. Also test a Firebase user with no staff record and an inactive
   staff record; both must be denied.

The server issues an eight-hour HTTP-only session cookie and verifies it with
Firebase revocation checking plus a fresh active `StaffUser` lookup on every
protected server render. Future privileged route handlers and mutations must
call `requireActiveStaffSession()` independently.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
# ghana-auto
