const { createClient } = require('@supabase/supabase-js');
const https = require('https');

const URL_SB = 'https://ktvpoafwopcybuvbtmme.supabase.co';
const KEY_SVC = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0dnBvYWZ3b3BjeWJ1dmJ0bW1lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTIzODUwMywiZXhwIjoyMDkwODE0NTAzfQ.wDV3s--Hudho8gHyBoRAlzeH75LI_WnQ1JL56GEIbtU';

const supabase = createClient(URL_SB, KEY_SVC);

async function q(table, select = '*') {
    const { data, error } = await supabase.from(table).select(select).limit(1);
    if (error) return { error: error.message };
    return data;
}

async function audit() {
    console.log('\n======= DEEP AUDIT =======\n');

    // 1. Muestra de pedidos completo (ver todas las columnas reales)
    console.log('--- pedidos (1 fila) ---');
    const p = await q('pedidos');
    if (p.error) console.log('ERROR:', p.error);
    else if (p.length > 0) console.log(Object.keys(p[0]));
    else console.log('TABLA VACIA');

    // 2. Muestra de detalles_pedidos
    console.log('\n--- detalles_pedidos (1 fila) ---');
    const d = await q('detalles_pedidos');
    if (d.error) console.log('ERROR:', d.error);
    else if (d.length > 0) console.log(Object.keys(d[0]));
    else console.log('TABLA VACIA');

    // 3. Muestra de vehiculos 
    console.log('\n--- vehiculos (1 fila) ---');
    const v = await q('vehiculos');
    if (v.error) console.log('ERROR:', v.error);
    else if (v.length > 0) console.log(JSON.stringify(v[0], null, 2));
    else console.log('TABLA VACIA');

    // 4. Muestra de clientes y zonas
    console.log('\n--- clientes (1 fila) ---');
    const c = await q('clientes');
    if (c.error) console.log('ERROR:', c.error);
    else if (c.length > 0) console.log(Object.keys(c[0]));
    else console.log('TABLA VACIA');

    // 5. Contar vehiculos
    console.log('\n--- CONTEO vehiculos ---');
    const { count: vCount } = await supabase.from('vehiculos').select('*', { count: 'exact', head: true });
    console.log('Total vehiculos:', vCount);

    // 6. Contar pedidos
    console.log('\n--- CONTEO pedidos ---');
    const { count: pCount } = await supabase.from('pedidos').select('*', { count: 'exact', head: true });
    console.log('Total pedidos:', pCount);

    // 7. Test: pedidos con fecha de hoy
    const hoy = new Date().toISOString().split('T')[0];
    console.log('\n--- Test fecha hoy:', hoy, '---');

    // Try common date column names
    for (const col of ['fecha_entrega', 'fecha', 'fecha_programada', 'created_at', 'fecha_pedido']) {
        const { data: testData, error: testErr } = await supabase
            .from('pedidos')
            .select('id')
            .gte(col, hoy)
            .limit(1);
        if (!testErr) {
            console.log(`✅ Columna '${col}' EXISTE y funciona con gte. Resultados:`, testData?.length);
        } else {
            console.log(`❌ Columna '${col}': ${testErr.message.substring(0, 80)}`);
        }
    }

    // 8. Test join detalles_pedidos <-> productos
    console.log('\n--- Test join detalles_pedidos con productos ---');
    const { data: jData, error: jErr } = await supabase
        .from('detalles_pedidos')
        .select('*, productos(*)')
        .limit(1);
    if (jErr) console.log('Join FALLIDO:', jErr.message);
    else console.log('Join EXITOSO. Columnas:', jData?.length > 0 ? Object.keys(jData[0]) : 'sin datos');

    // 9. Test join pedidos <-> clientes <-> zonas
    console.log('\n--- Test join pedidos -> clientes -> zonas ---');
    const { data: j2, error: j2Err } = await supabase
        .from('pedidos')
        .select('total, clientes(zona_id, zonas(nombre))')
        .limit(1);
    if (j2Err) console.log('Join FALLIDO:', j2Err.message);
    else console.log('Join EXITOSO:', JSON.stringify(j2, null, 2));

    console.log('\n======= FIN AUDIT =======\n');
}

audit().catch(console.error);
