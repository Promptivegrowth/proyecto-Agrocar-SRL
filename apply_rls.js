const https = require('https');

const sql = `
ALTER TABLE archivo_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE archivos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acceso público por token" ON archivo_links;
CREATE POLICY "Acceso público por token" ON archivo_links FOR SELECT TO anon USING (activo = true AND (expira_en IS NULL OR expira_en > now()));

DROP POLICY IF EXISTS "Lectura pública de archivos compartidos" ON archivos;
CREATE POLICY "Lectura pública de archivos compartidos" ON archivos FOR SELECT TO anon USING (id IN (SELECT archivo_id FROM archivo_links WHERE activo = true AND (expira_en IS NULL OR expira_en > now())));
`;

const data = JSON.stringify({ query: sql });

const options = {
    hostname: 'api.supabase.com',
    port: 443,
    path: '/v1/projects/ktvpoafwopcybuvbtmme/database/query',
    method: 'POST',
    headers: {
        'Authorization': 'Bearer sbp_fa0e73fd099dfe7d516d59d60c0903d1aba53012',
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
