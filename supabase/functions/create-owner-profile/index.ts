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
    const { uid, email, firstName, lastName, phoneNumber, businessName } = await req.json();

    if (!uid || !email) {
      return new Response(
        JSON.stringify({ error: "uid and email are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SERVICE_ROLE_KEY")!
    );

    // Create business_owners profile (bypasses RLS with service role)
    const { error } = await supabaseAdmin
      .from("business_owners")
      .insert({
        uid,
        email,
        first_name: firstName || "",
        last_name: lastName || "",
        phone_number: phoneNumber ?? null,
        business_name: businessName ?? null,
        role: "business_owner",
        created_at: new Date().toISOString(),
        is_verified: false
      });

    if (error) {
      // If row already exists, that's okay
      if (error.code === "23505") {
        return new Response(
          JSON.stringify({ success: true, message: "Profile already exists" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(error.message || "Failed to create profile");
    }

    return new Response(
      JSON.stringify({ success: true, message: "Profile created successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in create-owner-profile:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
