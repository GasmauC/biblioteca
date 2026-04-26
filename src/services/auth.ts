export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
}

type AuthStateChangedCallback = (user: User | null) => void;

class AuthService {
  private currentUser: User | null = null;
  private listeners: AuthStateChangedCallback[] = [];

  constructor() {
    // Check if mock user is stored in localStorage to persist login between reloads
    const savedUser = localStorage.getItem('mock_google_user');
    if (savedUser) {
      try {
        this.currentUser = JSON.parse(savedUser);
      } catch (e) {
        console.error('Failed to parse saved user', e);
      }
    }
  }

  // Simulate a Google Login via OAuth popup
  async loginWithGoogle(): Promise<User> {
    return new Promise((resolve) => {
      // Simulate network delay
      setTimeout(() => {
        const mockUser: User = {
          uid: 'google-user-12345',
          email: 'usuario@gmail.com',
          displayName: 'Lector Pro',
          photoURL: `https://ui-avatars.com/api/?name=Lector+Pro&background=random`
        };
        this.currentUser = mockUser;
        localStorage.setItem('mock_google_user', JSON.stringify(mockUser));
        this.notifyListeners();
        resolve(mockUser);
      }, 800);
    });
  }

  async logout(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.currentUser = null;
        localStorage.removeItem('mock_google_user');
        this.notifyListeners();
        resolve();
      }, 500);
    });
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  onAuthStateChanged(callback: AuthStateChangedCallback): () => void {
    this.listeners.push(callback);
    // Immediately call with current state
    callback(this.currentUser);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(cb => cb(this.currentUser));
  }
}

export const authService = new AuthService();
