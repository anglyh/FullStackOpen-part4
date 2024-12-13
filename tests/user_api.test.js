const { after, beforeEach, test, describe } = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const helper = require('./test_helper');
const supertest = require('supertest');
const app = require('../app');
const api = supertest(app);
const bcrypt = require('bcrypt');

const User = require('../models/user');

describe('when there is initially one user in db', () => {
  beforeEach(async () => {
    console.log('deleting all users');
    await User.deleteMany({});
    console.log('all users deleted');

    const passwordHash = await bcrypt.hash('pepepe', 10);
    const user = new User({ username: 'root', name: 'Super user', passwordHash });
    
    await user.save();
  });

  test('creation fails with proper statuscode and message if username already taken', async () => {
    const usersAtStart = await helper.usersInDb();

    const newUser = {
      username: 'root',
      name: 'cualquier nombre',
      password: 'wjeiofewjoi'
    }

    const result = await api
      .post('/api/users')
      .send(newUser)
      .expect(400)
      .expect('Content-Type', /application\/json/)

    //console.log('Response body', result.body);
    
    assert(result.body.error.includes('expected `username` to be unique'));
    
    const usersAtEnd = await helper.usersInDb();
    assert.strictEqual(usersAtStart.length, usersAtEnd.length);
  })

  test('creation fails with proper status code and message for short username/password', async () => {
    const usersAtStart = await helper.usersInDb();

    const shortUsername = {
      username: 'ua',
      name: 'testing',
      password: '1212'
    }

    const result = await api
      .post('/api/users')
      .send(shortUsername)
      .expect(400)
      .expect('Content-Type', /application\/json/)

    //console.dir(result, { depth: null });
    assert(result.body.error.includes('User validation failed'));
  
    const shortPassword = {
      username: 'long',
      name: 'testing',
      password: '12'
    }

    const result2 = await api
      .post('/api/users')
      .send(shortPassword)
      .expect(400)
      .expect('Content-Type', /application\/json/)
    
    //console.dir(result2, { depth: null });
    assert(result2.body.error.includes('password shorter than the minimum'));

    const usersAtEnd = await helper.usersInDb();
    assert.strictEqual(usersAtEnd.length, usersAtStart.length);
  });

})

after(async () => {
  await mongoose.connection.close();
})