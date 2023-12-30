const mongoose = require("mongoose");
const mailSender = require("../utils/mailSender");

const OTPSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  otp: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now(),
    expires: 5 * 60,
  },
});

// Email Sender Function

async function sendVerificationEmail(email, otp) {
  try {
    const mailResponse = mailSender(
      email,
      "Verification Email from StudyNotion",
      otp
    );
    console.log("Email Sent Successfully: ", mailResponse);
  } catch (error) {
    console.log("Error Occured while sending mail", error);
    throw new error();
  }
}

OTPSchema.pre("save", async function (next) {
  await sendVerificationEmail(this.email, this.otp);
  next();
});

module.exports = mongoose.model("OTP", OTPSchema);
