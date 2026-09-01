# Food Poker

Shuffle the meal deck, deal a week of dinners.

A dirt-simple, touch-first meal planner. Your recipes live as cards — big name on
the front, tap to flip for the ingredients you probably need to buy, a health
score, and your star rating. Two dials shape the deal, a Date Night toggle adds
one big interactive meal, and the shopping list builds itself from whatever you
were dealt.

No accounts, no server, no build step. Everything is stored in your browser.

## Using it

**Deal** — set how many meals you want, slide the two dials, hit *Deal the week*.

- **Vibe** slides from *simple & quick* toward *fun & unique*. It aims the deal at
  meals of that effort level.
- **Dial** slides from *healthy* toward *indulgent*. It sets a ceiling: at the
  healthy end the rich stuff is simply not in play, and sliding right lets it
  back in. Pushed all the way right, the virtuous cards fade a little but never
  disappear.
- **Date Night** adds one extra card on top of your count, drawn from the meals
  flagged as date-night material.

Each dealt card has three buttons:

| | |
|---|---|
| **Lock** | keep this one through the next deal |
| **Swap** | redraw just this card |
| **Drop** | remove it from the week |

Recently dealt meals are down-weighted for a while, so weeks don't rhyme.

**Deck** — the whole bank of meals. Tap any card to edit its effort, indulgence,
health score, stars, notes, and ingredients, or use **+ Add meal** to add one.

**List** — every notable ingredient across the week's hand, deduped, with the
meals that need it. Check things off as you shop; *Copy list* puts whatever's
left on your clipboard.

The **⋮** menu exports a JSON backup (and copies it to your clipboard), imports
one, or resets the deck to the starting meals.

## Running it locally

There is no build step. Open `index.html` in a browser, or serve the folder:

```bash
npx serve .
```

## Deploying to Vercel (free)

Push this repo to GitHub, then either:

**From the dashboard** — go to [vercel.com/new](https://vercel.com/new), import
the repo, and deploy. Vercel detects a static site; leave the framework preset as
*Other* and both build/output settings empty. Every push to the branch redeploys.

**From the terminal** — [Vercel CLI](https://vercel.com/docs/cli):

```bash
npm i -g vercel
vercel          # preview deploy
vercel --prod   # production
```

It also works unchanged on [Netlify](https://app.netlify.com/start),
[Cloudflare Pages](https://pages.cloudflare.com/), and
[GitHub Pages](https://pages.github.com/) — it's just static files.

On a phone, use your browser's *Add to Home Screen* to get it as a standalone
app icon.

## Files

```
index.html            markup for all three tabs
styles.css            the whole theme
data.js               the starting deck of meals
app.js                state, the deal algorithm, rendering
manifest.webmanifest  add-to-home-screen metadata
vercel.json           static hosting config
tools/bundle.js       optional: inline everything into dist/preview.html
```

## A note on your data

Everything lives in this browser's `localStorage` under `foodpoker.v1`. It is not
synced anywhere. Clearing site data wipes it, and a different phone is a
different deck — export a backup from the **⋮** menu before you switch devices.
