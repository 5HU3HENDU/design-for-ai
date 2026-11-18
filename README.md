# Design for AI

A tiny touch-first design playground. No account, build step, external libraries, analytics or network services.

## Use

- Choose mobile portrait, laptop landscape or square.
- Touch empty canvas and drag to draw a box.
- Drag a box to move it. Pull a corner handle to resize.
- Tap a box for colours and shapes. Double-tap it, or tap the text button, to write inside.
- More options contains text size, text colour, duplicate and delete.
- Undo and redo live in the bottom dock. Ctrl/Cmd+Z works on a keyboard.

Editor controls use a translucent glass-inspired style. Canvas colours remain solid and independent.

This is a demo: designs live only in the current tab and reset on reload. Export, storage, images and collaboration are intentionally out of scope.

## Development

Serve this folder with any static web server, for example `python3 -m http.server 8000`. Open localhost:8000.

- `index.html`: semantic page and controls
- `styles.css`: responsive layout and glass styling
- `app.js`: interactions, state and history
- `geometry.js`: shape and bounds helpers

Pointer Events support mouse, pen and touch through one interaction path. The canvas disables native touch scrolling only inside its bounds; normal browser interaction remains available outside it.
