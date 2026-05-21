const router = require('express').Router();
const auth = require('../middleware/auth');
const Workspace = require('../models/Workspace');
const Project = require('../models/Project');
const Activity = require('../models/Activity');

// Create Workspace
router.post('/create', auth, async (req, res) => {
  try {
    const { name } = req.body;
    const workspace = await Workspace.create({
      name,
      owner: req.user.id,
      members: [{ user: req.user.id, role: 'owner' }]
    });
    res.json(workspace);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all Workspaces for logged in user
router.get('/my', auth, async (req, res) => {
  try {
    const workspaces = await Workspace.find({
      'members.user': req.user.id
    }).populate('members.user', 'name email');
    res.json(workspaces);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single Workspace
router.get('/:id', auth, async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id)
      .populate('members.user', 'name email')
      .populate('projects');
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });
    res.json(workspace);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create Project inside Workspace
router.post('/:id/projects', auth, async (req, res) => {
  try {
    const { name, description } = req.body;
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });

    const project = await Project.create({
      name,
      description,
      workspace: workspace._id,
      members: [req.user.id]
    });

    workspace.projects.push(project._id);
    await workspace.save();

    // Log activity
    await Activity.create({
      workspace: workspace._id,
      project: project._id,
      user: req.user.id,
      action: `Project "${name}" created`
    });

    res.json(project);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all Projects in a Workspace
router.get('/:id/projects', auth, async (req, res) => {
  try {
    const projects = await Project.find({ workspace: req.params.id })
      .populate('members', 'name email');
    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single Project
router.get('/:id/projects/:projectId', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId)
      .populate('members', 'name email')
      .populate('tasks');
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json(project);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get Activity Feed
router.get('/:id/activity', auth, async (req, res) => {
  try {
    const activities = await Activity.find({ workspace: req.params.id })
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(20);
    res.json(activities);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;