// --- SPA Router ---

// Pre-compile route patterns once at load time instead of on every navigation
const routes = [
    { path: '/', render: renderHome },
    { path: '/blogposts', render: renderBlogposts },
    { path: '/posts/:id', render: renderPost },
    { path: '/contact', render: renderContact },
    { path: '/cv', render: renderCv },
].map(({ path, render }) => {
    const paramNames = [];
    const pattern = path.replace(/:([^/]+)/g, (_, name) => {
        paramNames.push(name);
        return '([^/]+)';
    });
    return { regex: new RegExp(`^${pattern}$`), paramNames, render };
});

function matchRoute(pathname) {
    for (const { regex, paramNames, render } of routes) {
        const match = regex.exec(pathname);
        if (match) {
            const params = {};
            paramNames.forEach((name, i) => { params[name] = match[i + 1]; });
            return { render, params };
        }
    }
    return null;
}

function navigateTo(url, pushState = true) {
    closeMobileMenu();
    if (pushState) {
        window.history.pushState(null, '', url);
        window.scrollTo(0, 0);
    }
    const matched = matchRoute(window.location.pathname);
    if (matched) {
        matched.render(matched.params);
    } else {
        renderHome();
    }
}

document.addEventListener('click', (event) => {
    const anchor = event.target.closest('a[href]');
    if (!anchor) return;

    const href = anchor.getAttribute('href');
    if (href && href.startsWith('/') && !href.startsWith('/api')) {
        event.preventDefault();
        navigateTo(href);
    }
});

window.addEventListener('popstate', () => {
    navigateTo(window.location.pathname, false);
});

// --- DOM References ---

const navHamburger = document.querySelector('.nav-hamburger');
const headerNav = document.querySelector('.header-nav');
const viewHome = document.getElementById('view-home');
const viewBlogposts = document.getElementById('view-blogposts');
const viewPost = document.getElementById('view-post');
const viewContact = document.getElementById('view-contact');
const viewCv = document.getElementById('view-cv');
const homeHero = document.getElementById('home-hero');
const blogList = document.getElementById('blog-list');
const fullPostContent = document.getElementById('full-post-content');
const commentsList = document.getElementById('comments-list');
const commentForm = document.getElementById('comment-form');
const feedbackMessage = document.getElementById('feedback-message');

let currentPostId = null;

// --- Mobile Navigation ---

function closeMobileMenu() {
    if (!headerNav || !navHamburger) return;
    headerNav.classList.remove('is-open');
    navHamburger.setAttribute('aria-expanded', 'false');
}

function toggleMobileMenu() {
    const isOpen = headerNav.classList.toggle('is-open');
    navHamburger.setAttribute('aria-expanded', String(isOpen));
}

if (navHamburger) {
    navHamburger.addEventListener('click', toggleMobileMenu);
}

if (headerNav) {
    headerNav.addEventListener('click', (event) => {
        if (event.target.closest('.nav-link')) {
            closeMobileMenu();
        }
    });
}

// --- Shared Helpers ---

const DATE_OPTIONS = { year: 'numeric', month: 'long', day: 'numeric' };

const formatDate = (isoString) =>
    new Date(isoString).toLocaleDateString('da-DK', DATE_OPTIONS);

// Must stay in sync with src/utils/extractUrls.js
const URL_PATTERN = /(https?:\/\/[^\s"'<>]*[^\s"'<>.,);!?])/g;

const extractUrls = (text) => text.match(URL_PATTERN) || [];

const el = (tag, className, textContent) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (textContent) element.textContent = textContent;
    return element;
};

// Returns a randomized inter-character delay (ms) to simulate human typing rhythm.
function humanTypeDelay(char) {
    const base = 45 + Math.random() * 65;           // 45–110ms base range
    if (char === '&') return base + 55;              // natural pause at the symbol
    if (Math.random() < 0.08) return base + 140 + Math.random() * 100; // rare stutter
    return base;
}

// Sequences the hero entrance: typewriter on the heading, then whole-element
// slide-up reveals for the subtitle and CTA button.
function startHeroAnimation(typedChars, cursor, subtitle, ctaButton) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        typedChars.forEach(span => span.classList.add('is-typed'));
        subtitle.classList.add('is-animating');
        ctaButton.classList.add('is-animating');
        return;
    }

    let i = 0;

    function typeNextChar() {
        if (i >= typedChars.length) {
            // Typing complete — show cursor, reveal subtitle, then CTA.
            cursor.classList.add('is-visible');
            subtitle.classList.add('is-animating');
            setTimeout(() => ctaButton.classList.add('is-animating'), 300);
            // Replace blink with a smooth fade-out after 1 second.
            setTimeout(() => {
                cursor.style.animation = 'none';
                void cursor.offsetHeight; // flush: establish opacity before transitioning
                cursor.style.transition = 'opacity 0.5s ease';
                cursor.style.opacity = '0';
            }, 1000);
            return;
        }

        typedChars[i].classList.add('is-typed');
        i++;
        setTimeout(typeNextChar, humanTypeDelay(typedChars[i - 1].textContent));
    }

    typeNextChar();
}

