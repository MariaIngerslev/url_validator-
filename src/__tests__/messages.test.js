const request = require('supertest');
const app = require('../app');

const validPayload = {
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
    message: 'Hello there',
};

describe('POST /api/messages', () => {
    test('all valid fields returns 201', async () => {
        const res = await request(app).post('/api/messages').send(validPayload);
        expect(res.status).toBe(201);
        expect(res.body.firstName).toBe('Jane');
    });

    test('missing firstName returns 400', async () => {
        const { firstName, ...payload } = validPayload;
        const res = await request(app).post('/api/messages').send(payload);
        expect(res.status).toBe(400);
    });

    test('missing lastName returns 400', async () => {
        const { lastName, ...payload } = validPayload;
        const res = await request(app).post('/api/messages').send(payload);
        expect(res.status).toBe(400);
    });

    test('missing email returns 400', async () => {
        const { email, ...payload } = validPayload;
        const res = await request(app).post('/api/messages').send(payload);
        expect(res.status).toBe(400);
    });

    test('missing message returns 400', async () => {
        const { message, ...payload } = validPayload;
        const res = await request(app).post('/api/messages').send(payload);
        expect(res.status).toBe(400);
    });

    test('empty string field returns 400', async () => {
        const res = await request(app)
            .post('/api/messages')
            .send({ ...validPayload, firstName: '' });
        expect(res.status).toBe(400);
    });

    test('field as number returns 400', async () => {
        const res = await request(app)
            .post('/api/messages')
            .send({ ...validPayload, email: 12345 });
        expect(res.status).toBe(400);
    });

    test('field as object returns 400', async () => {
        const res = await request(app)
            .post('/api/messages')
            .send({ ...validPayload, message: { text: 'hi' } });
        expect(res.status).toBe(400);
    });

    test('whitespace-only field returns 400', async () => {
        const res = await request(app)
            .post('/api/messages')
            .send({ ...validPayload, lastName: '   ' });
        expect(res.status).toBe(400);
    });
});
