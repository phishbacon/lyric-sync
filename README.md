# Lyric-Sync

A free and open source self hosted solution for grabbing lyrics for your Plex Music Libraries.

<div align="center">
  <h2>Powered By</h2>
  <a href="https://svelte.dev/">
    <img src="https://github.com/sveltejs/branding/blob/master/svelte-horizontal.png?raw=true" width="300"/>
  </a>
</div>
<div align="center">
  <a href="https://www.skeleton.dev/">
    <img src="https://user-images.githubusercontent.com/1509726/199282306-7454adcb-b765-4618-8438-67655a7dee47.png" width="300"/>
  </a>
</div>
<div align="center">
  <a href="https://orm.drizzle.team/">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/drizzle-team/drizzle-orm/refs/heads/main/misc/readme/logo-github-sq-dark.svg">
      <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/drizzle-team/drizzle-orm/refs/heads/main/misc/readme/logo-github-sq-light.svg">
      <img src="https://raw.githubusercontent.com/drizzle-team/drizzle-orm/refs/heads/main/misc/readme/logo-github-sq-light.svg">
    </picture>
  </a>
</div>

## Installation

Will fill this out later

## Contributing

Lyric-Sync is an open source project, it is made possible with contributors like you.

The best way to start contributing to Lyric-Sync is by having access to an instance of Plex. This way, you can populate the database with real data and get real responses back from Plex.

```bash
# clone this repo
git clone git@github.com:phishbacon/lyric-sync.git

# cd into the project directory
cd lyric-sync

# install dependencies
pnpm install

# copy the .env.example file and rename it to .env
cp .env.example .env

# run db migrations
pnpm db:migrate

# start the project
pnpm dev
```

If you don't have access to a Plex instance, have no fear! You can still contribute. Run the project in _No Plex Mode_ by replacing the last step above with `pnpm dev:no_plex`. This will start the project, ignoring the .env file, and instead use a database with dummy data and circumvent any connections to Plex. This mode is primarily for developing the UI/UX experience of Lyric-Sync.
