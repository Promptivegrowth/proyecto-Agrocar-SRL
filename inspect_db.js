const { createClient } = require('@supabase/supabase-js');

const URL = 'https://ktvpoafwopcybuvbtmme.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0dnBvYWZ3b3BjeWJ1dmJ0bW1lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTIzODUwMywiZXhwIjoyMDkwODE0NTAzfQ.wDV3s--Hudho8gHyBoRAlzeH75LI_WnQ1JL56GEIbtU';

const supabase = createClient(URL, KEY);

async function inspect() {
    console.log("--- INSPECCIONANDO ESQUEMA ---");

    // Consultar una fila de pedidos para ver sus llaves
    const { data: pedido, error: errP } = await supabase.from('pedidos').select('*').limit(1);
    if (errP) console.error("Error pedidos:", errP.message);
    else console.log("Columnas pedidos:", Object.keys(pedido[0] || {}));

    const { data: detalle, error: errD } = await supabase.from('detalles_pedidos').select('*').limit(1);
    if (errD) console.error("Error detalles:", errD.message);
    else console.log("Columnas detalles_pedidos:", Object.keys(detalle[0] || {}));

    const { data: visita, error: errV } = await supabase.from('visitas_gps').select('*').limit(1);
    if (errV) console.error("Error visitas:", errV.message);
    else console.log("Columnas visitas_gps:", Object.keys(visita[0] || {}));

    console.log("--- FIN INSPECCION ---");
}

inspect();
