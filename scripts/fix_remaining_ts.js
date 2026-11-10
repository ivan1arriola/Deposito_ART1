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
  // 1. Prisma includes/selects with subalterno, oficial, suboficial
  // Remove them completely from query objects if they are just nested selects or empty includes
  { regex: /subalterno:\s*\{\s*select:\s*\{[^}]*\}\s*\},?/g, repl: '' },
  { regex: /subalterno:\s*\{\s*include:\s*\{[^}]*\}\s*\},?/g, repl: '' },
  { regex: /oficial:\s*\{\s*select:\s*\{[^}]*\}\s*\},?/g, repl: '' },
  { regex: /suboficial:\s*\{\s*select:\s*\{[^}]*\}\s*\},?/g, repl: '' },
  { regex: /subalterno:\s*true,?/g, repl: '' },
  { regex: /oficial:\s*true,?/g, repl: '' },
  { regex: /suboficial:\s*true,?/g, repl: '' },
  { regex: /subalterno:\s*\{\s*\},?/g, repl: '' },

  // 2. Prisma create/upsert/delete on sub-tables
  { regex: /await\s+tx\.subalterno\.deleteMany\([^)]*\);?/g, repl: '' },
  { regex: /await\s+tx\.oficial\.deleteMany\([^)]*\);?/g, repl: '' },
  { regex: /await\s+tx\.suboficial\.deleteMany\([^)]*\);?/g, repl: '' },
  { regex: /await\s+tx\.subalterno\.create\([^)]*\);?/g, repl: '' },
  { regex: /await\s+tx\.oficial\.create\([^)]*\);?/g, repl: '' },
  { regex: /await\s+tx\.suboficial\.create\([^)]*\);?/g, repl: '' },
  { regex: /await\s+tx\.subalterno\.upsert\([^)]*\);?/g, repl: '' },
  { regex: /await\s+tx\.oficial\.upsert\([^)]*\);?/g, repl: '' },
  { regex: /await\s+tx\.suboficial\.upsert\([^)]*\);?/g, repl: '' },

  // 3. Property access fixes not caught by previous
  { regex: /\.subalterno\?\./g, repl: '.' },
  { regex: /\.subalterno\./g, repl: '.' },
  { regex: /\.oficial\?\./g, repl: '.' },
  { regex: /\.oficial\./g, repl: '.' },
  { regex: /\.suboficial\?\./g, repl: '.' },
  { regex: /\.suboficial\./g, repl: '.' },

  // Optional chaining
  { regex: /persona\.subalterno\s*\?/g, repl: '(persona.tipo === TipoPersonal.SUBALTERNO) ?' },
  { regex: /personal\.subalterno\s*\?/g, repl: '(personal.tipo === TipoPersonal.SUBALTERNO) ?' },

  // `!persona.subalterno`
  { regex: /!\s*persona\.subalterno/g, repl: '(persona.tipo !== TipoPersonal.SUBALTERNO)' },

  // Add tipo to create/upsert payload in Personal creation
  // Since we don't know the exact tipo, we'll try to find where we create personal and add `tipo: TipoPersonal.SUBALTERNO` temporarily if it's missing, but it's better done manually.
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
