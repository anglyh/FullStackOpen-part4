const blog = require('../models/blog');

const dummy = (blogs) => {
  return 1;
};

const totalLikes = (blogs) => {
  const reducer = (totalLikes, blog) => totalLikes + blog.likes;

  return blogs.length === 0 ? 0 : blogs.reduce(reducer, 0);
};

const favoriteBlog = (blogs) => {
  const mostLikedBlog = blogs.reduce((mostLikedBlog, blog) => {
    return mostLikedBlog.likes < blog.likes ? blog : mostLikedBlog;
  }, { likes: -Infinity });

  return blogs.length === 0
    ? 0
    : {
        title: mostLikedBlog.title,
        author: mostLikedBlog.author,
        likes: mostLikedBlog.likes,
      };
};

const mostBlogs = (blogs) => {
  const authorCounts = blogs.reduce((accumulator, blog) => {
    accumulator[blog.author] = (accumulator[blog.author] || 0) + 1;
    return accumulator;
  }, {});

  let maxAuthor = { author: null, blogs: -Infinity };
  // console.log('author Counts', authorCounts)
  // console.log('Object entries', Object.entries(authorCounts))

  for (const [author, blogs] of Object.entries(authorCounts)) {
    // console.log('author', author)
    // console.log('blogs', blogs)
    if (blogs > maxAuthor.blogs) {
      maxAuthor = { author, blogs };
    }
  }

  return maxAuthor;
};

const mostLikes = (blogs) => {
  const authorLikeCounts = blogs.reduce((accumulator, blog) => {
    accumulator[blog.author] = (accumulator[blog.author] || 0) + blog.likes;
    return accumulator;
  }, {});

  let mostLikedAuthor = { author: null, likes: -Infinity };

  //console.log('authorlikeCounts', authorLikeCounts);

  for (const [author, likes] of Object.entries(authorLikeCounts)) {
    if (likes > mostLikedAuthor.likes) {
      mostLikedAuthor = { author, likes };
    }
  }

  return mostLikedAuthor;
};

module.exports = {
  dummy,
  totalLikes,
  favoriteBlog,
  mostBlogs,
  mostLikes,
};
