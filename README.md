# AR-FIT

Adventure-racing inspired fitness web app with:
- a homepage summary
- a workout plan page
- a meal plan page
- a weekly planner with add/edit/delete
- completed/skipped tracking
- weekly score calculation

Repository:
- GitHub: `https://github.com/JonathanDevoyPCD/ar-fit`
- Planned Pages URL: `https://jonathandevoypcd.github.io/ar-fit/`

## Tech Stack

- HTML
- SCSS/CSS
- Vanilla JavaScript
- `localStorage` for planner persistence

## Project Structure

```text
.
|-- index.html
|-- workout.html
|-- meals.html
|-- planner.html
`-- assets
    |-- fonts
    |-- img
    |-- js
    |   |-- home.js
    |   `-- planner.js
    `-- scss
        |-- styles.scss
        `-- styles.css
```

## Local Development

This project is currently a static multi-page web app.

### Run locally

1. Keep the folder structure intact.
2. Open `index.html` in a browser, or use a local server in VS Code.
3. Edit styles in `assets/scss/styles.scss`.
4. Let your VS Code SCSS compiler output the compiled stylesheet to `assets/scss/styles.css`.

### Important note

The HTML pages load:

```html
assets/scss/styles.css
```

That compiled file is the runtime stylesheet the app uses in the browser.

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
- Per-week data saved in browser storage

## Screenshots

No screenshots are committed yet.

Recommended filenames if you want to add them later:
- `assets/img/homepage.png`
- `assets/img/planner.png`
- `assets/img/workout.png`
- `assets/img/meals.png`

Once those files exist, add them here with standard Markdown image links.

## Deployment

This app can be deployed as a static website.

### GitHub Pages

This repository now includes a GitHub Actions workflow for Pages deployment:

- Workflow file: `.github/workflows/deploy-pages.yml`
- Trigger: push to `main`
- Expected URL: `https://jonathandevoypcd.github.io/ar-fit/`

To finish enabling Pages in GitHub:

1. Open `Settings > Pages`.
2. Set `Source` to `GitHub Actions`.
3. Push to `main` or manually run the workflow.

Notes:
- The app uses relative links, which is compatible with project-site deployment.
- If the repository remains private, GitHub Pages availability depends on your GitHub plan. If Pages is not available on the private repo, use Netlify or make the repo public.

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

## Planned Improvements

- Export/import planner data
- Template weeks and copy-last-week flows
- Planner history and score trends
- Better mobile install experience
- Replacing external CDN assets with local bundled assets
- Custom in-app confirm dialogs instead of browser confirms

## Repository Notes

- Git is initialized on the `main` branch.
- GitHub Pages workflow is included.
- A restrictive `LICENSE` file is included for personal-project protection.
- The repo remote is:

```text
https://github.com/JonathanDevoyPCD/ar-fit
```
