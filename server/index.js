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
  origin: process.env.CLIENT_URL,
  methods: ['GET', 'POST'],
  credentials: true,
}));
app.use(express.json());

// Connect to MongoDB
connectDB();

// Voting Schema and Model
// Add a field for voting state in the schema
const votingSchema = new mongoose.Schema({
  votingPolls: {
    amazon: { type: Number, default: 0 },
    netflix: { type: Number, default: 0 },
    disney: { type: Number, default: 0 },
    hulu: { type: Number, default: 0 },
  },
  totalVotes: { type: Number, default: 0 },
  ipVotes: { type: Map, of: String, default: {} },
  isVotingActive: { type: Boolean, default: false }, // Add this field
});

const Voting = mongoose.model('Voting', votingSchema);

// Update the initializeVotingData function
const initializeVotingData = async () => {
  const existingData = await Voting.findOne();
  if (!existingData) {
    const newVoting = new Voting();
    await newVoting.save();
  }
};
initializeVotingData();


// Update the routes to modify the state in the database
app.post('/start-voting', async (req, res) => {
  await Voting.updateOne({}, { $set: { isVotingActive: true } });
  res.send({ message: 'Voting started' });
});

app.post('/stop-voting', async (req, res) => {
  await Voting.updateOne({}, { $set: { isVotingActive: false } });
  res.send({ message: 'Voting stopped' });
});

app.get('/voting-status', async (req, res) => {
  const votingData = await Voting.findOne();
  res.send({ isVotingActive: votingData.isVotingActive });
});

app.post('/clear-votes', async (req, res) => {
  try {
    // Reset all voting data
    await Voting.updateOne({}, { 
      $set: { 
        votingPolls: { amazon: 0, netflix: 0, disney: 0, hulu: 0 },
        totalVotes: 0,
        ipVotes: {} 
      } 
    });
    res.send({ message: 'All votes and IPs have been cleared.' });
  } catch (error) {
    console.error('Error clearing votes:', error);
    res.status(500).send({ message: 'Failed to clear votes and IPs.' });
  }
});


// WebSocket Handling
wss.on('connection', async (ws, request) => {
  const ipAddress = request.socket.remoteAddress;

  console.log(`Connected: ${ipAddress}`);
  const votingData = await Voting.findOne();
  ws.send(JSON.stringify({ type: 'update', data: votingData }));

  ws.on('message', async (message) => {
    const parsedMessage = JSON.parse(message);

    if (parsedMessage.type === 'vote') {
      const { voteTo } = parsedMessage;

      // Fetch the current voting state from the database
      const votingData = await Voting.findOne();
      
      // Ensure voting is active before proceeding
      if (!votingData.isVotingActive) {
        ws.send(JSON.stringify({ type: 'error', message: 'Voting is currently stopped!' }));
        return;
      }

      // Check if the IP has already voted
      if (votingData.ipVotes.has(ipAddress)) {
        ws.send(JSON.stringify({ type: 'error', message: 'You have already voted!' }));
        return;
      }

      // Validate the vote option and update the database
      if (votingData.votingPolls[voteTo] !== undefined) {
        votingData.votingPolls[voteTo]++;
        votingData.totalVotes++;
        votingData.ipVotes.set(ipAddress, voteTo); // Record the vote with the IP address

        await votingData.save();

        // Broadcast updated voting data to all connected clients
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
