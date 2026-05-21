const router = require('express').Router();
const auth = require('../middleware/auth');
const Task = require('../models/Task');
const Project = require('../models/Project');
const Activity = require('../models/Activity');
const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// AI Task Breakdown
router.post('/ai-breakdown', auth, async (req, res) => {
  try {
    const { feature, projectId } = req.body;

    if (!feature || !projectId) {
      return res.status(400).json({ message: 'Feature and Project ID are required' });
    }

    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: `You are a project management assistant. 
      Break down the given feature into development tasks.
      Return ONLY a valid JSON array, no markdown, no extra text.
      Each task object must have exactly:
      { "title": string, "description": string, "priority": string }
      Priority must be exactly: P0, P1, or P2.
      Generate 5 to 7 tasks maximum.`,
      messages: [{ role: "user", content: feature }],
    });

    const tasks = JSON.parse(msg.content[0].text);
    res.json({ tasks });
  } catch (err) {
    console.error('AI Breakdown Error:', err);
    res.status(500).json({ message: 'AI generation failed: ' + err.message });
  }
});

// Create Task
router.post('/create', auth, async (req, res) => {
  try {
    const { title, description, status, priority, assignee, projectId, labels, dueDate } = req.body;

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const task = await Task.create({
      title,
      description,
      status: status || 'todo',
      priority: priority || 'P1',
      assignee,
      project: projectId,
      labels,
      dueDate
    });

    project.tasks.push(task._id);
    await project.save();

    // Log activity
    await Activity.create({
      workspace: project.workspace,
      project: projectId,
      user: req.user.id,
      action: `Task "${title}" created`
    });

    res.json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all Tasks in a Project
router.get('/project/:projectId', auth, async (req, res) => {
  try {
    const tasks = await Task.find({ project: req.params.projectId })
      .populate('assignee', 'name email')
      .sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single Task
router.get('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignee', 'name email')
      .populate('comments.user', 'name email');
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update Task (title, description, priority, etc)
router.put('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { ...req.body },
      { new: true }
    ).populate('assignee', 'name email');

    if (!task) return res.status(404).json({ message: 'Task not found' });

    // Log activity
    await Activity.create({
      workspace: task.workspace,
      project: task.project,
      user: req.user.id,
      action: `Task "${task.title}" updated`
    });

    res.json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Move Task (Kanban drag/drop) — MAIN FEATURE
router.put('/:id/move', auth, async (req, res) => {
  try {
    const { status } = req.body;

    const validStatuses = ['todo', 'inprogress', 'inreview', 'done'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('assignee', 'name email');

    if (!task) return res.status(404).json({ message: 'Task not found' });

    // Log activity
    await Activity.create({
      project: task.project,
      user: req.user.id,
      action: `Task "${task.title}" moved to ${status}`
    });

    res.json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete Task
router.delete('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    await Project.findByIdAndUpdate(task.project, {
      $pull: { tasks: task._id }
    });

    await Activity.create({
      project: task.project,
      user: req.user.id,
      action: `Task "${task.title}" deleted`
    });

    await task.deleteOne();
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add Comment to Task
router.post('/:id/comment', auth, async (req, res) => {
  try {
    const { text } = req.body;
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    task.comments.push({
      user: req.user.id,
      text
    });

    await task.save();

    // Log activity
    await Activity.create({
      project: task.project,
      user: req.user.id,
      action: `Comment added to "${task.title}"`
    });

    const updated = await Task.findById(req.params.id)
      .populate('comments.user', 'name email');

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get Tasks by Status (Kanban columns)
router.get('/project/:projectId/board', auth, async (req, res) => {
  try {
    const tasks = await Task.find({ project: req.params.projectId })
      .populate('assignee', 'name email');

    // Group by status
    const board = {
      todo: tasks.filter(t => t.status === 'todo'),
      inprogress: tasks.filter(t => t.status === 'inprogress'),
      inreview: tasks.filter(t => t.status === 'inreview'),
      done: tasks.filter(t => t.status === 'done')
    };

    res.json(board);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;