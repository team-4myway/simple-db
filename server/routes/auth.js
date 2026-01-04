const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getDB } = require('../db');

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!(username && password)) {
      return res.status(400).send('All input is required');
    }

    const db = getDB();
    const existingUser = await db.get('SELECT * FROM users WHERE username = ?', [username]);

    if (existingUser) {
      return res.status(409).send('User already exist. Please Login');
    }

    const encryptedPassword = await bcrypt.hash(password, 10);

    const result = await db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, encryptedPassword]);
    
    const user = { id: result.lastID, username };

    const token = jwt.sign(
      { user_id: user.id, username },
      process.env.TOKEN_KEY || 'secret_key',
      { expiresIn: '2h' }
    );

    res.status(201).json({ ...user, token });
  } catch (err) {
    console.log(err);
    res.status(500).send('Server Error');
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!(username && password)) {
      return res.status(400).send('All input is required');
    }

    const db = getDB();
    const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);

    if (user && (await bcrypt.compare(password, user.password))) {
      const token = jwt.sign(
        { user_id: user.id, username },
        process.env.TOKEN_KEY || 'secret_key',
        { expiresIn: '2h' }
      );
      return res.status(200).json({ ...user, token });
    }
    res.status(400).send('Invalid Credentials');
  } catch (err) {
    console.log(err);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
