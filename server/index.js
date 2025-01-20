const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { createServer } = require('http');
const { WebSocketServer } = require('ws');
require('dotenv').config();

const connectDB = require('./db/db');
const app = express();
const server = createServer(app);

// WebSocket Server
const wss = new WebSocketServer({ noServer: true });

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL, // Allow the frontend domain
  methods: ['GET', 'POST'],
  credentials: true,
}));
app.use(express.json());

// Connect to MongoDB
connectDB();

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

// Store voting state globally
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

// WebSocket Handling
wss.on('connection', async (ws, request) => {
  const ipAddress =
    request.headers['x-forwarded-for']?.split(',')[0] || request.socket.remoteAddress;

  console.log(`Connected: ${ipAddress}`);
  const votingData = await Voting.findOne();
  ws.send(JSON.stringify({ type: 'update', data: votingData }));

  // Ping/Pong Keep-Alive
  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', async (message) => {
    const parsedMessage = JSON.parse(message);

    if (parsedMessage.type === 'vote') {
      const { voteTo } = parsedMessage;

      if (!isVotingActive) {
        ws.send(JSON.stringify({ type: 'error', message: 'Voting is currently stopped!' }));
        return;
      }

      const votingData = await Voting.findOne();
      if (votingData.ipVotes.has(ipAddress)) {
        ws.send(JSON.stringify({ type: 'error', message: 'You have already voted!' }));
        return;
      }

      if (votingData.votingPolls[voteTo] !== undefined) {
        votingData.votingPolls[voteTo]++;
        votingData.totalVotes++;
        votingData.ipVotes.set(ipAddress, voteTo);

        await votingData.save();

        wss.clients.forEach((client) => {
          if (client.readyState === client.OPEN) {
            client.send(JSON.stringify({ type: 'update', data: votingData }));
          }
        });
      } else {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid vote option!' }));
      }
    }
  });

  ws.on('close', () => {
    console.log(`Disconnected: ${ipAddress}`);
  });

  ws.on('error', (err) => {
    console.error(`WebSocket error for ${ipAddress}:`, err);
  });
});

// Keep-Alive Interval
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

// Upgrade HTTP to WebSocket
server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

// Start Server
const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
