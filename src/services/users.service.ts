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
  const { data, error } = await supabase
    .from('users')
    .insert({
      username: userData.username,
      name: userData.name,
      password: userData.password, // ⚠️ see security note below
      role: userData.role,
      assigned_store_id: userData.assignedStoreId || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating user:', error);
    throw error;
  }

  return data as User;
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
      assigned_store_id: updatedUser.assignedStoreId || null,
    })
    .eq('id', updatedUser.id);

  if (error) throw error;
}


/**
 * Delete user
 * - Deletes from 'users' table
 * - Optionally disable auth user (we'll delete for simplicity)
 */
export async function deleteUser(id: string): Promise<void> {
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', id);

  if (error) throw error;
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