const ALLOWED_TAGS = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
    'UL', 'OL', 'LI', 'STRONG', 'EM', 'CODE', 'PRE', 'BR', 'A', 'BLOCKQUOTE', 'IMG']);

function sanitizeHtml(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const cleanFragment = document.createDocumentFragment();

    function walkNodes(sourceNode, targetParent) {
        for (const child of sourceNode.childNodes) {
            if (child.nodeType === Node.TEXT_NODE) {
                targetParent.appendChild(document.createTextNode(child.textContent));
            } else if (child.nodeType === Node.ELEMENT_NODE && ALLOWED_TAGS.has(child.tagName)) {
                const safeElement = document.createElement(child.tagName);
                if (child.tagName === 'A' && child.hasAttribute('href')) {
                    const href = child.getAttribute('href');
                    if (/^https?:\/\//.test(href)) safeElement.setAttribute('href', href);
                }
                if (child.tagName === 'IMG') {
                    const src = child.getAttribute('src') || '';
                    if (/^(\/|https:\/\/)/.test(src)) safeElement.setAttribute('src', src);
                    if (child.hasAttribute('alt')) safeElement.setAttribute('alt', child.getAttribute('alt'));
                }
                walkNodes(child, safeElement);
                targetParent.appendChild(safeElement);
            } else if (child.nodeType === Node.ELEMENT_NODE) {
                walkNodes(child, targetParent);
            }
        }
    }

    walkNodes(doc.body, cleanFragment);
    return cleanFragment;
}

// --- Data Access ---

async function fetchAllPosts() {
    const response = await fetch('/api/posts');
    if (!response.ok) return [];
    return response.json();
}

async function fetchPostById(postId) {
    const response = await fetch(`/api/posts/${postId}`);
    if (!response.ok) return null;
    return response.json();
}

async function fetchCommentsByPostId(postId) {
    const response = await fetch(`/api/comments/${postId}`);
    if (!response.ok) return [];
    return response.json();
}

async function checkUrlSafety(urls) {
    const response = await fetch('/api/validate-urls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls })
    });
    if (!response.ok) throw new Error('URL validation request failed');
    return response.json();
}

async function submitComment(commentData) {
    const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(commentData)
    });
    const body = await response.json();
    return { ok: response.ok, body };
}

async function submitContactMessage(messageData) {
    const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageData)
    });
    const body = await response.json();
    return { ok: response.ok, body };
}

// --- Feedback ---

const FEEDBACK_CLASSES = ['feedback-loading', 'feedback-success', 'feedback-warning', 'feedback-error'];

function setFeedback(message, state) {
    feedbackMessage.textContent = message;
    feedbackMessage.classList.remove(...FEEDBACK_CLASSES);
    if (state) {
        feedbackMessage.classList.add(`feedback-${state}`);
    }
}

// --- View Switching ---

function showView(name) {
    const viewMap = {
        home: viewHome,
        blogposts: viewBlogposts,
        post: viewPost,
        contact: viewContact,
        cv: viewCv,
    };
    const toShow = viewMap[name];

    Object.values(viewMap).forEach(v => {
        if (v !== toShow) v.style.display = 'none';
    });

    if (toShow) {
        // Remove class first so the animation re-fires on repeated visits
        toShow.classList.remove('fade-in');
        toShow.style.display = 'block';
        // Force a style recalculation so the browser registers the class removal
        // before we add it back, allowing the keyframe to restart.
        void toShow.offsetHeight;
        toShow.classList.add('fade-in');
    }
}

// --- Render Functions ---

function extractExcerpt(html) {
    const match = html.match(/<p>(.*?)<\/p>/);
    return match ? match[1].replace(/<[^>]*>/g, '').slice(0, 120) + '...' : '';
}

