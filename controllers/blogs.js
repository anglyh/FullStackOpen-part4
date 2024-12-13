const blogsRouter = require('express').Router();
const Blog = require('../models/blog');
const jwt = require('jsonwebtoken');
const { SECRET } = require('../utils/config');
const { userExtractor } = require('../utils/middleware');

blogsRouter.get('/', async (request, response) => {
  const blogs = await Blog
    .find({}).populate('user', { username: 1, name: 1 });
  response.json(blogs);
});

blogsRouter.post('/', userExtractor, async (request, response) => {
  const body = request.body;
  const decodedToken = jwt.verify(request.token, SECRET);

  // console.log('post request body:', body);
  // console.log('User before saving blog:', request.user);

  if (!decodedToken || !decodedToken.id) {
    return response.status(401).json({ error: 'token invalid' });
  }

  if (!body.title || !body.url) {
    return response.status(400).json({ error: 'title or url missing' });
  }

  if (!body.likes) {
    body.likes = 0;
  } 

  const user = request.user;
  //console.log('blog: user in request', user)

  const blog = new Blog({
    ...body,
    user: user._id
  });

  const savedBlog = await blog.save();

  user.blogs = [...user.blogs, savedBlog._id];
  await user.save();

  // console.log('User after saving blog:', user);
  response.status(201).json(savedBlog);
});

blogsRouter.put('/:id', userExtractor, async (request, response) => {
  const blog = request.body;

  if (!blog) {
    return response.status(400).json({ error: 'blog data is missing' });
  }

  const decodedToken = jwt.verify(request.token, SECRET);

  if (!decodedToken.id) {
    return response.status(401).json({ error: 'token invalid' });
  }
  
  const updatedBlog =  await Blog.findByIdAndUpdate(request.params.id, blog, { new: true });

  const user = request.user;

  const blogToChange = user.blogs.find(blogToChange => {
    //console.log('blog in array', blogToChange.toString());
    return blogToChange.toString() === request.params.id
  });

  //console.log('blog to change', blogToChange);
  user.blogs = user.blogs.map(b => b.toString() === blogToChange.toString() ? updatedBlog._id : b);

  await user.save();

  response.json(updatedBlog);
})

blogsRouter.delete('/:id', userExtractor, async (request, response) => {
  const decodedToken = jwt.verify(request.token, SECRET);
  const blog = await Blog.findById(request.params.id);

  // console.log('decodedToken', decodedToken)
  // console.log('blog before', blog);

  if (!blog) {
    return response.status(404).json({ error: 'blog not found' })
  }
  
  if (!decodedToken.id || blog.user.toString() !== decodedToken.id) {
    return response.status(401).json({ error: 'token invalid' });
  }
  
  await Blog.deleteOne({ _id: blog.id });
  
  const user = request.user;
  //console.log('user in delete:', user);
  
  user.blogs = user.blogs.filter(b => b.toString() !== blog._id.toString());
  
  await user.save();

  response.status(204).end();
})

module.exports = blogsRouter;