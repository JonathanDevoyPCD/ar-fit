# AR-FIT

Adventure-racing inspired fitness web app with:
- a homepage summary
- a workout plan page
- a meal plan page
- an account page with email OTP auth flow
- a weekly planner with add/edit/delete
- completed/skipped tracking
- weekly score calculation
- backend-ready cloud planner persistence

Repository:
- GitHub: `https://github.com/JonathanDevoyPCD/ar-fit`
- Planned Pages URL: `https://jonathandevoypcd.github.io/ar-fit/`

## Tech Stack

- HTML
- SCSS/CSS
- Vanilla JavaScript
- Node.js / Express
- PostgreSQL
- `localStorage` for planner persistence

## Project Structure

```text
.
|-- index.html
|-- workout.html
|-- meals.html
|-- auth.html
|-- planner.html
|-- database
|   `-- schema.sql
|-- docs
|   `-- backend-setup.md
|-- server
|   |-- app.js
|   |-- config.js
|   |-- db.js
|   |-- index.js
|   |-- middleware
|   |   `-- auth.js
|   |-- routes
|   |   |-- auth.js
|   |   `-- planner.js
|   `-- utils
|       |-- email.js
|       `-- security.js
`-- assets
    |-- fonts
    |-- img
    |-- js
    |   |-- app-api.js
    |   |-- app-config.js
    |   |-- auth.js
    |   |-- home.js
    |   `-- planner.js
    `-- scss
        |-- styles.scss
        `-- styles.css
```

## Local Development

This project is now a multi-page web app with a custom backend.

### Run locally

1. Keep the folder structure intact.
2. Edit styles in `assets/scss/styles.scss`.
3. Let your VS Code SCSS compiler output the compiled stylesheet to `assets/scss/styles.css`.
4. Run the backend with:

```powershell
npm.cmd run dev
```

5. Open the app in your browser at:

```text
http://127.0.0.1:3000/
```

### Important note

The HTML pages load:

```html
assets/scss/styles.css
```

That compiled file is the runtime stylesheet the app uses in the browser.

## Backend Setup

The backend implementation is included, but it requires:
- PostgreSQL
- SMTP email credentials
- a configured API base URL in `assets/js/app-config.js`

Detailed setup steps are in:

```text
docs/backend-setup.md
```

## Features

### Homepage

- Shared navigation
- Sticky AR-FIT logo bar
- Weekly score summary strip

### Workout Plan

- Structured weekly training split
- Supporting overview cards and notes

### Meal Plan

- Daily meal structure
- Supporting overview cards and notes

### Weekly Planner

- Add workout and meal items
- Edit and delete existing items
- Mark items as completed, skipped, or reset
- Weekly score out of 100%
- Swipe week navigation on touch devices
- Default AR-FIT week loader
- Local browser storage fallback
- Cloud sync support for authenticated users

### Account

- Register with username + email
- Login with email
- Verify via one-time password
- Session-based auth via backend cookie
- Import local planner data into account storage

## Screenshots

No screenshots are committed yet.

Recommended filenames if you want to add them later:
- `assets/img/homepage.png`
- `assets/img/planner.png`
- `assets/img/workout.png`
- `assets/img/meals.png`

Once those files exist, add them here with standard Markdown image links.

## Deployment

This project now has two deployment parts:

- static frontend
- Node.js backend

### GitHub Pages

The frontend is currently published directly from `main` and `/ (root)`.

Notes:
- The frontend uses relative links, which is compatible with project-site deployment.
- The auth and planner sync features require a separately hosted backend API.

### Netlify

Recommended if you want fast static hosting with simple drag-and-drop or Git-based deploys.

#### Option 1: Drag and drop

1. Open Netlify.
2. Choose `Add new site` > `Deploy manually`.
3. Drag the project folder in.

#### Option 2: Connect GitHub

1. Open Netlify.
2. Choose `Add new site` > `Import an existing project`.
3. Connect your GitHub repo.
4. Use these settings:
   - Build command: none
   - Publish directory: project root

### Backend Hosting

The backend cannot run on GitHub Pages.

You need a Node-capable host for the API, for example:
- Render
- Railway
- Fly.io
- VPS / self-hosted Node server

## Planned Improvements

- Export/import planner data
- Template weeks and copy-last-week flows
- Planner history and score trends
- Better mobile install experience
- Fully hosted backend deployment
- Replacing external CDN assets with local bundled assets
- Custom in-app confirm dialogs instead of browser confirms

## Repository Notes

- Git is initialized on the `main` branch.
- The frontend is published from GitHub Pages.
- A restrictive `LICENSE` file is included for personal-project protection.
- The repo remote is:

```text
https://github.com/JonathanDevoyPCD/ar-fit
```
