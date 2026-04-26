import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  type User as FirebaseUser 
} from 'firebase/auth';
import { auth } from './firebase';

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
}

type AuthStateChangedCallback = (user: User | null) => void;

class AuthService {
  private currentUser: User | null = null;

  async loginWithGoogle(): Promise<User> {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      this.currentUser = this.mapFirebaseUser(result.user);
      return this.currentUser;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      await signOut(auth);
      this.currentUser = null;
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  onAuthStateChanged(callback: AuthStateChangedCallback): () => void {
    return onAuthStateChanged(auth, (firebaseUser) => {
      this.currentUser = firebaseUser ? this.mapFirebaseUser(firebaseUser) : null;
      callback(this.currentUser);
    });
  }

  private mapFirebaseUser(user: FirebaseUser): User {
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL
    };
  }
}

export const authService = new AuthService();
