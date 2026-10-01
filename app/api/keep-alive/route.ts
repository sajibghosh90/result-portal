import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = getSupabaseClient();

    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Supabase client initialize করা যায়নি' }, { status: 500 });
    }

    // আপনার যেকোনো একটি টেবিল থেকে ডাটা চেক করা
    const { data, error } = await supabase
      .from('subjects')
      .select('id')
      .limit(1);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Supabase status: Active', data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
