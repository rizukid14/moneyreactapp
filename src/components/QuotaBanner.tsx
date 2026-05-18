import React, { useState } from 'react';
import { useMoney } from '../contexts/MoneyContext';
import { CloudUpload, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { isFirebaseConfigured } from '../lib/firebase';

export const QuotaBanner: React.FC = () => {
    const { pendingSyncCount, syncData } = useMoney();
    const [isSyncing, setIsSyncing] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [syncError, setSyncError] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Hide completely if Firebase is not configured (cloud sync is disabled)
    if (!isFirebaseConfigured) return null;

    if (pendingSyncCount === 0 && !showSuccess && !syncError && !errorMessage) return null;

    const handleSync = async () => {
        setIsSyncing(true);
        setSyncError(false);
        setErrorMessage(null);
        try {
            const results = await syncData();
            if (results && results.error) {
                if (results.error === 'NO_FIREBASE') {
                    setErrorMessage('Sync Gagal: Layanan Firebase tidak aktif.');
                } else if (results.error === 'NOT_LOGGED_IN') {
                    setErrorMessage('Sync Gagal: Silakan masuk (login) terlebih dahulu.');
                }
                setTimeout(() => setErrorMessage(null), 5000);
            } else if (results && results.failed > 0) {
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

    if (errorMessage) {
        return (
            <div className="quota-banner success fade-in" style={{ background: 'hsla(350, 80%, 58%, 0.1)', borderColor: 'hsla(350, 80%, 58%, 0.3)' }}>
                <div className="quota-banner-content">
                    <AlertCircle size={18} style={{ color: 'var(--danger)' }} />
                    <span style={{ color: 'var(--danger)', fontWeight: 600 }}>{errorMessage}</span>
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
        <div 
            className="quota-banner fade-in"
            style={{
                background: 'linear-gradient(135deg, hsla(var(--p-h), 80%, 54%, 0.08) 0%, hsla(var(--p-h), 80%, 54%, 0.03) 100%)',
                borderColor: 'hsla(var(--p-h), 80%, 54%, 0.25)',
                borderWidth: '1.5px',
                padding: '4px',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 8px 32px hsla(var(--p-h), 80%, 54%, 0.06)'
            }}
        >
            {/* Ambient Background Glow */}
            <div style={{
                position: 'absolute', top: '-20px', left: '-20px',
                width: '80px', height: '80px',
                background: 'var(--primary)',
                filter: 'blur(30px)',
                borderRadius: '50%',
                opacity: 0.15,
                pointerEvents: 'none'
            }} />

            <div className="quota-banner-content" style={{ padding: '10px 16px' }}>
                <div className="quota-info" style={{ gap: '16px' }}>
                    {/* Breathing/Pulsing Cloud Icon Container */}
                    <div style={{
                        width: '40px', height: '40px',
                        borderRadius: '12px',
                        background: 'var(--primary-glow)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 12px hsla(var(--p-h), 80%, 54%, 0.1)'
                    }}>
                        <CloudUpload size={20} color="var(--primary)" />
                    </div>

                    <div className="quota-text">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <strong style={{ fontWeight: 800, fontSize: '14px', color: 'var(--text-main)' }}>
                                Sinkronisasi Awan
                            </strong>
                            {/* Blue Pulse Indicator */}
                            <span className="sync-pulse-dot" style={{
                                width: '8px', height: '8px',
                                borderRadius: '50%',
                                background: '#3b82f6',
                                display: 'inline-block',
                                boxShadow: '0 0 8px #3b82f6',
                                animation: 'pulse-blue 2s infinite'
                            }} />
                        </div>
                        <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                            {pendingSyncCount} data baru tersimpan di perangkat ini & siap dicadangkan.
                        </p>
                    </div>
                </div>

                <button 
                    className={`sync-button ${isSyncing ? 'loading' : ''}`}
                    onClick={handleSync}
                    disabled={isSyncing}
                    style={{
                        background: 'var(--primary-gradient)',
                        boxShadow: '0 4px 12px hsla(var(--p-h), 80%, 54%, 0.25)',
                        borderRadius: '12px',
                        padding: '10px 18px',
                        fontSize: '13px',
                        fontWeight: 800,
                        border: 'none',
                        color: 'white',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.2s ease'
                    }}
                >
                    {isSyncing ? <Loader2 className="animate-spin" size={16} /> : <CloudUpload size={16} />}
                    <span>Sync Sekarang</span>
                </button>
            </div>
            
            {/* Custom keyframes for the blue pulse inside JSX style */}
            <style>{`
                @keyframes pulse-blue {
                    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
                    70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(59, 130, 246, 0); }
                    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
                }
            `}</style>
        </div>
    );
};
