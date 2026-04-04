const axios = require('axios');

async function run() {
    const sql = `
    ALTER TABLE clientes DROP CONSTRAINT IF EXISTS clientes_tipo_cliente_check;
    ALTER TABLE clientes ADD CONSTRAINT clientes_tipo_cliente_check 
    CHECK (tipo_cliente IN ('principal', 'secundario', 'prospecto', 'otro'));
  `;

    try {
        const res = await axios.post('https://api.supabase.com/v1/projects/ktvpoafwopcybuvbtmme/database/query',
            { query: sql },
            {
                headers: {
                    'Authorization': 'Bearer sbp_185f5bb44fdd982c97be0b120eaeb9620355359e',
                    'Content-Type': 'application/json'
                }
            }
        );
        console.log('SQL Result:', res.data);
    } catch (e) {
        console.error('Error:', e.response?.data || e.message);
    }
}

run();
