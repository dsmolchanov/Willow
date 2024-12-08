// supabase/functions/clerk-webhook/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Webhook } from 'npm:svix'

serve(async (req) => {
  const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET')
  if (!WEBHOOK_SECRET) throw new Error('Missing WEBHOOK_SECRET')

  const svix_id = req.headers.get("svix-id")
  const svix_timestamp = req.headers.get("svix-timestamp")
  const svix_signature = req.headers.get("svix-signature")

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Missing svix headers', { status: 400 })
  }

  const payload = await req.json()
  const webhook = new Webhook(WEBHOOK_SECRET)

  try {
    webhook.verify(JSON.stringify(payload), {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    })

    const { id, email_addresses, image_url, first_name, last_name } = payload.data
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    await supabase.from('users').upsert({
      clerk_id: id,
      email: email_addresses[0]?.email_address,
      name: [first_name, last_name].filter(Boolean).join(' '),
      image_url
    })

    return new Response(JSON.stringify({ success: true }), { status: 200 })
  } catch (err) {
    return new Response('Invalid signature', { status: 400 })
  }
})