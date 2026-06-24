import React, { useState } from 'react';
import { useMoney } from '../contexts/MoneyContext';
import MaterialIcon from './common/MaterialIcon';
import { isFirebaseConfigured } from '../lib/firebase';

export const QuotaBanner: React.FC = () => {
    const { pendingSyncCount, syncData, autoCloudSync } = useMoney();
    const [isSyncing, setIsSyncing] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [syncError, setSyncError] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Hide completely if Firebase is not configured (cloud sync is disabled)
    if (!isFirebaseConfigured) return null;

    if (autoCloudSync.status !== 'pulling' && pendingSyncCount === 0 && !showSuccess && !syncError && !errorMessage) return null;

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
            <div className="bg-success-container text-success p-3 rounded-2xl flex items-center gap-3 m-4 shadow-sm fade-in">
                <MaterialIcon name="check_circle" className="text-lg" />
                <span className="text-sm font-semibold">Data berhasil disinkronkan ke Cloud!</span>
            </div>
        );
    }

    if (errorMessage) {
        return (
            <div className="bg-error-container text-error p-3 rounded-2xl flex items-center gap-3 m-4 shadow-sm fade-in">
                <MaterialIcon name="error" className="text-lg" />
                <span className="text-sm font-semibold">{errorMessage}</span>
            </div>
        );
    }

    if (syncError) {
        return (
            <div className="bg-error-container text-error p-3 rounded-2xl flex items-center gap-3 m-4 shadow-sm fade-in">
                <MaterialIcon name="error" className="text-lg" />
                <span className="text-sm font-semibold">Sync Gagal: Kuota Firestore masih penuh.</span>
            </div>
        );
    }

    if (autoCloudSync.status === 'pulling') {
        return (
            <div className="bg-surface-container-low text-on-surface p-3 rounded-2xl flex items-center gap-3 m-4 shadow-sm fade-in">
                <MaterialIcon name="autorenew" className="text-lg animate-spin" />
                <span className="text-sm font-semibold">Sedang sinkronisasi data dari cloud...</span>
            </div>
        );
    }

    return (
        <div className="bg-primary-container text-primary-color p-4 rounded-3xl shadow-bento border border-primary/20 relative overflow-hidden m-4 fade-in">
            {/* Ambient Background Glow */}
            <div className="absolute -top-5 -left-5 w-20 h-20 bg-primary rounded-full opacity-10 blur-2xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
                <div className="flex items-center gap-4 flex-1">
                    {/* Breathing/Pulsing Cloud Icon Container */}
                    <div className="w-10 h-10 rounded-xl bg-primary-glow flex items-center justify-center shadow-sm shrink-0">
                        <MaterialIcon name="cloud_upload" className="text-xl" />
                    </div>

                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <strong className="font-extrabold text-sm text-on-surface">
                                Sinkronisasi Awan
                            </strong>
                            {/* Blue Pulse Indicator */}
                            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block shadow-[0_0_8px_#3b82f6] animate-[pulse-blue_2s_infinite]" />
                        </div>
                        <p className="mt-0.5 text-xs text-on-surface-variant font-medium leading-tight">
                            {pendingSyncCount} data baru tersimpan di perangkat ini & siap dicadangkan.
                        </p>
                    </div>
                </div>

                <button 
                    className={`shrink-0 bg-primary text-white px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${isSyncing ? 'opacity-70' : ''}`}
                    onClick={handleSync}
                    disabled={isSyncing}
                >
                    {isSyncing ? <MaterialIcon name="autorenew" className="text-base animate-spin" /> : <MaterialIcon name="cloud_upload" className="text-base" />}
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
