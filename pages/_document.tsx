import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta name="description" content="AI-powered trading dashboard with TradingView integration" />
        <meta name="keywords" content="trading, AI, binary options, forex, tradingview" />
        <meta name="author" content="TRADAI" />
        <link rel="icon" href="/favicon.ico" />
        
        {/* Preload TradingView script */}
        <link rel="preconnect" href="https://s3.tradingview.com" />
        <link rel="dns-prefetch" href="https://s3.tradingview.com" />
        
        {/* Additional trading-related meta tags */}
        <meta property="og:title" content="TRADAI - AI Trading Dashboard" />
        <meta property="og:description" content="Professional AI-powered trading dashboard with real-time signals" />
        <meta property="og:type" content="website" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}