const validateObjectId = require('../middleware/validateObjectId');

function makeReqResNext(paramName, paramValue) {
    const req = { params: { [paramName]: paramValue } };
    const res = {
        status(code) { this._status = code; return this; },
        json(body) { this._body = body; return this; },
    };
    const next = jest.fn();
    return { req, res, next };
}

describe('validateObjectId middleware', () => {
    const middleware = validateObjectId('id');

    test('valid ObjectId calls next()', () => {
        const { req, res, next } = makeReqResNext('id', '507f1f77bcf86cd799439011');
        middleware(req, res, next);
        expect(next).toHaveBeenCalledTimes(1);
    });

    test('invalid format returns 400', () => {
        const { req, res, next } = makeReqResNext('id', 'abc');
        middleware(req, res, next);
        expect(next).not.toHaveBeenCalled();
        expect(res._status).toBe(400);
        expect(res._body).toMatchObject({ error: expect.stringContaining('Invalid') });
    });

    test('missing param returns 400', () => {
        const { req, res, next } = makeReqResNext('id', undefined);
        middleware(req, res, next);
        expect(next).not.toHaveBeenCalled();
        expect(res._status).toBe(400);
    });
});
