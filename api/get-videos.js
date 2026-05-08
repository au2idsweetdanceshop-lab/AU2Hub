export default function handler(req, res) {
  const daftarVideo = [
    {
      id: 'vid-01',
      caption: 'Review Joki Ballroom AU2ID - 100% Aman',
      file_id: 'AAMCBQADGQEDFhK7af4kTVxdieF6AT4yJltZlkyQURYAAh4cAAKO_PBXiVxpFJ40tJoBAAdtAAM7BA'
    }
  ];

  res.status(200).json(daftarVideo);
}