function createBlogCard(post) {
    const article = el('article', 'blog-card');

    if (post.heroImage) {
        const imageContainer = el('div', 'card-image');
        const thumbnail = el('img');
        thumbnail.src = post.heroImage;
        thumbnail.alt = post.title;
        imageContainer.appendChild(thumbnail);
        article.appendChild(imageContainer);
    }

    const cardBody = el('div', 'card-body');

    cardBody.appendChild(el('time', 'card-date', formatDate(post.createdAt)));

    const titleRow = el('div', 'card-title-row');
    const titleLink = el('a', 'card-title-link', post.title);
    titleLink.href = `/posts/${post._id}`;
    const titleEl = el('h2', 'card-title');
    titleEl.appendChild(titleLink);
    const arrow = el('span', 'card-arrow', '↗');
    titleRow.append(titleEl, arrow);
    cardBody.appendChild(titleRow);

    cardBody.appendChild(el('p', 'card-excerpt', extractExcerpt(post.content)));

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const isNew = new Date(post.createdAt) > sevenDaysAgo;
    const tagsRow = el('div', 'card-tags');
    if (isNew) tagsRow.appendChild(el('span', 'card-tag', 'Ny'));
    cardBody.appendChild(tagsRow);

    article.appendChild(cardBody);
    return article;
}

function createHeroSection() {
    const section = el('div', 'hero');

    // --- Heading ---
    // aria-label provides the full text for screen readers; animated children are aria-hidden.
    const heading = el('h1', 'hero-title');
    heading.setAttribute('aria-label', 'Idéer, kode & projekter');

    const ideaSpan = el('span', 'hero-idea', 'Idéer,');
    ideaSpan.setAttribute('aria-hidden', 'true');
    heading.appendChild(ideaSpan);
    heading.appendChild(document.createTextNode(' '));

    // Build the typewriter target: non-space chars become individually-revealable spans;
    // spaces are text nodes so layout (word breaks) works from the start.
    const typedContainer = document.createElement('span');
    typedContainer.setAttribute('aria-hidden', 'true');
    const typedChars = [];
    for (const char of 'kode & projekter') {
        if (char === ' ') {
            typedContainer.appendChild(document.createTextNode(' '));
        } else {
            const span = document.createElement('span');
            span.className = 'hero-typechar';
            span.textContent = char;
            typedContainer.appendChild(span);
            typedChars.push(span);
        }
    }
    heading.appendChild(typedContainer);

    // Cursor: appears after the last character is typed, then fades out.
    const cursor = document.createElement('span');
    cursor.className = 'hero-cursor';
    cursor.setAttribute('aria-hidden', 'true');
    heading.appendChild(cursor);

    // --- Subtitle & CTA (initially hidden; revealed by startHeroAnimation) ---
    const subheadline = el('p', 'hero-subtitle', 'En blog med rod i solidt fullstack håndværk');

    const ctaButton = el('button', 'btn hero-cta', 'Læs indlæg');
    ctaButton.addEventListener('click', () => {
        navigateTo('/blogposts');
    });

    const textCol = el('div', 'hero-text');
    textCol.append(heading, subheadline, ctaButton);

    // --- Image ---
    const sketchImg = el('img');
    sketchImg.src = '/images/blog/index.png';
    sketchImg.alt = '';
    sketchImg.setAttribute('aria-hidden', 'true');
    const imageCol = el('div', 'hero-image');
    imageCol.appendChild(sketchImg);

    section.append(textCol, imageCol);

    // --- Intersection Observer: start the sequence once the hero is in view ---
    const observer = new IntersectionObserver((entries, obs) => {
        if (!entries[0].isIntersecting) return;
        obs.disconnect();
        startHeroAnimation(typedChars, cursor, subheadline, ctaButton);
    }, { threshold: 0.1 });
    observer.observe(section);

    return section;
}

function renderPostList(posts) {
    const fragment = document.createDocumentFragment();
    posts.forEach((post) => fragment.appendChild(createBlogCard(post)));
    blogList.textContent = '';
    blogList.appendChild(fragment);
}

function renderPostContent(post) {
    fullPostContent.textContent = '';

    const postBody = el('div');
    postBody.appendChild(sanitizeHtml(post.content));

    fullPostContent.append(
        el('h2', null, post.title),
        el('time', 'post-date', formatDate(post.createdAt)),
        postBody
    );
}

