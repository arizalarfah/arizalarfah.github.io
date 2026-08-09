# Manifest gambar — Smart Irrigation

Halaman `smart-irrigation/index.html` mereferensikan file gambar berikut di
folder ini. Sebelum file-nya ada, halaman otomatis menampilkan kotak
placeholder "Gambar belum tersedia" (bukan ikon broken-image) — jadi aman
di-publish duluan dan disusul gambarnya belakangan.

## Sudah tersedia (disusulkan langsung ke repo)

| Filename                       | Dipakai di bagian                     | Deskripsi / caption                                                |
|----------------------------------|-----------------------------------------|------------------------------------------------------------------------|
| `01-boards-manager-url.png`      | 3.2 Install Board ke Arduino IDE        | Menempelkan URL ke kolom Additional Boards Manager URLs                |
| `02-esp8266-community-install.png` | 3.2 Install Board ke Arduino IDE      | Install board "ESP8266 Community" via Boards Manager                   |
| `03-pubsubclient-install.png`    | 3.2 Install Board ke Arduino IDE        | Install library "PubSubClient" via Library Manager                     |
| `04-design-hardware.png`         | 4. Design Hardware & Wiring             | Diagram wiring: panel surya → baterai 18650 → NodeMCU + LED + sensor   |
| `05-prototype-1.png`             | 8. Prototyping & Implementasi           | Foto prototipe di meja kerja/testing                                   |
| `06-prototype-2.png`             | 8. Prototyping & Implementasi           | Foto tim di lapangan, sensor terpasang di saluran irigasi sawah        |

## Ditambahkan dari IRIGASI PINTAR.pptx (diekstrak & dikompres otomatis)

| Filename                         | Dipakai di bagian                     | Sumber asli di pptx |
|-------------------------------------|------------------------------------------|-------------------------|
| `07-mobile-app-realtime.jpg`        | 7. Integrasi Mobile App                  | Slide 10 (`image28.png`) — foto sensor di sawah + screenshot app "Irigasi Pintar" realtime |
| `08-sensor-assembly.jpg`            | 8. Prototyping & Implementasi            | Slide 10 (`image29.png`) — modul sensor sebelum/sesudah masuk housing pipa PVC |
| `09-playstore-listing.jpg`          | (belum dipakai di halaman, disimpan untuk referensi) | Slide 7 (`image23.png`) — screenshot listing "Irpin Solok" di Google Play |

Ketiga file di atas di-resize (max-width 1600px) dan dikonversi ke JPEG
quality ~82–85 dari PNG asli di dalam pptx supaya ukurannya wajar untuk web
(dari total ~2.3MB jadi ~265KB gabungan).

## Opsional / belum diambil

- `cover.png` — cover/hero image dari halaman Notion asli (belum dipakai di
  `index.html`): sumber asli `Screenshot_2023-04-19_233152.png`.
- File driver `DRIVER1_CH340.zip` yang dilampirkan di halaman Notion asli
  tidak diekstrak ke sini (bukan gambar, dan bukan biner yang aman di-fetch
  otomatis). Bagian 3.1 saat ini mengarah ke driver resmi WCH sebagai sumber
  yang bisa diverifikasi; taruh salinannya sendiri di
  `smart-irrigation/files/DRIVER1_CH340.zip` kalau ingin tetap
  menyertakan versi yang persis sama dari dokumentasi asli.
- Grafik "Tematik Desa Digital" (slide 3, `image21.png`) sengaja tidak
  disalin — tampak seperti aset ilustrasi generik dari template
  presentasi, bukan foto/dokumentasi milik project ini.
