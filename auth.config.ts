import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

// deleted commented out providers, can always just add them in a production environment.
export const authConfig = {
    trustHost: true,
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
                return true;
            }

            if (!isLoggedIn) {
                return false;
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

            // Check if token needs refresh
            const nowInSeconds = Math.floor(Date.now() / 1000);
            const skewedTimeBySecondsForClockDifferences = 90; // lol, sorry long variable name, but had to be done.
            const expiryTime = typeof token.expiresAt === "number" ? token.expiresAt : 0;
            const needsRefresh = !token.accessToken || expiryTime < (nowInSeconds + skewedTimeBySecondsForClockDifferences);

            // Avoid thundering herd: prevent simultaneous refresh attempts
            if (needsRefresh && token.refreshToken && !(token as any)._refreshing) {
                (token as any)._refreshing = true;
                try {
                    const controller = new AbortController();
                    const timeout = setTimeout(() => controller.abort(), 5000);

                    const res = await fetch("https://oauth2.googleapis.com/token", {
                        method: "POST",
                        headers: { "Content-Type": "application/x-www-form-urlencoded" },
                        body: new URLSearchParams({
                            client_id: process.env.GOOGLE_CLIENT_ID!,
                            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
                            refresh_token: String(token.refreshToken),
                            grant_type: "refresh_token",
                        }),
                        signal: controller.signal,
                    });
                    clearTimeout(timeout);

                    const body = await res.json();

                    if (res.ok && body.access_token) {
                        token.accessToken = body.access_token;
                        // Google returns expires_in in seconds
                        token.expiresAt = Math.floor(Date.now() / 1000) + (Number(body.expires_in) || 3600);

                        // Google may rotate refresh_token (rare). If present, update; else keep existing.
                        if (body.refresh_token) token.refreshToken = body.refresh_token;
                    } else {
                        // Only clear refresh token on explicit revocation / invalid_grant
                        const errorCode = body?.error;
                        if (errorCode === "invalid_grant" || errorCode === "invalid_client") {
                            token.accessToken = undefined;
                            token.refreshToken = undefined; // force re-consent
                            token.expiresAt = undefined;
                        }
                        // transient error: keep existing refresh token; let request fail upstream if access token expired
                    }
                } catch (error) {
                    // network/timeout: keep refreshToken; do not nuke it
                } finally {
                    delete (token as any)._refreshing;
                }
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

