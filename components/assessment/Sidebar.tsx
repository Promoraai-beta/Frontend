import type { TabType } from '@/types/assessment';
import { Button } from '@/components/ui/button';

interface SidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <div className="w-16 bg-gray-900 border-r border-gray-800 flex flex-col">
      <Button
        variant="ghost"
        onClick={() => onTabChange('task')}
        className={`flex-1 px-2 py-2 transition-colors border-l-4 rounded-none ${
          activeTab === 'task' 
            ? 'bg-gray-800 border-blue-500 text-blue-400' 
            : 'border-transparent text-gray-400 hover:text-white hover:bg-gray-800'
        }`}
        title="Task"
      >
        <div className="writing-vertical-rl text-sm font-medium">Task</div>
      </Button>
      <Button
        variant="ghost"
        onClick={() => onTabChange('chat')}
        className={`flex-1 px-2 py-2 transition-colors border-l-4 rounded-none ${
          activeTab === 'chat' 
            ? 'bg-gray-800 border-blue-500 text-blue-400' 
            : 'border-transparent text-gray-400 hover:text-white hover:bg-gray-800'
        }`}
        title="Chat"
      >
        <div className="writing-vertical-rl text-sm font-medium">Chat</div>
      </Button>
      <Button
        variant="ghost"
        onClick={() => onTabChange('code')}
        className={`flex-1 px-2 py-2 transition-colors border-l-4 rounded-none ${
          activeTab === 'code' 
            ? 'bg-gray-800 border-blue-500 text-blue-400' 
            : 'border-transparent text-gray-400 hover:text-white hover:bg-gray-800'
        }`}
        title="Code"
      >
        <div className="writing-vertical-rl text-sm font-medium">Code</div>
      </Button>
    </div>
  );
}

