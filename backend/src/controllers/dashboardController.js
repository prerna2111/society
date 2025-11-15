const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/response');
const Notice = require('../models/Notice');
const MaintenanceBill = require('../models/MaintenanceBill');
const Complaint = require('../models/Complaint');
const Poll = require('../models/Poll');
const VisitorLog = require('../models/VisitorLog');

const getDashboard = asyncHandler(async (req, res) => {
  const [notices, complaints, activePolls, upcomingVisitors, bills] = await Promise.all([
    Notice.find({}).sort({ createdAt: -1 }).limit(3),
    Complaint.find({ createdBy: req.user._id }).sort({ createdAt: -1 }).limit(3),
    Poll.find({ isActive: true }).sort({ createdAt: -1 }).limit(3),
    VisitorLog.find({ flatToVisit: req.user.flatNumber, status: { $in: ['scheduled', 'checked_in'] } })
      .sort({ expectedTime: 1 })
      .limit(3),
    MaintenanceBill.find({ flatNumber: req.user.flatNumber, status: { $ne: 'paid' } })
      .sort({ dueDate: 1 })
      .limit(1),
  ]);

  return successResponse(res, {
    notices,
    complaints,
    activePolls,
    upcomingVisitors,
    bills,
  });
});

module.exports = {
  getDashboard,
};

