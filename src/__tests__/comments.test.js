const request = require('supertest');
const app = require('../app');
const Post = require('../models/Post');

let testPost;

beforeEach(async () => {
    testPost = await Post.create({ title: 'Test Post', content: 'Test content' });
});

describe('GET /api/comments/:postId', () => {
    test('valid postId with no comments returns 200 with empty array', async () => {
        const res = await request(app).get(`/api/comments/${testPost._id}`);
        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
    });

    test('valid postId with comments returns 200 with comment array', async () => {
        await request(app)
            .post('/api/comments')
            .send({ postId: testPost._id.toString(), text: 'Hello world', name: 'Alice' });
        const res = await request(app).get(`/api/comments/${testPost._id}`);
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0].content).toBe('Hello world');
    });

    test('invalid ObjectId format returns 400', async () => {
        const res = await request(app).get('/api/comments/not-an-id');
        expect(res.status).toBe(400);
    });
});

describe('POST /api/comments', () => {
    test('valid comment with name is saved with name', async () => {
        const res = await request(app)
            .post('/api/comments')
            .send({ postId: testPost._id.toString(), text: 'Great post!', name: 'Alice' });
        expect(res.status).toBe(201);
        expect(res.body.name).toBe('Alice');
    });

    test('valid comment without name defaults to Anonym', async () => {
        const res = await request(app)
            .post('/api/comments')
            .send({ postId: testPost._id.toString(), text: 'Anonymous comment' });
        expect(res.status).toBe(201);
        expect(res.body.name).toBe('Anonym');
    });

    test('empty name defaults to Anonym', async () => {
        const res = await request(app)
            .post('/api/comments')
            .send({ postId: testPost._id.toString(), text: 'Some comment', name: '' });
        expect(res.status).toBe(201);
        expect(res.body.name).toBe('Anonym');
    });

    test('missing text returns 400', async () => {
        const res = await request(app)
            .post('/api/comments')
            .send({ postId: testPost._id.toString(), name: 'Alice' });
        expect(res.status).toBe(400);
    });

    test('missing postId returns 400', async () => {
        const res = await request(app)
            .post('/api/comments')
            .send({ text: 'A comment', name: 'Alice' });
        expect(res.status).toBe(400);
    });

    test('invalid ObjectId format for postId returns 400', async () => {
        const res = await request(app)
            .post('/api/comments')
            .send({ postId: 'not-an-id', text: 'A comment' });
        expect(res.status).toBe(400);
    });

    test('valid format but non-existing postId returns 404', async () => {
        const res = await request(app)
            .post('/api/comments')
            .send({ postId: '507f1f77bcf86cd799439011', text: 'A comment' });
        expect(res.status).toBe(404);
    });

    test('blacklisted URL in text returns 400 with unsafeUrls', async () => {
        const res = await request(app)
            .post('/api/comments')
            .send({ postId: testPost._id.toString(), text: 'Check https://malware.example.com out' });
        expect(res.status).toBe(400);
        expect(res.body.unsafeUrls).toBeDefined();
        expect(res.body.unsafeUrls).toContain('https://malware.example.com');
    });

    test('safe URL in text returns 201', async () => {
        const res = await request(app)
            .post('/api/comments')
            .send({ postId: testPost._id.toString(), text: 'Visit https://example.com' });
        expect(res.status).toBe(201);
    });

    test('HTML in text is stripped from saved content', async () => {
        const res = await request(app)
            .post('/api/comments')
            .send({ postId: testPost._id.toString(), text: '<b>Bold</b> comment' });
        expect(res.status).toBe(201);
        expect(res.body.content).toBe('Bold comment');
    });

    test('text as number returns 400', async () => {
        const res = await request(app)
            .post('/api/comments')
            .send({ postId: testPost._id.toString(), text: 42 });
        expect(res.status).toBe(400);
    });
});
