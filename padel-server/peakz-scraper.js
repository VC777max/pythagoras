import { chromium } from 'playwright';

// Location mapping based on Peakz Padel clubs
// Maps specific court configuration types to their respective Peakz courtTypeIds
export const SCRAPER_LOCATIONS = [
  // Groningen
  { 
    name: 'Atoomweg', 
    city: 'Groningen', 
    indoor: true, 
    courtTypeIds: {
      double: '13',
      single: '10'
    }
  },
  { 
    name: 'Euroborg', 
    city: 'Groningen', 
    indoor: true, 
    courtTypeIds: {
      double: '5',
      single: '12' // typical single court id for Euroborg
    }
  },
  { 
    name: 'Suikerterrein', 
    city: 'Groningen', 
    indoor: false, 
    courtTypeIds: {
      double: '7', // typical outdoor double
      single: ''
    }
  },
  // Amsterdam
  { 
    name: 'Kauwgomballenkwartier', 
    city: 'Amsterdam', 
    indoor: false, 
    courtTypeIds: {
      double: '8',
      single: ''
    }
  },
  { 
    name: 'Olympiaplein', 
    city: 'Amsterdam', 
    indoor: false, 
    courtTypeIds: {
      double: '9',
      single: ''
    }
  },
  { 
    name: 'Sloterdijk', 
    city: 'Amsterdam', 
    indoor: false, 
    courtTypeIds: {
      double: '11',
      single: ''
    }
  },
  { 
    name: 'Zuidoost', 
    city: 'Amsterdam', 
    indoor: true, 
    courtTypeIds: {
      double: '13',
      single: '10'
    }
  },
  // Utrecht
  { 
    name: 'Vechtsebanen', 
    city: 'Utrecht', 
    indoor: true, 
    courtTypeIds: {
      double: '13',
      single: '10'
    }
  },
  { 
    name: 'Zeehaenkade', 
    city: 'Utrecht', 
    indoor: true, 
    courtTypeIds: {
      double: '13',
      single: '10'
    }
  },
  // Assen
  { 
    name: 'Assen', 
    slug: 'Fokkerstraat',
    city: 'Assen', 
    indoor: true, 
    courtTypeIds: {
      double: '13',
      single: ''
    }
  },
  // Zwolle
  { 
    name: 'Zwolle', 
    slug: 'Spoorzone',
    city: 'Zwolle', 
    indoor: true, 
    courtTypeIds: {
      double: '5',
      single: ''
    }
  },
  // Papendrecht
  { 
    name: 'Papendrecht', 
    slug: 'Oostpolder',
    city: 'Papendrecht', 
    indoor: true, 
    courtTypeIds: {
      double: '5',
      single: ''
    }
  }
];

// In-memory cache for scrape availability results
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
  
  // Fallback if location is not configured in list
  const activeLoc = loc || {
    name: locationName,
    indoor: true,
    courtTypeIds: { double: '13', single: '10' }
  };

  const cacheKey = `${dateStr}_${activeLoc.name}_${playingTime}_${courtType}`;
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
          const result = await runPlaywrightScrape(dateStr, activeLoc, playingTime, courtType);
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
async function runPlaywrightScrape(loc, dateStr, playingTime, courtType) {
  // To handle the argument order swap safely, align parameters:
  // If the first argument is a string (dateStr), let's re-map them
  let actualDateStr = dateStr;
  let actualLoc = loc;
  if (typeof loc === 'string') {
    actualDateStr = loc;
    actualLoc = dateStr;
  }

  console.log(`[SCRAPER] Scraping Peakz Padel: ${actualLoc.name} on ${actualDateStr} for ${playingTime}min (${courtType})`);
  
  // Launch Playwright headless Chromium
  const launchOptions = {
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
  };

  const browser = await chromium.launch(launchOptions);
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 }
  });
  
  const page = await context.newPage();

  try {
    // Navigate to Peakz reservation page
    let url = `https://www.peakzpadel.nl/reserveren/court-booking/reservation?daypart=---&date=${encodeURIComponent(actualDateStr)}&location=${encodeURIComponent(actualLoc.slug || actualLoc.name)}&playingTimes=${playingTime}`;
    
    // Resolve dynamic courtTypeIds
    const typeId = actualLoc.courtTypeIds ? actualLoc.courtTypeIds[courtType.toLowerCase()] : null;
    if (typeId) {
      url += `&courtTypeIds=${typeId}`;
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

    console.log(`[SCRAPER] Successfully scraped ${slots.length} slots for ${actualLoc.name} (${slots.filter(s => s.available).length} available)`);

    return {
      date: actualDateStr,
      location: actualLoc.name,
      indoor: actualLoc.indoor,
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
