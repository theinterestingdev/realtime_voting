import React, { useEffect, useState } from 'react';

const Voting = () => {
  const [votingPolls, setVotingPolls] = useState({
    amazon: 0,
    netflix: 0,
    disney: 0,
    hulu: 0,
  });
  const [totalVotes, setTotalVotes] = useState(0);
  const [vote, setVote] = useState(false);
  const [error, setError] = useState('');
  const [ws, setWs] = useState(null);

  useEffect(() => {
    const webSocket = new WebSocket(import.meta.env.VITE_WEBSOCKET_URL);

    webSocket.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.type === 'update') {
        setVotingPolls(message.data.votingPolls);
        setTotalVotes(message.data.totalVotes);
      } else if (message.type === 'error') {
        setError(message.message);
      }
    };

    webSocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    setWs(webSocket);

    return () => {
      webSocket.close();
    };
  }, []);

  const addVote = (id) => {
    if (vote) {
      setError('You have already voted!');
      return;
    }
    ws.send(JSON.stringify({ type: 'vote', voteTo: id }));
    setVote(true);
  };

  return (
    <div className="voting_main w-[520px] flex-col justify-center items-center bg-black p-4 rounded-md">
      <h1 className="text-white font-extrabold">Make your vote count..</h1>
      {error && <p className="text-red-500">{error}</p>}
      {Object.entries(votingPolls).map(([key, votes]) => {
        const percentage = totalVotes ? Math.round((votes / totalVotes) * 100) : 0;
        return (
          <div key={key} className="progress" onClick={() => addVote(key)}>
            <p className="text-white">{key.charAt(0).toUpperCase() + key.slice(1)}</p>
            <div className="progress-bar relative w-full bg-gray-300 h-6 rounded-md">
              <span
                data={`${percentage}%`}
                className="percent-tag"
                style={{ width: `${percentage}%` }}
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
