const { createClient } = require('@supabase/supabase-js');

const URL = 'https://ktvpoafwopcybuvbtmme.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0dnBvYWZ3b3BjeWJ1dmJ0bW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMzg1MDMsImV4cCI6MjA5MDgxNDUwM30.RMyPjP2jsvzu8j_Hg6CUWh5MNsZI19cjH1yZ64tZfDE';

const supabase = createClient(URL, ANON_KEY);

async function verify() {
    console.log("--- VERIFICACION ANONIMA ---");

    // Probar select en pedidos
    const { data, error } = await supabase.from('pedidos').select('fecha_entrega, total').limit(1);
    if (error) console.error("❌ Pedidos (Anon):", error.message);
    else console.log("✅ Pedidos (Anon) accesible:", data);

    // Probar RPC
    const { data: rpc, error: rpcErr } = await supabase.rpc('get_ventas_por_categoria');
    if (rpcErr) console.error("❌ RPC (Anon):", rpcErr.message);
    else console.log("✅ RPC (Anon) accesible:", rpc);

    // Probar conteos de flota
    const hoy = new Date().toISOString().split('T')[0];
    const { count, error: errC } = await supabase.from('pedidos').select('*', { count: 'exact', head: true }).eq('fecha_entrega', hoy);
    if (errC) console.error("❌ Conteo Hoy (Anon):", errC.message);
    else console.log("✅ Conteo Hoy (Anon):", count);

    console.log("--- FIN VERIFICACION ---");
}
verify();
