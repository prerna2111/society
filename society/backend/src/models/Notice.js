const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    audience: {
      type: [String],
      enum: ['owners', 'tenants', 'committee', 'all'],
      default: ['all'],
    },
    attachments: [
      {
        fileName: String,
        url: String,
      },
    ],
    expiresAt: {
      type: Date,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Notice', noticeSchema);

