const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/response');
const Notice = require('../models/Notice');
const User = require('../models/User');
const { sendEmail } = require('../services/emailService');

const createNotice = asyncHandler(async (req, res) => {
  const notice = await Notice.create({
    ...req.body,
    createdBy: req.user._id,
  });

  const audience = notice.audience.includes('all') ? {} : { role: { $in: notice.audience } };
  const recipients = await User.find(audience).select('email');

  if (recipients.length) {
    const emails = recipients.map((user) => user.email);
    sendEmail({
      to: emails,
      subject: `[Society Connect] ${notice.title}`,
      html: `<h1>${notice.title}</h1><p>${notice.content}</p>`,
      text: `${notice.title}\n\n${notice.content}`,
    }).catch((error) => {
      // eslint-disable-next-line no-console
      console.error('Failed to send notice emails', error.message);
    });
  }

  return successResponse(res, { notice }, 201, 'Notice created');
});

const getNotices = asyncHandler(async (req, res) => {
  const { audience } = req.query;
  const query = {};
  if (audience && audience !== 'all') {
    query.$or = [{ audience: audience }, { audience: 'all' }];
  }
  const notices = await Notice.find(query)
    .populate('createdBy', 'firstName lastName role')
    .sort({ isPinned: -1, createdAt: -1 }); // Pinned first, then by date

  return successResponse(res, { notices });
});

const updateNotice = asyncHandler(async (req, res) => {
  const notice = await Notice.findById(req.params.id);
  if (!notice) {
    throw new ApiError(404, 'Notice not found');
  }

  if (notice.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ApiError(403, 'You cannot edit this notice');
  }

  Object.assign(notice, req.body);
  await notice.save();

  return successResponse(res, { notice }, 200, 'Notice updated');
});

const deleteNotice = asyncHandler(async (req, res) => {
  const notice = await Notice.findById(req.params.id);
  if (!notice) {
    throw new ApiError(404, 'Notice not found');
  }
  if (notice.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ApiError(403, 'You cannot delete this notice');
  }

  await notice.deleteOne();
  return successResponse(res, {}, 200, 'Notice deleted');
});

module.exports = {
  createNotice,
  getNotices,
  updateNotice,
  deleteNotice,
};

