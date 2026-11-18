# Design for AI

A tiny touch-first design playground. No account, build step, external libraries, analytics or network services.

## Use

- The canvas starts as mobile portrait on a phone and laptop landscape on a laptop. Change it from the size menu at the bottom.
- Pinch with two fingers to zoom and drag with two fingers to pan. On a laptop use the scroll wheel or trackpad, with Ctrl or Cmd to zoom. The percentage button fits the canvas to the screen.
- Touch empty canvas and drag to draw a box.
- Drag a box to move it. Pull a corner handle to resize.
- Tap a box for colours and shapes. They appear in a strip below the canvas, never over it. Double-tap it, or tap the text button, to write inside.
- More options contains text size, text colour, duplicate and delete.
- Undo, redo and the ? help button live in the bottom dock. Ctrl/Cmd+Z works on a keyboard.

The heading and instructions live under the ? button so the canvas gets the screen.

Editor controls use a translucent glass-inspired style. Canvas colours remain solid and independent.

This is a demo: designs live only in the current tab and reset on reload. Export, storage, images and collaboration are intentionally out of scope.

## Development

Serve this folder with any static web server, for example `python3 -m http.server 8000`. Open localhost:8000.

- `index.html`: semantic page and controls
- `styles.css`: responsive layout and glass styling
- `app.js`: interactions, state and history
- `geometry.js`: shape and bounds helpers

Pointer Events support mouse, pen and touch through one interaction path. The stage disables native touch scrolling and page zoom so one finger draws or moves and two fingers zoom and pan.

