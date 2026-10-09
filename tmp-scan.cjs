// Varre o node_modules procurando package.json com "version" inválida.
// É isso que faz o npm estourar "Invalid Version" ao montar a árvore.
const fs = require('fs');
const path = require('path');

const ruins = [];
let lidos = 0;

function walk(dir) {
  let ents;
  try {
    ents = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of ents) {
    if (!e.isDirectory()) continue;
    const p = path.join(dir, e.name);
    const pj = path.join(p, 'package.json');
    if (fs.existsSync(pj)) {
      lidos++;
      try {
        const j = JSON.parse(fs.readFileSync(pj, 'utf8'));
        const v = String(j.version);
        if (!/^\s*\d+\.\d+\.\d+/.test(v)) {
          ruins.push(pj.replace(/.*node_modules./, '') + ' -> "' + v + '"');
        }
      } catch {
        ruins.push(pj.replace(/.*node_modules./, '') + ' -> JSON INVALIDO');
      }
    }
    walk(p);
  }
}

walk('node_modules');
console.log('package.json lidos: ' + lidos);
console.log('com versao invalida: ' + ruins.length);
ruins.slice(0, 30).forEach((r) => console.log('  ' + r));
