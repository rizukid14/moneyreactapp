import { useState } from 'react';
import { Modal } from '../ui/Modal';
import MaterialIcon from '../common/MaterialIcon';
import { auth } from '../../lib/firebase';
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { useToast } from '../common/Toast';

interface ReauthenticateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ReauthenticateModal: React.FC<ReauthenticateModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !auth.currentUser.email) return;

    setIsLoading(true);
    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, password);
      await reauthenticateWithCredential(auth.currentUser, credential);
      setPassword('');
      onSuccess();
    } catch (error: any) {
      console.error('Re-authentication error:', error);
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        showToast('Password salah. Silakan coba lagi.', 'error');
      } else {
        showToast('Gagal memverifikasi identitas. Silakan coba lagi.', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Verifikasi Identitas" zIndex={4000}>
      <form onSubmit={handleSubmit} className="p-1 space-y-4">
        <p className="text-sm text-on-surface-variant">
          Untuk keamanan akun Anda, silakan masukkan password Anda saat ini sebelum mengubah informasi penting.
        </p>

        <div>
          <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block mb-1">
            Password Saat Ini
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MaterialIcon name="lock" className="text-on-surface-variant text-[18px]" />
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-surface-container border border-outline-variant rounded-xl text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              placeholder="Masukkan password Anda"
              required
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-surface-container-highest text-on-surface rounded-xl font-bold text-sm hover:bg-surface-variant transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isLoading || !password}
            className="flex-1 py-3 px-4 bg-primary text-on-primary rounded-xl font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading && <MaterialIcon name="sync" className="spin text-[16px]" />}
            Lanjutkan
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ReauthenticateModal;
