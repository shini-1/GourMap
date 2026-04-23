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
    const { filter } = await req.json();

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

    // List all auth users
    const { data: listRes, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ 
      page: 1, 
      perPage: 200 
    } as any);

    if (listErr) {
      throw new Error(listErr.message || "Failed to list users");
    }

    const authUsers = (listRes?.users ?? []).filter((u: any) => !!u.email);

    // Load admins to exclude
    const { data: admins } = await supabaseAdmin
      .from("admins")
      .select("uid")
      .range(0, 499);

    const adminSet = new Set((admins ?? []).map((a: any) => a.uid));

    // Fetch business_owners rows for all auth users
    const uids = authUsers.map((u: any) => u.id);
    const { data: ownerRows } = await supabaseAdmin
      .from("business_owners")
      .select("*")
      .in("uid", uids.length ? uids : ["__none__"])
      .range(0, 499);

    const ownerMap = new Map((ownerRows ?? []).map((r: any) => [r.uid, r]));

    // Build owner views
    const views = authUsers
      .filter((u: any) => !adminSet.has(u.id))
      .map((u: any) => {
        const row = ownerMap.get(u.id);
        const emailConfirmed = Boolean(u.email_confirmed_at);
        return {
          uid: u.id,
          email: u.email,
          firstName: row?.first_name ?? "",
          lastName: row?.last_name ?? "",
          phoneNumber: row?.phone_number ?? undefined,
          businessName: row?.business_name ?? undefined,
          isVerified: Boolean(row?.is_verified),
          createdAt: (row?.created_at ?? u.created_at) as string,
          emailConfirmed
        };
      })
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Apply filter
    const filtered = filter === "pending" ? views.filter((v: any) => !v.isVerified) : views;

    return new Response(
      JSON.stringify(filtered),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in admin-list-owners:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
