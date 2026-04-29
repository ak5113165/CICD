const express = require('express');
const mongoose = require("mongoose");
const User = require('./models/User');
const Post = require('./models/Post');
const bcrypt = require('bcrypt');
const app = express();
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const uploadMiddleware = multer({ dest: 'uploads/' });
const fs = require('fs');

const salt = bcrypt.genSaltSync(10);
const secret = 'asdfe45we45w345wegw345werjktjwertkj';

const allowedOrigins = [
  'http://localhost:3000',
  'http://10.5.50.157:3000',
];
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(__dirname + '/uploads'));

const mongoUrl = process.env.MONGO_URL || 'mongodb+srv://ak5113165_db_user:9W8UsBFo6RUoL4gj@cluster0.zjktivl.mongodb.net/?appName=Cluster0';
mongoose.connect(mongoUrl);

app.post('/register', async (req,res) => {
  const {username,password} = req.body;
  try{
    const userDoc = await User.create({
      username,
      password:bcrypt.hashSync(password,salt),
    });
    res.json(userDoc);
  } catch(e) {
    console.log(e);
    res.status(400).json(e);
  }
});

app.post('/login', async (req,res) => {
  const {username,password} = req.body;
  const userDoc = await User.findOne({username});
  if (!userDoc) {
    return res.status(400).json('wrong credentials');
  }
  const passOk = bcrypt.compareSync(password, userDoc.password);
  if (passOk) {
    jwt.sign({username,id:userDoc._id}, secret, {}, (err,token) => {
      if (err) {
        console.error('JWT sign error:', err);
        return res.status(500).json('login failed');
      }
      res.cookie('token', token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: false,
        path: '/',
      }).json({
        id:userDoc._id,
        username,
      });
    });
  } else {
    res.status(400).json('wrong credentials');
  }
});

app.get('/profile', (req,res) => {
  const {token} = req.cookies;
  if (!token) {
    return res.status(401).json('not authenticated');
  }
  jwt.verify(token, secret, {}, (err,info) => {
    if (err) {
      return res.status(401).json('invalid token');
    }
    res.json(info);
  });
});

app.put('/profile', async (req,res) => {
  const {token} = req.cookies;
  if (!token) {
    return res.status(401).json('not authenticated');
  }
  jwt.verify(token, secret, {}, async (err,info) => {
    if (err) {
      return res.status(401).json('invalid token');
    }
    const {username, password} = req.body;
    const updateData = {};
    if (username) updateData.username = username;
    if (password) updateData.password = bcrypt.hashSync(password, salt);
    const userDoc = await User.findByIdAndUpdate(info.id, updateData, {new: true});
    if (!userDoc) {
      return res.status(404).json('user not found');
    }
    res.json({id: userDoc._id, username: userDoc.username});
  });
});

app.post('/logout', (req,res) => {
  res.cookie('token', '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    path: '/',
  }).json('ok');
});

app.post('/post', uploadMiddleware.single('file'), async (req,res) => {
  if (!req.file) {
    return res.status(400).json('file missing');
  }
  const {originalname,path} = req.file;
  const parts = originalname.split('.');
  const ext = parts[parts.length - 1];
  const newPath = path+'.'+ext;
  fs.renameSync(path, newPath);

  const {token} = req.cookies;
  if (!token) {
    return res.status(401).json('not authenticated');
  }
  jwt.verify(token, secret, {}, async (err,info) => {
    if (err) {
      return res.status(401).json('invalid token');
    }
    const {title,summary,content} = req.body;
    const postDoc = await Post.create({
      title,
      summary,
      content,
      cover:newPath,
      author:info.id,
    });
    res.json(postDoc);
  });
});

app.put('/post',uploadMiddleware.single('file'), async (req,res) => {
  let newPath = null;
  if (req.file) {
    const {originalname,path} = req.file;
    const parts = originalname.split('.');
    const ext = parts[parts.length - 1];
    newPath = path+'.'+ext;
    fs.renameSync(path, newPath);
  }

  const {token} = req.cookies;
  if (!token) {
    return res.status(401).json('not authenticated');
  }
  jwt.verify(token, secret, {}, async (err,info) => {
    if (err) {
      return res.status(401).json('invalid token');
    }
    const {id,title,summary,content} = req.body;
    const postDoc = await Post.findById(id);
    if (!postDoc) {
      return res.status(404).json('post not found');
    }
    const isAuthor = JSON.stringify(postDoc.author) === JSON.stringify(info.id);
    if (!isAuthor) {
      return res.status(403).json('you are not the author');
    }
    await postDoc.update({
      title,
      summary,
      content,
      cover: newPath ? newPath : postDoc.cover,
    });

    res.json(postDoc);
  });
});

app.get('/post', async (req,res) => {
  res.json(
    await Post.find()
      .populate('author', ['username'])
      .sort({createdAt: -1})
      .limit(20)
  );
});

app.get('/post/:id', async (req, res) => {
  const {id} = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json('invalid post id');
  }
  const postDoc = await Post.findById(id).populate('author', ['username']);
  if (!postDoc) {
    return res.status(404).json('post not found');
  }
  res.json(postDoc);
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend server started on port ${PORT}`);
});
