export default function handler(req, res) {
  try {
    const videoList = [
      {
        id: 'vid-01',
        caption: 'bernadya😍',
        file_id: 'BAACAgUAAxkBAAEpC1Np_kHktRRWhLSDk4myyaCwIOQdsAACdRwAAo788FcPiEXe7DUvoTsE'
      },
      {
        id: 'vid-02',
        caption: 'kediriku❤',
        file_id: 'BAACAgUAAxkBAAEpC1Np_kHktRRWhLSDk4myyaCwIOQdsAACdRwAAo788FcPiEXe7DUvoTsE'
      },
      {
        id: 'vid-03',
        caption: 'sleman kota kecil kebanggan😍',
        file_id: 'BAACAgUAAxkBAAEpC1Np_kHktRRWhLSDk4myyaCwIOQdsAACdRwAAo788FcPiEXe7DUvoTsE'
      },
      {
        id: 'vid-04',
        caption: 'say you want the moon🤩',
        file_id: 'BAACAgUAAxkBAAEpC1Np_kHktRRWhLSDk4myyaCwIOQdsAACdRwAAo788FcPiEXe7DUvoTsE'
      },
      {
        id: 'vid-05',
        caption: 'frekuensi 17.1',
        file_id: 'BAACAgUAAxkBAAEpC1Np_kHktRRWhLSDk4myyaCwIOQdsAACdRwAAo788FcPiEXe7DUvoTsE'
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
        file_id: 'BAACAgUAAxkBAAEpC1Np_kHktRRWhLSDk4myyaCwIOQdsAACdRwAAo788FcPiEXe7DUvoTsE' 
      },
      {
        id: 'vid-08',
        caption: 'ada aku disini😇🤩🤩🤩',
        file_id: 'BAACAgUAAxkBAAEpC1Np_kHktRRWhLSDk4myyaCwIOQdsAACdRwAAo788FcPiEXe7DUvoTsE'
      },
      {
        id: 'vid-09',
        caption: '🙂🙂🙂',
        file_id: 'BAACAgUAAxkBAAEpC1Np_kHktRRWhLSDk4myyaCwIOQdsAACdRwAAo788FcPiEXe7DUvoTsE'
      },
      {
        id: 'vid-10',
        caption: 'baca yang betol😭😭😭',
        file_id: 'BAACAgUAAxkBAAEpC1Np_kHktRRWhLSDk4myyaCwIOQdsAACdRwAAo788FcPiEXe7DUvoTsE'
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