function renderCommentCard(comment) {
    const card = el('div', 'comment-card');
    const header = el('div', 'comment-header');
    header.append(
        el('strong', null, comment.name || 'Anonym'),
        el('time', null, new Date(comment.createdAt).toLocaleString('da-DK'))
    );
    card.append(header, el('p', null, comment.content));
    return card;
}

function renderCommentList(comments) {
    commentsList.textContent = '';
    const fragment = document.createDocumentFragment();
    comments.forEach((comment) => fragment.appendChild(renderCommentCard(comment)));
    commentsList.appendChild(fragment);
}

// --- Page Renderers ---

function createLoadingIndicator(message) {
    const wrapper = el('div', 'loading-indicator');
    wrapper.append(
        el('span', 'loading-spinner'),
        el('span', 'loading-text', message)
    );
    return wrapper;
}

async function renderHome() {
    showView('home');
    currentPostId = null;

    if (!homeHero.hasChildNodes()) {
        homeHero.appendChild(createHeroSection());
    }
}

async function renderBlogposts() {
    showView('blogposts');
    currentPostId = null;

    blogList.textContent = '';
    blogList.appendChild(createLoadingIndicator('Henter indlæg...'));

    try {
        const posts = await fetchAllPosts();
        renderPostList(posts);
    } catch (error) {
        blogList.textContent = '';
        console.error('Error loading posts:', error);
    }
}

function renderContact() {
    showView('contact');
    currentPostId = null;
}

function renderCv() {
    showView('cv');
    currentPostId = null;
}

async function renderPost(params) {
    showView('post');
    currentPostId = params.id;
    setFeedback('', null);

    fullPostContent.textContent = '';
    fullPostContent.appendChild(createLoadingIndicator('Henter indlæg...'));

    try {
        const post = await fetchPostById(params.id);
        if (!post) {
            fullPostContent.textContent = 'Indlæg ikke fundet.';
            return;
        }

        renderPostContent(post);

        commentsList.textContent = '';
        commentsList.appendChild(createLoadingIndicator('Henter kommentarer...'));

        const comments = await fetchCommentsByPostId(params.id);
        renderCommentList(comments);
    } catch (error) {
        fullPostContent.textContent = 'Fejl ved indlæsning af indlæg.';
        console.error('Error loading post:', error);
    }
}

// --- Comment Form Helpers ---

function setSubmitButtonBusy(button, busy) {
    button.disabled = busy;
    button.textContent = busy ? 'Validerer...' : 'Publicer';
}

function showFormError(message) {
    const errorsEl = commentForm.querySelector('.form-errors');
    errorsEl.textContent = '';
    errorsEl.appendChild(el('p', null, message));
}

function clearFormError() {
    commentForm.querySelector('.form-errors').textContent = '';
}

// --- Comment Form Handling ---

async function handleCommentSubmit(event) {
    event.preventDefault();

    if (!currentPostId) {
        showFormError('Fejl: Intet indlæg valgt.');
        return;
    }

    const authorName = document.getElementById('comment-author').value.trim();
    const commentText = document.getElementById('comment-text').value.trim();

    const submitButton = commentForm.querySelector('.btn-primary');
    clearFormError();
    setFeedback('', null);
    setSubmitButtonBusy(submitButton, true);

    const urls = extractUrls(commentText);
    if (urls.length > 0) {
        try {
            const { results } = await checkUrlSafety(urls);
            const unsafeUrls = results.filter((entry) => !entry.safe);
            if (unsafeUrls.length > 0) {
                showFormError('Vi kunne desværre ikke godkende dit link af sikkerhedsmæssige årsager. Prøv venligst at fjerne det.');
                setSubmitButtonBusy(submitButton, false);
                return;
            }
        } catch (error) {
            showFormError('Fejl ved URL-tjek. Prøv igen.');
            setSubmitButtonBusy(submitButton, false);
            return;
        }
    }

    try {
        const { ok, body: createdComment } = await submitComment({
            postId: currentPostId,
            name: authorName || undefined,
            text: commentText
        });

        if (!ok) {
            showFormError(createdComment.error || 'Noget gik galt. Prøv igen.');
            setSubmitButtonBusy(submitButton, false);
            return;
        }

        setFeedback('Din kommentar er publiceret!', 'success');
        clearFormError();
        commentForm.reset();
        setSubmitButtonBusy(submitButton, false);

        const newCard = renderCommentCard(createdComment);
        newCard.classList.add('fade-in');
        commentsList.prepend(newCard);
    } catch (error) {
        showFormError('Fejl: Kunne ikke kontakte serveren. Prøv igen senere.');
        setSubmitButtonBusy(submitButton, false);
        console.error('Comment submission error:', error);
    }
}

