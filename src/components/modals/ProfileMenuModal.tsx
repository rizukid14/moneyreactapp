import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../ui/Modal';
import MaterialIcon from '../common/MaterialIcon';
import { useMoney } from '../../contexts/MoneyContext';

interface ProfileMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileMenuModal: React.FC<ProfileMenuModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { user, logOut } = useMoney();

  const handleNavigate = (path: string) => {
    onClose();
    navigate(path);
  };

  const handleLogout = () => {
    onClose();
    logOut();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="360px">
      <div className="flex flex-col items-center pt-2 pb-6">
        {user.avatar ? (
          <img 
            src={user.avatar} 
            alt="Profile" 
            className="w-20 h-20 rounded-full border-4 border-surface shadow-md mb-3 object-cover" 
          />
        ) : (
          <div className="w-20 h-20 rounded-full border-4 border-surface shadow-md mb-3 bg-primary text-on-primary flex items-center justify-center font-bold text-3xl uppercase">
            {user.name ? user.name.charAt(0) : 'U'}
          </div>
        )}
        <h3 className="font-headline-md text-headline-md text-on-surface">{user.name}</h3>
        <p className="text-sm text-on-surface-variant font-medium">Pro Plan Member</p>
      </div>

      <div className="flex flex-col gap-2 pb-2">
        <button 
          onClick={() => handleNavigate('/settings')}
          className="w-full flex items-center gap-4 p-4 rounded-2xl text-on-surface hover:bg-surface-container transition-colors border-none bg-transparent cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <MaterialIcon name="person" className="text-xl text-primary" />
          </div>
          <div className="flex flex-col items-start">
            <span className="font-bold text-sm">Pengaturan Profil</span>
            <span className="text-xs text-on-surface-variant">Ubah nama, avatar, dan kata sandi</span>
          </div>
          <MaterialIcon name="chevron_right" className="text-xl text-on-surface-variant ml-auto" />
        </button>

        <button 
          onClick={() => handleNavigate('/settings')}
          className="w-full flex items-center gap-4 p-4 rounded-2xl text-on-surface hover:bg-surface-container transition-colors border-none bg-transparent cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <MaterialIcon name="settings" className="text-xl text-primary" />
          </div>
          <div className="flex flex-col items-start">
            <span className="font-bold text-sm">Preferensi Aplikasi</span>
            <span className="text-xs text-on-surface-variant">Notifikasi, tema, dan lainnya</span>
          </div>
          <MaterialIcon name="chevron_right" className="text-xl text-on-surface-variant ml-auto" />
        </button>

        <div className="h-px bg-border-light my-2"></div>

        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-4 p-4 rounded-2xl text-error hover:bg-error-container/30 transition-colors border-none bg-transparent cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-full bg-error-container/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <MaterialIcon name="logout" className="text-xl" />
          </div>
          <span className="font-bold text-sm">Keluar (Logout)</span>
        </button>
      </div>
    </Modal>
  );
};

export default ProfileMenuModal;
