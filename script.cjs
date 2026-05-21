const fs = require('fs');
let file = fs.readFileSync('src/pages/Settings.tsx', 'utf8');

// 1. Add imports
file = file.replace(
  "import ContactModal from '../components/modals/ContactModal';",
  "import ContactModal from '../components/modals/ContactModal';\nimport { useOnboarding } from '../contexts/OnboardingContext';\nimport OnboardingTutorial from '../components/OnboardingTutorial';"
);

// 2. Add resetAllTutorials hook
file = file.replace(
  "const [activeModal, setActiveModal] = useState<string | null>(null);",
  "const { resetAllTutorials } = useOnboarding();\n  const [activeModal, setActiveModal] = useState<string | null>(null);"
);

// 3. Add reset_tutorial to menuGroups
file = file.replace(
  "{ id: 'help', icon: CircleHelp, label: 'Bantuan & Dukungan' },",
  "{ id: 'help', icon: CircleHelp, label: 'Bantuan & Dukungan' },\n        { id: 'reset_tutorial', icon: RefreshCw, label: 'Ulangi Tutorial Aplikasi' },"
);

// 4. Add reset_tutorial to handleMenuClick
file = file.replace(
  "setActiveModal(id);\n    if (id === 'profile')",
  "if (id === 'reset_tutorial') {\n      resetAllTutorials();\n      return;\n    }\n    setActiveModal(id);\n    if (id === 'profile')"
);

// 5. Add data-tour to profile
file = file.replace(
  "<div className=\"card\" style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>\n        <div style={{\n          width: 56, height: 56, borderRadius: '28px',",
  "<div data-tour=\"settings-profile\" className=\"card\" style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>\n        <div style={{\n          width: 56, height: 56, borderRadius: '28px',"
);

// 6. Wrap menuGroups with data-tour div
file = file.replace(
  "{menuGroups.map((group) => (\n        <div key={group.title} style={{ marginBottom: '24px' }}>",
  "<div data-tour=\"settings-menu\">\n      {menuGroups.map((group) => (\n        <div key={group.title} style={{ marginBottom: '24px' }}>"
);

// 6.b Close data-tour div
file = file.replace(
  "        </div>\n      ))}\n\n      <div style={{ marginTop: '24px', padding: '16px', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>",
  "        </div>\n      ))}\n      </div>\n\n      <div style={{ marginTop: '24px', padding: '16px', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>"
);

// 7. Add OnboardingTutorial at the end
file = file.replace(
  "    </div>\n  );\n};\n\nexport default Settings;",
  "      <OnboardingTutorial\n        pageKey=\"settings\"\n        steps={[\n          { targetSelector: '[data-tour=\"settings-profile\"]', title: '👤 Profil Kamu', description: 'Atur nama, email, dan avatar kamu di sini.' },\n          { targetSelector: '[data-tour=\"settings-menu\"]', title: '⚙️ Pengaturan Fitur', description: 'Temukan berbagai pengaturan mulai dari tema gelap, kategori, backup data, hingga mengulang tutorial.' }\n        ]}\n      />\n    </div>\n  );\n};\n\nexport default Settings;"
);

fs.writeFileSync('src/pages/Settings.tsx', file);
console.log('Settings updated successfully');
