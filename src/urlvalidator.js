const BLACKLIST = [
    "malware.example.com",
    "phishing.example.com",
    "badsite.test",
    "danger.example.org",
    "evil.example.net",
    "bad-reputation.com",
    "virus.exe",
];

function getHostname(urlString) {
    try {
        const parsed = new URL(urlString);
        return parsed.hostname.toLowerCase();
    } catch (e) {
        return null;
    }
}

function validateUrls(urls) {
    return urls.map((url) => {
        const hostname = getHostname(url);

        if (!hostname) {
            return { url, safe: false, reason: "malformed" };
        }

        if (BLACKLIST.includes(hostname)) {
            return { url, safe: false, reason: "blacklisted" };
        }

        const isSafe = Math.random() > 0.3;
        return { url, safe: isSafe, reason: "simulated_check" };
    });
}

module.exports = { validateUrls };
