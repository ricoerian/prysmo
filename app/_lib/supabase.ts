import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  // During build, environment variables might not be defined.
  // We'll throw an error if someone actually tries to use the client.
}

export const supabase = createClient(
  supabaseUrl || "",
  supabaseServiceKey || ""
);
