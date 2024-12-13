const { test, describe, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const helper = require('./test_helper');
const supertest = require('supertest');
const app = require('../app');
const api = supertest(app);
const bcrypt = require('bcrypt');

const Blog = require('../models/blog');
const User = require('../models/user');

let token;
let userId;

describe('when there is initially some blogs saved and one user', () => {
  beforeEach(async () => {
    await Blog.deleteMany({});
    await User.deleteMany({});
    console.log('cleared');
  
    const passwordHash = await bcrypt.hash('testpass', 10);
    const user = new User({ username: 'test', name: 'test name', passwordHash});
    const savedUser = await user.save();
    userId = savedUser._id;
    // console.log('done creating user');
    // console.log('User created with ID:', userId);

    const userLogged = await api
      .post('/api/login')
      .send({ username: 'test', password: 'testpass' })
      .expect(200)
      .expect('Content-Type', /application\/json/)

    token = `Bearer ${userLogged.body.token}`
    //console.log('Token generated', token);

    const blogsWithUser = helper.initialBlogs.map(blog => ({
      ...blog,
      user: userId
    }))

    const blogObjects = blogsWithUser.map(blog => new Blog(blog));
    const savedBlogs = await Promise.all(blogObjects.map(blog => blog.save()));

    //console.log('beforeEach Saved Blogs', savedBlogs);
    savedUser.blogs = savedBlogs.map(blog => blog._id);
    await savedUser.save();
    //console.log('Blogs created:', blogsWithUser);
  });
  
  test('blogs are returned as json', async () => {
    await api
      .get('/api/blogs')
      .expect(200)
      .expect('Content-Type', /application\/json/)
  });
  
  test('returns the correct length of blogs', async () => {
    const response = await api.get('/api/blogs');
  
    assert.strictEqual(response.body.length, helper.initialBlogs.length)
  });
  
  test('id property of blog posts is named id', async () => {
    const response = await api.get('/api/blogs');
  
    const allCorrect = response.body.every(blog => Object.hasOwn(blog, 'id'))
    
    assert(allCorrect);
  })

  describe('addition of a new blog', () => {
    test('a valid blog can be added', async () => {
      const newBlog = {
        title: 'test-blog',
        author: 'test-blog',
        url: 'http://blog.cleancoder.com/test-blog',
        likes: 0,
      };
    
      await api
        .post('/api/blogs')
        .send(newBlog)
        .set({ Authorization: token })
        .expect(201)
        .expect('Content-Type', /application\/json/)
      
      const blogsAtEnd = await helper.blogsInDb();
      assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length + 1);
    
      const titles = blogsAtEnd.map(b => b.title);
      assert(titles.includes('test-blog'));
    })

    test('missing likes property defaults to be 0', async () => {
      const newBlog = {
        title: 'test-blog2',
        author: 'test-blog2',
        url: 'http://blog.cleancoder.com/test-blog2',
      };
    
      await api
        .post('/api/blogs')
        .send(newBlog)
        .set({ Authorization: token })
        .expect(201)
        .expect('Content-Type', /application\/json/)
    
      const blogsAtEnd = await helper.blogsInDb();
      const recentBlog = blogsAtEnd[blogsAtEnd.length - 1];
    
      assert.strictEqual(recentBlog.likes, 0);
    })

    test('blog without title or url is not added', async () => {        
      const blogWithoutTitle = {
        author: 'test-author',
        url: 'http://blog.cleancoder.com/test-blog2',
      }
      await api
        .post('/api/blogs')
        .send(blogWithoutTitle)
        .set({ Authorization: token })
        .expect(400)
    
      const blogWithoutUrl = {
        title: 'test-blog',
        author: 'test-author',
      }
      await api
        .post('/api/blogs')
        .send(blogWithoutUrl)
        .set({ Authorization: token })
        .expect(400)
    
      const blogWithoutTitleAndUrl = {
        author: 'test-author',
      };
      await api
        .post('/api/blogs')
        .send(blogWithoutTitleAndUrl)
        .set({ Authorization: token })
        .expect(400)
      
      const blogsAtEnd = await helper.blogsInDb();
      assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length);
    })

    test('fails with status code 401 with invalid token', async () => {
      const blogsAtStart = await helper.blogsInDb();

      const newBlog = {
        title: 'test-blog',
        author: 'test-blog',
        url: 'http://blog.cleancoder.com/test-blog',
        likes: 11,
      };

      const result = await api
        .post('/api/blogs')
        .send(newBlog)
        .expect(401)
        .expect('Content-Type', /application\/json/)

      assert(result.body.error.includes('token invalid'));

      const blogsAtEnd = await helper.blogsInDb();
      assert.strictEqual(blogsAtEnd.length, blogsAtStart.length);
    })
  })
  
  describe('updating an existing blog', () => {
    test('succeeds at updating the likes property', async () => {
      const blogsAtStart = await helper.blogsInDb();
      const blogToUpdate = blogsAtStart[0];

      const updatedBlog = {
        ...blogToUpdate,
        likes: 2,
      }

      await api
        .put(`/api/blogs/${blogToUpdate.id}`)
        .send(updatedBlog)
        .set({ Authorization: token })
        .expect('Content-Type', /application\/json/)
      
      const blogsAtEnd = await helper.blogsInDb();

      assert.deepStrictEqual(blogsAtEnd[0], updatedBlog);
    })
  })

  describe('deletion of a blog', () => {
    test('succeeds with status code 204 if id is valid', async () => {
      const blogsAtStart = await helper.blogsInDb();
      const blogToDelete = blogsAtStart[0];

      await api
        .delete(`/api/blogs/${blogToDelete.id}`)
        .set({ Authorization: token })
        .expect(204)
      
      const blogsAtEnd = await helper.blogsInDb();
      assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length - 1);

      const titles = blogsAtEnd.map(b => b.title);
      assert(!titles.includes(blogToDelete.title))
    })
  })
})

after(async () => {
  await mongoose.connection.close();
});
