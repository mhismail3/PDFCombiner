# PDF Combiner

A modern web application for combining PDF files directly in your browser using client-side processing.

## Features

- Drag-and-drop interface for uploading PDF files
- Client-side PDF processing with PDF.js and PDF-lib.js
- Preview and thumbnail generation for PDF pages
- Reorder and select specific pages for the final combined document
- Dark mode support
- Responsive design
- No server-side processing required

## Tech Stack

- React
- TypeScript
- Redux Toolkit for state management
- TailwindCSS for styling
- PDF.js for PDF rendering and thumbnails
- PDF-lib.js for PDF manipulation

## Project Structure

This project uses TaskMaster for task management:

- `/src` - Application source code
- `/public` - Public assets
- `/tasks` - TaskMaster task files
- `/scripts` - TaskMaster scripts and PRD

## Development

### Installation

```bash
npm install
```

### Running the development server

```bash
npm start
```

### Building for production

```bash
npm run build
```

### Linting and formatting

```bash
npm run lint
npm run format
```

## Task Management

This project uses TaskMaster for task tracking. To work with tasks:

```bash
# List all tasks
task-master list

# Find the next task to work on
task-master next

# Mark a task as done
task-master set-status --id=<task_id> --status=done
```

See README-task-master.md for more information about TaskMaster.

## License

MIT 