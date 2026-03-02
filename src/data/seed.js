const SEED_POST = {
    title: 'Fra Idé til Kode: Sådan byggede jeg min egen sikre Blog App',
    content: `<img src="/images/blog/first_blog.png" alt="Fra Idé til Kode: Sådan byggede jeg min egen sikre Blog App" />

<h2>1. Baggrunden: Mit allerførste kodeprojekt</h2>

<p>Velkommen til mit allerførste blogindlæg! Det særlige ved netop dette indlæg er, at jeg selv har kodet hele platformen, det ligger på. Dette projekt har været min legeplads for at omsætte teori til praksis på 1. semester.</p>

<h2>2. Arkitekturen: En SPA fra bunden</h2>

<p>I stedet for at bruge færdige løsninger som WordPress, har jeg bygget denne applikation fra bunden (Vanilla JS og Node.js). Målet var at skabe en <strong>Single Page Application (SPA)</strong>. Det betyder, at når du navigerer rundt eller poster en kommentar, genindlæser siden ikke. Det giver en lynhurtig og app-lignende brugeroplevelse.</p>

<p>Teknisk stack:</p>
<ul>
    <li><strong>Frontend:</strong> HTML5, CSS3 og Vanilla JavaScript (Fetch API).</li>
    <li><strong>Backend:</strong> Node.js med Express server.</li>
    <li><strong>Arkitektur:</strong> REST API struktur med klar adskillelse mellem klient og server.</li>
</ul>

<h2>3. Sikkerhed: URL-validering og XSS-beskyttelse</h2>

<p>En af de største udfordringer var at sikre kommentarfeltet. Jeg ville ikke bare tillade hvilke som helst links. Derfor har jeg bygget en custom <strong>URL Validator</strong>.</p>

<p>Systemet bruger <em>Regular Expressions (Regex)</em> til at spotte links i teksten. Herefter sendes linket til min backend, som asynkront tjekker, om domænet er på en "blacklist" eller har et dårligt ry (simuleret via API-kald). Først når serveren siger "Godkendt", bliver kommentaren gemt. Det har lært mig utroligt meget om <code>async/await</code> og vigtigheden af "Server-side Validation".</p>

<h2>4. Konklusion: Hvad har jeg lært?</h2>

<p>Udover selve koden har jeg fokuseret meget på professionelle standarder:</p>
<ul>
    <li><strong>Clean Code:</strong> At holde funktioner små og modulære (f.eks. ligger min validator-logik i en separat fil).</li>
    <li><strong>Git Flow:</strong> Jeg har brugt branches og Conventional Commits til at holde styr på versioneringen.</li>
    <li><strong>Unit Testing:</strong> Jeg har eksperimenteret med Jest for at teste min backend-logik automatisk.</li>
</ul>

<p>Prøv gerne kommentarfeltet herunder – men pas på, min URL-validator holder øje med dig!</p>`
};

module.exports = SEED_POST;
