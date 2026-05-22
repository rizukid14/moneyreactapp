import OpenAI from "openai";

let openai: OpenAI | null = null;

const getOpenAI = () => {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || 'mock-key',
    });
  }
  return openai;
};

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { 
      messages, categories, assets, transactions, contacts, 
      recurringTransactions, subscriptions, budgetMode, monthlyIncome, zbbMode,
      startOfMonthDay, currentDate, currentTime, budgets, goals
    } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ message: 'Valid messages array is required' });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ message: 'OPENAI_API_KEY is not configured on the server.' });
    }

    // 1. Analyze the last 3 user messages to detect the conversation topic context
    const userMessages = messages
      .filter((m: any) => m.role === 'user')
      .slice(-3)
      .map((m: any) => m.content)
      .join(" ");
    const userMessagesContext = userMessages.toLowerCase();

    // Parse financial month range and startOfMonthDay preference
    let startStr = "";
    let endStr = "";
    let daysToEOM = -1;
    let financialMonthEndString = "";
    let isNearEndOfMonth = false;

    if (currentDate) {
      const parts = currentDate.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]); // 1-indexed
        const day = parseInt(parts[2]);

        const startDay = startOfMonthDay || 1;
        let startYear = year;
        let startMonth = month;
        let endYear = year;
        let endMonth = month;
        let endDay = startDay - 1;

        if (startDay === 1) {
          const lastDayOfCalMonth = new Date(year, month, 0).getDate();
          endDay = lastDayOfCalMonth;
          startStr = `${year}-${String(month).padStart(2, '0')}-01`;
          endStr = `${year}-${String(month).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;
        } else {
          if (day >= startDay) {
            endMonth = month + 1;
            if (endMonth > 12) {
              endMonth = 1;
              endYear = year + 1;
            }
          } else {
            startMonth = month - 1;
            if (startMonth < 1) {
              startMonth = 12;
              startYear = year - 1;
            }
          }
          const lastDayOfEndMonth = new Date(endYear, endMonth, 0).getDate();
          const actualEndDay = Math.min(startDay - 1, lastDayOfEndMonth);
          
          startStr = `${startYear}-${String(startMonth).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`;
          endStr = `${endYear}-${String(endMonth).padStart(2, '0')}-${String(actualEndDay).padStart(2, '0')}`;
        }

        const eomDate = new Date(endYear, endMonth - 1, endDay);
        const todayDate = new Date(year, month - 1, day);
        const diffTime = eomDate.getTime() - todayDate.getTime();
        daysToEOM = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        financialMonthEndString = endStr;
        
        // Trigger EOM near status if we are within 5 days of the financial month end
        if (daysToEOM >= 0 && daysToEOM <= 5) {
          isNearEndOfMonth = true;
        }
      }
    }

    // Pre-calculate financial month metrics for high-fidelity insights
    let effectiveStartStr = startStr;
    let effectiveEndStr = endStr;

    let currentPeriodTxs = transactions?.filter((t: any) => {
      if (!t.date) return false;
      return t.date >= startStr && t.date <= endStr;
    }) || [];

    // FALLBACK: If the computed period yields no transactions but we have transactions,
    // detect the most recent financial month from the actual transaction dates.
    // This prevents showing Rp 0 / Rp 0 when data exists but belongs to a past period.
    if (currentPeriodTxs.length === 0 && transactions?.length > 0 && startStr) {
      const allDates = (transactions as any[])
        .filter((t: any) => t.date)
        .map((t: any) => t.date as string)
        .sort();
      const latestDate = allDates[allDates.length - 1]; // most recent tx date

      if (latestDate) {
        // Derive the financial period that contains latestDate
        const lParts = latestDate.split('-');
        const lYear = parseInt(lParts[0]);
        const lMonth = parseInt(lParts[1]);
        const lDay = parseInt(lParts[2]);
        const startDay = startOfMonthDay || 1;

        let fbStartYear = lYear;
        let fbStartMonth = lMonth;
        let fbEndYear = lYear;
        let fbEndMonth = lMonth;

        if (startDay === 1) {
          const lastDayOfCal = new Date(lYear, lMonth, 0).getDate();
          effectiveStartStr = `${lYear}-${String(lMonth).padStart(2, '0')}-01`;
          effectiveEndStr = `${lYear}-${String(lMonth).padStart(2, '0')}-${String(lastDayOfCal).padStart(2, '0')}`;
        } else {
          if (lDay >= startDay) {
            fbEndMonth = lMonth + 1;
            if (fbEndMonth > 12) { fbEndMonth = 1; fbEndYear = lYear + 1; }
          } else {
            fbStartMonth = lMonth - 1;
            if (fbStartMonth < 1) { fbStartMonth = 12; fbStartYear = lYear - 1; }
            fbEndMonth = lMonth;
            fbEndYear = lYear;
          }
          const lastDayOfEndMonth = new Date(fbEndYear, fbEndMonth, 0).getDate();
          const actualEndDay = Math.min(startDay - 1, lastDayOfEndMonth);
          effectiveStartStr = `${fbStartYear}-${String(fbStartMonth).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`;
          effectiveEndStr = `${fbEndYear}-${String(fbEndMonth).padStart(2, '0')}-${String(actualEndDay).padStart(2, '0')}`;
        }

        currentPeriodTxs = (transactions as any[]).filter((t: any) => {
          if (!t.date) return false;
          return t.date >= effectiveStartStr && t.date <= effectiveEndStr;
        });
      }
    }

    const periodIncome = currentPeriodTxs
      .filter((t: any) => t.type === 'pendapatan')
      .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);

    const periodExpenses = currentPeriodTxs
      .filter((t: any) => t.type === 'pengeluaran')
      .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);

    const periodSavings = periodIncome - periodExpenses;
    const savingsRate = periodIncome > 0 ? Math.round((periodSavings / periodIncome) * 100) : 0;

    const categoryBreakdown = (categories || []).map((cat: any) => {
      const catBudgets = (budgets || []).filter((b: any) => b.categoryId === cat.id);
      let limit = 0;
      if (catBudgets.length > 0) {
        const endParts = effectiveEndStr.split('-');
        const endMonthVal = endParts.length === 3 ? parseInt(endParts[1]) : 0;
        const endYearVal = endParts.length === 3 ? parseInt(endParts[0]) : 0;
        const currentBudget = catBudgets.find((b: any) => b.month === endMonthVal && b.year === endYearVal);
        if (currentBudget) {
          limit = currentBudget.limit || 0;
        } else {
          limit = catBudgets[catBudgets.length - 1].limit || 0;
        }
      }
      const totalSpent = currentPeriodTxs
        .filter((t: any) => t.category === cat.name && t.type === 'pengeluaran')
        .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
      const remaining = limit - totalSpent;
      const pctConsumed = limit > 0 ? Math.round((totalSpent / limit) * 100) : 0;
      return {
        name: cat.name,
        type: cat.type,
        limit,
        totalSpent,
        remaining,
        pctConsumed
      };
    });

    // Note if we used a fallback period instead of the current one
    const usedFallbackPeriod = effectiveStartStr !== startStr || effectiveEndStr !== endStr;
    const periodNote = usedFallbackPeriod
      ? `\n⚠️ NOTE: No transactions found in current period (${startStr} to ${endStr}). Showing metrics for the most recent period found in data instead.`
      : '';

    let financialMetricsSummary = `
=== PRE-COMPUTED PERIOD FINANCIAL METRICS (${effectiveStartStr || "N/A"} to ${effectiveEndStr || "N/A"}) ===${periodNote}
- Total Income: Rp ${periodIncome.toLocaleString('id-ID')}
- Total Expenses: Rp ${periodExpenses.toLocaleString('id-ID')}
- Net Savings: Rp ${periodSavings.toLocaleString('id-ID')} (Savings Rate: ${savingsRate}%)
`;

    if (categoryBreakdown.length > 0) {
      financialMetricsSummary += `
=== CATEGORY SPENDING BREAKDOWN ===
${categoryBreakdown.map((c: any) => {
  if (c.type === 'pengeluaran') {
    return `- ${c.name}: Spent Rp ${c.totalSpent.toLocaleString('id-ID')} of limit Rp ${c.limit.toLocaleString('id-ID')} (${c.pctConsumed}% consumed, Remaining: Rp ${c.remaining.toLocaleString('id-ID')})`;
  } else {
    return `- ${c.name} (Pemasukan): Received Rp ${c.totalSpent.toLocaleString('id-ID')}`;
  }
}).join('\n')}
`;
    }

    if (goals && goals.length > 0) {
      financialMetricsSummary += `
=== SAVINGS GOALS ===
${goals.map((g: any) => `- Goal "${g.name}": Target Rp ${g.targetAmount.toLocaleString('id-ID')} by ${g.targetDate} (Status: ${g.isCompleted ? 'Completed' : 'Active'})`).join('\n')}
`;
    }

    // 2. Classifiers
    const isDebtRelated = /hutang|piutang|pinjam|budi|bayar|tagih|kontak|teman|debt|receivable|contact|lunas/i.test(userMessagesContext);
    const isTripRelated = /trip|liburan|travel|jalan|pantai|settle|patungan|kelompok|payer/i.test(userMessagesContext);
    const isBudgetRelated = /budget|anggaran|zbb|amplop|envelope|strict|limit|income|gaji|pemasukan/i.test(userMessagesContext);
    const isSubscriptionRelated = /subs|subscription|langganan|netflix|spotify|youtube|tagihan|rutin/i.test(userMessagesContext);
    const isAssetRelated = /asset|rekening|gacha|tier|sultan|emas|bronze|saldo|kekayaan|dompet|bca|gopay|ovo|dana|mandiri|cash/i.test(userMessagesContext);
    const isStatsRelated = /statistik|grafik|donat|pie|growth|forecast|proyeksi|cash flow|health|sehat/i.test(userMessagesContext);
    const isOcrRelated = /scan|struk|ocr|split|bagi|tagihan|foto/i.test(userMessagesContext);
    const isSettingsRelated = /setting|pengaturan|preferensi|backup|restore|pin|keamanan|mata uang|currency|password|profil|avatar/i.test(userMessagesContext);
    const isHistoryRelated = /transaksi|riwayat|catatan|pengeluaran|pendapatan|belanja|total|history|daftar/i.test(userMessagesContext);
    const isDateRelated = /januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember|january|february|march|may|june|july|august|october|december|lalu|kemarin|minggu|bulan|tahun|\b(19|20)\d{2}\b/i.test(userMessagesContext);
    const isEndOfMonthRelated = /akhir bulan|tutup buku|evaluasi bulanan|rekap bulanan|end of month|eom|nasihat akhir|saran akhir/i.test(userMessagesContext);

    // 3. Dynamic Context Downscaling & Smart Date Override
    const maxTxs = (isStatsRelated || isHistoryRelated || isDateRelated || isEndOfMonthRelated || isNearEndOfMonth) ? 100 : 15;
    const slicedTxs = (isEndOfMonthRelated || isNearEndOfMonth)
      ? (transactions || [])
          .filter((t: any) => t.date >= effectiveStartStr && t.date <= effectiveEndStr)
          .slice(0, maxTxs)
      : (transactions || []).slice(0, maxTxs);
    
    const categoryList = categories?.length > 0 
      ? categories.map((c: any) => {
          const subs = c.subcategories?.length > 0 
            ? c.subcategories.map((s: any) => s.name).join(', ') 
            : 'none';
          return `${c.name} (${c.type}) [sub: ${subs}]`;
        }).join('; ') 
      : "None";
    
    const assetList = assets?.length > 0 
      ? assets.map((a: any) => `- ID: "${a.id}", Name: "${a.name}", Type: "${a.type}", Balance: ${a.balance}`).join('\n') 
      : "None";

    const contactList = (isDebtRelated || isTripRelated || isSettingsRelated)
      ? (contacts?.length > 0 ? contacts.map((c: any) => `- Name: "${c.name}"`).join('\n') : "No existing contacts.")
      : `Omitted to save tokens. Total registered contacts: ${contacts?.length || 0}. (Ask about debts or contacts to view)`;

    const transactionSummary = slicedTxs.length > 0
      ? slicedTxs.map((t: any) => `${t.date}: ${t.type} ${t.amount} [${t.category}] ${t.note}`).join('\n')
      : "No recent transactions found.";
    
    const recurringSummary = (isSubscriptionRelated || isBudgetRelated || isStatsRelated)
      ? (recurringTransactions?.length > 0
          ? recurringTransactions.map((rt: any) => `- ${rt.type} ${rt.amount} [${rt.category}] ${rt.frequency} starts ${rt.startDate} (${rt.note})`).join('\n')
          : "None")
      : `Omitted to save tokens. Total active recurring: ${recurringTransactions?.filter((rt: any) => rt.isActive).length || 0}`;

    const subscriptionSummary = (isSubscriptionRelated || isBudgetRelated || isStatsRelated)
      ? (subscriptions?.length > 0
          ? subscriptions.map((s: any) => `- ${s.name}: ${s.amount}/${s.billingCycle} next: ${s.nextBillingDate}`).join('\n')
          : "None")
      : `Omitted to save tokens. Total subscriptions active: ${subscriptions?.filter((s: any) => s.isActive).length || 0}`;

    // 4. Modular Prompt Injection
    let modularRules = "";

    if (isBudgetRelated) {
      modularRules += `
=== ZERO-BASED BUDGETING (ZBB) & BUDGET RULES ===
- MoneyApp supports Regular Budget Mode and Zero-Based Budgeting (ZBB).
- ZBB Envelope System: In ZBB mode, every rupiah of income MUST be allocated to amplop (category limits) until remaining unassigned income is exactly 0. Income is locked for the month during ZBB allocation.
- ZBB Strict Mode: If Strict ZBB is active, any transaction (manual, scan struk OCR, bank mutasi) that exceeds the remaining budget limit of its category is BLOCKED/INTERCEPTED by the system. The app forces the user to perform an envelope reallocation (move money between categories) in a modal before saving.
- AI Advice: When talking about budgets or overbudgeting in ZBB, suggest reallocating money from an envelope with surplus budget to the deficient envelope.
`;
    }

    if (isDebtRelated) {
      modularRules += `
=== DEBTS & LOANS (HUTANG/PIUTANG) RULES ===
- Hutang = I owe others (liability). Piutang = Others owe me (asset).
- Paying/Settling: Users can make partial payments or fully settle a debt. Paying a debt will update balances.
- Offset (Potong Silang): If a user has both outstanding debt (hutang) and receivables (piutang) with the same contact, they can use the "Offset" banner at the top of the Debts page to auto-settle and subtract the overlapping balances.
- Auto-Merging: Debts to the same contact are automatically merged into a single balance if not yet settled.
- Professional Tip: Leaving "Aset" empty when creating a debt records payments as direct Pengeluaran. Choosing an asset maps payments as a Transfer from that asset.
- Tool Usage: Always use 'create_debt' for debt/receivable creations.
`;
    }

    if (isTripRelated) {
      modularRules += `
=== HOLIDAY TRIP (GROUP EXPENSES) RULES ===
- Holiday Trip is a premium group travel manager.
- Integrations: Trip expenses directly deduct the selected real asset account balance (e.g. BCA account).
- OCR & Scan: Users can scan a travel/dinner receipt directly within a trip. They can fully edit names, prices, and add or delete line items from the scan results manually.
- Smart Settle-Up: Simple vs Detailed modes. Simple mode minimizes cash transfers. Detailed mode shows exact payment paths. The app generates a premium "Open in App" link sharing card with visual asset color indications so other members can open and settle.
`;
    }

    if (isSubscriptionRelated) {
      modularRules += `
=== SUBSCRIPTION & RECURRING RULES ===
- Recurring Transactions: Logged for regular weekly, daily, monthly, or yearly transactions (e.g. salary, rent).
- Subscriptions (Langganan): Supports services like Netflix, Spotify, iCloud. Integrates directly into the Cash Flow Forecast to predict upcoming bill dates.
`;
    }

    if (isAssetRelated) {
      modularRules += `
=== ASSETS & WEALTH TIER RULES ===
- Asset Management: Cash, Bank, eWallet, Savings, Investment.
- Gamified Gacha Tier System: 9 real-wealth tier levels based on total net worth (Bronze -> Sultan 👑).
- Motivations: Every tier has 3 motivational quotes rotating every 4 seconds.
- Asset Recaps: Customizable dashboard carousel showing net worth, total assets, and gacha tier metrics.
`;
    }

    if (isStatsRelated) {
      modularRules += `
=== STATS & CASH FLOW FORECAST RULES ===
- Analytics: Donut category charts with responsive legends preventing overlapping labels.
- Cash Flow Forecast: Predicts daily balances 30, 60, or 90 days ahead based on subscriptions and recurring items.
- Safe-to-Spend: Calculates the maximum safe amount to spend today after reserving funds for the next 30 days of bills.
- Danger Zone: Marks days where balance is projected to fall below 0 with red indicators.
- Investment Line: Compares kas cash flow (blue) with investment assets (emerald green).
`;
    }

    if (isOcrRelated) {
      modularRules += `
=== OCR SCANNING & SPLIT BILL RULES ===
- Receipt Scanner: GPT-based OCR extracts merchant, date, items, tax, and service charge. Tax and service are distributed proportionally.
- Split Bill: Distributes OCR-extracted items among contacts, generating Piutang (receivables) for others and recording a standard transaction for the user's share.
`;
    }

    if (isSettingsRelated) {
      modularRules += `
=== SETTINGS & PREFERENCES SYSTEM ===
- Grouped Settings: Settings is organized into Akun (Profile, Security PIN), Keuangan (Anggaran, Langganan, Transaksi Rutin, Tujuan Tabungan), Sosial (Kontak, Split Bills, Trips), and Sistem (Backup/Restore JSON & Excel, Preferensi).
- System Customizations: Custom currency symbol (e.g. $, Rp), transaction groupings, and start-of-month dates.
- Security: PIN lock with local database hashing.
`;
    }

    if (isEndOfMonthRelated || isNearEndOfMonth) {
      modularRules += `
=== END OF MONTH FINANCIAL ADVICE RULES ===
- The user's current financial month is from ${effectiveStartStr || "N/A"} to ${effectiveEndStr || "N/A"} (based on startOfMonthDay preference: ${startOfMonthDay || 1}).
- Today is ${daysToEOM} days away from the end of their financial month.
- Since we are evaluating or close to the end of the financial month, you MUST:
  1. Provide a comprehensive, professional, and detailed report of their monthly performance. Use headers, bold key numbers, and structured bullet points.
  2. Highlight the Total Income, Total Expenses, Net Savings, and Savings Rate. Analyze if they have a surplus or deficit.
  3. Identify their top spending categories and compare them against their budget limits. Be specific: e.g. "Pengeluaran untuk kategori Makanan mencapai Rp X dari anggaran Rp Y (Z%)."
  4. Point out categories where they are overbudget or close to the limit. Offer concrete suggestions (e.g. if using ZBB, suggest moving funds from category A to category B).
  5. Provide exactly 3 actionable, high-quality tips for saving money based on their specific transaction history (e.g. if they spend a lot on "kopi" or "makan diluar", reference those notes).
  6. Maintain a supportive, motivating, yet highly analytical and structured tone (in Indonesian).
`;
    }

    const systemPrompt = `You are MoneyBot, a helpful AI assistant for MoneyApp.
Your primary purpose is to help users manage their finances and categorize transactions.

CURRENT DATE & TIME: ${currentDate || "Unknown"} ${currentTime || ""}
Use this as the reference for "today", "yesterday", or other relative dates.

STRICT GUARDRAILS:
1. ONLY answer questions related to MoneyApp, personal finance, or budgeting. Decline all other topics.
2. If the user asks for help, tutorial, or how to use ANY feature, you MUST call 'get_app_help' to get the user manual.
3. You can ONLY process and create ONE transaction/debt at a time. If the user provides multiple transactions (e.g. "makan 10rb dan bensin 20rb"), do NOT call 'create_transaction' for all. Instead, pick the first one or ask for clarification, and inform the user that for multiple entries, they should use the "Input Sekaligus" (Bulk Input) feature found in the main (+) menu.

CURRENT USER CONTEXT:
Categories: ${categoryList}
Assets: ${assetList}
Contacts: ${contactList}
Budget Mode: ${budgetMode || "regular"} (Income: ${monthlyIncome || 0}, Strict ZBB: ${zbbMode === 'strict' ? 'Yes' : 'No'})
${financialMetricsSummary}

RECENT TRANSACTIONS (Last ${maxTxs}):
${transactionSummary}

RECENT RECURRING TRANSACTIONS:
${recurringSummary}

SUBSCRIPTIONS:
${subscriptionSummary}
${modularRules ? `\nACTIVE TOPIC CONTEXT RULES:${modularRules}` : ''}

BEHAVIOR RULES:
1. When a user describes a transaction (e.g., "makan kfc 10k"), First, recommend category and asset name and ask for confirmation.
2. ONLY call 'create_transaction' or 'create_debt' when the user explicitly agrees.
3. For help/tutorial requests, use 'get_app_help'.
4. For transfers between assets, use 'create_transaction' with 'type': 'transfer'.
5. For debts (hutang) or receivables (piutang), use 'create_debt'.
6. Do NOT try to handle multiple transactions in one turn. Direct them to "Input Sekaligus" for bulk entries.
7. Keep responses concise and in Indonesian.

RECENT UI/BEHAVIOR CHANGES:
- Asset selection in dialogs now uses AssetSelectModal across the app (AddTripExpenseModal, DebtPaymentModal, SettleUpModal).
- The UI shows a single asset-picker button labeled "Pilih Rekening" which returns an assetId when chosen.
- For trip expenses: if the payer is not 'me' the selected asset should be cleared/ignored.
- When drafting transactions or debts, include assetId only if provided by the user via the asset selector.
- For settle-up flows, use the selected assetId to create addTransaction or addDebtPayment records that update balances.

Keep these rules in mind when suggesting or auto-drafting transactions so the assistant's suggestions match the current UI.`;

    const tools = [
      {
        type: "function" as const,
        function: {
          name: "create_transaction",
          description: "Draft a transaction for the user to confirm.",
          parameters: {
            type: "object",
            properties: {
              type: { type: "string", enum: ["pengeluaran", "pendapatan", "transfer"] },
              amount: { type: "number" },
              category: { type: "string" },
              subCategory: { type: "string" },
              assetId: { type: "string", description: "Used for 'pengeluaran' or 'pendapatan'" },
              fromAssetId: { type: "string", description: "Source asset for 'transfer'" },
              toAssetId: { type: "string", description: "Destination asset for 'transfer'" },
              note: { type: "string" },
              date: { type: "string", description: "YYYY-MM-DD" },
              adminFee: { type: "number" },
              adminFeeTarget: { type: "string", enum: ["sender", "receiver"] }
            },
            required: ["type", "amount", "category", "note", "date"]
          }
        }
      },
      {
        type: "function" as const,
        function: {
          name: "create_debt",
          description: "Draft a debt (hutang) or receivable (piutang) record for the user.",
          parameters: {
            type: "object",
            properties: {
              type: { type: "string", enum: ["hutang", "piutang"] },
              contactName: { type: "string" },
              amount: { type: "number" },
              description: { type: "string" },
              date: { type: "string", description: "YYYY-MM-DD" },
              category: { type: "string" },
              subCategory: { type: "string" },
              assetId: { type: "string", description: "For hutang: liability asset or receiving asset. For piutang: asset used to lend money." },
              isInstallment: { type: "boolean" },
              totalInstallments: { type: "number" }
            },
            required: ["type", "contactName", "amount", "date"]
          }
        }
      },
      {
        type: "function" as const,
        function: {
          name: "get_app_help",
          description: "Retrieve the comprehensive user manual and tutorial for all app features.",
          parameters: { type: "object", properties: {} }
        }
      }
    ];

    const apiMessages = [
      { role: "system", content: systemPrompt },
      ...messages
    ];

    const response = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: apiMessages,
      tools: tools as any,
      tool_choice: "auto",
    });

    if (!response.choices || response.choices.length === 0) {
      return res.status(500).json({ message: 'OpenAI returned an empty response.' });
    }

    const choice = response.choices[0];
    const message = choice.message;

    const TUTORIAL_SECTIONS: Record<string, string> = {
      transactions: `
1. Transaksi (Transactions):
   - Cara Tambah: Klik tombol '+' di pojok kanan bawah, pilih 'Tambah Pengeluaran' atau 'Pendapatan'.
   - Tanggal Cepat: Gunakan pintasan (Hari Ini, Kemarin) di modal input untuk mempercepat pencatatan.
   - Kalkulator Mini & Pemisah Ribuan: Nominal input dilengkapi pemisah ribuan otomatis dan kalkulator matematika instan (+, -, *, /) langsung di kotak nominal.
   - Transfer: Gunakan menu 'Transfer' untuk memindahkan uang antar rekening, lengkap dengan input biaya admin (bisa dibebankan ke pengirim/penerima).
   - Input Sekaligus (Bulk Input): Mendukung banyak pencatatan transaksi sekaligus dari teks bebas atau hasil foto/PDF mutasi bank. Mendukung Multi-Asset (pilih rekening berbeda di tiap baris).
   - Salin & Kelola: Tombol 'Copy' di menu edit transaksi untuk menggandakan catatan, pencarian transaksi tingkat lanjut, serta auto-collapse riwayat (hanya membuka hari ini).
`,
      assets: `
2. Aset & Kekayaan (Assets):
   - Kelola Aset: Tambah akun di menu Aset (Tunai, Bank, eWallet, Tabungan, Investasi, dll).
   - Hidden Assets: Menyembunyikan rekening pasif/rahasia tanpa menghapusnya dari neraca total.
   - Gacha Tier System: Tingkat kekayaan riil dikelompokkan ke dalam 9 Gacha tier (Bronze -> Sultan 👑).
   - Pesan Motivasi: Tampilan kartu profil premium menyajikan quotes motivasi yang berganti otomatis tiap 4 detik dan petunjuk saldo untuk naik ke tier berikutnya.
`,
      debts: `
3. Hutang & Piutang (Debts):
   - Bayar/Cicil: Klik pada catatan untuk mengangsur sebagian atau langsung melunasinya.
   - Offset (Potong Silang): Banner potong silang otomatis di bagian atas jika ada catatan hutang dan piutang ke kontak yang sama.
   - Merge Otomatis: Pencatatan hutang/piutang ke orang yang sama otomatis digabung jika belum lunas.
   - Tips Profesional: Kosongkan rekening aset saat membuat hutang agar pelunasan nanti tercatat sebagai Pengeluaran. Pilih aset jika pelunasan ingin dicatat sebagai Transfer rekening.
`,
      budgets: `
4. Anggaran & Perencanaan (Budgets):
   - Regular Mode: Set batas anggaran per kategori di Pengaturan -> Anggaran.
   - Zero-Based Budgeting (ZBB): Setiap rupiah pemasukan WAJIB dialokasikan habis ke amplop (kategori) hingga sisa Rp 0. Pemasukan bulanan dikunci (locked) saat alokasi.
   - Strict Mode ZBB: Jika aktif, semua transaksi (manual, scan struk, mutasi massal) yang melebihi batas amplop akan diblokir total oleh sistem, memaksa pemindahan saldo antar amplop kategori (Envelope Reallocation) sebelum bisa disimpan.
   - Pace Feature: Memberi tahu jika kecepatan belanjamu terlalu tinggi dibandingkan hari yang sudah berlalu dalam bulan.
`,
      forecast: `
5. Proyeksi Kas (Cash Flow Forecast):
   - Prediksi Saldo: Di menu Statistik -> Proyeksi Kas. Menampilkan grafik saldo 30, 60, hingga 90 hari ke depan berdasarkan pengeluaran rutin & langganan.
   - Safe to Spend: Kalkulator otomatis menunjukkan nominal kas yang aman dibelanjakan hari ini setelah dikurangi tagihan 30 hari ke depan.
   - Danger Zone & Investasi: Menandai hari-hari saldo diprediksi negatif (merah) dan menampilkan grafik terpisah antara kas (biru) vs investasi (emerald).
`,
      subscriptions: `
6. Langganan (Subscriptions) & Goals:
   - Langganan (Subs): Catat layanan berulang (Netflix, Spotify, dll) untuk pengingat tagihan dan proyeksi kas.
   - Target Tabungan (Goals): Buat target impian (misal beli laptop) dan hubungkan transaksi menabung secara otomatis.
`,
      ocr: `
7. Scan Struk (OCR) & Split Bill:
   - Scan Struk: Ambil foto struk belanja, AI otomatis membaca merchant, tanggal, nominal, pajak, & service charge. Pajak dan service dibagikan proporsional ke tiap item.
   - Split Bill OCR: Bagi tagihan per item langsung dari hasil scan ke daftar kontak. Bagian teman otomatis menjadi catatan Piutang (receivables).
`,
      trips: `
8. Holiday Trip (Perjalanan Bersama):
   - Manajemen Trip: Kelola pengeluaran kelompok saat liburan.
   - Integrasi Aset Riil: Pengeluaran trip memotong saldo rekening aset yang dipilih pembayar secara riil.
   - OCR Trip Full-Edit: Scan struk langsung dari halaman trip dan edit item (nama, harga, tambah/hapus) sebelum disimpan.
   - Settle-Up Premium: Selesaikan hitungan bagi biaya dengan mode Simple atau Detail. Bagikan link "Open in App" premium dengan warna visual rekening.
`,
      settings: `
9. Pengaturan & Sistem (Settings):
   - Struktur Menu: Akun (Profil, Keamanan PIN), Keuangan (Anggaran, Langganan, Transaksi Rutin, Tujuan Tabungan), Sosial (Kontak, Split Bills, Trips), dan Sistem (Backup/Restore JSON & Excel, Preferensi).
   - Preferensi: Ganti mata uang kustom (Rp, $, dll), ubah kartu carousel aset, dan ubah tanggal awal bulan finansial.
`,
      stats: `
10. Statistik & Laporan:
    - Analisis Lengkap: Diagram lingkaran kategori, perbandingan pertumbuhan saldo vs bulan lalu, heatmap aktivitas harian dengan centering otomatis, dan Financial Health Score.
`
    };

    // Check if the AI decided to call the tool
    if (message.tool_calls && message.tool_calls.length > 0) {
      const toolCall = message.tool_calls[0] as any;
      
      if (toolCall.type === 'function') {
        const functionName = toolCall.function.name;

        if (functionName === 'get_app_help') {
          // Detect which tutorial sections match
          let matchedSections = [];
          if (isDebtRelated) matchedSections.push(TUTORIAL_SECTIONS.debts);
          if (isTripRelated) matchedSections.push(TUTORIAL_SECTIONS.trips);
          if (isBudgetRelated) matchedSections.push(TUTORIAL_SECTIONS.budgets);
          if (isSubscriptionRelated) matchedSections.push(TUTORIAL_SECTIONS.subscriptions);
          if (isAssetRelated) matchedSections.push(TUTORIAL_SECTIONS.assets);
          if (isStatsRelated) matchedSections.push(TUTORIAL_SECTIONS.stats);
          if (isOcrRelated) matchedSections.push(TUTORIAL_SECTIONS.ocr);
          if (isSettingsRelated) matchedSections.push(TUTORIAL_SECTIONS.settings);
          if (isHistoryRelated) matchedSections.push(TUTORIAL_SECTIONS.transactions);

          let helpContent = "";
          if (matchedSections.length > 0) {
            helpContent = `Tentu! Berikut adalah panduan fitur yang relevan dengan pertanyaan Anda:\n${matchedSections.join("\n")}\n\nAda detail fitur lain yang ingin ditanyakan?`;
          } else {
            helpContent = `Tentu! Berikut adalah daftar panduan fitur yang tersedia di MoneyApp. Silakan tanya secara spesifik (misal: "cara pakai ZBB", "info hutang", "cara settle up trip") untuk bantuan instan:

${Object.values(TUTORIAL_SECTIONS).map(sec => sec.trim().split('\n')[0]).join('\n')}

Silakan tanyakan salah satu topik di atas untuk panduan mendalam!`;
          }

          return res.status(200).json({
            role: "assistant",
            content: helpContent
          });
        }

        if (functionName === 'create_transaction' || functionName === 'create_debt') {
          let parsedArgs = {};
          try {
            parsedArgs = typeof toolCall.function.arguments === 'string'
              ? JSON.parse(toolCall.function.arguments)
              : (toolCall.function.arguments || {});
          } catch (e) {
            console.error('Failed to parse tool arguments:', e);
          }
          return res.status(200).json({
            role: "assistant",
            content: message.content || "Ini draft datanya, silakan dikonfirmasi ya!",
            toolCall: {
              name: functionName,
              arguments: parsedArgs
            }
          });
        }
      }
    }

    // Normal text response
    return res.status(200).json({
      role: "assistant",
      content: message.content
    });

  } catch (error: any) {
    console.error('Chat API Error:', error);
    return res.status(500).json({
      message: 'Chat Failed',
      error: error.message
    });
  }
}
