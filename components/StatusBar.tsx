interface StatusBarProps {
  status: 'connecting' | 'waiting' | 'matched' | 'reconnecting';
}

export function StatusBar({ status }: StatusBarProps) {
  const getStatusInfo = () => {
    switch (status) {
      case 'connecting':
        return { text: 'Connecting...', color: 'text-yellow-400' };
      case 'waiting':
        return { text: 'Waiting for partner...', color: 'text-blue-400' };
      case 'matched':
        return { text: 'Connected', color: 'text-green-400' };
      case 'reconnecting':
        return { text: 'Reconnecting...', color: 'text-orange-400' };
      default:
        return { text: 'Unknown', color: 'text-gray-400' };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="bg-slate-800 border-b border-slate-700 px-4 py-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${statusInfo.color} animate-pulse`} />
          <span className={`text-sm ${statusInfo.color}`}>
            {statusInfo.text}
          </span>
        </div>
        <div className="text-xs text-slate-400">
          Social Playground
        </div>
      </div>
    </div>
  );
}
