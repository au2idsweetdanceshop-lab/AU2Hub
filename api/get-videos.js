export default function handler(req, res) {
  const daftarVideo = [
const videoList = [
  {
    id: 'AU2Hub',
    caption: 'bernadya😍',
    file_id: 'BAACAgUAAxkBAAEpCwpp_jkrBzWZxIwUrvnoIX0Fe21cwgACHhwAAo788Fd8NusBjfzGzDsE'
  },
  {
    id: 'AU2Hub',
    caption: 'kediriku❤',
    file_id: 'BAACAgUAAxkBAAEpCylp_j9VEmcpPxeOnFMcmKCqtn7tEgACGhwAAo788FepuhsTxIbOMDsE'
  },
  {
    id: 'AU2Hub',
    caption: 'sleman kota kecil kebanggan😍',
    file_id: 'BAACAgUAAxkBAAEpC0Bp_j_qU7gDNaJfEHfIWkiSbF46TwACGRwAAo788Fe0V3hlX8jJRDsE'
  },
  {
    id: 'AU2Hub',
    caption: 'say you want the moon🤩',
    file_id: 'BAACAgUAAxkBAAEpC0Zp_kBTNfQOrvNaEL6773YqmT8qHAACNhwAAo788Ff4mE5vZLBOrDsE'
  },
  {
    id: 'AU2Hub',
    caption: 'frekuensi 17.1',
    file_id: 'BAACAgUAAxkBAAEpC09p_kD--Rh6JLHQX6hzmjvak0pMTwACdBwAAo788FePlD6EpuOsvTsE'
  },
  {
    id: 'AU2Hub',
    caption: 'sampai dimasa ini🥺🥺🥺',
    file_id: 'BAACAgUAAxkBAAEpC1Np_kHktRRWhLSDk4myyaCwIOQdsAACdRwAAo788FcPiEXe7DUvoTsE'
  },
  {
    id: 'AU2Hub',
    caption: '💕💕💕',
    file_id: 'BAACAgUAAxkBAAEpC1Zp_kQ3wwEzC85NpzIV2khCmBrRKgACdhwAAo788FeCG0WLpowlhzsE'
  },
  {
    id: 'AU2Hub',
    caption: '🙂🙂🙂',
    file_id: 'BAACAgUAAxkBAAEpC1pp_kUExCI9990dhfwniRUnoUwrmwACdxwAAo788FcYVmB7GvjzpDsE'
  },
  {
    id: 'AU2Hub',
    caption: 'ada aku disini😇🤩🤩🤩',
    file_id: 'BAACAgUAAxkBAAEpC15p_kXyA7TeWlIl0GkwyHQIH2Z6_wACeBwAAo788FfBt5HYAuLJaTsE'
  },
  {
    id: 'AU2Hub',
    caption: 'baca yang betol😭😭😭',
    file_id: 'BAACAgUAAxkBAAEpC2pp_ka39s32vqeZBnnwxuxe_94IQQACeRwAAo788FeeL8OFhvv47TsE'
  }
];
    // Tambah video baru di sini terus ke bawah...
  ];
  const videoAcak = daftarVideo.sort(() => Math.random() - 0.5);
  res.status(200).json(videoAcak);
}
