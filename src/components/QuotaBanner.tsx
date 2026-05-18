import React, { useState } from 'react';
import { useMoney } from '../contexts/MoneyContext';
import { CloudUpload, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

export const QuotaBanner: React.FC = () => {
    const { pendingSyncCount, syncData } = useMoney();
    const [isSyncing, setIsSyncing] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [syncError, setSyncError] = useState(false);

    if (pendingSyncCount === 0 && !showSuccess && !syncError) return null;

    const handleSync = async () => {
        setIsSyncing(true);
        setSyncError(false);
        try {
            const results = await syncData();
            if (results && results.failed > 0) {
                setSyncError(true);
                setTimeout(() => setSyncError(false), 5000);
            } else {
                setShowSuccess(true);
                setTimeout(() => setShowSuccess(false), 3000);
            }
        } catch (e) {
            setSyncError(true);
            setTimeout(() => setSyncError(false), 5000);
        } finally {
            setIsSyncing(false);
        }
    };

    if (showSuccess) {
        return (
            <div className="quota-banner success fade-in">
                <div className="quota-banner-content">
                    <CheckCircle2 size={18} />
                    <span>Data berhasil disinkronkan ke Cloud!</span>
                </div>
            </div>
        );
    }

    if (syncError) {
        return (
            <div className="quota-banner success fade-in" style={{ background: 'hsla(350, 80%, 58%, 0.1)', borderColor: 'hsla(350, 80%, 58%, 0.3)' }}>
                <div className="quota-banner-content">
                    <AlertCircle size={18} style={{ color: 'var(--danger)' }} />
                    <span style={{ color: 'var(--danger)', fontWeight: 600 }}>Sync Gagal: Kuota Firestore masih penuh.</span>
                </div>
            </div>
        );
    }

    return (
        <div className="quota-banner pulse">
            <div className="quota-banner-content">
                <div className="quota-info">
                    <CloudUpload size={18} style={{ color: 'var(--primary)' }} />
                    <div className="quota-text">
                        <strong>Sinkronisasi Awan (Pending)</strong>
                        <p>{pendingSyncCount} data tersimpan secara lokal & siap dicadangkan.</p>
                    </div>
                </div>
                <button 
                    className={`sync-button ${isSyncing ? 'loading' : ''}`}
                    onClick={handleSync}
                    disabled={isSyncing}
                >
                    {isSyncing ? <Loader2 className="animate-spin" size={16} /> : <CloudUpload size={16} />}
                    <span>Sync Sekarang</span>
                </button>
            </div>
        </div>
    );
};
