# Manifest gambar — Smart Irrigation

Halaman `smart-irrigation/index.html` mereferensikan file gambar berikut di
folder ini. Sebelum file-nya ada, halaman otomatis menampilkan kotak
placeholder "Gambar belum tersedia" (bukan ikon broken-image) — jadi aman
di-publish duluan dan disusul gambarnya belakangan.

Cukup taruh file dengan **nama persis** seperti di kolom pertama untuk
membuat gambar itu langsung muncul di halaman.

| Filename                     | Dipakai di bagian                        | Deskripsi / caption                                              | Sumber asli (Notion, tidak lagi bisa diakses langsung tanpa login) |
|-------------------------------|-------------------------------------------|--------------------------------------------------------------------|-----------------------------------------------------------------------|
| `01-boards-manager-url.png`   | 2.2 Install Board ke Arduino IDE          | Menempelkan URL ke kolom Additional Boards Manager URLs           | `Screenshot_2023-04-16_123302.png` |
| `02-esp8266-community-install.png` | 2.2 Install Board ke Arduino IDE     | Install board "ESP8266 Community" via Boards Manager               | `Screenshot_2023-04-16_124606.png` |
| `03-pubsubclient-install.png` | 2.2 Install Board ke Arduino IDE          | Install library "PubSubClient" via Library Manager                 | `Screenshot_2023-04-19_231320.png` |
| `04-design-hardware.png`      | 3. Design Hardware & Wiring               | Skema/desain hardware Smart Irrigation                             | `Screenshot_2023-05-23_220057.png` |
| `05-prototype-1.png`          | 6. Prototyping & Implementasi             | Foto prototipe                                                     | `Screenshot_2023-05-23_221735.png` |
| `06-prototype-2.jpg`          | 6. Prototyping & Implementasi             | Foto implementasi di lapangan                                      | `WhatsApp_Image_2023-05-05_at_10.48.01.jpg` |

## Opsional

- `cover.png` — cover/hero image dari halaman Notion asli (belum dipakai di
  `index.html`, hanya dicatat di sini untuk referensi jika ingin ditambahkan
  sebagai gambar sampul nanti): sumber asli `Screenshot_2023-04-19_233152.png`.
- File driver `DRIVER1_CH340.zip` yang dilampirkan di halaman Notion asli
  tidak diekstrak ke sini (bukan gambar, dan bukan biner yang aman di-fetch
  otomatis). Jika ingin tetap menyertakannya persis seperti dokumentasi
  aslinya, taruh salinannya sendiri di `smart-irrigation/files/DRIVER1_CH340.zip`
  dan tambahkan link ke sana dari bagian 2.1 — untuk saat ini bagian itu
  mengarah ke driver resmi WCH sebagai sumber yang bisa diverifikasi.

## Format gambar

Ekstensi di atas mengikuti asumsi paling umum (`.png`/`.jpg`); kalau file
kamu berbeda ekstensi, cukup ganti `src="img/…"` di `index.html` pada baris
`<img>` yang bersangkutan supaya cocok.
