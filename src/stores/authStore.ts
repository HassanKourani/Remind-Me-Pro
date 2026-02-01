import { create } from 'zustand';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { generateId } from '@/lib/utils';
import { getDatabase } from '@/services/database/sqlite';
import { supabase } from '@/services/supabase/client';
import { authService } from '@/services/supabase/auth';
import NetInfo from '@react-native-community/netinfo';
import { checkPremiumStatus, getActiveSubscription } from '@/services/purchases/revenueCat';

interface User {
  id: string;
  email: string | null;
  displayName: string | null;
  isPremium: boolean;
  isGuest: boolean; // New: distinguishes guest from logged-in users
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isConnected: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setConnected: (connected: boolean) => void;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  continueAsGuest: () => Promise<void>;
  // New: Convert guest to registered user (migrate data)
  linkGuestToAccount: (email: string, password: string, displayName: string) => Promise<void>;
  // Update premium status (used after purchase)
  updatePremiumStatus: (isPremium: boolean, expiresAt?: string | null) => Promise<void>;
  // Sync premium status with RevenueCat (call on app start)
  syncPremiumWithRevenueCat: () => Promise<void>;
}

// Helper to check if user can sync (has account and is connected)
export function canSync(user: User | null, isConnected: boolean): boolean {
  return !!user && !user.isGuest && isConnected;
}

function mapSupabaseUser(supabaseUser: SupabaseUser): User {
  return {
    id: supabaseUser.id,
    email: supabaseUser.email || null,
    displayName: supabaseUser.user_metadata?.display_name || supabaseUser.email?.split('@')[0] || 'User',
    isPremium: false,
    isGuest: false,
  };
}

