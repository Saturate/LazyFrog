# LazyFrog Extension Website

A Next.js landing page for the LazyFrog Chrome extension.

## Features

- **Hero section** with download button
- **Features showcase** with 6 key features
- **Installation guide** with step-by-step instructions
- **Usage guide** with console commands
- **Responsive design** with dark mode support
- **Automatic extension downloads** from `/downloads` folder

## Tech Stack

- **Next.js 16** (App Router)
- **TypeScript**
- **Tailwind CSS 4.1.16**
- **pnpm** package manager
- **lucide-react** for icons

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm run dev

# Build for production
pnpm run build

# Start production server
pnpm start
```

The website will be available at http://localhost:3000

## Extension Integration

The extension build process automatically copies the latest zip files to `public/downloads/`:

```bash
# From the extension folder
cd ../extension
pnpm run package  # Builds and copies to website/public/downloads/
```

The `copy-to-website` script in `extension/package.json` handles this automatically.

## Deployment

The website can be deployed to:
- **Vercel** (recommended for Next.js)
- **Netlify**
- **GitHub Pages** (with static export)

For static export, add to `package.json`:

```json
"scripts": {
  "export": "next build && next export"
}
```

## File Structure

```
website/
├── app/
│   ├── page.tsx          # Main landing page
│   ├── layout.tsx        # Root layout
│   └── globals.css       # Global styles
├── public/
│   └── downloads/        # Extension zip files
│       ├── lazyfrog-0.9.1.zip
│       └── lazyfrog-0.9.2.zip
└── package.json
```

## Updating Extension Version

When releasing a new version:

1. Update version in `extension/package.json`
2. Run `pnpm run package` in the extension folder
3. Update the download link in `website/app/page.tsx` if needed
4. Rebuild the website

## Customization

- **Colors**: Emerald/green theme defined in Tailwind CSS
- **Logo**: Frog emoji (🐸) - can be replaced with an image
- **Features**: Edit the FeatureCard components in `page.tsx`
- **Installation steps**: Modify InstallStep components
