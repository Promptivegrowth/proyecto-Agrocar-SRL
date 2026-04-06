const https = require('https');
const fs = require('fs');

try {
    const rawData = fs.readFileSync('c:\\Users\\LUIGI\\Desktop\\proyecto Agrocar SRL\\agrocar-erp\\projects_clean.json', 'utf8');
    const cleanedData = rawData.replace(/^\ufeff/, '').replace(/\x00/g, '');
    const projects = JSON.parse(cleanedData);

    console.log(`Loaded ${projects.length} projects`);

    const sql = `
    DROP TABLE IF EXISTS archivo_proyectos CASCADE;
    CREATE TABLE archivo_proyectos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nombre TEXT NOT NULL,
        descripcion TEXT,
        icono TEXT,
        activo BOOLEAN DEFAULT true,
        creado_por UUID REFERENCES auth.users(id),
        created_at TIMESTAMPTZ DEFAULT now()
    );
    ${projects.map(p => {
        const createdAt = p.created_at ? p.created_at.replace(' ', 'T') : new Date().toISOString();
        return `INSERT INTO archivo_proyectos (id, nombre, descripcion, icono, activo, creado_por, created_at)
        VALUES ('${p.id}', '${p.nombre.replace(/'/g, "''")}', '${(p.descripcion || '').replace(/'/g, "''")}', '${p.icono || ""}', ${p.activo}, ${p.creado_por ? `'${p.creado_por}'` : 'NULL'}, '${createdAt}');`;
    }).join('\n')}

    ALTER TABLE archivo_proyectos DISABLE ROW LEVEL SECURITY;
    GRANT ALL ON TABLE archivo_proyectos TO authenticated, anon, service_role;
    NOTIFY pgrst, 'reload schema';
    `;

    const reqData = JSON.stringify({ query: sql });
    const options = {
        hostname: 'api.supabase.com',
        port: 443,
        path: '/v1/projects/ktvpoafwopcybuvbtmme/database/query',
        method: 'POST',
        headers: {
            'Authorization': 'Bearer sbp_7c8050356071fc00b58dc2f4d25cec41b120c073',
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(reqData)
        }
    };

    const req = https.request(options, (res) => {
        let response = '';
        res.on('data', (d) => { response += d; });
        res.on('end', () => { console.log(response); });
    });

    req.on('error', (e) => { console.error(e); });
    req.write(reqData);
    req.end();
} catch (e) {
    console.error("Error reading/parsing backup: " + e.message);
}
