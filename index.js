#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const projectName = process.argv[2];

if (!projectName) {
  console.log("❌ Please provide project name");
  console.log("Example: create-node-api my-app");
  process.exit(1);
}

const projectPath = path.join(process.cwd(), projectName);

// Helper to create folders
const createFolder = (folderPath) => {
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
};

// Create base project
createFolder(projectPath);

// =======================
// FOLDERS STRUCTURE
// =======================
const folders = ["controllers", "model", "routes", "middleware"];

folders.forEach((folder) => {
  createFolder(path.join(projectPath, folder));
});

// =======================
// USER CONTROLLER
// =======================
fs.writeFileSync(
  path.join(projectPath, "controllers", "userController.js"),
  `
exports.getAllUsers = (req, res) => {
  res.status(200).json({ message: "Get all users" });
};

exports.createUser = (req, res) => {
  res.status(201).json({ message: "User created" });
};
`,
);

// =======================
// AUTH CONTROLLER (JWT)
// =======================
fs.writeFileSync(
  path.join(projectPath, "controllers", "authController.js"),
  `
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const users = [];

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

exports.register = async (req, res) => {
  try {
    const { email, password } = req.body;

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = { id: Date.now().toString(), email, password: hashedPassword };
    users.push(user);

    const token = signToken(user.id);

    res.status(201).json({
      status: "success",
      token,
      user,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = users.find((u) => u.email === email);

    if (!user) return res.status(404).json({ message: "User not found" });

    const correct = await bcrypt.compare(password, user.password);

    if (!correct) return res.status(401).json({ message: "Wrong password" });

    const token = signToken(user.id);

    res.json({
      status: "success",
      token,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
`,
);

// =======================
// USER MODEL
// =======================
fs.writeFileSync(
  path.join(projectPath, "model", "userModel.js"),
  `
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true },
    password: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
`,
);

// =======================
// AUTH MIDDLEWARE
// =======================
fs.writeFileSync(
  path.join(projectPath, "middleware", "authMiddleware.js"),
  `
const jwt = require("jsonwebtoken");

exports.protect = (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ message: "Not logged in" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};
`,
);

// =======================
// ROUTES
// =======================
fs.writeFileSync(
  path.join(projectPath, "routes", "userRoutes.js"),
  `
const express = require("express");
const controller = require("../controllers/userController");

const router = express.Router();

router.route("/").get(controller.getAllUsers).post(controller.createUser);

module.exports = router;
`,
);

fs.writeFileSync(
  path.join(projectPath, "routes", "authRoutes.js"),
  `
const express = require("express");
const authController = require("../controllers/authController");

const router = express.Router();

router.post("/register", authController.register);
router.post("/login", authController.login);

module.exports = router;
`,
);

// =======================
// APP FILE
// =======================
fs.writeFileSync(
  path.join(projectPath, "app.js"),
  `
const express = require("express");

const app = express();

app.use(express.json());

const userRoutes = require("./routes/userRoutes");
const authRoutes = require("./routes/authRoutes");

app.use("/api/v1/users", userRoutes);
app.use("/api/v1/auth", authRoutes);

module.exports = app;
`,
);

// =======================
// SERVER FILE
// =======================
fs.writeFileSync(
  path.join(projectPath, "server.js"),
  `
const dotenv = require("dotenv");
const mongoose = require("mongoose");

dotenv.config({ path: "./config.env" });

const app = require("./app");

const db = process.env.DATABASE_URL.replace(
  "<PASSWORD>",
  process.env.DATABASE_PASSWORD
);

mongoose
  .connect(db)
  .then(() => console.log("DB connected"))
  .catch((err) => console.log(err));

const port = process.env.PORT || 8080;

app.listen(port, () => {
  console.log(\`Server running on port \${port}\`);
});
`,
);

// =======================
// ENV FILE
// =======================
fs.writeFileSync(
  path.join(projectPath, "config.env"),
  `
PORT=8080
NODE_ENV=development
DATABASE_URL=mongodb+srv://test:<PASSWORD>@cluster.mongodb.net/mydb
DATABASE_PASSWORD=yourpassword
JWT_SECRET=mySuperSecretKey123
JWT_EXPIRES_IN=90d
`,
);

// =======================
// PACKAGE.JSON
// =======================
fs.writeFileSync(
  path.join(projectPath, "package.json"),
  JSON.stringify(
    {
      name: projectName,
      version: "1.0.0",
      main: "server.js",
      scripts: {
        start: "node server.js",
      },
      dependencies: {
        express: "^4.18.2",
        mongoose: "^8.0.0",
        dotenv: "^16.0.0",
        jsonwebtoken: "^9.0.2",
        bcryptjs: "^2.4.3",
      },
    },
    null,
    2,
  ),
);

// =======================
// INSTALL PACKAGES
// =======================
console.log("📦 Installing packages...");

execSync("npm install", {
  cwd: projectPath,
  stdio: "inherit",
});

console.log("✅ Project created successfully!");
console.log(`🚀 cd ${projectName} && npm start`);
console.log("build by Abdallah Najm Abd backend developer");
