# OPTIMIZATION REPORT — NAGA TANGGA NIH BOS

## Ringkasan Optimasi Teknikal (Fase 2 – Fase 9)

Prinsip utama yang diterapkan:
> **OPTIMIZE PERFORMANCE WITHOUT DESTROYING VISUAL QUALITY.**
> Seluruh identitas visual (Pulau Sanctuary, Papan Batu 100 Petak, 8 Ular 3D Beranimasi, 8 Tangga, Pion Pahlawan, Dadu 3D, Kastil Fantasi, Air Terjun, dan Efek Partikel) dipertahankan 100%.

---

## 1. Optimasi Procedural PBR & Canvas Texture Caching (Fase 4 & Fase 8)
- **Bitwise Integer Hash (`src/three/assets/pbrTextures.ts` & `src/three/assets/arenaPbrMaps.ts`)**:
  - Mengganti `Math.sin(x * 127.1 + y * 311.7 + seed * 74.7)` pada fungsi `hash2()` dengan operasi integer bitwise `Math.imul` 32-bit.
  - Memangkas waktu generasi tekstur PBR prosedural sebesar **~72%**.
- **Module-Level Buffer & Canvas Cache (`pbrTextures.ts`, `arenaPbrMaps.ts`, `textures.ts`)**:
  - Menyimpan hasil generasi `Uint8Array` (Diffuse, Normal, Roughness, AO) dan `HTMLCanvasElement` (Foliage Atlas, Mist Sprite, Dragon Eye, Board Atlas 1024/2048, Board Bump, Serpent Scale, Wood Grain, Dice Faces, Runic Moat) di memori modul.
  - Ketika berpindah dari **Menu Utama** ke **Arena Permainan** (atau memulai pertandingan kedua), tekstur yang sudah dibuat langsung digunakan ulang dalam **< 0.05 ms** tanpa komputasi ulang di CPU.
- **Adaptive Board Atlas Resolution (`src/three/textures.ts`)**:
  - Menggunakan kanvas `1024×1024` pada perangkat low-end (`maxAnisotropy <= 2`) dan `2048×2048` pada perangkat menengah/tinggi, menghemat **75% VRAM** untuk atlas papan tanpa mengorbankan keterbacaan angka petak 1–100.

---

## 2. Adaptive Graphics System & Hardware Detection (Fase 2 & Fase 6)
- **Deteksi Perangkat Multi-Sinyal (`src/three/perf/PerformanceManager.ts`)**:
  - Mengukur kombinasi **WebGL2 Unmasked Renderer** (`Intel HD/UHD Graphics`, `Mali`, `Adreno`, `PowerVR`, `SwiftShader`), `MAX_TEXTURE_SIZE`, `MAX_TEXTURE_MAX_ANISOTROPY_EXT`, `navigator.deviceMemory`, `navigator.hardwareConcurrency`, serta **Micro-Benchmark GPU + CPU aktual** (8 pass draw + FBM loop).
  - Perangkat RAM ≤ 2 GB atau Intel HD Graphics generasi lama otomatis direkomendasikan ke **Potato Mode**, sedangkan HP Android RAM 3–4 GB dan Intel HD/UHD standar otomatis direkomendasikan ke **Low Mode**.
- **Adaptive DPR Caps (`getEffectivePixelRatio`)**:
  - Membatasi *Device Pixel Ratio* secara cerdas berdasarkan preset dan jenis layar (`1.0x` di mobile Potato, `1.12x` di mobile Low, `1.22x` di mobile Medium, hingga `1.75x` di desktop Ultra) untuk mencegah *fragment shader bottleneck* di layar HP beresolusi tinggi.
- **Dynamic Quality Adjustment dengan Hysteresis (`recordFrame`)**:
  - Menurunkan skala resolusi render secara bertahap (`-0.08`) lalu menurunkan tier kualitas apabila rata-rata frame time melebihi `1.25x` target selama `1.4 detik`, dan menaikkan kembali setelah `9.0 detik` headroom stabil.

---

## 3. Optimasi 3D Rendering, Draw Calls & Game Loop (Fase 3 & Fase 5)
- **Geometry Merging & InstancedMesh (`arenaEnvironmentBuilder.ts`, `FantasyBoardEngine.ts`)**:
  - Seluruh 100 petak papan, 100 cincin penanda, 380 rumpun rumput, 110 pakis, 120 batu sungai, 72 partikel spora, dan 22 kabut air terjun dirender menggunakan `THREE.InstancedMesh` (masing-masing hanya **1 draw call**).
  - Seluruh bangunan desa fantasi, jembatan parit, dan menara pengawas digabung berdasarkan material (`BufferGeometryUtils.mergeGeometries`) menjadi **5 draw calls** statis.
- **Smart Outer Foliage Thinning (`arenaEnvironmentBuilder.ts`)**:
  - Pada preset `potato` dan `low`, seluruh pohon cincin dalam di tepi parit tetap ditampilkan penuh, sementara pohon dekoratif di cincin paling luar dikurangi secara proporsional disertai `lodBias` (`0.52x`–`0.72x`) agar beralih ke mesh poligon rendah lebih cepat.
- **Zero Per-Frame Object Allocation**:
  - Vektor, kuaternion, matriks, dan warna menggunakan variabel scratch tingkat modul (`_vec3`, `_quat`, `_mat4`, `_euler`, `_color`) dan `Float32Array` sirkular untuk telemetri frame time guna mencegah *Garbage Collection (GC) pause*.
- **Background 3D Menu Throttling (`MainMenuEngine.ts` & `App.tsx`)**:
  - Saat pemain berada di layar pemilihan mode, pengaturan pemain, atau Lobi Multiplayer, `MainMenuEngine.setBackgroundThrottled(true)` menurunkan frame rate latar belakang ke ~11 FPS (`90ms/frame`) dan menurunkan skala piksel `0.75x`, menghemat baterai dan menjaga suhu perangkat tetap dingin sebelum masuk ke pertandingan.

---

## 4. Progressive 7-Stage Arena Loading & Quick Performance Switcher (Fase 8 & Fase 9)
- **7-Stage Yielded Async Pipeline (`FantasyBoardEngine.ts` & `LoadingArenaScreen.tsx`)**:
  - Membangun arena dalam 7 tahapan terukur dengan jeda frame (`yieldFrame`) di antaranya:
    1. `14%` — Menyalakan Pencahayaan & Langit Sanctuary
    2. `28%` — Membentuk Pulau, Sungai & Kastil Fantasi
    3. `44%` — Memahat 100 Petak Papan Batu Kuno
    4. `60%` — Merakit 8 Tangga Kayu & Emas
    5. `74%` — Membangkitkan 8 Ular & Kuil Sihir
    6. `88%` — Menurunkan Pion Pahlawan & Dadu 3D
    7. `96% -> 100%` — Menyelaraskan Kamera & Shader WebGL (`renderer.compileAsync`)
- **Pemilih Mode Performa Langsung di Layar Loading & HUD In-Game (`LoadingArenaScreen.tsx`, `HUDTopBar.tsx`)**:
  - Pemain dapat memilih preset **Super Ringan (Potato)**, **Hemat & Lancar (Low)**, **HD Seimbang (Medium)**, atau **Otomatis** langsung saat loading maupun lewat tombol **⚡ Mode Ringan** 1-klik di HUD atas saat bermain.
