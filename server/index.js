const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { Server } = require('socket.io');
const http = require('http');
const connectDB = require('./db/db');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL, // Vercel frontend URL
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'], 
  },
  transports: ['websocket'],
});

connectDB();

app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json());

// Voting Schema and Model
const votingSchema = new mongoose.Schema({
  votingPolls: {
    amazon: { type: Number, default: 0 },
    netflix: { type: Number, default: 0 },
    disney: { type: Number, default: 0 },
    hulu: { type: Number, default: 0 },
  },
  totalVotes: { type: Number, default: 0 },
  ipVotes: { type: Map, of: String, default: {} },
});
const Voting = mongoose.model('Voting', votingSchema);

// Initialize Voting Data
const initializeVotingData = async () => {
  const existingData = await Voting.findOne();
  if (!existingData) {
    const newVoting = new Voting();
    await newVoting.save();
  }
};
initializeVotingData();

// Store the voting state globally
let isVotingActive = false;

// Routes
app.post('/start-voting', (req, res) => {
  isVotingActive = true;
  res.send({ message: 'Voting started' });
});

app.post('/stop-voting', (req, res) => {
  isVotingActive = false;
  res.send({ message: 'Voting stopped' });
});

app.post('/clear-votes', async (req, res) => {
  await Voting.updateOne(
    {},
    {
      $set: {
        votingPolls: { amazon: 0, netflix: 0, disney: 0, hulu: 0 },
        totalVotes: 0,
      },
      $unset: { ipVotes: '' },
    }
  );
  res.send({ message: 'Votes and IPs cleared' });
});

// Socket.IO Events
io.on('connection', async (socket) => {
  console.log('New client connected');
  const votingData = await Voting.findOne();
  socket.emit('update', votingData);

  socket.on('send-vote', async (voteTo) => {
    if (!isVotingActive) {
      socket.emit('vote-error', 'Voting is currently stopped!');
      return;
    }

    const votingData = await Voting.findOne(); // Fetch latest data from DB
    if (votingData.votingPolls[voteTo] !== undefined) {
      votingData.votingPolls[voteTo]++;
      votingData.totalVotes++;
      votingData.ipVotes.set(socket.request.connection.remoteAddress, voteTo);

      await votingData.save();
      io.emit('receive-vote', votingData);
    } else {
      socket.emit('vote-error', 'Invalid vote option!');
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Start Server
const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
