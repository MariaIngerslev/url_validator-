const SECURITY_POST = {
    title: 'Defense in Depth: Sådan hærdede jeg platformen lag for lag',
    heroImage: '/images/blog/security.png',
    content: `<h2>1. Sikkerhed er ikke en eftertanke</h2>

<p>Sikkerhed er ikke noget, man skruer på til sidst — det er en disciplin, man bygger ind i hvert lag af systemet. Dette indlæg dokumenterer en serie målrettede hærdningstiltag, jeg for nylig har sendt afsted til denne platform, forklarer den trussel, hvert enkelt tiltag adresserer, og beskriver, hvordan de tilsammen udgør et lagdelt forsvar.</p>

<p>Uanset om du er udvikler med interesse for de tekniske detaljer, eller blot en bruger, der vil vide, at platformen tages seriøst — så er dette indlæg til dig.</p>

<h2>2. Globale sikkerhedsheaders med Helmet og en skrap Content Security Policy</h2>

<p><strong>Truslen: clickjacking og indholdsinjektion</strong></p>

<p>Uden eksplicitte HTTP-sikkerhedsheaders anvender browsere permissive standardindstillinger. Den farligste er fraværet af frame-beskyttelse: enhver tredjeparts hjemmeside kan indlejre denne applikation i en transparent <code>&lt;iframe&gt;</code>, lægge en falsk brugerflade henover og narre brugere til at klikke på knapper eller indsende formularer, de aldrig havde til hensigt. Det kaldes <em>clickjacking</em> — en form for UI-manipulation brugt i phishing-kampagner og credential-tyveri.</p>

<p><strong>Hvad jeg skaffede</strong></p>

<p>Jeg tilføjede <strong>Helmet</strong>, et velafprøvet Express-middleware, der sætter en suite af HTTP-sikkerhedsheaders på alle forespørgsler. Ovenpå Helmets fornuftige standarder konfigurerede jeg en skrap <strong>Content Security Policy (CSP)</strong>:</p>

<pre><code>Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' https:;
  connect-src 'self';
  object-src 'none';
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';</code></pre>

<p>De vigtigste direktiver:</p>
<ul>
    <li><code>frame-ancestors 'none'</code> — forhindrer applikationen i at blive indlejret i en iframe på ethvert domæne og blokerer dermed clickjacking fuldstændigt.</li>
    <li><code>object-src 'none'</code> — forbyder Flash, Java-applets og andet legacy plugin-indhold.</li>
    <li><code>script-src 'self'</code> — kun scripts serveret fra dette domæne må køre; ingen CDN-injicerede scripts.</li>
    <li><code>base-uri 'self'</code> — forhindrer base-tag-kapring, hvor en angriber injicerer et <code>&lt;base&gt;</code>-tag for at omdirigere alle relative URL'er.</li>
    <li><code>form-action 'self'</code> — formularindsendelser kan kun sendes til dette domæne.</li>
</ul>

<p>Helmet sætter desuden <code>X-Content-Type-Options: nosniff</code> (forhindrer MIME-type-sniffing) og en <code>Referrer-Policy</code> på <code>strict-origin-when-cross-origin</code>, der begrænser, hvor meget URL-information der lækker til tredjeparts-servere, når brugere følger eksterne links. Tilsammen fortæller disse headers browseren præcis, hvad der er tilladt — og hvad der ikke er.</p>

<h2>3. CSRF-beskyttelse via Origin- og Referer-validering</h2>

<p><strong>Truslen: cross-site request forgery</strong></p>

<p>Selv uden cookies eller sessioner kan en ondsindet hjemmeside lydløst udløse tilstandsændrende forespørgsler mod dette API på vegne af en intetanende besøgende. En skjult formular eller et baggrunds-<code>fetch()</code>-kald fra <code>evil-site.com</code> kunne indsende en kommentar eller kontaktbesked ved brug af offerets browser — og dermed udgive sig for at være dem.</p>

<p><strong>Hvad jeg skaffede</strong></p>

<p>Jeg tilføjede et letvægts-middleware, der inspicerer <code>Origin</code>- og <code>Referer</code>-headers på alle muterende forespørgsler (<code>POST</code>, <code>PUT</code>, <code>PATCH</code>, <code>DELETE</code>) mod <code>/api</code>-navnerummet:</p>

<pre><code>app.use('/api', (req, res, next) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        const origin = req.get('Origin') || req.get('Referer') || '';
        if (origin && !origin.startsWith(\`http://localhost:\${PORT}\`)) {
            return res.status(403).json({ error: 'Forbidden: cross-origin mutation not allowed.' });
        }
    }
    next();
});</code></pre>

<p>Browsere vedhæfter automatisk <code>Origin</code>- og <code>Referer</code>-headers på tværs af domæner og forhindrer kritisk nok JavaScript i at forfalske dem. En forespørgsel fra <code>evil-site.com</code> bærer den oprindelse og afvises med <code>403 Forbidden</code>, inden den når nogen route-handler. Legitime forespørgsler fra applikationens eget frontend bærer den korrekte oprindelse og passerer uændret igennem.</p>

<h2>4. Hastighedsbegrænsning på kommentar- og beskedendepunkter</h2>

<p><strong>Truslen: spam og lammelsesangreb</strong></p>

<p>Ubegrænsede offentlige POST-endepunkter er en åben invitation til misbrug — automatiserede bots kan oversvømme databasen med spam-kommentarer, opbruge serverressourcer eller forringe oplevelsen for legitime brugere. Uden hastighedsbegrænsning kan et enkelt script indsende tusindvis af forespørgsler i minuttet.</p>

<p><strong>Hvad jeg skaffede</strong></p>

<p>Jeg integrerede <strong>express-rate-limit</strong> med per-endepunkts-politikker:</p>
<ul>
    <li><code>POST /api/comments</code> — 10 forespørgsler per minut per IP</li>
    <li><code>POST /api/messages</code> — 5 forespørgsler per minut per IP</li>
</ul>

<p>Når en klient overskrider sin kvote, svarer serveren med <code>429 Too Many Requests</code> og standard <code>RateLimit-*</code>-headers, så velopdragne klienter kan tilpasse deres genprøvningslogik. Legitime menneskelige brugere kommer aldrig i nærheden af disse grænser — de eksisterer udelukkende for at afskrække automatiseret misbrug.</p>

<h2>5. Per-element type-validering på URL-validerings-API'et</h2>

<p><strong>Truslen: misdannet input forårsager servernedbrud</strong></p>

<p>Endepunktet <code>/api/validate-urls</code> verificerede tidligere, at request-body'en indeholdt et ikke-tomt array, men validerede ikke <em>typen</em> af hvert element inde i det. Et request-body som <code>{"urls": [null, {}, 123]}</code> ville passere den ydre tjek og nå URL-validatoren, som kalder <code>.toLowerCase()</code> på hvert element. At kalde <code>.toLowerCase()</code> på <code>null</code> kaster en <code>TypeError</code> og producerer en uhåndteret <code>500 Internal Server Error</code> i stedet for en ren <code>400 Bad Request</code>.</p>

<p><strong>Hvad jeg skaffede</strong></p>

<p>Jeg strammede kontrollen til at validere hvert element i arrayet:</p>

<pre><code>if (!urls || !Array.isArray(urls) || urls.length === 0
    || !urls.every((u) => typeof u === 'string')) {
    return res.status(400).json({
        error: "Request body must include a non-empty 'urls' array of strings."
    });
}</code></pre>

<p><code>Array.prototype.every</code>-tjekket sikrer, at validatoren udelukkende modtager et array af strenge. Ethvert andet input afvises tidligt med en <code>400</code>, en klar fejlbesked og ingen stack trace. Det følger princippet om at <em>fejle tidligt ved grænsen</em> — validere data der, hvor de træder ind i systemet, inden de når forretningslogikken.</p>

<h2>6. Server-side HTML-stripning inden kommentarlagring</h2>

<p><strong>Truslen: lagret XSS via en fremtidig renderingsfejl</strong></p>

<p>Det klientsidede renderingslag beskytter allerede mod XSS: kommentarer vises ved hjælp af <code>element.textContent</code> (som browseren behandler som ren tekst, aldrig HTML), og blogindlægsindhold passerer gennem et strikt DOM-baseret sanitizer, der kun tillader sikre tags og attributter.</p>

<p>Disse klientsidede kontroller er korrekte og robuste. Men at stole udelukkende på renderingslaget skaber en vedligeholdelsesrisiko: hvis en fremtidig udvikler utilsigtet renderer en gemt kommentar med <code>innerHTML</code> i stedet for <code>textContent</code>, ville HTML-tags bevaret i databasen blive eksekveret som markup. Det er en klassisk <em>latent lagret XSS</em>-vektor — sårbarheden eksisterer i dataene og venter på en renderingsfejl for at aktiveres.</p>

<p><strong>Hvad jeg skaffede</strong></p>

<p>Jeg tilføjede en enkelt linje HTML-stripning på serveren, anvendt på kommentarindholdet inden det skrives til databasen:</p>

<pre><code>const strippedText = text.replace(/&lt;[^&gt;]*&gt;/g, '');
const comment = await Comment.create({ name: sanitizedName, content: strippedText, postId });</code></pre>

<p>Det ændrer ikke brugeroplevelsen — kommentarer er ren tekst, ikke rig HTML, så ingen tilsigtet formatering går tabt. Det sikrer, at uanset hvordan en fremtidig renderingssti håndterer lagret indhold, indeholder databasen aldrig eksekverbart markup. Den eksisterende klientsidede sanitering er stadig på plads; denne server-side-stripning er et selvstændigt, supplerende lag.</p>

<p>Det er lærebogsdefinitionen på <em>defense in depth</em>: multiple uafhængige kontroller, der hver er i stand til at stoppe angrebet på egen hånd, lagt i lag så ingen enkelt fejl skaber et brud.</p>

<h2>7. Hvad betyder det for dig som bruger?</h2>

<p>Ingen af disse ændringer ændrer den synlige applikationsadfærd for legitime brugere. De opererer lydløst i baggrunden, indsnævrer angrebsfladen og sikrer, at platformen degraderer nådigt under misbrug frem for at crashe.</p>

<p>Sikkerhedshærdning er en løbende proces. Har du spottet noget, har spørgsmål til disse ændringer, eller vil du diskutere implementeringen nærmere — ræk ud via kontaktsiden.</p>`
};

module.exports = SECURITY_POST;
