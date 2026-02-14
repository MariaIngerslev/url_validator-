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

async function renderHome() {
    showView('home');
    currentPostId = null;

    try {
        const posts = await fetchAllPosts();
        renderPostList(posts);
    } catch (error) {
        console.error('Error loading posts:', error);
    }
}

async function renderPost(params) {
    showView('post');
    currentPostId = params.id;
    setFeedback('', null);

    try {
        const post = await fetchPostById(params.id);
        if (!post) {
            fullPostContent.textContent = 'Indlæg ikke fundet.';
            return;
        }

        renderPostContent(post);

        const comments = await fetchCommentsByPostId(params.id);
        renderCommentList(comments);
    } catch (error) {
        console.error('Error loading post:', error);
    }
}

// --- Comment Form Handling ---

async function handleCommentSubmit(event) {
    event.preventDefault();

    if (!currentPostId) {
        setFeedback('Fejl: Intet indlæg valgt.', 'error');
        return;
    }

    const authorName = document.getElementById('comment-author').value;
    const commentText = document.getElementById('comment-text').value;
    const email = document.getElementById('comment-email').value;
    const subscribe = document.getElementById('comment-subscribe').checked;

    const urls = extractUrls(commentText);
    if (urls.length > 0) {
        setFeedback('Tjekker URL-sikkerhed...', 'loading');
        try {
            const { results } = await checkUrlSafety(urls);
            const unsafeUrls = results.filter((entry) => !entry.safe);
            if (unsafeUrls.length > 0) {
                const unsafeUrlNames = unsafeUrls.map((entry) => entry.url).join(', ');
                setFeedback(`Usikre links fundet: ${unsafeUrlNames}`, 'error');
                return;
            }
            setFeedback('URLs godkendt! Publicerer...', 'success');
        } catch (error) {
            setFeedback('Fejl ved URL-tjek. Prøv igen.', 'error');
            return;
        }
    }

    setFeedback('Publicerer din kommentar...', 'loading');

    try {
        const { ok, body: createdComment } = await submitComment({
            postId: currentPostId,
            name: authorName,
            text: commentText,
            email,
            subscribe
        });

        if (!ok) {
            setFeedback(createdComment.error || 'Noget gik galt. Prøv igen.', 'error');
            return;
        }

        setFeedback('Din kommentar er publiceret!', 'success');
        commentsList.prepend(renderCommentCard(createdComment));
        commentForm.reset();
    } catch (error) {
        setFeedback('Fejl: Kunne ikke kontakte serveren. Prøv igen senere.', 'error');
        console.error('Comment submission error:', error);
    }
}

if (commentForm) {
    commentForm.addEventListener('submit', handleCommentSubmit);
}

// --- Initial Load ---
navigateTo(window.location.pathname, false);
