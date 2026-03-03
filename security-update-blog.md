# Defense in Depth: A Technical Walkthrough of Our Latest Security Hardening

*Published 3 March 2026 · Security*

---

Security is not a feature you bolt on at the end — it is a discipline you build into every layer of a system. This post documents a series of targeted hardening measures we recently shipped to this platform, explains the threat each one addresses, and describes how they work together as a layered defense.

If you are a developer curious about the implementation details, or a user who simply wants to know that the platform is taken seriously, this one is for you.

---

## 1. Global Security Headers with Helmet and a Strict Content Security Policy

**The threat: clickjacking and content injection**

Without explicit HTTP security headers, browsers apply permissive defaults. The most dangerous of these is the absence of framing protection: any third-party site can embed this application in a transparent `<iframe>`, overlay it with a fake UI, and trick users into clicking buttons or submitting forms they never intended to interact with. This is called *clickjacking* — a form of UI redressing used in phishing campaigns and credential theft.

**What we shipped**

We added [Helmet](https://helmetjs.github.io/), a battle-tested Express middleware that sets a comprehensive suite of HTTP response headers on every request. On top of Helmet's sensible defaults, we configured a strict **Content Security Policy (CSP)**:

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' https:;
  connect-src 'self';
  object-src 'none';
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
```

The key directives:

| Directive | Effect |
|-----------|--------|
| `frame-ancestors 'none'` | Prevents the application from being embedded in any iframe, on any origin — blocking clickjacking entirely |
| `object-src 'none'` | Disallows Flash, Java applets, and other legacy plugin content |
| `script-src 'self'` | Only scripts served from this origin can execute — no CDN-injected or inline ad scripts |
| `base-uri 'self'` | Prevents base-tag hijacking, where an attacker injects a `<base>` tag to redirect all relative URLs |
| `form-action 'self'` | Ensures form submissions can only target this origin |

Helmet also sets `X-Content-Type-Options: nosniff` (prevents MIME-type sniffing attacks), `X-Frame-Options: DENY` (legacy clickjacking protection for older browsers), and a `Referrer-Policy` of `strict-origin-when-cross-origin` (limits how much URL information leaks to third-party servers when users follow external links).

Together, these headers tell the browser exactly what is and is not permitted, significantly narrowing the attack surface without changing a single line of application logic.

---

## 2. CSRF Protection via Origin and Referer Validation

**The threat: cross-site request forgery**

Even without cookies or sessions, a malicious website can silently trigger state-changing requests against this API on behalf of an unsuspecting visitor. A hidden form or a background `fetch()` on `evil-site.com` could submit a comment or contact message using the victim's browser — effectively impersonating them.

**What we shipped**

We added a lightweight middleware that inspects the `Origin` and `Referer` headers on every mutating request (`POST`, `PUT`, `PATCH`, `DELETE`) to the `/api` namespace:

```js
app.use('/api', (req, res, next) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        const origin = req.get('Origin') || req.get('Referer') || '';
        if (origin && !origin.startsWith(`http://localhost:${PORT}`)) {
            return res.status(403).json({ error: 'Forbidden: cross-origin mutation not allowed.' });
        }
    }
    next();
});
```

Browsers automatically attach `Origin` and `Referer` headers to cross-origin requests and, critically, prevent JavaScript from forging them. A request originating from `evil-site.com` will carry that origin and be rejected with `403 Forbidden` before it reaches any route handler. Legitimate requests from the application's own frontend carry the correct origin and pass through unchanged.

This is a low-dependency, deterministic guard that complements the CSP layer without requiring session tokens or complex CSRF token infrastructure.

---

## 3. Rate Limiting on Comment and Message Endpoints

**The threat: spam and denial-of-service**

Unthrottled public POST endpoints are an open invitation for abuse — automated bots can flood the database with spam comments, exhaust server resources, or degrade the experience for legitimate users. Without rate limiting, a single script can submit thousands of requests per minute.

**What we shipped**

We integrated [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit) with per-endpoint policies:

| Endpoint | Limit |
|----------|-------|
| `POST /api/comments` | 10 requests per minute per IP |
| `POST /api/messages` | 5 requests per minute per IP |

When a client exceeds their quota, the server responds with `429 Too Many Requests` and standard `RateLimit-*` headers so well-behaved clients can adapt their retry logic. Legitimate human users will never come close to these thresholds — they exist exclusively to deter automated abuse.

---

## 4. Per-Element Type Safety on the URL Validation API

**The threat: malformed input causing server crashes**

The `/api/validate-urls` endpoint previously verified that the request body included a non-empty array, but it did not validate the *type* of each element inside that array. A request body like `{"urls": [null, {}, 123]}` would pass the outer check and reach the URL validator, which calls `.toLowerCase()` on each element. Calling `.toLowerCase()` on `null` throws a `TypeError`, producing an unhandled `500 Internal Server Error` instead of a clean, informative `400 Bad Request`.

Unexpected `500` responses are noisy, harder to debug, and leak implementation details through stack traces in non-production environments.

**What we shipped**

We tightened the guard to validate every element of the array:

```js
if (!urls || !Array.isArray(urls) || urls.length === 0
    || !urls.every((u) => typeof u === 'string')) {
    return res.status(400).json({
        error: "Request body must include a non-empty 'urls' array of strings."
    });
}
```

The `Array.prototype.every` check ensures that the validator only ever receives an array of strings. Any other input is rejected early with a `400`, a clear error message, and no stack trace. This follows the principle of *failing fast at the boundary* — validating data at the point it enters the system, before it reaches business logic.

---

## 5. Server-Side HTML Stripping Before Comment Storage

**The threat: stored XSS via a future rendering mistake**

The client-side rendering layer already protects against XSS: comments are displayed using `element.textContent` (which the browser treats as plain text, never HTML), and blog post content passes through a strict DOM-based sanitizer that whitelists only safe tags and attributes.

These client-side guards are correct and robust. However, relying solely on the rendering layer creates a maintenance risk: if a future developer inadvertently renders a stored comment using `innerHTML` instead of `textContent`, any HTML tags preserved in the database would execute as markup. This is a classic *latent stored XSS* vector — the vulnerability exists in the data, waiting for a rendering mistake to activate it.

**What we shipped**

We added a one-line HTML strip on the server, applied to comment content before it is written to the database:

```js
const strippedText = text.replace(/<[^>]*>/g, '');
const comment = await Comment.create({ name: sanitizedName, content: strippedText, postId });
```

This does not alter the user experience — comments are plain text, not rich HTML, so no intended formatting is lost. What it does is ensure that regardless of how a future rendering path handles stored content, the database never contains executable markup. The existing client-side sanitization remains in place; this server-side strip is an independent, complementary layer.

This is the textbook definition of *defense in depth*: multiple independent controls, each capable of stopping the attack on its own, layered so that no single failure creates a breach.

---

## Summary

| Change | Threat Addressed | Severity |
|--------|-----------------|----------|
| Helmet + strict CSP | Clickjacking, MIME sniffing, content injection | Medium |
| CSRF origin check | Cross-site request forgery | Low–Medium |
| Rate limiting | Spam, denial-of-service | Low–Medium |
| URL array type validation | Server crash on malformed input | Low |
| Server-side HTML strip | Latent stored XSS | Informational / Defence-in-depth |

None of these changes alter visible application behaviour for legitimate users. They operate silently in the background, narrowing the attack surface and ensuring the platform degrades gracefully under abuse rather than crashing.

Security hardening is an ongoing process. If you spot something, have questions about these changes, or want to discuss the implementation in more detail, reach out through the contact page.

---

*The full diff for these changes is available on [GitHub](https://github.com/MariaIngerslev/Dev_Portfolio).*
