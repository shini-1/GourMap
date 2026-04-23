import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { uid } = await req.json();

    if (!uid) {
      return new Response(
        JSON.stringify({ error: "uid is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SERVICE_ROLE_KEY")!
    );

    // Authenticate caller
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check admin membership
    const { data: adminRow, error: adminError } = await supabaseAdmin
      .from("admins")
      .select("uid")
      .eq("uid", user.id)
      .single();

    if (adminError || !adminRow) {
      return new Response(
        JSON.stringify({ error: "Forbidden - Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update business_owners row to set is_verified = true
    const { data, error } = await supabaseAdmin
      .from("business_owners")
      .update({ is_verified: true })
      .eq("uid", uid)
      .select("uid");

    if (error) {
      throw new Error(error.message || "Failed to verify owner");
    }

    // If no row was updated, create it
    if (!data || data.length === 0) {
      const { data: userData, error: userFetchError } = await supabaseAdmin.auth.admin.getUserById(uid);
      
      if (userFetchError) {
        throw new Error("User not found in auth");
      }

      const email = userData?.user?.email ?? "";
      
      const { error: insertError } = await supabaseAdmin
        .from("business_owners")
        .insert({
          uid,
          email,
          first_name: "",
          last_name: "",
          phone_number: null,
          business_name: null,
          role: "business_owner",
          created_at: new Date().toISOString(),
          is_verified: true
        });

      if (insertError) {
        throw new Error(insertError.message || "Failed to create owner row");
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: "Owner verified successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in admin-verify-owner:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
