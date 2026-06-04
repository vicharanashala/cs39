const express = require('express');
const router = express.Router();
const { SessionSupportRequest, User, Notification, UserActivity, AttendanceGuidance } = require('../models/Schemas');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');

const ISSUE_CONFIGS = {
  internet: {
    label: 'Internet Problem',
    shortLabel: 'Internet',
    steps: [
      'Restart your router or hotspot once.',
      'Switch to a backup network if one is available.',
      'Disable VPN or proxy tools that may interfere with the class link.',
      'Note the time the connection dropped so the team can review it.'
    ]
  },
  camera: {
    label: 'Camera Issue',
    shortLabel: 'Camera',
    steps: [
      'Check browser camera permission in the address bar.',
      'Close and reopen the class tab, then test your camera again.',
      'Reconnect the camera or switch to another device if you have one.',
      'Write down the exact browser or device error if the camera still fails.'
    ]
  },
  microphone: {
    label: 'Microphone Issue',
    shortLabel: 'Microphone',
    steps: [
      'Check microphone permission in the browser.',
      'Unplug and reconnect the mic or headset if you are using one.',
      'Test microphone input in another app to confirm the device works.',
      'Write down the browser or device message you saw.'
    ]
  },
  device: {
    label: 'Device Failure',
    shortLabel: 'Device',
    steps: [
      'Restart the device once and try reconnecting to the class.',
      'Plug in power or move to another device if one is available.',
      'If the device is overheating or crashing, stop using it for a moment.',
      'Write down any boot, crash, or hardware message you see.'
    ]
  },
  power: {
    label: 'Power Outage',
    shortLabel: 'Power',
    steps: [
      'Confirm whether the outage affects only your room or the full area.',
      'Move to a backup power source or a different location if possible.',
      'Use your phone hotspot if mobile data is available.',
      'Mention the outage timing and duration in your request.'
    ]
  },
  other: {
    label: 'Other Reason',
    shortLabel: 'Other',
    steps: [
      'Write a short description of what stopped you from joining.',
      'Note the time the issue started and whether it affected the whole session.',
      'Submit the request so the support team can review it.'
    ]
  }
};

const VALID_STATUSES = ['Pending', 'In Review', 'Resolved', 'Rejected'];

function getIssueConfig(issueType) {
  return ISSUE_CONFIGS[issueType] || ISSUE_CONFIGS.other;
}

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function logActivity(userId, action, metadata = {}) {
  if (!userId) return;
  await UserActivity.create({ userId, action, metadata })
    .catch(error => console.error('Support activity log error:', error.message));
}

async function addNotificationsForUsers(users, payload) {
  if (!users.length) return;
  await Notification.insertMany(users.map((userId) => ({
    userId,
    ...payload
  })));
}

async function emitSupportNotification(req, payload, targetUserIds = []) {
  const io = req.app.get('io');
  if (io) {
    targetUserIds.forEach((id) => {
      io.to(String(id)).emit('notification', payload);
      io.to(`user_${String(id)}`).emit('notification', payload);
    });
  }
}

function buildSummary(requests) {
  const byStatus = VALID_STATUSES.reduce((acc, status) => {
    acc[status] = requests.filter(request => request.status === status).length;
    return acc;
  }, {});

  const byIssueType = Object.keys(ISSUE_CONFIGS).reduce((acc, key) => {
    acc[key] = requests.filter(request => request.issueType === key).length;
    return acc;
  }, {});

  const unresolvedCount = requests.filter(request => request.status !== 'Resolved').length;

  return {
    total: requests.length,
    unresolvedCount,
    withAttachments: 0,
    byStatus,
    byIssueType,
    recent: requests.slice(0, 5)
  };
}

function buildSummaryFromCounts(statusCounts, issueTypeCounts, recentRequests = [], attachmentCount = 0) {
  const byStatus = VALID_STATUSES.reduce((acc, status) => {
    acc[status] = statusCounts[status] || 0;
    return acc;
  }, {});

  const byIssueType = Object.keys(ISSUE_CONFIGS).reduce((acc, key) => {
    acc[key] = issueTypeCounts[key] || 0;
    return acc;
  }, {});

  const unresolvedCount = (statusCounts.Pending || 0) + (statusCounts['In Review'] || 0) + (statusCounts.Rejected || 0);

  return {
    total: Object.values(statusCounts).reduce((sum, value) => sum + value, 0),
    unresolvedCount,
    withAttachments: attachmentCount,
    byStatus,
    byIssueType,
    recent: recentRequests.slice(0, 5)
  };
}

