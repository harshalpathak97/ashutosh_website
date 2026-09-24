import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta name="robots" content="index, follow" />
        <meta name="theme-color" content="#ff8a1f" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </Head>
      <body className="font-urbanist antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
