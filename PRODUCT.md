# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Huiseigenaars in Oost-Vlaanderen die een renovatie of isolatie van hun dak plannen. Ze oriënteren zich op kosten en premies, zonder acute druk: ze willen weten hoe hun dak ervoor staat en wat werken zouden kosten, voordat ze een dakwerker over de vloer halen.

## Product Purpose

Een gratis dakrapport voor de eigen woning, berekend uit officiële Vlaamse gegevens. De bezoeker vult een adres in, duidt het dak aan op de kaart en krijgt een rapport met 3D-model, oppervlakte, kostenindicatie per soort werk, mogelijke premies en aandachtspunten. Wie daarna verder wil, wordt in contact gebracht met een gecertificeerde dakwerker uit het partnernetwerk.

Succes: een aangevraagd rapport (e-mailadres) en een belafspraak of offerteaanvraag (telefoonnummer) zijn even waardevol. Geen van beide wordt afgedwongen.

## Positioning

Rapport eerst, aannemer later. Waar andere dakwerkersites meteen een offerteformulier tonen, krijgt de bezoeker hier eerst iets wat geen offerteformulier kan: metingen van het eigen dak uit de Vlaamse 3D-gebouwkaart (GRB), laserhoogtemetingen (DHMV) en een 3D-model per woning. De dakwerker komt pas in beeld als de bezoeker dat zelf wil.

## Operating Context

- Uitbater en verwerkingsverantwoordelijke: AOA Management CommV; "Dakwerken Oost-Vlaanderen" is een handelsnaam (gegevens in `lib/bedrijf.ts`).
- AOA voert de werken niet zelf uit. Aanvragen gaan naar een gecertificeerde partner-dakwerker uit de regio.
- Contactkanalen: de rapportfunnel, een offerteformulier op 15 stadspagina's (`/dakwerken-<stad>`), telefoon, WhatsApp en een chatwidget.
- Het rapport is een webpagina (`/rapport/[sessionId]`) waarvan de link meteen per e-mail vertrekt. Optionele vragen (bouwjaar, laatste werken, lekkage) voegen aandachtspunten toe.
- Werkgebied: Oost-Vlaanderen.

## Capabilities and Constraints

- Next.js 16 (App Router), Tailwind v4, Supabase, Resend, Vercel (Blob), Modal voor de 3D-berekening; kaarten via de geografische diensten van de Vlaamse overheid, straatbeeld via Google Street View.
- Funnel: adres → dak aanduiden → resultaat → e-mail (rapport verstuurd) → optionele vragen → optioneel telefoon. Voor de bezoeker zijn dat 3 stappen tot het rapport.
- Het 3D-model duurt 30–90 seconden; metingen zijn benaderingen (±).
- Open: gaat een aanvraag naar één partner of naar meerdere? Bewaartermijn (voorstel: 2 jaar na laatste contact) en de EER-formulering in de privacyverklaring wachten op bevestiging.

## Brand Commitments

- Handelsnaam "Dakwerken Oost-Vlaanderen"; Nederlands (België), de lezer wordt met "u" aangesproken.
- Bevestigde claims, en alleen deze: "Offerte binnen 2 uur" (op werkdagen) en "Gecertificeerde dakwerkers".
- Niet gebruiken: klantenaantallen, garantietermijnen, "jarenlange ervaring", hersteltermijnen en "onafhankelijk" over partners.
- Claimbeleid: geen gegenereerd beeld als realisatie, geen plaatsnaam bij een AI-beeld.
- Duidelijk over de rol: wij bemiddelen, de partner voert uit ("dakwerkers uit ons netwerk", niet "onze dakwerkers").
- De huidige look blijft: hero met een bewegend dronebeeld van een dak, donkere overlay en één eenvoudige call to action. Verbeteringen gebeuren binnen die stijl; een volledig nieuwe visuele richting is uitdrukkelijk afgewezen (oktober 2026).

## Evidence on Hand

- Het product zelf: echte metingen, luchtfoto's en 3D-modellen per adres.
- Toegezegd, nog aan te leveren: echte projectfoto's van partner-dakwerkers en echte (geanonimiseerde of met toestemming gedeelde) dakrapporten.
- Afwezig, dus niet verzinnen: reviews, klantenaantallen, garanties.
- `public/generated/*` bevat AI-beelden; die mogen niet als realisatie of bewijs gebruikt worden.

## Product Principles

1. Het rapport is het product: eerst waarde geven, pas daarna om gegevens of een gesprek vragen.
2. Alleen tonen wat we kunnen bewijzen; bij twijfel weglaten.
3. Altijd duidelijk wie wie is: AOA bemiddelt, een gecertificeerde partner voert uit.
4. Rustig en informatief, zonder angst of tijdsdruk: wie hier komt, plant een renovatie en is niet in nood.
5. E-mail en telefoon zijn gelijkwaardige uitkomsten; niemand wordt naar de telefoon geduwd.
