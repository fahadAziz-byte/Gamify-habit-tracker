const { z } = require("zod");

// Define schema for signup
const signupSchema = z.object({
    username: z.string().min(3, "Username must be at least 3 characters long"),
    password: z.string().min(6, "Password must be at least 6 characters long"),

    email:z.string().email({message:"emaill is required "})
    
});

// Define schema for login
const loginSchema = z.object({
    username: z.string().min(3, "Invalid username"),
    password: z.string().min(6, "Invalid password")
});

// Middleware for validating signup
const validateSignup = (req, res, next) => {
    const result = signupSchema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({ error: result.error.errors });
    }
    next();
};

// Middleware for validating login
const validateLogin = (req, res, next) => {
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({ error: result.error.errors });
    }
    next();
};

module.exports = { validateSignup, validateLogin };
