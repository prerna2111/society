const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/response');
const Payment = require('../models/Payment');
const MaintenanceBill = require('../models/MaintenanceBill');

const initiatePayment = asyncHandler(async (req, res) => {
  const { billId, amount, transactionId, paymentMethod, metadata } = req.body;

  const bill = await MaintenanceBill.findById(billId);
  if (!bill) {
    throw new ApiError(404, 'Bill not found');
  }

  if (['owner', 'tenant'].includes(req.user.role) && bill.flatNumber !== req.user.flatNumber) {
    throw new ApiError(403, 'You cannot pay this bill');
  }

  const payment = await Payment.create({
    bill: billId,
    payer: req.user._id,
    amount,
    transactionId,
    paymentMethod,
    metadata,
  });

  return successResponse(res, { payment }, 201, 'Payment initiated');
});

const updatePaymentStatus = asyncHandler(async (req, res) => {
  const { status, remarks } = req.body;
  const payment = await Payment.findById(req.params.id);
  if (!payment) {
    throw new ApiError(404, 'Payment not found');
  }

  payment.status = status;
  payment.remarks = remarks;
  await payment.save();

  if (status === 'successful') {
    const bill = await MaintenanceBill.findById(payment.bill);
    if (bill) {
      bill.status = 'paid';
      bill.paidAt = new Date();
      await bill.save();
    }
  }

  return successResponse(res, { payment }, 200, 'Payment updated');
});

const getPayments = asyncHandler(async (req, res) => {
  const query = {};
  if (['owner', 'tenant'].includes(req.user.role)) {
    query.payer = req.user._id;
  }
  const payments = await Payment.find(query)
    .populate('bill')
    .populate('payer', 'firstName lastName flatNumber');
  return successResponse(res, { payments });
});

module.exports = {
  initiatePayment,
  updatePaymentStatus,
  getPayments,
};

