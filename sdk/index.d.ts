/**
 * apivault-js — TypeScript definitions
 */

export interface APIvaultOptions {
  baseUrl?: string
  timeout?: number
}

export interface ClaudeMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ClaudeChatOptions {
  model?: string
  maxTokens?: number
  system?: string
}

export interface ClaudeResponse {
  text: string
  model: string
  usage: { input_tokens: number; output_tokens: number }
  raw: object
}

export declare class APIvaultError extends Error {
  status: number
  data: object
}

export declare class APIvault {
  constructor(vaultKey: string, options?: APIvaultOptions)

  get(path: string, params?: Record<string, any>): Promise<any>
  post(path: string, body?: object): Promise<any>
  put(path: string, body?: object): Promise<any>
  delete(path: string): Promise<any>

  claude: {
    chat(messages: string | ClaudeMessage[], options?: ClaudeChatOptions): Promise<ClaudeResponse>
  }

  news: {
    headlines(params?: Record<string, any>): Promise<any>
    search(query: string, params?: Record<string, any>): Promise<any>
  }

  weather: {
    current(city: string, units?: string): Promise<any>
    forecast(city: string, units?: string): Promise<any>
    byCoords(lat: number, lon: number): Promise<any>
  }

  forex: {
    rates(base?: string, to?: string): Promise<any>
    historical(date: string, base?: string): Promise<any>
  }

  crypto: {
    markets(currency?: string, limit?: number): Promise<any>
    price(ids: string | string[], currency?: string): Promise<any>
  }

  geo: {
    country(name: string): Promise<any>
    region(region: string): Promise<any>
    geocode(address: string): Promise<any>
    reverseGeocode(lat: number, lon: number): Promise<any>
  }

  dev: {
    define(word: string): Promise<any>
    githubUser(username: string): Promise<any>
    githubRepo(owner: string, repo: string): Promise<any>
    joke(category?: string): Promise<any>
    advice(): Promise<any>
    fakePerson(count?: number): Promise<any>
  }

  data: {
    pokemon(name?: string): Promise<any>
    latestLaunch(): Promise<any>
    apod(): Promise<any>
    ipInfo(ip?: string): Promise<any>
    itunes(term: string, media?: string): Promise<any>
  }

  health: {
    drugLabel(search: string, limit?: number): Promise<any>
  }
}

export default APIvault
