// Shared in-memory data store for posts and comments

let posts = [];
let nextPostId = 1;

let comments = [];
let nextCommentId = 1;

function getPosts() {
    return posts;
}

function getPostById(id) {
    return posts.find((p) => p.id === id);
}

function addPost(post) {
    const newPost = { id: nextPostId++, ...post, date: new Date().toISOString() };
    posts.push(newPost);
    return newPost;
}

function getCommentsByPostId(postId) {
    return comments.filter((c) => c.postId === postId);
}

function addComment(comment) {
    const newComment = { id: nextCommentId++, ...comment, date: new Date().toISOString() };
    comments.push(newComment);
    return newComment;
}

module.exports = {
    getPosts,
    getPostById,
    addPost,
    getCommentsByPostId,
    addComment
};
