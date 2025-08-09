import type { AppProps } from 'next/app';
import { Inter } from 'next/font/google';
import { AuthProvider } from '../hooks/useAuth';
import '../styles/globals.css';

const inter = Inter({ subsets: ['latin'] });

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <main className={inter.className}>
        <Component {...pageProps} />
      </main>
    </AuthProvider>
  );
}