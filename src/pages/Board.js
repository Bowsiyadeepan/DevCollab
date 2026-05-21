import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import api from '../utils/api';
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000');

const COLUMNS = [
  { id: 'todo', title: '📋 To Do', color: 'border-gray-500' },
  { id: 'inprogress', title: '🔄 In Progress', color: 'border-blue-500' },
  { id: 'inreview', title: '👀 In Review', color: 'border-yellow-500' },
  { id: 'done', title: '✅ Done', color: 'border-green-500' },
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
    title: '', description: '', priority: 'P1'
  });
  const [creating, setCreating] = useState(false);

  // Fetch board data
  const fetchBoard = async () => {
    try {
      const res = await api.get(`/tasks/project/${projectId}/board`);
      setBoard(res.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBoard();

    // Socket.IO - join board room
    socket.emit('join-board', projectId);

    // Listen for real-time updates
    socket.on('task-updated', (data) => {
      setBoard(prev => {
        const updated = { ...prev };
        // Remove task from all columns
        Object.keys(updated).forEach(col => {
          updated[col] = updated[col].filter(t => t._id !== data.taskId);
        });
        // Add to new column
        if (data.task) {
          updated[data.status] = [...(updated[data.status] || []), data.task];
        }
        return updated;
      });
    });

    return () => {
      socket.off('task-updated');
    };
  }, [projectId]);

  // Drag and Drop handler
  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId &&
        destination.index === source.index) return;

    const sourceCol = source.droppableId;
    const destCol = destination.droppableId;

    // Update UI immediately
    const sourceItems = [...board[sourceCol]];
    const destItems = sourceCol === destCol
      ? sourceItems
      : [...board[destCol]];

    const [movedTask] = sourceItems.splice(source.index, 1);

    if (sourceCol === destCol) {
      sourceItems.splice(destination.index, 0, movedTask);
      setBoard(prev => ({ ...prev, [sourceCol]: sourceItems }));
    } else {
      destItems.splice(destination.index, 0, movedTask);
      setBoard(prev => ({
        ...prev,
        [sourceCol]: sourceItems,
        [destCol]: destItems
      }));
    }

    // Update backend
    try {
      await api.put(`/tasks/${draggableId}/move`, { status: destCol });

      // Emit socket event
      socket.emit('task-moved', {
        projectId,
        taskId: draggableId,
        status: destCol,
        task: { ...movedTask, status: destCol }
      });
    } catch (err) {
      console.error(err);
      fetchBoard(); // Revert on error
    }
  };

  // Create Task
  const handleCreateTask = async () => {
    if (!newTask.title.trim()) return;
    setCreating(true);
    try {
      await api.post('/tasks/create', {
        ...newTask,
        projectId
      });
      setShowModal(false);
      setNewTask({ title: '', description: '', priority: 'P1' });
      fetchBoard();
    } catch (err) {
      console.error(err);
    }
    setCreating(false);
  };

  const priorityColor = (priority) => {
    if (priority === 'P0') return 'bg-red-500/20 text-red-400';
    if (priority === 'P1') return 'bg-yellow-500/20 text-yellow-400';
    return 'bg-green-500/20 text-green-400';
  };

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-gray-900">
      <div className="text-white text-xl">Loading board...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white">

      {/* Header */}
      <div className="bg-gray-800 px-6 py-4 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-gray-400 hover:text-white transition"
          >
            ← Back
          </button>
          <h1 className="text-xl font-bold">Kanban Board</h1>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-semibold transition"
        >
          + Add Task
        </button>
      </div>

      {/* Kanban Board */}
      <div className="p-6">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-4 gap-4">
            {COLUMNS.map(col => (
              <div
                key={col.id}
                className={`bg-gray-800 rounded-xl border-t-4 ${col.color} p-4 min-h-96`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-gray-200">{col.title}</h2>
                  <span className="bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded-full">
                    {board[col.id]?.length || 0}
                  </span>
                </div>

                {/* Droppable Area */}
                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`min-h-64 rounded-lg transition ${
                        snapshot.isDraggingOver
                          ? 'bg-gray-700/50'
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
                              className={`bg-gray-700 rounded-lg p-3 mb-2 cursor-grab active:cursor-grabbing transition ${
                                snapshot.isDragging
                                  ? 'shadow-lg ring-2 ring-blue-500 rotate-2'
                                  : 'hover:bg-gray-600'
                              }`}
                            >
                              {/* Task Card */}
                              <p className="font-medium text-sm text-white mb-2">
                                {task.title}
                              </p>
                              {task.description && (
                                <p className="text-gray-400 text-xs mb-2 line-clamp-2">
                                  {task.description}
                                </p>
                              )}
                              <div className="flex items-center justify-between">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityColor(task.priority)}`}>
                                  {task.priority}
                                </span>
                                {task.assignee && (
                                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                                    <span className="text-xs text-white">
                                      {task.assignee.name?.[0]}
                                    </span>
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
      </div>

      {/* Create Task Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Create New Task</h2>

            <div className="space-y-4">
              <div>
                <label className="text-gray-300 text-sm mb-1 block">
                  Title *
                </label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Task title"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-gray-300 text-sm mb-1 block">
                  Description
                </label>
                <textarea
                  value={newTask.description}
                  onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Task description"
                  rows={3}
                />
              </div>

              <div>
                <label className="text-gray-300 text-sm mb-1 block">
                  Priority
                </label>
                <select
                  value={newTask.priority}
                  onChange={e => setNewTask({ ...newTask, priority: e.target.value })}
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="P0">P0 - Critical</option>
                  <option value="P1">P1 - High</option>
                  <option value="P2">P2 - Normal</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 py-3 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTask}
                disabled={creating}
                className="flex-1 bg-blue-600 hover:bg-blue-700 py-3 rounded-lg font-semibold transition disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create Task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}