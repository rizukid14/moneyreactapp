const fs = require('fs');

let content = fs.readFileSync('src/pages/Settings.tsx', 'utf8');

// 1. Imports
content = content.replace(
  "import ContactModal from '../components/modals/ContactModal';",
  "import ContactModal from '../components/modals/ContactModal';\nimport { useOnboarding } from '../contexts/OnboardingContext';\nimport OnboardingTutorial from '../components/OnboardingTutorial';"
);

// 2. Hook
content = content.replace(
  "const [activeModal, setActiveModal] = useState<string | null>(null);",
  "const { resetAllTutorials } = useOnboarding();\n  const [activeModal, setActiveModal] = useState<string | null>(null);"
);

// 3. menuGroups
content = content.replace(
  "{ id: 'help', icon: CircleHelp, label: 'Bantuan & Dukungan' },",
  "{ id: 'help', icon: CircleHelp, label: 'Bantuan & Dukungan' },\n        { id: 'reset_tutorial', icon: RefreshCw, label: 'Ulangi Tutorial Aplikasi' },"
);

// 4. handleMenuClick
content = content.replace(
  "if (id === 'profile') {",
  "if (id === 'reset_tutorial') {\n      resetAllTutorials();\n      return;\n    }\n    if (id === 'profile') {"
);

// 5. data-tour="settings-profile"
// I will find the exact profile div and inject data-tour
content = content.replace(
  "      <div className=\"card\" style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>",
  "      <div data-tour=\"settings-profile\" className=\"card\" style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>"
);

// 6. data-tour="settings-menu" wrapper
content = content.replace(
  "      {menuGroups.map((group) => (",
  "      <div data-tour=\"settings-menu\">\n      {menuGroups.map((group) => ("
);

// For the closing div of settings-menu, we'll find the line with "Notifikasi Otomatis" and its preceding div
content = content.replace(
  "      <div style={{ marginTop: '24px', padding: '16px', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>",
  "      </div>\n      <div style={{ marginTop: '24px', padding: '16px', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>"
);

// 7. OnboardingTutorial Component at the very bottom
content = content.replace(
  "    </div>\n  );\n};\n\nexport default Settings;",
  "      <OnboardingTutorial\n        pageKey=\"settings\"\n        steps={[\n          { targetSelector: '[data-tour=\"settings-profile\"]', title: '👤 Profil Kamu', description: 'Atur nama, email, dan avatar kamu di sini.' },\n          { targetSelector: '[data-tour=\"settings-menu\"]', title: '⚙️ Pengaturan Fitur', description: 'Temukan berbagai pengaturan mulai dari tema gelap, kategori, backup data, hingga mengulang tutorial.' }\n        ]}\n      />\n    </div>\n  );\n};\n\nexport default Settings;"
);

// In case it used \r\n:
content = content.replace(
  "    </div>\r\n  );\r\n};\r\n\r\nexport default Settings;",
  "      <OnboardingTutorial\n        pageKey=\"settings\"\n        steps={[\n          { targetSelector: '[data-tour=\"settings-profile\"]', title: '👤 Profil Kamu', description: 'Atur nama, email, dan avatar kamu di sini.' },\n          { targetSelector: '[data-tour=\"settings-menu\"]', title: '⚙️ Pengaturan Fitur', description: 'Temukan berbagai pengaturan mulai dari tema gelap, kategori, backup data, hingga mengulang tutorial.' }\n        ]}\n      />\n    </div>\n  );\n};\n\nexport default Settings;"
);

fs.writeFileSync('src/pages/Settings.tsx', content);
console.log("Done");
