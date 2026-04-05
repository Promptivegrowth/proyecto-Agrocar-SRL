const https = require('https');

const query = `
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'archivo_links';
`;

const data = JSON.stringify({ query });

const options = {
    hostname: 'api.supabase.com',
    port: 443,
    path: '/v1/projects/ktvpoafwopcybuvbtmme/database/query',
    method: 'POST',
    headers: {
        'Authorization': 'Bearer sbp_fa0e73fd099dfe7d516d59d60c0903d1aba53012',
        'Content-Type': 'application/json',
        'Content-Length': data.length
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
