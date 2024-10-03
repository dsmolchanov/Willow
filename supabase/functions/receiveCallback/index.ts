import { serve } from "https://deno.land/std@0.140.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    // Verify the request method
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    // Parse the incoming request
    const { session_id } = await req.json();

    if (!session_id) {
      return new Response(JSON.stringify({ error: "Invalid payload: session_id is required" }), { status: 400 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch the transcript from the sessions table
    const { data: session, error: fetchError } = await supabase
      .from("sessions")
      .select("transcript")
      .eq("id", session_id)
      .single();

    if (fetchError || !session) {
      return new Response(JSON.stringify({ error: "Session not found" }), { status: 404 });
    }

    const transcript = session.transcript;

    // Send the transcript to the external API
    const externalApiUrl = "https://external-api.com/process"; // Replace with actual URL
    const callbackUrl = "https://qhobnmjfjhxcgmmqxrbz.supabase.co/functions/v1/receiveCallback"; // Replace with your actual Edge Function URL

    const response = await fetch(externalApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Include any required authentication headers for the external API
      },
      body: JSON.stringify({
        transcript,
        session_id,
        callback_url: callbackUrl,
      }),
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ error: "Failed to send transcript to external API" }), { status: 500 });
    }

    // Update the sessions table to indicate that the report generation has started
    const { error: updateError } = await supabase
      .from("sessions")
      .update({ report_status: "processing" })
      .eq("id", session_id);

    if (updateError) {
      console.error("Failed to update session status:", updateError);
      // We don't return an error response here as the main operation (sending to external API) was successful
    }

    return new Response(JSON.stringify({ message: "Transcript sent successfully, report generation started" }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
});