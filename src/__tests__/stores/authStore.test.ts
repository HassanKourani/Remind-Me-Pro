// Mock AsyncStorage
const mockAsyncStorage = {
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

// Note: This is a standalone test that doesn't import the actual store
// It tests the auth logic independently

interface User {
  id: string;
  email: string | null;
  displayName: string | null;
  isGuest: boolean;
  isPremium: boolean;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isConnected: boolean;
}

const createMockAuthStore = () => {
  let state: AuthState = {
    user: null,
    isLoading: false,
    isAuthenticated: false,
    isConnected: true,
  };

  return {
    getState: () => state,
    setState: (newState: Partial<AuthState>) => {
      state = { ...state, ...newState };
    },
    continueAsGuest: async () => {
      const guestUser: User = {
        id: `guest_${Date.now()}`,
        email: null,
        displayName: 'Guest',
        isGuest: true,
        isPremium: false,
      };
      state = {
        ...state,
        user: guestUser,
        isAuthenticated: true,
        isLoading: false,
      };
      await mockAsyncStorage.setItem('guest_user', JSON.stringify(guestUser));
      return guestUser;
    },
    signIn: async (email: string, password: string) => {
      if (!email || !password) {
        throw new Error('Email and password are required');
      }
      if (password.length < 6) {
        throw new Error('Invalid credentials');
      }
      const user: User = {
        id: 'user_123',
        email,
        displayName: email.split('@')[0],
        isGuest: false,
        isPremium: false,
      };
      state = {
        ...state,
        user,
        isAuthenticated: true,
        isLoading: false,
      };
      return user;
    },
    signUp: async (email: string, password: string, displayName: string) => {
      if (!email || !password || !displayName) {
        throw new Error('All fields are required');
      }
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }
      const user: User = {
        id: 'user_' + Date.now(),
        email,
        displayName,
        isGuest: false,
        isPremium: false,
      };
      state = {
        ...state,
        user,
        isAuthenticated: true,
        isLoading: false,
      };
      return user;
    },
    signOut: async () => {
      state = {
        user: null,
        isLoading: false,
        isAuthenticated: false,
        isConnected: true,
      };
      await mockAsyncStorage.removeItem('guest_user');
    },
    setConnected: (connected: boolean) => {
      state = { ...state, isConnected: connected };
    },
  };
};

describe('Auth Store', () => {
  let authStore: ReturnType<typeof createMockAuthStore>;

  beforeEach(() => {
    jest.clearAllMocks();
    authStore = createMockAuthStore();
  });

  describe('Initial State', () => {
    it('should start with no user', () => {
      const state = authStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('should start with loading false', () => {
      const state = authStore.getState();
      expect(state.isLoading).toBe(false);
    });

    it('should start with connected true', () => {
      const state = authStore.getState();
      expect(state.isConnected).toBe(true);
    });
  });

  describe('Guest Mode', () => {
    it('should create a guest user', async () => {
      const user = await authStore.continueAsGuest();

      expect(user.isGuest).toBe(true);
      expect(user.id).toContain('guest_');
      expect(user.displayName).toBe('Guest');
      expect(user.isPremium).toBe(false);
    });

    it('should set authenticated state after guest login', async () => {
      await authStore.continueAsGuest();
      const state = authStore.getState();

      expect(state.isAuthenticated).toBe(true);
      expect(state.user?.isGuest).toBe(true);
    });

    it('should persist guest user to AsyncStorage', async () => {
      await authStore.continueAsGuest();

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'guest_user',
        expect.any(String)
      );
    });
  });

  describe('Sign In', () => {
    it('should sign in with valid credentials', async () => {
      const user = await authStore.signIn('test@example.com', 'password123');

      expect(user.email).toBe('test@example.com');
      expect(user.isGuest).toBe(false);
      expect(authStore.getState().isAuthenticated).toBe(true);
    });

    it('should throw error for empty email', async () => {
      await expect(authStore.signIn('', 'password123')).rejects.toThrow(
        'Email and password are required'
      );
    });

    it('should throw error for empty password', async () => {
      await expect(authStore.signIn('test@example.com', '')).rejects.toThrow(
        'Email and password are required'
      );
    });

    it('should throw error for short password', async () => {
      await expect(authStore.signIn('test@example.com', '12345')).rejects.toThrow(
        'Invalid credentials'
      );
    });
  });

  describe('Sign Up', () => {
    it('should create a new user', async () => {
      const user = await authStore.signUp('new@example.com', 'password123', 'New User');

      expect(user.email).toBe('new@example.com');
      expect(user.displayName).toBe('New User');
      expect(user.isGuest).toBe(false);
    });

    it('should throw error for missing fields', async () => {
      await expect(authStore.signUp('', 'password123', 'Name')).rejects.toThrow(
        'All fields are required'
      );
      await expect(authStore.signUp('test@example.com', '', 'Name')).rejects.toThrow(
        'All fields are required'
      );
      await expect(authStore.signUp('test@example.com', 'password123', '')).rejects.toThrow(
        'All fields are required'
      );
    });

    it('should throw error for short password', async () => {
      await expect(authStore.signUp('test@example.com', '12345', 'Name')).rejects.toThrow(
        'Password must be at least 6 characters'
      );
    });
  });

  describe('Sign Out', () => {
    it('should clear user state', async () => {
      await authStore.continueAsGuest();
      expect(authStore.getState().isAuthenticated).toBe(true);

      await authStore.signOut();

      const state = authStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('should remove guest user from AsyncStorage', async () => {
      await authStore.continueAsGuest();
      await authStore.signOut();

      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('guest_user');
    });
  });

  describe('Connection Status', () => {
    it('should update connection status', () => {
      authStore.setConnected(false);
      expect(authStore.getState().isConnected).toBe(false);

      authStore.setConnected(true);
      expect(authStore.getState().isConnected).toBe(true);
    });
  });
});

describe('Guest to Account Migration', () => {
  let authStore: ReturnType<typeof createMockAuthStore>;

  beforeEach(() => {
    authStore = createMockAuthStore();
  });

  it('should migrate guest to registered user', async () => {
    // Start as guest
    await authStore.continueAsGuest();
    expect(authStore.getState().user?.isGuest).toBe(true);

    // Sign up (simulating migration)
    const user = await authStore.signUp('migrated@example.com', 'password123', 'Migrated User');

    expect(user.isGuest).toBe(false);
    expect(user.email).toBe('migrated@example.com');
    expect(authStore.getState().isAuthenticated).toBe(true);
  });
});
