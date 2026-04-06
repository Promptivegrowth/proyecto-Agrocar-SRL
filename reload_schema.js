const https = require('https');

const sql = `
-- Drop and Re-add 'activo' to force PostgREST to notice it
ALTER TABLE IF EXISTS archivo_proyectos DROP COLUMN IF EXISTS activo;
ALTER TABLE IF EXISTS archivo_proyectos ADD COLUMN activo boolean DEFAULT true;

ALTER TABLE IF EXISTS archivos DROP COLUMN IF EXISTS activo;
ALTER TABLE IF EXISTS archivos ADD COLUMN activo boolean DEFAULT true;

-- Garantizar permisos
GRANT ALL ON TABLE archivo_proyectos TO authenticated, anon, service_role;
GRANT ALL ON TABLE archivos TO authenticated, anon, service_role;

NOTIFY pgrst, 'reload schema';
`;

const data = JSON.stringify({ query: sql });

const options = {
    hostname: 'api.supabase.com',
    port: 443,
    path: '/v1/projects/ktvpoafwopcybuvbtmme/database/query',
    method: 'POST',
    headers: {
        'Authorization': 'Bearer sbp_7c8050356071fc00b58dc2f4d25cec41b120c073',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
    }
};

const req = https.request(options, (res) => {
    let response = '';
    res.on('data', (d) => { response += d; });
    res.on('end', () => { console.log(response); });
});

req.on('error', (e) => { console.error(e); });
req.write(data);
req.end();
