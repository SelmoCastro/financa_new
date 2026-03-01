import * as http from 'http';
import * as https from 'https';
import { execSync } from 'child_process';

async function getPulse() {
    try {
        // 1. Find Process and Connection Params
        const psOutput = execSync('pgrep -af language_server').toString();
        const line = psOutput.split('\n').find(l => l.includes('--extension_server_port'));
        if (!line) throw new Error('Antigravity process not found');

        const tokenMatch = line.match(/--csrf_token[=\s]+([a-f0-9\-]+)/i);
        const token = tokenMatch ? tokenMatch[1] : '';

        // 2. Find listening ports for transparency (logic from process-finder)
        const pid = line.trim().split(' ')[0];
        const portOutput = execSync(`ss -tlnp | grep "pid=${pid}"`).toString();
        const ports = Array.from(new Set(portOutput.match(/127.0.0.1:(\d+)/g)?.map(p => p.split(':')[1]) || []));

        // 3. Simple fetch function
        const fetchQuota = (port: string, csrf: string) => {
            return new Promise((resolve, reject) => {
                const body = JSON.stringify({
                    metadata: { ideName: 'antigravity', extensionName: 'antigravity', locale: 'en' }
                });
                const req = http.request({
                    hostname: '127.0.0.1',
                    port: parseInt(port),
                    path: '/exa.language_server_pb.LanguageServerService/GetUserStatus',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Codeium-Csrf-Token': csrf,
                        'Connect-Protocol-Version': '1',
                        'Content-Length': Buffer.byteLength(body)
                    },
                    timeout: 2000
                }, res => {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => {
                        if (res.statusCode === 200) resolve(JSON.parse(data));
                        else reject(new Error(`HTTP ${res.statusCode}`));
                    });
                });
                req.on('error', reject);
                req.write(body);
                req.end();
            });
        };

        // 4. Try ports
        for (const port of ports) {
            try {
                const status: any = await fetchQuota(port, token);
                console.log(JSON.stringify(status, null, 2));
                return;
            } catch (e) { }
        }
        console.log('Error: Could not authenticate with local IDE server');
    } catch (e: any) {
        console.log(`Error: ${e.message}`);
    }
}

getPulse();
