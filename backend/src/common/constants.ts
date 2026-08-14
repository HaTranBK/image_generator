// Application-wide constants

/** 5 minutes — if stepState is 'running' and stuckAt > threshold, auto-fail */
export const STUCK_THRESHOLD_MS = 5 * 60 * 1000;

/** Server-enforced character limit per project */
export const MAX_CHARACTERS = 2;

/** Server-enforced chapter limit per project */
export const MAX_CHAPTERS = 1;

/** JWT expiration */
export const JWT_EXPIRES_IN = '7d';

/** Cookie name for the session token */
export const AUTH_COOKIE_NAME = 'session_token';

/** Upload base directory */
export const UPLOADS_DIR = 'uploads';
