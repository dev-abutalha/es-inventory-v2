// src/services/users.service.ts

import { supabase } from '../../supabaseClient'; // adjust path if needed
import { User, UserRole } from '../../types'; // adjust path

const FAKE_DOMAIN = '@esnatural.com'; // used for email in Supabase Auth

// Helper to convert username → email for auth
function getEmailFromUsername(username: string): string {
  return `${username}${FAKE_DOMAIN}`;
}

/**
 * Get all users (profile data from 'users' table)
 */
export async function getUsers(): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching users:', error);
    throw error;
  }

  return data || [];
}

/**
 * Create a new user
 * - Creates auth user via signUp
 * - Inserts profile into 'users' table
 */
export async function createUser(
  userData: Omit<User, 'id'> & { password: string }
): Promise<User> {
  const email = getEmailFromUsername(userData.username);

  // 1. Sign up in Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password: userData.password,
    options: {
      data: {
        username: userData.username,
        name: userData.name,
        role: userData.role,
      },
    },
  });

  if (authError) throw new Error(`Auth signup failed: ${authError.message}`);
  if (!authData.user) throw new Error('No user returned from signup');

  const authUserId = authData.user.id;

  // 2. Insert profile into public.users table
  const profile: Omit<User, 'id' | 'password'> = {
    username: userData.username,
    name: userData.name,
    role: userData.role,
    assignedStoreId: userData.assignedStoreId,
  };

  const { data: inserted, error: insertError } = await supabase
    .from('users')
    .insert({ id: authUserId, ...profile })
    .select()
    .single();

  if (insertError) {
    // Optional: rollback auth user if profile fails (but skip for MVP)
    console.error('Profile insert failed:', insertError);
    throw insertError;
  }

  return inserted as User;
}

/**
 * Update existing user
 * - Updates profile in 'users' table
 * - Does NOT update password here (add separate reset later if needed)
 */
export async function updateUser(updatedUser: User): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({
      name: updatedUser.name,
      role: updatedUser.role,
      assignedStoreId: updatedUser.assignedStoreId,
      // username should NOT be updated (it's tied to auth)
    })
    .eq('id', updatedUser.id);

  if (error) {
    console.error('Error updating user:', error);
    throw error;
  }
}

/**
 * Delete user
 * - Deletes from 'users' table
 * - Optionally disable auth user (we'll delete for simplicity)
 */
export async function deleteUser(id: string): Promise<void> {
  // First delete profile
  const { error: profileError } = await supabase
    .from('users')
    .delete()
    .eq('id', id);

  if (profileError) throw profileError;

  // Optional: disable or delete auth user
  // Note: Supabase admin API needed for deleteUser — for now, just profile delete
  // If needed, use supabase.auth.admin.deleteUser(id) but requires service role key
}


/**
 * Assign manager to store (unassign from previous if needed)
 */
export async function assignManagerToStore(
  managerId: string | null,
  storeId: string
): Promise<void> {
  // Step 1: Remove assignment from anyone currently assigned to this store
  await supabase
    .from('users')
    .update({ assigned_store_id: null })
    .eq('assigned_store_id', storeId)
    .neq('id', managerId); // don't touch the new one if re-assigning same

  // Step 2: Assign the selected manager if provided
  if (managerId) {
    const { error } = await supabase
      .from('users')
      .update({ assigned_store_id: storeId })
      .eq('id', managerId);

    if (error) throw error;
  }
}