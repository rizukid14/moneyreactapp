const fs = require('fs');

let content = fs.readFileSync('src/pages/Settings.tsx', 'utf8');

// 1. Imports
if (!content.includes('useOnboarding')) {
  content = content.replace(
    /import ContactModal from '\.\.\/components\/modals\/ContactModal';/,
    "import ContactModal from '../components/modals/ContactModal';\nimport { useOnboarding } from '../contexts/OnboardingContext';\nimport OnboardingTutorial from '../components/OnboardingTutorial';"
  );
}

// 2. Hook
if (!content.includes('resetAllTutorials')) {
  content = content.replace(
    /const \[activeModal, setActiveModal\] = useState<string \| null>\(null\);/,
    "const { resetAllTutorials } = useOnboarding();\n  const [activeModal, setActiveModal] = useState<string | null>(null);"
  );
}

// 3. menuGroups
if (!content.includes("id: 'reset_tutorial'")) {
  content = content.replace(
    /\{ id: 'help', icon: CircleHelp, label: 'Bantuan & Dukungan' \},/g,
    "{ id: 'help', icon: CircleHelp, label: 'Bantuan & Dukungan' },\n        { id: 'reset_tutorial', icon: RefreshCw, label: 'Ulangi Tutorial Aplikasi' },"
  );
}

// 4. handleMenuClick
if (!content.includes("id === 'reset_tutorial'")) {
  content = content.replace(
    /if \(id === 'profile'\) \{/,
    "if (id === 'reset_tutorial') {\n      resetAllTutorials();\n      return;\n    }\n    if (id === 'profile') {"
  );
}

// 5. data-tour="settings-profile"
if (!content.includes('data-tour="settings-profile"')) {
  content = content.replace(
    /<div style=\{\{ padding: '20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' \}\}>/,
    "<div data-tour=\"settings-profile\" style={{ padding: '20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>"
  );
}

// 6. data-tour="settings-menu"
if (!content.includes('data-tour="settings-menu"')) {
  content = content.replace(
    /      \{menuGroups\.map\(\(group\) => \(/,
    "      <div data-tour=\"settings-menu\">\n      {menuGroups.map((group) => ("
  );
  // Add closing div for settings-menu right before the "Notifikasi Otomatis" div
  content = content.replace(
    /      <div style=\{\{ marginTop: '24px', padding: '16px', borderRadius: '16px', background: 'var\(--bg-card\)', border: '1px solid var\(--border-color\)' \}\}>\r?\n        <div style=\{\{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' \}\}>\r?\n          <div style=\{\{ display: 'flex', alignItems: 'center' \}\}>\r?\n            <Bell/,
    "      </div>\n      <div style={{ marginTop: '24px', padding: '16px', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>\n        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>\n          <div style={{ display: 'flex', alignItems: 'center' }}>\n            <Bell"
  );
}

// 7. OnboardingTutorial Component
if (!content.includes('<OnboardingTutorial')) {
  content = content.replace(
    /    <\/div>\r?\n  \);\r?\n\};\r?\n\r?\nexport default Settings;/,
    "      <OnboardingTutorial\n        pageKey=\"settings\"\n        steps={[\n          { targetSelector: '[data-tour=\"settings-profile\"]', title: '👤 Profil Kamu', description: 'Atur nama, email, dan avatar kamu di sini.' },\n          { targetSelector: '[data-tour=\"settings-menu\"]', title: '⚙️ Pengaturan Fitur', description: 'Temukan berbagai pengaturan mulai dari tema gelap, kategori, backup data, hingga mengulang tutorial.' }\n        ]}\n      />\n    </div>\n  );\n};\n\nexport default Settings;"
  );
}

fs.writeFileSync('src/pages/Settings.tsx', content);
console.log("Settings.tsx regex updated.");