router.use(authMiddleware);

router.get('/troubleshoot/:issueType', async (req, res) => {
  try {
    const issueType = req.params.issueType;
    const config = getIssueConfig(issueType);
    
    let guidance = await AttendanceGuidance.findOne({ issueType });
    if (!guidance) {
      guidance = await AttendanceGuidance.create({
        issueType,
        steps: config.steps || []
      });
    }
    
    res.json({
      issueType,
      label: config.label,
      steps: guidance.steps
    });
  } catch (error) {
    console.error('Fetch troubleshoot steps error:', error.message);
    res.status(500).json({ message: 'Error retrieving troubleshooting guidance' });
  }
});

router.get('/guidance', requireRole('admin'), async (req, res) => {
  try {
    const categories = Object.keys(ISSUE_CONFIGS);
    const results = [];
    
    for (const cat of categories) {
      let guidance = await AttendanceGuidance.findOne({ issueType: cat });
      if (!guidance) {
        guidance = await AttendanceGuidance.create({
          issueType: cat,
          steps: ISSUE_CONFIGS[cat].steps || []
        });
      }
      results.push({
        issueType: cat,
        label: ISSUE_CONFIGS[cat].label,
        steps: guidance.steps
      });
    }
    
    res.json(results);
  } catch (error) {
    console.error('Fetch guidance categories error:', error.message);
    res.status(500).json({ message: 'Error retrieving guidance categories' });
  }
});

router.put('/guidance/:issueType', requireRole('admin'), async (req, res) => {
  try {
    const { issueType } = req.params;
    const { steps } = req.body;
    
    if (!Array.isArray(steps)) {
      return res.status(400).json({ message: 'Steps must be an array of strings.' });
    }
    
    const cleanedSteps = steps.map(s => String(s).trim()).filter(Boolean);
    
    let guidance = await AttendanceGuidance.findOne({ issueType });
    if (!guidance) {
      guidance = new AttendanceGuidance({ issueType, steps: cleanedSteps });
    } else {
      guidance.steps = cleanedSteps;
    }
    await guidance.save();
    
    res.json({
      message: 'Guidance steps updated successfully.',
      guidance
    });
  } catch (error) {
    console.error('Update guidance steps error:', error.message);
    res.status(500).json({ message: 'Error updating guidance steps' });
  }
});

router.get('/', async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const { status, issueType, q, userName, email, from, to } = req.query;
    const filter = isAdmin ? {} : { studentId: req.user._id };
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || (isAdmin ? 25 : 20)));
    const skip = (page - 1) * limit;

    if (status && VALID_STATUSES.includes(status)) {
      filter.status = status;
    }
    if (issueType && ISSUE_CONFIGS[issueType]) {
      filter.issueType = issueType;
    }
    if (isAdmin && q) {
      const regex = new RegExp(escapeRegex(q).slice(0, 120), 'i');
      filter.$or = [
        { studentName: regex },
        { studentEmail: regex },
        { title: regex },
        { details: regex },
        { adminNote: regex },
        { resolutionSummary: regex }
      ];
    }
    if (isAdmin && userName) {
      filter.studentName = new RegExp(escapeRegex(userName).slice(0, 80), 'i');
    }
    if (isAdmin && email) {
      filter.studentEmail = new RegExp(escapeRegex(email).slice(0, 120), 'i');
    }
    if (from || to) {
      filter.createdAt = {};
      const fromDate = from ? new Date(from) : null;
      const toDate = to ? new Date(to) : null;
      if (fromDate && !Number.isNaN(fromDate.getTime())) filter.createdAt.$gte = fromDate;
      if (toDate && !Number.isNaN(toDate.getTime())) {
        toDate.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = toDate;
      }
      if (!Object.keys(filter.createdAt).length) delete filter.createdAt;
    }

    const [total, requests, statusRows, issueRows, recentRows] = await Promise.all([
      SessionSupportRequest.countDocuments(filter),
      SessionSupportRequest.find(filter)
        .sort({ updatedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('studentId studentName studentEmail issueType issueLabel title details attemptedSteps status adminNote internalNotes resolutionSummary sessionAccessUrl followUps statusHistory createdAt updatedAt')
        .populate('studentId', 'username email role')
        .lean(),
      SessionSupportRequest.aggregate([
        { $match: filter },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      SessionSupportRequest.aggregate([
        { $match: filter },
        { $group: { _id: '$issueType', count: { $sum: 1 } } }
      ]),
      SessionSupportRequest.find(filter)
        .sort({ updatedAt: -1, createdAt: -1 })
        .limit(5)
        .select('status issueType createdAt updatedAt')
        .lean(),
    ]);

    const statusCounts = statusRows.reduce((acc, row) => {
      acc[row._id] = row.count;
      return acc;
    }, {});
    const issueTypeCounts = issueRows.reduce((acc, row) => {
      acc[row._id] = row.count;
      return acc;
    }, {});

    res.json({
      requests,
      summary: buildSummaryFromCounts(statusCounts, issueTypeCounts, recentRows, 0),
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      },
      issueOptions: Object.entries(ISSUE_CONFIGS).map(([key, value]) => ({
        key,
        label: value.label,
        shortLabel: value.shortLabel
      }))
    });
  } catch (error) {
    console.error('Fetch support requests error:', error.message);
    res.status(500).json({ message: 'Error retrieving support requests' });
  }
});

