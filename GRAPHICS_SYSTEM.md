# ADAPTIVE GRAPHICS SYSTEM — NAGA TANGGA NIH BOS

## 1. Arsitektur Adaptive Graphics Engine
Sistem grafis adaptif diimplementasikan pada:
- `src/three/perf/qualityPresets.ts` (Definisi konfigurasi 5 tier kualitas + penyimpanan preferensi `localStorage`).
- `src/three/perf/PerformanceManager.ts` (Hardware probe, micro-benchmark WebGL2, dynamic resolution scaling, hysteresis controller, dan live telemetry).
- `src/components/CameraSettingsModal.tsx` (UI pengaturan penuh Kamera 3D & Grafis).
- `src/components/LoadingArenaScreen.tsx` & `src/components/HUDTopBar.tsx` (Pemilih cepat mode performa saat loading & tombol `⚡ Mode Ringan` di HUD).

---

## 2. Spesifikasi Preset Grafis (`qualityPresets.ts`)

| Parameter | **POTATO** (`Super Ringan`) | **LOW** (`Hemat & Lancar`) | **MEDIUM** (`HD Seimbang`) | **HIGH** | **ULTRA** |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Target FPS** | 30 FPS | 45 FPS | 55 FPS | 60 FPS | 60 FPS |
| **Default Render Scale** | `0.65x` (Min `0.50x`) | `0.80x` (Min `0.62x`) | `0.90x` (Min `0.72x`) | `1.00x` | `1.12x` |
| **Real-Time Shadows** | **Nonaktif (`false`)** | **Nonaktif (`false`)** | Aktif (`1024px` Important Only) | Aktif (`2048px`) | Aktif (`2048px` Full) |
| **PBR Texture Size** | `256×256` | `256×256` | `512×512` | `512×512` | `1024×1024` |
| **Terrain Segments** | `40×40` | `56×56` | `76×76` | `104×104` | `128×128` |
| **Snake Tube Geometry** | `52 × 8` segmen | `72 × 10` segmen | `96 × 12` segmen | `120 × 15` segmen | `140 × 18` segmen |
| **LOD Distance Bias** | `0.52x` (Agresif) | `0.72x` | `0.92x` | `1.00x` | `1.25x` |
| **Environment Density** | `0.40` (40%) | `0.60` (60%) | `0.80` (80%) | `1.00` (100%) | `1.00` (100%) |
| **Particle Budget** | `18` partikel | `36` partikel | `64` partikel | `100` partikel | `144` partikel |
| **Post-Processing** | Nonaktif | Nonaktif | FXAA + DoF | Bloom + DoF + FXAA | Bloom + DoF + FXAA |

---

## 3. Alur Deteksi Kemampuan Perangkat (`probeDeviceCapabilities`)
Sistem tidak hanya mengandalkan `navigator.userAgent`, melainkan mengevaluasi:
1. **WebGL2 Capabilities & Extensions**:
   - Mendeteksi `UNMASKED_RENDERER_WEBGL`, `MAX_TEXTURE_SIZE`, `MAX_TEXTURE_MAX_ANISOTROPY_EXT`, serta dukungan kompresi tekstur hardware (`S3TC`, `ETC2`, `ASTC`, `BPTC`).
2. **Deteksi GPU Terintegrasi & Software Renderer**:
   - Mengidentifikasi renderer software (`SwiftShader`, `llvmpipe`, `Basic Render`) dan GPU terintegrasi lawas (`Intel HD Graphics 3000–620`, `Mali-400/450/T/G31/G52`, `Adreno 3xx/4xx/50x/610`, `PowerVR GE8`).
3. **Kapasitas Memori & Core CPU**:
   - Membaca `navigator.deviceMemory` (GB) dan `navigator.hardwareConcurrency` dengan fallback aman apabila API tidak didukung browser.
4. **GPU + CPU Micro-Benchmark Aktual**:
   - Menjalankan kompilasi shader WebGL2 256×256, 8 pass `gl.drawArrays` + `gl.finish()`, dan loop FBM matematika untuk mengukur waktu eksekusi nyata dalam milidetik (`benchmarkScoreMs`).

---

## 4. Penyesuaian Kualitas Dinamis (Hysteresis Loop)
- **Step-Down Cepat Saat Beban Berat**:
  - Jika rata-rata waktu frame (`avgFrameMs`) melebihi `1.25×` batas waktu target selama **1,4 detik** berturut-turut:
    1. Sistem terlebih dahulu menurunkan `resScale` sebesar `-0.08` (hingga batas `minResScale` pada tier tersebut) tanpa membangun ulang geometri.
    2. Jika `resScale` sudah mencapai batas minimum dan FPS masih rendah, sistem menurunkan tier kualitas satu tingkat (mis. `medium` -> `low` -> `potato`) dengan masa tenang (*cooldown*) `3,5 detik`.
- **Step-Up Bertahap Saat GPU Longgar**:
  - Jika waktu frame berada di bawah `0.65×` target selama **9,0 detik** berturut-turut, sistem menaikkan kembali `resScale` (`+0.06`) atau mengembalikan tier secara halus tanpa menyebabkan osilasi bolak-balik.
