# 📊 MoneyApp - Diagram Alur Sistem & Arsitektur

Dokumentasi visual diagram untuk **MoneyApp** yang mencakup arsitektur sistem, alur pencatatan transaksi dengan Zero-Based Budgeting (ZBB), pipeline kecerdasan buatan (AI & OCR), serta kolaborasi Ruang Keluarga (*Family Workspace*).

> 💡 **Tips Menampilkan**: Berkas ini telah dilengkapi gambar hasil render visual (.png & .svg) sehingga otomatis tampil di semua Markdown Preview tanpa perlu plugin tambahan. Anda juga dapat membuka [moneyapp-mermaid.html](file:///d:/code/moneyreactapp/docs/diagrams/moneyapp-mermaid.html) di browser.

---

## 1. Diagram Arsitektur & Sinkronisasi Data (System Architecture)

![System Architecture](1_system_architecture.png)

<details>
<summary><b>Lihat Kode Mermaid</b></summary>

```mermaid
flowchart TB
    %% STYLING
    classDef client fill:#1e293b,stroke:#38bdf8,stroke-width:2px,color:#f8fafc;
    classDef state fill:#0f172a,stroke:#818cf8,stroke-width:2px,color:#f8fafc;
    classDef storage fill:#064e3b,stroke:#34d399,stroke-width:2px,color:#f8fafc;
    classDef backend fill:#312e81,stroke:#a78bfa,stroke-width:2px,color:#f8fafc;
    classDef cloud fill:#701a75,stroke:#f472b6,stroke-width:2px,color:#f8fafc;
    classDef ext fill:#1c1917,stroke:#f59e0b,stroke-width:2px,color:#f8fafc;

    subgraph ClientLayer ["📱 Frontend Layer (React 19 PWA)"]
        User(["👤 User & Mobile Device"]):::ext
        UI["⚛️ React 19 UI & Router v7"]:::client
        
        subgraph ContextEngine ["State Management & Controllers"]
            MC["💰 MoneyContext<br/>(ZBB Envelopes & Balances)"]:::state
            FC["👨‍👩‍👧 FamilyContext<br/>(Workspaces & Members)"]:::state
            PC["⭐ PremiumContext<br/>(Quotas & Subscriptions)"]:::state
        end

        IDB[("💾 IndexedDB (idb)<br/>Offline-First Local DB")]:::storage
        DeltaSync["🔄 DeltaSync Engine<br/>(Mutation Queue & Sync)"]:::storage
    end

    subgraph ServerlessLayer ["⚡ Serverless API (Vercel Functions)"]
        APIScan["📸 /api/scan<br/>(Vision OCR Parsing)"]:::backend
        APIBulk["📝 /api/bulk-parse<br/>(Bank Mutation NLP)"]:::backend
        APIChat["🤖 /api/chat<br/>(Financial AI Agent & Tools)"]:::backend
        APICron["⏰ /api/daily-cron & weekly-cron"]:::backend
    end

    subgraph CloudLayer ["☁️ Cloud & External Services"]
        FirebaseAuth["🔐 Firebase Auth<br/>(Google Sign-In & PIN)"]:::cloud
        Firestore[("🔥 Firebase Firestore<br/>(Real-time Cloud Sync)")]:::cloud
        FCM["🔔 Firebase Cloud Messaging<br/>(Push Alerts)"]:::cloud
        OpenAI["🧠 OpenAI GPT-4o-mini<br/>(Vision & NLP Engines)"]:::ext
    end

    %% User Connections
    User -->|OAuth Sign-In| FirebaseAuth
    User -->|HTTPS Interaction| UI
    
    %% UI to State & Storage
    UI <--> ContextEngine
    ContextEngine <-->|Read / Write| IDB
    IDB -->|Enqueue Pending Mutations| DeltaSync
    DeltaSync <-->|Realtime Snapshot Sync| Firestore

    %% Serverless & AI Connections
    UI -->|POST /api/scan| APIScan
    UI -->|POST /api/bulk-parse| APIBulk
    UI -->|POST /api/chat| APIChat
    
    APIScan --> OpenAI
    APIBulk --> OpenAI
    APIChat --> OpenAI
    APIChat <-->|Tool Execution| ContextEngine

    %% Notifications & Crons
    APICron --> FCM
    FCM -->|Push Notification| User
```

</details>

---

## 2. Alur Transaksi & Zero-Based Budgeting (ZBB Strict Mode)

![ZBB Transaction Flow](2_zbb_transaction_flow.png)

<details>
<summary><b>Lihat Kode Mermaid</b></summary>

```mermaid
flowchart TD
    Start([Input Transaksi Baru]) --> InputType{Sumber Input}

    InputType -->|Form Cepat| Manual[Input Form: Nominal, Kategori, Aset]
    InputType -->|Scan Kamera| OCR[Hasil Scan Struk Belanja]
    InputType -->|Salin Teks Mutasi| Bulk[Hasil Parsing AI Bulk Mutation]
    InputType -->|Chat AI| AIChat[Instruksi AI: add_transaction]

    Manual --> CheckTxType{Tipe Transaksi}
    OCR --> CheckTxType
    Bulk --> CheckTxType
    AIChat --> CheckTxType

    %% PENGELUARAN
    CheckTxType -- "Pengeluaran" --> CheckZBB{Strict ZBB Mode Aktif?}
    
    CheckZBB -- Ya --> CheckBudget{Sisa Budget Kategori Cukup?}
    CheckBudget -- "Melebihi Anggaran (Overspend)" --> ReallocateModal["⚠️ Modal Intersepsi: Realokasi Dana"]
    
    ReallocateModal --> Decision{Keputusan Pengguna}
    Decision -- "Pindahkan Saldo dari Kategori Lain" --> UpdateEnvelope[Geser Saldo Amplop ZBB] --> ApplyTx[Eksekusi Transaksi]
    Decision -- "Batalkan Transaksi" --> AbortTx([❌ Transaksi Dibatalkan])

    CheckBudget -- "Cukup / Aman" --> ApplyTx
    CheckZBB -- Tidak (Mode Reguler) --> ApplyTx
    
    %% TIPE LAIN
    CheckTxType -- "Pendapatan / Transfer / Hutang" --> ApplyTx

    %% EKSEKUSI TRANSAKSI
    ApplyTx --> UpdateAssetBalance[Perbarui Saldo Rekening / Aset Terkait]
    UpdateAssetBalance --> SaveLocalDB[Tulis ke IndexedDB Lokal]
    SaveLocalDB --> QueueDeltaSync[Masukkan Antrian Delta Sync]
    QueueDeltaSync --> PushFirestore[(Kirim ke Cloud Firestore)]
    PushFirestore --> Finish([✅ Transaksi Berhasil Disimpan])
```

</details>

---

## 3. Sequence Diagram: Scan Struk, AI Parsing & Split Bill

![AI Scan & Split Bill](3_ai_scan_split_bill.png)

<details>
<summary><b>Lihat Kode Mermaid</b></summary>

```mermaid
sequenceDiagram
    autonumber
    actor User as 👤 Pengguna
    participant UI as 📱 MoneyApp UI
    participant API as ⚡ /api/scan (Vercel)
    participant AI as 🧠 OpenAI GPT-4o-mini
    participant DB as 💾 IndexedDB / State
    participant Cloud as 🔥 Cloud Firestore

    User->>UI: Ambil Foto / Upload Gambar Struk
    UI->>UI: Kompresi Gambar & Konversi Base64
    UI->>API: POST /api/scan { imageBase64 }
    
    API->>AI: Kirim Gambar + Prompt Ekstraksi JSON (Items, Tax, Service, Total)
    AI-->>API: JSON Terstruktur (Merchant, Daftar Item, Pajak, Total)
    API-->>UI: Respons Data Struk
    
    UI->>User: Tampilkan Modal Hasil Scan (Itemizer & Split Options)
    
    alt Opsi 1: Simpan Pengeluaran Langsung
        User->>UI: Pilih Kategori & Rekening -> Simpan
        UI->>DB: Tulis Transaksi & Update Saldo Aset
        UI->>Cloud: Trigger Sync ke Firestore
    else Opsi 2: Split Bill Bersama Teman
        User->>UI: Alokasikan Item ke Anggota + Hitung Pajak Proporsional
        User->>UI: Klik "Share Link"
        UI->>Cloud: Simpan Dokumen ke /shared_split_bills/{id}
        Cloud-->>UI: ID Link Berhasil Dibuat
        UI->>User: Generate Web Link (/shared-split/:id) & WhatsApp Text
    end
```

</details>

---

## 4. Alur Sinkronisasi Kolaborasi Ruang Keluarga (Family Workspace)

![Family Workspace Sync](4_family_workspace_sync.png)

<details>
<summary><b>Lihat Kode Mermaid</b></summary>

```mermaid
flowchart LR
    subgraph UserA ["👤 Pengguna A (Owner)"]
        CreateFamily["Buat Ruang Keluarga"]
        ShareCode["Bagikan Join Code (cth: 'W4K7P2')"]
        LocalStateA["MoneyContext (Workspace A)"]
    end

    subgraph UserB ["👥 Pengguna B (Anggota)"]
        InputCode["Masukkan Join Code"]
        JoinFamily["Tergabung ke Ruang Keluarga"]
        LocalStateB["MoneyContext (Workspace B)"]
    end

    subgraph FirebaseCloud ["🔥 Firebase Cloud Firestore"]
        FamilyDoc[("Document: /families/{id}")]
        SubCollections[("Collections: /transactions, /assets, /budgets")]
        DeltaListeners["Real-Time Snapshot Listeners"]
    end

    CreateFamily --> FamilyDoc
    ShareCode -.->|Kirim via Chat/WA| InputCode
    InputCode --> JoinFamily
    JoinFamily --> FamilyDoc

    LocalStateA <-->|Write / Read Mutation| SubCollections
    LocalStateB <-->|Write / Read Mutation| SubCollections
    SubCollections <--> DeltaListeners
    DeltaListeners -->|Push Update Otomatis| LocalStateA
    DeltaListeners -->|Push Update Otomatis| LocalStateB
```

</details>
