import { useState, useCallback } from 'react';
import { hashPinSecure, verifyPin } from '../lib/utils';
import { dbPutSetting, dbDeleteSetting } from '../lib/db';

export function useAppLock() {
  const [pin, setPin] = useState<string | null>(null);
  const [isAppLocked, setIsAppLocked] = useState(false);

  const setAppPin = useCallback(async (newPin: string | null) => {
    let finalPin = newPin;
    if (newPin) {
      finalPin = await hashPinSecure(newPin);
    }
    setPin(finalPin);
    if (finalPin) {
      await dbPutSetting('pin', finalPin);
    } else {
      await dbDeleteSetting('pin');
    }
    if (!finalPin) {
      setIsAppLocked(false);
    }
  }, []);

  const unlockApp = useCallback(async (enteredPin: string): Promise<boolean> => {
    if (!pin) return true;

    // Legacy support: if stored pin is 6 digits, it's likely plain text
    if (pin.length === 6 && /^\d+$/.test(pin)) {
      if (enteredPin === pin) {
        // Upgrade to salted PBKDF2 automatically
        const secured = await hashPinSecure(enteredPin);
        setPin(secured);
        await dbPutSetting('pin', secured);
        setIsAppLocked(false);
        return true;
      }
      return false;
    }

    const ok = await verifyPin(enteredPin, pin);
    if (ok) {
      // Migrate legacy unsalted hash or older 100k iteration hash to 600k iterations
      if (!pin.startsWith('pbkdf2$600000$')) {
        const secured = await hashPinSecure(enteredPin);
        setPin(secured);
        await dbPutSetting('pin', secured);
      }
      setIsAppLocked(false);
      return true;
    }
    return false;
  }, [pin]);

  const lockApp = useCallback(() => {
    if (pin) setIsAppLocked(true);
  }, [pin]);

  return {
    pin,
    setPin,
    isAppLocked,
    setIsAppLocked,
    setAppPin,
    unlockApp,
    lockApp,
  };
}
