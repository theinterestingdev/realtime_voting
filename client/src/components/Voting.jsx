import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';




const socket = io(import.meta.env.VITE_BACKEND_URL); 


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

  useEffect(() => {
    socket.on('update', (data) => {
      setVotingPolls(data.votingPolls);
      setTotalVotes(data.totalVotes);
    });

    socket.on('receive-vote', (data) => {
      setVotingPolls(data.votingPolls);
      setTotalVotes(data.totalVotes);
    });

    socket.on('vote-error', (message) => {
      setError(message);
    });

    return () => {
      socket.off('update');
      socket.off('receive-vote');
      socket.off('vote-error');
    };
  }, []);

  const addVote = (id) => {
    if (vote) {
      setError('You have already voted!');
      return;
    }
    socket.emit('send-vote', id);
    setVote(true);
  };

  return (
    <div className="voting_main w-[520px] flex-col justify-center items-center bg-black p-4 rounded-md">
      <h1 className="text-white font-extrabold bg-black">Make your vote count..</h1>
      <h2 className="text-white bg-black">👀</h2>
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
