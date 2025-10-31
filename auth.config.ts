import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
// import Facebook from "next-auth/providers/facebook";
// import Apple from "next-auth/providers/apple";
// import EmailProvider from "next-auth/providers/email";


// not needed, but added and commented out for future use, can add more providers later, 
// for now we're only using Google

export const authConfig = {
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            authorization: {
                params: {
                    scope: [
                        "openid",
                        "email",
                        "profile",
                        "https://www.googleapis.com/auth/drive.file",
                        "https://www.googleapis.com/auth/documents",
                    ].join(" "),
                    access_type: "offline",
                    prompt: "consent",
                },
            },
        }),
        // Apple({
        //     clientId: process.env.APPLE_ID,
        //     clientSecret: process.env.APPLE_SECRET
        // }),
        // Facebook({
        //     clientId: process.env.FACEBOOK_ID,
        //     clientSecret: process.env.FACEBOOK_SECRET
        // }),
        // // Passwordless / email sign in
        // EmailProvider({
        //     server: process.env.MAIL_SERVER,
        //     from: 'NextAuth.js <no-reply@example.com>'
        // }),
    ],
    pages: {
        signIn: "/login",
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const isOnLoginPage = nextUrl.pathname.startsWith("/login");

            if (isOnLoginPage) {
                if (isLoggedIn) {
                    return Response.redirect(new URL("/", nextUrl));
                }
                return true; // Allow access to login page if not logged in
            }

            // Protect all other routes
            if (!isLoggedIn) {
                return false; // Redirect to login
            }
            return true;
        },
        async jwt({ token, account }) {
            // Persist the OAuth access_token to the token right after signin
            if (account) {
                token.accessToken = account.access_token;
                token.refreshToken = account.refresh_token;
                token.expiresAt = account.expires_at;
            }
            return token;
        },
        async session({ session, token }) {
            // Send properties to the client
            (session as any).accessToken = token.accessToken;
            return session;
        },
    },
} satisfies NextAuthConfig;

