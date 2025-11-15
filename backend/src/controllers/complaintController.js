const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/response');
const Complaint = require('../models/Complaint');

const createComplaint = asyncHandler(async (req, res) => {
  const complaint = await Complaint.create({
    ...req.body,
    createdBy: req.user._id,
  });
  return successResponse(res, { complaint }, 201, 'Complaint submitted');
});

const getComplaints = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const query = status ? { status } : {};

  if (!['committee', 'admin'].includes(req.user.role)) {
    query.createdBy = req.user._id;
  }

  const complaints = await Complaint.find(query)
    .populate('createdBy', 'firstName lastName flatNumber')
    .populate('assignedTo', 'firstName lastName role')
    .sort({ isPinned: -1, createdAt: -1 }); // Pinned first, then by date

  return successResponse(res, { complaints });
});

const updateComplaint = asyncHandler(async (req, res) => {
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) {
    throw new ApiError(404, 'Complaint not found');
  }

  if (!['committee', 'admin'].includes(req.user.role) && complaint.createdBy.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'You cannot update this complaint');
  }

  // If complaint is resolved, don't allow changing status (admin only)
  if (complaint.status === 'resolved' && req.body.status && req.body.status !== 'resolved' && ['admin', 'committee'].includes(req.user.role)) {
    throw new ApiError(400, 'Cannot change status of resolved complaint');
  }

  Object.assign(complaint, req.body);
  await complaint.save();

  return successResponse(res, { complaint }, 200, 'Complaint updated');
});

const deleteComplaint = asyncHandler(async (req, res) => {
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) {
    throw new ApiError(404, 'Complaint not found');
  }

  // Admin can only delete complaints they created, residents can delete their own
  if (req.user.role === 'admin') {
    if (complaint.createdBy.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'You can only delete complaints you created');
    }
  } else if (complaint.createdBy.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'You cannot delete this complaint');
  }

  await complaint.deleteOne();
  return successResponse(res, {}, 200, 'Complaint deleted');
});

module.exports = {
  createComplaint,
  getComplaints,
  updateComplaint,
  deleteComplaint,
};

