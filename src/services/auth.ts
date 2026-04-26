export interface User {
  uid: string;
  displayName: string | null;
  photoURL: string | null;
  email: string | null;
}

/**
 * Simplified Auth service that only supports guest mode for local-only app.
 */
class AuthService {
  getCurrentUser(): User | null {
    return null; // Guest mode only
  }

  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    callback(null);
    return () => {};
  }

  async loginWithGoogle(): Promise<void> {
    console.warn("Login disabled in local-only version.");
  }

  async logout(): Promise<void> {
    // Already guest
  }
}

export const authService = new AuthService();