if (commentForm) {
    commentForm.addEventListener('submit', handleCommentSubmit);
}

// --- Contact Form Handling ---

function setupContactForm() {
    const contactForm = document.getElementById('contact-form');
    if (!contactForm) return;

    const errorsEl = document.getElementById('contact-form-errors');

    function showContactError(message) {
        errorsEl.classList.remove('form-errors--success');
        errorsEl.textContent = '';
        errorsEl.appendChild(el('p', null, message));
    }

    function clearContactError() {
        errorsEl.classList.remove('form-errors--success');
        errorsEl.textContent = '';
    }

    contactForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        clearContactError();

        const firstName = document.getElementById('contact-first-name').value.trim();
        const lastName  = document.getElementById('contact-last-name').value.trim();
        const email     = document.getElementById('contact-email').value.trim();
        const message   = document.getElementById('contact-message').value.trim();

        if (!firstName || !lastName || !email || !message) {
            showContactError('Udfyld venligst alle felter.');
            return;
        }

        const submitButton = contactForm.querySelector('.btn-primary');
        submitButton.disabled = true;
        submitButton.textContent = 'Sender...';

        try {
            const { ok, body } = await submitContactMessage({ firstName, lastName, email, message });

            if (!ok) {
                showContactError(body.error || 'Noget gik galt. Prøv igen.');
            } else {
                contactForm.reset();
                clearContactError();
                errorsEl.classList.add('form-errors--success');
                errorsEl.appendChild(el('p', null, 'Tak for din besked! Jeg vender tilbage hurtigst muligt.'));
            }
        } catch (error) {
            showContactError('Fejl: Kunne ikke kontakte serveren. Prøv igen senere.');
            console.error('Contact form submission error:', error);
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Send';
        }
    });
}

// --- Skill Deep-Dive Component ---

