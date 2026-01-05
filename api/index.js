const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html');

    let info = '';
    try {
        const root = path.join(__dirname, '..');
        const modules = path.join(root, 'node_modules');
        const dist = path.join(root, 'backend/dist'); // As per includeFiles

        info += `<h2>Paths</h2><ul>`;
        info += `<li>Root: ${root}</li>`;
        info += `<li>Modules: ${fs.existsSync(modules) ? 'Exists' : 'Missing'}</li>`;
        info += `<li>Dist: ${fs.existsSync(dist) ? 'Exists' : 'Missing'}</li>`;

        if (fs.existsSync(modules)) {
            try {
                const m = fs.readdirSync(modules);
                info += `<li>Module Count: ${m.length}</li>`;
                info += `<li>Has Express: ${m.includes('express')}</li>`;
                info += `<li>Has PG: ${m.includes('pg')}</li>`;
            } catch (e) {
                info += `<li>Error reading modules: ${e.message}</li>`;
            }
        }

        if (fs.existsSync(dist)) {
            try {
                info += `<li>Dist Files: ${fs.readdirSync(dist).join(', ')}</li>`;
            } catch (e) {
                info += `<li>Error reading dist: ${e.message}</li>`;
            }
        }
        info += `</ul>`;

    } catch (e) {
        info += `<p>Error scanning: ${e.message}</p>`;
    }

    res.end(`<html><body><h1>Probe Active</h1>${info}</body></html>`);
};
