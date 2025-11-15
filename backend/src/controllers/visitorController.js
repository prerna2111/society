const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/response');
const VisitorLog = require('../models/VisitorLog');
const mongoose = require('mongoose');

const createVisitorLog = asyncHandler(async (req, res) => {
  const { status, needsApprovalFrom: requestedApprover, ...visitorData } = req.body;
  const User = require('../models/User');
  
  // For security adding unscheduled visitor, set status to pending_approval
  let visitorStatus = status || 'scheduled';
  let needsApprovalFrom = null;
  
  if (req.user.role === 'security' && !status) {
    visitorStatus = 'pending_approval';
    
    // If approver is specified in request, use it; otherwise determine automatically
    if (requestedApprover) {
      // Validate that the requested approver exists and is for the correct flat
      const approver = await User.findById(requestedApprover);
      if (approver && approver.flatNumber === visitorData.flatToVisit && 
          ['owner', 'tenant'].includes(approver.role) && approver.isActive && approver.isApproved) {
        needsApprovalFrom = approver._id;
      } else {
        throw new ApiError(400, 'Invalid approver selected');
      }
    } else {
      // Auto-determine: tenant first, then owner
      const flatUsers = await User.find({ 
        flatNumber: visitorData.flatToVisit, 
        role: { $in: ['owner', 'tenant'] },
        isActive: true,
        isApproved: true
      }).sort({ role: 1 }); // Sort so tenant comes first
      
      const tenant = flatUsers.find(u => u.role === 'tenant');
      const owner = flatUsers.find(u => u.role === 'owner');
      
      needsApprovalFrom = tenant ? tenant._id : (owner ? owner._id : null);
    }
  }
  
  const visitor = await VisitorLog.create({
    ...visitorData,
    status: visitorStatus,
    loggedBy: req.user._id,
    scheduledBy: req.user._id, // Track who scheduled the visitor
    isApproved: visitorStatus === 'scheduled', // Scheduled visitors are auto-approved
    needsApprovalFrom, // Set who needs to approve
  });
  return successResponse(res, { visitor }, 201, 'Visitor scheduled');
});

const getVisitors = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const query = status ? { status } : {};
  
  // Admin sees all visitors
  if (req.user.role === 'admin') {
    // No filter
  } else if (req.user.role === 'security') {
    // Security sees all visitors
    // No filter
  } else if (['owner', 'tenant'].includes(req.user.role)) {
    // Residents see visitors for their flat based on who scheduled them
    const userFlat = req.user.flatNumber;
    const User = require('../models/User');
    const flatUsers = await User.find({ flatNumber: userFlat, role: { $in: ['owner', 'tenant'] } });
    const hasTenant = flatUsers.some(u => u.role === 'tenant' && u._id.toString() !== req.user._id.toString());
    const hasOwner = flatUsers.some(u => u.role === 'owner');
    
    // Always filter by flat first
    query.flatToVisit = userFlat;
    
    // Convert user._id to ObjectId for proper comparison
    const userId = mongoose.Types.ObjectId.isValid(req.user._id) 
      ? new mongoose.Types.ObjectId(req.user._id) 
      : req.user._id;
    
    if (req.user.role === 'tenant') {
      // Tenant sees: visitors scheduled by themselves OR by owner (if owner exists) OR pending approvals for them
      if (hasOwner) {
        const ownerIds = flatUsers.filter(u => u.role === 'owner').map(u => u._id);
        query.$or = [
          { scheduledBy: userId },
          { scheduledBy: { $in: ownerIds } },
          { needsApprovalFrom: userId } // Pending approvals that need tenant approval
        ];
      } else {
        // No owner, tenant sees only their own scheduled visitors and pending approvals
        query.$or = [
          { scheduledBy: userId },
          { needsApprovalFrom: userId }
        ];
      }
    } else if (req.user.role === 'owner') {
      // Owner sees: visitors scheduled by themselves OR pending approvals for them
      if (hasTenant) {
        // If tenant exists, owner only sees their own scheduled visitors and pending approvals assigned to them
        query.$or = [
          { scheduledBy: userId },
          { needsApprovalFrom: userId } // Pending approvals that need owner approval
        ];
      } else {
        // No tenant, owner sees their own scheduled visitors and pending approvals
        query.$or = [
          { scheduledBy: userId },
          { needsApprovalFrom: userId } // Pending approvals that need owner approval
        ];
      }
    }
  }
  
  const visitors = await VisitorLog.find(query)
    .populate('loggedBy', 'firstName lastName role')
    .populate('approvedBy', 'firstName lastName')
    .populate('scheduledBy', 'firstName lastName role')
    .populate('needsApprovalFrom', 'firstName lastName role')
    .sort({ expectedTime: -1 });
  return successResponse(res, { visitors });
});

