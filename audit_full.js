const { createClient } = require('@supabase/supabase-js');
const https = require('https');

const URL = 'https://ktvpoafwopcybuvbtmme.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0dnBvYWZ3b3BjeWJ1dmJ0bW1lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTIzODUwMywiZXhwIjoyMDkwODE0NTAzfQ.wDV3s--Hudho8gHyBoRAlzeH75LI_WnQ1JL56GEIbtU';
const ACCESS_TOKEN = 'sbp_0ce43f4aa873ce89775874028be2546ed3fa9317';
const REF = 'ktvpoafwopcybuvbtmme';

const supabase = createClient(URL, KEY);

function runSQL(query) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({ query });
        const options = {
            hostname: 'api.supabase.com',
            port: 443,
            path: `/v1/projects/${REF}/query`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
                'Content-Length': body.length
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        });

        req.on('error', (e) => reject(e));
        req.write(body);
        req.end();
    });
}

async function audit() {
    console.log("--- AUDITORIA ANALITICA AGROCAR ---");

    try {
        // 1. Listar columnas de pedidos
        console.log("\n[1] Columnas de 'pedidos':");
        const cols = await runSQL("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'pedidos'");
        console.log(cols);

        // 2. Listar funciones
        console.log("\n[2] Funciones en esquema 'public':");
        const funcs = await runSQL("SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public'");
        console.log(funcs);

        // 3. RLS de pedidos
        console.log("\n[3] Políticas RLS de 'pedidos':");
        const policies = await runSQL("SELECT * FROM pg_policies WHERE tablename = 'pedidos'");
        console.log(policies);

        // 4. Probar query directa desde JS (Simulando Browser)
        console.log("\n[4] Prueba Query Directa (JS Client):");
        const { data, error } = await supabase.from('pedidos').select('fecha_entrega, total').limit(1);
        if (error) console.error("FALLO JS SELECT:", error.message);
        else console.log("EXITO JS SELECT:", data);

        // 5. Probar RPC desde JS
        console.log("\n[5] Prueba RPC get_ventas_por_categoria:");
        const { data: rpcData, error: rpcErr } = await supabase.rpc('get_ventas_por_categoria');
        if (rpcErr) console.error("FALLO RPC:", rpcErr.message);
        else console.log("EXITO RPC:", rpcData);

    } catch (e) {
        console.error("Fallo Auditoria:", e.message);
    }

    console.log("\n--- FIN AUDITORIA ---");
}

audit();
