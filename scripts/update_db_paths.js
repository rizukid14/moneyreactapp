const fs = require('fs');
let c = fs.readFileSync('src/lib/db.ts', 'utf8');

c = c.replace(/collection\(firestore, 'users', getUid\(\), '([^']+)'\)/g, "collection(firestore, ...getWorkspacePath('$1'))");
c = c.replace(/doc\(firestore, 'users', getUid\(\), '([^']+)', ([^\)]+)\)/g, "doc(firestore, ...getWorkspacePath('$1'), $2)");
c = c.replace(/doc\(firestore, 'users', getUid\(\), path\[0\], path\[1\]\)/g, "doc(firestore, ...getWorkspacePath(path[0]), path[1])");

fs.writeFileSync('src/lib/db.ts', c);
console.log('done');
