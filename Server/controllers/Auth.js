const User = require("../models/User");
const OTP = require("../models/OTP");
const Profile = require("../models/Profile");
const otpGenerator = require("otp-generator");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

// Send OTP

exports.sendOTP = async (req, res) => {
  try {
    // Fetching email from request body
    const { email } = req.body;

    // Checking if similar email exists
    const checkUserPresent = await User.findOne({ email });

    // if user Already exists return a respone
    if (checkUserPresent) {
      return res.status(401).json({
        success: true,
        message: "User Already Exist",
      });
    }

    // If not then Generate OTP
    var otp = otpGenerator.generate(6, {
      upperCaseAlphabets: false,
      lowerCaseAlphabets: false,
      specialChars: false,
    });
    console.log("Otp Generated: ", otp);

    // Checking if otp is unique or not

    let result = await OTP.findOne({ otp: otp });

    while (result) {
      otp = otpGenerator.generate(6, {
        upperCaseAlphabets: false,
        lowerCaseAlphabets: false,
        specialChars: false,
      });
      result = await OTP.findOne({ otp: otp });
    }

    const otpPayload = { email, otp };

    // Create entry for otp
    const otpbody = await OTP.create(otpPayload);
    console.log(otpbody);

    res.status(200).json({
      success: true,
      message: "OTP sent Successfully",
    });
  } catch (error) {
    console.log(error.message);
    return res.status(200).json({
      success: false,
      message: "Error while Sending the OTP",
    });
  }
};

// signUp
exports.signUp = async (req, res) => {
  try {
    // data fetching from req body
    const {
      firstName,
      lastName,
      email,
      password,
      confirmPassword,
      accountType,
      contactNumber,
      otp,
    } = req.body;

    // validation
    if (
      !firstName ||
      !lastName ||
      !email ||
      !password ||
      !confirmPassword ||
      !otp
    ) {
      return res.status(403).json({
        success: false,
        message: "All fields are Required",
      });
    }

    // match the password with confirm password

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Password and Confirm password Value does not match",
      });
    }

    // if user already exist then send a response
    const exisitingUser = await User.findOne({ email });
    if (exisitingUser) {
      return res.status(400).json({
        success: false,
        message: "User is already Registered",
      });
    }

    // find most recent otp stored for the user
    const recentOtp = await OTP.find({ email })
      .sort({ createdAt: -1 })
      .limit(1);
    console.log(recentOtp);

    // validate otp
    if (recentOtp.length == 0) {
      // OTP not found
      return res.status(400).json({
        success: false,
        message: "Otp Not found",
      });
    } else if (otp !== recentOtp.otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid Otp",
      });
    }

    // hashpassword
    const hashedPassword = await bcrypt.hash(password, 10);

    // creating a Empty Profile user
    const profileDetails = await Profile.create({
      gender: null,
      dateOfBirth: null,
      about: null,
      contactNumber: null,
    });

    // create entry in db

    const user = await User.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      contactNumber,
      accountType,
      additionalDetails: profileDetails._id,
      image: `https://api.dicebear.com/5.x/initials/svg?seed=${firstname} ${lastName}`,
    });

    // return the success response

    return res.status(200).json({
      success: true,
      message: "User Registered Successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "User cannot be registered Please try again",
    });
  }
};

// Login

exports.login = async (req, res) => {
  try {
    //data fetching from req.body
    const { email, password } = req.body;

    //  validate data
    if (!email || !password) {
      return res.status(403).json({
        success: false,
        message: "All fields are Required",
      });
    }
    // if user does not exist ask him to register

    const user = await User.findOne({ email }).populate("additionalDetails");
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User is not Registered , Please SignUp",
      });
    }
    // generate jwt token after generating token

    if (await bcrypt.compare(password, user.password)) {
      const payload = {
        email: user.email,
        id: user._id,
        accountType: user.accountType,
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: "2h",
      });

      user.token = token;
      user.password = undefined;

      // create cookie and send the response

      const options = { 
        expires: new Date (Date.now() + 3*24*60*60*1000),
        httpOnly:true,
        }

      res.cookie("token", token, options).status(200).json({
        success: true,
        token,
        user,
        message: "User Successfully logged In",
      });
    } else {
      return res.status(401).json({
        success: false,
        message: "Password is Incorrect",
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Login failure , Please try again",
    });
  }
};

// ChangePassword
