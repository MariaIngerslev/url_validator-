const Post = require('../models/Post');
const { seedPosts } = require('../../scripts/seed');

describe('seedPosts', () => {
    it('creates all three posts on first run', async () => {
        await seedPosts(Post);
        const count = await Post.countDocuments();
        expect(count).toBe(3);
    });

    it('creates posts with the correct slugs', async () => {
        await seedPosts(Post);
        const slugs = (await Post.find({}, 'slug').lean()).map(p => p.slug).sort();
        expect(slugs).toEqual([
            'defense-in-depth',
            'fra-ide-til-kode',
            'the-stateless-developer',
        ]);
    });

    it('is idempotent — re-running does not create duplicates', async () => {
        await seedPosts(Post);
        await seedPosts(Post);
        const count = await Post.countDocuments();
        expect(count).toBe(3);
    });

    it('upserts by slug so a title change does not create a duplicate', async () => {
        await seedPosts(Post);
        await Post.updateOne({ slug: 'fra-ide-til-kode' }, { $set: { title: 'Changed Title' } });
        await seedPosts(Post);
        const count = await Post.countDocuments();
        expect(count).toBe(3);
    });
});
