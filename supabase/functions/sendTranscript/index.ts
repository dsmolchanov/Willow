import { serve } from "https://deno.land/std@0.140.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse the incoming request
    const { session_id } = await req.json();

    // Fetch the transcript from the sessions table
    const { data: session, error } = await supabase
      .from("sessions")
      .select("transcript")
      .eq("id", session_id)
      .single();

    if (error || !session) {
      return new Response(JSON.stringify({ error: "Session not found" }), { status: 404 });
    }

    const transcript = session.transcript;

    // Send the transcript and session_id to the external API
    const externalApiUrl = "https://1d4be311-1fe3-405f-b080-e4ad882affac.mock.pstmn.io"; // Replace with actual URL
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

    return new Response(JSON.stringify({ message: "Transcript sent successfully" }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
});