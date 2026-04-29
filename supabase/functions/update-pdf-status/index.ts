import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ALLOWED_STATUSES = new Set([
  "uploaded",
  "sent_to_n8n",
  "received_by_llamaindex",
  "extracting_ai",
  "creating_order",
  "completed",
  "failed",
]);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload = await req.json().catch(() => null) as
      | { pendingPdfId?: string; status?: string; errorMessage?: string | null }
      | null;

    if (!payload || !payload.pendingPdfId || !payload.status) {
      return new Response(
        JSON.stringify({ error: "Missing pendingPdfId or status" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!ALLOWED_STATUSES.has(payload.status)) {
      return new Response(
        JSON.stringify({
          error: "Invalid status",
          allowed: Array.from(ALLOWED_STATUSES),
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const updates: Record<string, unknown> = { status: payload.status };
    if (payload.status === "failed") {
      updates.error_message = payload.errorMessage ?? null;
    }

    const { data, error } = await supabase
      .from("pending_pdfs")
      .update(updates)
      .eq("id", payload.pendingPdfId)
      .select("id, status, status_updated_at")
      .maybeSingle();

    if (error) {
      console.error("update-pdf-status update error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to update status", details: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!data) {
      return new Response(
        JSON.stringify({ error: "pending_pdf not found", pendingPdfId: payload.pendingPdfId }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, pendingPdf: data }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("update-pdf-status fatal:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
