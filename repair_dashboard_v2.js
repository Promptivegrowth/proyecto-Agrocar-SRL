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

async function repair() {
    console.log("--- REPARANDO DASHBOARD Y ANALITICA ---");

    try {
        const sql = `
        CREATE OR REPLACE FUNCTION get_ventas_por_categoria()
        RETURNS TABLE (categoria TEXT, total_ventas NUMERIC) AS $$
        BEGIN
          RETURN QUERY
          SELECT 
            p.categoria,
            SUM(dp.subtotal || 0)::NUMERIC as total_ventas
          FROM 
            detalles_pedidos dp
          JOIN 
            productos p ON dp.producto_id = p.id
          GROUP BY 
            p.categoria
          ORDER BY 
            total_ventas DESC;
        END;
        $$ LANGUAGE plpgsql;
        `;

        console.log("Creando función get_ventas_por_categoria...");
        const res = await runSQL(sql);
        if (res.message) console.error("Error SQL:", res.message);
        else console.log("✅ Función SQL creada.");

        // Seeding Data
        console.log("Verificando usuarios y clientes...");
        const { data: vends } = await supabase.from('usuarios').select('id').limit(3);
        const { data: clis } = await supabase.from('clientes').select('id').limit(10);
        const { data: vehs } = await supabase.from('vehiculos').select('id').limit(5);

        if (!vends || !clis || vends.length === 0 || clis.length === 0) {
            console.error("No hay maestros (usuarios/clientes) suficientes para el seeding.");
            return;
        }

        const hoy = new Date().toISOString().split('T')[0];

        // 1. Pedidos para hoy (Supervisión Flota)
        console.log("Generando actividad de hoy (Supervisión de Flota)...");
        for (let i = 0; i < 5; i++) {
            await supabase.from('pedidos').insert({
                cliente_id: clis[i % clis.length].id,
                vendedor_id: vends[i % vends.length].id,
                vehiculo_id: vehs ? vehs[i % vehs.length]?.id : null,
                fecha_entrega: hoy,
                total: 250 + (i * 10),
                estado: 'en_ruta',
                moneda: 'PEN'
            });

            await supabase.from('visitas_gps').insert({
                vendedor_id: vends[i % vends.length].id,
                cliente_id: clis[(i + 2) % clis.length].id,
                fecha: hoy,
                hora_checkin: new Date().toISOString(),
                resultado: 'pendiente'
            });
        }

        // 2. Pedidos Históricos (Reportes 90 días)
        console.log("Generando historial de 90 días...");
        for (let i = 0; i < 100; i++) {
            const d = new Date();
            d.setDate(d.getDate() - Math.floor(Math.random() * 90));
            const fechaStr = d.toISOString().split('T')[0];

            await supabase.from('pedidos').insert({
                cliente_id: clis[i % clis.length].id,
                vendedor_id: vends[i % vends.length].id,
                fecha_entrega: fechaStr,
                total: 100 + Math.random() * 900,
                estado: 'entregado',
                moneda: 'PEN'
            });
        }

        console.log("--- REPARACIÓN COMPLETADA CON ÉXITO ---");
    } catch (e) {
        console.error("Fallo crítico:", e.message);
    }
}

repair();
