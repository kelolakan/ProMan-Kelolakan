import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const provider = new GoogleAuthProvider();

// Add the scopes requested and approved by the user
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/calendar');
provider.addScope('https://www.googleapis.com/auth/gmail.send');

// Enable prompt selection so user can choose account
provider.setCustomParameters({
  prompt: 'select_account'
});

let isSigningIn = false;
let cachedAccessToken: string | null = null;
const tokenInvalidationListeners: Array<(reason?: string) => void> = [];

export const onTokenInvalidated = (listener: (reason?: string) => void) => {
  tokenInvalidationListeners.push(listener);
  return () => {
    const idx = tokenInvalidationListeners.indexOf(listener);
    if (idx !== -1) tokenInvalidationListeners.splice(idx, 1);
  };
};

export const invalidateAuthToken = (reason?: string) => {
  cachedAccessToken = null;
  try {
    sessionStorage.removeItem('g_access_token');
    sessionStorage.removeItem('g_token_timestamp');
  } catch {
    // ignore
  }
  tokenInvalidationListeners.forEach((listener) => {
    try {
      listener(reason);
    } catch (e) {
      console.warn('Error in token invalidation listener:', e);
    }
  });
};

const isTokenFresh = (): boolean => {
  try {
    const timestampStr = sessionStorage.getItem('g_token_timestamp');
    if (!timestampStr) return false;
    const tokenTime = parseInt(timestampStr, 10);
    // Google OAuth access tokens are valid for 1 hour (3600 seconds).
    // We treat anything older than 50 minutes (3000 seconds) as expired.
    const maxAgeMs = 50 * 60 * 1000;
    return Date.now() - tokenTime < maxAgeMs;
  } catch {
    return false;
  }
};

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      // Look up cached token only if it is fresh
      const storedToken = sessionStorage.getItem('g_access_token');
      if (storedToken && isTokenFresh()) {
        cachedAccessToken = storedToken;
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else {
        // Token has expired or is missing
        invalidateAuthToken('Token expired or missing');
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      invalidateAuthToken('User signed out');
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  if (isSigningIn) return null;
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Gagal memperoleh access token dari Google.');
    }

    cachedAccessToken = credential.accessToken;
    try {
      sessionStorage.setItem('g_access_token', cachedAccessToken);
      sessionStorage.setItem('g_token_timestamp', Date.now().toString());
    } catch {
      // ignore
    }
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    // Gracefully handle standard user cancellation/popup closures
    if (
      error?.code === 'auth/popup-closed-by-user' ||
      error?.code === 'auth/cancelled-popup-request' ||
      error?.message?.includes('popup-closed-by-user')
    ) {
      console.info('Jendela autentikasi Google ditutup oleh pengguna sebelum proses selesai.');
      return null;
    }

    if (error?.code === 'auth/popup-blocked') {
      throw new Error('Jendela popup diblokir oleh browser. Harap izinkan popup pada peramban Anda untuk menghubungkan akun Google.');
    }

    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  if (!cachedAccessToken) {
    const storedToken = sessionStorage.getItem('g_access_token');
    if (storedToken && isTokenFresh()) {
      cachedAccessToken = storedToken;
    } else {
      invalidateAuthToken();
    }
  }
  return cachedAccessToken;
};

export const logout = async () => {
  try {
    await auth.signOut();
  } catch (e) {
    console.warn('Signout error:', e);
  }
  invalidateAuthToken('User logged out');
};