router.post('/', async (req, res) => {
  try {
    const issueType = String(req.body.issueType || '').trim();
    const config = getIssueConfig(issueType);
    if (!ISSUE_CONFIGS[issueType]) {
      return res.status(400).json({ message: 'Please choose a valid issue type.' });
    }

    const title = String(req.body.title || '').trim().slice(0, 180) || `${config.label} - Unable to attend session`;
    const details = String(req.body.details || '').trim().slice(0, 4000);
    if (!details) {
      return res.status(400).json({ message: 'Please describe the issue before submitting.' });
    }

    const attemptedSteps = Array.isArray(req.body.attemptedSteps)
      ? req.body.attemptedSteps.map(step => String(step).trim()).filter(Boolean).slice(0, 10)
      : [];

    const requester = await User.findById(req.user._id).select('username email').lean();
    const request = await SessionSupportRequest.create({
      studentId: req.user._id,
      studentName: requester?.username || req.user.username,
      studentEmail: requester?.email || req.user.email,
      issueType,
      issueLabel: config.label,
      title,
      details,
      attemptedSteps,
      status: 'Pending',
      statusHistory: [{
        status: 'Pending',
        note: 'Request submitted after troubleshooting guidance was shown.',
        updatedBy: req.user._id,
        updatedByName: req.user.username,
        timestamp: new Date()
      }]
    });

    const adminUsers = await User.find({ role: 'admin' }).select('_id');
    const notificationPayload = {
      title: 'Unable to Attend Session request submitted',
      message: `${request.studentName} reported ${config.label.toLowerCase()} and needs help attending a session.`,
      type: 'support',
      link: '/dashboard',
      metadata: {
        supportRequestId: request._id.toString(),
        issueType,
        status: request.status
      }
    };
    await addNotificationsForUsers(adminUsers.map(user => user._id), notificationPayload);
    await emitSupportNotification(req, notificationPayload, adminUsers.map(user => user._id));
    await logActivity(req.user._id, 'attendance_request', {
      supportRequestId: request._id.toString(),
      title: request.title,
      issueType,
      status: request.status
    });

    res.status(201).json({ request });
  } catch (error) {
    console.error('Create support request error:', error.message);
    res.status(500).json({ message: 'Error submitting support request' });
  }
});

