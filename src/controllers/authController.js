const User = require('../models/User');
const { sendSuccess, sendError } = require('../utils/apiResponse');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
    const { name, email, password, role } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
        return sendError(res, 'Email already registered', 400);
    }

    const user = await User.create({ name, email, password, role });
    const token = user.getSignedJwtToken();

    return sendSuccess(res, {
        token,
        user: { id: user._id, name: user.name, email: user.email, role: user.role }
    }, 'Registered successfully', 201);
};


exports.login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return sendError(res, 'Please provide email and password', 400);
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
        return sendError(res, 'Invalid credentials', 401);
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
        return sendError(res, 'Invalid credentials', 401);
    }

    const token = user.getSignedJwtToken();

    return sendSuccess(res, {
        token,
        user: { id: user._id, name: user.name, email: user.email, role: user.role }
    }, 'Login successful');
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
    const user = await User.findById(req.user.id);
    return sendSuccess(res, { data: user }, 'User fetched');
};

// @desc    Update password
// @route   PUT /api/auth/updatepassword
// @access  Private
exports.updatePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id).select('+password');

    if (!(await user.matchPassword(currentPassword))) {
        return sendError(res, 'Current password is incorrect', 401);
    }

    user.password = newPassword;
    await user.save();

    const token = user.getSignedJwtToken();
    return sendSuccess(res, { token }, 'Password updated');
};
