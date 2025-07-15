// API route to test Next.js setup
import type { NextApiRequest, NextApiResponse } from 'next';

type Data = {
  message: string;
  timestamp: number;
  status: string;
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  res.status(200).json({
    message: 'TRADAI API is healthy',
    timestamp: Date.now(),
    status: 'OK'
  });
}