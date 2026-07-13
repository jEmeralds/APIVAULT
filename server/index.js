/**
 * apivault-js — Official JavaScript SDK for APIvault
 * One vault key for every API
 * https://apivault.uk/docs
 */

const DEFAULT_BASE = 'https://api.apivault.uk'

class APIvaultError extends Error {
  constructor(message, status, data) {
    super(message)
    this.name = 'APIvaultError'
    this.status = status
    this.data = data
  }
}

class APIvault {
  /**
   * @param {string} vaultKey - Your vault key (sk-vault-...)
   * @param {object} options
   * @param {string} [options.baseUrl] - Override base URL (default: https://api.apivault.uk)
   * @param {number} [options.timeout] - Request timeout in ms (default: 30000)
   */
  constructor(vaultKey, options = {}) {
    if (!vaultKey) throw new Error('APIvault: vault key is required')
    this._key = vaultKey.startsWith('sk-vault-') ? vaultKey.slice(9) : vaultKey
    this._base = (options.baseUrl || DEFAULT_BASE).replace(/\/$/, '')
    this._timeout = options.timeout || 30000
  }

  // ─── Core request method ─────────────────────────────────────────────────

  async _request(method, path, { params, body } = {}) {
    const url = new URL(`${this._base}${path}`)
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) url.searchParams.set(k, v)
      })
    }

    const headers = {
      'x-vault-key': this._key,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this._timeout)

    try {
      const res = await fetch(url.toString(), {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new APIvaultError(
          data.error || `HTTP ${res.status}`,
          res.status,
          data
        )
      }

      return data
    } catch (err) {
      if (err.name === 'AbortError') throw new APIvaultError('Request timed out', 408)
      throw err
    } finally {
      clearTimeout(timer)
    }
  }

  get(path, params)       { return this._request('GET',    path, { params }) }
  post(path, body)        { return this._request('POST',   path, { body }) }
  put(path, body)         { return this._request('PUT',    path, { body }) }
  delete(path)            { return this._request('DELETE', path) }

  // ─── AI ──────────────────────────────────────────────────────────────────

  get claude() {
    return {
      /**
       * Send a message to Claude
       * @param {string|object[]} messages - String message or array of message objects
       * @param {object} options
       * @param {string} [options.model] - Model ID (default: claude-haiku-4-5-20251001)
       * @param {number} [options.maxTokens] - Max tokens (default: 1024)
       * @param {string} [options.system] - System prompt
       */
      chat: (messages, options = {}) => {
        const msgs = typeof messages === 'string'
          ? [{ role: 'user', content: messages }]
          : messages

        const body = {
          model:      options.model     || 'claude-haiku-4-5-20251001',
          max_tokens: options.maxTokens || 1024,
          messages:   msgs,
          ...(options.system ? { system: options.system } : {}),
        }

        return this._request('POST', '/proxy/claude/messages', { body })
          .then(res => ({
            text:  res.content?.[0]?.text || '',
            model: res.model,
            usage: res.usage,
            raw:   res,
          }))
      },
    }
  }

  // ─── NEWS ─────────────────────────────────────────────────────────────────

  get news() {
    return {
      /** Top headlines by country or category */
      headlines: (params = {}) =>
        this.get('/proxy/newsapi/top-headlines', params),

      /** Search all articles */
      search: (query, params = {}) =>
        this.get('/proxy/newsapi/everything', { q: query, ...params }),
    }
  }

  // ─── WEATHER ──────────────────────────────────────────────────────────────

  get weather() {
    return {
      /** Current weather for a city */
      current: (city, units = 'metric') =>
        this.get('/proxy/openweather/weather', { q: city, units }),

      /** 5-day forecast */
      forecast: (city, units = 'metric') =>
        this.get('/proxy/openweather/forecast', { q: city, units }),

      /** Weather by coordinates (no key needed) */
      byCoords: (lat, lon) =>
        this.get('/proxy/openmeteo/forecast', {
          latitude: lat, longitude: lon, current_weather: true
        }),
    }
  }

  // ─── FOREX & CRYPTO ───────────────────────────────────────────────────────

  get forex() {
    return {
      /** Live exchange rates */
      rates: (base = 'USD', to = null) => {
        const params = to ? { from: base, to } : { from: base }
        return this.get('/proxy/frankfurter/latest', params)
      },

      /** Historical rates */
      historical: (date, base = 'USD') =>
        this.get(`/proxy/frankfurter/${date}`, { from: base }),
    }
  }

  get crypto() {
    return {
      /** Top coins by market cap */
      markets: (currency = 'usd', limit = 10) =>
        this.get('/proxy/coingecko/coins/markets', {
          vs_currency: currency, per_page: limit, page: 1
        }),

      /** Simple price lookup */
      price: (ids, currency = 'usd') =>
        this.get('/proxy/coingecko/simple/price', {
          ids: Array.isArray(ids) ? ids.join(',') : ids,
          vs_currencies: currency
        }),
    }
  }

  // ─── COUNTRIES & GEO ──────────────────────────────────────────────────────

  get geo() {
    return {
      /** Country data by name */
      country: (name) =>
        this.get(`/proxy/restcountries/name/${encodeURIComponent(name)}`),

      /** Countries by region */
      region: (region) =>
        this.get(`/proxy/restcountries/region/${region}`),

      /** Geocode an address */
      geocode: (address) =>
        this.get('/proxy/nominatim/search', { q: address, format: 'json', limit: 1 }),

      /** Reverse geocode coordinates */
      reverseGeocode: (lat, lon) =>
        this.get('/proxy/nominatim/reverse', { lat, lon, format: 'json' }),
    }
  }

  // ─── DEV TOOLS ────────────────────────────────────────────────────────────

  get dev() {
    return {
      /** Word definition */
      define: (word) =>
        this.get(`/proxy/dictionary/entries/en/${word}`),

      /** GitHub user profile */
      githubUser: (username) =>
        this.get(`/proxy/github/users/${username}`),

      /** GitHub repository */
      githubRepo: (owner, repo) =>
        this.get(`/proxy/github/repos/${owner}/${repo}`),

      /** Random joke */
      joke: (category = 'Programming') =>
        this.get(`/proxy/jokeapi/joke/${category}`, { type: 'single' }),

      /** Random advice */
      advice: () =>
        this.get('/proxy/adviceslip/advice'),

      /** Fake person data */
      fakePerson: (count = 1) =>
        this.get('/proxy/fakerapi/persons', { _quantity: count }),
    }
  }

  // ─── DATA ─────────────────────────────────────────────────────────────────

  get data() {
    return {
      /** Random Pokémon */
      pokemon: (name) =>
        this.get(`/proxy/pokemon/${name || 'pikachu'}`),

      /** SpaceX latest launch */
      latestLaunch: () =>
        this.get('/proxy/spacex/launches/latest'),

      /** NASA astronomy picture */
      apod: () =>
        this.get('/proxy/nasa/planetary/apod', { count: 1 }),

      /** IP geolocation */
      ipInfo: (ip = '') =>
        this.get(`/proxy/ipapi/${ip}/json`),

      /** iTunes search */
      itunes: (term, media = 'music') =>
        this.get('/proxy/itunesearch/search', { term, media, limit: 10 }),
    }
  }

  // ─── HEALTH ───────────────────────────────────────────────────────────────

  get health() {
    return {
      /** FDA drug label search */
      drugLabel: (search, limit = 5) =>
        this.get('/proxy/openfda/drug/label.json', { search, limit }),
    }
  }
}

export default APIvault
export { APIvaultError }
