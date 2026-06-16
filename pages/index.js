import Head from 'next/head'
import { CopilotModal } from '../components/CopilotModal'

export default function Home() {
  return (
    <>
      <Head>
        <title>AI Earpiece</title>
        <meta name="description" content="Live sales coaching for software and web development client calls" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        }}
        className="px-4 py-6 sm:px-6 lg:px-8"
      >
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl flex-col gap-6">
          <header className="flex flex-col gap-3 text-white sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium text-cyan-200">Win more software & website projects</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">AI Earpiece</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-300">
                Real-time coaching while you sell custom software and website redesigns to client companies. Press the mic once to start.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
              Powered by AssemblyAI + GPT-4o
            </div>
          </header>

          <div className="min-h-0 flex-1">
            <CopilotModal />
          </div>
        </div>
      </main>
    </>
  )
}
