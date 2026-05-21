const fs = require('fs');
let file = fs.readFileSync('src/pages/Settings.tsx', 'utf8');

// 1. Add OnboardingTutorial at the bottom
file = file.replace(
  '    </div>\r\n  );\r\n};\r\n\r\nexport default Settings;',
  '      <OnboardingTutorial\n        pageKey="settings"\n        steps={[\n          { targetSelector: \'[data-tour="settings-profile"]\', title: \'👤 Profil Kamu\', description: \'Atur nama, email, dan avatar kamu di sini.\' },\n          { targetSelector: \'[data-tour="settings-menu"]\', title: \'⚙️ Pengaturan Fitur\', description: \'Temukan berbagai pengaturan mulai dari tema gelap, kategori, backup data, hingga mengulang tutorial.\' }\n        ]}\n      />\n    </div>\n  );\n};\n\nexport default Settings;'
);
file = file.replace(
  '    </div>\n  );\n};\n\nexport default Settings;',
  '      <OnboardingTutorial\n        pageKey="settings"\n        steps={[\n          { targetSelector: \'[data-tour="settings-profile"]\', title: \'👤 Profil Kamu\', description: \'Atur nama, email, dan avatar kamu di sini.\' },\n          { targetSelector: \'[data-tour="settings-menu"]\', title: \'⚙️ Pengaturan Fitur\', description: \'Temukan berbagai pengaturan mulai dari tema gelap, kategori, backup data, hingga mengulang tutorial.\' }\n        ]}\n      />\n    </div>\n  );\n};\n\nexport default Settings;'
);

// 2. Add reset tutorial functionality
file = file.replace(
  "    if (id === 'profile') {",
  "    if (id === 'reset_tutorial') {\n      resetAllTutorials();\n      return;\n    }\n    if (id === 'profile') {"
);

fs.writeFileSync('src/pages/Settings.tsx', file);
console.log('Settings updated');
