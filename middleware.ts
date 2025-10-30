import { auth } from "@/auth";
import { NextResponse } from "next/server";

// some simple middleware for logged in state, mostly rerouting on loggedin or !loggedin users

export default auth((req) => {
    const isLoggedIn = !!req.auth;
    const isOnLoginPage = req.nextUrl.pathname.startsWith("/login");

    if (!isLoggedIn && isOnLoginPage) {
        return NextResponse.next();
    }

    if (!isLoggedIn && !isOnLoginPage) {
        const loginUrl = new URL("/login", req.url);
        return NextResponse.redirect(loginUrl);
    }

    if (isLoggedIn && isOnLoginPage) {
        return NextResponse.redirect(new URL("/", req.url));
    }

    return NextResponse.next();
});

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api/auth (NextAuth routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder
         */
        "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};

