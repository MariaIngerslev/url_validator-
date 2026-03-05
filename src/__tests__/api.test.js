const request = require('supertest');
const app = require('../app');

describe('POST /api/validate-urls', () => {
    test('safe URL returns allSafe: true', async () => {
        const res = await request(app)
            .post('/api/validate-urls')
            .send({ urls: ['https://example.com'] });
        expect(res.status).toBe(200);
        expect(res.body.allSafe).toBe(true);
        expect(res.body.results[0].reason).toBe('safe');
    });

    test('blacklisted URL returns allSafe: false with reason blacklisted', async () => {
        const res = await request(app)
            .post('/api/validate-urls')
            .send({ urls: ['https://malware.example.com'] });
        expect(res.status).toBe(200);
        expect(res.body.allSafe).toBe(false);
        expect(res.body.results[0].reason).toBe('blacklisted');
    });

    test('malicious keyword URL returns allSafe: false with reason malicious', async () => {
        const res = await request(app)
            .post('/api/validate-urls')
            .send({ urls: ['https://example.com/unsafe-stuff'] });
        expect(res.status).toBe(200);
        expect(res.body.allSafe).toBe(false);
        expect(res.body.results[0].reason).toBe('malicious');
    });

    test('mixed safe and unsafe returns allSafe: false with both results', async () => {
        const res = await request(app)
            .post('/api/validate-urls')
            .send({ urls: ['https://example.com', 'https://malware.example.com'] });
        expect(res.status).toBe(200);
        expect(res.body.allSafe).toBe(false);
        expect(res.body.results).toHaveLength(2);
        const reasons = res.body.results.map(r => r.reason);
        expect(reasons).toContain('safe');
        expect(reasons).toContain('blacklisted');
    });

    test('empty array returns 400', async () => {
        const res = await request(app)
            .post('/api/validate-urls')
            .send({ urls: [] });
        expect(res.status).toBe(400);
    });

    test('urls not an array returns 400', async () => {
        const res = await request(app)
            .post('/api/validate-urls')
            .send({ urls: 'https://example.com' });
        expect(res.status).toBe(400);
    });

    test('array with numbers returns 400', async () => {
        const res = await request(app)
            .post('/api/validate-urls')
            .send({ urls: [1, 2, 3] });
        expect(res.status).toBe(400);
    });

    test('missing urls field returns 400', async () => {
        const res = await request(app)
            .post('/api/validate-urls')
            .send({});
        expect(res.status).toBe(400);
    });
});
