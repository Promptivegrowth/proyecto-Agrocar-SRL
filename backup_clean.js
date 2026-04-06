const https = require('https');
const fs = require('fs');

const query = `SELECT * FROM archivo_proyectos;`;
const data = JSON.stringify({ query });

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
    res.on('end', () => {
        try {
            const projects = JSON.parse(response);
            fs.writeFileSync('c:\\Users\\LUIGI\\Desktop\\proyecto Agrocar SRL\\agrocar-erp\\projects_clean.json', JSON.stringify(projects, null, 2));
            console.log(`Saved ${projects.length} projects to projects_clean.json`);
        } catch (e) {
            console.error("Failed to parse/save: " + response);
        }
    });
});

req.on('error', (e) => { console.error(e); });
req.write(data);
req.end();
