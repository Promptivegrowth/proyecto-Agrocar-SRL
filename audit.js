const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim() || env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim();

const supabase = createClient(url, key);

async function run() {
    console.log('--- DEEP DIVE ---');

    const client_id = '6a093b84-6c99-4475-8bd0-e448b37603f9';
    const { data: cli } = await supabase.from('clientes').select('*').eq('id', client_id).single();
    console.log('Client Full Data:', cli);

    const { data: recs } = await supabase.from('comprobantes').select('*').eq('tipo', 'DI').limit(5);
    console.log('DI Records Full Data:', recs);

    const { data: all_types } = await supabase.from('comprobantes').select('tipo, count').select('tipo');
    console.log('All Types distribution:', all_types?.reduce((acc, curr) => {
        acc[curr.tipo] = (acc[curr.tipo] || 0) + 1;
        return acc;
    }, {}));
}
run();
