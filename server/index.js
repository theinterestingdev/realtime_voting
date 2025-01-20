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
  ipVotes: { type: Map, of: String, default: {} }, // Retain Map for performance
  isVotingActive: { type: Boolean, default: false },
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

// Utility Functions
function sanitizeKey(key) {
  return key.replace(/\./g, '_'); // Replace dots with underscores
}

function decodeKey(key) {
  return key.replace(/_/g, '.'); // Replace underscores back to dots
}



// WebSocket Handling
wss.on('connection', async (ws, request) => {
  const forwarded = request.headers['x-forwarded-for'];
  const ipAddress = forwarded ? forwarded.split(',')[0].trim() : request.socket.remoteAddress;
  const sanitizedIP = sanitizeKey(ipAddress); // Sanitize the IP address

  console.log(`Connected: ${ipAddress}`);
  const votingData = await Voting.findOne();
  ws.send(JSON.stringify({ type: 'update', data: votingData }));

  ws.on('message', async (message) => {
    const parsedMessage = JSON.parse(message);
  
    if (parsedMessage.type === 'vote') {
      const { voteTo } = parsedMessage;
      const votingData = await Voting.findOne();
  
      if (!votingData.isVotingActive) {
        ws.send(JSON.stringify({ type: 'error', message: 'Voting is currently stopped!' }));
        return;
      }
  
      if (votingData.ipVotes.has(sanitizedIP)) {
        ws.send(JSON.stringify({ type: 'error', message: 'You have already voted!' }));
        return;
      }
  
      if (votingData.votingPolls[voteTo] !== undefined) {
        // Update vote count and IP record
        votingData.votingPolls[voteTo]++;
        votingData.totalVotes++;
        votingData.ipVotes.set(sanitizedIP, voteTo); // Use sanitized key
  
        await votingData.save();
  
        // Send real-time update to all connected clients
        wss.clients.forEach((client) => {
          if (client.readyState === client.OPEN) {
            client.send(JSON.stringify({ type: 'update', data: votingData }));
          }
        });
  
        // Send confirmation to the voter
        ws.send(JSON.stringify({ type: 'confirmation', message: `Thank you for voting for ${voteTo}` }));
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
  const decodedIPs = Array.from(votingData.ipVotes.keys()).map(decodeKey);
console.log(decodedIPs);

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
