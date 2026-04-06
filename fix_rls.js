const https = require('https');

const queries = [
    `ALTER TABLE IF EXISTS archivos ENABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE IF EXISTS archivo_links ENABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE IF EXISTS archivo_proyectos ENABLE ROW LEVEL SECURITY;`,
    `DROP POLICY IF EXISTS "Acceso total autenticados" ON archivos;`,
    `CREATE POLICY "Acceso total autenticados" ON archivos FOR ALL TO authenticated USING (true) WITH CHECK (true);`,
    `DROP POLICY IF EXISTS "Acceso total autenticados" ON archivo_links;`,
    `CREATE POLICY "Acceso total autenticados" ON archivo_links FOR ALL TO authenticated USING (true) WITH CHECK (true);`,
    `DROP POLICY IF EXISTS "Acceso total autenticados" ON archivo_proyectos;`,
    `CREATE POLICY "Acceso total autenticados" ON archivo_proyectos FOR ALL TO authenticated USING (true) WITH CHECK (true);`,
    `DROP POLICY IF EXISTS "Acceso público por token" ON archivo_links;`,
    `CREATE POLICY "Acceso público por token" ON archivo_links FOR SELECT TO anon USING (activo = true AND (expira_en IS NULL OR expira_en > now()));`,
    `DROP POLICY IF EXISTS "Lectura pública de archivos compartidos" ON archivos;`,
    `CREATE POLICY "Lectura pública de archivos compartidos" ON archivos FOR SELECT TO anon USING (id IN (SELECT archivo_id FROM archivo_links WHERE activo = true AND (expira_en IS NULL OR expira_en > now())));`
];

async function runQuery(sql) {
    return new Promise((resolve, reject) => {
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
            res.on('end', () => { resolve(response); });
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

async function main() {
    for (const q of queries) {
        console.log(`Running: ${q}`);
        try {
            const res = await runQuery(q);
            console.log(`Result: ${res}`);
        } catch (err) {
            console.error(`Error in ${q}: ${err.message}`);
        }
    }
}

main();