// Create or update user profile in Supabase
async function ensureUserProfile(user: User): Promise<void> {
  if (user.isGuest) return; // Don't create profiles for guests

  try {
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (!existingProfile) {
      const { error } = await supabase.from('profiles').insert({
        id: user.id,
        email: user.email,
        display_name: user.displayName,
        is_premium: user.isPremium,
      } as never);

      if (error && error.code !== '23505') {
        console.error('Error creating profile:', error);
      }
    }
  } catch (error) {
    console.error('Error ensuring user profile:', error);
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  isConnected: true,

  setUser: (user) => set({
    user,
    isAuthenticated: !!user,
    isLoading: false,
  }),

  setLoading: (isLoading) => set({ isLoading }),

  setConnected: (isConnected) => set({ isConnected }),

  initialize: async () => {
    try {
      // Check network connectivity
      const networkState = await NetInfo.fetch();
      const isConnected = networkState.isConnected ?? true;
      set({ isConnected });

      // Check for existing Supabase session
      const session = await authService.getSession();

      if (session?.user) {
        // User is logged in with Supabase
        const user = mapSupabaseUser(session.user);

        // Ensure user profile exists
        if (isConnected) {
          await ensureUserProfile(user);

          // Fetch premium status from profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('is_premium, premium_expires_at')
            .eq('id', session.user.id)
            .single<{ is_premium: boolean; premium_expires_at: string | null }>();

          if (profile) {
            // Check if premium has expired
            if (profile.is_premium && profile.premium_expires_at) {
              const expiresAt = new Date(profile.premium_expires_at);
              const now = new Date();

              if (expiresAt <= now) {
                // Premium has expired - update the database
                console.log('Premium subscription expired, revoking access');
                user.isPremium = false;

                // Update Supabase to reflect expired status
                await supabase
                  .from('profiles')
                  .update({ is_premium: false })
                  .eq('id', session.user.id);
              } else {
                user.isPremium = true;
              }
            } else {
              user.isPremium = profile.is_premium;
            }
          }
        }

        set({
          user,
          isAuthenticated: true,
          isLoading: false,
        });

        // Sync to local database
        const db = await getDatabase();
        await db.runAsync(
          `INSERT OR REPLACE INTO users (id, email, display_name, is_premium, is_guest) VALUES (?, ?, ?, ?, ?)`,
          [user.id, user.email, user.displayName, user.isPremium ? 1 : 0, 0]
        );
      } else {
        // No active session - check for local user
        const db = await getDatabase();

        // First check for a logged-in user (has email)
        const loggedInUser = await db.getFirstAsync<{
          id: string;
          email: string | null;
          display_name: string | null;
          is_premium: number;
          is_guest: number;
        }>('SELECT * FROM users WHERE is_guest = 0 AND email IS NOT NULL LIMIT 1');

        if (loggedInUser) {
          // User was logged in but session expired - they need to sign in again
          // Keep their data but mark as needing re-auth
          set({
            user: {
              id: loggedInUser.id,
              email: loggedInUser.email,
              displayName: loggedInUser.display_name,
              isPremium: Boolean(loggedInUser.is_premium),
              isGuest: false,
            },
            isAuthenticated: true,
            isLoading: false,
          });
        } else {
          // Check for guest user
          const guestUser = await db.getFirstAsync<{
            id: string;
            display_name: string | null;
            is_premium: number;
          }>('SELECT * FROM users WHERE is_guest = 1 LIMIT 1');

          if (guestUser) {
            set({
              user: {
                id: guestUser.id,
                email: null,
                displayName: guestUser.display_name,
                isPremium: false,
                isGuest: true,
              },
              isAuthenticated: true,
              isLoading: false,
            });
          } else {
            // No user at all
            set({ isLoading: false });
          }
        }
      }

      // Listen for network changes
      NetInfo.addEventListener((state) => {
        set({ isConnected: state.isConnected ?? true });
      });
    } catch (error) {
      console.error('Auth initialization error:', error);
      set({ isLoading: false });
    }
  },

  signIn: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const { user: supabaseUser } = await authService.signIn(email, password);

      if (!supabaseUser) throw new Error('Sign in failed');

      const user = mapSupabaseUser(supabaseUser);

      // Ensure user profile exists
      await ensureUserProfile(user);

      // Fetch premium status
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_premium')
        .eq('id', supabaseUser.id)
        .single<{ is_premium: boolean }>();

      if (profile) {
        user.isPremium = profile.is_premium;
      }

      const db = await getDatabase();

      // Check if this user already exists locally
      const existingUser = await db.getFirstAsync<{ id: string }>(
        'SELECT id FROM users WHERE id = ?',
        [user.id]
      );

      if (!existingUser) {
        // Insert the new user
        await db.runAsync(
          `INSERT INTO users (id, email, display_name, is_premium, is_guest) VALUES (?, ?, ?, ?, ?)`,
          [user.id, user.email, user.displayName, user.isPremium ? 1 : 0, 0]
        );
      } else {
        // Update existing user
        await db.runAsync(
          `UPDATE users SET email = ?, display_name = ?, is_premium = ?, is_guest = 0 WHERE id = ?`,
          [user.email, user.displayName, user.isPremium ? 1 : 0, user.id]
        );
      }

      set({
        user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  signUp: async (email: string, password: string, displayName: string) => {
    set({ isLoading: true });
    try {
      const { user: supabaseUser } = await authService.signUp(email, password, displayName);

      if (!supabaseUser) throw new Error('Sign up failed - please check your email for verification');

      const user = mapSupabaseUser(supabaseUser);
      user.displayName = displayName;

      // Create user profile in Supabase
      const { error: profileError } = await supabase.from('profiles').insert({
        id: supabaseUser.id,
        email: email,
        display_name: displayName,
        is_premium: false,
      } as never);

      if (profileError && profileError.code !== '23505') {
        console.error('Error creating profile:', profileError);
      }

      // Add user to local database
      const db = await getDatabase();
      await db.runAsync(
        `INSERT OR REPLACE INTO users (id, email, display_name, is_premium, is_guest) VALUES (?, ?, ?, ?, ?)`,
        [user.id, user.email, user.displayName, 0, 0]
      );

      set({
        user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  signOut: async () => {
    try {
      const state = get();

      // Sign out from Supabase if not a guest
      if (state.user && !state.user.isGuest) {
        await authService.signOut();
      }

      // Only clear the current user from local DB, keep guest if exists
      const db = await getDatabase();
      if (state.user) {
        await db.runAsync('DELETE FROM users WHERE id = ?', [state.user.id]);
      }

      set({
        user: null,
        isAuthenticated: false,
      });
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  },

  continueAsGuest: async () => {
    const db = await getDatabase();

    // Check if guest already exists
    const existingGuest = await db.getFirstAsync<{
      id: string;
      display_name: string | null;
    }>('SELECT * FROM users WHERE is_guest = 1 LIMIT 1');

    if (existingGuest) {
      // Use existing guest
      set({
        user: {
          id: existingGuest.id,
          email: null,
          displayName: existingGuest.display_name,
          isPremium: false,
          isGuest: true,
        },
        isAuthenticated: true,
        isLoading: false,
      });
    } else {
      // Create a new guest user
      const guestId = `guest_${generateId()}`;
      await db.runAsync(
        `INSERT INTO users (id, email, display_name, is_premium, is_guest) VALUES (?, ?, ?, ?, ?)`,
        [guestId, null, 'Guest', 0, 1]
      );

      set({
        user: {
          id: guestId,
          email: null,
          displayName: 'Guest',
          isPremium: false,
          isGuest: true,
        },
        isAuthenticated: true,
        isLoading: false,
      });
    }
  },

  // Convert guest account to a full account - migrate all their data
  linkGuestToAccount: async (email: string, password: string, displayName: string) => {
    const state = get();
    if (!state.user?.isGuest) {
      throw new Error('Only guest accounts can be linked');
    }

    const guestId = state.user.id;
    set({ isLoading: true });

    try {
      // Sign up with Supabase
      const { user: supabaseUser } = await authService.signUp(email, password, displayName);

      if (!supabaseUser) throw new Error('Sign up failed - please check your email for verification');

      const newUser = mapSupabaseUser(supabaseUser);
      newUser.displayName = displayName;

      // Create user profile in Supabase
      const { error: profileError } = await supabase.from('profiles').insert({
        id: supabaseUser.id,
        email: email,
        display_name: displayName,
        is_premium: false,
      } as never);

      if (profileError && profileError.code !== '23505') {
        console.error('Error creating profile:', profileError);
      }

      const db = await getDatabase();

      // Migrate all reminders from guest to new user
      await db.runAsync(
        `UPDATE reminders SET user_id = ? WHERE user_id = ?`,
        [newUser.id, guestId]
      );

      // Migrate sync queue entries
      await db.runAsync(
        `UPDATE sync_queue SET user_id = ? WHERE user_id = ?`,
        [newUser.id, guestId]
      );

      // Remove guest user
      await db.runAsync('DELETE FROM users WHERE id = ?', [guestId]);

      // Add new user
      await db.runAsync(
        `INSERT INTO users (id, email, display_name, is_premium, is_guest) VALUES (?, ?, ?, ?, ?)`,
        [newUser.id, newUser.email, newUser.displayName, 0, 0]
      );

      set({
        user: newUser,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  updatePremiumStatus: async (isPremium: boolean, expiresAt?: string | null) => {
    const state = get();
    if (!state.user) {
      console.log('updatePremiumStatus: No user found');
      return;
    }

    console.log('updatePremiumStatus: Starting update for user', state.user.id, 'isPremium:', isPremium, 'expiresAt:', expiresAt);

    try {
      const db = await getDatabase();

      // Update local database
      await db.runAsync(
        'UPDATE users SET is_premium = ? WHERE id = ?',
        [isPremium ? 1 : 0, state.user.id]
      );
      console.log('updatePremiumStatus: Local database updated');

      // Update Supabase if not guest and connected
      if (!state.user.isGuest && state.isConnected) {
        console.log('updatePremiumStatus: Updating Supabase for user', state.user.id);

        // Always set premium_expires_at when updating premium status
        let finalExpiresAt: string | null = null;

        if (expiresAt) {
          finalExpiresAt = expiresAt;
        } else if (isPremium) {
          // If no expiration provided and is premium, set a default (1 month)
          const defaultExpiry = new Date();
          defaultExpiry.setMonth(defaultExpiry.getMonth() + 1);
          finalExpiresAt = defaultExpiry.toISOString();
        }

        const updateData = {
          is_premium: isPremium,
          premium_expires_at: finalExpiresAt,
        };

        console.log('updatePremiumStatus: Sending to Supabase:', JSON.stringify(updateData));

        const { data, error } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', state.user.id)
          .select();

        if (error) {
          console.error('updatePremiumStatus: Supabase error:', JSON.stringify(error));
          // Don't throw - local update succeeded, Supabase will sync later
        } else {
          console.log('updatePremiumStatus: Supabase response:', JSON.stringify(data));
        }
      } else {
        console.log('updatePremiumStatus: Skipping Supabase (guest:', state.user.isGuest, 'connected:', state.isConnected, ')');
      }

      // Update state
      set({
        user: {
          ...state.user,
          isPremium,
        },
      });
      console.log('updatePremiumStatus: State updated, user is now premium:', isPremium);
    } catch (error) {
      console.error('updatePremiumStatus: Error:', error);
      throw error;
    }
  },

  // Sync premium status with RevenueCat (validates subscription is still active)
  syncPremiumWithRevenueCat: async () => {
    const state = get();
    if (!state.user || state.user.isGuest) {
      return; // Skip for guests
    }

    try {
      console.log('syncPremiumWithRevenueCat: Checking subscription status...');

      // Check with RevenueCat if subscription is still active
      const isPremiumActive = await checkPremiumStatus();
      const subscription = await getActiveSubscription();

      console.log('syncPremiumWithRevenueCat: RevenueCat status:', {
        isPremiumActive,
        expirationDate: subscription.expirationDate,
        willRenew: subscription.willRenew,
      });

      // If RevenueCat says premium but local says not, or vice versa - sync
      if (isPremiumActive !== state.user.isPremium) {
        console.log('syncPremiumWithRevenueCat: Status mismatch, updating...');

        const expiresAt = subscription.expirationDate || null;

        // Update local state and Supabase
        const db = await getDatabase();
        await db.runAsync(
          'UPDATE users SET is_premium = ? WHERE id = ?',
          [isPremiumActive ? 1 : 0, state.user.id]
        );

        // Update Supabase
        if (state.isConnected) {
          await supabase
            .from('profiles')
            .update({
              is_premium: isPremiumActive,
              premium_expires_at: expiresAt,
            })
            .eq('id', state.user.id);
        }

        // Update state
        set({
          user: {
            ...state.user,
            isPremium: isPremiumActive,
          },
        });

        console.log('syncPremiumWithRevenueCat: Status synced, isPremium:', isPremiumActive);
      } else {
        console.log('syncPremiumWithRevenueCat: Status already in sync');
      }
    } catch (error) {
      // Don't throw - this is a background sync, shouldn't block the app
      console.error('syncPremiumWithRevenueCat: Error:', error);
    }
  },
}));
