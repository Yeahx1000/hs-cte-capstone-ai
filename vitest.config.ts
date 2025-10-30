import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        environment: 'node',
        globals: true,
        include: ['**/*.test.ts'],
        setupFiles: ['test/setup.ts']
    },
    resolve: {
        alias: [
            { find: '@', replacement: path.resolve(__dirname, '.') },
            { find: '@app', replacement: path.resolve(__dirname, 'app') },

            { find: '@components', replacement: path.resolve(__dirname, 'app/lib/components') },
            { find: '@components', replacement: path.resolve(__dirname, 'app/components') },
            { find: '@components', replacement: path.resolve(__dirname, 'components') },

            { find: '@lib', replacement: path.resolve(__dirname, 'lib') },
            { find: '@lib', replacement: path.resolve(__dirname, 'app/lib') },

            { find: '@hooks', replacement: path.resolve(__dirname, 'lib/hooks') },
            { find: '@hooks', replacement: path.resolve(__dirname, 'app/lib/hooks') },

            { find: '@data', replacement: path.resolve(__dirname, 'lib/data') },
            { find: '@data', replacement: path.resolve(__dirname, 'app/lib/data') },
        ]
    }
});