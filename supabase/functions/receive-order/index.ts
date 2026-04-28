import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse incoming data
    const payload = await req.json();
    const { extractedData, fileName } = payload;

    if (!extractedData || !fileName) {
      return new Response(
        JSON.stringify({ error: "Missing extractedData or fileName" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Calculate totals (solo productos, vajilla se gestiona manualmente)
    const totalProducts = extractedData.product_details?.length || 0;
    const totalTableware = 0;

    // Buscar PDF pendiente con el mismo nombre de archivo
    let pdfFilePath: string | null = null;
    let pdfFileSize: number | null = null;
    let pdfOriginalName: string | null = fileName;
    let pendingPdfId: string | null = null;

    // Intentar buscar con el nombre exacto primero
    let { data: pendingPdfs, error: pendingError } = await supabase
      .from("pending_pdfs")
      .select("*")
      .eq("file_name", fileName)
      .eq("processed", false)
      .order("uploaded_at", { ascending: false })
      .limit(1);

    // Si no se encuentra, intentar con .pdf agregado
    if ((!pendingPdfs || pendingPdfs.length === 0) && !fileName.endsWith('.pdf')) {
      console.log(`Trying with .pdf extension: ${fileName}.pdf`);
      const result = await supabase
        .from("pending_pdfs")
        .select("*")
        .eq("file_name", `${fileName}.pdf`)
        .eq("processed", false)
        .order("uploaded_at", { ascending: false })
        .limit(1);

      pendingPdfs = result.data;
      pendingError = result.error;
    }

    // Si aún no se encuentra, intentar con búsqueda parcial (comienza con el fileName)
    if ((!pendingPdfs || pendingPdfs.length === 0)) {
      console.log(`Trying partial match for: ${fileName}`);
      const result = await supabase
        .from("pending_pdfs")
        .select("*")
        .ilike("file_name", `${fileName}%`)
        .eq("processed", false)
        .order("uploaded_at", { ascending: false })
        .limit(1);

      pendingPdfs = result.data;
      pendingError = result.error;
    }

    if (!pendingError && pendingPdfs && pendingPdfs.length > 0) {
      const pendingPdf = pendingPdfs[0];
      pdfFilePath = pendingPdf.file_path;
      pdfFileSize = pendingPdf.file_size;
      pdfOriginalName = pendingPdf.file_name;
      pendingPdfId = pendingPdf.id;
      console.log(`✅ Found pending PDF: ${pendingPdf.file_name} for order: ${fileName}`);
    } else {
      console.log(`⚠️ No pending PDF found for: ${fileName}`);
    }

    // Insert order
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .insert({
        file_name: fileName,
        event_date: extractedData.order_information?.event_date || "",
        client_company: extractedData.client_details?.company_name || "",
        client_contact: extractedData.client_details?.contact_person || "",
        client_address: extractedData.client_details?.address || "",
        client_phone: extractedData.client_details?.phone_number || "",
        number_of_attendees: parseInt(extractedData.order_information?.number_of_attendees) || 0,
        sales_representative: extractedData.order_information?.sales_representative || "",
        extracted_data: extractedData,
        completion_status: {
          products: 0,
          tableware: 0,
          totalProducts,
          totalTableware,
        },
        pdf_file_path: pdfFilePath,
        pdf_file_size: pdfFileSize,
        pdf_original_name: pdfOriginalName,
      })
      .select()
      .single();

    if (orderError) {
      console.error("Order insert error:", orderError);
      return new Response(
        JSON.stringify({ error: "Failed to insert order", details: orderError }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const orderId = orderData.id;

    // Marcar el PDF pendiente como procesado y completado
    if (pendingPdfId) {
      await supabase
        .from("pending_pdfs")
        .update({
          processed: true,
          order_id: orderId,
          status: "completed",
        })
        .eq("id", pendingPdfId);
      console.log(`Marked pending PDF ${pendingPdfId} as processed for order ${orderId}`);
    }

    // Insert products (sin packaging, se asigna manualmente después)
    if (extractedData.product_details && extractedData.product_details.length > 0) {
      const products = extractedData.product_details.map((product: any) => ({
        order_id: orderId,
        product_name: product.product_name || "",
        category: product.Categoria || product.category || "",
        quantity: parseInt(product.quantity) || 0,
        format: product.format || "",
        size: product.size || "",
        packaging: "",
      }));

      const { error: productsError } = await supabase
        .from("order_products")
        .insert(products);

      if (productsError) {
        console.error("Products insert error:", productsError);
      }
    }

    // Vajilla: Ya no se inserta desde el JSON, se gestiona manualmente

    // Insert meal times
    const mealTimes = [];
    const meals = extractedData.order_information?.meal_times || {};

    for (const [mealType, mealData] of Object.entries(meals)) {
      if (mealData && typeof mealData === "object" && mealData !== null) {
        const meal: any = mealData;
        if (meal.preparation_time && meal.delivery_time) {
          mealTimes.push({
            order_id: orderId,
            meal_type: mealType,
            preparation_time: meal.preparation_time,
            travel_time: meal.travel_time || "",
            delivery_time: meal.delivery_time,
            delivery_responsible: meal.delivery_responsible || "",
          });
        }
      }
    }

    if (mealTimes.length > 0) {
      const { error: mealTimesError } = await supabase
        .from("meal_times")
        .insert(mealTimes);

      if (mealTimesError) {
        console.error("Meal times insert error:", mealTimesError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        orderId,
        pendingPdfId,
        message: "Order created successfully",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});