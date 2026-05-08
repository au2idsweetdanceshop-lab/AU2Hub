export default function handler(req, res) {
  const daftarVideo = [
    {
      id: 'vid-01',
      caption: 'Review Joki Ballroom AU2ID - 100% Aman',
      file_id: 'BAACAgUAAxkBAAEpCwpp_jkrBzWZxIwUrvnoIX0Fe21cwgACHhwAAo788Fd8NusBjfzGzDsE'
    }
  ];

  res.status(200).json(daftarVideo);
}
