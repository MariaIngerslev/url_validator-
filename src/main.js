require('dotenv').config();
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const Post = require('./models/Post');
const apiRoutes = require('./routes/api');
const postsRoutes = require('./routes/posts');
const commentsRoutes = require('./routes/comments');

const app = express();
const PORT = 3000;

// --- Database Seeding ---
const SEED_CONTENT = {
    title: 'Fra Id\u00e9 til Kode: S\u00e5dan byggede jeg min egen sikre Blog App',
    content: `<p>Velkommen til mit allerf\u00f8rste blogindl\u00e6g! Det s\u00e6rlige ved netop dette indl\u00e6g er, at jeg selv har kodet hele platformen, det ligger p\u00e5. Dette projekt har v\u00e6ret min legeplads for at oms\u00e6tte teori til praksis p\u00e5 1. semester.</p>

<h3>Arkitekturen</h3>
<p>I stedet for at bruge f\u00e6rdige l\u00f8sninger som WordPress, har jeg bygget denne applikation fra bunden (Vanilla JS og Node.js). M\u00e5let var at skabe en <strong>Single Page Application (SPA)</strong>. Det betyder, at n\u00e5r du navigerer rundt eller poster en kommentar, genindl\u00e6ser siden ikke. Det giver en lynhurtig og app-lignende brugeroplevelse.</p>

<p>Teknisk stack:</p>
<ul>
    <li><strong>Frontend:</strong> HTML5, CSS3 og Vanilla JavaScript (Fetch API).</li>
    <li><strong>Backend:</strong> Node.js med Express server.</li>
    <li><strong>Arkitektur:</strong> REST API struktur med klar adskillelse mellem klient og server.</li>
</ul>

<h3>Sikkerhed og URL-validering</h3>
<p>En af de st\u00f8rste udfordringer var at sikre kommentarfeltet. Jeg ville ikke bare tillade hvilke som helst links. Derfor har jeg bygget en custom <strong>URL Validator</strong>.</p>

<p>Systemet bruger <em>Regular Expressions (Regex)</em> til at spotte links i teksten. Herefter sendes linket til min backend, som asynkront tjekker, om dom\u00e6net er p\u00e5 en "blacklist" eller har et d\u00e5rligt ry (simuleret via API-kald). F\u00f8rst n\u00e5r serveren siger "Godkendt", bliver kommentaren gemt. Det har l\u00e6rt mig utroligt meget om <code>async/await</code> og vigtigheden af "Server-side Validation".</p>

<h3>Hvad har jeg l\u00e6rt?</h3>
<p>Udover selve koden har jeg fokuseret meget p\u00e5 professionelle standarder:</p>
<ul>
    <li><strong>Clean Code:</strong> At holde funktioner sm\u00e5 og modul\u00e6re (f.eks. ligger min validator-logik i en separat fil).</li>
    <li><strong>Git Flow:</strong> Jeg har brugt branches og Conventional Commits til at holde styr p\u00e5 versioneringen.</li>
    <li><strong>Unit Testing:</strong> Jeg har eksperimenteret med Jest for at teste min backend-logik automatisk.</li>
</ul>

<p>Pr\u00f8v gerne kommentarfeltet herunder \u2013 men pas p\u00e5, min URL-validator holder \u00f8je med dig!</p>`
};

async function seedPosts() {
    const count = await Post.countDocuments();
    if (count === 0) {
        await Post.create(SEED_CONTENT);
        console.log('Seeded initial blog post');
    }
}

// --- Middleware ---
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());

// Basic route for the home page (fallback)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// Mount API routes
app.use('/api', apiRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/comments', commentsRoutes);

// --- Connect to MongoDB, then start the server ---
const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!mongoUri) {
    console.error('MONGODB_URI environment variable is not set');
    process.exit(1);
}

mongoose.connect(mongoUri)
    .then(async () => {
        console.log('Connected to MongoDB');
        await seedPosts();
        app.listen(PORT, () => {
            console.log(`Server is running on http://localhost:${PORT}`);
        });
    })
    .catch((err) => {
        console.error('Failed to connect to MongoDB:', err.message);
        process.exit(1);
    });