const SKILL_CONTENT = {
    express: {
        title: 'Node.js / Express 5',
        file: 'src/routes/comments.js',
        language: 'javascript',
        description: 'Express 5 videresender automatisk afviste promises fra async handlers til error-middlewaren - ingen try/catch boilerplate.',
        code: `// Express 5: async errors propageres automatisk
router.post('/', async (req, res) => {
    const { name, content, postId } = req.body;
    if (typeof content !== 'string' || !content.trim()) {
        return res.status(400).json({ error: 'content er påkrævet' });
    }
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: 'Post ikke fundet' });

    const comment = await Comment.create({
        name: name?.trim() || undefined,
        content: content.trim(),
        postId,
    });
    res.status(201).json(comment);
});`,
    },
    javascript: {
        title: 'Vanilla JavaScript (ES6+)',
        file: 'public/client.js',
        language: 'javascript',
        description: 'SPA-router bygget med History API og pre-kompilerede regex-mønstre - ingen framework-afhængighed.',
        code: `// Pre-kompilér route-mønstre én gang ved opstart
const routes = [
    { path: '/',          render: renderHome },
    { path: '/blogposts', render: renderBlogposts },
    { path: '/posts/:id', render: renderPost },
    { path: '/cv',        render: renderCv },
].map(({ path, render }) => {
    const paramNames = [];
    const pattern = path.replace(/:([^/]+)/g, (_, name) => {
        paramNames.push(name);
        return '([^/]+)';
    });
    return { regex: new RegExp(\`^\${pattern}$\`), paramNames, render };
});`,
    },
    mongodb: {
        title: 'MongoDB / Mongoose 9',
        file: 'src/models/Comment.js',
        language: 'javascript',
        description: 'Schema med type-validering, required-felter, defaults og et B-tree indeks på postId for effektiv kommentaropslagning.',
        code: `const commentSchema = new mongoose.Schema({
    name: {
        type:    String,
        default: 'Anonym',
    },
    content: {
        type:     String,
        required: true,
    },
    postId: {
        type:     mongoose.Schema.Types.ObjectId,
        ref:      'Post',
        required: true,
        index:    true,   // B-tree indeks til hurtig filtrering
    },
    createdAt: {
        type:    Date,
        default: Date.now,
    },
});
module.exports = mongoose.model('Comment', commentSchema);`,
    },
    'rest-api': {
        title: 'REST API Design',
        file: 'src/routes/api.js',
        language: 'javascript',
        description: 'Deterministisk URL-validator eksponeret som REST-endpoint med strict payload-validering og en klar JSON-kontrakt.',
        code: `// POST /api/validate-urls
// Forventer: { urls: string[] }
// Returnerer: { allSafe: boolean, results: [{url, safe, reason}] }
router.post('/validate-urls', async (req, res) => {
    const { urls } = req.body;
    if (!Array.isArray(urls)) {
        return res.status(400).json({ error: 'urls skal være et array' });
    }
    if (!urls.every(u => typeof u === 'string')) {
        return res.status(400).json({ error: 'Alle urls skal være strings' });
    }
    const results = validateUrls(urls);
    const allSafe = results.every(r => r.safe);
    res.json({ allSafe, results });
});`,
    },
    testing: {
        title: 'Automatiseret Test (Jest)',
        file: 'src/urlvalidator.test.js',
        language: 'javascript',
        description: 'Fuld enhedstest-dækning af URL-validatoren: happy path, blacklist, case-insensitivitet og malformede URLs.',
        code: `describe('validateUrls', () => {
    test('safe URL returnerer reason: safe', () => {
        const [result] = validateUrls(['https://example.com']);
        expect(result.safe).toBe(true);
        expect(result.reason).toBe('safe');
    });

    test('blacklistet domæne markeres som unsafe', () => {
        const [result] = validateUrls(['https://malware.example.com']);
        expect(result.safe).toBe(false);
        expect(result.reason).toBe('blacklisted');
    });

    test('matchning er case-insensitiv (VIRUS.EXE)', () => {
        const [result] = validateUrls(['https://example.com/VIRUS.EXE']);
        expect(result.safe).toBe(false);
        expect(result.reason).toBe('blacklisted');
    });

    test('malformet URL returnerer reason: malformed', () => {
        const [result] = validateUrls(['not-a-url']);
        expect(result.safe).toBe(false);
        expect(result.reason).toBe('malformed');
    });
});`,
    },
    xss: {
        title: 'XSS-forebyggelse',
        file: 'public/client.js',
        language: 'javascript',
        description: 'DOMParser-baseret sanitizer med eksplicit allowlist. Al markup fra ikke-godkendte tags konverteres til plain text - script-injection er strukturelt umulig.',
        code: `const ALLOWED_TAGS = new Set([
    'P','H1','H2','H3','H4','H5','H6',
    'UL','OL','LI','STRONG','EM','CODE',
    'PRE','BR','A','BLOCKQUOTE','IMG',
]);

function sanitizeHtml(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');

    function walkNodes(sourceNode, targetParent) {
        for (const child of sourceNode.childNodes) {
            if (child.nodeType === Node.TEXT_NODE) {
                targetParent.appendChild(
                    document.createTextNode(child.textContent)
                );
            } else if (ALLOWED_TAGS.has(child.tagName)) {
                const safeEl = document.createElement(child.tagName);
                if (child.tagName === 'A') {
                    const href = child.getAttribute('href');
                    if (/^https?:\\/\\//.test(href)) safeEl.href = href;
                }
                walkNodes(child, safeEl);
                targetParent.appendChild(safeEl);
            } else {
                walkNodes(child, targetParent); // strip tag, keep text
            }
        }
    }
    // ...
}`,
    },
    defensive: {
        title: 'Defensiv Programmering',
        file: 'src/middleware/validateObjectId.js',
        language: 'javascript',
        description: 'Genanvendelig Express-middleware til MongoDB ObjectId-validering - én enkelt kilde til korrekthed på tværs af alle ruter.',
        code: `const { isValidObjectId } = require('mongoose');

// Brug: router.get('/:postId', validateObjectId('postId'), handler)
function validateObjectId(paramName) {
    return (req, res, next) => {
        if (!isValidObjectId(req.params[paramName])) {
            return res.status(400).json({
                error: \`Ugyldigt ID-format: \${paramName}\`,
            });
        }
        next();
    };
}

module.exports = validateObjectId;`,
    },
    docs: {
        title: 'Teknisk Dokumentation',
        file: null,
        language: 'text',
        description: 'Al kode skrives med dokumentation in mente: intentionsafslørede navne, en CLAUDE.md der fungerer som levende arkitekturbeskrivelse og commit-beskeder der forklarer "hvorfor" frem for "hvad". Kode skal være teamklar fra dag ét.',
        code: null,
    },
    git: {
        title: 'Git - Conventional Commits',
        file: null,
        language: 'text',
        description: 'Struktureret commit-historik med Conventional Commits-standarden. Hvert commit følger mønsteret type(scope): beskrivelse for maskinel læsbarhed og klar historik.',
        code: `feat(comments): tilføj URL-sikkerhedstjek ved indsendelse
fix(api): afvis ikke-array urls payload med 400 Bad Request
refactor(routes): udtrk validateObjectId til genanvendelig middleware
chore(deps): opgradér Express til 5.1.0
docs(readme): tilføj arkitekturoversigt og portfolio-sammendrag
test(urlvalidator): tilføj dækning for case-insensitiv matchning`,
    },
    agile: {
        title: 'Jira / Agile Workflows',
        file: null,
        language: 'text',
        description: 'Erfaring med agile arbejdsmetoder fra The Odin Project og Datamatiker-studiet: sprint planning, backlog refinement og definition of done. Vant til at strukturere arbejde i epics, user stories og tasks med tydelig accept-kriterie.',
        code: null,
    },
    eslint: {
        title: 'ESLint 10',
        file: 'eslint.config.js',
        language: 'javascript',
        description: 'Statisk kodeanalyse integreret i udviklingsworflowet - fanger potentielle fejl og håndhæver stil-konventioner før kode når review.',
        code: `import js from '@eslint/js';
import globals from 'globals';

export default [
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 2022,
            globals: {
                ...globals.node,
                ...globals.browser,
            },
        },
        rules: {
            'no-unused-vars':      'warn',
            'eqeqeq':             'error',
            'no-implicit-globals': 'error',
            'no-eval':             'error',
        },
    },
];`,
    },
    'ai-agents': {
        title: 'Claude Code & AI Agents',
        file: null,
        language: 'text',
        description: 'Daglig brug af AI-assisterede udviklingstools: Claude Code til arkitekturdrøftelser, kode-review og security-gennemgang. Menneskeligt tilsyn er altid afgørende - AI er et produktivitetsværktøj, ikke en erstatning for faglig dømmekraft.',
        code: null,
    },
    java: {
        title: 'Java / OOP',
        file: null,
        language: 'text',
        description: 'Aktuel studie på Datamatiker-uddannelsen (Erhvervsakademi Aarhus, Jan 2026–). Fokus på objektorienteret design, arv, indkapsling og polymorfi - principper der allerede afspejles i JavaScript-koden: single responsibility, genanvendelige moduler og defensiv type-validering.',
        code: null,
    },
    'html-css': {
        title: 'HTML5 / CSS3',
        file: null,
        language: 'text',
        description: 'Semantisk HTML5 og moderne CSS3 med custom properties, CSS Grid, Flexbox og mobile-first responsive design. Denne portfolio bruger udelukkende vanilla CSS - ingen frameworks, fuld kontrol over hvert pixel.',
        code: null,
    },
    languages: {
        title: 'Dansk / Engelsk',
        file: null,
        language: 'text',
        description: 'Dansk modersmål med professionel skriftlig og mundtlig kommunikation. Engelsk på flydende niveau - al kode, teknisk dokumentation og professionelle diskussioner foregår på engelsk.',
        code: null,
    },
};

