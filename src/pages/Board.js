import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { ArrowLeft, Plus, Loader2 } from 'lucide-react';
import api from '../utils/api';
import { io } from 'socket.io-client';

// Initialize socket outside component to maintain a single connection
const socket = io('http://localhost:5000', {
  transports: ['websocket'],
  autoConnect: true
});

const COLUMNS = [
  { id: 'todo', title: 'Todo', color: 'border-gray-500', icon: '📋' },
  { id: 'inprogress', title: 'In Progress', color: 'border-blue-500', icon: '🔄' },
  { id: 'inreview', title: 'In Review', color: 'border-yellow-500', icon: '👀' },
  { id: 'done', title: 'Done', color: 'border-green-500', icon: '✅' },
];

export default function Board() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  
  const [board, setBoard] = useState({
    todo: [], inprogress: [], inreview: [], done: []
  });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '', description: '', priority: 'P2'
  });
  const [creating, setCreating] = useState(false);

  // Fetch board data
  const fetchBoard = useCallback(async () => {
    try {
      const res = await api.get(`/tasks/project/${projectId}/board`);
      setBoard(res.data);
    } catch (err) {
      console.error('Failed to fetch board:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchBoard();

    // Socket.IO - join board room
    socket.emit('join-board', projectId);

    // Listen for real-time updates from other users
    socket.on('task-updated', (data) => {
      if (data.projectId === projectId) {
        setBoard(prev => {
          const updated = { ...prev };
          // Remove task from all columns to ensure no duplicates
          Object.keys(updated).forEach(col => {
            updated[col] = updated[col].filter(t => t._id !== data.taskId);
          });
          // Add to the new column
          if (data.task) {
            const status = data.status || data.task.status;
            updated[status] = [...(updated[status] || []), data.task];
          }
          return updated;
        });
      }
    });

    return () => {
      socket.off('task-updated');
    };
  }, [projectId, fetchBoard]);

  // Drag and Drop handler
  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;

    // Dropped outside a list or in the same position
    if (!destination) return;
    if (destination.droppableId === source.droppableId &&
        destination.index === source.index) return;

    const sourceCol = source.droppableId;
    const destCol = destination.droppableId;

    // Optimistic Update
    const prevBoard = { ...board };
    const newBoard = { ...board };
    
    const sourceItems = [...newBoard[sourceCol]];
    const [movedTask] = sourceItems.splice(source.index, 1);
    
    if (sourceCol === destCol) {
      sourceItems.splice(destination.index, 0, movedTask);
      newBoard[sourceCol] = sourceItems;
    } else {
      const destItems = [...newBoard[destCol]];
      destItems.splice(destination.index, 0, { ...movedTask, status: destCol });
      newBoard[sourceCol] = sourceItems;
      newBoard[destCol] = destItems;
    }

    setBoard(newBoard);

    // Update backend
    try {
      await api.put(`/tasks/${draggableId}/move`, { status: destCol });

      // Emit socket event for real-time sync
      socket.emit('task-moved', {
        projectId,
        taskId: draggableId,
        status: destCol,
        task: { ...movedTask, status: destCol }
      });
    } catch (err) {
      console.error('Move failed:', err);
      // Revert on error
      setBoard(prevBoard);
      fetchBoard();
    }
  };

  // Create Task
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;
    
    setCreating(true);
    try {
      const res = await api.post('/tasks/create', {
        ...newTask,
        projectId
      });
      
      // Update local state or re-fetch
      setShowModal(false);
      setNewTask({ title: '', description: '', priority: 'P2' });
      fetchBoard();
      
      // Notify others via socket (if your backend doesn't handle this automatically)
      socket.emit('task-moved', {
        projectId,
        taskId: res.data._id,
        status: 'todo',
        task: res.data
      });
      
    } catch (err) {
      console.error('Create task failed:', err);
    } finally {
      setCreating(false);
    }
  };

  const getPriorityStyles = (priority) => {
    switch (priority) {
      case 'P0': return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'P1': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'P2': return 'bg-green-500/20 text-green-400 border-green-500/50';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white">
        <Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-4" />
        <p className="text-lg font-medium animate-pulse">Loading board...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans selection:bg-blue-500/30">
      
      {/* Header */}
      <header className="bg-gray-800/50 backdrop-blur-md border-b border-gray-700 sticky top-0 z-30 px-6 py-4">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 hover:bg-gray-700 rounded-full transition-colors group"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-6 h-6 text-gray-400 group-hover:text-white" />
            </button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Kanban Board</h1>
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Project ID: {projectId}</p>
            </div>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-50 transition-all hover:text-blue-600 px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-900/20 active:scale-95"
          >
            <Plus className="w-5 h-5" />
            <span>Add Task</span>
          </button>
        </div>
      </header>

      {/* Main Board Content */}
      <main className="p-6 max-w-[1600px] mx-auto">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
            {COLUMNS.map(col => (
              <div
                key={col.id}
                className={`bg-gray-800/40 rounded-2xl border-t-4 ${col.color} p-4 flex flex-col min-h-[70vh] shadow-xl`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between mb-5 px-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{col.icon}</span>
                    <h2 className="font-bold text-gray-200 tracking-wide uppercase text-sm">{col.title}</h2>
                  </div>
                  <span className="bg-gray-700/50 text-gray-300 text-xs font-bold px-2.5 py-1 rounded-lg border border-gray-600">
                    {board[col.id]?.length || 0}
                  </span>
                </div>

                {/* Droppable Area */}
                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 rounded-xl transition-all duration-300 p-1 ${
                        snapshot.isDraggingOver
                          ? 'bg-gray-700/30 ring-2 ring-gray-600 ring-dashed'
                          : ''
                      }`}
                    >
                      {board[col.id]?.map((task, index) => (
                        <Draggable
                          key={task._id}
                          draggableId={task._id}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`bg-gray-800 border border-gray-700 rounded-xl p-4 mb-3 shadow-md transition-all duration-200 ${
                                snapshot.isDragging
                                  ? 'ring-2 ring-blue-500 rotate-[2deg] shadow-2xl z-50'
                                  : 'hover:bg-gray-750 hover:border-gray-600'
                              }`}
                            >
                              {/* Task Content */}
                              <h3 className="font-bold text-gray-100 mb-1.5 leading-snug">
                                {task.title}
                              </h3>
                              {task.description && (
                                <p className="text-gray-400 text-sm mb-4 line-clamp-2 leading-relaxed">
                                  {task.description}
                                </p>
                              )}
                              
                              <div className="flex items-center justify-between mt-auto">
                                <span className={`text-[10px] px-2 py-0.5 rounded-md border font-bold uppercase tracking-tighter ${getPriorityStyles(task.priority)}`}>
                                  {task.priority === 'P0' ? 'Critical' : task.priority === 'P1' ? 'High' : 'Normal'}
                                </span>
                                
                                {task.assignee ? (
                                  <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center border-2 border-gray-800 shadow-sm" title={task.assignee.name}>
                                    <span className="text-[10px] font-bold text-white uppercase">
                                      {task.assignee.name?.[0] || 'U'}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="w-7 h-7 bg-gray-700 rounded-full flex items-center justify-center border-2 border-gray-800">
                                    <span className="text-[10px] text-gray-500 font-bold">?</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      </main>

      {/* Create Task Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8 w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-200">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Plus className="text-blue-500" />
              Create New Task
            </h2>

            <form onSubmit={handleCreateTask} className="space-y-5">
              <div>
                <label className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2 block">
                  Task Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newTask.title}
                  onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-gray-600"
                  placeholder="What needs to be done?"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2 block">
                  Description
                </label>
                <textarea
                  value={newTask.description}
                  onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none placeholder:text-gray-600"
                  placeholder="Provide some details..."
                  rows={4}
                />
              </div>

              <div>
                <label className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2 block">
                  Priority Level
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {['P0', 'P1', 'P2'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setNewTask({ ...newTask, priority: p })}
                      className={`py-3 rounded-xl border-2 font-bold transition-all ${
                        newTask.priority === p 
                          ? p === 'P0' ? 'border-red-500 bg-red-500/10 text-red-500' :
                            p === 'P1' ? 'border-yellow-500 bg-yellow-500/10 text-yellow-500' :
                            'border-green-500 bg-green-500/10 text-green-500'
                          : 'border-gray-700 bg-gray-900 text-gray-500 hover:border-gray-600'
                      }`}
                    >
                      {p === 'P0' ? 'Critical' : p === 'P1' ? 'High' : 'Normal'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-4 mt-8">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-4 rounded-xl font-bold transition-colors active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !newTask.title.trim()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-4 rounded-xl font-bold transition-all shadow-lg shadow-blue-900/20 active:scale-95 flex items-center justify-center gap-2"
                >
                  {creating && <Loader2 className="w-5 h-5 animate-spin" />}
                  {creating ? 'Creating...' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
