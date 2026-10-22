import type { Config } from 'tailwindcss';
const config: Config = { content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'], theme: { extend: { colors: { ink: '#10211f', paper: '#f5f7f3', mint: '#d9f99d', lime: '#b8f36a', line: '#dce5df', muted: '#6c7b78' }, fontFamily: { sans: ['var(--font-geist)'], mono: ['var(--font-mono)'] } } }, plugins: [] };
export default config;
