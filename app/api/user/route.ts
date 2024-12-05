// app/api/user/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PATCH(req: Request) {
  try {
    const { traits, clerk_id } = await req.json();
    
    const { data, error } = await supabase
      .from('users')
      .update({ traits })
      .eq('clerk_id', clerk_id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error:', error);
    return new NextResponse('Error', { status: 500 });
  }
}