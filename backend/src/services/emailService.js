const nodemailer = require('nodemailer');

const createTransporter = () => {
  if (process.env.NODE_ENV === 'test') {
    return {
      sendMail: async (options) => {
        // eslint-disable-next-line no-console
        console.log('Email skipped in test env', options);
      },
    };
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    auth: process.env.SMTP_USER
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        }
      : undefined,
  });
};

const transporter = createTransporter();

const sendEmail = async ({ to, subject, html, text }) => {
  if (!to) {
    return;
  }

  await transporter.sendMail({
    from: process.env.MAIL_FROM || 'no-reply@societyconnect.local',
    to,
    subject,
    html,
    text,
  });
};

module.exports = {
  sendEmail,
};

