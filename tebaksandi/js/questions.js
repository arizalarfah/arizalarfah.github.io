(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Questions = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  return [
    {
      level: 'pemula',
      title: 'Sarapan yang Menggugah',
      image: 'img/pemula-clue.svg',
      narrativeHtml:
        'T<b>e</b>rlihat sarapa<b>n</b> pagi in<b>i</b> yang sederhana namun ' +
        'meng<b>g</b>ugah, karena racikan bu<b>m</b>bu rahasi<b>a</b> membuat ' +
        'semua orang ketagihan setiap pagi.',
      hint: 'Petunjuk: baca huruf-huruf yang dicetak tebal secara berurutan.',
      answerHash: '67a4f45f0d1d9bc606486fc42dc4941668e71d34ee500735fe9b7ea4625c687c',
      explanation: {
        bukti:
          'T<b>e</b>rlihat sarapa<b>n</b> pagi in<b>i</b> yang sederhana namun ' +
          'meng<b>g</b>ugah, karena racikan bu<b>m</b>bu rahasi<b>a</b> membuat ' +
          'semua orang ketagihan setiap pagi. Huruf tebal membentuk kata ' +
          '<strong>enigma</strong>.',
        fakta: {
          image: 'img/enigma-fakta.svg',
          text:
            'Mesin Enigma adalah mesin enkripsi elektromekanis yang digunakan ' +
            'militer Jerman pada Perang Dunia II. Sekutu berhasil memecahkan ' +
            'sandinya berkat kerja Alan Turing dan tim di Bletchley Park, salah ' +
            'satu tonggak sejarah kriptografi modern.',
        },
      },
    },
    {
      level: 'ahli',
      title: 'Kiper yang Tangguh',
      image: 'img/ahli-clue.svg',
      narrativeHtml:
        'Seorang kiper legendaris dikenal sebagai sosok yang <b>Tangguh</b> ' +
        'saat menghadapi adu penalti. Julius Caesar, panglima Romawi yang ' +
        'menginspirasi salah satu sandi klasik tertua, dikenal selalu ' +
        'memerintahkan pasukannya maju 3 langkah sebelum menyerang untuk ' +
        'mengacaukan hitungan lawan. Gunakan kebiasaan itu untuk menyandikan ' +
        'kata kunci di atas.',
      hint:
        'Petunjuk: geser tiap huruf pada kata yang dicetak tebal maju 3 posisi ' +
        'pada alfabet (Caesar Cipher), lalu ketik hasilnya.',
      answerHash: '9933f8a5a1373636535db6364fb71cf63f773f6a3b396e5cd1e77b897755e39b',
      explanation: {
        bukti:
          'Kata kunci <strong>Tangguh</strong> digeser maju 3 huruf menjadi ' +
          '<strong>Wdqjjxk</strong> — itulah kata sandinya.',
        fakta: {
          image: null,
          text:
            'Caesar Cipher adalah salah satu teknik penyandian substitusi ' +
            'tertua, dinamai dari Julius Caesar yang konon memakainya untuk ' +
            'mengirim pesan rahasia ke jenderalnya. Setiap huruf digeser ' +
            'sejumlah posisi tetap pada alfabet — mudah dipecahkan, namun ' +
            'menjadi fondasi banyak sandi klasik sesudahnya.',
        },
      },
    },
    {
      level: 'dewa',
      title: 'Sungai yang Tersembunyi',
      image: 'img/dewa-clue.svg',
      narrativeHtml:
        'Sebuah kliping berita lama menyebut banjir di Kali Ciliwung — tapi ' +
        'itu jebakan. Kode <b>7Kt10KBptnprVJt1m</b> ditemukan bersama daftar ' +
        'wilayah yang dilalui satu sungai besar di Jawa Timur: Kota Batu, ' +
        'Blitar, Kediri, Jombang, Mojokerto, Sidoarjo, hingga Surabaya, ' +
        'membentang sekitar 320 km dari hulu ke hilir.',
      hint:
        'Petunjuk: abaikan foto beritanya — cocokkan daftar kota di atas ' +
        'dengan satu nama sungai besar di Jawa Timur.',
      answerHash: '42c9097a71ac7d8055ec281afd73ddc919915b7c071836d34399ccfc43d40fc9',
      explanation: {
        bukti:
          'Kota Batu, Blitar, Kediri, Jombang, Mojokerto, Sidoarjo, dan ' +
          'Surabaya semuanya dilalui satu sungai yang sama sepanjang ' +
          'sekitar 320 km: <strong>Brantas</strong>. Kode acak dan foto ' +
          'berita Ciliwung hanyalah jebakan.',
        fakta: {
          image: null,
          text:
            'Sungai Brantas adalah sungai terpanjang kedua di Pulau Jawa, ' +
            'mengalir sekitar 320 km dari Kota Batu hingga bermuara di ' +
            'Selat Madura, melintasi banyak kota dan kabupaten di Jawa ' +
            'Timur. Dalam kriptanalisis dunia nyata, memecahkan sandi ' +
            'sering kali butuh pengetahuan di luar teks itu sendiri — ' +
            'persis seperti wawasan geografi yang dipakai di sini.',
        },
      },
    },
  ];
});
