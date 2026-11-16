# CHANGELOG — PERFORMANCE OPTIMIZATION & RESPONSIVE UPGRADE

## [v2.4.0] — Master Performance Optimization & Low-End Device Support

### Added
- **7-Stage Progressive Arena Loading (`src/three/FantasyBoardEngine.ts`, `src/components/LoadingArenaScreen.tsx`)**:
  - Pembagian konstruksi arena 3D menjadi 7 tahapan asinkron dengan indikator checklist tahapan, persentase real-time, dan tips permainan.
  - Pemilih **Mode Performa Game** (`Super Ringan`, `Hemat & Lancar`, `HD Seimbang`, `Otomatis`) langsung di layar loading sebelum masuk arena.
- **Quick Performance Toggle di HUD (`src/components/HUDTopBar.tsx`)**:
  - Tombol cepat **⚡ Mode Ringan / ✓ Mode Ringan** di bar atas permainan untuk mengaktifkan preset hemat GPU dalam 1 klik tanpa membuka modal pengaturan.
- **Enhanced Developer Performance Monitor (`src/components/PerfOverlay.tsx`, `src/three/perf/PerformanceManager.ts`)**:
  - Menampilkan FPS saat ini, **Avg / Min FPS**, **Frame Time (ms)**, **Avg / P95 Frame Time**, **Draw Calls**, **Triangles**, **Active Objects**, **Geometries / Textures**, **Estimasi VRAM**, **JS Heap Memory**, **Render Resolution**, **GPU Renderer**, dan badge **Status Perangkat (`Optimal`, `Adaptif (Stabil)`, `Beban Tinggi`)**.
- **Comprehensive Engineering Documentation**:
  - Menambahkan `PERFORMANCE_AUDIT.md`, `OPTIMIZATION_REPORT.md`, `DEVICE_COMPATIBILITY.md`, `PERFORMANCE_BENCHMARK.md`, `GRAPHICS_SYSTEM.md`, dan `CHANGELOG.md`.

### Changed & Optimized
- **Procedural PBR & 2D Canvas Texture Caching (`src/three/assets/pbrTextures.ts`, `src/three/assets/arenaPbrMaps.ts`, `src/three/textures.ts`)**:
  - Mengganti `Math.sin` pada `hash2()` dengan bitwise integer hash (`Math.imul`) yang ~3,5x lebih cepat.
  - Menyimpan cache seluruh buffer PBR (`Uint8Array`) dan kanvas 2D (`HTMLCanvasElement`) sehingga transisi dari Menu Utama ke Arena Permainan tidak mem-bake ulang tekstur dari nol.
  - Resolusi Board Atlas adaptif (`1024×1024` untuk perangkat low-end `maxAnisotropy <= 2` dan `2048×2048` untuk perangkat menengah/tinggi), menghemat 75% VRAM papan pada HP RAM 2–4 GB.
- **Low-End Hardware Detection & Adaptive DPR (`src/three/perf/PerformanceManager.ts`, `src/three/perf/qualityPresets.ts`)**:
  - Deteksi spesifik untuk **Intel HD/UHD Graphics**, GPU mobile entry-level (`Mali`, `Adreno`, `PowerVR`), dan perangkat RAM 2–4 GB.
  - Pembatasan DPR adaptif untuk layar mobile dan tablet guna mencegah *fragment shader bottleneck*.
- **3D Environment Scaling (`src/three/assets/arenaEnvironmentBuilder.ts`)**:
  - Penyesuaian visibilitas pohon dekoratif cincin luar dan batu besar pada preset `potato` dan `low` tanpa mengurangi keindahan pulau utama, jembatan, kastil, maupun papan permainan.
- **Background Menu 3D Throttling (`src/three/MainMenuEngine.ts`, `src/App.tsx`)**:
  - Menurunkan kecepatan render diorama 3D menu utama ke mode hemat daya (~11 FPS) saat tertutup oleh modal pemilihan mode, konfigurasi permainan, atau Lobi Multiplayer.
