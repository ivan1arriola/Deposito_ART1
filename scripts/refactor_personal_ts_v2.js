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
  { regex: /subalterno:\s*\{\s*include:\s*\{\s*bateria:\s*true\s*\}\s*\},?/g, repl: 'bateria: true,' },
  { regex: /subalterno:\s*\{\s*bateria:\s*true\s*\},?/g, repl: 'bateria: true,' },
  { regex: /subalterno:\s*true,?/g, repl: '' },
  { regex: /oficial:\s*true,?/g, repl: '' },
  { regex: /suboficial:\s*true,?/g, repl: '' },
  
  // Delete subalterno references inside transactions in delete actions
  { regex: /await\s+tx\.subalterno\.deleteMany\(\{.*\}\);/g, repl: '' },
  { regex: /await\s+tx\.oficial\.deleteMany\(\{.*\}\);/g, repl: '' },
  { regex: /await\s+tx\.suboficial\.deleteMany\(\{.*\}\);/g, repl: '' },
  
  { regex: /\.subalterno\?\./g, repl: '.' },
  { regex: /\.subalterno\./g, repl: '.' },
  { regex: /\.oficial\?\./g, repl: '.' },
  { regex: /\.oficial\./g, repl: '.' },
  { regex: /\.suboficial\?\./g, repl: '.' },
  { regex: /\.suboficial\./g, repl: '.' },
  
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

  { regex: /([a-zA-Z0-9_]+)\.subalterno\s*\?/g, repl: '$1.tipo === "SUBALTERNO" ?' },
  { regex: /([a-zA-Z0-9_]+)\.oficial\s*\?/g, repl: '$1.tipo === "OFICIAL" ?' },
  { regex: /([a-zA-Z0-9_]+)\.suboficial\s*\?/g, repl: '$1.tipo === "SUBOFICIAL" ?' },
];

walk(path.join(__dirname, '../src'), (filepath) => {
  let content = fs.readFileSync(filepath, 'utf8');
  const originalContent = content;
  
  replacements.forEach(r => {
    content = content.replace(r.regex, r.repl);
  });
  
  if (content !== originalContent) {
    fs.writeFileSync(filepath, content);
  }
});
