const mongoose = require('mongoose');

const optionSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: true,
    },
    votes: {
      type: Number,
      default: 0,
    },
  },
  { _id: true },
);

const pollSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
    },
    options: {
      type: [optionSchema],
      validate: {
        validator(value) {
          return value.length >= 2;
        },
        message: 'Poll must have at least two options',
      },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    closesAt: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    responses: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        optionId: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
        },
        votedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true },
);

pollSchema.methods.vote = function vote(userId, optionId) {
  const hasVoted = this.responses.some((response) => response.user.toString() === userId.toString());
  if (hasVoted) {
    throw new Error('User has already voted');
  }

  const option = this.options.id(optionId);
  if (!option) {
    throw new Error('Invalid option');
  }

  option.votes += 1;
  this.responses.push({ user: userId, optionId });
};

module.exports = mongoose.model('Poll', pollSchema);

