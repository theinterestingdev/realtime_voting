import React, { useEffect, useState } from 'react';

const Voting = () => {
  const [votingPolls, setVotingPolls] = useState({
    amazon: 0,
    netflix: 0,
    disney: 0,
    hulu: 0,
  });
  const [totalVotes, setTotalVotes] = useState(0);
  const [vote, setVote] = useState('');
  const [error, setError] = useState('');
  const [ws, setWs] = useState(null);

  const colors = {
    amazon: '#FDF7F4',
    netflix: '#FB4141', 
    disney: '#79D7BE', 
    hulu: '#16C47F', 
  };

  const connectWebSocket = () => {
    const webSocket = new WebSocket(import.meta.env.VITE_WEBSOCKET_URL);

    webSocket.onopen = () => {
      console.log('WebSocket connected');
      setError('');
    };

    webSocket.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.type === 'update') {
        setVotingPolls(message.data.votingPolls);
        setTotalVotes(message.data.totalVotes);
        if (message.data.success) setError(''); // Clear error if update is successful
      } else if (message.type === 'error') {
        setError(message.message);
      }
    };

    webSocket.onerror = (err) => {
      console.error('WebSocket error:', err);
      setError('WebSocket error occurred. Please try again later.');
    };

    webSocket.onclose = () => {
      console.warn('WebSocket closed. Attempting to reconnect...');
      setTimeout(connectWebSocket, 3000); // Retry connection after 3 seconds
    };

    setWs(webSocket);
  };

  useEffect(() => {
    if (!ws) connectWebSocket();
    return () => {
      if (ws) ws.close();
    };
  }, [ws]);

  const addVote = (id) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setError('Unable to vote. WebSocket is not connected.');
      return;
    }

    ws.send(JSON.stringify({ type: 'vote', voteTo: id }));
    setVote(id); // Indicate the user has voted
  };

  return (
    <div className="voting_main w-[520px] flex-col justify-center items-center bg-black p-4 rounded-md">
      <h1 className="text-white font-extrabold bg-black">Make your vote count..</h1>
      {error && <p className="text-red-500">{error}</p>}
      {vote && <p className="text-green-500">Thank you for voting for {vote}!</p>}

      {Object.entries(votingPolls).map(([key, votes]) => {
        const percentage = totalVotes ? Math.round((votes / totalVotes) * 100) : 0;
        const barColor = colors[key] || '#FFFFFF'; // Default to white if color not defined
        return (
          <div key={key} className="progress cursor-pointer" onClick={() => addVote(key)}>
            <p className="text-white">{key.charAt(0).toUpperCase() + key.slice(1)}</p>
            <div className="progress-bar relative w-full h-6 bg-gray-700 rounded-md">
              <span
                data={`${percentage}%`}
                className="block h-full rounded-md"
                style={{ width: `${percentage}%`, backgroundColor: barColor }}
              ></span>
            </div>
          </div>
        );
      })}
      <p className="text-white">Total Votes: {totalVotes}</p>
    </div>
  );
};

export default Voting;