router.patch('/:id/status', requireRole('admin'), async (req, res) => {
  try {
    const request = await SessionSupportRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Support request not found' });
    }

    const nextStatus = String(req.body.status || '').trim();
    if (!VALID_STATUSES.includes(nextStatus)) {
      return res.status(400).json({ message: 'Invalid status value.' });
    }

    const adminNote = String(req.body.adminNote || '').trim().slice(0, 2000);
    const internalNote = String(req.body.internalNote || '').trim().slice(0, 2000);
    const followUpMessage = String(req.body.followUpMessage || '').trim().slice(0, 2000);
    const resolutionSummary = String(req.body.resolutionSummary || '').trim().slice(0, 2000);
    const sessionAccessUrl = String(req.body.sessionAccessUrl || '').trim().slice(0, 500);

    request.status = nextStatus;
    request.adminNote = adminNote;
    if (typeof req.body.title === 'string' && req.body.title.trim()) {
      request.title = req.body.title.trim().slice(0, 180);
    }
    if (typeof req.body.details === 'string' && req.body.details.trim()) {
      request.details = req.body.details.trim().slice(0, 4000);
    }
    if (req.body.issueType && ISSUE_CONFIGS[req.body.issueType]) {
      request.issueType = req.body.issueType;
      request.issueLabel = ISSUE_CONFIGS[req.body.issueType].label;
    }
    if (resolutionSummary) {
      request.resolutionSummary = resolutionSummary;
    }
    if (sessionAccessUrl) {
      request.sessionAccessUrl = sessionAccessUrl;
    }
    if (internalNote) {
      request.internalNotes.push({
        note: internalNote,
        addedBy: req.user._id,
        addedByName: req.user.username,
        createdAt: new Date()
      });
    }
    if (followUpMessage) {
      request.followUps.push({
        senderRole: 'admin',
        senderId: req.user._id,
        senderName: req.user.username,
        message: followUpMessage,
        requestProof: Boolean(req.body.requestProof),
        documents: []
      });
    }
    request.updatedAt = new Date();
    request.statusHistory.push({
      status: nextStatus,
      note: adminNote || resolutionSummary || `Status changed to ${nextStatus}.`,
      updatedBy: req.user._id,
      updatedByName: req.user.username,
      timestamp: new Date()
    });
    await request.save();

    const notificationTitle = nextStatus === 'Resolved'
      ? 'Your attendance request was resolved'
      : nextStatus === 'Rejected'
        ? 'Your attendance request was rejected'
        : 'Your attendance request is under review';
    const notificationMessage = nextStatus === 'Resolved'
      ? (request.sessionAccessUrl
        ? 'Your request was approved and the recorded session is available now.'
        : 'Your request was approved. The recorded session link will appear once shared by the admin team.')
      : nextStatus === 'Rejected'
        ? 'Your request was reviewed and marked rejected. Please check the admin note for details.'
        : 'Your request is being reviewed by the support team.';

    const notification = {
      title: notificationTitle,
      message: notificationMessage,
      type: 'support',
      link: '/dashboard',
      metadata: {
        supportRequestId: request._id.toString(),
        issueType: request.issueType,
        status: request.status,
        sessionAccessUrl: request.sessionAccessUrl || ''
      }
    };
    await Notification.create({
      userId: request.studentId,
      ...notification
    });
    await emitSupportNotification(req, notification, [request.studentId]);
    await logActivity(req.user._id, 'support_status_change', {
      supportRequestId: request._id.toString(),
      title: request.title,
      status: request.status,
      issueType: request.issueType,
      studentName: request.studentName,
      studentEmail: request.studentEmail
    });
    if (sessionAccessUrl) {
      await logActivity(req.user._id, 'recorded_session_request', {
        supportRequestId: request._id.toString(),
        title: request.title,
        status: request.status,
        sessionAccessUrl
      });
    }
    if (followUpMessage) {
      await logActivity(req.user._id, req.body.requestProof ? 'proof_requested' : 'support_follow_up', {
        supportRequestId: request._id.toString(),
        title: request.title,
        status: request.status,
        studentName: request.studentName,
        studentEmail: request.studentEmail
      });
    }

    res.json({ request });
  } catch (error) {
    console.error('Update support request error:', error.message);
    res.status(500).json({ message: 'Error updating support request status' });
  }
});

router.put('/:id', requireRole('admin'), async (req, res) => {
  try {
    const request = await SessionSupportRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Support request not found' });
    }

    const title = String(req.body.title || '').trim().slice(0, 180);
    const details = String(req.body.details || '').trim().slice(0, 4000);
    const adminNote = String(req.body.adminNote || '').trim().slice(0, 2000);
    const resolutionSummary = String(req.body.resolutionSummary || '').trim().slice(0, 2000);
    const sessionAccessUrl = String(req.body.sessionAccessUrl || '').trim().slice(0, 500);
    const internalNote = String(req.body.internalNote || '').trim().slice(0, 2000);

    if (title) request.title = title;
    if (details) request.details = details;
    if (req.body.issueType && ISSUE_CONFIGS[req.body.issueType]) {
      request.issueType = req.body.issueType;
      request.issueLabel = ISSUE_CONFIGS[req.body.issueType].label;
    }
    request.adminNote = adminNote;
    request.resolutionSummary = resolutionSummary;
    request.sessionAccessUrl = sessionAccessUrl;
    if (internalNote) {
      request.internalNotes.push({
        note: internalNote,
        addedBy: req.user._id,
        addedByName: req.user.username,
        createdAt: new Date()
      });
    }
    request.updatedAt = new Date();
    request.statusHistory.push({
      status: request.status,
      note: 'Request details edited by admin.',
      updatedBy: req.user._id,
      updatedByName: req.user.username,
      timestamp: new Date()
    });
    await request.save();

    await logActivity(req.user._id, 'request_updated', {
      supportRequestId: request._id.toString(),
      title: request.title,
      status: request.status,
      issueType: request.issueType,
      studentName: request.studentName,
      studentEmail: request.studentEmail
    });

    res.json({ request });
  } catch (error) {
    console.error('Edit support request error:', error.message);
    res.status(500).json({ message: 'Error editing support request' });
  }
});

