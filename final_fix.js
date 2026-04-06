const https = require('https');

const ACCESS_TOKEN = 'sbp_0ce43f4aa873ce89775874028be2546ed3fa9317';
const REF = 'ktvpoafwopcybuvbtmme';

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
      res.on('end', () => resolve(data));
    });

    req.on('error', (e) => reject(e));
    req.write(body);
    req.end();
  });
}

async function fix() {
  console.log("--- FINAL FIX INICIADO ---");

  const queries = [
    "ALTER TABLE pedidos DISABLE ROW LEVEL SECURITY;",
    "ALTER TABLE detalles_pedidos DISABLE ROW LEVEL SECURITY;",
    "ALTER TABLE visitas_gps DISABLE ROW LEVEL SECURITY;",
    "ALTER TABLE productos DISABLE ROW LEVEL SECURITY;",
    "ALTER TABLE clientes DISABLE ROW LEVEL SECURITY;",
    "ALTER TABLE zonas DISABLE ROW LEVEL SECURITY;",
    `CREATE OR REPLACE FUNCTION get_ventas_por_categoria()
        RETURNS TABLE (categoria TEXT, total_ventas NUMERIC) AS $$
        BEGIN
          RETURN QUERY
          SELECT 
            p.categoria,
            COALESCE(SUM(dp.subtotal), 0)::NUMERIC as total_ventas
          FROM 
            detalles_pedidos dp
          JOIN 
            productos p ON dp.producto_id = p.id
          GROUP BY 
            p.categoria
          ORDER BY 
            total_ventas DESC;
        END;
        $$ LANGUAGE plpgsql;`
  ];

  for (const q of queries) {
    console.log(`Ejecutando SQL...`);
    const res = await runSQL(q);
    console.log("Resultado:", res.substring(0, 50));
  }

  console.log("--- FINAL FIX COMPLETADO ---");
}

fix();
