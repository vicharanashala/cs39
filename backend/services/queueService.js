// services/queueService.js
const { FAQThread } = require('../models/Schemas');

/**
 * Calculates the queue position of a thread.
 * A thread is in the queue if it is unresolved:
 * - isOfficial is false
 * - isMerged is false
 * - status is in ['pending_review', 'flagged', 'active']
 * The queue is ordered by createdAt (ascending, FIFO).
 * Returns null if the thread is resolved or doesn't exist.
 */
async function getQueuePosition(threadId) {
  try {
    const targetThread = await FAQThread.findById(threadId);
    if (!targetThread) return null;

    if (
      targetThread.isOfficial ||
      targetThread.isMerged ||
      ['rejected', 'spam', 'merged'].includes(targetThread.status)
    ) {
      return null;
    }

    // Count how many unresolved threads were created before this one
    const countAhead = await FAQThread.countDocuments({
      isOfficial: false,
      isMerged: false,
      status: { $in: ['pending_review', 'flagged', 'active'] },
      createdAt: { $lt: targetThread.createdAt }
    });

    return countAhead + 1;
  } catch (error) {
    console.error('Error in getQueuePosition:', error.message);
    return null;
  }
}

/**
 * Broadcasts a queue update event to all connected Socket.IO clients.
 */
function broadcastQueueUpdate(io) {
  if (io) {
    console.log('[Socket.IO] Broadcasting queue_position_update');
    io.emit('queue_position_update');
  }
}

module.exports = {
  getQueuePosition,
  broadcastQueueUpdate
};
