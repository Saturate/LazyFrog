#!/bin/bash

# Simple 16x16 orange PNG (base64)
echo "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAJ0lEQVQ4T2P8////fwYKACOlhjEMGjCI0TDOSD6YjAwAAP//AwBHQAX8pF/VdwAAAABJRU5ErkJggg==" | base64 -d > icon16.png

# Copy for other sizes (temporary)
cp icon16.png icon32.png
cp icon16.png icon48.png
cp icon16.png icon128.png

echo "Created placeholder icons"
ls -lh *.png
