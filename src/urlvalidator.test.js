const { validateUrls } = require('./urlvalidator');

describe('validateUrls', () => {
    test('a safe URL returns safe: true', () => {
        // Seed Math.random to always return > 0.3 (safe)
        jest.spyOn(Math, 'random').mockReturnValue(0.99);

        const results = validateUrls(['https://google.com']);
        expect(results).toHaveLength(1);
        expect(results[0].safe).toBe(true);
        expect(results[0].reason).toBe('simulated_check');

        Math.random.mockRestore();
    });

    test('a blacklisted URL returns safe: false', () => {
        const results = validateUrls(['https://malware.example.com/path']);
        expect(results).toHaveLength(1);
        expect(results[0].safe).toBe(false);
        expect(results[0].reason).toBe('blacklisted');
    });

    test('bad-reputation.com is blacklisted and returns safe: false', () => {
        const results = validateUrls(['http://bad-reputation.com/page']);
        expect(results).toHaveLength(1);
        expect(results[0].safe).toBe(false);
        expect(results[0].reason).toBe('blacklisted');
    });

    test('case insensitive: VIRUS.EXE is still blocked', () => {
        const results = validateUrls(['http://VIRUS.EXE/malware']);
        expect(results).toHaveLength(1);
        expect(results[0].safe).toBe(false);
        expect(results[0].reason).toBe('blacklisted');
    });

    test('a malformed URL returns safe: false with reason malformed', () => {
        const results = validateUrls(['not-a-valid-url']);
        expect(results).toHaveLength(1);
        expect(results[0].safe).toBe(false);
        expect(results[0].reason).toBe('malformed');
    });
});
