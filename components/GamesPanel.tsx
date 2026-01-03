'use client';

import { useState } from 'react';

interface GamesPanelProps {
  roomId: string;
}

export function GamesPanel({ roomId }: GamesPanelProps) {
  const [selectedGame, setSelectedGame] = useState<string | null>(null);

  const games = [
    { id: 'tic-tac-toe', name: 'Tic-Tac-Toe', description: 'Classic strategy game' },
    { id: 'connect-four', name: 'Connect Four', description: 'Drop pieces to connect four' },
    { id: 'air-hockey', name: 'Air Hockey', description: 'Fast-paced arcade game' }
  ];

  const handleGameSelect = (gameId: string) => {
    setSelectedGame(gameId);
  };

  const renderGame = () => {
    switch (selectedGame) {
      case 'tic-tac-toe':
        return <TicTacToe roomId={roomId} />;
      case 'connect-four':
        return <ConnectFour roomId={roomId} />;
      case 'air-hockey':
        return <AirHockey roomId={roomId} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {!selectedGame ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {games.map((game) => (
            <button
              key={game.id}
              onClick={() => handleGameSelect(game.id)}
              className="p-4 bg-slate-700 hover:bg-slate-600 rounded-lg text-left transition-colors"
            >
              <h3 className="font-semibold mb-2">{game.name}</h3>
              <p className="text-sm text-slate-300">{game.description}</p>
            </button>
          ))}
        </div>
      ) : (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">
              {games.find(g => g.id === selectedGame)?.name}
            </h3>
            <button
              onClick={() => setSelectedGame(null)}
              className="px-3 py-1 bg-slate-600 hover:bg-slate-700 rounded transition-colors"
            >
              Back
            </button>
          </div>
          {renderGame()}
        </div>
      )}
    </div>
  );
}

// Tic-Tac-Toe Component
function TicTacToe({ roomId }: { roomId: string }) {
  const [board, setBoard] = useState<(string | null)[]>(Array(9).fill(null));
  const [isMyTurn, setIsMyTurn] = useState(true);
  const [winner, setWinner] = useState<string | null>(null);

  const handleCellClick = (index: number) => {
    if (board[index] || winner || !isMyTurn) return;
    
    const newBoard = [...board];
    newBoard[index] = 'X';
    setBoard(newBoard);
    setIsMyTurn(false);
    
    // TODO: Send move to opponent via real-time
  };

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setIsMyTurn(true);
    setWinner(null);
  };

  return (
    <div className="bg-slate-900 p-6 rounded-lg">
      <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto mb-4">
        {board.map((cell, index) => (
          <button
            key={index}
            onClick={() => handleCellClick(index)}
            className="w-20 h-20 bg-slate-700 hover:bg-slate-600 rounded text-2xl font-bold transition-colors"
            disabled={!!cell || !!winner}
          >
            {cell}
          </button>
        ))}
      </div>
      {winner && (
        <div className="text-center mb-4">
          <p className="text-lg font-semibold">{winner} wins!</p>
        </div>
      )}
      <div className="text-center">
        <button
          onClick={resetGame}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
        >
          New Game
        </button>
      </div>
    </div>
  );
}

// Connect Four Component
function ConnectFour({ roomId }: { roomId: string }) {
  const [board, setBoard] = useState<(string | null)[]>(Array(42).fill(null));
  const [isMyTurn, setIsMyTurn] = useState(true);

  const handleColumnClick = (col: number) => {
    if (!isMyTurn) return;
    
    // Find the lowest empty row in the column
    for (let row = 5; row >= 0; row--) {
      const index = row * 7 + col;
      if (!board[index]) {
        const newBoard = [...board];
        newBoard[index] = 'X';
        setBoard(newBoard);
        setIsMyTurn(false);
        break;
      }
    }
  };

  return (
    <div className="bg-slate-900 p-6 rounded-lg">
      <div className="grid grid-cols-7 gap-1 max-w-md mx-auto mb-4">
        {Array(7).fill(null).map((_, col) => (
          <button
            key={col}
            onClick={() => handleColumnClick(col)}
            className="space-y-1"
          >
            {Array(6).fill(null).map((_, row) => {
              const index = row * 7 + col;
              return (
                <div
                  key={row}
                  className="w-12 h-12 bg-slate-700 rounded-full border-2 border-slate-600"
                >
                  {board[index] && (
                    <div className={`w-full h-full rounded-full ${
                      board[index] === 'X' ? 'bg-red-500' : 'bg-yellow-500'
                    }`} />
                  )}
                </div>
              );
            })}
          </button>
        ))}
      </div>
      <div className="text-center text-slate-300">
        {isMyTurn ? 'Your turn' : 'Opponent\'s turn'}
      </div>
    </div>
  );
}

// Air Hockey Component
function AirHockey({ roomId }: { roomId: string }) {
  return (
    <div className="bg-slate-900 p-6 rounded-lg">
      <div className="relative w-full h-96 bg-slate-800 rounded-lg border-4 border-slate-600">
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-slate-400">Air Hockey Game</p>
        </div>
      </div>
      <div className="text-center mt-4 text-slate-300">
        Use your mouse to control the paddle
      </div>
    </div>
  );
}
