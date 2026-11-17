import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowRightLeft, 
  RefreshCw, 
  Receipt, 
  Banknote, 
  Calculator, 
  TrendingDown, 
  ShieldCheck, 
  SlidersHorizontal,
  Coins,
  Plus,
  Trash2
} from 'lucide-react';

// Fallback rates if API fetch is throttled or offline
const FALLBACK_RATES = {
  USD_INR: 86.85,
  USD_VND: 25420,
  INR_VND: 292.68,
};

// Preset denomination templates for all 3 currencies
const CURRENCY_NOTE_TEMPLATES = {
  USD: [
    { id: 'usd_100', denom: 100, count: 5, rate: 0 },
    { id: 'usd_50',  denom: 50,  count: 2, rate: 0 },
    { id: 'usd_20',  denom: 20,  count: 3, rate: 0 },
    { id: 'usd_10',  denom: 10,  count: 2, rate: 0 },
    { id: 'usd_5',   denom: 5,   count: 2, rate: 0 },
    { id: 'usd_1',   denom: 1,   count: 5, rate: 0 },
  ],
  INR: [
    { id: 'inr_500', denom: 500, count: 20, rate: 0 },
    { id: 'inr_200', denom: 200, count: 10, rate: 0 },
    { id: 'inr_100', denom: 100, count: 10, rate: 0 },
    { id: 'inr_50',  denom: 50,  count: 10, rate: 0 },
    { id: 'inr_20',  denom: 20,  count: 0,  rate: 0 },
    { id: 'inr_10',  denom: 10,  count: 0,  rate: 0 },
  ],
  VND: [
    { id: 'vnd_500k', denom: 500000, count: 10, rate: 0 },
    { id: 'vnd_200k', denom: 200000, count: 10, rate: 0 },
    { id: 'vnd_100k', denom: 100000, count: 5,  rate: 0 },
    { id: 'vnd_50k',  denom: 50000,  count: 4,  rate: 0 },
    { id: 'vnd_20k',  denom: 20000,  count: 5,  rate: 0 },
    { id: 'vnd_10k',  denom: 10000,  count: 5,  rate: 0 },
  ]
};

// Standard denomination options for dropdown selection
const STANDARD_DENOMS = {
  USD: [100, 50, 20, 10, 5, 2, 1],
  INR: [500, 200, 100, 50, 20, 10],
  VND: [500000, 200000, 100000, 50000, 20000, 10000, 5000, 2000, 1000],
};

