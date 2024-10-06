const http = require("http");
const path = require("path");
const fs = require("fs");

const port = 3457;
const regpage = path.join(__dirname, "registor.html");
const loginpage = path.join(__dirname, "login.html");
const registerDataFile = path.join(__dirname, "registorData.json");
const loginDataFile = path.join(__dirname, "loginData.json");

const app = http.createServer((req, res) => {
    if (req.url === "/reg" && req.method === "GET") {
        // Serve the registration page
        fs.readFile(regpage, "utf-8", (err, data) => {
            if (err) {
                console.log(err);
                res.end("Error loading registration page");
            } else {
                res.writeHead(200, { "Content-Type": "text/html" });
                res.end(data);
            }
        });
    } else if (req.url === "/submit" && req.method === "POST") {
        // Handle registration form submission
        let body = '';
        req.on("data", chunk => {
            body += chunk.toString(); // Collect form data
        });
        req.on("end", () => {
            const formData = new URLSearchParams(body);
            const username = formData.get("username");
            const email = formData.get("email");
            const password = formData.get("password");
            const confirmPassword = formData.get("confirm_password");

            // Check if passwords match
            if (password !== confirmPassword) {
                res.writeHead(200, { "Content-Type": "text/html" });
                res.end("<p style='color:red;'>Passwords do not match!</p>");
                return;
            }

            // Create new user object
            const newUserData = { username, email, password };

            // Check if the JSON file exists, if not create it
            fs.access(registerDataFile, fs.constants.F_OK, (err) => {
                if (err) {
                    // File does not exist, create a new one
                    fs.writeFile(registerDataFile, JSON.stringify([newUserData], null, 2), (err) => {
                        if (err) {
                            console.log("Error creating registration data file: ", err);
                            res.writeHead(500, { "Content-Type": "text/plain" });
                            return res.end("Error creating registration data");
                        }
                        // Save login data immediately after registration
                        saveLoginData(newUserData, res);
                    });
                } else {
                    // File exists, read the existing data
                    fs.readFile(registerDataFile, "utf-8", (err, data) => {
                        let registerData = [];

                        if (!err && data) {
                            try {
                                registerData = JSON.parse(data);
                            } catch (parseErr) {
                                console.log("Error parsing JSON data: ", parseErr);
                            }
                        }

                        // Append new user to the data
                        registerData.push(newUserData);

                        // Write the updated data back to the file
                        fs.writeFile(registerDataFile, JSON.stringify(registerData, null, 2), err => {
                            if (err) {
                                console.log("Error saving registration data: ", err);
                                res.writeHead(500, { "Content-Type": "text/plain" });
                                return res.end("Error saving registration data");
                            }

                            // Save login data immediately after registration
                            saveLoginData(newUserData, res);
                        });
                    });
                }
            });
        });
    } else if (req.url === "/login" && req.method === "GET") {
        // Serve the login page
        fs.readFile(loginpage, "utf-8", (err, data) => {
            if (err) {
                console.log(err);
                res.end("Error loading login page");
            } else {
                res.writeHead(200, { "Content-Type": "text/html" });
                res.end(data);
            }
        });
    } else if (req.url === "/submit-login" && req.method === "POST") {
        // Handle login form submission
        let body = '';
        req.on("data", chunk => {
            body += chunk.toString(); // Collect form data
        });
        req.on("end", () => {
            const formData = new URLSearchParams(body);
            const username = formData.get("username");
            const password = formData.get("password");

            // Read the registerData.json file to verify login
            fs.readFile(registerDataFile, "utf-8", (err, data) => {
                if (err || !data) {
                    res.writeHead(500, { "Content-Type": "text/plain" });
                    return res.end("Internal Server Error");
                }

                // Parse registered users data
                const registerData = JSON.parse(data);
                const user = registerData.find(u => u.username === username);

                if (user && user.password === password) {
                    // If the password is correct
                    console.log(`Login successful for user: ${username}`);

                    // Save login data to loginData.json
                    const newLoginData = { username, password };
                    fs.readFile(loginDataFile, "utf-8", (err, loginData) => {
                        let loginRecords = [];
                        if (!err && loginData) {
                            try {
                                loginRecords = JSON.parse(loginData);
                            } catch (parseErr) {
                                console.log("Error parsing login data: ", parseErr);
                            }
                        }

                        loginRecords.push(newLoginData);

                        fs.writeFile(loginDataFile, JSON.stringify(loginRecords, null, 2), err => {
                            if (err) {
                                console.log("Error saving login data: ", err);
                                res.writeHead(500, { "Content-Type": "text/plain" });
                                return res.end("Error saving login data");
                            }

                            // Redirect to a success page (or home page)
                            res.writeHead(302, { 'Location': '/home' });
                            res.end();
                        });
                    });
                } else {
                    // Invalid username or password
                    fs.readFile(loginpage, "utf-8", (err, data) => {
                        if (err) {
                            console.log(err);
                            res.end("Error loading login page");
                        } else {
                            res.writeHead(200, { "Content-Type": "text/html" });
                            const updatedPage = data.replace("<!--error-message-->", "<p style='color:red;'>Invalid username or password</p>");
                            res.end(updatedPage);
                        }
                    });
                }
            });
        });
    } else if (req.url === "/home") {
        // Serve home page or success message
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end("<h3>Registration Successful!</h3>");
    } else {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("404: Page not found");
    }
});

// Function to save login data after registration
function saveLoginData(userData, res) {
    const newLoginData = { username: userData.username, password: userData.password };
    fs.readFile(loginDataFile, "utf-8", (err, loginData) => {
        let loginRecords = [];
        if (!err && loginData) {
            try {
                loginRecords = JSON.parse(loginData);
            } catch (parseErr) {
                console.log("Error parsing login data: ", parseErr);
            }
        }

        loginRecords.push(newLoginData);

        fs.writeFile(loginDataFile, JSON.stringify(loginRecords, null, 2), err => {
            if (err) {
                console.log("Error saving login data: ", err);
                res.writeHead(500, { "Content-Type": "text/plain" });
                return res.end("Error saving login data");
            }

            // Redirect to the login page after successful registration
            res.writeHead(302, { 'Location': '/login' });
            res.end();
        });
    });
}

// Start the server
app.listen(port, () => {
    console.log(`Server started on http://localhost:${port}`);
});
