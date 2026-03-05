const request = require('supertest');
const app = require('../app');
const Post = require('../models/Post');

describe('POST /api/posts', () => {
    test('valid title and content returns 201 with post data', async () => {
        const res = await request(app)
            .post('/api/posts')
            .send({ title: 'Test Post', content: 'Test content' });
        expect(res.status).toBe(201);
        expect(res.body).toMatchObject({ title: 'Test Post', content: 'Test content' });
        expect(res.body._id).toBeDefined();
        expect(res.body.createdAt).toBeDefined();
    });

    test('missing title returns 400', async () => {
        const res = await request(app)
            .post('/api/posts')
            .send({ content: 'Test content' });
        expect(res.status).toBe(400);
    });

    test('missing content returns 400', async () => {
        const res = await request(app)
            .post('/api/posts')
            .send({ title: 'Test Post' });
        expect(res.status).toBe(400);
    });

    test('title as number returns 400', async () => {
        const res = await request(app)
            .post('/api/posts')
            .send({ title: 42, content: 'Test content' });
        expect(res.status).toBe(400);
    });

    test('content as object returns 400', async () => {
        const res = await request(app)
            .post('/api/posts')
            .send({ title: 'Test Post', content: { text: 'nope' } });
        expect(res.status).toBe(400);
    });

    test('empty string title returns 400', async () => {
        const res = await request(app)
            .post('/api/posts')
            .send({ title: '', content: 'Test content' });
        expect(res.status).toBe(400);
    });

    test('empty string content returns 400', async () => {
        const res = await request(app)
            .post('/api/posts')
            .send({ title: 'Test Post', content: '' });
        expect(res.status).toBe(400);
    });
});

describe('GET /api/posts', () => {
    test('empty DB returns 200 with empty array', async () => {
        const res = await request(app).get('/api/posts');
        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
    });

    test('returns posts sorted newest first', async () => {
        await Post.create({ title: 'First', content: 'First content', createdAt: new Date('2024-01-01') });
        await Post.create({ title: 'Second', content: 'Second content', createdAt: new Date('2024-06-01') });
        const res = await request(app).get('/api/posts');
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(2);
        expect(res.body[0].title).toBe('Second');
        expect(res.body[1].title).toBe('First');
    });
});

describe('GET /api/posts/latest', () => {
    test('no posts returns 404', async () => {
        const res = await request(app).get('/api/posts/latest');
        expect(res.status).toBe(404);
    });

    test('returns the most recent post', async () => {
        await Post.create({ title: 'Old Post', content: 'Old content', createdAt: new Date('2024-01-01') });
        await Post.create({ title: 'New Post', content: 'New content', createdAt: new Date('2024-12-01') });
        const res = await request(app).get('/api/posts/latest');
        expect(res.status).toBe(200);
        expect(res.body.title).toBe('New Post');
    });
});

describe('GET /api/posts/:id', () => {
    test('valid existing ID returns 200 with post', async () => {
        const post = await Post.create({ title: 'My Post', content: 'My content' });
        const res = await request(app).get(`/api/posts/${post._id}`);
        expect(res.status).toBe(200);
        expect(res.body.title).toBe('My Post');
    });

    test('valid format but non-existing ID returns 404', async () => {
        const res = await request(app).get('/api/posts/507f1f77bcf86cd799439011');
        expect(res.status).toBe(404);
    });

    test('invalid ID format returns 400', async () => {
        const res = await request(app).get('/api/posts/not-an-id');
        expect(res.status).toBe(400);
    });
});
