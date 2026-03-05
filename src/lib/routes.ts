export const LOGIN = '/login';
export const ROOT = '/';

export const PUBLIC_ROUTES: string[] = [
    '/login',
    '/register',
    '/'
];

export const PROTECTED_SUB_ROUTES: string[] = [
    '/checkout',
    '/products',
    '/api/auth/callback/google',
];
