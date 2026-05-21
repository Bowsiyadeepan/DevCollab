import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Plus, 
  Folder, 
  Users, 
  Layers, 
  LogOut, 
  X, 
  ChevronRight, 
  Loader2,
  Briefcase,
  Search,
  Code
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  // Data State
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [projects, setProjects] = useState([]);
  
  // UI State
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [error, setError] = useState('');
  
  // Modal State
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  
  // Form State
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newProject, setNewProject] = useState({ name: '', description: '' });
  const [submitting, setSubmitting] = useState(false);

  // Fetch Workspaces
  const fetchWorkspaces = useCallback(async () => {
    setLoadingWorkspaces(true);
    setError('');
    try {
      const res = await api.get('/workspace/my');
      setWorkspaces(res.data);
      if (res.data.length > 0 && !activeWorkspace) {
        setActiveWorkspace(res.data[0]);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load workspaces');
    } finally {
      setLoadingWorkspaces(false);
    }
  }, [activeWorkspace]);

  // Fetch Projects for Active Workspace
  const fetchProjects = useCallback(async (workspaceId) => {
    setLoadingProjects(true);
    setError('');
    try {
      const res = await api.get(`/workspace/${workspaceId}/projects`);
      setProjects(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load projects');
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  useEffect(() => {
    if (activeWorkspace) {
      fetchProjects(activeWorkspace._id);
    } else {
      setProjects([]);
    }
  }, [activeWorkspace, fetchProjects]);

  // Handlers
  const handleCreateWorkspace = async (e) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await api.post('/workspace/create', { name: newWorkspaceName });
      setWorkspaces(prev => [...prev, res.data]);
      setActiveWorkspace(res.data);
      setNewWorkspaceName('');
      setShowWorkspaceModal(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create workspace');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProject.name.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      await api.post(`/workspace/${activeWorkspace._id}/projects`, newProject);
      fetchProjects(activeWorkspace._id);
      setNewProject({ name: '', description: '' });
      setShowProjectModal(false);
      // Refresh workspaces to update project counts if needed
      const res = await api.get('/workspace/my');
      setWorkspaces(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create project');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col font-sans">
      
      {/* NAVBAR */}
      <nav className="h-16 bg-gray-800 border-b border-gray-700 px-6 flex items-center justify-between sticky top-0 z-40 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/40">
            <span className="text-white font-black text-lg">DC</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight hidden sm:block">DevCollab</h1>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/code-reviewer')}
            className="hidden md:flex items-center gap-2 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-sm font-semibold transition-colors border border-gray-600"
          >
            <Code className="w-4 h-4 text-blue-400" />
            Code Reviewer
          </button>
          
          <div className="h-8 w-[1px] bg-gray-700 mx-2 hidden sm:block"></div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold border border-blue-400">
              {user?.name?.[0].toUpperCase() || 'U'}
            </div>
            <span className="text-sm font-medium hidden lg:block">{user?.name}</span>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 text-gray-400 hover:text-red-400 transition-colors p-2"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        
        {/* SIDEBAR */}
        <aside className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col hidden lg:flex">
          <div className="p-6">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-6 px-2">Your Workspaces</h2>
            
            <div className="space-y-1 overflow-y-auto max-h-[calc(100vh-250px)] custom-scrollbar">
              {loadingWorkspaces ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                </div>
              ) : workspaces.length === 0 ? (
                <p className="text-sm text-gray-500 px-2 italic">No workspaces found</p>
              ) : (
                workspaces.map(ws => (
                  <button
                    key={ws._id}
                    onClick={() => setActiveWorkspace(ws)}
                    className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between group transition-all ${
                      activeWorkspace?._id === ws._id 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                        : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                    }`}
                  >
                    <span className="font-semibold truncate">{ws.name}</span>
                    {activeWorkspace?._id === ws._id && <ChevronRight className="w-4 h-4" />}
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="mt-auto p-6 border-t border-gray-700">
            <button 
              onClick={() => setShowWorkspaceModal(true)}
              className="w-full flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 py-3 rounded-xl font-bold transition-all border border-gray-600"
            >
              <Plus className="w-4 h-4" />
              New Workspace
            </button>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 overflow-y-auto bg-gray-900 p-6 sm:p-10">
          {error && (
            <div className="max-w-5xl mx-auto mb-6 bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl flex items-center gap-3">
              <X className="w-5 h-5" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {activeWorkspace ? (
            <div className="max-w-5xl mx-auto animate-in fade-in duration-500">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">{activeWorkspace.name}</h2>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-gray-400 text-xs font-bold uppercase tracking-wider">
                      <Layers className="w-3.5 h-3.5" />
                      {projects.length} Projects
                    </div>
                    <div className="w-1 h-1 bg-gray-700 rounded-full"></div>
                    <div className="flex items-center gap-1.5 text-gray-400 text-xs font-bold uppercase tracking-wider">
                      <Users className="w-3.5 h-3.5" />
                      {activeWorkspace.members?.length || 1} Members
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setShowProjectModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20 active:scale-95 text-sm"
                >
                  <Plus className="w-5 h-5" />
                  New Project
                </button>
              </div>

              {loadingProjects ? (
                <div className="h-64 flex flex-col items-center justify-center">
                  <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
                  <p className="text-gray-500 font-medium">Fetching projects...</p>
                </div>
              ) : projects.length === 0 ? (
                <div className="bg-gray-800/50 border-2 border-dashed border-gray-700 rounded-3xl p-16 text-center">
                  <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                    <Folder className="w-8 h-8 text-gray-600" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Create your first project</h3>
                  <p className="text-gray-400 mb-8 max-w-sm mx-auto text-sm leading-relaxed">
                    This workspace doesn't have any projects yet. Start by creating a board for your team.
                  </p>
                  <button 
                    onClick={() => setShowProjectModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-900/20 inline-flex items-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Create Project
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {projects.map(project => (
                    <div
                      key={project._id}
                      className="bg-gray-800 border border-gray-700 p-6 rounded-2xl hover:border-blue-500/50 hover:bg-gray-750 transition-all group relative shadow-xl hover:-translate-y-1"
                    >
                      <h3 className="text-lg font-bold mb-2 group-hover:text-blue-400 transition-colors truncate">{project.name}</h3>
                      <p className="text-gray-400 text-sm mb-6 line-clamp-2 h-10 leading-relaxed italic">
                        {project.description || 'No description provided.'}
                      </p>
                      
                      <button
                        onClick={() => navigate(`/board/${project._id}`)}
                        className="w-full bg-gray-700 hover:bg-blue-600 text-white py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2"
                      >
                        Open Board
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-10">
              <div className="w-24 h-24 bg-gray-800 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-2xl rotate-12">
                <LayoutDashboard className="w-12 h-12 text-gray-600 -rotate-12" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Welcome, {user?.name?.split(' ')[0]}!</h2>
              <p className="text-gray-400 max-w-sm mx-auto leading-relaxed">
                Select a workspace from the sidebar or create a new one to start managing your projects.
              </p>
              <button 
                onClick={() => setShowWorkspaceModal(true)}
                className="mt-8 lg:hidden bg-blue-600 hover:bg-blue-700 px-8 py-3 rounded-xl font-bold transition-all"
              >
                Create Workspace
              </button>
            </div>
          )}
        </main>
      </div>

      {/* NEW WORKSPACE MODAL */}
      {showWorkspaceModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8 w-full max-w-md shadow-2xl scale-in-center">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Create Workspace</h2>
              <button onClick={() => setShowWorkspaceModal(false)} className="p-2 hover:bg-gray-700 rounded-full transition-colors text-gray-400">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateWorkspace} className="space-y-6">
              <div>
                <label className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2 block">Workspace Name</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newWorkspaceName}
                  onChange={e => setNewWorkspaceName(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-gray-600"
                  placeholder="e.g. Design Team"
                />
              </div>
              
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowWorkspaceModal(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3.5 rounded-xl font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !newWorkspaceName.trim()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white py-3.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {submitting ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NEW PROJECT MODAL */}
      {showProjectModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8 w-full max-w-lg shadow-2xl scale-in-center">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Create Project</h2>
              <button onClick={() => setShowProjectModal(false)} className="p-2 hover:bg-gray-700 rounded-full transition-colors text-gray-400">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-5">
              <div>
                <label className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2 block">Project Name</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newProject.name}
                  onChange={e => setNewProject({ ...newProject, name: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-gray-600"
                  placeholder="e.g. Mobile App Redesign"
                />
              </div>

              <div>
                <label className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2 block">Description (Optional)</label>
                <textarea
                  value={newProject.description}
                  onChange={e => setNewProject({ ...newProject, description: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none placeholder:text-gray-600"
                  placeholder="Describe the goals of this project..."
                  rows={4}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowProjectModal(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3.5 rounded-xl font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !newProject.name.trim()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white py-3.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {submitting ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #374151;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #4b5563;
        }
        .scale-in-center {
          animation: scale-in-center 0.2s cubic-bezier(0.250, 0.460, 0.450, 0.940) both;
        }
        @keyframes scale-in-center {
          0% { transform: scale(0.9); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}} />
    </div>
  );
}
