/**
 * Where the game runs and what that place offers: on Poki its SDK (gameplay events, ads, counters via measure()),
 * on our own site (Vercel) Vercel Web Analytics. Everything else in the game only calls the functions below.
 *  - track(): a counter (tutorial steps, purchases, areas, boosters) so we can see where players stop
 *  - rewarded(): a video ad the player chose to watch for a booster; true = give the reward
 *  - playing(): gameplay running or paused (album, wardrobe, cards), as the Poki SDK wants to know
 * A short log of the counters also stays on the device: `?stats` shows it, so a tester can send a screenshot.
 * Poki rules (developers.poki.com, read 21.10.2026): no third-party ads or tracking, no in-app purchases,
 * no ad timers or cooldowns of our own, rewards only after a real ad, the game must work with an ad blocker.
 */

import { setLanguage } from './i18n';

type Poki = {
  init(): Promise<void>;
  gameLoadingFinished(): void;
  gameplayStart(): void;
  gameplayStop(): void;
  commercialBreak(onStart?: () => void): Promise<void>;
  rewardedBreak(onStart?: () => void): Promise<boolean>;
  measure(category: string, what: string, action: string): void;
  getLanguage?(): string;
};
declare global { interface Window { PokiSDK?: Poki; va?: (...a: unknown[]) => void; vaq?: unknown[][] } }

const params = new URLSearchParams(location.search);
/** the game is on Poki: the Poki build (npm run build:poki), their game servers (poki in the name), or ?poki to try the SDK anywhere */
export const onPoki = import.meta.env.MODE === 'poki' || /poki/i.test(location.hostname) || params.has('poki');
const onVercel = location.hostname.endsWith('.vercel.app');

let sdk: Poki | null = null;
let ready: Promise<void> = Promise.resolve();

function loadScript(src: string) {
  return new Promise<void>((ok, fail) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => ok();
    s.onerror = () => fail();
    document.head.appendChild(s);
  });
}

/** call first thing: loads the SDK on Poki (the game goes on if it fails, e.g. with an ad blocker) */
export function initPlatform() {
  if (onPoki) {
    ready = loadScript('https://game-cdn.poki.com/scripts/v2/poki-sdk.js')
      .then(() => window.PokiSDK?.init())
      .then(() => { sdk = window.PokiSDK ?? null; }, () => { sdk = window.PokiSDK ?? null; })
      // the portal's language (lower-case base code, e.g. pt for pt-BR) decides the game's, see i18n.ts
      .then(() => { try { setLanguage(sdk?.getLanguage?.()); } catch { /* keep the browser's */ } });
  } else if (onVercel) {
    // Vercel Web Analytics, same address as the game (no outside servers); visits always, events on paid plans only
    window.va = window.va || ((...a: unknown[]) => { (window.vaq = window.vaq || []).push(a); });
    void loadScript('/_vercel/insights/script.js').catch(() => { /* off in the Vercel dashboard */ });
  }
  if (params.has('stats')) showStats();
}

let markLoaded: () => void = () => {};
/** resolved by loadingFinished(): gameplayStart/Stop never go to the SDK before gameLoadingFinished */
const loaded = new Promise<void>((ok) => { markLoaded = ok; });
/** the SDK is loaded (or failed to): the game waits for it before it builds anything with words */
export const platformReady = () => ready;

export function loadingFinished() { void ready.then(() => { sdk?.gameLoadingFinished(); markLoaded(); }); }

/** gameplay running (true) or paused by a menu or card; repeated calls with the same value are dropped (Poki asks for that) */
let isPlaying = false;
let started = false;
/** what was actually sent to the SDK last (null = nothing yet), so the same event never goes twice in a row */
let sent: boolean | null = null;
export function playing(on: boolean) {
  if (on && !started) return; // the first start waits for the player's first touch (see firstInput)
  if (on === isPlaying) return;
  isPlaying = on;
  void Promise.all([ready, loaded]).then(() => {
    if (!sdk || on === (sent ?? false)) return;
    sent = on;
    if (on) sdk.gameplayStart(); else sdk.gameplayStop();
  });
}
export function firstInput() {
  if (started) return;
  started = true;
  playing(true);
}

/** a natural break (a menu closed): Poki may show an ad here; the sound is quiet meanwhile */
export function pauseBreak(hush: (on: boolean) => void): Promise<void> {
  if (!sdk) { playing(true); return Promise.resolve(); }
  playing(false);
  return sdk.commercialBreak(() => hush(true)).catch(() => {}).then(() => { hush(false); playing(true); });
}

/** ?ads pretends there are ads (a second of quiet stands in for the video), to try the boosters off Poki */
const fakeAds = params.has('ads');

/** can a rewarded ad be offered at all: on Poki once the SDK is there (not with an ad blocker); our own site has no
 *  ads, so there the boosters and the chest choice stay hidden and the game is as before */
export const adsOn = () => !!sdk || fakeAds;

/** a rewarded video for a booster: resolves true when the reward is earned */
export async function rewarded(hush: (on: boolean) => void): Promise<boolean> {
  await ready;
  if (!sdk && fakeAds) { hush(true); await new Promise((ok) => window.setTimeout(ok, 1000)); hush(false); return true; }
  if (!sdk) return false;
  const was = isPlaying;
  playing(false);
  let ok = false;
  try { ok = await sdk.rewardedBreak(() => hush(true)); } catch { ok = false; }
  hush(false);
  if (was) playing(true);
  return ok;
}

// ------------------------------------------------------------ counters

const LOG_KEY = 'fable-shelter-stats';
type Log = { first: number; days: string[]; sessions: number; events: [number, string][] };
let log: Log = { first: Date.now(), days: [], sessions: 0, events: [] };
try { log = { ...log, ...JSON.parse(localStorage.getItem(LOG_KEY) ?? '{}') }; } catch { /* storage blocked */ }
const today = () => new Date().toISOString().slice(0, 10);
const keep = () => { try { localStorage.setItem(LOG_KEY, JSON.stringify(log)); } catch { /* ignore */ } };

/** one counter: category, what, action (Poki's measure() shape; no '/' or '^' in them) */
export function track(category: string, what: string, action: string) {
  const name = `${category}:${what}:${action}`;
  log.events.push([Math.round((Date.now() - log.first) / 60000), name]);
  if (log.events.length > 120) log.events.splice(0, log.events.length - 120);
  keep();
  void ready.then(() => {
    if (sdk) sdk.measure(category, what, action);
    else if (onVercel) window.va?.('event', { name, data: { what, action } });
  });
}

/** a visit: counts sessions and the days played (day 1, day 2... tells who comes back) */
export function sessionStart() {
  log.sessions++;
  const d = today();
  if (!log.days.includes(d)) log.days.push(d);
  if (log.days.length > 60) log.days.shift();
  keep();
  track('session', `day${log.days.length}`, 'start');
}

function showStats() {
  const box = document.createElement('pre');
  box.style.cssText = 'position:fixed;left:8px;right:8px;bottom:8px;max-height:45%;overflow:auto;z-index:99;margin:0;padding:8px;border-radius:10px;background:rgba(0,0,0,.75);color:#fff;font:11px monospace;white-space:pre-wrap';
  const draw = () => {
    box.textContent = `sesje ${log.sessions}, dni ${log.days.length} (${log.days.join(', ')})\n` +
      log.events.slice(-40).map(([m, n]) => `${m} min  ${n}`).join('\n');
  };
  draw();
  window.setInterval(draw, 2000);
  if (document.body) document.body.appendChild(box);
  else document.addEventListener('DOMContentLoaded', () => document.body.appendChild(box));
}
