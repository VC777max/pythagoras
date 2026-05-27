import { chromium } from 'playwright';

// Location mapping based on Peakz Padel clubs
// Includes courtTypeIds when specific courts are queried.
export const SCRAPER_LOCATIONS = [
  // Groningen
  { name: 'Atoomweg', city: 'Groningen', indoor: true, courtTypeIds: '13' },
  { name: 'Euroborg', city: 'Groningen', indoor: true, courtTypeIds: '5' },
  { name: 'Suikerterrein', city: 'Groningen', indoor: false, courtTypeIds: '' },
  // Amsterdam
  { name: 'Kauwgomballenkwartier', city: 'Amsterdam', indoor: false, courtTypeIds: '' },
  { name: 'Olympiaplein', city: 'Amsterdam', indoor: false, courtTypeIds: '' },
  { name: 'Sloterdijk', city: 'Amsterdam', indoor: false, courtTypeIds: '' },
  { name: 'Zuidoost', city: 'Amsterdam', indoor: true, courtTypeIds: '' },
  // Utrecht
  { name: 'Vechtsebanen', city: 'Utrecht', indoor: true, courtTypeIds: '' },
  { name: 'Zeehaenkade', city: 'Utrecht', indoor: true, courtTypeIds: '' },
  // Eindhoven
  { name: 'Beursgebouw', city: 'Eindhoven', indoor: true, courtTypeIds: '' },
  { name: 'High Tech Campus', city: 'Eindhoven', indoor: false, courtTypeIds: '' },
  { name: 'Vijfkamplaan', city: 'Eindhoven', indoor: true, courtTypeIds: '' },
  // Apeldoorn
  { name: 'De Maten', city: 'Apeldoorn', indoor: true, courtTypeIds: '' },
  { name: 'Malkenschoten', city: 'Apeldoorn', indoor: false, courtTypeIds: '' },
  // Assen
  { name: 'Assen', city: 'Assen', indoor: true, courtTypeIds: '' },
  // Haarlem
  { name: 'Haarlem', city: 'Haarlem', indoor: true, courtTypeIds: '' },
  // Heemskerk
  { name: 'Heemskerk', city: 'Heemskerk', indoor: true, courtTypeIds: '' },
  // Heerlen
  { name: 'Heerlen', city: 'Heerlen', indoor: true, courtTypeIds: '' },
  // Nijmegen
  { name: 'Nijmegen', city: 'Nijmegen', indoor: true, courtTypeIds: '' },
  // Oisterwijk
  { name: 'Oisterwijk', city: 'Oisterwijk', indoor: true, courtTypeIds: '' },
  // Papendrecht
  { name: 'Papendrecht', city: 'Papendrecht', indoor: true, courtTypeIds: '' },
  // Sittard
  { name: 'Sittard', city: 'Sittard', indoor: true, courtTypeIds: '' },
  // Zutphen
  { name: 'Zutphen', city: 'Zutphen', indoor: true, courtTypeIds: '' },
  // Zwolle
  { name: 'Zwolle', city: 'Zwolle', indoor: true, courtTypeIds: '' }
];

// In-memory cache for scrape availability results
// Key format: `${dateStr}_${locationName}_${playingTime}_${courtType}`
const scrapeCache = {};
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// Concurrency queue to prevent running multiple playwright instances simultaneously
let scrapeQueue = Promise.resolve();

/**
 * Main scraper function, queued sequentially.
 */
export async function getAvailability(dateStr, locationName, playingTime = '90', courtType = 'double') {
  const loc = SCRAPER_LOCATIONS.find(
    l => l.name.toLowerCase() === locationName.toLowerCase()
  );
  if (!loc) {
    throw new Error(`Location '${locationName}' is not defined in scraper locations.`);
  }

  const cacheKey = `${dateStr}_${loc.name}_${playingTime}_${courtType}`;
  const cached = scrapeCache[cacheKey];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`[SCRAPER] Returning cached results for ${cacheKey}`);
    return cached.data;
  }

  // Queue tasks sequentially
  return new Promise((resolve, reject) => {
    scrapeQueue = scrapeQueue
      .then(async () => {
        try {
          const result = await runPlaywrightScrape(dateStr, loc, playingTime, courtType);
          scrapeCache[cacheKey] = {
            timestamp: Date.now(),
            data: result
          };
          resolve(result);
        } catch (err) {
          reject(err);
        }
      })
      .catch((err) => {
        console.error('[SCRAPER QUEUE ERROR]', err);
        reject(err);
      });
  });
}

/**
 * Internal Playwright scraper logic
 */
async function runPlaywrightScrape(dateStr, loc, playingTime, courtType) {
  console.log(`[SCRAPER] Scraping Peakz Padel: ${loc.name} on ${dateStr} for ${playingTime}min (${courtType})`);
  
  // Launch Playwright headless Chromium
  const launchOptions = {
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
  };

  // If in Linux/Docker environment, let Playwright use its default or specify paths if needed.
  // In typical setups npx playwright installs the browser globally, so omitting executablePath
  // is highly portable between local and Docker environments.
  const browser = await chromium.launch(launchOptions);
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 }
  });
  
  const page = await context.newPage();

  try {
    // Navigate to Peakz reservation page
    let url = `https://www.peakzpadel.nl/reserveren/court-booking/reservation?daypart=---&date=${encodeURIComponent(dateStr)}&location=${encodeURIComponent(loc.name)}&playingTimes=${playingTime}`;
    
    // Append courtTypeIds if specified (either mapped for the club, or custom type mappings)
    if (loc.courtTypeIds) {
      url += `&courtTypeIds=${loc.courtTypeIds}`;
    }

    await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
    
    // Wait for the court booking container or page contents to fully load
    await page.waitForTimeout(2500);

    // Scrape button timeslots and prices
    const slots = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      const results = [];
      for (const btn of buttons) {
        const text = btn.textContent.trim();
        // Match times starting with e.g. "17:00"
        if (text.match(/^\d{2}:\d{2}/)) {
          const priceMatch = text.match(/€\s*([\d,]+)/);
          results.push({
            time: text.split(' ')[0],
            price: priceMatch ? `€${priceMatch[1]}` : null,
            available: !btn.disabled
          });
        }
      }
      return results;
    });

    console.log(`[SCRAPER] Successfully scraped ${slots.length} slots for ${loc.name} (${slots.filter(s => s.available).length} available)`);

    return {
      date: dateStr,
      location: loc.name,
      indoor: loc.indoor,
      slots
    };
  } finally {
    await browser.close();
  }
}

/**
 * Checks availability of a specific slot
 */
export async function checkSlotAvailable(dateStr, locationName, timeStr, playingTime = '90', courtType = 'double') {
  try {
    const data = await getAvailability(dateStr, locationName, playingTime, courtType);
    if (!data || !data.slots) return false;
    return data.slots.some(s => s.time === timeStr && s.available);
  } catch (err) {
    console.error(`[SCRAPER] Error checking slot availability for ${locationName} on ${dateStr} ${timeStr}:`, err);
    return false;
  }
}