export default function App() {
  // Live Rates State
  const [liveRates, setLiveRates] = useState(FALLBACK_RATES);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isLoadingRates, setIsLoadingRates] = useState(false);
  const [reverseTicker, setReverseTicker] = useState(false);

  // Core Forex Transaction Settings
  const [tradeAction, setTradeAction] = useState('BUY'); // 'BUY' or 'SELL'
  const [sourceCurrency, setSourceCurrency] = useState('INR'); // You give / pay
  const [targetCurrency, setTargetCurrency] = useState('USD'); // You receive / get
  const [rateMode, setRateMode] = useState('UNIFORM'); // 'UNIFORM' or 'TIERED'

  // Uniform Rate Mode inputs
  const [targetAmountDesired, setTargetAmountDesired] = useState(1000); 
  const [uniformRate, setUniformRate] = useState(87.80);

  // Dynamic Custom Note Batch Rows State
  const [notesDenomCurrency, setNotesDenomCurrency] = useState('USD');
  const [noteBatches, setNoteBatches] = useState([
    {
      id: 'batch_1',
      denom: 100,
      condition: 'Crisp / Mint',
      count: 5,
      rate: 25650
    },
    {
      id: 'batch_2',
      denom: 100,
      condition: 'Stained / Folded',
      count: 2,
      rate: 25100
    },
    {
      id: 'batch_3',
      denom: 50,
      condition: 'Good Condition',
      count: 2,
      rate: 25450
    },
    {
      id: 'batch_4',
      denom: 20,
      condition: 'Crisp / Mint',
      count: 3,
      rate: 25200
    }
  ]);

  // Fees & Editable GST
  const [serviceFee, setServiceFee] = useState(150);
  const [otherCharges, setOtherCharges] = useState(0);
  const [gstAmount, setGstAmount] = useState(158.04);
  const [isGstAuto, setIsGstAuto] = useState(true);

  // Quick street converter
  const [quickAmount, setQuickAmount] = useState(100);
  const [quickFrom, setQuickFrom] = useState('USD');
  const [quickTo, setQuickTo] = useState('VND');

  // Fetch Live Reference Rates
  const fetchLiveRates = async () => {
    setIsLoadingRates(true);
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/USD');
      if (!res.ok) throw new Error('Network error');
      const data = await res.json();
      if (data && data.rates) {
        const usdInr = data.rates.INR || FALLBACK_RATES.USD_INR;
        const usdVnd = data.rates.VND || FALLBACK_RATES.USD_VND;
        const inrVnd = usdVnd / usdInr;
        setLiveRates({
          USD_INR: parseFloat(usdInr.toFixed(2)),
          USD_VND: Math.round(usdVnd),
          INR_VND: parseFloat(inrVnd.toFixed(2)),
        });
        setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }
    } catch {
      setLiveRates(FALLBACK_RATES);
      setLastUpdated('Cached Baseline');
    } finally {
      setIsLoadingRates(false);
    }
  };

  useEffect(() => {
    fetchLiveRates();
  }, []);

  // Standard Market Interbank Rate definition
  const marketBenchmarkRate = useMemo(() => {
    if (sourceCurrency === targetCurrency) return 1;
    if (sourceCurrency === 'INR' && targetCurrency === 'USD') return liveRates.USD_INR;
    if (sourceCurrency === 'USD' && targetCurrency === 'INR') return 1 / liveRates.USD_INR;
    if (sourceCurrency === 'USD' && targetCurrency === 'VND') return liveRates.USD_VND;
    if (sourceCurrency === 'VND' && targetCurrency === 'USD') return 1 / liveRates.USD_VND;
    if (sourceCurrency === 'INR' && targetCurrency === 'VND') return liveRates.INR_VND;
    if (sourceCurrency === 'VND' && targetCurrency === 'INR') return 1 / liveRates.INR_VND;
    return 1;
  }, [sourceCurrency, targetCurrency, liveRates]);

  // Meaningful rate unit label: explicitly states price of 1 base note in target units
  const rateUnitLabel = useMemo(() => {
    return `Price of 1 ${notesDenomCurrency} in ${targetCurrency}`;
  }, [notesDenomCurrency, targetCurrency]);

  // Sync default rate and default batch on currency pair change
  useEffect(() => {
    const defaultNoteCurr = (sourceCurrency === 'USD' || targetCurrency === 'USD') ? 'USD' : sourceCurrency;
    setNotesDenomCurrency(defaultNoteCurr);

    let defaultBaseRate = marketBenchmarkRate;
    if (sourceCurrency === 'INR' && targetCurrency === 'USD') {
      defaultBaseRate = tradeAction === 'BUY' ? liveRates.USD_INR + 0.95 : liveRates.USD_INR - 1.25;
    } else if (sourceCurrency === 'USD' && targetCurrency === 'VND') {
      defaultBaseRate = tradeAction === 'BUY' ? liveRates.USD_VND + 100 : liveRates.USD_VND - 250;
    } else if (sourceCurrency === 'VND' && targetCurrency === 'USD') {
      defaultBaseRate = tradeAction === 'BUY' ? liveRates.USD_VND + 300 : liveRates.USD_VND - 200;
    } else if (sourceCurrency === 'INR' && targetCurrency === 'VND') {
      defaultBaseRate = liveRates.INR_VND * 0.96;
    }

    setUniformRate(Number(defaultBaseRate.toFixed(2)));
  }, [sourceCurrency, targetCurrency, tradeAction, liveRates, marketBenchmarkRate]);

  // Currency select handlers
  const handleSwapCurrencies = () => {
    const prevSource = sourceCurrency;
    setSourceCurrency(targetCurrency);
    setTargetCurrency(prevSource);
  };

  const handleSourceSelect = (val) => {
    if (val === targetCurrency) setTargetCurrency(sourceCurrency);
    setSourceCurrency(val);
  };

  const handleTargetSelect = (val) => {
    if (val === sourceCurrency) setSourceCurrency(targetCurrency);
    setTargetCurrency(val);
  };

  // Add a new row to Note Batches
  const handleAddNoteBatch = () => {
    const defaultDenom = notesDenomCurrency === 'USD' ? 100 : (notesDenomCurrency === 'INR' ? 500 : 500000);
    const defaultRate = (notesDenomCurrency === 'USD' && targetCurrency === 'VND') 
      ? liveRates.USD_VND 
      : uniformRate;

    setNoteBatches(prev => [
      ...prev,
      {
        id: 'batch_' + Date.now(),
        denom: defaultDenom,
        condition: 'Good Condition',
        count: 1,
        rate: defaultRate
      }
    ]);
  };

  // Remove a row (ensure at least 1 remains)
  const handleRemoveNoteBatch = (id) => {
    if (noteBatches.length <= 1) return;
    setNoteBatches(prev => prev.filter(b => b.id !== id));
  };

  // Modify individual denomination batch row
  const handleBatchCountChange = (id, count) => {
    const val = parseInt(count, 10);
    setNoteBatches(prev => prev.map(b => b.id === id ? { ...b, count: isNaN(val) ? 0 : Math.max(0, val) } : b));
  };

  const handleBatchRateChange = (id, rate) => {
    const val = parseFloat(rate);
    setNoteBatches(prev => prev.map(b => b.id === id ? { ...b, rate: isNaN(val) ? 0 : val } : b));
  };

  const handleBatchDenomChange = (id, denom) => {
    const val = parseFloat(denom);
    setNoteBatches(prev => prev.map(b => b.id === id ? { ...b, denom: isNaN(val) ? 0 : val } : b));
  };

  const handleNotesCurrencyChange = (curr) => {
    setNotesDenomCurrency(curr);
    const standardList = STANDARD_DENOMS[curr] || [100];
    const defaultDenom = standardList[0] || 100;
    const defaultRate = (curr === 'USD' && targetCurrency === 'VND')
      ? liveRates.USD_VND
      : uniformRate;

    setNoteBatches([
      { id: 'batch_1', denom: defaultDenom, count: 5, rate: defaultRate },
      { id: 'batch_2', denom: defaultDenom, count: 2, rate: defaultRate }
    ]);
  };

  // Preset quick scenarios
  const applyPreset = (type) => {
    if (type === 'INR_TO_USD') {
      setTradeAction('BUY');
      setSourceCurrency('INR');
      setTargetCurrency('USD');
      setRateMode('UNIFORM');
      setTargetAmountDesired(1000);
      setUniformRate(Number((liveRates.USD_INR + 0.90).toFixed(2)));
      setServiceFee(150);
      setOtherCharges(0);
      setIsGstAuto(true);
    } else if (type === 'USD_TO_VND_MULTI_RATES') {
      setTradeAction('BUY');
      setSourceCurrency('USD');
      setTargetCurrency('VND');
      setRateMode('TIERED');
      setNotesDenomCurrency('USD');
      setServiceFee(0);
      setOtherCharges(0);
      setGstAmount(0);
      setIsGstAuto(false);
      setNoteBatches([
        { id: 'b_1', denom: 100, count: 5, rate: liveRates.USD_VND + 180 },
        { id: 'b_2', denom: 100, count: 2, rate: liveRates.USD_VND - 100 },
        { id: 'b_3', denom: 50,  count: 2, rate: liveRates.USD_VND + 80 },
        { id: 'b_4', denom: 20,  count: 3, rate: liveRates.USD_VND - 150 },
      ]);
    } else if (type === 'VND_BUYBACK') {
      setTradeAction('SELL');
      setSourceCurrency('VND');
      setTargetCurrency('INR');
      setRateMode('UNIFORM');
      setTargetAmountDesired(5000000);
      setUniformRate(Number((liveRates.INR_VND * 1.08).toFixed(2)));
      setServiceFee(0);
      setOtherCharges(0);
      setGstAmount(0);
      setIsGstAuto(false);
    }
  };

  // ================= MAIN CORE ENGINE CALCULATION =================
  const calculations = useMemo(() => {
    let baseConversionCostInSource = 0; // Pure currency conversion out-of-pocket
    let netTargetUnitsReceived = 0;      // Actual units received in target currency
    let weightedEffectiveRate = 0;       // Unit rate across notes or uniform rate
    let noteBatchesSummary = [];

    if (rateMode === 'UNIFORM') {
      const targetDesired = Math.max(0, Number(targetAmountDesired) || 0);
      const rate = Math.max(0, Number(uniformRate) || 0);
      weightedEffectiveRate = rate;

      if (tradeAction === 'BUY') {
        if (sourceCurrency === 'USD' && targetCurrency === 'VND') {
          baseConversionCostInSource = targetDesired;
          netTargetUnitsReceived = targetDesired * rate;
        } else if (sourceCurrency === 'INR' && targetCurrency === 'VND') {
          baseConversionCostInSource = targetDesired;
          netTargetUnitsReceived = targetDesired * rate;
        } else if (sourceCurrency === 'VND' && targetCurrency === 'USD') {
          netTargetUnitsReceived = targetDesired;
          baseConversionCostInSource = targetDesired * rate;
        } else {
          netTargetUnitsReceived = targetDesired;
          baseConversionCostInSource = targetDesired * rate;
        }
      } else {
        // SELL / BUYBACK
        if (sourceCurrency === 'VND' && targetCurrency === 'USD') {
          baseConversionCostInSource = targetDesired;
          netTargetUnitsReceived = rate > 0 ? (targetDesired / rate) : 0;
        } else if (sourceCurrency === 'USD' && targetCurrency === 'INR') {
          baseConversionCostInSource = targetDesired;
          netTargetUnitsReceived = targetDesired * rate;
        } else {
          baseConversionCostInSource = targetDesired;
          netTargetUnitsReceived = targetDesired * rate;
        }
      }
    } else {
      // DYNAMIC TIERED NOTE BATCH MODE
      let totalNotesCount = 0;
      let totalNotesValue = 0;
      let totalYieldValue = 0;

      noteBatchesSummary = noteBatches.map(b => {
        const count = Math.max(0, b.count || 0);
        const faceSum = (b.denom || 0) * count;
        const rowYield = faceSum * (b.rate || 0);
        totalNotesCount += count;
        totalNotesValue += faceSum;
        totalYieldValue += rowYield;
        return {
          ...b,
          faceSum,
          rowYield
        };
      });

      if (notesDenomCurrency === sourceCurrency) {
        baseConversionCostInSource = totalNotesValue;
        netTargetUnitsReceived = totalYieldValue;
      } else if (notesDenomCurrency === targetCurrency && sourceCurrency === 'INR' && targetCurrency === 'USD') {
        netTargetUnitsReceived = totalNotesValue;
        baseConversionCostInSource = totalYieldValue;
      } else {
        baseConversionCostInSource = totalNotesValue;
        netTargetUnitsReceived = totalYieldValue;
      }

      weightedEffectiveRate = totalNotesValue > 0 ? (totalYieldValue / totalNotesValue) : 0;
    }

    // Auto-calculate GST (0.18% of Base Cost)
    const currentGst = isGstAuto ? (baseConversionCostInSource * 0.0018) : Number(gstAmount || 0);

    // Final Net Calculations for BUY vs SELL
    let totalMoneyToPay = 0;
    let netCashReceivedInHand = 0;

    if (tradeAction === 'BUY') {
      totalMoneyToPay = baseConversionCostInSource + Number(serviceFee || 0) + Number(otherCharges || 0) + currentGst;
      netCashReceivedInHand = netTargetUnitsReceived;
    } else {
      // In Sell/Buyback mode: fees/GST reduce the final payout received
      totalMoneyToPay = baseConversionCostInSource;
      netCashReceivedInHand = Math.max(0, netTargetUnitsReceived - Number(serviceFee || 0) - Number(otherCharges || 0) - currentGst);
    }

    // ================= PURE DEALER SPREAD & LOSS ANALYSIS =================
    // STRICT RULE: Exclude all service fees, charges, and GST.
    let pureMarketFairCost = 0;

    if (sourceCurrency === 'INR' && targetCurrency === 'USD') {
      pureMarketFairCost = netTargetUnitsReceived * liveRates.USD_INR;
    } else if (sourceCurrency === 'USD' && targetCurrency === 'VND') {
      pureMarketFairCost = baseConversionCostInSource * liveRates.USD_VND;
    } else if (sourceCurrency === 'VND' && targetCurrency === 'USD') {
      pureMarketFairCost = netTargetUnitsReceived * liveRates.USD_VND;
    } else if (sourceCurrency === 'INR' && targetCurrency === 'VND') {
      pureMarketFairCost = baseConversionCostInSource * liveRates.INR_VND;
    } else if (sourceCurrency === 'USD' && targetCurrency === 'INR') {
      pureMarketFairCost = baseConversionCostInSource * liveRates.USD_INR;
    } else {
      pureMarketFairCost = baseConversionCostInSource;
    }

    let pureSpreadLoss = 0;
    let pureLossPercentage = 0;

    if (tradeAction === 'BUY') {
      if (sourceCurrency === 'USD' && targetCurrency === 'VND') {
        pureSpreadLoss = Math.max(0, pureMarketFairCost - netTargetUnitsReceived);
        pureLossPercentage = pureMarketFairCost > 0 ? (pureSpreadLoss / pureMarketFairCost) * 100 : 0;
      } else {
        pureSpreadLoss = Math.max(0, baseConversionCostInSource - pureMarketFairCost);
        pureLossPercentage = pureMarketFairCost > 0 ? (pureSpreadLoss / pureMarketFairCost) * 100 : 0;
      }
    } else {
      // SELL / BUYBACK
      if (sourceCurrency === 'USD' && targetCurrency === 'INR') {
        const expectedFairInr = baseConversionCostInSource * liveRates.USD_INR;
        pureSpreadLoss = Math.max(0, expectedFairInr - netTargetUnitsReceived);
        pureLossPercentage = expectedFairInr > 0 ? (pureSpreadLoss / expectedFairInr) * 100 : 0;
      } else {
        pureSpreadLoss = Math.max(0, pureMarketFairCost - netTargetUnitsReceived);
        pureLossPercentage = pureMarketFairCost > 0 ? (pureSpreadLoss / pureMarketFairCost) * 100 : 0;
      }
    }

    return {
      baseConversionCostInSource,
      netTargetUnitsReceived,
      weightedEffectiveRate,
      currentGst,
      totalMoneyToPay,
      netCashReceivedInHand,
      pureSpreadLoss,
      pureLossPercentage,
      pureMarketFairCost,
      noteBatchesSummary
    };
  }, [
    tradeAction,
    sourceCurrency,
    targetCurrency,
    rateMode,
    targetAmountDesired,
    uniformRate,
    noteBatches,
    notesDenomCurrency,
    serviceFee,
    otherCharges,
    gstAmount,
    isGstAuto,
    liveRates
  ]);

  // Keep manual GST synchronized when auto mode is enabled
  useEffect(() => {
    if (isGstAuto) {
      setGstAmount(Number((calculations.baseConversionCostInSource * 0.0018).toFixed(2)));
    }
  }, [calculations.baseConversionCostInSource, isGstAuto]);

  // Quick converter result
  const quickConverted = useMemo(() => {
    const amt = parseFloat(quickAmount) || 0;
    if (quickFrom === quickTo) return amt;

    let inUsd = amt;
    if (quickFrom === 'INR') inUsd = amt / liveRates.USD_INR;
    else if (quickFrom === 'VND') inUsd = amt / liveRates.USD_VND;

    if (quickTo === 'USD') return inUsd;
    if (quickTo === 'INR') return inUsd * liveRates.USD_INR;
    if (quickTo === 'VND') return inUsd * liveRates.USD_VND;
    return inUsd;
  }, [quickAmount, quickFrom, quickTo, liveRates]);

  const formatNum = (val, decimals = 0) => {
    if (isNaN(val) || val === null) return '0';
    return Number(val).toLocaleString('en-IN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  const getCurrencySymbol = (curr) => {
    if (curr === 'INR') return '₹';
    if (curr === 'USD') return '$';
    if (curr === 'VND') return '₫';
    return '';
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased selection:bg-teal-100 selection:text-teal-900 pb-16">
      
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white flex items-center justify-center shadow-xs font-bold text-lg">
              {getCurrencySymbol(targetCurrency) || '₫'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-slate-900 text-lg tracking-tight">My Travel Forex Calculator</h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200">
                  Accurate Travel Forex
                </span>
              </div>
              <p className="text-xs text-slate-500">INR, USD & VND Live Forex Calculator</p>
            </div>
          </div>

          {/* Quick preset buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => applyPreset('INR_TO_USD')}
              className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
            >
              Preset: INR➔USD
            </button>
            <button
              onClick={() => applyPreset('USD_TO_VND_MULTI_RATES')}
              className="px-2.5 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition cursor-pointer"
            >
              Preset: Mixed USD Rates
            </button>
            <button
              onClick={fetchLiveRates}
              disabled={isLoadingRates}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition cursor-pointer shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRates ? 'animate-spin text-teal-600' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Live Rates Ticker */}
        <div className="bg-slate-100/90 border-t border-slate-200 px-4 py-1.5">
          <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-slate-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-semibold text-slate-700">Market Reference:</span>
              <span className="text-slate-400">({lastUpdated || 'Loading...'})</span>
            </div>

            <div className="flex items-center gap-3 overflow-x-auto py-0.5">
              {/* USD <-> INR */}
              <div className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-md border border-slate-200 text-xs shadow-2xs">
                <span className="font-semibold text-slate-700">
                  {reverseTicker ? '1 INR' : '1 USD'}
                </span>
                <span className="text-slate-400">=</span>
                <span className="font-mono font-bold text-teal-700">
                  {reverseTicker ? (1 / liveRates.USD_INR).toFixed(4) + ' USD' : '₹' + formatNum(liveRates.USD_INR, 2)}
                </span>
              </div>

              {/* USD <-> VND */}
              <div className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-md border border-slate-200 text-xs shadow-2xs">
                <span className="font-semibold text-slate-700">
                  {reverseTicker ? '100k VND' : '1 USD'}
                </span>
                <span className="text-slate-400">=</span>
                <span className="font-mono font-bold text-emerald-700">
                  {reverseTicker ? '$' + ((100000 / liveRates.USD_VND).toFixed(2)) : formatNum(liveRates.USD_VND) + ' ₫'}
                </span>
              </div>

              {/* INR <-> VND */}
              <div className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-md border border-slate-200 text-xs shadow-2xs">
                <span className="font-semibold text-slate-700">
                  {reverseTicker ? '100k VND' : '1 INR'}
                </span>
                <span className="text-slate-400">=</span>
                <span className="font-mono font-bold text-indigo-700">
                  {reverseTicker ? '₹' + ((100000 / liveRates.INR_VND).toFixed(1)) : formatNum(liveRates.INR_VND, 1) + ' ₫'}
                </span>
              </div>

              {/* Invert Button */}
              <button
                onClick={() => setReverseTicker(!reverseTicker)}
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-md transition cursor-pointer"
                title="Reverse currency display"
              >
                <ArrowRightLeft className="w-3 h-3 text-slate-500" />
                <span>{reverseTicker ? 'Standard Rates' : 'Invert Rates'}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 pt-6 space-y-6">

        {/* Forex Transaction Configuration Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs">
          
          {/* Action & Currencies Row */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center pb-6 border-b border-slate-100">
            {/* Buy / Sell Toggle */}
            <div className="md:col-span-4">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                Transaction Type
              </label>
              <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setTradeAction('BUY')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
                    tradeAction === 'BUY'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Buy Currency
                </button>
                <button
                  type="button"
                  onClick={() => setTradeAction('SELL')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
                    tradeAction === 'SELL'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Sell / Buyback
                </button>
              </div>
            </div>

            {/* Currency Selectors */}
            <div className="md:col-span-8 flex flex-col sm:flex-row items-center gap-3">
              {/* Source Currency */}
              <div className="w-full sm:flex-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                  {tradeAction === 'BUY' ? 'You Give (Paying In)' : 'You Surrender (Leftover)'}
                </label>
                <select
                  value={sourceCurrency}
                  onChange={(e) => handleSourceSelect(e.target.value)}
                  className="w-full py-2.5 px-3 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                >
                  <option value="INR">INR (Indian Rupee - ₹)</option>
                  <option value="USD">USD (US Dollar - $)</option>
                  <option value="VND">VND (Vietnamese Dong - ₫)</option>
                </select>
              </div>

              {/* Swap Button */}
              <div className="pt-5 sm:pt-6">
                <button
                  type="button"
                  onClick={handleSwapCurrencies}
                  className="p-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition cursor-pointer"
                  title="Swap Currencies"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                </button>
              </div>

              {/* Target Currency */}
              <div className="w-full sm:flex-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                  {tradeAction === 'BUY' ? 'You Receive (Target)' : 'You Receive Back'}
                </label>
                <select
                  value={targetCurrency}
                  onChange={(e) => handleTargetSelect(e.target.value)}
                  className="w-full py-2.5 px-3 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                >
                  <option value="USD">USD (US Dollar - $)</option>
                  <option value="VND">VND (Vietnamese Dong - ₫)</option>
                  <option value="INR">INR (Indian Rupee - ₹)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Rate Mode Toggle: Same Rate vs Different Rates for Different Notes */}
          <div className="pt-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Exchange Rate Mode
                </label>
                <p className="text-xs text-slate-500">
                  Select single uniform rate or custom note rows with individual condition rates
                </p>
              </div>

              <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setRateMode('UNIFORM')}
                  className={`py-1.5 px-4 rounded-lg text-xs font-bold transition cursor-pointer ${
                    rateMode === 'UNIFORM'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Single / Uniform Rate
                </button>
                <button
                  type="button"
                  onClick={() => setRateMode('TIERED')}
                  className={`py-1.5 px-4 rounded-lg text-xs font-bold transition cursor-pointer ${
                    rateMode === 'TIERED'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Different Rates per Note
                </button>
              </div>
            </div>

            {/* UNIFORM RATE INPUTS */}
            {rateMode === 'UNIFORM' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {tradeAction === 'BUY' 
                      ? (sourceCurrency === 'USD' && targetCurrency === 'VND' 
                          ? `Amount of USD Tendered ($)` 
                          : `Desired Amount to Buy (${targetCurrency})`)
                      : `Amount You Are Exchanging (${sourceCurrency})`
                    }
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                      {tradeAction === 'BUY' 
                        ? (sourceCurrency === 'USD' && targetCurrency === 'VND' ? '$' : getCurrencySymbol(targetCurrency)) 
                        : getCurrencySymbol(sourceCurrency)}
                    </span>
                    <input
                      type="number"
                      min="0"
                      value={targetAmountDesired}
                      onChange={(e) => setTargetAmountDesired(parseFloat(e.target.value) || 0)}
                      className="w-full pl-8 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-bold text-base focus:outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder="e.g. 1000"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-slate-700">
                      Dealer Quoted Rate
                    </label>
                    <span className="text-[11px] text-slate-500 font-mono">
                      Market Ref: {marketBenchmarkRate.toFixed(2)}
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      value={uniformRate}
                      onChange={(e) => setUniformRate(parseFloat(e.target.value) || 0)}
                      className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-bold text-base focus:outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder="Rate quoted by dealer"
                    />
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Format: {rateUnitLabel}
                  </span>
                </div>
              </div>
            )}

            {/* DYNAMIC CUSTOM NOTE BATCHES WITH ADD ROW SUPPORT */}
            {rateMode === 'TIERED' && (
              <div className="bg-slate-50/80 p-3 sm:p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-teal-600 shrink-0" />
                    <span className="text-xs sm:text-sm font-bold text-slate-800">
                      Denomination Note Breakdown
                    </span>
                  </div>
                  
                  {/* Currency selector & Add Row button */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-500 font-medium">Notes Currency:</span>
                      <select
                        value={notesDenomCurrency}
                        onChange={(e) => handleNotesCurrencyChange(e.target.value)}
                        className="py-1 px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                      >
                        <option value="USD">USD Notes ($)</option>
                        <option value="INR">INR Notes (₹)</option>
                        <option value="VND">VND Notes (₫)</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddNoteBatch}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition cursor-pointer shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Note Batch</span>
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto -mx-1 sm:mx-0">
                  <table className="w-full min-w-[560px] text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-bold">
                        <th className="py-2.5 px-2 w-36">Denomination</th>
                        <th className="py-2.5 px-2 w-32">No. of Notes</th>
                        <th className="py-2.5 px-2 w-28">Total Value</th>
                        <th className="py-2.5 px-2">Rate ({rateUnitLabel})</th>
                        <th className="py-2.5 px-2 text-right w-36">Total Amount ({targetCurrency})</th>
                        <th className="py-2.5 px-2 text-center w-12">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {noteBatches.map((batch) => {
                        const noteTotal = (batch.denom || 0) * (batch.count || 0);
                        const yieldTotal = noteTotal * (batch.rate || 0);
                        const standardList = STANDARD_DENOMS[notesDenomCurrency] || [100, 50, 20, 10, 5, 1];

                        return (
                          <tr key={batch.id} className="hover:bg-white/80 transition-colors">
                            {/* Denomination Selector / Custom Input */}
                            <td className="py-2.5 px-2">
                              <select
                                value={batch.denom}
                                onChange={(e) => handleBatchDenomChange(batch.id, e.target.value)}
                                className="w-full py-1.5 px-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500 text-xs sm:text-sm cursor-pointer"
                              >
                                {standardList.map(d => (
                                  <option key={d} value={d}>
                                    {getCurrencySymbol(notesDenomCurrency)} {formatNum(d)} note
                                  </option>
                                ))}
                                {!standardList.includes(batch.denom) && (
                                  <option value={batch.denom}>
                                    {getCurrencySymbol(notesDenomCurrency)} {formatNum(batch.denom)} (custom)
                                  </option>
                                )}
                              </select>
                            </td>

                            {/* Note count stepper with touch-friendly targets */}
                            <td className="py-2.5 px-2">
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleBatchCountChange(batch.id, Math.max(0, (batch.count || 0) - 1))}
                                  className="w-7 h-7 sm:w-6 sm:h-6 bg-slate-200 active:bg-slate-300 hover:bg-slate-300 rounded text-slate-800 font-bold flex items-center justify-center cursor-pointer select-none text-sm"
                                  aria-label="Decrease note count"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min="0"
                                  value={batch.count}
                                  onChange={(e) => handleBatchCountChange(batch.id, e.target.value)}
                                  className="w-12 text-center py-1 bg-white border border-slate-300 rounded font-bold text-slate-900 focus:outline-none text-xs sm:text-sm"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleBatchCountChange(batch.id, (batch.count || 0) + 1)}
                                  className="w-7 h-7 sm:w-6 sm:h-6 bg-slate-200 active:bg-slate-300 hover:bg-slate-300 rounded text-slate-800 font-bold flex items-center justify-center cursor-pointer select-none text-sm"
                                  aria-label="Increase note count"
                                >
                                  +
                                </button>
                              </div>
                            </td>

                            {/* Total face value */}
                            <td className="py-2.5 px-2 font-mono font-semibold text-slate-700 whitespace-nowrap">
                              {getCurrencySymbol(notesDenomCurrency)} {formatNum(noteTotal)}
                            </td>

                            {/* Quoted rate for this specific note */}
                            <td className="py-2.5 px-2">
                              <input
                                type="number"
                                step="any"
                                value={batch.rate}
                                onChange={(e) => handleBatchRateChange(batch.id, e.target.value)}
                                className="w-full py-1.5 px-2.5 bg-white border border-slate-300 rounded font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500 text-xs sm:text-sm"
                              />
                            </td>

                            {/* Total yield for this denomination */}
                            <td className="py-2.5 px-2 text-right font-mono font-bold text-teal-800 whitespace-nowrap">
                              {getCurrencySymbol(targetCurrency)} {formatNum(yieldTotal)}
                            </td>

                            {/* Delete row action */}
                            <td className="py-2.5 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveNoteBatch(batch.id)}
                                disabled={noteBatches.length <= 1}
                                className={`p-1.5 rounded-md transition cursor-pointer ${
                                  noteBatches.length <= 1 
                                    ? 'text-slate-300 cursor-not-allowed' 
                                    : 'text-rose-500 hover:bg-rose-50 hover:text-rose-700'
                                }`}
                                title={noteBatches.length <= 1 ? "At least one row required" : "Delete note batch"}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>

                    {/* TOTAL FOOTER ROW IN DENOMINATION BREAKDOWN TABLE */}
                    <tfoot className="border-t-2 border-slate-300 bg-slate-100/90 font-bold text-slate-900">
                      <tr>
                        <td className="py-3 px-2 text-xs sm:text-sm uppercase tracking-wider text-slate-700">
                          Total Summary:
                        </td>
                        <td className="py-3 px-2 font-mono text-xs sm:text-sm text-slate-800">
                          {noteBatches.reduce((acc, b) => acc + (parseInt(b.count, 10) || 0), 0)} notes
                        </td>
                        <td className="py-3 px-2 font-mono text-xs sm:text-sm text-slate-900 whitespace-nowrap">
                          {getCurrencySymbol(notesDenomCurrency)} {formatNum(noteBatches.reduce((acc, b) => acc + ((b.denom || 0) * (parseInt(b.count, 10) || 0)), 0))}
                        </td>
                        <td className="py-3 px-2 text-[11px] sm:text-xs text-slate-500 font-normal">
                          Weighted Avg: <span className="font-mono font-bold text-slate-700">
                            {calculations.weightedEffectiveRate > 0 ? (
                              (sourceCurrency === 'INR' && targetCurrency === 'USD')
                                ? calculations.weightedEffectiveRate.toFixed(2)
                                : (1 / calculations.weightedEffectiveRate).toFixed(2)
                            ) : '—'}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right font-mono font-extrabold text-sm sm:text-base text-emerald-700 whitespace-nowrap">
                          {getCurrencySymbol(targetCurrency)} {formatNum(calculations.netTargetUnitsReceived)}
                        </td>
                        <td className="py-3 px-2"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* Service Fees, EDITABLE GST & Other Charges */}
            <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              {/* Service Fee */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Service / Handling Fee ({sourceCurrency})
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                    {getCurrencySymbol(sourceCurrency)}
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={serviceFee}
                    onChange={(e) => setServiceFee(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Other Charges */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Other Charges / Delivery ({sourceCurrency})
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                    {getCurrencySymbol(sourceCurrency)}
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={otherCharges}
                    onChange={(e) => setOtherCharges(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* GST Editable Field with Auto/Manual Controls */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 block">
                    GST ({sourceCurrency})
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const autoVal = Number((calculations.baseConversionCostInSource * 0.0018).toFixed(2));
                      setGstAmount(autoVal);
                      setIsGstAuto(true);
                    }}
                    className={`text-[10px] px-2 py-0.5 rounded font-semibold transition cursor-pointer ${
                      isGstAuto ? 'bg-teal-100 text-teal-800' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    }`}
                    title="Click to reset to standard 0.18% of Base Amount"
                  >
                    {isGstAuto ? 'Auto (0.18%)' : 'Set 0.18%'}
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                    {getCurrencySymbol(sourceCurrency)}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={gstAmount}
                    onChange={(e) => {
                      setIsGstAuto(false);
                      setGstAmount(parseFloat(e.target.value) || 0);
                    }}
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="Enter GST amount"
                  />
                </div>
                <span className="text-[10px] text-slate-500 block leading-tight mt-1">
                  Auto Calc: {formatNum(calculations.baseConversionCostInSource, 2)} × 0.18% = {getCurrencySymbol(sourceCurrency)}{(calculations.baseConversionCostInSource * 0.0018).toFixed(2)}
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* ================= SUMMARY & ANALYSIS DASHBOARD ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Main Financial Summary */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-teal-600" />
                  <h2 className="text-base font-extrabold text-slate-900">Exchange Summary</h2>
                </div>
                <span className="text-xs uppercase font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {tradeAction === 'BUY' ? 'Forex Purchase' : 'Forex Buyback / Sale'}
                </span>
              </div>

              {/* Itemized Breakdown Table */}
              <div className="space-y-3 text-xs sm:text-sm pt-1">
                
                {/* Fixed Base Conversion display */}
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-700">
                      {tradeAction === 'BUY' ? 'Base Exchange Conversion:' : 'Gross Dealer Converted Yield:'}
                    </span>
                    <span className="font-mono font-extrabold text-slate-950 text-sm sm:text-base">
                      {tradeAction === 'BUY' 
                        ? `${formatNum(calculations.baseConversionCostInSource, 2)} ${sourceCurrency}`
                        : `${formatNum(calculations.netTargetUnitsReceived, 2)} ${targetCurrency}`}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    Converts: {formatNum(calculations.baseConversionCostInSource, 2)} {sourceCurrency} ➔ {formatNum(calculations.netTargetUnitsReceived, 2)} {targetCurrency}
                  </div>
                </div>

                <div className="flex justify-between text-slate-600 px-1">
                  <span>Service & Handling Fee:</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {tradeAction === 'BUY' ? '+ ' : '- '}
                    {formatNum(serviceFee, 2)} {sourceCurrency}
                  </span>
                </div>

                <div className="flex justify-between text-slate-600 px-1">
                  <div className="flex items-center gap-1.5">
                    <span>GST (Editable):</span>
                    <span className="text-[11px] text-slate-400">
                      {isGstAuto ? '(Auto 0.18%)' : '(Manual Entry)'}
                    </span>
                  </div>
                  <span className="font-mono font-semibold text-slate-900">
                    {tradeAction === 'BUY' ? '+ ' : '- '}
                    {formatNum(gstAmount, 2)} {sourceCurrency}
                  </span>
                </div>

                {otherCharges > 0 && (
                  <div className="flex justify-between text-slate-600 px-1">
                    <span>Other Charges / Misc:</span>
                    <span className="font-mono font-semibold text-slate-900">
                      {tradeAction === 'BUY' ? '+ ' : '- '}
                      {formatNum(otherCharges, 2)} {sourceCurrency}
                    </span>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline font-bold text-slate-900 px-1">
                  <span>
                    {tradeAction === 'BUY' ? 'Final Net Out-of-Pocket:' : 'Final Net Payout Received in Hand:'}
                  </span>
                  <span className="font-mono text-lg text-emerald-800">
                    {tradeAction === 'BUY' 
                      ? `${getCurrencySymbol(sourceCurrency)} ${formatNum(calculations.totalMoneyToPay, 2)}`
                      : `${getCurrencySymbol(targetCurrency)} ${formatNum(calculations.netCashReceivedInHand, 2)}`}
                  </span>
                </div>
              </div>

              {/* Dynamic Metric Display Moved Below Final Net Out-of-Pocket */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-5 border-t border-slate-100">
                {tradeAction === 'BUY' ? (
                  <>
                    {/* BUY Mode: Total Money To Pay */}
                    <div className="p-4 rounded-xl bg-slate-900 text-white shadow-xs">
                      <span className="text-xs text-slate-300 font-semibold block mb-1">
                        Total Money To Pay
                      </span>
                      <div className="font-mono font-black text-2xl sm:text-3xl text-emerald-400">
                        {getCurrencySymbol(sourceCurrency)} {formatNum(calculations.totalMoneyToPay, 2)}
                      </div>
                      <span className="text-[11px] text-slate-300 mt-1 block">
                        Base Conversion + GST + All Fees
                      </span>
                    </div>

                    {/* BUY Mode: Total Currency Received in Hand */}
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 shadow-xs">
                      <span className="text-xs text-emerald-800 font-semibold block mb-1">
                        Total Money In Your Hand
                      </span>
                      <div className="font-mono font-black text-2xl sm:text-3xl text-emerald-950">
                        {getCurrencySymbol(targetCurrency)} {formatNum(calculations.netTargetUnitsReceived, 2)}
                      </div>
                      <span className="text-[11px] text-emerald-700 mt-1 block font-medium">
                        Net cash currency received
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    {/* SELL Mode: Net Cash You Receive in Hand */}
                    <div className="p-4 rounded-xl bg-emerald-700 text-white shadow-xs">
                      <span className="text-xs text-emerald-100 font-semibold block mb-1">
                        Net Cash You Receive in Hand
                      </span>
                      <div className="font-mono font-black text-2xl sm:text-3xl text-emerald-200">
                        {getCurrencySymbol(targetCurrency)} {formatNum(calculations.netCashReceivedInHand, 2)}
                      </div>
                      <span className="text-[11px] text-emerald-100 mt-1 block">
                        Gross Yield minus Dealer Fees & GST
                      </span>
                    </div>

                    {/* SELL Mode: Currency Surrendered */}
                    <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 shadow-xs">
                      <span className="text-xs text-slate-600 font-semibold block mb-1">
                        Total Currency Surrendered
                      </span>
                      <div className="font-mono font-black text-2xl sm:text-3xl text-slate-900">
                        {getCurrencySymbol(sourceCurrency)} {formatNum(calculations.baseConversionCostInSource, 2)}
                      </div>
                      <span className="text-[11px] text-slate-500 mt-1 block font-medium">
                        Leftover notes handed over
                      </span>
                    </div>
                  </>
                )}
              </div>

            </div>
          </div>

          {/* DEALER MARKUP & LOSS ANALYSIS (PURE SPREAD ONLY) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-amber-600" />
                  <h3 className="font-bold text-slate-900 text-sm">Dealer Markup & Loss Analysis</h3>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded">
                  Pure Spread Only
                </span>
              </div>

              {/* Amount Lost Card - STRICTLY EXCLUDING GST & FEES */}
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4">
                <span className="text-xs font-semibold text-amber-900 block mb-1">
                  {tradeAction === 'BUY' ? 'Pure Conversion Spread Loss' : 'Payout Shortfall / Loss'}
                </span>
                <div className="font-mono font-black text-2xl text-amber-950 flex items-baseline gap-2">
                  <span>
                    - {getCurrencySymbol(sourceCurrency === 'USD' && targetCurrency === 'VND' ? 'VND' : (tradeAction === 'SELL' ? targetCurrency : sourceCurrency))} {formatNum(calculations.pureSpreadLoss, 2)}
                  </span>
                  <span className="text-sm font-bold text-amber-800">
                    (-{formatNum(calculations.pureLossPercentage, 2)}%)
                  </span>
                </div>
                <p className="text-[11px] text-amber-800 mt-2 leading-relaxed">
                  Based purely on the quoted exchange rate vs the live interbank reference ({formatNum(marketBenchmarkRate, 2)}). This measures pure conversion friction without GST or service charges.
                </p>
              </div>

              {/* Breakdown Figures */}
              <div className="space-y-2 text-xs text-slate-600 pt-1">
                <div className="flex justify-between">
                  <span>Interbank Fair Cost (Pure Rate):</span>
                  <span className="font-mono font-medium text-slate-900">
                    {formatNum(calculations.pureMarketFairCost, 2)} {sourceCurrency === 'USD' && targetCurrency === 'VND' ? 'VND' : (tradeAction === 'SELL' ? targetCurrency : sourceCurrency)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>Dealer Spread Margin:</span>
                  <span className="font-mono font-semibold text-amber-700">
                    -{formatNum(calculations.pureLossPercentage, 2)}% deficit
                  </span>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-3">
                <div className="space-y-1">
                  <span className="font-bold text-slate-800 block text-xs">💡 Travel Note Advice:</span>
                  <p>• In Vietnam, gold and jewelry shops (Hà Trung in Hanoi or Bến Thành in Saigon) provide the best rates for crisp $100 & $50 bills.</p>
                  <p>• Damaged, folded, or small bills receive a 1%–4% lower quote as reflected in the dynamic rows above.</p>
                </div>

                {/* Cost Breakdown by Exchange Method Table */}
                <div className="pt-2 border-t border-slate-200">
                  <span className="font-bold text-slate-800 block mb-2 text-xs">
                    Cost Breakdown by Exchange Method
                  </span>
                  <div className="overflow-x-auto -mx-1">
                    <table className="w-full text-left text-[11px] border border-slate-200 rounded-lg overflow-hidden bg-white">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-2.5">Exchange Venue</th>
                          <th className="py-2 px-2.5">Direct Fees / Commission</th>
                          <th className="py-2 px-2.5">Exchange Rate Spread (Loss vs Market)</th>
                          <th className="py-2 px-2.5">Best Use Case</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-600">
                        <tr className="hover:bg-emerald-50/40">
                          <td className="py-2 px-2.5 font-semibold text-slate-900">
                            Licensed Gold / Jewelry Shops <span className="text-[10px] text-slate-500 font-normal">(e.g., Hà Trung in Hanoi, Bến Thành / Hà Tâm in HCMC)</span>
                          </td>
                          <td className="py-2 px-2.5 font-mono text-emerald-700 font-semibold">
                            0% (No fees)
                          </td>
                          <td className="py-2 px-2.5 font-mono text-emerald-700 font-bold">
                            0.2% – 1% (Closest to official market rate)
                          </td>
                          <td className="py-2 px-2.5 text-slate-700">
                            Best overall value for exchanging USD cash.
                          </td>
                        </tr>
                        <tr className="hover:bg-slate-50">
                          <td className="py-2 px-2.5 font-semibold text-slate-900">
                            Local Banks <span className="text-[10px] text-slate-500 font-normal">(Vietcombank, BIDV, Techcombank)</span>
                          </td>
                          <td className="py-2 px-2.5 font-mono text-slate-700">
                            0% – 1% (usually built into buy rate)
                          </td>
                          <td className="py-2 px-2.5 font-mono text-amber-700 font-bold">
                            1% – 2.5%
                          </td>
                          <td className="py-2 px-2.5 text-slate-700">
                            Safe, official receipt provided; requires passport.
                          </td>
                        </tr>
                        <tr className="hover:bg-amber-50/40">
                          <td className="py-2 px-2.5 font-semibold text-slate-900">
                            Airport Exchange Booths
                          </td>
                          <td className="py-2 px-2.5 font-mono text-slate-700">
                            Usually 0% declared fee
                          </td>
                          <td className="py-2 px-2.5 font-mono text-amber-700 font-bold">
                            3% – 6% (Poor rates)
                          </td>
                          <td className="py-2 px-2.5 text-slate-700">
                            Only exchange $20–$50 for immediate transport.
                          </td>
                        </tr>
                        <tr className="hover:bg-rose-50/40">
                          <td className="py-2 px-2.5 font-semibold text-slate-900">
                            Hotels & Tour Desks
                          </td>
                          <td className="py-2 px-2.5 font-mono text-slate-700">
                            Usually 0% declared fee
                          </td>
                          <td className="py-2 px-2.5 font-mono text-rose-700 font-bold">
                            4% – 7% (Worst rates)
                          </td>
                          <td className="py-2 px-2.5 text-slate-700">
                            Emergency convenience only.
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Hidden Penalties & ATM Advisory */}
                <div className="pt-3 border-t border-slate-200 space-y-3">
                  <div className="space-y-1.5">
                    <span className="font-bold text-slate-800 block text-xs">
                      ⚠️ Hidden "Penalties" to Watch Out For
                    </span>
                    <p className="text-slate-600 leading-relaxed text-[11px]">
                      While you won't see a surcharge line item on a bill, currency changers in Vietnam strictly adjust rates based on banknote quality:
                    </p>
                    <ul className="space-y-1.5 pl-3 border-l-2 border-amber-300 text-[11px] text-slate-600">
                      <li>
                        <strong className="text-slate-800">Denomination Penalty:</strong>
                        <div className="pl-2 mt-0.5 space-y-0.5">
                          <p>• <strong>$100 and $50 notes</strong> fetch the highest exchange rates.</p>
                          <p>• <strong>$1, $5, $10, and $20 notes</strong> often receive a <strong>1% to 3% lower exchange rate</strong> because they are costlier for local vendors to handle.</p>
                        </div>
                      </li>
                      <li>
                        <strong className="text-slate-800">Condition / Tear Penalty:</strong>
                        <div className="pl-2 mt-0.5 space-y-0.5">
                          <p>• Bills must be <strong>crisp and clean</strong>.</p>
                          <p>• Any ink marks, stamps, tears, folds, or old series notes (especially pre-2013 $100 bills) will either be <strong>rejected outright</strong> or penalized with a <strong>2%–5% cut</strong>.</p>
                        </div>
                      </li>
                    </ul>
                  </div>

                  <div className="p-2.5 rounded-lg bg-teal-50/70 border border-teal-200 text-[11px] space-y-1 text-teal-950">
                    <span className="font-bold text-teal-900 block text-xs">
                      🏧 Alternative: Using ATMs in Vietnam
                    </span>
                    <p className="text-teal-800">
                      If you withdraw VND directly from an ATM using an international debit/forex card:
                    </p>
                    <ul className="space-y-1 pl-3 list-disc marker:text-teal-600 text-teal-900">
                      <li>
                        <strong>Local ATM Operator Fee:</strong> 20,000 to 55,000 VND (~$0.80 – $2.20 USD) per transaction (some banks like <em>VPBank</em> or <em>TPBank</em> may charge zero).
                      </li>
                      <li>
                        <strong>Dynamic Currency Conversion (DCC):</strong> Always select <strong>"Decline Conversion" / "Charge in VND"</strong> at the ATM screen so your card's base network rate applies.
                      </li>
                    </ul>
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>

        {/* ================= ON-THE-GO QUICK POCKET CONVERTER ================= */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-teal-600" />
              <h3 className="font-bold text-slate-900 text-sm">Quick Pocket Street Converter</h3>
            </div>
            <span className="text-xs text-slate-400">Instant Spot Rate</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
            {/* Input Amount */}
            <div className="sm:col-span-5">
              <label className="text-xs text-slate-500 font-semibold mb-1 block">You Enter</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  value={quickAmount}
                  onChange={(e) => setQuickAmount(parseFloat(e.target.value) || 0)}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 text-base focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <select
                  value={quickFrom}
                  onChange={(e) => setQuickFrom(e.target.value)}
                  className="w-24 px-2 py-2 bg-slate-100 border border-slate-300 rounded-xl font-bold text-slate-800 text-xs cursor-pointer"
                >
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="VND">VND (₫)</option>
                </select>
              </div>
            </div>

            {/* Swap */}
            <div className="sm:col-span-2 flex justify-center pt-4 sm:pt-0">
              <button
                type="button"
                onClick={() => {
                  const t = quickFrom;
                  setQuickFrom(quickTo);
                  setQuickTo(t);
                }}
                className="p-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-full transition cursor-pointer"
                title="Swap"
              >
                <ArrowRightLeft className="w-4 h-4 text-slate-600" />
              </button>
            </div>

            {/* Output Amount */}
            <div className="sm:col-span-5">
              <label className="text-xs text-slate-500 font-semibold mb-1 block">Instant Conversion</label>
              <div className="flex gap-2">
                <div className="flex-1 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl font-mono font-extrabold text-emerald-950 text-base flex items-center overflow-x-auto">
                  {formatNum(quickConverted, quickTo === 'VND' ? 0 : 2)}
                </div>
                <select
                  value={quickTo}
                  onChange={(e) => setQuickTo(e.target.value)}
                  className="w-24 px-2 py-2 bg-slate-100 border border-slate-300 rounded-xl font-bold text-slate-800 text-xs cursor-pointer"
                >
                  <option value="VND">VND (₫)</option>
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-4 mt-12 pt-6 border-t border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
        <div>
          <span className="font-semibold text-slate-700">My Travel Forex Calculator</span> — Self-contained & ready for Vercel deployment.
        </div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Real-time Interbank Benchmark Rates</span>
        </div>
      </footer>
    </div>
  );
}