router.post('/:id/follow-up', async (req, res) => {
  try {
    const request = await SessionSupportRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Support request not found' });
    }

    const isOwner = String(request.studentId) === String(req.user._id);
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const message = String(req.body.message || '').trim().slice(0, 2000);
    if (!message) {
      return res.status(400).json({ message: 'Message is required.' });
    }

    const documents = Array.isArray(req.body.documents)
      ? req.body.documents.map(doc => ({
        name: String(doc.name || '').trim().slice(0, 160),
        url: String(doc.url || '').trim().slice(0, 500),
        type: String(doc.type || '').trim().slice(0, 80)
      })).filter(doc => doc.name || doc.url).slice(0, 8)
      : [];

    request.followUps.push({
      senderRole: isAdmin ? 'admin' : 'student',
      senderId: req.user._id,
      senderName: req.user.username,
      message,
      requestProof: isAdmin ? Boolean(req.body.requestProof) : false,
      documents
    });
    if (isAdmin && request.status === 'Pending') {
      request.status = 'In Review';
      request.statusHistory.push({
        status: 'In Review',
        note: 'Admin sent a follow-up question.',
        updatedBy: req.user._id,
        updatedByName: req.user.username,
        timestamp: new Date()
      });
    }
    request.updatedAt = new Date();
    await request.save();

    const targetUsers = isAdmin ? [request.studentId] : (await User.find({ role: 'admin' }).select('_id')).map(user => user._id);
    const notification = {
      title: isAdmin ? 'Admin replied to your attendance request' : 'Student replied to an attendance request',
      message: isAdmin ? 'Please review the admin question or proof request.' : `${request.studentName} added more information.`,
      type: 'support',
      link: '/dashboard',
      metadata: {
        supportRequestId: request._id.toString(),
        status: request.status,
        issueType: request.issueType
      }
    };
    await addNotificationsForUsers(targetUsers, notification);
    await emitSupportNotification(req, notification, targetUsers);
    await logActivity(req.user._id, isAdmin ? (req.body.requestProof ? 'proof_requested' : 'support_follow_up') : 'support_reply', {
      supportRequestId: request._id.toString(),
      title: request.title,
      status: request.status,
      issueType: request.issueType,
      documentCount: documents.length
    });

    res.status(201).json({ request });
  } catch (error) {
    console.error('Support follow-up error:', error.message);
    res.status(500).json({ message: 'Error adding support follow-up' });
  }
});

router.get('/stats/summary', requireRole('admin'), async (req, res) => {
  try {
    const allRequests = await SessionSupportRequest.find()
      .sort({ updatedAt: -1 })
      .select('status issueType createdAt updatedAt')
      .lean();
    const summary = buildSummary(allRequests);
    const recentByIssueType = Object.entries(summary.byIssueType)
      .sort((a, b) => b[1] - a[1])
      .map(([issueType, count]) => ({
        issueType,
        label: ISSUE_CONFIGS[issueType].label,
        count
      }));

    res.json({ summary, recentByIssueType });
  } catch (error) {
    console.error('Support stats error:', error.message);
    res.status(500).json({ message: 'Error fetching support analytics' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const request = await SessionSupportRequest.findById(req.params.id)
      .select('studentId studentName studentEmail issueType issueLabel title details attemptedSteps status adminNote internalNotes resolutionSummary sessionAccessUrl followUps statusHistory createdAt updatedAt')
      .populate('studentId', 'username email role')
      .lean();
    if (!request) {
      return res.status(404).json({ message: 'Support request not found' });
    }

    const isOwner = String(request.studentId?._id || request.studentId) === String(req.user._id);
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied.' });
    }

    res.json({ request });
  } catch (error) {
    console.error('Fetch support request error:', error.message);
    res.status(500).json({ message: 'Error retrieving support request' });
  }
});

module.exports = router;
