const https = require('https');

const sql = `
-- 1. Agregar columnas para mantenimiento y multas
ALTER TABLE vehiculos 
ADD COLUMN IF NOT EXISTS ultimo_km_aceite INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS objetivo_km_aceite INTEGER DEFAULT 5000,
ADD COLUMN IF NOT EXISTS tiene_papeletas BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS monto_papeletas DECIMAL(10,2) DEFAULT 0;

-- 2. Asegurar que fleet_alertas tenga los tipos correctos
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fleet_alerta_tipo') THEN
        -- Si no es un enum, solo verificamos o agregamos lógica de aplicación
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
`;

const data = JSON.stringify({ query: sql });

const options = {
    hostname: 'api.supabase.com',
    port: 443,
    path: '/v1/projects/ktvpoafwopcybuvbtmme/database/query',
    method: 'POST',
    headers: {
        'Authorization': 'Bearer sbp_dcf5a24a4afd63b702fd20e798edb7d9994b82d5',
        'Content-Type': 'application/json'
    }
};

const req = https.request(options, (res) => {
    let responseText = '';
    res.on('data', (d) => { responseText += d; });
    res.on('end', () => {
        console.log('Status Code:', res.statusCode);
        console.log('Response:', responseText);
    });
});

req.on('error', (e) => { console.error('Error:', e); });
req.write(data);
req.end();
