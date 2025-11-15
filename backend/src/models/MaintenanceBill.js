const mongoose = require('mongoose');

const maintenanceBillSchema = new mongoose.Schema(
  {
    flatNumber: {
      type: String,
      required: true,
      index: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    periodStart: {
      type: Date,
      required: true,
    },
    periodEnd: {
      type: Date,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    breakdown: {
      maintenance: { type: Number, default: 0 },
      parking: { type: Number, default: 0 },
      sinkingFund: { type: Number, default: 0 },
      other: { type: Number, default: 0 },
    },
    dueDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'overdue'],
      default: 'pending',
    },
    paidAt: {
      type: Date,
    },
    notes: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

maintenanceBillSchema.index({ flatNumber: 1, periodStart: -1 }, { unique: true });

module.exports = mongoose.model('MaintenanceBill', maintenanceBillSchema);

