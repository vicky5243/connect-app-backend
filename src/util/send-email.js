// External libraries
const nodemailer = require('nodemailer');

const sendEmailVerificationCode = (confirmationCode, toEmail) => {
  const transporter = nodemailer.createTransport({
    service: process.env.NODEMAILER_SERVICE,
    auth: {
      type: process.env.NODEMAILER_TYPE,
      user: process.env.NODEMAILER_EMAIL,
      pass: process.env.NODEMAILER_PASSWORD,
      clientId: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      refreshToken: process.env.REFRESH_TOKEN
    }
  });

  const mailOptions = {
    from: `${process.env.NODEMAILER_NAME} ${process.env.NODEMAILER_EMAIL}`,
    to: toEmail,
    subject: `${confirmationCode} is your Connect code`,
    text: `
      Hi,
      Someone tried to sign up for an Connect account with ${toEmail}. If it was you, enter this confirmation code in the app:
      ${confirmationCode}
    `,
    html: `
      <center>
        <table style="width:100%;max-width:400px;margin: 0 auto;" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td width="100%" style="text-align:left;">
              <p style="color:#565a5c; font-size:18px;">Hi,</p>
              <p style="color:#565a5c; font-size:18px;">
                Someone tried to sign up for an Connect account with ${toEmail}. If it was you, enter this confirmation code in the app:
              </p>
            </td>
          </tr>
          <tr>
            <td width="100%" style="text-align:center;">
              <p style="color:#565a5c; font-size:32px;"><strong>${confirmationCode}</strong></p>
            </td>
          </tr>
        </table>
      </center>
    `
  };

  transporter.sendMail(mailOptions, (err, data) => {
    if (err) {
      console.log('ERROR WHILE SENDING EMAIL: ', err);
    }
  });
};

module.exports = {
  sendEmailVerificationCode
}