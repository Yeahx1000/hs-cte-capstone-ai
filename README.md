This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

# Capstone AI

> [!IMPORTANT] 
> You will NEED a google account to use this app for now.

## Tech Stack
- Next.js
- NextAuth
- Tailwind CSS
- Zod
- Vitest
- OpenAI
- Google Drive

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

## Setup 

1. Clone Repo
2. Install dependencies with `npm install or npm i` (yarn and pnpm should also work)

> [!CAUTION]
> don't share your `.env` variables publically!! Unless you want to give free LLM access to everyone on your dime!
3. You'll need to create a `.env.local` file in the root directory with the following variables:
    - `OPENAI_API_KEY`: Your OpenAI API key
    - `GOOGLE_CLIENT_ID`: Your Google OAuth Client ID
    - `GOOGLE_CLIENT_SECRET`: Your Google OAuth Client Secret
    - `AUTH_SECRET`: A random secret for NextAuth
        - You can generate a secret in terminal with `openssl rand -base64 32` or use an online generator like: https://generate-secret.vercel.app/32

    Google variables can mostly be found in the Google Cloud Console under "Credentials" → "Create Credentials" → "OAuth client ID"
4. 


