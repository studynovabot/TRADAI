export default function handler(req, res) {
  console.log('Test API called');
  res.status(200).json({ message: 'Test API working', method: req.method });
}
