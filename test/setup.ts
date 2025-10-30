import { vi } from 'vitest';

// Mock Next.js server utilities to avoid SSR internals in unit tests

vi.mock('next/server', () => {
    return {
        NextResponse: {
            json: (body: any, init?: ResponseInit) =>
                new Response(JSON.stringify(body), {
                    status: init?.status ?? 200,
                    headers: { 'Content-Type': 'application/json' }
                })
        }
    };
});


