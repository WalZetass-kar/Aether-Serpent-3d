# DEVICE COMPATIBILITY MATRIX — NAGA TANGGA NIH BOS

Dokumen ini merinci profil kompatibilitas perangkat, rekomendasi preset otomatis, dan konfigurasi teknis untuk memastikan **Naga Tangga Nih Bos** berjalan lancar di berbagai kelas perangkat.

---

## 1. Profil Perangkat Target & Rekomendasi Otomatis

| Kelas Perangkat | Contoh Spesifikasi | Preset Otomatis | Target FPS | Skala Resolusi & DPR |
| :--- | :--- | :--- | :--- | :--- |
| **Ultra Low-End / Entry Android** | Android RAM 2 GB, Quad-core Cortex-A53, Mali-400 / Mali-T820 / PowerVR GE8320 | **Potato (`Super Ringan`)** | **30+ FPS** | `0.65x` (Max DPR `1.0`) |
| **Budget Android (RAM 3–4 GB)** | Redmi / Realme / Samsung Seri A0x–A1x, Helio G25/G35/G85, Snapdragon 662/680 (Adreno 610, Mali-G52) | **Low (`Hemat & Lancar`)** | **45 FPS** | `0.80x` (Max DPR `1.12`) |
| **Laptop Lawas (Intel HD Graphics)** | Intel Core i3/i5 Gen 3–7, Intel HD Graphics 3000 / 4000 / 4400 / 520 / 620, RAM 4 GB, Tanpa GPU Dedicated | **Potato / Low** | **35–48 FPS** | `0.65x – 0.80x` (Max DPR `1.1–1.25`) |
| **Laptop iGPU Modern & Mid-Range Mobile** | Intel Iris Xe / UHD 730+, AMD Radeon Vega iGPU, Snapdragon 778G / Dimensity 7050, iPhone 11–13 | **Medium (`HD Seimbang`)** | **55–60 FPS** | `0.90x` (Max DPR `1.22–1.4`) |
| **High-End Smartphone & Desktop GPU** | Snapdragon 8 Gen 1/2/3, Apple M1/M2/M3, GTX 1650 / RTX 3050+ | **High / Ultra** | **60 FPS** | `1.0x – 1.12x` (Max DPR `1.75`) |
| **Browser Tanpa Akselerasi Hardware** | Chrome/Edge dengan Software WebGL (`SwiftShader`, `Microsoft Basic Render Driver`, `llvmpipe`) | **Potato (Fallback)** | **24–30 FPS** | `0.65x` (DPR `0.90`) |

---

## 2. Kompatibilitas Sistem Operasi & Browser

1. **Android Chrome / Samsung Internet / Firefox Android**:
   - Mendukung penuh Touch Orbit Controls (1 jari putar, 2 jari cubit zoom & geser), responsive layout tanpa horizontal scroll, dan Web Audio API dengan *auto-unlock* pada sentuhan pertama.
2. **iOS & iPadOS Safari (iPhone / iPad)**:
   - Kompatibel dengan batasan memori tekstur WebKit berkat caching kanvas dan pembatasan DPR otomatis (`<= 1.35x` pada layar Retina 3x).
3. **Windows 10 / 11 & Linux (Chrome, Edge, Firefox, Brave)**:
   - Mendukung ANGLE D3D11 / OpenGL / Vulkan backend, termasuk fallback otomatis ketika ekstensi `WEBGL_debug_renderer_info` diblokir oleh pengaturan privasi browser.

---

## 3. Mekanisme Perlindungan Perangkat Kelas Bawah

- **Pencegahan Out-Of-Memory (OOM) pada HP RAM 2–3 GB**:
  - Tekstur PBR pada mode `Potato` dan `Low` menggunakan resolusi `256×256` (~0.33 MB per map dengan mipmap) dan Board Atlas `1024×1024`, menjaga total estimasi penggunaan VRAM tekstur di bawah **12 MB**.
- **Pencegahan Overheating (Thermal Throttling)**:
  - Throttling otomatis saat tab tidak aktif (`document.hidden`) dan saat berada di Lobi Multiplayer (`~11 FPS`), serta pembatasan pembaruan partikel sekunder pada mode `Potato`/`Low`.
- **WebGL Context Loss Recovery**:
  - Menangani event `webglcontextlost` dan `webglcontextrestored` pada elemen kanvas agar browser tidak mengalami *white screen* apabila sistem operasi mobile mereset driver GPU sementara.
