# Unity Banking

Unity Banking is a banking-style web application with a user dashboard, transfer pages, PIN verification, and account settings.

## Account settings added
Authenticated users can change their username, password, and security PIN from `bank/settings.html`. Passwords and PINs are hashed with bcrypt and stored in MongoDB rather than hard-coded in the frontend.

## Run locally
1. Open the `bank` directory.
2. Copy `.env.sample` to `.env` and provide a MongoDB connection string and a strong `JWT_SECRET`.
3. Run `npm install`.
4. Run `npm start`.
5. Open `http://localhost:3000`.

The `DEFAULT_USER_*` variables are used only to create the initial user when that username does not already exist. Change the initial password/PIN after first login.
