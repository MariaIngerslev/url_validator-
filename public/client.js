// --- SPA Router ---

// Pre-compile route patterns once at load time instead of on every navigation
const routes = [
    { path: '/', render: renderHome },
    { path: '/posts/:id', render: renderPost },
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
    if (pushState) {
        window.history.pushState(null, '', url);
    }
    const matched = matchRoute(window.location.pathname);
    if (matched) {
        matched.render(matched.params);
    } else {
        renderHome();
    }
}

document.addEventListener('click', (e) => {
    const anchor = e.target.closest('a[href]');
    if (!anchor) return;

    const href = anchor.getAttribute('href');
    if (href && href.startsWith('/') && !href.startsWith('/api')) {
        e.preventDefault();
        navigateTo(href);
    }
});

window.addEventListener('popstate', () => {
    navigateTo(window.location.pathname, false);
});

// --- DOM References ---

const viewHome = document.getElementById('view-home');
const viewPost = document.getElementById('view-post');
const blogList = document.getElementById('blog-list');
const fullPostContent = document.getElementById('full-post-content');
const commentsList = document.getElementById('comments-list');
const commentForm = document.getElementById('comment-form');
const feedbackMessage = document.getElementById('feedback-message');

let currentPostId = null;

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
    'UL', 'OL', 'LI', 'STRONG', 'EM', 'CODE', 'PRE', 'BR', 'A', 'BLOCKQUOTE']);

function sanitizeHtml(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const clean = document.createDocumentFragment();

    function walk(sourceNode, targetParent) {
        for (const child of sourceNode.childNodes) {
            if (child.nodeType === Node.TEXT_NODE) {
                targetParent.appendChild(document.createTextNode(child.textContent));
            } else if (child.nodeType === Node.ELEMENT_NODE && ALLOWED_TAGS.has(child.tagName)) {
                const safe = document.createElement(child.tagName);
                if (child.tagName === 'A' && child.hasAttribute('href')) {
                    const href = child.getAttribute('href');
                    if (/^https?:\/\//.test(href)) safe.setAttribute('href', href);
                }
                walk(child, safe);
                targetParent.appendChild(safe);
            } else if (child.nodeType === Node.ELEMENT_NODE) {
                walk(child, targetParent);
            }
        }
    }

    walk(doc.body, clean);
    return clean;
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
    viewHome.style.display = name === 'home' ? 'block' : 'none';
    viewPost.style.display = name === 'post' ? 'block' : 'none';
}

// --- Render Functions ---

function extractExcerpt(html) {
    const match = html.match(/<p>(.*?)<\/p>/);
    return match ? match[1].replace(/<[^>]*>/g, '').slice(0, 120) + '...' : '';
}

function createBlogCard(post) {
    const article = el('article', 'blog-card');

    const cardBody = el('div', 'card-body');
    cardBody.append(
        el('span', 'card-tag', 'Ny'),
        el('h2', 'card-title', post.title),
        el('time', 'card-date', formatDate(post.createdAt)),
        el('p', 'card-excerpt', extractExcerpt(post.content))
    );

    const cardFooter = el('div', 'card-footer');
    const link = el('a', 'read-more-btn', 'Læs mere →');
    link.href = `/posts/${post._id}`;
    cardFooter.appendChild(link);

    article.append(cardBody, cardFooter);
    return article;
}

async function renderHome() {
    showView('home');
    currentPostId = null;

    try {
        const response = await fetch('/api/posts');
        if (!response.ok) return;

        const posts = await response.json();

        // Build all cards in a fragment to trigger a single DOM reflow
        const fragment = document.createDocumentFragment();
        posts.forEach((post) => fragment.appendChild(createBlogCard(post)));

        blogList.textContent = '';
        blogList.appendChild(fragment);
    } catch (err) {
        console.error('Error loading posts:', err);
    }
}

async function renderPost(params) {
    showView('post');
    currentPostId = params.id;

    try {
        const response = await fetch(`/api/posts/${params.id}`);
        if (!response.ok) {
            fullPostContent.textContent = 'Indlæg ikke fundet.';
            return;
        }

        const post = await response.json();
        fullPostContent.textContent = '';

        const postBody = el('div');
        postBody.appendChild(sanitizeHtml(post.content));

        fullPostContent.append(
            el('h2', null, post.title),
            el('time', 'post-date', formatDate(post.createdAt)),
            postBody
        );

        await loadComments(params.id);
    } catch (err) {
        console.error('Error loading post:', err);
    }

    setFeedback('', null);
}

// --- Comments ---

async function loadComments(postId) {
    commentsList.textContent = '';
    try {
        const response = await fetch(`/api/comments/${postId}`);
        if (!response.ok) return;

        const comments = await response.json();
        const fragment = document.createDocumentFragment();
        comments.forEach((comment) => fragment.appendChild(renderCommentEl(comment)));
        commentsList.appendChild(fragment);
    } catch (err) {
        console.error('Error loading comments:', err);
    }
}

function renderCommentEl(comment) {
    const div = el('div', 'comment-card');
    const header = el('div', 'comment-header');
    header.append(
        el('strong', null, comment.author || 'Anonym'),
        el('time', null, new Date(comment.createdAt).toLocaleString('da-DK'))
    );
    div.append(header, el('p', null, comment.content));
    return div;
}

// --- Comment Form Handling ---

if (commentForm) {
    commentForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        if (!currentPostId) {
            setFeedback('Fejl: Intet indlæg valgt.', 'error');
            return;
        }

        const author = document.getElementById('comment-author').value;
        const text = document.getElementById('comment-text').value;
        const email = document.getElementById('comment-email').value;
        const subscribe = document.getElementById('comment-subscribe').checked;

        const urls = extractUrls(text);
        if (urls.length > 0) {
            setFeedback('Tjekker URL-sikkerhed...', 'loading');
            try {
                const checkResponse = await fetch('/api/validate-urls', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ urls })
                });
                const { results } = await checkResponse.json();
                const unsafeUrls = results.filter((r) => !r.safe);
                if (unsafeUrls.length > 0) {
                    const names = unsafeUrls.map((r) => r.url).join(', ');
                    setFeedback(`Usikre links fundet: ${names}`, 'error');
                    return;
                }
                setFeedback('URLs godkendt! Publicerer...', 'success');
            } catch (err) {
                setFeedback('Fejl ved URL-tjek. Prøv igen.', 'error');
                return;
            }
        }

        setFeedback('Publicerer din kommentar...', 'loading');

        try {
            const response = await fetch('/api/comments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ postId: currentPostId, author, text, email, subscribe })
            });

            const data = await response.json();

            if (!response.ok) {
                setFeedback(data.error || 'Noget gik galt. Prøv igen.', 'error');
                return;
            }

            setFeedback('Din kommentar er publiceret!', 'success');
            commentsList.prepend(renderCommentEl(data));
            commentForm.reset();
        } catch (error) {
            setFeedback('Fejl: Kunne ikke kontakte serveren. Prøv igen senere.', 'error');
            console.error('Comment post error:', error);
        }
    });
}

// --- Initial Load ---
navigateTo(window.location.pathname, false);
