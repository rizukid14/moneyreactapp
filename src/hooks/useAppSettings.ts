import { useState, useCallback } from 'react';
import { dbPutSetting } from '../lib/db';
import type { ApplySettingsPayload } from '../contexts/moneyTypes';

export function useAppSettings() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isPrivateMode, setIsPrivateMode] = useState(false);
  const [defaultAssetId, setDefaultAssetIdState] = useState<string | null>(null);
  const [startOfMonthDay, setStartOfMonthDayState] = useState<number>(1);
  const [showDebtInTransactions, setShowDebtInTransactionsState] = useState<boolean>(true);
  const [autoOffsetDebts, setAutoOffsetDebtsState] = useState<boolean>(true);
  const [currencySymbol, setCurrencySymbolState] = useState<string>('Rp');
  const [defaultTransactionGrouping, setDefaultTransactionGroupingState] = useState<'date' | 'categoryId'>('date');
  const [assetCarouselCards, setAssetCarouselCardsState] = useState<string[]>(['net_worth']);
  const [statsCarouselCards, setStatsCarouselCardsState] = useState<string[]>(['all', 'health', 'forecast']);
  const [defaultStatsView, setDefaultStatsViewState] = useState<string>('all');
  const [chartStyle, setChartStyleState] = useState<'area' | 'line'>('area');

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      dbPutSetting('theme', next);
      try { localStorage.setItem('moneyapp-theme', next); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const togglePrivateMode = useCallback(() => {
    setIsPrivateMode(prev => {
      const next = !prev;
      dbPutSetting('isPrivateMode', next);
      return next;
    });
  }, []);

  const setDefaultAssetId = useCallback((id: string | null) => {
    setDefaultAssetIdState(id);
    dbPutSetting('defaultAssetId', id);
  }, []);

  const setStartOfMonthDay = useCallback((day: number) => {
    setStartOfMonthDayState(day);
    dbPutSetting('startOfMonthDay', day);
  }, []);

  const setShowDebtInTransactions = useCallback((show: boolean) => {
    setShowDebtInTransactionsState(show);
    dbPutSetting('showDebtInTransactions', show);
  }, []);

  const setAutoOffsetDebts = useCallback((auto: boolean) => {
    setAutoOffsetDebtsState(auto);
    dbPutSetting('autoOffsetDebts', auto);
  }, []);

  const setCurrencySymbol = useCallback((symbol: string) => {
    setCurrencySymbolState(symbol);
    dbPutSetting('currencySymbol', symbol);
  }, []);

  const setDefaultTransactionGrouping = useCallback((grouping: 'date' | 'categoryId') => {
    setDefaultTransactionGroupingState(grouping);
    dbPutSetting('defaultTransactionGrouping', grouping);
  }, []);

  const setAssetCarouselCards = useCallback((cards: string[]) => {
    setAssetCarouselCardsState(cards);
    dbPutSetting('assetCarouselCards', cards);
  }, []);

  const setStatsCarouselCards = useCallback((cards: string[]) => {
    setStatsCarouselCardsState(cards);
    dbPutSetting('statsCarouselCards', cards);
  }, []);

  const setDefaultStatsView = useCallback((viewId: string) => {
    setDefaultStatsViewState(viewId);
    dbPutSetting('defaultStatsView', viewId);
  }, []);

  const setChartStyle = useCallback((style: 'area' | 'line') => {
    setChartStyleState(style);
    dbPutSetting('chartStyle', style);
  }, []);

  const applySettingsToAppSettings = useCallback((st: ApplySettingsPayload) => {
    if (st.theme) {
      setTheme(st.theme);
      try { localStorage.setItem('moneyapp-theme', st.theme); } catch { /* ignore */ }
    }
    if (st.isPrivateMode !== undefined) setIsPrivateMode(st.isPrivateMode);
    if (st.defaultAssetId !== undefined) setDefaultAssetIdState(st.defaultAssetId);
    if (st.startOfMonthDay) setStartOfMonthDayState(st.startOfMonthDay);
    if (st.showDebtInTransactions !== undefined) setShowDebtInTransactionsState(st.showDebtInTransactions);
    if (st.autoOffsetDebts !== undefined) setAutoOffsetDebtsState(st.autoOffsetDebts);
    if (st.currencySymbol) setCurrencySymbolState(st.currencySymbol);
    if (st.defaultTransactionGrouping) setDefaultTransactionGroupingState(st.defaultTransactionGrouping);
    if (st.assetCarouselCards?.length) setAssetCarouselCardsState(st.assetCarouselCards);
    if (st.statsCarouselCards?.length) setStatsCarouselCardsState(st.statsCarouselCards);
    if (st.defaultStatsView) setDefaultStatsViewState(st.defaultStatsView);
    if (st.chartStyle) setChartStyleState(st.chartStyle);
  }, []);

  return {
    theme,
    setTheme,
    toggleTheme,
    isPrivateMode,
    setIsPrivateMode,
    togglePrivateMode,
    defaultAssetId,
    setDefaultAssetId,
    setDefaultAssetIdState,
    startOfMonthDay,
    setStartOfMonthDay,
    setStartOfMonthDayState,
    showDebtInTransactions,
    setShowDebtInTransactions,
    setShowDebtInTransactionsState,
    autoOffsetDebts,
    setAutoOffsetDebts,
    setAutoOffsetDebtsState,
    currencySymbol,
    setCurrencySymbol,
    setCurrencySymbolState,
    defaultTransactionGrouping,
    setDefaultTransactionGrouping,
    setDefaultTransactionGroupingState,
    assetCarouselCards,
    setAssetCarouselCards,
    setAssetCarouselCardsState,
    statsCarouselCards,
    setStatsCarouselCards,
    setStatsCarouselCardsState,
    defaultStatsView,
    setDefaultStatsView,
    setDefaultStatsViewState,
    chartStyle,
    setChartStyle,
    setChartStyleState,
    applySettingsToAppSettings,
  };
}