const updateVisitor = asyncHandler(async (req, res) => {
  const visitor = await VisitorLog.findById(req.params.id);
  if (!visitor) {
    throw new ApiError(404, 'Visitor record not found');
  }

  // Security can check in/out any visitor
  // Residents can approve/deny visitors for their flat
  // Admin/committee can update any visitor
  if (req.user.role === 'security') {
    // Security can update status for check in/out
    if (req.body.status && ['checked_in', 'checked_out'].includes(req.body.status)) {
      // For check-in, visitor must be scheduled or approved
      if (req.body.status === 'checked_in') {
        if (visitor.status === 'pending_approval') {
          throw new ApiError(403, 'Cannot check in visitor. Waiting for resident approval.');
        }
        if (visitor.status === 'rejected') {
          throw new ApiError(403, 'Cannot check in rejected visitor.');
        }
      }
      Object.assign(visitor, req.body);
      if (req.body.status === 'checked_in') {
        visitor.checkInTime = new Date();
      }
      if (req.body.status === 'checked_out') {
        visitor.checkOutTime = new Date();
      }
    } else {
      throw new ApiError(403, 'Security can only check in/out visitors');
    }
  } else if (['owner', 'tenant'].includes(req.user.role)) {
    // Residents can approve/deny visitors for their flat
    if (visitor.flatToVisit !== req.user.flatNumber) {
      throw new ApiError(403, 'You can only approve visitors for your flat');
    }
    // Check if this user is the one who needs to approve
    if (visitor.status === 'pending_approval' && visitor.needsApprovalFrom) {
      if (visitor.needsApprovalFrom.toString() !== req.user._id.toString()) {
        throw new ApiError(403, 'This visitor is waiting for approval from another resident');
      }
    }
    if (req.body.isApproved !== undefined) {
      visitor.isApproved = req.body.isApproved;
      visitor.approvedBy = req.user._id;
      visitor.needsApprovalFrom = null; // Clear approval requirement
      // Update status based on approval
      if (req.body.isApproved) {
        visitor.status = req.body.status || 'scheduled'; // Set to scheduled when approved
      } else {
        visitor.status = 'rejected'; // Set to rejected when denied
      }
    } else {
      throw new ApiError(403, 'You can only approve or reject visitors');
    }
  } else if (!['committee', 'admin'].includes(req.user.role) && visitor.loggedBy.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'You cannot update this visitor record');
  } else {
    Object.assign(visitor, req.body);
  }

  await visitor.save();
  return successResponse(res, { visitor }, 200, 'Visitor updated');
});

const deleteVisitor = asyncHandler(async (req, res) => {
  const visitor = await VisitorLog.findById(req.params.id);
  if (!visitor) {
    throw new ApiError(404, 'Visitor record not found');
  }

  if (!['committee', 'admin'].includes(req.user.role) && visitor.loggedBy.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'You cannot delete this visitor record');
  }

  await visitor.deleteOne();
  return successResponse(res, {}, 200, 'Visitor deleted');
});

module.exports = {
  createVisitorLog,
  getVisitors,
  updateVisitor,
  deleteVisitor,
};

