/* Konfigurasi FORUM WHL (Firebase). v2.13-beta = PRODUKSI: project "WHL App" (whl-app-27862, paket Spark, Firestore asia-southeast2).
 * Di server uji lokal (WHL_KONFIG.UJI) otomatis pindah ke Firebase Emulator (project tiruan demo-whl-forum) — APK tidak pernah UJI.
 * Sesudah Reza membuat project Firebase (lihat C:\claude ai\Upgrade\forum-12nov\PAKET-DEPLOY.txt), ganti:
 *   mode: 'produksi', firebase: {...} = isi "Konfigurasi SDK" app Web dari Firebase Console (nilai ini BUKAN rahasia; keamanan ada di aturan Firestore),
 *   media: 'firestore' (gratis, paket Spark) atau 'storage' (perlu paket Blaze).
 * APK mode uji JANGAN disebar: di HP sungguhan emulator laptop tidak terjangkau.
 */
window.WHL_FORUM_KONFIG = {
  aktif: true,
  mode: 'produksi', // 'emulator' | 'produksi'
  firebase: {"apiKey": "AIzaSyB3Q5O6vnQcQfbpNNIbpWgJveXZO_NaSxw", "authDomain": "whl-app-27862.firebaseapp.com", "projectId": "whl-app-27862", "storageBucket": "whl-app-27862.firebasestorage.app", "messagingSenderId": "767196688829", "appId": "1:767196688829:web:81f7db8ae4304250e1a2d4"}, // dari Firebase Console (BUKAN rahasia; keamanan = aturan Firestore)
  emulator: { host: '', auth: 9099, firestore: 8080, storage: 9199 }, // host '' = otomatis: 127.0.0.1 di browser uji, 10.0.2.2 di emulator Android Studio
  /* v3.4 web push (iPhone PWA): kunci publik VAPID dari Firebase Console > Project settings > Cloud Messaging > Web configuration > Web Push certificates.
     BUKAN rahasia (kunci publik). Kosong = tombol notifikasi di PWA menulis "kunci belum dipasang". */
  vapid: 'BOj4K3a9_d2hTkfRobqZn_0XokmcsjL7_3I-st_Yg2j8KKgOecAEkWVVjK0gOVHDOR3foBnHWGjC_o287X95mUg',
  media: 'firestore', // 'firestore' = foto/suara disimpan base64 di Firestore (gratis Spark) · 'storage' = Cloud Storage (perlu Blaze)
  ruang: [
    { id: 'umum', nama: 'Umum WHL', ic: '📣', ket: 'Semua karyawan' },
    { id: 'pengawas', nama: 'Pengawas', ic: '🦺', ket: 'Pengawas, HSE, pimpinan' },
    { id: 'mekanik', nama: 'Mekanik', ic: '🔧', ket: 'Mekanik & pengawas' },
    { id: 'fuelman', nama: 'Fuelman & Logistik', ic: '⛽', ket: 'Solar, gudang' },
    { id: 'admin', nama: 'Admin', ic: '🗂️', ket: 'Admin DO, HR & HSE' },
    { id: 'kantor', nama: 'Kantor', ic: '🏢', ket: 'Staf kantor' }
  ],
  dmAktif: false // pesan langsung 1-1: DITUNDA (belum dibangun)
};
if (window.WHL_KONFIG && window.WHL_KONFIG.UJI) { // hanya di server uji lokal (localhost:port) -> emulator, jangan sentuh project produksi
  window.WHL_FORUM_KONFIG.mode = 'emulator';
  window.WHL_FORUM_KONFIG.firebase = { apiKey: 'demo-api-key', authDomain: 'demo-whl-forum.firebaseapp.com', projectId: 'demo-whl-forum', storageBucket: 'demo-whl-forum.appspot.com', appId: '1:000000000000:web:demo' };
}
