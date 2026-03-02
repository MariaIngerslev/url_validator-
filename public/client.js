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

window.addEventListener('popstate', closeMobileMenu);

// --- Shared Helpers ---

const DATE_OPTIONS = { year: 'numeric', month: 'long', day: 'numeric' };

const formatDate = (isoString) =>
    new Date(isoString).toLocaleDateString('da-DK', DATE_OPTIONS);

const URL_PATTERN = /(https?:\/\/[^\s]+)/g;

const extractUrls = (text) => text.match(URL_PATTERN) || [];

const el = (tag, className, textContent) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (textContent) element.textContent = textContent;
    return element;
};

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

    const textCol = el('div', 'hero-text');
    const heading = el('h1', 'hero-title', 'Idéer, kode & projekter');
    const subheadline = el('p', 'hero-subtitle', 'En blog med rod i solidt fullstack håndværk og nysgerrighed.');
    const ctaButton = el('button', 'btn hero-cta', 'Læs indlæg');
    ctaButton.addEventListener('click', () => {
        navigateTo('/blogposts');
    });
    textCol.append(heading, subheadline, ctaButton);

    const imageCol = el('div', 'hero-image');
    const sketchImg = el('img');
    sketchImg.src = '/images/blog/index.png';
    sketchImg.alt = '';
    sketchImg.setAttribute('aria-hidden', 'true');
    imageCol.appendChild(sketchImg);

    section.append(textCol, imageCol);
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
    const email = document.getElementById('comment-email').value.trim();
    const subscribe = document.getElementById('comment-subscribe').checked;

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
            text: commentText,
            email: email || undefined,
            subscribe
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

// --- Initial Load ---
setupContactForm();
navigateTo(window.location.pathname, false);
