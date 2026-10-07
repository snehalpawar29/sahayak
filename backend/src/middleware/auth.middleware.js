import jwt from "jsonwebtoken";

const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    /*
    |--------------------------------------------------------------------------
    | Normalize JWT user information
    |--------------------------------------------------------------------------
    | Different parts of the application should always use:
    | req.user.id
    |
    | This also supports older tokens containing userId/user_id.
    |--------------------------------------------------------------------------
    */

    const userId =
      decoded.id ??
      decoded.userId ??
      decoded.user_id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token: user ID missing"
      });
    }

    req.user = {
      id: Number(userId),
      email: decoded.email,
      role: decoded.role
    };

    next();
  } catch (error) {
    console.error("Authentication error:", error);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token"
    });
  }
};

export default authenticate;