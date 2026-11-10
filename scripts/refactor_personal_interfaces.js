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

walk(path.join(__dirname, '../src'), (filepath) => {
  let content = fs.readFileSync(filepath, 'utf8');
  const originalContent = content;
  
  // 1. Prisma include/select blocks
  content = content.replace(/subalterno:\s*\{\s*include:\s*\{\s*bateria:\s*true\s*\}\s*\},?/g, 'bateria: true,');
  content = content.replace(/subalterno:\s*\{\s*select:\s*\{\s*ci:\s*true\s*\}\s*\},?/g, '');
  content = content.replace(/subalterno:\s*\{\s*bateria:\s*true\s*\},?/g, 'bateria: true,');
  content = content.replace(/subalterno:\s*true,?/g, '');
  content = content.replace(/oficial:\s*true,?/g, '');
  content = content.replace(/suboficial:\s*true,?/g, '');

  // 2. Property accesses
  content = content.replace(/\.subalterno\?\./g, '.');
  content = content.replace(/\.subalterno\./g, '.');
  content = content.replace(/\.oficial\?\./g, '.');
  content = content.replace(/\.oficial\./g, '.');
  content = content.replace(/\.suboficial\?\./g, '.');
  content = content.replace(/\.suboficial\./g, '.');
  
  // 3. Null checks
  content = content.replace(/\.subalterno\s*!==\s*null/g, '.tipo === TipoPersonal.SUBALTERNO');
  content = content.replace(/\.subalterno\s*!=\s*null/g, '.tipo === TipoPersonal.SUBALTERNO');
  content = content.replace(/\.subalterno\s*===\s*null/g, '.tipo !== TipoPersonal.SUBALTERNO');
  content = content.replace(/\.subalterno\s*==\s*null/g, '.tipo !== TipoPersonal.SUBALTERNO');
  
  content = content.replace(/\.oficial\s*!==\s*null/g, '.tipo === TipoPersonal.OFICIAL');
  content = content.replace(/\.oficial\s*!=\s*null/g, '.tipo === TipoPersonal.OFICIAL');
  content = content.replace(/\.oficial\s*===\s*null/g, '.tipo !== TipoPersonal.OFICIAL');
  content = content.replace(/\.oficial\s*==\s*null/g, '.tipo !== TipoPersonal.OFICIAL');

  content = content.replace(/\.suboficial\s*!==\s*null/g, '.tipo === TipoPersonal.SUBOFICIAL');
  content = content.replace(/\.suboficial\s*!=\s*null/g, '.tipo === TipoPersonal.SUBOFICIAL');
  content = content.replace(/\.suboficial\s*===\s*null/g, '.tipo !== TipoPersonal.SUBOFICIAL');
  content = content.replace(/\.suboficial\s*==\s*null/g, '.tipo !== TipoPersonal.SUBOFICIAL');

  // 4. Boolean coercions (if (p.subalterno))
  content = content.replace(/!!([a-zA-Z0-9_]+)\.subalterno/g, '($1.tipo === TipoPersonal.SUBALTERNO)');
  content = content.replace(/!!([a-zA-Z0-9_]+)\.oficial/g, '($1.tipo === TipoPersonal.OFICIAL)');
  content = content.replace(/!!([a-zA-Z0-9_]+)\.suboficial/g, '($1.tipo === TipoPersonal.SUBOFICIAL)');
  
  content = content.replace(/([a-zA-Z0-9_]+)\.subalterno\s*\?/g, '$1.tipo === TipoPersonal.SUBALTERNO ?');
  content = content.replace(/([a-zA-Z0-9_]+)\.oficial\s*\?/g, '$1.tipo === TipoPersonal.OFICIAL ?');
  content = content.replace(/([a-zA-Z0-9_]+)\.suboficial\s*\?/g, '$1.tipo === TipoPersonal.SUBOFICIAL ?');
  
  // 5. Types
  content = content.replace(/subalterno:\s*\{\s*esReingreso:\s*boolean;\s*fechaIngreso:\s*Date\s*\|\s*null;\s*fechaIngresoOriginal:\s*Date\s*\|\s*null;\s*bateriaId:\s*number\s*\|\s*null;\s*bateria:\s*\{[^}]*\}\s*\|\s*null;\s*\}\s*\|\s*null;/g, 
    'tipo: TipoPersonal;\n  esReingreso: boolean | null;\n  fechaIngreso: Date | null;\n  fechaIngresoOriginal: Date | null;\n  bateriaId: number | null;\n  bateria: { bateriaId: number; nombre: string; orden: number } | null;' 
  );
  content = content.replace(/subalterno:\s*\{\s*esReingreso:\s*boolean;\s*fechaIngreso:\s*Date\s*\|\s*null;\s*fechaIngresoOriginal:\s*Date\s*\|\s*null;\s*bateria:\s*\{[^}]*\}\s*\|\s*null;\s*\}\s*\|\s*null;/g, 
    'tipo: TipoPersonal;\n  esReingreso: boolean | null;\n  fechaIngreso: Date | null;\n  fechaIngresoOriginal: Date | null;\n  bateria: { bateriaId: number; nombre: string; orden: number } | null;' 
  );
  content = content.replace(/subalterno:\s*\{\s*bateria:\s*\{[^}]*\}\s*\|\s*null;\s*\}\s*\|\s*null;/g, 
    'tipo: TipoPersonal;\n  bateria: { bateriaId: number; nombre: string; orden: number } | null;' 
  );
  content = content.replace(/subalterno:\s*\{[^}]*\}\s*\|\s*null;/g, '');
  content = content.replace(/oficial:\s*\{[^}]*\}\s*\|\s*null;/g, '');
  content = content.replace(/suboficial:\s*\{[^}]*\}\s*\|\s*null;/g, '');

  if (content !== originalContent) {
    fs.writeFileSync(filepath, content);
  }
});
