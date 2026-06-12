const fs = require('fs');
let content = fs.readFileSync('src/pages/Settings.tsx', 'utf8');

// 1. Change grid to columns
content = content.replace(
    '<div className=\"grid grid-cols-1 md:grid-cols-12 gap-8 mt-6 items-start\">',
    '<div className=\"columns-1 lg:columns-2 gap-8 mt-6 space-y-8 [&>section]:break-inside-avoid\">'
);

// 2. Remove Col 1 wrapper
content = content.replace(
    '{/* Column 1: Akun & Keamanan */}\n        <div className=\"md:col-span-6 lg:col-span-6 space-y-8\">',
    '{/* Column 1: Akun & Keamanan */}'
);

// 3. Remove Col 2 wrapper
content = content.replace(
    '        </div>\n\n        {/* Column 2: Preferensi & Tampilan */}\n        <div className=\"md:col-span-6 lg:col-span-6 space-y-8\">',
    '        {/* Column 2: Preferensi & Tampilan */}'
);

// 4. Remove Col 3 wrapper
content = content.replace(
    '        </div>\n\n        {/* Column 3: Kategori & Data */}\n        <div className=\"md:col-span-12 lg:col-span-6 space-y-8\">',
    '        {/* Column 3: Kategori & Data */}'
);

// 5. Remove final closing div of the old wrapper
content = content.replace(
    '        </div>\n\n      </div>\n\n\n\n      {/* Hidden inputs',
    '      </div>\n\n\n\n      {/* Hidden inputs'
);

fs.writeFileSync('src/pages/Settings.tsx', content);
console.log('Done refactoring!');
