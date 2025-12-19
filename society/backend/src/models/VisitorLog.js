const mongoose = require('mongoose');

const visitorLogSchema = new mongoose.Schema(
  {
    visitorName: {
      type: String,
      required: true,
    },
    purpose: {
      type: String,
      required: true,
    },
    contactNumber: {
      type: String,
    },
    flatToVisit: {
      type: String,
      required: true,
    },
    expectedTime: {
      type: Date,
      required: true,
    },
    checkInTime: {
      type: Date,
    },
    checkOutTime: {
      type: Date,
    },
    loggedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['scheduled', 'checked_in', 'checked_out', 'cancelled', 'pending_approval', 'rejected'],
      default: 'scheduled',
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    scheduledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model('VisitorLog', visitorLogSchema);

