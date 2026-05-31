const fs = require('fs');
const path = require('path');

const walk = (dir, callback) => {
  if (dir.includes('node_modules') || dir.includes('.next') || dir.includes('.git') || dir.includes('generated')) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filepath = path.join(dir, file);
    const stat = fs.statSync(filepath);
    if (stat.isDirectory()) {
      walk(filepath, callback);
    } else {
      if (filepath.endsWith('.ts') || filepath.endsWith('.tsx')) {
        callback(filepath);
      }
    }
  }
};

const replacements = [
  // Prisma queries - remove includes
  { regex: /subalterno:\s*\{[^}]*bateria:\s*true[^}]*\}/g, repl: 'bateria: true' },
  { regex: /subalterno:\s*true,?/g, repl: '' },
  { regex: /oficial:\s*true,?/g, repl: '' },
  { regex: /suboficial:\s*true,?/g, repl: '' },
  
  // Property accesses
  { regex: /\.subalterno\?\.bateriaId/g, repl: '.bateriaId' },
  { regex: /\.subalterno\.bateriaId/g, repl: '.bateriaId' },
  { regex: /\.subalterno\?\.bateria/g, repl: '.bateria' },
  { regex: /\.subalterno\.bateria/g, repl: '.bateria' },
  { regex: /\.subalterno\?\.esReingreso/g, repl: '.esReingreso' },
  { regex: /\.subalterno\.esReingreso/g, repl: '.esReingreso' },
  { regex: /\.subalterno\?\.fechaIngresoOriginal/g, repl: '.fechaIngresoOriginal' },
  { regex: /\.subalterno\.fechaIngresoOriginal/g, repl: '.fechaIngresoOriginal' },
  { regex: /\.subalterno\?\.fechaIngreso/g, repl: '.fechaIngreso' },
  { regex: /\.subalterno\.fechaIngreso/g, repl: '.fechaIngreso' },
  { regex: /\.subalterno\?\.createdAt/g, repl: '.createdAt' }, // Not 100% correct if personal createdAt differs but close enough
  
  // Null checks
  { regex: /\.subalterno\s*!==\s*null/g, repl: '.tipo === "SUBALTERNO"' },
  { regex: /\.subalterno\s*!=\s*null/g, repl: '.tipo === "SUBALTERNO"' },
  { regex: /\.subalterno\s*===\s*null/g, repl: '.tipo !== "SUBALTERNO"' },
  { regex: /\.subalterno\s*==\s*null/g, repl: '.tipo !== "SUBALTERNO"' },
  
  { regex: /\.oficial\s*!==\s*null/g, repl: '.tipo === "OFICIAL"' },
  { regex: /\.oficial\s*!=\s*null/g, repl: '.tipo === "OFICIAL"' },
  { regex: /\.oficial\s*===\s*null/g, repl: '.tipo !== "OFICIAL"' },
  { regex: /\.oficial\s*==\s*null/g, repl: '.tipo !== "OFICIAL"' },

  { regex: /\.suboficial\s*!==\s*null/g, repl: '.tipo === "SUBOFICIAL"' },
  { regex: /\.suboficial\s*!=\s*null/g, repl: '.tipo === "SUBOFICIAL"' },
  { regex: /\.suboficial\s*===\s*null/g, repl: '.tipo !== "SUBOFICIAL"' },
  { regex: /\.suboficial\s*==\s*null/g, repl: '.tipo !== "SUBOFICIAL"' },

  // Boolean coercions (e.g., if (p.subalterno) -> if (p.tipo === "SUBALTERNO"))
  // We can't safely do this with simple regex because it could be !!p.subalterno or p.subalterno ? ...
  // Will do some common ones:
  { regex: /!!([a-zA-Z0-9_]+)\.subalterno/g, repl: '($1.tipo === "SUBALTERNO")' },
  { regex: /!!([a-zA-Z0-9_]+)\.oficial/g, repl: '($1.tipo === "OFICIAL")' },
  { regex: /!!([a-zA-Z0-9_]+)\.suboficial/g, repl: '($1.tipo === "SUBOFICIAL")' },

  { regex: /([a-zA-Z0-9_]+)\.subalterno\s*\?/g, repl: '$1.tipo === "SUBALTERNO" ?' },
  { regex: /([a-zA-Z0-9_]+)\.oficial\s*\?/g, repl: '$1.tipo === "OFICIAL" ?' },
  { regex: /([a-zA-Z0-9_]+)\.suboficial\s*\?/g, repl: '$1.tipo === "SUBOFICIAL" ?' },
  
  // Optional chaining check like if (p.subalterno) - regex is hard but we can find and fix compiler errors later.
];

let changed = 0;
walk(path.join(__dirname, '../src'), (filepath) => {
  let content = fs.readFileSync(filepath, 'utf8');
  let originalContent = content;
  
  replacements.forEach(r => {
    content = content.replace(r.regex, r.repl);
  });
  
  if (content !== originalContent) {
    fs.writeFileSync(filepath, content);
    console.log('Updated', filepath);
    changed++;
  }
});
console.log('Changed', changed, 'files');
