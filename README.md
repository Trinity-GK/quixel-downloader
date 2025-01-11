# Quixel Downloader

This is a project to let you download all your Quixel assets

## Setup

You will need NodeJS

https://nodejs.org/en/download

You can download the whole project and extract the zip into a folder

Open a terminal in the folder (shift + right click in Windows)

### Make sure to install dependencies:

```bash
# npm
npm install
```

After installing

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev
```

## Guide

- Login to Quixel
- Press F12 so you can see the developer console
- visit https://quixel.com/megascans/purchased
- In the **Network** tab click on **Fetch/XHR**
- Then click one of the following in the list: eligible, status, self, acquired
- In the Headers section you will see **Authorization:**
- Copy the part after Bearer (usually starts on the next line), it's a very large string
- Paste that string into the form on the starting page

