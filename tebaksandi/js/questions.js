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
      image: 'img/pemula-clue.jpeg',
      imageFallback: 'img/pemula-clue.svg',
      narrativeHtml:
        'T<b>e</b>rlihat sarapa<b>n</b> pagi in<b>i</b> yang sederhana namun ' +
        'meng<b>g</b>ugah, karena racikan bu<b>m</b>bu rahasi<b>a</b> membuat ' +
        'semua orang ketagihan setiap pagi.',
      answerHash: '67a4f45f0d1d9bc606486fc42dc4941668e71d34ee500735fe9b7ea4625c687c',
      explanation: {
        bukti:
          'T<b>e</b>rlihat sarapa<b>n</b> pagi in<b>i</b> yang sederhana namun ' +
          'meng<b>g</b>ugah, karena racikan bu<b>m</b>bu rahasi<b>a</b> membuat ' +
          'semua orang ketagihan setiap pagi. Huruf tebal membentuk kata ' +
          '<strong>enigma</strong>.',
        fakta: {
          image: 'img/pemula-fakta.jpeg',
          imageFallback: 'img/enigma-fakta.svg',
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
      image: 'img/ahli-clue.jpg',
      imageFallback: 'img/ahli-clue.svg',
      narrativeHtml:
        'Seorang kiper legendaris dikenal sebagai sosok yang <b>Tangguh</b> ' +
        'saat menghadapi adu penalti. Julio Caesar, panglima Romawi yang ' +
        'menginspirasi salah satu sandi klasik tertua, dikenal selalu ' +
        'memerintahkan pasukannya maju 3 langkah sebelum menyerang untuk ' +
        'mengacaukan hitungan lawan. Gunakan kebiasaan itu untuk menyandikan ' +
        'kata kunci di atas.',
      answerHash: '9933f8a5a1373636535db6364fb71cf63f773f6a3b396e5cd1e77b897755e39b',
      explanation: {
        bukti:
          'Kata kunci <strong>Tangguh</strong> digeser maju 3 huruf menjadi ' +
          '<strong>Wdqjjxk</strong> — itulah kata sandinya.',
        fakta: {
          animationHtml:
            '<p class="ts-cipher-caption">Setiap huruf pada <strong>TANGGUH</strong> ' +
            'digeser maju 3 posisi pada alfabet menjadi <strong>WDQJJXK</strong>:</p>' +
            '<svg class="ts-cipher-anim" viewBox="0 0 600 220" xmlns="http://www.w3.org/2000/svg" ' +
            'role="img" aria-label="Animasi Caesar Cipher: TANGGUH bergeser 3 huruf menjadi WDQJJXK">' +
            '<defs><marker id="ts-cipher-arrowhead" viewBox="0 0 10 10" refX="8" refY="5" ' +
            'markerWidth="6" markerHeight="6" orient="auto-start-reverse">' +
            '<path d="M0,0 L10,5 L0,10 z" class="ts-cipher-arrowhead-fill"></path>' +
            '</marker></defs>' +
            '<g class="ts-cipher-col" style="--col-delay:.1s">' +
            '<rect class="ts-cipher-box" x="10" y="20" width="60" height="50" rx="8"></rect>' +
            '<text class="ts-cipher-letter" x="40" y="52">T</text>' +
            '<line class="ts-cipher-arrow" x1="40" y1="72" x2="40" y2="148" marker-end="url(#ts-cipher-arrowhead)"></line>' +
            '<text class="ts-cipher-plus" x="58" y="112">+3</text>' +
            '<rect class="ts-cipher-box ts-cipher-box--cipher" x="10" y="150" width="60" height="50" rx="8"></rect>' +
            '<text class="ts-cipher-letter ts-cipher-letter--cipher" x="40" y="182">W</text>' +
            '</g>' +
            '<g class="ts-cipher-col" style="--col-delay:.45s">' +
            '<rect class="ts-cipher-box" x="94" y="20" width="60" height="50" rx="8"></rect>' +
            '<text class="ts-cipher-letter" x="124" y="52">A</text>' +
            '<line class="ts-cipher-arrow" x1="124" y1="72" x2="124" y2="148" marker-end="url(#ts-cipher-arrowhead)"></line>' +
            '<text class="ts-cipher-plus" x="142" y="112">+3</text>' +
            '<rect class="ts-cipher-box ts-cipher-box--cipher" x="94" y="150" width="60" height="50" rx="8"></rect>' +
            '<text class="ts-cipher-letter ts-cipher-letter--cipher" x="124" y="182">D</text>' +
            '</g>' +
            '<g class="ts-cipher-col" style="--col-delay:.8s">' +
            '<rect class="ts-cipher-box" x="178" y="20" width="60" height="50" rx="8"></rect>' +
            '<text class="ts-cipher-letter" x="208" y="52">N</text>' +
            '<line class="ts-cipher-arrow" x1="208" y1="72" x2="208" y2="148" marker-end="url(#ts-cipher-arrowhead)"></line>' +
            '<text class="ts-cipher-plus" x="226" y="112">+3</text>' +
            '<rect class="ts-cipher-box ts-cipher-box--cipher" x="178" y="150" width="60" height="50" rx="8"></rect>' +
            '<text class="ts-cipher-letter ts-cipher-letter--cipher" x="208" y="182">Q</text>' +
            '</g>' +
            '<g class="ts-cipher-col" style="--col-delay:1.15s">' +
            '<rect class="ts-cipher-box" x="262" y="20" width="60" height="50" rx="8"></rect>' +
            '<text class="ts-cipher-letter" x="292" y="52">G</text>' +
            '<line class="ts-cipher-arrow" x1="292" y1="72" x2="292" y2="148" marker-end="url(#ts-cipher-arrowhead)"></line>' +
            '<text class="ts-cipher-plus" x="310" y="112">+3</text>' +
            '<rect class="ts-cipher-box ts-cipher-box--cipher" x="262" y="150" width="60" height="50" rx="8"></rect>' +
            '<text class="ts-cipher-letter ts-cipher-letter--cipher" x="292" y="182">J</text>' +
            '</g>' +
            '<g class="ts-cipher-col" style="--col-delay:1.5s">' +
            '<rect class="ts-cipher-box" x="346" y="20" width="60" height="50" rx="8"></rect>' +
            '<text class="ts-cipher-letter" x="376" y="52">G</text>' +
            '<line class="ts-cipher-arrow" x1="376" y1="72" x2="376" y2="148" marker-end="url(#ts-cipher-arrowhead)"></line>' +
            '<text class="ts-cipher-plus" x="394" y="112">+3</text>' +
            '<rect class="ts-cipher-box ts-cipher-box--cipher" x="346" y="150" width="60" height="50" rx="8"></rect>' +
            '<text class="ts-cipher-letter ts-cipher-letter--cipher" x="376" y="182">J</text>' +
            '</g>' +
            '<g class="ts-cipher-col" style="--col-delay:1.85s">' +
            '<rect class="ts-cipher-box" x="430" y="20" width="60" height="50" rx="8"></rect>' +
            '<text class="ts-cipher-letter" x="460" y="52">U</text>' +
            '<line class="ts-cipher-arrow" x1="460" y1="72" x2="460" y2="148" marker-end="url(#ts-cipher-arrowhead)"></line>' +
            '<text class="ts-cipher-plus" x="478" y="112">+3</text>' +
            '<rect class="ts-cipher-box ts-cipher-box--cipher" x="430" y="150" width="60" height="50" rx="8"></rect>' +
            '<text class="ts-cipher-letter ts-cipher-letter--cipher" x="460" y="182">X</text>' +
            '</g>' +
            '<g class="ts-cipher-col" style="--col-delay:2.2s">' +
            '<rect class="ts-cipher-box" x="514" y="20" width="60" height="50" rx="8"></rect>' +
            '<text class="ts-cipher-letter" x="544" y="52">H</text>' +
            '<line class="ts-cipher-arrow" x1="544" y1="72" x2="544" y2="148" marker-end="url(#ts-cipher-arrowhead)"></line>' +
            '<text class="ts-cipher-plus" x="562" y="112">+3</text>' +
            '<rect class="ts-cipher-box ts-cipher-box--cipher" x="514" y="150" width="60" height="50" rx="8"></rect>' +
            '<text class="ts-cipher-letter ts-cipher-letter--cipher" x="544" y="182">K</text>' +
            '</g>' +
            '</svg>',
          image: 'img/ahli-fakta.jpeg',
          imageFallback: null,
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
      image: 'img/dewa-clue.png',
      imageFallback: 'img/dewa-clue.svg',
      narrativeHtml:
        'Sebuah kliping berita lama menyebut banjir di Kali Ciliwung — tapi ' +
        'itu jebakan. Kode <b>7Kt10KBptnprVJt1m</b> ditemukan bersama daftar ' +
        'wilayah yang dilalui satu sungai besar di Jawa Timur: Kota Batu, ' +
        'Blitar, Kediri, Jombang, Mojokerto, Sidoarjo, hingga Surabaya, ' +
        'membentang sekitar 320 km dari hulu ke hilir.',
      answerHash: '42c9097a71ac7d8055ec281afd73ddc919915b7c071836d34399ccfc43d40fc9',
      explanation: {
        bukti:
          'Kota Batu, Blitar, Kediri, Jombang, Mojokerto, Sidoarjo, dan ' +
          'Surabaya semuanya dilalui satu sungai yang sama sepanjang ' +
          'sekitar 320 km: <strong>Brantas</strong>. Kode acak dan foto ' +
          'berita Ciliwung hanyalah jebakan.',
        fakta: {
          image: 'img/dewa-fakta.jpg',
          imageFallback: null,
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
