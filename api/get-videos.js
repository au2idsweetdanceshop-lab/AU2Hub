export default function handler(req, res) {
  try {
    const videoList = [
      {
        id: 'vid-01',
        caption: 'bernadya😍',
        file_id: 'BAACAgUAAxkBAAEpCwpp_jkrBzWZxIwUrvnoIX0Fe21cwgACHhwAAo788Fd8NusBjfzGzDsE'
      },
      {
        id: 'vid-02',
        caption: 'kediriku❤',
        file_id: 'BAACAgUAAxkBAAEpCylp_j9VEmcpPxeOnFMcmKCqtn7tEgACGhwAAo788FepuhsTxIbOMDsE'
      },
      {
        id: 'vid-03',
        caption: 'sleman kota kecil kebanggan😍',
        file_id: 'BAACAgUAAxkBAAEpC0Bp_j_qU7gDNaJfEHfIWkiSbF46TwACGRwAAo788Fe0V3hlX8jJRDsE'
      },
      {
        id: 'vid-04',
        caption: 'say you want the moon🤩',
        file_id: 'BAACAgUAAxkBAAEpC0Zp_kBTNfQOrvNaEL6773YqmT8qHAACNhwAAo788Ff4mE5vZLBOrDsE'
      },
      {
        id: 'vid-05',
        caption: 'frekuensi 17.1',
        file_id: 'BAACAgUAAxkBAAEpC09p_kD--Rh6JLHQX6hzmjvak0pMTwACdBwAAo788FePlD6EpuOsvTsE'
      },
      {
        id: 'vid-06',
        caption: 'sampai dimasa ini🥺🥺🥺',
        file_id: 'BAACAgUAAxkBAAEpC1Np_kHktRRWhLSDk4myyaCwIOQdsAACdRwAAo788FcPiEXe7DUvoTsE'
      },
      {
        id: 'vid-07',
        caption: '💕💕💕',
        // JANGAN LUPA: Isi ID untuk video yang terakhir ini ya!
        file_id: 'ISI_KODE_VIDEO_TERAKHIR_DISINI' 
      }
    ];

    // Logika pengacak (Shuffle)
    const shuffledVideos = [...videoList].sort(() => Math.random() - 0.5);

    // Mengirim daftar video yang sudah diacak
    res.status(200).json(shuffledVideos);

  } catch (error) {
    res.status(500).json({ error: "Terjadi kesalahan pada server." });
  }
}