function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

const JS_KEYWORDS = new Set([
    'const', 'let', 'var', 'function', 'return', 'new', 'if', 'else',
    'async', 'await', 'require', 'module', 'exports', 'import', 'from',
    'class', 'extends', 'this', 'typeof', 'instanceof', 'true', 'false',
    'null', 'undefined', 'describe', 'test', 'expect', 'it', 'for', 'of',
    'in', 'default', 'export',
]);

function highlightJs(raw) {
    let out = '';
    let i = 0;
    const len = raw.length;

    while (i < len) {
        // Line comment
        if (raw[i] === '/' && raw[i + 1] === '/') {
            const end = raw.indexOf('\n', i);
            const slice = end === -1 ? raw.slice(i) : raw.slice(i, end);
            out += `<span class="hl-comment">${escapeHtml(slice)}</span>`;
            i = end === -1 ? len : end;
            continue;
        }
        // Block comment
        if (raw[i] === '/' && raw[i + 1] === '*') {
            const end = raw.indexOf('*/', i + 2);
            const slice = end === -1 ? raw.slice(i) : raw.slice(i, end + 2);
            out += `<span class="hl-comment">${escapeHtml(slice)}</span>`;
            i = end === -1 ? len : end + 2;
            continue;
        }
        // Single or double quoted string
        if (raw[i] === "'" || raw[i] === '"') {
            const quote = raw[i];
            let j = i + 1;
            while (j < len && raw[j] !== quote) {
                if (raw[j] === '\\') j++;
                j++;
            }
            j++;
            out += `<span class="hl-string">${escapeHtml(raw.slice(i, j))}</span>`;
            i = j;
            continue;
        }
        // Template literal
        if (raw[i] === '`') {
            let j = i + 1;
            while (j < len && raw[j] !== '`') {
                if (raw[j] === '\\') j++;
                j++;
            }
            j++;
            out += `<span class="hl-string">${escapeHtml(raw.slice(i, j))}</span>`;
            i = j;
            continue;
        }
        // Identifiers and keywords
        if (/[a-zA-Z_$]/.test(raw[i])) {
            let j = i;
            while (j < len && /[a-zA-Z0-9_$]/.test(raw[j])) j++;
            const word = raw.slice(i, j);
            out += JS_KEYWORDS.has(word)
                ? `<span class="hl-keyword">${escapeHtml(word)}</span>`
                : escapeHtml(word);
            i = j;
            continue;
        }
        // Numbers
        if (/[0-9]/.test(raw[i])) {
            let j = i;
            while (j < len && /[0-9.]/.test(raw[j])) j++;
            out += `<span class="hl-number">${escapeHtml(raw.slice(i, j))}</span>`;
            i = j;
            continue;
        }
        // Everything else
        out += escapeHtml(raw[i]);
        i++;
    }
    return out;
}

