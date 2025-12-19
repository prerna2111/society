const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/response');
const VisitorLog = require('../models/VisitorLog');

const createVisitorLog = asyncHandler(async (req, res) => {
  const { status, ...visitorData } = req.body;
  
  // For security adding unscheduled visitor, set status to pending_approval
  let visitorStatus = status || 'scheduled';
  if (req.user.role === 'security' && !status) {
    visitorStatus = 'pending_approval';
  }
  
  const visitor = await VisitorLog.create({
    ...visitorData,
    status: visitorStatus,
    loggedBy: req.user._id,
    scheduledBy: req.user._id, // Track who scheduled the visitor
    isApproved: visitorStatus === 'scheduled', // Scheduled visitors are auto-approved
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
    const flatUsers = await require('../models/User').find({ flatNumber: userFlat, role: { $in: ['owner', 'tenant'] } });
    const hasTenant = flatUsers.some(u => u.role === 'tenant' && u._id.toString() !== req.user._id.toString());
    const hasOwner = flatUsers.some(u => u.role === 'owner');
    
    query.flatToVisit = userFlat;
    
    // If user is tenant:
    // - Show visitors scheduled by tenant (themselves)
    // - Show visitors scheduled by owner (if owner exists)
    // - Don't show visitors scheduled by others
    if (req.user.role === 'tenant') {
      // Tenant sees: visitors scheduled by themselves OR by owner (if owner exists)
      if (hasOwner) {
        const ownerIds = flatUsers.filter(u => u.role === 'owner').map(u => u._id);
        query.$or = [
          { scheduledBy: req.user._id },
          { scheduledBy: { $in: ownerIds } }
        ];
      } else {
        // No owner, tenant sees only their own scheduled visitors
        query.scheduledBy = req.user._id;
      }
    } else if (req.user.role === 'owner') {
      // Owner sees: visitors scheduled by themselves only (NOT by tenant)
      // If owner scheduled a visit and there's a tenant, tenant should see it (handled above)
      query.scheduledBy = req.user._id;
    }
  }
  
  const visitors = await VisitorLog.find(query)
    .populate('loggedBy', 'firstName lastName role')
    .populate('approvedBy', 'firstName lastName')
    .populate('scheduledBy', 'firstName lastName role')
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
    if (req.body.isApproved !== undefined) {
      visitor.isApproved = req.body.isApproved;
      visitor.approvedBy = req.user._id;
      if (req.body.status) visitor.status = req.body.status;
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

