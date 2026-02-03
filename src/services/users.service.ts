// // src/services/users.service.ts

// import { supabase } from '../../supabaseClient'; // adjust path if needed
// import { User, UserRole } from '../../types'; // adjust path

// const FAKE_DOMAIN = '@esnatural.com'; // used for email in Supabase Auth

// // Helper to convert username → email for auth
// function getEmailFromUsername(username: string): string {
//   return `${username}${FAKE_DOMAIN}`;
// }

// /**
//  * Get all users (profile data from 'users' table)
//  */
// export async function getUsers(): Promise<User[]> {
//   const { data, error } = await supabase
//     .from('users')
//     .select('*')
//     .order('name');

//   if (error) {
//     console.error('Error fetching users:', error);
//     throw error;
//   }

//   return data || [];
// }

// /**
//  * Create a new user
//  * - Creates auth user via signUp
//  * - Inserts profile into 'users' table
//  */



// export async function createUser(
//   userData: Omit<User, 'id'> & { password: string }
// ): Promise<User> {
//   const { data, error } = await supabase
//     .from('users')
//     .insert({
//       username: userData.username,
//       name: userData.name,
//       password: userData.password, // ⚠️ see security note below
//       role: userData.role,
//       assigned_store_id: userData.assignedStoreId || null,
//     })
//     .select()
//     .single();

//   if (error) {
//     console.error('Error creating user:', error);
//     throw error;
//   }

//   return data as User;
// }




// /**
//  * Update existing user
//  * - Updates profile in 'users' table
//  * - Does NOT update password here (add separate reset later if needed)
//  */
// export async function updateUser(updatedUser: User): Promise<void> {
//   const { error } = await supabase
//     .from('users')
//     .update({
//       name: updatedUser.name,
//       role: updatedUser.role,
//       assigned_store_id: updatedUser.assignedStoreId || null,
//     })
//     .eq('id', updatedUser.id);

//   if (error) throw error;
// }


// /**
//  * Delete user
//  * - Deletes from 'users' table
//  * - Optionally disable auth user (we'll delete for simplicity)
//  */
// export async function deleteUser(id: string): Promise<void> {
//   const { error } = await supabase
//     .from('users')
//     .delete()
//     .eq('id', id);

//   if (error) throw error;
// }


// /**
//  * Assign manager to store (unassign from previous if needed)
//  */
// export async function assignManagerToStore(
//   managerId: string | null,
//   storeId: string
// ): Promise<void> {
//   // Step 1: Remove assignment from anyone currently assigned to this store
//   await supabase
//     .from('users')
//     .update({ assigned_store_id: null })
//     .eq('assigned_store_id', storeId)
//     .neq('id', managerId); // don't touch the new one if re-assigning same

//   // Step 2: Assign the selected manager if provided
//   if (managerId) {
//     const { error } = await supabase
//       .from('users')
//       .update({ assigned_store_id: storeId })
//       .eq('id', managerId);

//     if (error) throw error;
//   }
// }

// src/services/users.service.ts

import { supabase } from '../../supabaseClient';
import { User, UserRole } from '../../types';

/**
 * Get all users WITH their assigned store details
 */
export async function getUsers(): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select(`
      *,
      store:stores!assigned_store_id (
        id,
        name,
        location
      )
    `)
    .order('name');

  if (error) {
    console.error('Error fetching users:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get single user by ID with store details
 */
export async function getUserById(userId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select(`
      *,
      store:stores!assigned_store_id (
        id,
        name,
        location
      )
    `)
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching user:', error);
    return null;
  }

  return data;
}

/**
 * Get users by store ID
 */
export async function getUsersByStore(storeId: string): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select(`
      *,
      store:stores!assigned_store_id (
        id,
        name,
        location
      )
    `)
    .eq('assigned_store_id', storeId)
    .order('name');

  if (error) {
    console.error('Error fetching users by store:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get users by role
 */
export async function getUsersByRole(role: UserRole): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select(`
      *,
      store:stores!assigned_store_id (
        id,
        name,
        location
      )
    `)
    .eq('role', role)
    .order('name');

  if (error) {
    console.error('Error fetching users by role:', error);
    throw error;
  }

  return data || [];
}

/**
 * Create a new user
 */
export async function createUser(
  userData: Omit<any, 'id' | 'created_at' | 'store'> & { password: string }
): Promise<User> {
  const { data, error } = await supabase
    .from('users')
    .insert({
      username: userData.username,
      name: userData.name,
      password: userData.password,
      role: userData.role,
      assigned_store_id: userData.assigned_store_id || null,
    })
    .select(`
      *,
      store:stores!assigned_store_id (
        id,
        name,
        location
      )
    `)
    .single();

  if (error) {
    console.error('Error creating user:', error);
    throw error;
  }

  return data as User;
}

/**
 * Update existing user
 */
export async function updateUser(
  userId: string,
  updates: Partial<Omit<any, 'id' | 'created_at' | 'username' | 'store'>>
): Promise<User> {
  const { data, error } = await supabase
    .from('users')
    .update({
      name: updates.name,
      role: updates.role,
      assigned_store_id: updates.assigned_store_id !== undefined 
        ? updates.assigned_store_id 
        : undefined,
    })
    .eq('id', userId)
    .select(`
      *,
      store:stores!assigned_store_id (
        id,
        name,
        location
      )
    `)
    .single();

  if (error) {
    console.error('Error updating user:', error);
    throw error;
  }

  return data as User;
}

/**
 * Delete user
 */
export async function deleteUser(id: string): Promise<void> {
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
}

/**
 * Assign manager to store
 * Ensures only ONE manager per store
 */
export async function assignManagerToStore(
  managerId: string,
  storeId: string
): Promise<void> {
  // Remove assignment from previous manager of this store
  await supabase
    .from('users')
    .update({ assigned_store_id: null })
    .eq('assigned_store_id', storeId)
    .neq('id', managerId);

  // Assign new manager
  const { error } = await supabase
    .from('users')
    .update({ assigned_store_id: storeId })
    .eq('id', managerId);

  if (error) {
    console.error('Error assigning manager:', error);
    throw error;
  }
}

/**
 * Unassign user from store
 */
export async function unassignUserFromStore(userId: string): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ assigned_store_id: null })
    .eq('id', userId);

  if (error) {
    console.error('Error unassigning user:', error);
    throw error;
  }
}

/**
 * Get available managers (not assigned to any store)
 */
export async function getAvailableManagers(): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'STORE_MANAGER')
    .is('assigned_store_id', null)
    .order('name');

  if (error) {
    console.error('Error fetching available managers:', error);
    throw error;
  }

  return data || [];
}