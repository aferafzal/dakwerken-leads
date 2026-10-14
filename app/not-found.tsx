import Link from 'next/link'

export default function NotFound() {
  return (
    <>
      <section className="bg-navy pt-32 pb-12 text-white">
        <div className="mx-auto max-w-2xl px-4 sm:px-6">
          <h1 className="text-4xl font-black tracking-tight text-balance">Deze pagina bestaat niet</h1>
        </div>
      </section>
      <section className="mx-auto max-w-2xl px-4 sm:px-6 py-14">
        <p className="text-lg leading-relaxed text-gray-700">
          Misschien is de link verouderd of zit er een typfout in het adres.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center rounded-xl bg-navy px-6 py-3.5 text-sm font-bold text-white transition-colors hover:bg-navy-light"
        >
          Naar de homepage
        </Link>
      </section>
    </>
  )
}
