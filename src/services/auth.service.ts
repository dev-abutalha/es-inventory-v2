import { supabase } from "../../supabaseClient";
import { User } from "../../types";

export async function loginUser(
  username: string,
  password: string,
): Promise<User | null> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("username", username)
    .eq("password", password)
    .single();

  if (error) {
    console.error("Login failed:", error.message);
    return null;
  }

  return {
    id: data.id,
    username: data.username,
    name: data.name,
    role: data.role,
    assignedStoreId: data.assigned_store_id,
  };
}
