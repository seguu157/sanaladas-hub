import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: profile, error: profileError } = await supabaseClient
      .from("user_profiles")
      .select("role, organization_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile || profile.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Only admins can delete users" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { user_id } = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "User ID is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: targetProfile, error: targetProfileError } = await supabaseAdmin
      .from("user_profiles")
      .select("role, organization_id")
      .eq("id", user_id)
      .maybeSingle();

    if (targetProfileError || !targetProfile) {
      return new Response(
        JSON.stringify({ error: "Target user not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (targetProfile.organization_id !== profile.organization_id) {
      return new Response(
        JSON.stringify({ error: "Cannot delete users from other organizations" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (user_id === user.id) {
      return new Response(
        JSON.stringify({ error: "Cannot delete your own account" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (targetProfile.role === "admin") {
      return new Response(
        JSON.stringify({ error: "Cannot delete admin accounts" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Clean up related data first to avoid FK issues
    // Delete user's AI conversations
    await supabaseAdmin
      .from("ai_conversations")
      .delete()
      .eq("user_id", user_id);

    // Delete user's order comments
    await supabaseAdmin
      .from("order_comments")
      .delete()
      .eq("user_id", user_id);

    // Delete user's pending PDFs
    await supabaseAdmin
      .from("pending_pdfs")
      .delete()
      .eq("user_id", user_id);

    // Delete user's shopping list items
    await supabaseAdmin
      .from("shopping_list")
      .delete()
      .eq("created_by", user_id);

    // Delete user's products inventory
    await supabaseAdmin
      .from("products_inventory")
      .delete()
      .eq("created_by", user_id);

    // Set NULL for orders created by user (instead of deleting them)
    await supabaseAdmin
      .from("orders")
      .update({ user_id: null })
      .eq("user_id", user_id);

    // Set NULL for orders assigned to user
    await supabaseAdmin
      .from("orders")
      .update({ assigned_to: null })
      .eq("assigned_to", user_id);

    // Delete user profile manually first
    const { error: deleteProfileError } = await supabaseAdmin
      .from("user_profiles")
      .delete()
      .eq("id", user_id);

    if (deleteProfileError) {
      console.error("Error deleting profile:", deleteProfileError);
      return new Response(
        JSON.stringify({ 
          error: "Error deleting user profile",
          details: deleteProfileError.message,
          code: deleteProfileError.code
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Now delete from auth.users
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id);

    if (deleteError) {
      console.error("Error deleting auth user:", deleteError);
      return new Response(
        JSON.stringify({ 
          error: "Error deleting auth user",
          details: deleteError.message
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "User deleted successfully",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error", 
        details: error.message,
        stack: error.stack
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});