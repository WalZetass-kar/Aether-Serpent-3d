# PERFORMANCE AUDIT — NAGA TANGGA NIH BOS

## 1. Executive Summary
Audit menyeluruh terhadap source code aktual **Naga Tangga Nih Bos** (`https://nagatangganihbos.my.id`) dilakukan untuk mengidentifikasi penyebab utama beban CPU, GPU, RAM, dan VRAM pada perangkat kelas bawah (HP Android RAM 2–4 GB dan laptop lawas dengan Intel HD Graphics).

### Stack Teknologi Aktual (Berdasarkan Source Code)
- **Frontend Framework**: React 19 + TypeScript + Vite 6 + Tailwind CSS v4.
- **3D Rendering Engine**: **Three.js (`three@^0.183.2`)** berbasis WebGL2 (`THREE.WebGLRenderer`) dengan dua engine terpisah:
  - `src/three/MainMenuEngine.ts` (Diorama Menu Utama: Pulau Terapung, Air Terjun, Naga 3D Animasi, Kastil Fantasi).
  - `src/three/FantasyBoardEngine.ts` (Arena Permainan: Papan Batu 100 Petak, 8 Tangga Kayu/Emas, 8 Ular 3D Beranimasi, 4 Kuil/Obelisk, 2–6 Pion Pahlawan, Dadu 3D Fisika Sinematik, Lingkungan Pulau & Langit Dinamis).
- **Post-Processing**: `EffectComposer`, `RenderPass`, `UnrealBloomPass`, `BokehPass` (Depth of Field), `ShaderPass` (`FXAAShader`), `OutputPass`.
- **Audio Engine**: Procedural Web Audio API (`src/services/soundEffects.ts`) tanpa ketergantungan file MP3/WAV eksternal besar.
- **Multiplayer Networking**: Dual-Transport (`ws` WebSocket pada `server.ts` + HTTP Polling fallback pada `api/index.ts` untuk deployment serverless seperti Vercel/Cloud Run).

---

## 2. Temuan Bottleneck Utama (Root Cause Analysis)

### A. Bottleneck CPU & Waktu Loading Saat Masuk Arena (`pbrTextures.ts`, `arenaPbrMaps.ts`, `textures.ts`)
1. ** ~20 Juta Operasi Trigonometri (`Math.sin`) saat Baking Tekstur Procedural**:
   - Seluruh tekstur PBR (Terrain, Rock, Bark, Castle Stone, Slate Roof, Timber, Board Relief, Gold/Bronze, Serpent Scales) dibuat secara prosedural di CPU menggunakan *Fractal Brownian Motion* (`fbm`) dan Sobel filter (`buildNormalFromHeight`).
   - Fungsi `hash2(x, y, seed)` sebelumnya memanggil `Math.sin(...)` jutaan kali di main thread.
2. **Baking Ulang Tanpa Cache Saat Transisi Menu Utama -> Arena**:
   - `MainMenuEngine` dan `FantasyBoardEngine` memanggil fungsi pembuat tekstur PBR yang sama. Ketika pemain menekan **Mulai Pertandingan**, semua tekstur PBR di-generate ulang dari nol tanpa membagikan buffer `Uint8Array` / `HTMLCanvasElement` yang sudah dibuat saat di Menu Utama.
3. **Konstruksi Arena Monolitik dalam 1–2 Blok Sinkron**:
   - `FantasyBoardEngine.buildArenaAsync()` sebelumnya membangun seluruh lingkungan 3D, papan 100 petak, tangga, ular, pion, dan kompilasi shader dalam sedikit jeda, sehingga progress bar melompat kasar dan menyebabkan *main-thread freeze* selama 1,5–4 detik di HP RAM 2–4 GB.

### B. Bottleneck GPU & Fillrate (`PerformanceManager.ts`, `qualityPresets.ts`, `MainMenuEngine.ts`)
1. **Device Pixel Ratio (DPR) Terlalu Tinggi di Layar Mobile**:
   - HP Android entry-level masa kini memiliki layar FHD+ dengan `window.devicePixelRatio` antara `2.5` hingga `3.0`. Merender WebGL pada DPR `> 1.25` dengan shader air kustom (`onBeforeCompile`), goyangan angin dedaunan, dan PBR normal map menguras *fragment fillrate* GPU terintegrasi (Mali-G52, Adreno 610, Intel HD Graphics 4000–620).
2. **3D Menu Tetap Merender Penuh di Balik Layar Modal/Lobi**:
   - Saat pemain membuka pemilihan mode (`mode_selection`), konfigurasi pemain (`game_config`), atau menunggu di **Lobi Multiplayer (`multiplayer_lobby`)**, `MainMenuEngine` tetap merender pulau 3D dan naga pada 30–60 FPS di latar belakang, memicu panas berlebih (*thermal throttling*) sebelum pertandingan dimulai.

### C. Bottleneck Draw Calls & Scene Graph (`arenaEnvironmentBuilder.ts`, `FantasyBoardEngine.ts`)
1. **Pohon & Batu Dekoratif Lapisan Luar pada Preset Rendah**:
   - Seluruh 36 pohon `THREE.LOD` (14 cincin dalam + 22 cincin luar) dan 11 batu besar tetap aktif penuh pada preset `potato` dan `low`.
2. **Resolusi Board Atlas 2048×2048 di Semua Perangkat**:
   - `createBoardAtlasTexture()` selalu membuat kanvas `2048×2048` (~22 MB VRAM dengan mipmap) bahkan pada perangkat dengan `maxAnisotropy <= 2` atau RAM 2 GB.

### D. Bottleneck Jaringan & Sinkronisasi Multiplayer (`App.tsx`, `server.ts`, `MultiplayerLobbyView.tsx`)
1. **Validasi Tombol Mulai (`START_MATCH`) & Polling**:
   - Host membutuhkan kepastian sinkronisasi daftar pemain (`room.players`) dan kesiapan (`ready`) baik melalui WebSocket maupun HTTP polling fallback, serta idempotensi pemrosesan `lastTurnEvent.turnId` agar animasi lompatan pion tidak diputar dua kali saat terjadi *reconnect*.

---

## 3. Matriks Risiko Performa Sebelum Optimasi

| Area Sistem | Tingkat Keparahan | Dampak pada HP RAM 2–4 GB / Intel HD |
| :--- | :--- | :--- |
| Procedural PBR `hash2` (`Math.sin`) | **Kritis** | Freeze 2–4 detik saat masuk menu & masuk arena |
| Uncached PBR & Canvas2D Textures | **Tinggi** | Duplikasi komputasi CPU & lonjakan GC saat pindah layar |
| High Mobile DPR Fillrate | **Kritis** | FPS drop ke 14–20 FPS & cepat panas pada resolusi native |
| Background 3D Menu di Lobi | **Sedang-Tinggi** | Penggunaan GPU 45–70% saat sekadar mengatur room / chat |
| Outer Decorative Trees di Mode Potato | **Sedang** | Draw calls tambahan yang tidak esensial di layar kecil |
| Monolithic Arena Build | **Tinggi** | Loading bar terasa macet sebelum masuk ke pertandingan |
