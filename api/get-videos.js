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
        file_id: 'BAACAgUAAxkBAAEpC1Zp_kQ3wwEzC85NpzIV2khCmBrRKgACdhwAAo788FeCG0WLpowlhzsE' 
      },
      {
        id: 'vid-08',
        caption: 'ada aku disini😇🤩🤩🤩',
        file_id: 'BAACAgUAAxkBAAEpC1pp_kUExCI9990dhfwniRUnoUwrmwACdxwAAo788FcYVmB7GvjzpDsE'
      },
      {
        id: 'vid-09',
        caption: '🙂🙂🙂',
        file_id: 'BAACAgUAAxkBAAEpC2pp_ka39s32vqeZBnnwxuxe_94IQQACeRwAAo788FeeL8OFhvv47TsE'
      },
      {
        id: 'vid-10',
        caption: 'baca yang betol😭😭😭',
        file_id: 'BAACAgUAAxkBAAEpC15p_kXyA7TeWlIl0GkwyHQIH2Z6_wACeBwAAo788FfBt5HYAuLJaTsE'
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
