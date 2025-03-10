const http = require('http');
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');

connectDB();
const app = express();
app.use(express.json());
app.use(cors());

app.use('/api/auth', authRoutes);
//const server = http.createServer((req, res) => {
  //  res.writeHead(200, { 'Content-Type': 'text/plain' });
    //res.end('Hello, world2!\n');
//});

app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});