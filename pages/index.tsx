import Head from 'next/head'
import dynamic from 'next/dynamic'
import { INTRO, ABOUT, WORK, CONTACT, EMAIL, LINKEDIN, RESUME_URL } from '@/components/content'

const GamePortfolio = dynamic(() => import('@/components/GamePortfolio'), { ssr: false })

const TITLE = `${INTRO.name} — ${INTRO.role}`
const DESCRIPTION = `${INTRO.headline} ${INTRO.sub}`
const URL = 'https://ashutoshpathak.com/'

export default function Home() {
  return (
    <>
      <Head>
        <title>{TITLE}</title>
        <meta name="description" content={DESCRIPTION} />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="canonical" href={URL} />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={URL} />
        <meta property="og:image" content={`${URL}og.jpg`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={TITLE} />
        <meta name="twitter:description" content={DESCRIPTION} />
        <meta name="twitter:image" content={`${URL}og.jpg`} />
      </Head>

      {/* Server-rendered content: what crawlers, screen readers and no-WebGL visitors get.
          The 3D world renders on top of it once JS + WebGL are available. */}
      <main className="max-w-2xl mx-auto px-6 py-16 text-navy">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-orange">{INTRO.role}</p>
        <h1 className="text-4xl font-black leading-tight mt-2">{INTRO.name}</h1>
        <p className="text-2xl font-bold leading-snug mt-4">{INTRO.headline}</p>
        <p className="mt-3 text-navy/75">{INTRO.sub}</p>

        <section className="mt-12">
          <h2 className="text-xl font-black">{ABOUT.title}</h2>
          <p className="mt-2 text-navy/80">{ABOUT.body}</p>
          <ul className="mt-3 list-disc pl-5">{ABOUT.skills.map((s) => <li key={s}>{s}</li>)}</ul>
        </section>

        <section className="mt-12">
          <h2 className="text-xl font-black">{WORK.tag}</h2>
          {WORK.cases.map((c) => (
            <article key={c.title} className="mt-4">
              <h3 className="font-black">{c.title}</h3>
              <p className="text-navy/80">{c.challenge} {c.approach} {c.result}</p>
            </article>
          ))}
        </section>

        <section className="mt-12">
          <h2 className="text-xl font-black">{CONTACT.title}</h2>
          <p className="mt-2 text-navy/80">{CONTACT.body}</p>
          <p className="mt-3 flex gap-4 font-bold">
            <a className="text-orange underline" href={`mailto:${EMAIL}`}>{EMAIL}</a>
            <a className="text-orange underline" href={LINKEDIN}>LinkedIn</a>
            {RESUME_URL && <a className="text-orange underline" href={RESUME_URL}>Résumé</a>}
          </p>
        </section>
      </main>

      <GamePortfolio />
    </>
  )
}
