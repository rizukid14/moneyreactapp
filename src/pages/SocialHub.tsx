import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import MaterialIcon from '../components/common/MaterialIcon';
import { PageWrapper } from '../components/ui/PageWrapper';
import { PageHeader } from '../components/ui/PageHeader';
import SharedBillsManagerModal from '../components/modals/SharedBillsManagerModal';
import ContactModal from '../components/modals/ContactModal';

const SOCIAL_FEATURES = [
  {
    id: 'trips',
    icon: 'flight_takeoff',
    label: 'Holiday Trip',
    description: 'Buat dan kelola trip bersama teman',
  },
  {
    id: 'debts',
    icon: 'handshake',
    label: 'Hutang & Piutang',
    description: 'Catat dan pantau utang piutang',
  },
  {
    id: 'contacts',
    icon: 'contact_phone',
    label: 'Daftar Kontak',
    description: 'Atur kontak untuk split bill dan utang',
  },
  {
    id: 'splitbills',
    icon: 'splitscreen',
    label: 'Split Bills',
    description: 'Buat link tagihan bersama',
  },
] as const;

const SocialHub: React.FC = () => {
  const navigate = useNavigate();
  const [isSharedBillsOpen, setIsSharedBillsOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  const handleFeatureClick = (id: string) => {
    switch (id) {
      case 'trips':
        navigate('/trips');
        break;
      case 'debts':
        navigate('/debts');
        break;
      case 'contacts':
        setIsContactModalOpen(true);
        break;
      case 'splitbills':
        setIsSharedBillsOpen(true);
        break;
    }
  };

  return (
    <PageWrapper>
      <PageHeader
        title="Fitur Sosial & Berbagi"
        subtitle="Kelola trip, utang, kontak, dan tagihan bersama"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
        {SOCIAL_FEATURES.map((feature) => (
          <motion.button
            key={feature.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => handleFeatureClick(feature.id)}
            className="p-6 rounded-2xl border border-outline-variant bg-surface-container-lowest hover:bg-surface-container transition-colors text-left cursor-pointer flex flex-col gap-4"
            style={{ border: '1px solid var(--border-color)' }}
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center bg-primary"
            >
              <MaterialIcon
                name={feature.icon}
                className="text-2xl text-on-primary"
              />
            </div>
            <div>
              <h3 className="font-bold text-sm text-on-surface">{feature.label}</h3>
              <p className="text-xs text-on-surface-variant mt-1">{feature.description}</p>
            </div>
          </motion.button>
        ))}
      </div>

      <SharedBillsManagerModal
        isOpen={isSharedBillsOpen}
        onClose={() => setIsSharedBillsOpen(false)}
      />
      <ContactModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
      />
    </PageWrapper>
  );
};

export default SocialHub;
