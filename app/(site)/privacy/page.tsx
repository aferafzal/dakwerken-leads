import type { Metadata } from 'next'
import Link from 'next/link'
import { BEDRIJF, BEDRIJF_ADRES } from '@/lib/bedrijf'

export const metadata: Metadata = {
  title: 'Privacyverklaring',
  description: `Hoe ${BEDRIJF.handelsnaam} omgaat met uw gegevens wanneer u een dakrapport of offerte aanvraagt.`,
}

const LAATST_BIJGEWERKT = '15 oktober 2026'

function Blok({ titel, children }: { titel: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-bold text-gray-900 text-balance">{titel}</h2>
      <div className="space-y-3 text-base leading-relaxed text-gray-700">{children}</div>
    </section>
  )
}

export default function PrivacyPage() {
  return (
    <>
      <section className="bg-navy pt-32 pb-12 text-white">
        <div className="mx-auto max-w-2xl px-4 sm:px-6">
          <h1 className="text-4xl font-black tracking-tight text-balance">Privacyverklaring</h1>
          <p className="mt-3 text-white/70">Laatst bijgewerkt op {LAATST_BIJGEWERKT}</p>
        </div>
      </section>

      <article className="mx-auto max-w-2xl px-4 sm:px-6 py-14 space-y-10">
        <p className="text-lg leading-relaxed text-gray-700">
          Op deze site vraagt u een gratis dakrapport aan en, als u dat wilt, een offerte. Daarvoor
          hebben we enkele gegevens van u nodig. Hieronder leest u welke, waarvoor we ze gebruiken
          en wat uw rechten zijn.
        </p>

        <Blok titel="Wie is verantwoordelijk voor uw gegevens?">
          <p>
            {BEDRIJF.handelsnaam} is een handelsnaam van {BEDRIJF.naam}{' '}
            ({BEDRIJF.rechtsvorm.toLowerCase()}), {BEDRIJF_ADRES}, ondernemingsnummer{' '}
            {BEDRIJF.ondernemingsnummer}.
          </p>
          <p>
            Vragen over uw gegevens stuurt u naar{' '}
            <a href={`mailto:${BEDRIJF.email}`} className="font-medium text-gray-900 underline underline-offset-2">
              {BEDRIJF.email}
            </a>.
          </p>
        </Blok>

        <Blok titel="Welke gegevens verzamelen we?">
          <ul className="list-disc space-y-2 pl-5 marker:text-gray-400">
            <li>
              Het adres van uw woning en wat we daaruit over uw dak berekenen: perceel,
              oppervlakte, hoogte en een 3D-model.
            </li>
            <li>Uw e-mailadres, om u het rapport te sturen.</li>
            <li>
              Uw antwoorden op de extra vragen, als u die invult: bouwjaar, laatste dakwerken,
              lekkage en de werken die u overweegt.
            </li>
            <li>
              Als u gebeld wilt worden of een offerte aanvraagt: uw naam, telefoonnummer,
              gemeente, het soort probleem en wanneer we u best bellen.
            </li>
            <li>Als u de chat gebruikt: uw naam, eventueel uw e-mailadres en uw berichten.</li>
          </ul>
        </Blok>

        <Blok titel="Waarvoor gebruiken we ze?">
          <ul className="list-disc space-y-2 pl-5 marker:text-gray-400">
            <li>Om uw dakrapport te maken en naar u te sturen.</li>
            <li>Om u te laten terugbellen en een offerte te laten opmaken, als u daarom vraagt.</li>
            <li>Om uw vragen in de chat of via WhatsApp te beantwoorden.</li>
            <li>
              Om u updates en aanbiedingen te sturen, maar alleen als u daar apart toestemming voor
              gaf. Die toestemming kunt u altijd intrekken.
            </li>
          </ul>
          <p>
            Voor het rapport, het terugbellen en de offerte gebruiken we uw gegevens omdat u daar
            zelf om vraagt (artikel 6.1.b AVG). Voor updates en aanbiedingen is uw toestemming de
            grondslag (artikel 6.1.a AVG).
          </p>
        </Blok>

        <Blok titel="Met wie delen we ze?">
          <p>
            <strong className="font-semibold text-gray-900">Een dakwerker uit ons netwerk.</strong>{' '}
            We voeren de werken niet zelf uit. Vraagt u een offerte aan of wilt u gebeld worden, dan
            geven we uw gegevens en uw dakrapport door aan een gecertificeerde dakwerker uit ons
            netwerk in uw regio, zodat die contact met u kan opnemen.
          </p>
          <p>
            <strong className="font-semibold text-gray-900">Dienstverleners die de site laten werken.</strong>{' '}
            Zij verwerken gegevens alleen in onze opdracht: Vercel (hosting en opslag), Supabase
            (database), Resend (verzending van e-mails) en Modal (berekening van het 3D-model).
          </p>
          <p>
            <strong className="font-semibold text-gray-900">Openbare kaartdiensten.</strong>{' '}
            Om uw dak op te zoeken, sturen we het adres naar de geografische diensten van de Vlaamse
            overheid. Op de rapportpagina tonen we een straatbeeld van Google Street View. Google
            ontvangt daarvoor de ligging van de woning en uw IP-adres.
          </p>
          <p>
            Sommige van deze dienstverleners kunnen gegevens buiten de Europese Economische Ruimte
            verwerken. Dat gebeurt dan met de waarborgen die de AVG daarvoor voorziet, zoals de
            modelcontractbepalingen van de Europese Commissie.
          </p>
        </Blok>

        <Blok titel="Hoe lang bewaren we ze?">
          <p>
            Zolang nodig voor uw aanvraag en de opvolging ervan, en ten hoogste 2 jaar na ons
            laatste contact. Gegevens die we wettelijk moeten bijhouden, zoals boekhoudstukken,
            bewaren we zo lang als de wet het vraagt.
          </p>
        </Blok>

        <Blok titel="Cookies">
          <p>
            Deze site gebruikt geen cookies om u te volgen of advertenties te tonen. Het straatbeeld
            van Google op de rapportpagina kan wel cookies van Google plaatsen.
          </p>
        </Blok>

        <Blok titel="Uw rechten">
          <p>
            U mag uw gegevens inkijken, laten verbeteren of laten wissen. U kunt ook vragen om het
            gebruik te beperken, bezwaar maken, uw gegevens in een gangbaar formaat opvragen en uw
            toestemming intrekken. Mail daarvoor naar{' '}
            <a href={`mailto:${BEDRIJF.email}`} className="font-medium text-gray-900 underline underline-offset-2">
              {BEDRIJF.email}
            </a>. We antwoorden binnen een maand.
          </p>
          <p>
            Bent u niet tevreden over hoe we met uw gegevens omgaan, dan kunt u klacht indienen bij
            de Gegevensbeschermingsautoriteit, Drukpersstraat 35, 1000 Brussel,{' '}
            <a
              href="https://www.gegevensbeschermingsautoriteit.be"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-gray-900 underline underline-offset-2"
            >
              gegevensbeschermingsautoriteit.be
            </a>.
          </p>
        </Blok>

        <Blok titel="Wijzigingen">
          <p>
            Passen we deze verklaring aan, dan ziet u dat aan de datum bovenaan deze pagina.
          </p>
        </Blok>

        <p className="border-t border-gray-200 pt-8">
          <Link href="/" className="font-semibold text-gray-900 underline underline-offset-2">
            Terug naar de homepage
          </Link>
        </p>
      </article>
    </>
  )
}
