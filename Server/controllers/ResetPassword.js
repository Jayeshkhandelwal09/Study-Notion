const User = require("../models/User");
const mailSender = require("../utils/mailSender");
const bcrypt = require("bcrypt");

// resetPasswordToken

exports.resetPasswordToken = async (req, res, next) => {
  try {
    // fetch data from req.body
    const { email } = req.body;
    // validate user
    const user = await User.findOne({ email });
    if (!user) {
      return res.json({
        success: false,
        message: "Email Not Registered",
      });
    }
    // generate token
    const token = crypto.randomUUID();
    // update user by adding token and expiration time
    const updateDetails = await User.findOneAndUpdate(
      { email: email },
      {
        token: token,
        resetPassword: Date.now() + 5 * 60 * 1000,
      },
      { new: true }
    );
    // create url
    const url = `http://localhost:3000/update-password/${token}`;
    // send mail containing the url
    await mailSender(
      email,
      "Password Reset Link",
      `Click on the below link to reset your password\n ${url}`
    );
    // return response

    return res.json({
      success: true,
      message:
        "Email Sent Successfully , Please check mail and Change your password",
    });
  } catch (error) {
    console.log(error, "Error while sending the Reset mail");
    return res.status(500).json({
      success: false,
      message: "Issue while sending Reset Password mail",
    });
  }
};

// resetPassword

exports.resetPassword = async (req, res) => {
  try {
    // data fetch
    const { newPassword, confirmPassword, token } = req.body;
    //validation
    if (newPassword !== confirmPassword) {
      return res.status(403).json({
        success: false,
        message: "Confirm Password Do not match with newPassword",
      });
    }
    //get userdetails from db using token
    const userDetails = await User.findOne({ token: token });
    //if no entry - invalid token
    if (!token) {
      return res.json({
        success: false,
        message: "Token does not found for user while reseting the password",
      });
    }
    //token time check
    if (userDetails.resetPassword < Date.now()) {
      return res.json({
        success: false,
        message: "Token is expired ! , Please regenrate your token",
      });
    }

    //hash-pwd
    const hashedPassword = await bcrypt.hash(password, 10);
    //password update
    await User.findOneAndUpdate(
      { token: token },
      { password: hashedPassword },
      { new: true }
    );
    //return response
    return res.status(200).json({
      success: true,
      message: "Password Reset Successfull",
    });
  } catch (error) {
    console.log(error, "Error while Reseting the password");
    return res.json(500).json({
      success: false,
      message: "Issue while Resseting the password",
    });
  }
};
