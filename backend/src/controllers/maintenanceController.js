const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/response');
const MaintenanceBill = require('../models/MaintenanceBill');

const createBill = asyncHandler(async (req, res) => {
  const bill = await MaintenanceBill.create(req.body);
  return successResponse(res, { bill }, 201, 'Maintenance bill created');
});

const getBills = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const query = status ? { status } : {};

  if (['owner', 'tenant'].includes(req.user.role)) {
    query.flatNumber = req.user.flatNumber;
  }

  const bills = await MaintenanceBill.find(query)
    .populate('owner', 'firstName lastName email flatNumber')
    .sort({ dueDate: 1 });

  return successResponse(res, { bills });
});

const getBill = asyncHandler(async (req, res) => {
  const bill = await MaintenanceBill.findById(req.params.id).populate('owner', 'firstName lastName email flatNumber');
  if (!bill) {
    throw new ApiError(404, 'Bill not found');
  }

  if (['owner', 'tenant'].includes(req.user.role) && bill.flatNumber !== req.user.flatNumber) {
    throw new ApiError(403, 'You cannot view this bill');
  }

  return successResponse(res, { bill });
});

const updateBill = asyncHandler(async (req, res) => {
  const bill = await MaintenanceBill.findById(req.params.id);
  if (!bill) {
    throw new ApiError(404, 'Bill not found');
  }

  Object.assign(bill, req.body);
  if (bill.status === 'paid' && !bill.paidAt) {
    bill.paidAt = new Date();
  }
  await bill.save();

  return successResponse(res, { bill }, 200, 'Bill updated');
});

const deleteBill = asyncHandler(async (req, res) => {
  const bill = await MaintenanceBill.findById(req.params.id);
  if (!bill) {
    throw new ApiError(404, 'Bill not found');
  }
  
  // Only admin can delete bills
  if (!['admin', 'committee'].includes(req.user.role)) {
    throw new ApiError(403, 'You do not have permission to delete bills');
  }
  
  await bill.deleteOne();
  return successResponse(res, {}, 200, 'Bill deleted');
});

module.exports = {
  createBill,
  getBills,
  getBill,
  updateBill,
  deleteBill,
};