function buildPeekContent(content) {
    const fragment = document.createDocumentFragment();

    const header = el('div', 'skill-peek-header');
    header.appendChild(el('p', 'skill-peek-title', content.title));
    if (content.file) {
        header.appendChild(el('p', 'skill-peek-file', content.file));
    }
    fragment.appendChild(header);
    fragment.appendChild(el('p', 'skill-peek-description', content.description));

    if (content.code) {
        const wrap = document.createElement('div');
        wrap.className = 'code-preview-wrap';

        const chrome = document.createElement('div');
        chrome.className = 'code-chrome';
        ['code-dot--red', 'code-dot--yellow', 'code-dot--green'].forEach(cls => {
            const dot = document.createElement('span');
            dot.className = `code-dot ${cls}`;
            chrome.appendChild(dot);
        });
        wrap.appendChild(chrome);

        const pre = document.createElement('pre');
        pre.className = 'skill-peek-code-block';
        const codeEl = document.createElement('code');
        codeEl.innerHTML = content.language === 'javascript'
            ? highlightJs(content.code)
            : escapeHtml(content.code);
        pre.appendChild(codeEl);
        wrap.appendChild(pre);

        fragment.appendChild(wrap);
    }

    return fragment;
}

function initSkillDeepDive() {
    const categoriesEl = document.querySelector('.skill-categories');
    const peekEl = document.getElementById('skill-peek');
    if (!categoriesEl || !peekEl) return;

    const peekInner = peekEl.querySelector('.skill-peek-inner');
    let activeSkill = null;

    function showPlaceholder() {
        peekInner.textContent = '';
        peekInner.appendChild(
            el('p', 'skill-peek-placeholder', 'Vælg en kompetence for at se et kodeeksempel fra projektet.')
        );
    }

    categoriesEl.addEventListener('click', (event) => {
        const chip = event.target.closest('.skill-chip');
        if (!chip) return;

        const skill = chip.dataset.skill;

        if (skill === activeSkill) {
            chip.classList.remove('is-active');
            peekEl.classList.remove('is-open');
            activeSkill = null;
            showPlaceholder();
            return;
        }

        document.querySelectorAll('.skill-chip.is-active')
            .forEach(c => c.classList.remove('is-active'));
        chip.classList.add('is-active');

        const content = SKILL_CONTENT[skill];
        if (!content) return;

        peekInner.textContent = '';
        peekInner.appendChild(buildPeekContent(content));
        peekEl.classList.add('is-open');
        activeSkill = skill;
    });
}

// --- Initial Load ---
setupContactForm();
initSkillDeepDive();
navigateTo(window.location.pathname, false);
