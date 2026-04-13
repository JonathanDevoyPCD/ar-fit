# AR-FIT

Adventure-racing inspired fitness web app with:
- a homepage summary
- a workout plan page
- a meal plan page
- a weekly planner with add/edit/delete
- completed/skipped tracking
- weekly score calculation

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

Recommended if you want a simple free host directly from this repo.

1. Push the repo to GitHub.
2. In GitHub, open `Settings > Pages`.
3. Under `Build and deployment`, set:
   - `Source`: `Deploy from a branch`
   - `Branch`: `main`
   - `Folder`: `/ (root)`
4. Save.
5. GitHub will publish the site on a `github.io` URL.

Notes:
- This project uses relative links, so it works best when served from the site root.
- If you later serve it from a subpath, test all links carefully.

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
- The repo remote is:

```text
https://github.com/JonathanDevoyPCD/ar-fit
```

