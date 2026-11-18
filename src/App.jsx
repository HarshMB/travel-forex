import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeftRight, 
  RotateCw, 
  TrendingUp, 
  TrendingDown, 
  Calculator, 
  Banknote, 
  Coins, 
  Info, 
  Receipt, 
  Plus, 
  Trash2 
} from 'lucide-react';

// Default / fallback interbank reference exchange rates (relative to 1 USD)
const FALLBACK_RATES = {
  USD: 1.0,
  INR: 86.85,    // 1 USD ~ 86.85 INR
  VND: 25420.0,  // 1 USD ~ 25,420 VND
};

const CURRENCIES = [
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳' },
  { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
  { code: 'VND', name: 'Vietnamese Dong', symbol: '₫', flag: '🇻🇳' },
];

// Standard denominations per currency
const STANDARD_DENOMINATIONS = {
  USD: [100, 50, 20, 10, 5, 2, 1],
  INR: [500, 200, 100, 50, 20, 10],
  VND: [500000, 200000, 100000, 50000, 20000, 10000],
};

export default function App() {
  // Live rates state
  const [rates, setRates] = useState(FALLBACK_RATES);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isLoadingRates, setIsLoadingRates] = useState(false);
  const [rateError, setRateError] = useState(null);

  // Reference bar reverse toggle
  const [invertReference, setInvertReference] = useState(false);

  // Core Calculator Configuration
  const [actionType, setActionType] = useState('buy'); // 'buy' or 'sell'
  const [sourceCurrency, setSourceCurrency] = useState('INR');
  const [targetCurrency, setTargetCurrency] = useState('USD');
  const [rateMode, setRateMode] = useState('single'); // 'single' or 'tiered'

  // Single Rate Mode Inputs
  const [singleAmount, setSingleAmount] = useState(50000); // Amount in Source Currency if buying, or Target if selling
  const [singleRate, setSingleRate] = useState(87.50);     // Quoted exchange rate

  // Dynamic Tiered Note Batches
  // Each batch is an item: { id, denom, count, rate }
  const [noteBatches, setNoteBatches] = useState([
    { id: 1, denom: 100, count: 5, rate: 25650 },
    { id: 2, denom: 100, count: 2, rate: 25200 },
    { id: 3, denom: 50, count: 2, rate: 25550 },
    { id: 4, denom: 20, count: 5, rate: 24900 },
  ]);

  // Fees & Extra Charges
  const [serviceFee, setServiceFee] = useState(150);      // Flat service fee in source currency
  const [gstAmount, setGstAmount] = useState(90);         // Editable GST amount
  const [otherCharges, setOtherCharges] = useState(0);    // Any courier / doorstep fee

  // Quick street pocket converter state
  const [pocketAmount, setPocketAmount] = useState(500000);
  const [pocketFrom, setPocketFrom] = useState('VND');
  const [pocketTo, setPocketTo] = useState('INR');

  // Fetch real-time exchange rates
  const fetchLiveRates = async () => {
    setIsLoadingRates(true);
    setRateError(null);
    try {
      const response = await fetch('https://open.er-api.com/v6/latest/USD');
      const data = await response.json();
      if (data && data.rates) {
        setRates({
          USD: 1.0,
          INR: parseFloat(data.rates.INR) || FALLBACK_RATES.INR,
          VND: parseFloat(data.rates.VND) || FALLBACK_RATES.VND,
        });
        setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      } else {
        throw new Error('Invalid rate response');
      }
    } catch (err) {
      console.warn('Using fallback FX rates:', err?.message);
      setRates(FALLBACK_RATES);
      setRateError('Using estimated baseline rates.');
      setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } finally {
      setIsLoadingRates(false);
    }
  };

  useEffect(() => {
    fetchLiveRates();
  }, []);

  // Compute live fair benchmark rate for the current pair
  const liveInterbankRate = useMemo(() => {
    if (sourceCurrency === targetCurrency) return 1.0;
    const fromUSD = rates[sourceCurrency] || 1;
    const toUSD = rates[targetCurrency] || 1;
    // Units of target currency per 1 source currency
    return toUSD / fromUSD;
  }, [rates, sourceCurrency, targetCurrency]);

  // Ensure Source and Target are distinct
  const handleSourceChange = (newSource) => {
    if (newSource === targetCurrency) {
      setTargetCurrency(sourceCurrency);
    }
    setSourceCurrency(newSource);
  };

  const handleTargetChange = (newTarget) => {
    if (newTarget === sourceCurrency) {
      setSourceCurrency(targetCurrency);
    }
    setTargetCurrency(newTarget);
  };

  const handleSwapCurrencies = () => {
    const temp = sourceCurrency;
    setSourceCurrency(targetCurrency);
    setTargetCurrency(temp);
  };

  // Determine what currency the notes are physically in
  const notesCurrency = useMemo(() => {
    if (sourceCurrency === 'USD' || targetCurrency === 'USD') return 'USD';
    return sourceCurrency;
  }, [sourceCurrency, targetCurrency]);

  const notesSymbol = CURRENCIES.find(c => c.code === notesCurrency)?.symbol || '$';
  const sourceSymbol = CURRENCIES.find(c => c.code === sourceCurrency)?.symbol || '';
  const targetSymbol = CURRENCIES.find(c => c.code === targetCurrency)?.symbol || '';

  // Clear descriptive Rate column header: "Price of 1 [Notes Currency] in [Target/Other Currency]"
  const rateUnitLabel = useMemo(() => {
    if (notesCurrency === 'USD' && (targetCurrency === 'VND' || sourceCurrency === 'VND')) {
      return 'Price of 1 USD in VND';
    }
    if (notesCurrency === 'USD' && (targetCurrency === 'INR' || sourceCurrency === 'INR')) {
      return 'Price of 1 USD in INR';
    }
    if (notesCurrency === 'INR' && targetCurrency === 'USD') {
      return 'Price of 1 INR in USD';
    }
    if (notesCurrency === 'INR' && targetCurrency === 'VND') {
      return 'Price of 1 INR in VND';
    }
    if (notesCurrency === 'VND') {
      return `Price of 1 VND in ${targetCurrency}`;
    }
    return `Price of 1 ${notesCurrency} in ${targetCurrency}`;
  }, [notesCurrency, sourceCurrency, targetCurrency]);

  // Dynamic Batch Handlers
  const handleAddBatch = () => {
    const standardList = STANDARD_DENOMINATIONS[notesCurrency] || [100, 50, 20, 10];
    const defaultDenom = standardList[0] || 100;
    const defaultRate = noteBatches.length > 0 ? noteBatches[0].rate : 1;
    setNoteBatches([
      ...noteBatches,
      {
        id: Date.now(),
        denom: defaultDenom,
        count: 1,
        rate: defaultRate,
      }
    ]);
  };

  const handleRemoveBatch = (id) => {
    if (noteBatches.length <= 1) return;
    setNoteBatches(noteBatches.filter(b => b.id !== id));
  };

  const handleBatchChange = (id, field, value) => {
    setNoteBatches(noteBatches.map(b => {
      if (b.id === id) {
        return { ...b, [field]: value };
      }
      return b;
    }));
  };

  // Calculations for Tiered Notes
  const tieredTotals = useMemo(() => {
    let totalNotesCount = 0;
    let totalFaceValue = 0;
    let totalConvertedYield = 0;

    noteBatches.forEach(batch => {
      const count = Number(batch.count) || 0;
      const denom = Number(batch.denom) || 0;
      const rate = Number(batch.rate) || 0;
      const faceVal = count * denom;
      const yieldAmt = faceVal * rate;

      totalNotesCount += count;
      totalFaceValue += faceVal;
      totalConvertedYield += yieldAmt;
    });

    const weightedAvgRate = totalFaceValue > 0 ? totalConvertedYield / totalFaceValue : 0;

    return {
      totalNotesCount,
      totalFaceValue,
      totalConvertedYield,
      weightedAvgRate,
    };
  }, [noteBatches]);

  // Unified Conversion Computation
  const calculation = useMemo(() => {
    let baseSourcePaid = 0;
    let baseTargetReceived = 0;
    let effectiveRate = 0;

    if (rateMode === 'single') {
      const amt = Number(singleAmount) || 0;
      const rate = Number(singleRate) || 1;

      if (actionType === 'buy') {
        if (sourceCurrency === 'INR' && targetCurrency === 'USD') {
          baseSourcePaid = amt;
          baseTargetReceived = rate > 0 ? amt / rate : 0;
          effectiveRate = rate;
        } else if (sourceCurrency === 'USD' && targetCurrency === 'VND') {
          baseSourcePaid = amt;
          baseTargetReceived = amt * rate;
          effectiveRate = rate;
        } else {
          baseSourcePaid = amt;
          baseTargetReceived = amt * rate;
          effectiveRate = rate;
        }
      } else {
        // Sell / Buyback mode
        if (sourceCurrency === 'USD' && targetCurrency === 'INR') {
          baseSourcePaid = amt;
          baseTargetReceived = amt * rate;
          effectiveRate = rate;
        } else if (sourceCurrency === 'VND' && targetCurrency === 'USD') {
          baseSourcePaid = amt;
          baseTargetReceived = rate > 0 ? amt / rate : 0;
          effectiveRate = rate;
        } else {
          baseSourcePaid = amt;
          baseTargetReceived = amt * rate;
          effectiveRate = rate;
        }
      }
    } else {
      // Tiered Note Rates Mode
      if (actionType === 'buy') {
        if (sourceCurrency === 'INR' && targetCurrency === 'USD') {
          baseTargetReceived = tieredTotals.totalFaceValue;
          baseSourcePaid = tieredTotals.totalConvertedYield;
          effectiveRate = tieredTotals.weightedAvgRate;
        } else if (sourceCurrency === 'USD' && targetCurrency === 'VND') {
          baseSourcePaid = tieredTotals.totalFaceValue;
          baseTargetReceived = tieredTotals.totalConvertedYield;
          effectiveRate = tieredTotals.weightedAvgRate;
        } else {
          baseSourcePaid = tieredTotals.totalFaceValue;
          baseTargetReceived = tieredTotals.totalConvertedYield;
          effectiveRate = tieredTotals.weightedAvgRate;
        }
      } else {
        // Sell / Buyback
        baseSourcePaid = tieredTotals.totalFaceValue;
        baseTargetReceived = tieredTotals.totalConvertedYield;
        effectiveRate = tieredTotals.weightedAvgRate;
      }
    }

    // Auto GST calculation (Total Base Amount * 0.18%)
    const autoGstValue = parseFloat(((baseSourcePaid * 0.18) / 100).toFixed(2));

    // Net Out-of-pocket & Final Received in hand
    const feeTotal = (Number(serviceFee) || 0) + (Number(gstAmount) || 0) + (Number(otherCharges) || 0);

    let totalMoneyToPay = 0;
    let netInHand = 0;

    if (actionType === 'buy') {
      totalMoneyToPay = baseSourcePaid + feeTotal;
      netInHand = baseTargetReceived;
    } else {
      totalMoneyToPay = baseSourcePaid;
      netInHand = Math.max(0, baseTargetReceived - feeTotal);
    }

    // Pure Dealer Exchange Loss & Spread Analysis (WITHOUT GST and WITHOUT fees)
    let fairTargetPayout = 0;
    let fairSourceRequired = 0;

    if (sourceCurrency === 'INR' && targetCurrency === 'USD') {
      const fairRateUSDINR = rates.INR;
      fairTargetPayout = fairRateUSDINR > 0 ? baseSourcePaid / fairRateUSDINR : 0;
      fairSourceRequired = baseTargetReceived * fairRateUSDINR;
    } else if (sourceCurrency === 'USD' && targetCurrency === 'VND') {
      const fairRateUSDVND = rates.VND;
      fairTargetPayout = baseSourcePaid * fairRateUSDVND;
      fairSourceRequired = fairRateUSDVND > 0 ? baseTargetReceived / fairRateUSDVND : 0;
    } else {
      fairTargetPayout = baseSourcePaid * liveInterbankRate;
      fairSourceRequired = liveInterbankRate > 0 ? baseTargetReceived / liveInterbankRate : 0;
    }

    // Pure Conversion Loss calculation
    let pureSpreadLoss = 0;
    let pureSpreadPercent = 0;
    let isFavorable = false;

    if (actionType === 'buy') {
      const diff = baseSourcePaid - fairSourceRequired;
      if (diff > 0) {
        pureSpreadLoss = diff;
        pureSpreadPercent = fairSourceRequired > 0 ? (diff / fairSourceRequired) * 100 : 0;
      } else {
        isFavorable = true;
        pureSpreadLoss = Math.abs(diff);
        pureSpreadPercent = fairSourceRequired > 0 ? (Math.abs(diff) / fairSourceRequired) * 100 : 0;
      }
    } else {
      const diff = fairTargetPayout - baseTargetReceived;
      if (diff > 0) {
        pureSpreadLoss = diff;
        pureSpreadPercent = fairTargetPayout > 0 ? (diff / fairTargetPayout) * 100 : 0;
      } else {
        isFavorable = true;
        pureSpreadLoss = Math.abs(diff);
        pureSpreadPercent = fairTargetPayout > 0 ? (Math.abs(diff) / fairTargetPayout) * 100 : 0;
      }
    }

    return {
      baseSourcePaid,
      baseTargetReceived,
      effectiveRate,
      autoGstValue,
      feeTotal,
      totalMoneyToPay,
      netInHand,
      pureSpreadLoss,
      pureSpreadPercent,
      isFavorable,
      fairTargetPayout,
      fairSourceRequired,
    };
  }, [
    actionType,
    rateMode,
    singleAmount,
    singleRate,
    sourceCurrency,
    targetCurrency,
    tieredTotals,
    serviceFee,
    gstAmount,
    otherCharges,
    rates,
    liveInterbankRate
  ]);

  // Pocket Street Converter Quick Result
  const pocketResult = useMemo(() => {
    const amt = Number(pocketAmount) || 0;
    if (pocketFrom === pocketTo) return amt;
    const fromUSD = rates[pocketFrom] || 1;
    const toUSD = rates[pocketTo] || 1;
    return (amt / fromUSD) * toUSD;
  }, [pocketAmount, pocketFrom, pocketTo, rates]);

  // Quick Preset Handlers
  const handlePresetIndiaToUSD = () => {
    setActionType('buy');
    setSourceCurrency('INR');
    setTargetCurrency('USD');
    setRateMode('single');
    setSingleAmount(50000);
    setSingleRate(parseFloat((rates.INR * 1.012).toFixed(2)));
    setServiceFee(150);
    const estGst = parseFloat(((50000 * 0.18) / 100).toFixed(2));
    setGstAmount(estGst);
  };

  const handlePresetVietnamUSDToVND = () => {
    setActionType('buy');
    setSourceCurrency('USD');
    setTargetCurrency('VND');
    setRateMode('tiered');
    setServiceFee(0);
    setGstAmount(0);
    setOtherCharges(0);
    setNoteBatches([
      { id: 1, denom: 100, count: 5, rate: 25680 },
      { id: 2, denom: 50, count: 2, rate: 25550 },
      { id: 3, denom: 20, count: 4, rate: 24900 },
      { id: 4, denom: 10, count: 2, rate: 24800 },
    ]);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased selection:bg-emerald-500 selection:text-white pb-16">
      
      {/* ================= TOP HEADER ================= */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-sm shadow-emerald-500/20">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  My Travel Forex Calculator
                </h1>
                <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200/60 uppercase tracking-wider">
                  Accurate Travel Forex
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                INR, USD & VND Live Forex Calculator
              </p>
            </div>
          </div>

          {/* Quick Scenario Preset Chips & Refresh */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handlePresetIndiaToUSD}
              className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border border-slate-200"
            >
              Preset: INR➔USD
            </button>
            <button
              onClick={handlePresetVietnamUSDToVND}
              className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors border border-emerald-200"
            >
              Preset: Mixed USD Rates
            </button>
            <button
              onClick={fetchLiveRates}
              disabled={isLoadingRates}
              title="Refresh live interbank rates"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors border border-slate-200 flex items-center gap-1 text-xs"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isLoadingRates ? 'animate-spin text-emerald-600' : ''}`} />
              <span className="hidden md:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* ================= LIVE TICKER & REVERSE BAR ================= */}
        <div className="bg-slate-100/90 border-t border-slate-200/60 px-4 sm:px-6 py-2 text-xs">
          <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-slate-600">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-semibold text-slate-700">Market Reference:</span>
              <span className="text-slate-500">
                {lastUpdated ? `(${lastUpdated})` : 'Loading...'}
              </span>
              {rateError && (
                <span className="text-amber-600 font-medium">⚠️ {rateError}</span>
              )}
            </div>

            <div className="flex items-center gap-3 sm:gap-5 font-mono text-slate-700 flex-wrap">
              {!invertReference ? (
                <>
                  <div className="bg-white px-2.5 py-1 rounded-md border border-slate-200/80 shadow-2xs">
                    1 USD = <span className="font-bold text-emerald-700">₹{rates.INR.toFixed(2)}</span>
                  </div>
                  <div className="bg-white px-2.5 py-1 rounded-md border border-slate-200/80 shadow-2xs">
                    1 USD = <span className="font-bold text-emerald-700">{rates.VND.toLocaleString()} ₫</span>
                  </div>
                  <div className="bg-white px-2.5 py-1 rounded-md border border-slate-200/80 shadow-2xs">
                    1 INR = <span className="font-bold text-indigo-700">{(rates.VND / rates.INR).toFixed(1)} ₫</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-white px-2.5 py-1 rounded-md border border-slate-200/80 shadow-2xs">
                    ₹100 = <span className="font-bold text-emerald-700">${(100 / rates.INR).toFixed(2)}</span>
                  </div>
                  <div className="bg-white px-2.5 py-1 rounded-md border border-slate-200/80 shadow-2xs">
                    100k ₫ = <span className="font-bold text-emerald-700">${(100000 / rates.VND).toFixed(2)}</span>
                  </div>
                  <div className="bg-white px-2.5 py-1 rounded-md border border-slate-200/80 shadow-2xs">
                    100k ₫ = <span className="font-bold text-indigo-700">₹{((100000 / rates.VND) * rates.INR).toFixed(1)}</span>
                  </div>
                </>
              )}

              <button
                onClick={() => setInvertReference(!invertReference)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 transition-colors cursor-pointer"
              >
                <ArrowLeftRight className="w-3 h-3 text-emerald-600" />
                <span>Invert Rates</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ================= MAIN CONTAINER ================= */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 space-y-6">

        {/* ================= STEP 1: TRANSACTION CONFIGURATION CARD ================= */}
        <section className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs">
          
          {/* Action Selector: Buy vs Sell */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>Select Currency & Transaction Type</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure whether you are buying foreign cash or selling/buyback unused notes.
              </p>
            </div>

            {/* Buy / Sell Toggle Pill */}
            <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => setActionType('buy')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  actionType === 'buy'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Buy Currency</span>
              </button>
              <button
                type="button"
                onClick={() => setActionType('sell')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  actionType === 'sell'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TrendingDown className="w-3.5 h-3.5" />
                <span>Sell / Buyback</span>
              </button>
            </div>
          </div>

          {/* Currencies & Mode Setup */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mt-5">
            
            {/* Currency Selectors */}
            <div className="md:col-span-7 bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row items-center gap-3">
              
              {/* You Pay / Give */}
              <div className="w-full">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  {actionType === 'buy' ? 'You Pay With' : 'You Sell (Cash Notes)'}
                </label>
                <select
                  value={sourceCurrency}
                  onChange={(e) => handleSourceChange(e.target.value)}
                  className="w-full bg-white font-semibold text-slate-800 rounded-lg border border-slate-300 py-2.5 px-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden transition-all text-sm shadow-2xs"
                >
                  {CURRENCIES.map(curr => (
                    <option key={curr.code} value={curr.code}>
                      {curr.flag} {curr.code} — {curr.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Swap Button */}
              <button
                type="button"
                onClick={handleSwapCurrencies}
                title="Swap Currencies"
                className="mt-4 sm:mt-5 p-2.5 rounded-full bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-300 shadow-2xs transition-colors shrink-0 cursor-pointer"
              >
                <ArrowLeftRight className="w-4 h-4 text-emerald-600" />
              </button>

              {/* You Receive / Get */}
              <div className="w-full">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  {actionType === 'buy' ? 'You Receive (Target)' : 'You Receive (Cash Back)'}
                </label>
                <select
                  value={targetCurrency}
                  onChange={(e) => handleTargetChange(e.target.value)}
                  className="w-full bg-white font-semibold text-slate-800 rounded-lg border border-slate-300 py-2.5 px-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden transition-all text-sm shadow-2xs"
                >
                  {CURRENCIES.map(curr => (
                    <option key={curr.code} value={curr.code}>
                      {curr.flag} {curr.code} — {curr.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Rate Mode: Single Rate vs Different Rates for Notes */}
            <div className="md:col-span-5 bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 flex flex-col justify-between">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Exchange Rate Structure
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRateMode('single')}
                    className={`py-2 px-3 rounded-lg text-xs font-medium border text-center transition-all ${
                      rateMode === 'single'
                        ? 'bg-white border-emerald-500 text-emerald-800 font-bold shadow-2xs ring-1 ring-emerald-500'
                        : 'bg-white/60 border-slate-200 text-slate-600 hover:bg-white'
                    }`}
                  >
                    Uniform Rate (Flat)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRateMode('tiered')}
                    className={`py-2 px-3 rounded-lg text-xs font-medium border text-center transition-all ${
                      rateMode === 'tiered'
                        ? 'bg-white border-emerald-500 text-emerald-800 font-bold shadow-2xs ring-1 ring-emerald-500'
                        : 'bg-white/60 border-slate-200 text-slate-600 hover:bg-white'
                    }`}
                  >
                    Different Rates per Note
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                {rateMode === 'single'
                  ? 'Use when dealer gives one uniform quote for the entire amount.'
                  : 'Allows adding custom rows for crisp vs folded notes or small vs large bills.'}
              </p>
            </div>
          </div>

          {/* ================= MODE A: UNIFORM / SINGLE RATE INPUTS ================= */}
          {rateMode === 'single' && (
            <div className="mt-5 p-4 sm:p-5 rounded-xl bg-emerald-50/40 border border-emerald-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-900 mb-3 flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-emerald-700" />
                <span>Single Conversion Quote</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Amount ({sourceCurrency})
                  </label>
                  <div className="relative rounded-lg shadow-2xs">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-bold text-sm">
                      {sourceSymbol}
                    </span>
                    <input
                      type="number"
                      value={singleAmount}
                      onChange={(e) => setSingleAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full pl-8 pr-4 py-2.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden text-sm"
                      placeholder="e.g. 50000"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Total {sourceCurrency} tendered to exchange shop.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Quoted Exchange Rate
                  </label>
                  <div className="relative rounded-lg shadow-2xs">
                    <input
                      type="number"
                      step="0.0001"
                      value={singleRate}
                      onChange={(e) => setSingleRate(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden text-sm"
                      placeholder="e.g. 87.50 or 25400"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                    <span>Rate given by forex shop.</span>
                    <span className="text-slate-400">Interbank: ~{liveInterbankRate > 0 ? liveInterbankRate.toFixed(4) : '--'}</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ================= MODE B: TIERED / NOTE BREAKDOWN WITH CUSTOM ROWS ================= */}
          {rateMode === 'tiered' && (
            <div className="mt-5 p-4 sm:p-5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <Banknote className="w-4 h-4 text-emerald-600" />
                    <span>Denomination Note Breakdown ({notesCurrency} Notes)</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Add custom note batches. You can add the same denomination multiple times with different rates.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddBatch}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition-colors self-start sm:self-auto cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Note Batch</span>
                </button>
              </div>

              {/* Responsive Scrollable Table Container */}
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
                <table className="w-full text-left text-xs text-slate-700 border-collapse min-w-[560px]">
                  <thead className="bg-slate-100/90 text-slate-600 uppercase text-[11px] font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Denomination</th>
                      <th className="py-2.5 px-3 w-32">No. of Notes</th>
                      <th className="py-2.5 px-3">Total Value</th>
                      <th className="py-2.5 px-3">{rateUnitLabel}</th>
                      <th className="py-2.5 px-3">Total Amount</th>
                      <th className="py-2.5 px-2 text-center w-10">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {noteBatches.map((batch) => {
                      const count = Number(batch.count) || 0;
                      const denom = Number(batch.denom) || 0;
                      const rate = Number(batch.rate) || 0;
                      const faceVal = count * denom;
                      const yieldAmount = faceVal * rate;
                      const standardList = STANDARD_DENOMINATIONS[notesCurrency] || [];

                      return (
                        <tr key={batch.id} className="hover:bg-slate-50/80 transition-colors">
                          {/* Denomination Selector / Custom Value */}
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-400 font-bold">{notesSymbol}</span>
                              <select
                                value={batch.denom}
                                onChange={(e) => handleBatchChange(batch.id, 'denom', Number(e.target.value))}
                                className="bg-slate-50 border border-slate-300 rounded-md px-2 py-1 text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-emerald-500 outline-hidden"
                              >
                                {standardList.map(d => (
                                  <option key={d} value={d}>
                                    {d.toLocaleString()}
                                  </option>
                                ))}
                                {!standardList.includes(batch.denom) && (
                                  <option value={batch.denom}>{batch.denom.toLocaleString()} (Custom)</option>
                                )}
                              </select>
                            </div>
                          </td>

                          {/* Number of Notes with Stepper */}
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleBatchChange(batch.id, 'count', Math.max(0, count - 1))}
                                className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs select-none"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min="0"
                                value={batch.count}
                                onChange={(e) => handleBatchChange(batch.id, 'count', Math.max(0, parseInt(e.target.value) || 0))}
                                className="w-14 text-center py-1 rounded border border-slate-300 bg-white font-semibold text-slate-900 text-xs focus:ring-1 focus:ring-emerald-500 outline-hidden"
                              />
                              <button
                                type="button"
                                onClick={() => handleBatchChange(batch.id, 'count', count + 1)}
                                className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs select-none"
                              >
                                +
                              </button>
                            </div>
                          </td>

                          {/* Total Value in Notes Currency */}
                          <td className="py-2.5 px-3 font-mono font-medium text-slate-800">
                            {notesSymbol}{faceVal.toLocaleString()}
                          </td>

                          {/* Rate for this batch */}
                          <td className="py-2.5 px-3">
                            <input
                              type="number"
                              step="0.01"
                              value={batch.rate}
                              onChange={(e) => handleBatchChange(batch.id, 'rate', Math.max(0, parseFloat(e.target.value) || 0))}
                              className="w-28 px-2 py-1 rounded border border-slate-300 bg-white font-semibold text-slate-900 text-xs focus:ring-1 focus:ring-emerald-500 outline-hidden"
                              placeholder="Rate"
                            />
                          </td>

                          {/* Converted Amount */}
                          <td className="py-2.5 px-3 font-mono font-semibold text-emerald-700">
                            {targetSymbol}
                            {yieldAmount >= 1000 ? Math.round(yieldAmount).toLocaleString() : yieldAmount.toFixed(2)}
                          </td>

                          {/* Delete Row Action */}
                          <td className="py-2.5 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveBatch(batch.id)}
                              disabled={noteBatches.length <= 1}
                              title={noteBatches.length <= 1 ? "At least one row required" : "Remove this batch"}
                              className={`p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors ${
                                noteBatches.length <= 1 ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'
                              }`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>

                  {/* Foot Totals Row */}
                  <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900">
                    <tr>
                      <td className="py-2.5 px-3 text-slate-700 uppercase tracking-wider text-[11px]">
                        Total Summary:
                      </td>
                      <td className="py-2.5 px-3 text-slate-800">
                        {tieredTotals.totalNotesCount} notes
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-900">
                        {notesSymbol}{tieredTotals.totalFaceValue.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 text-[11px] font-mono">
                        Avg: {tieredTotals.weightedAvgRate.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-emerald-800 text-sm">
                        {targetSymbol}
                        {tieredTotals.totalConvertedYield >= 1000
                          ? Math.round(tieredTotals.totalConvertedYield).toLocaleString()
                          : tieredTotals.totalConvertedYield.toFixed(2)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* ================= TAXES & SERVICE FEES (ALL MODES) ================= */}
          <div className="mt-5 pt-4 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-emerald-600" />
                <span>Service Fee, GST & Extra Charges</span>
              </span>
              <span className="text-[11px] text-slate-400 font-normal">
                Amounts in {sourceCurrency}
              </span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              
              {/* Flat Service Fee */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Service / Handling Fee
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400 text-xs font-bold">
                    {sourceSymbol}
                  </span>
                  <input
                    type="number"
                    value={serviceFee}
                    onChange={(e) => setServiceFee(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full pl-6 pr-3 py-1.5 text-xs font-semibold rounded border border-slate-300 bg-white focus:ring-1 focus:ring-emerald-500 outline-hidden"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Editable GST with 0.18% auto button */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-slate-600">
                    GST (Editable)
                  </label>
                  <button
                    type="button"
                    onClick={() => setGstAmount(calculation.autoGstValue)}
                    className="text-[10px] text-emerald-700 font-semibold hover:underline bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 cursor-pointer"
                    title="Click to calculate Base Amount × 0.18%"
                  >
                    Auto (0.18%)
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400 text-xs font-bold">
                    {sourceSymbol}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={gstAmount}
                    onChange={(e) => setGstAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full pl-6 pr-3 py-1.5 text-xs font-semibold rounded border border-slate-300 bg-white focus:ring-1 focus:ring-emerald-500 outline-hidden"
                    placeholder="0"
                  />
                </div>
                <div className="text-[10px] text-slate-500 mt-1 flex justify-between">
                  <span>Base × 0.18%:</span>
                  <span className="font-mono font-medium text-slate-700">
                    {sourceSymbol}{calculation.autoGstValue.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Other Charges */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Other / Doorstep Charges
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400 text-xs font-bold">
                    {sourceSymbol}
                  </span>
                  <input
                    type="number"
                    value={otherCharges}
                    onChange={(e) => setOtherCharges(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full pl-6 pr-3 py-1.5 text-xs font-semibold rounded border border-slate-300 bg-white focus:ring-1 focus:ring-emerald-500 outline-hidden"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================= SUMMARY & ANALYSIS (STACKED VERTICALLY: FULL WIDTH) ================= */}
        <div className="space-y-6">
          
          {/* 1. Main Financial Summary (Full Width First) */}
          <div className="w-full space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-emerald-600" />
                  <span>Exchange Summary</span>
                </h2>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 uppercase">
                  {actionType === 'buy' ? 'Forex Purchase' : 'Currency Buyback'}
                </span>
              </div>

              {/* Detailed Cost Breakdown First */}
              <div className="space-y-2.5 text-xs sm:text-sm">
                
                {/* Base Conversion */}
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <div className="text-slate-600">
                    <span className="font-semibold text-slate-800">Base Exchange Conversion:</span>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      Converts: {sourceSymbol}{calculation.baseSourcePaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {sourceCurrency} ➔ {targetSymbol}{calculation.baseTargetReceived >= 1000 ? Math.round(calculation.baseTargetReceived).toLocaleString() : calculation.baseTargetReceived.toFixed(2)} {targetCurrency}
                    </div>
                  </div>
                  <span className="font-mono font-bold text-slate-900 text-sm sm:text-base">
                    {sourceSymbol}{calculation.baseSourcePaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {sourceCurrency}
                  </span>
                </div>

                {/* Service Fee */}
                <div className="flex items-center justify-between py-1 text-slate-600">
                  <span>Service & Handling Fee:</span>
                  <span className="font-mono font-medium text-slate-800">
                    + {sourceSymbol}{(Number(serviceFee) || 0).toFixed(2)} {sourceCurrency}
                  </span>
                </div>

                {/* GST */}
                <div className="flex items-center justify-between py-1 text-slate-600">
                  <span className="flex items-center gap-1">
                    <span>GST (Editable):</span>
                    <span className="text-[10px] text-slate-400">(Auto 0.18%)</span>
                  </span>
                  <span className="font-mono font-medium text-slate-800">
                    + {sourceSymbol}{(Number(gstAmount) || 0).toFixed(2)} {sourceCurrency}
                  </span>
                </div>

                {/* Other Charges */}
                {Number(otherCharges) > 0 && (
                  <div className="flex items-center justify-between py-1 text-slate-600">
                    <span>Other / Delivery Charges:</span>
                    <span className="font-mono font-medium text-slate-800">
                      + {sourceSymbol}{(Number(otherCharges) || 0).toFixed(2)} {sourceCurrency}
                    </span>
                  </div>
                )}

                {/* Total Out-of-Pocket / Net Line */}
                <div className="flex items-center justify-between pt-2.5 border-t border-slate-200 text-slate-900 font-bold">
                  <span>
                    {actionType === 'buy' ? 'Final Net Out-of-Pocket:' : 'Final Net Payout Received:'}
                  </span>
                  <span className="font-mono text-emerald-800 text-base sm:text-lg">
                    {sourceSymbol}
                    {actionType === 'buy'
                      ? calculation.totalMoneyToPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                      : calculation.netInHand.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Total Money To Pay & Money In Hand Cards (Positioned Directly Below Out-of-Pocket) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-5 border-t border-slate-100">
                {/* Total Money to Pay */}
                <div className="bg-slate-900 text-white rounded-xl p-4 flex flex-col justify-between shadow-xs">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      {actionType === 'buy' ? 'Total Money To Pay' : 'Total Cash Handed Over'}
                    </span>
                    <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-white mt-1 block">
                      {sourceSymbol}
                      {calculation.totalMoneyToPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-2 block">
                    {actionType === 'buy'
                      ? `Base Conversion + GST + Fees in ${sourceCurrency}`
                      : `Total Face Value in ${sourceCurrency}`}
                  </span>
                </div>

                {/* Total Money in Your Hand */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col justify-between shadow-xs">
                  <div>
                    <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">
                      {actionType === 'buy' ? 'Total Money In Your Hand' : 'Net Cash You Receive in Hand'}
                    </span>
                    <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-emerald-900 mt-1 block">
                      {targetSymbol}
                      {calculation.netInHand >= 1000
                        ? Math.round(calculation.netInHand).toLocaleString()
                        : calculation.netInHand.toFixed(2)}
                    </span>
                  </div>
                  <span className="text-[11px] text-emerald-700 mt-2 block">
                    {actionType === 'buy'
                      ? `Foreign Cash Received in ${targetCurrency}`
                      : `Final Net Cash Payout after deductions`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. DEALER MARKUP & LOSS ANALYSIS (Full Width Directly Below) */}
          <div className="w-full space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-amber-600" />
                  <h3 className="text-base font-bold text-slate-900">
                    Dealer Markup & Loss Analysis
                  </h3>
                </div>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200/60">
                  Pure Spread Only
                </span>
              </div>

              {/* Pure Spread Loss Card */}
              <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/70">
                <div className="text-xs font-semibold text-amber-900 mb-1 flex items-center justify-between">
                  <span>{actionType === 'buy' ? 'Pure Conversion Spread Loss' : 'Payout Shortfall / Loss'}</span>
                  <span className="font-mono font-bold">
                    {calculation.isFavorable
                      ? '(Better than Interbank)'
                      : `(-${calculation.pureSpreadPercent.toFixed(2)}%)`}
                  </span>
                </div>
                
                <div className="text-2xl font-black font-mono text-amber-950 my-1">
                  {calculation.isFavorable ? (
                    <span className="text-emerald-700">+ Favorable Exchange Rate</span>
                  ) : (
                    <span>
                      - {actionType === 'buy' ? sourceSymbol : targetSymbol}
                      {calculation.pureSpreadLoss >= 1000
                        ? Math.round(calculation.pureSpreadLoss).toLocaleString()
                        : calculation.pureSpreadLoss.toFixed(2)}
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-amber-800/80 leading-relaxed">
                  Based purely on the quoted exchange rate vs the live interbank reference (
                  {liveInterbankRate > 0 ? liveInterbankRate.toFixed(2) : '--'}
                  ). This measures pure conversion friction <strong>without GST or service charges</strong>.
                </p>
              </div>

              {/* Spread comparison table */}
              <div className="text-xs space-y-2 pt-1 font-mono">
                <div className="flex justify-between text-slate-600">
                  <span>Interbank Fair Cost (Pure Rate):</span>
                  <span className="font-semibold text-slate-800">
                    {actionType === 'buy'
                      ? `${sourceSymbol}${calculation.fairSourceRequired.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${sourceCurrency}`
                      : `${targetSymbol}${calculation.fairTargetPayout >= 1000 ? Math.round(calculation.fairTargetPayout).toLocaleString() : calculation.fairTargetPayout.toFixed(2)} ${targetCurrency}`}
                  </span>
                </div>

                <div className="flex justify-between text-slate-600">
                  <span>Dealer Spread Margin:</span>
                  <span className={`font-semibold ${calculation.isFavorable ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {calculation.isFavorable ? '+' : '-'}
                    {calculation.pureSpreadPercent.toFixed(2)}% {calculation.isFavorable ? 'favorable' : 'deficit'}
                  </span>
                </div>
              </div>

              {/* Vietnam Travel Tips & Cost Breakdown Comparison Table */}
              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 text-xs text-slate-600 space-y-3">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                    <Info className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>💡 Travel Note Advice</span>
                  </div>

                  {/* Cost Breakdown by Exchange Method Table */}
                  <div>
                    <h4 className="font-bold text-slate-800 mb-2">Cost Breakdown by Exchange Method</h4>
                    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                      <table className="w-full text-left text-[11px] border-collapse min-w-[500px]">
                        <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                          <tr>
                            <th className="py-2 px-2.5">Exchange Venue</th>
                            <th className="py-2 px-2.5">Direct Fees / Commission</th>
                            <th className="py-2 px-2.5">Exchange Rate Spread (Loss vs Market)</th>
                            <th className="py-2 px-2.5">Best Use Case</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          <tr>
                            <td className="py-2 px-2.5 font-semibold text-slate-900">
                              Licensed Gold / Jewelry Shops <span className="text-[10px] text-slate-400 font-normal block">(e.g., Ha Trung in Hanoi, Ben Thanh / Ha Tam in HCMC)</span>
                            </td>
                            <td className="py-2 px-2.5 text-emerald-700 font-medium">0% (No fees)</td>
                            <td className="py-2 px-2.5 text-emerald-700 font-semibold">0.2% – 1% <span className="text-[10px] text-slate-400 font-normal block">(Closest to official market rate)</span></td>
                            <td className="py-2 px-2.5 text-slate-600">Best overall value for exchanging USD cash.</td>
                          </tr>
                          <tr>
                            <td className="py-2 px-2.5 font-semibold text-slate-900">
                              Local Banks <span className="text-[10px] text-slate-400 font-normal block">(Vietcombank, BIDV, Techcombank)</span>
                            </td>
                            <td className="py-2 px-2.5 text-slate-700">0% – 1% <span className="text-[10px] text-slate-400 font-normal block">(usually built into the buy rate)</span></td>
                            <td className="py-2 px-2.5 text-amber-700 font-medium">1% – 2.5%</td>
                            <td className="py-2 px-2.5 text-slate-600">Safe, official receipt provided; requires passport.</td>
                          </tr>
                          <tr>
                            <td className="py-2 px-2.5 font-semibold text-slate-900">Airport Exchange Booths</td>
                            <td className="py-2 px-2.5 text-slate-700">Usually 0% declared fee</td>
                            <td className="py-2 px-2.5 text-rose-700 font-semibold">3% – 6% <span className="text-[10px] text-slate-400 font-normal block">(Poor rates)</span></td>
                            <td className="py-2 px-2.5 text-slate-600">Only exchange $20–$50 for immediate transport.</td>
                          </tr>
                          <tr>
                            <td className="py-2 px-2.5 font-semibold text-slate-900">Hotels & Tour Desks</td>
                            <td className="py-2 px-2.5 text-slate-700">Usually 0% declared fee</td>
                            <td className="py-2 px-2.5 text-rose-800 font-semibold">4% – 7% <span className="text-[10px] text-slate-400 font-normal block">(Worst rates)</span></td>
                            <td className="py-2 px-2.5 text-slate-600">Emergency convenience only.</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Hidden Penalties to Watch Out For */}
                  <div className="pt-2 border-t border-slate-200/60 space-y-2">
                    <h4 className="font-bold text-slate-800">Hidden "Penalties" to Watch Out For</h4>
                    <p className="text-[11px] text-slate-600">
                      While you won't see a surcharge line item on a bill, currency changers in Vietnam strictly adjust rates based on banknote quality:
                    </p>
                    <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-600">
                      <li>
                        <strong>Denomination Penalty:</strong> $100 and $50 notes fetch the highest exchange rates. $1, $5, $10, and $20 notes often receive a 1% to 3% lower exchange rate because they are costlier for local vendors to handle.
                      </li>
                      <li>
                        <strong>Condition / Tear Penalty:</strong> Bills must be crisp and clean. Any ink marks, stamps, tears, folds, or old series notes (especially pre-2013 $100 bills) will either be rejected outright or penalized with a 2%–5% cut.
                      </li>
                    </ul>
                  </div>

                  {/* Alternative: Using ATMs in Vietnam */}
                  <div className="pt-2 border-t border-slate-200/60 space-y-1.5">
                    <h4 className="font-bold text-slate-800">Alternative: Using ATMs in Vietnam</h4>
                    <p className="text-[11px] text-slate-600">
                      If you withdraw VND directly from an ATM using an international debit/forex card:
                    </p>
                    <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-600">
                      <li>
                        <strong>Local ATM Operator Fee:</strong> 20,000 to 55,000 VND (~$0.80 – $2.20 USD) per transaction (some banks like VPBank or TPBank may charge zero).
                      </li>
                      <li>
                        <strong>Dynamic Currency Conversion (DCC):</strong> Always select <em>"Decline Conversion"</em> / <em>"Charge in VND"</em> at the ATM screen so your card's base network rate applies.
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ================= STEP 3: QUICK POCKET CONVERTER ================= */}
        <section className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Coins className="w-5 h-5 text-emerald-600" />
                <span>Quick Pocket Converter</span>
              </h2>
              <p className="text-xs text-slate-500">
                Instant street calculator using current live market rates for day-to-day shopping.
              </p>
            </div>

            {/* Quick Amount Chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {[50000, 100000, 200000, 500000, 1000000].map(val => (
                <button
                  key={val}
                  onClick={() => {
                    setPocketAmount(val);
                    setPocketFrom('VND');
                    setPocketTo('INR');
                  }}
                  className="px-2 py-1 text-[11px] font-mono font-medium rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border border-slate-200"
                >
                  {(val / 1000).toFixed(0)}k ₫
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            
            {/* Input From */}
            <div className="md:col-span-5 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-semibold text-slate-600 uppercase">You Have</span>
                <select
                  value={pocketFrom}
                  onChange={(e) => setPocketFrom(e.target.value)}
                  className="bg-white border border-slate-300 rounded px-2 py-0.5 text-xs font-bold text-slate-800"
                >
                  {CURRENCIES.map(c => (
                    <option key={c.code} value={c.code}>{c.code}</option>
                  ))}
                </select>
              </div>
              <input
                type="number"
                value={pocketAmount}
                onChange={(e) => setPocketAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full text-xl font-bold font-mono text-slate-900 bg-transparent outline-hidden"
                placeholder="0"
              />
            </div>

            {/* Swap Button */}
            <div className="md:col-span-2 flex justify-center">
              <button
                type="button"
                onClick={() => {
                  const t = pocketFrom;
                  setPocketFrom(pocketTo);
                  setPocketTo(t);
                }}
                className="p-3 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-colors cursor-pointer"
                title="Swap pocket converter currencies"
              >
                <ArrowLeftRight className="w-4 h-4 text-emerald-600" />
              </button>
            </div>

            {/* Output To */}
            <div className="md:col-span-5 bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200/80">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-semibold text-emerald-800 uppercase">Equals Approx</span>
                <select
                  value={pocketTo}
                  onChange={(e) => setPocketTo(e.target.value)}
                  className="bg-white border border-emerald-300 rounded px-2 py-0.5 text-xs font-bold text-emerald-800"
                >
                  {CURRENCIES.map(c => (
                    <option key={c.code} value={c.code}>{c.code}</option>
                  ))}
                </select>
              </div>
              <div className="text-xl font-bold font-mono text-emerald-950 truncate">
                {CURRENCIES.find(c => c.code === pocketTo)?.symbol}
                {pocketResult >= 1000 ? Math.round(pocketResult).toLocaleString() : pocketResult.toFixed(2)}
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* ================= FOOTER ================= */}
      <footer className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 text-center text-xs text-slate-400">
        <p>My Travel Forex Calculator • Personal Travel Utility for India & Vietnam</p>
        <p className="mt-1 text-[11px] text-slate-400">
          Rates refresh from live interbank data. Verify local shop licenses and physical banknote authenticity before completing currency transactions.
        </p>
      </footer>
    </div>
  );
}