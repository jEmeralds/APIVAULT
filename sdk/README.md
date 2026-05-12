# apivault-js

Official JavaScript SDK for [APIvault](https://apivault.uk) — one vault key for every API.

## Install

```bash
npm install apivault-js
```

## Quick start

```js
import APIvault from 'apivault-js'

const vault = new APIvault('sk-vault-YOUR_KEY')

// Claude AI
const response = await vault.claude.chat('Write a tagline for my app')
console.log(response.text)

// News headlines
const news = await vault.news.headlines({ country: 'ke', pageSize: 5 })
console.log(news.articles)

// Live exchange rates
const rates = await vault.forex.rates('USD', 'KES,EUR,GBP')
console.log(rates.rates.KES)

// Weather
const weather = await vault.weather.current('Nairobi')
console.log(weather.main.temp)

// Crypto prices
const prices = await vault.crypto.price(['bitcoin', 'ethereum'])
console.log(prices.bitcoin.usd)
```

## Get your vault key

1. Sign up at [apivault.uk](https://apivault.uk)
2. Get approved (usually within minutes)
3. Go to Billing → Reveal & copy your vault key
4. Free APIs work immediately — no credits needed

## All methods

### AI
```js
vault.claude.chat('Your message')
vault.claude.chat([{ role: 'user', content: 'Hello' }], { model: 'claude-haiku-4-5-20251001', maxTokens: 500 })
```

### News
```js
vault.news.headlines({ country: 'ke' })
vault.news.search('Kenya economy')
```

### Weather
```js
vault.weather.current('Nairobi')
vault.weather.forecast('Nairobi')
vault.weather.byCoords(1.28, 36.82)  // Free, no credits needed
```

### Forex & Crypto
```js
vault.forex.rates('USD', 'KES,EUR')
vault.forex.historical('2024-01-01', 'USD')
vault.crypto.markets('usd', 10)
vault.crypto.price('bitcoin,ethereum')
```

### Countries & Geo
```js
vault.geo.country('kenya')
vault.geo.region('africa')
vault.geo.geocode('Nairobi, Kenya')
vault.geo.reverseGeocode(1.28, 36.82)
```

### Dev tools
```js
vault.dev.define('serendipity')
vault.dev.githubUser('torvalds')
vault.dev.githubRepo('facebook', 'react')
vault.dev.joke()
vault.dev.advice()
vault.dev.fakePerson(5)
```

### Data
```js
vault.data.pokemon('pikachu')
vault.data.latestLaunch()
vault.data.apod()
vault.data.ipInfo('8.8.8.8')
vault.data.itunes('drake', 'music')
```

### Raw requests
```js
// Call any endpoint directly
vault.get('/proxy/jokeapi/joke/Programming', { type: 'single' })
vault.post('/proxy/claude/messages', { model: '...', messages: [...] })
```

## Error handling
```js
import APIvault, { APIvaultError } from 'apivault-js'

try {
  const data = await vault.claude.chat('Hello')
} catch (err) {
  if (err instanceof APIvaultError) {
    if (err.status === 402) console.log('Top up your credits at apivault.uk/app')
    if (err.status === 401) console.log('Invalid vault key')
    if (err.status === 429) console.log('Rate limited — slow down')
  }
}
```

## Pricing

Free APIs (weather by coords, exchange rates, countries, GitHub, jokes, etc.) use no credits.

Paid APIs are charged per call. Top up via M-Pesa or card at [apivault.uk](https://apivault.uk).

| API | Price/call |
|-----|-----------|
| Claude (Haiku) | $0.0048 |
| NewsAPI | $0.002 |
| OpenWeather | $0.001 |

Full pricing at [apivault.uk/docs](https://apivault.uk/docs).

## License

MIT
