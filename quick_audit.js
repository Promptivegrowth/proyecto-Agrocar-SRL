const { createClient } = require('@supabase/supabase-js');

const URL_SB = 'https://ktvpoafwopcybuvbtmme.supabase.co';
const KEY_SVC = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0dnBvYWZ3b3BjeWJ1dmJ0bW1lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTIzODUwMywiZXhwIjoyMDkwODE0NTAzfQ.wDV3s--Hudho8gHyBoRAlzeH75LI_WnQ1JL56GEIbtU';

const supabase = createClient(URL_SB, KEY_SVC);

async function audit() {
    // ---- pedidos columns ----
    const { data: p } = await supabase.from('pedidos').select('*').limit(1);
    process.stdout.write('\nCOLUMNAS_PEDIDOS:' + JSON.stringify(p?.[0] ? Object.keys(p[0]) : []) + '\n');

    // ---- detalles_pedidos columns ----
    const { data: d } = await supabase.from('detalles_pedidos').select('*').limit(1);
    process.stdout.write('COLUMNAS_DETALLES:' + JSON.stringify(d?.[0] ? Object.keys(d[0]) : []) + '\n');

    // ---- vehiculos columns ----
    const { data: v } = await supabase.from('vehiculos').select('*').limit(1);
    process.stdout.write('COLUMNAS_VEHICULOS:' + JSON.stringify(v?.[0] ? Object.keys(v[0]) : []) + '\n');
    process.stdout.write('VEHICULO_1:' + JSON.stringify(v?.[0]) + '\n');

    // ---- vehiculos count ----
    const { count: vc } = await supabase.from('vehiculos').select('*', { count: 'exact', head: true });
    process.stdout.write('TOTAL_VEHICULOS:' + vc + '\n');

    // ---- test every date column ----
    const hoy = '2026-04-06';
    for (const col of ['fecha_entrega', 'fecha', 'fecha_programada', 'fecha_pedido', 'created_at']) {
        const { data, error } = await supabase.from('pedidos').select('id').gte(col, hoy).limit(1);
        process.stdout.write(`DATE_COL[${col}]:${error ? 'ERROR:' + error.code : 'OK:' + data?.length}\n`);
    }

    // ---- test join detalles -> productos ----
    const { data: jd, error: je } = await supabase.from('detalles_pedidos').select('subtotal, productos(categoria)').limit(1);
    process.stdout.write('JOIN_DETALLES_PRODUCTOS:' + (je ? 'ERROR:' + je.message : 'OK:' + JSON.stringify(jd)) + '\n');

    // ---- test join pedidos -> clientes -> zonas ----
    const { data: jc, error: jce } = await supabase.from('pedidos').select('total, clientes(zona_id, zonas(nombre))').limit(1);
    process.stdout.write('JOIN_PEDIDOS_CLIENTES_ZONAS:' + (jce ? 'ERROR:' + jce.message : 'OK:' + JSON.stringify(jc)) + '\n');
}

audit().catch(e => process.stdout.write('FATAL:' + e.message + '\n'));
