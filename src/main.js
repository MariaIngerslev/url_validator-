require('dotenv').config();
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const apiRoutes = require('./routes/api');
const postsRoutes = require('./routes/posts');
const commentsRoutes = require('./routes/comments');

const app = express();
const PORT = 3000;

// --- Mongoose Schemas & Models ---
const commentSchema = new mongoose.Schema({
    author: String,
    text: String,
    email: String,
    subscribe: Boolean,
    date: { type: Date, default: Date.now }
});

const Comment = mongoose.model('Comment', commentSchema);

const blogPostSchema = new mongoose.Schema({
    title: String,
    content: String,
    date: { type: Date, default: Date.now }
});

const BlogPost = mongoose.model('BlogPost', blogPostSchema);

// --- Database Seeding ---
const SEED_CONTENT = {
    title: 'Fra Idé til Kode: Sådan byggede jeg min egen sikre Blog App',
    content: `<p>Velkommen til mit allerførste blogindlæg! Det særlige ved netop dette indlæg er, at jeg selv har kodet hele platformen, det ligger på. Dette projekt har været min legeplads for at omsætte teori til praksis på 1. semester.</p>

<h3>Arkitekturen</h3>
<p>I stedet for at bruge færdige løsninger som WordPress, har jeg bygget denne applikation fra bunden (Vanilla JS og Node.js). Målet var at skabe en <strong>Single Page Application (SPA)</strong>. Det betyder, at når du navigerer rundt eller poster en kommentar, genindlæser siden ikke. Det giver en lynhurtig og app-lignende brugeroplevelse.</p>

<p>Teknisk stack:</p>
<ul>
    <li><strong>Frontend:</strong> HTML5, CSS3 og Vanilla JavaScript (Fetch API).</li>
    <li><strong>Backend:</strong> Node.js med Express server.</li>
    <li><strong>Arkitektur:</strong> REST API struktur med klar adskillelse mellem klient og server.</li>
</ul>

<h3>Sikkerhed og URL-validering</h3>
<p>En af de største udfordringer var at sikre kommentarfeltet. Jeg ville ikke bare tillade hvilke som helst links. Derfor har jeg bygget en custom <strong>URL Validator</strong>.</p>

<p>Systemet bruger <em>Regular Expressions (Regex)</em> til at spotte links i teksten. Herefter sendes linket til min backend, som asynkront tjekker, om domænet er på en "blacklist" eller har et dårligt ry (simuleret via API-kald). Først når serveren siger "Godkendt", bliver kommentaren gemt. Det har lært mig utroligt meget om <code>async/await</code> og vigtigheden af "Server-side Validation".</p>

<h3>Hvad har jeg lært?</h3>
<p>Udover selve koden har jeg fokuseret meget på professionelle standarder:</p>
<ul>
    <li><strong>Clean Code:</strong> At holde funktioner små og modulære (f.eks. ligger min validator-logik i en separat fil).</li>
    <li><strong>Git Flow:</strong> Jeg har brugt branches og Conventional Commits til at holde styr på versioneringen.</li>
    <li><strong>Unit Testing:</strong> Jeg har eksperimenteret med Jest for at teste min backend-logik automatisk.</li>
</ul>

<p>Prøv gerne kommentarfeltet herunder – men pas på, min URL-validator holder øje med dig! 😉</p>`
};

async function seedBlogPosts() {
    const count = await BlogPost.countDocuments();
    if (count === 0) {
        await BlogPost.create(SEED_CONTENT);
        console.log('Seeded initial blog post');
    } else {
        // Update existing post to remove emojis from content
        await BlogPost.updateOne({}, { $set: { title: SEED_CONTENT.title, content: SEED_CONTENT.content } });
        console.log('Updated existing blog post');
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
if (!process.env.MONGO_URI) {
    console.error('❌ MONGO_URI environment variable is not set');
    process.exit(1);
}

mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        console.log('✅ Connected to MongoDB');
        await seedBlogPosts();
        app.listen(PORT, () => {
            console.log(`Server is running on http://localhost:${PORT}`);
        });
    })
    .catch((err) => {
        console.error('❌ Failed to connect to MongoDB:', err.message);
        process.exit(1);
    });
