const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    bill: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MaintenanceBill',
      required: true,
    },
    payer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['initiated', 'successful', 'failed', 'refunded'],
      default: 'initiated',
    },
    transactionId: {
      type: String,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ['razorpay', 'stripe', 'cash', 'other'],
      default: 'razorpay',
    },
    metadata: {
      type: Map,
      of: String,
    },
    remarks: {
      type: String,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Payment', paymentSchema);

