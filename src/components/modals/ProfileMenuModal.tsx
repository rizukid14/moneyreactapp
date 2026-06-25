import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../ui/Modal';
import MaterialIcon from '../common/MaterialIcon';
import { useMoney } from '../../contexts/MoneyContext';
import { auth, googleProvider } from '../../lib/firebase';
import { linkWithPopup } from 'firebase/auth';
import { useToast } from '../common/Toast';

interface ProfileMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileMenuModal: React.FC<ProfileMenuModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { user, logOut, theme, toggleTheme } = useMoney();
  const { showToast } = useToast();
  const [isLinking, setIsLinking] = React.useState(false);

  const isGoogleLinked = auth.currentUser?.providerData.some(p => p.providerId === 'google.com');

  const handleLinkGoogle = async () => {
    if (!auth.currentUser) return;
    setIsLinking(true);
    try {
      await linkWithPopup(auth.currentUser, googleProvider);
      showToast('Berhasil menautkan akun Google!', 'success');
      onClose();
    } catch (error: any) {
      console.error('Error linking Google account:', error);
      if (error.code === 'auth/credential-already-in-use') {
        showToast('Akun Google ini sudah digunakan oleh pengguna lain.', 'error');
      } else if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
        showToast('Gagal menautkan akun Google.', 'error');
      }
    } finally {
      setIsLinking(false);
    }
  };

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

        <button 
          onClick={toggleTheme}
          className="w-full flex items-center justify-between p-4 rounded-2xl text-on-surface hover:bg-surface-container transition-colors border-none bg-transparent cursor-pointer group"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <MaterialIcon name="dark_mode" className="text-xl text-primary" />
            </div>
            <div className="flex flex-col items-start">
              <span className="font-bold text-sm">Tema Gelap</span>
              <span className="text-xs text-on-surface-variant">Ubah tampilan aplikasi</span>
            </div>
          </div>
          <div className={`w-10 h-6 rounded-full relative transition-colors ${theme === 'dark' ? 'bg-primary' : 'bg-surface-variant border border-outline-variant'}`}>
            <div className={`w-4 h-4 rounded-full absolute top-1 transition-transform ${theme === 'dark' ? 'bg-on-primary translate-x-5' : 'bg-on-surface-variant translate-x-1'}`}></div>
          </div>
        </button>

        <div className="h-px bg-border-light my-2"></div>

        {!isGoogleLinked && auth.currentUser && (
          <button 
            onClick={handleLinkGoogle}
            disabled={isLinking}
            className="w-full flex items-center justify-between p-4 rounded-2xl text-on-surface hover:bg-surface-container transition-colors border-none bg-transparent cursor-pointer group disabled:opacity-50"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <MaterialIcon name="link" className="text-xl text-primary" />
              </div>
              <div className="flex flex-col items-start">
                <span className="font-bold text-sm">Tautkan ke Google</span>
                <span className="text-xs text-on-surface-variant">Bisa login lewat Google nanti</span>
              </div>
            </div>
            {isLinking ? (
              <MaterialIcon name="sync" className="text-xl text-on-surface-variant ml-auto spin" />
            ) : (
              <MaterialIcon name="chevron_right" className="text-xl text-on-surface-variant ml-auto" />
            )}
          </button>
        )}
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
