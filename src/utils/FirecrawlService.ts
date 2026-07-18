interface HebrewName {
  name: string;
  meaning?: string;
  gender: 'male' | 'female' | 'unisex';
}

export class FirecrawlService {
  static async scrapeHebrewNames(url?: string): Promise<{ success: boolean; error?: string; data?: HebrewName[] }> {
    try {
      if (url) {
        console.log('Scraping Hebrew names with pagination from:', url);
        return await this.scrapeWithPagination(url);
      }
      
      console.log('Loading curated Hebrew names collection');
      
      // Comprehensive list of authentic Hebrew names
      const hebrewNames: HebrewName[] = [
        // Popular Hebrew male names
        { name: "אברהם", gender: "male", meaning: "אב המון גויים" },
        { name: "יצחק", gender: "male", meaning: "יצחק" },
        { name: "יעקב", gender: "male", meaning: "עקב" },
        { name: "דוד", gender: "male", meaning: "אהוב" },
        { name: "שלמה", gender: "male", meaning: "שלום" },
        { name: "משה", gender: "male", meaning: "נמשה מן המים" },
        { name: "אהרן", gender: "male", meaning: "הר גבוה" },
        { name: "יהושע", gender: "male", meaning: "ה' מושיע" },
        { name: "שמואל", gender: "male", meaning: "נשמע אל" },
        { name: "דניאל", gender: "male", meaning: "דן אלוהים" },
        { name: "מיכאל", gender: "male", meaning: "מי כמוך אל" },
        { name: "יונתן", gender: "male", meaning: "ה' נתן" },
        { name: "בנימין", gender: "male", meaning: "בן ימין" },
        { name: "נח", gender: "male", meaning: "נחת" },
        { name: "אדם", gender: "male", meaning: "אדמה" },
        { name: "יוסף", gender: "male", meaning: "יוסיף" },
        { name: "אליהו", gender: "male", meaning: "אלי הוא" },
        { name: "אלישע", gender: "male", meaning: "אל ישע" },
        { name: "עמוס", gender: "male", meaning: "נושא משא" },
        { name: "יואל", gender: "male", meaning: "יהו אל" },
        { name: "אור", gender: "male", meaning: "אור" },
        { name: "אורי", gender: "male", meaning: "אורי" },
        { name: "גיל", gender: "male", meaning: "שמחה" },
        { name: "טל", gender: "male", meaning: "טל" },
        { name: "יאיר", gender: "male", meaning: "יאיר" },
        { name: "עומר", gender: "male", meaning: "אלומה" },
        { name: "רון", gender: "male", meaning: "שיר שמחה" },
        { name: "שי", gender: "male", meaning: "מתנה" },
        { name: "תומר", gender: "male", meaning: "תמר" },
        { name: "יובל", gender: "male", meaning: "נחל" },
        { name: "גל", gender: "male", meaning: "גל" },
        { name: "אביב", gender: "male", meaning: "אביב" },
        { name: "אריאל", gender: "male", meaning: "אריה אל" },
        { name: "אבי", gender: "male", meaning: "אבי" },
        { name: "עלי", gender: "male", meaning: "עלי" },
        { name: "נדב", gender: "male", meaning: "נדיב" },
        { name: "איתי", gender: "male", meaning: "איתי" },
        { name: "עידו", gender: "male", meaning: "עיד" },
        { name: "רועי", gender: "male", meaning: "רועה" },
        { name: "עמית", gender: "male", meaning: "חבר" },
        { name: "תמיר", gender: "male", meaning: "נסתר" },
        { name: "אלון", gender: "male", meaning: "עץ אלון" },
        { name: "רם", gender: "male", meaning: "רם" },
        { name: "צביקה", gender: "male", meaning: "צבי" },
        { name: "איל", gender: "male", meaning: "איל" },
        { name: "שחר", gender: "male", meaning: "שחר" },
        { name: "רז", gender: "male", meaning: "סוד" },
        { name: "עידן", gender: "male", meaning: "עידן" },
        { name: "נועם", gender: "male", meaning: "נעים" },
        { name: "לב", gender: "male", meaning: "לב" },
        { name: "אלעד", gender: "male", meaning: "אל עד" },
        { name: "אמיר", gender: "male", meaning: "אמיר" },
        { name: "נתן", gender: "male", meaning: "נתן" },
        { name: "רפאל", gender: "male", meaning: "רפא אל" },
        { name: "גבריאל", gender: "male", meaning: "גבר אל" },
        { name: "אסף", gender: "male", meaning: "אוסף" },
        { name: "חי", gender: "male", meaning: "חי" },
        { name: "אלמוג", gender: "male", meaning: "אלמוג" },
        { name: "רוני", gender: "male", meaning: "רון" },
        { name: "אדיר", gender: "male", meaning: "אדיר" },
        { name: "בועז", gender: "male", meaning: "בו עוז" },
        { name: "נועה", gender: "male", meaning: "תנועה" },
        { name: "אליעזר", gender: "male", meaning: "אלי עזר" },
        { name: "יעקב", gender: "male", meaning: "עקב" },
        { name: "גדעון", gender: "male", meaning: "גדע" },
        { name: "יגאל", gender: "male", meaning: "יגאל" },
        { name: "שמשון", gender: "male", meaning: "שמש" },
        { name: "עזרא", gender: "male", meaning: "עוזר" },
        { name: "נחמיה", gender: "male", meaning: "נחם יה" },
        { name: "יהונתן", gender: "male", meaning: "יהו נתן" },
        { name: "מתתיהו", gender: "male", meaning: "מתת יה" },
        { name: "זכריה", gender: "male", meaning: "זכר יה" },
        { name: "ישעיהו", gender: "male", meaning: "ישע יה" },
        { name: "ירמיהו", gender: "male", meaning: "ירם יה" },
        { name: "יחזקאל", gender: "male", meaning: "יחזק אל" },

        // Popular Hebrew female names
        { name: "שרה", gender: "female", meaning: "שרה" },
        { name: "רבקה", gender: "female", meaning: "רבקה" },
        { name: "רחל", gender: "female", meaning: "רחל" },
        { name: "לאה", gender: "female", meaning: "לאה" },
        { name: "מרים", gender: "female", meaning: "מרים" },
        { name: "דבורה", gender: "female", meaning: "דבורה" },
        { name: "חנה", gender: "female", meaning: "חן" },
        { name: "רות", gender: "female", meaning: "חברה" },
        { name: "אסתר", gender: "female", meaning: "כוכב" },
        { name: "אביגיל", gender: "female", meaning: "שמחת האב" },
        { name: "נעמי", gender: "female", meaning: "נעימה" },
        { name: "יהודית", gender: "female", meaning: "יהודית" },
        { name: "דינה", gender: "female", meaning: "דינה" },
        { name: "טליה", gender: "female", meaning: "טל ה'" },
        { name: "נועה", gender: "female", meaning: "תנועה" },
        { name: "מיכל", gender: "female", meaning: "מי כמוך אל" },
        { name: "אורלי", gender: "female", meaning: "אור לי" },
        { name: "שירה", gender: "female", meaning: "שיר" },
        { name: "תמר", gender: "female", meaning: "תמר" },
        { name: "יעל", gender: "female", meaning: "יעלה" },
        { name: "עדינה", gender: "female", meaning: "עדינה" },
        { name: "חן", gender: "female", meaning: "חן" },
        { name: "דנה", gender: "female", meaning: "דנה" },
        { name: "אפרת", gender: "female", meaning: "אפרת" },
        { name: "גלי", gender: "female", meaning: "הגל שלי" },
        { name: "הילה", gender: "female", meaning: "הילה" },
        { name: "איריס", gender: "female", meaning: "איריס" },
        { name: "כרן", gender: "female", meaning: "קרן" },
        { name: "ליאורה", gender: "female", meaning: "האור שלי" },
        { name: "נגה", gender: "female", meaning: "נוגה" },
        { name: "רוני", gender: "female", meaning: "השמחה שלי" },
        { name: "סיון", gender: "female", meaning: "סיון" },
        { name: "מיה", gender: "female", meaning: "מים" },
        { name: "עדי", gender: "female", meaning: "תכשיט" },
        { name: "רוי", gender: "female", meaning: "ראיה" },
        { name: "שני", gender: "female", meaning: "שני" },
        { name: "לירון", gender: "female", meaning: "לי רון" },
        { name: "מור", gender: "female", meaning: "מור" },
        { name: "איה", gender: "female", meaning: "איה" },
        { name: "שיר", gender: "female", meaning: "שיר" },
        { name: "רינת", gender: "female", meaning: "רנה" },
        { name: "ענבר", gender: "female", meaning: "ענבר" },
        { name: "אילנה", gender: "female", meaning: "עץ" },
        { name: "רעות", gender: "female", meaning: "ידידות" },
        { name: "ליאל", gender: "female", meaning: "לי אל" },
        { name: "שחר", gender: "female", meaning: "שחר" },
        { name: "זהר", gender: "female", meaning: "זוהר" },
        { name: "גיא", gender: "female", meaning: "גיא" },
        { name: "אמיר", gender: "female", meaning: "אמיר" },
        { name: "רומי", gender: "female", meaning: "גבוהה" },
        { name: "ארבל", gender: "female", meaning: "ארבל" },
        { name: "מיתר", gender: "female", meaning: "מיתר" },
        { name: "נירית", gender: "female", meaning: "נר" },
        { name: "ענת", gender: "female", meaning: "ענת" },
        { name: "טלי", gender: "female", meaning: "טל" },
        { name: "מאיה", gender: "female", meaning: "מים" },
        { name: "ליבי", gender: "female", meaning: "לבי" },
        { name: "אלמה", gender: "female", meaning: "עלמה" },
        { name: "שלומית", gender: "female", meaning: "שלומית" },
        { name: "אורית", gender: "female", meaning: "אור" },
        { name: "ברכה", gender: "female", meaning: "ברכה" },
        { name: "גילה", gender: "female", meaning: "שמחה" },
        { name: "דקלה", gender: "female", meaning: "דקל" },
        { name: "הדר", gender: "female", meaning: "הדר" },
        { name: "ורד", gender: "female", meaning: "ורד" },
        { name: "זהבה", gender: "female", meaning: "זהב" },
        { name: "חיה", gender: "female", meaning: "חיה" },
        { name: "טובה", gender: "female", meaning: "טובה" },
        { name: "יפה", gender: "female", meaning: "יפה" },
        { name: "כוכבה", gender: "female", meaning: "כוכב" },
        { name: "לבנה", gender: "female", meaning: "לבן" },
        { name: "מלכה", gender: "female", meaning: "מלכה" },
        { name: "נחמה", gender: "female", meaning: "נחמה" },
        { name: "סמדר", gender: "female", meaning: "סמדר" },
        { name: "עינת", gender: "female", meaning: "עין" },
        { name: "פנינה", gender: "female", meaning: "פנינה" },
        { name: "צפורה", gender: "female", meaning: "ציפור" },
        { name: "קרן", gender: "female", meaning: "קרן" },
        { name: "רמה", gender: "female", meaning: "רמה" },
        { name: "שושנה", gender: "female", meaning: "שושן" },
        { name: "תהילה", gender: "female", meaning: "תהילה" },

        // Unisex Hebrew names
        { name: "אור", gender: "unisex", meaning: "אור" },
        { name: "טל", gender: "unisex", meaning: "טל" },
        { name: "נועם", gender: "unisex", meaning: "נעים" },
        { name: "גל", gender: "unisex", meaning: "גל" },
        { name: "רן", gender: "unisex", meaning: "שמחה" },
        { name: "שחר", gender: "unisex", meaning: "שחר" },
        { name: "ים", gender: "unisex", meaning: "ים" },
        { name: "עדן", gender: "unisex", meaning: "עונג" },
        { name: "ארי", gender: "unisex", meaning: "אריה" },
        { name: "חי", gender: "unisex", meaning: "חי" },
        { name: "רועי", gender: "unisex", meaning: "רועה" },
        { name: "יערי", gender: "unisex", meaning: "יער" },
        { name: "מתן", gender: "unisex", meaning: "מתנה" },
        { name: "צור", gender: "unisex", meaning: "סלע" },
        { name: "עומרי", gender: "unisex", meaning: "אלומה" },
        { name: "ענבל", gender: "unisex", meaning: "פעמון" },
        { name: "רז", gender: "unisex", meaning: "סוד" },
        { name: "דור", gender: "unisex", meaning: "דור" },
        { name: "רם", gender: "unisex", meaning: "רם" },
        { name: "פז", gender: "unisex", meaning: "זהב" },
        { name: "איל", gender: "unisex", meaning: "איל" },
        { name: "נחל", gender: "unisex", meaning: "נחל" },
        { name: "יובל", gender: "unisex", meaning: "נחל" },
        { name: "לב", gender: "unisex", meaning: "לב" },
        { name: "שדה", gender: "unisex", meaning: "שדה" }
      ];

      console.log(`Loaded ${hebrewNames.length} curated Hebrew names`);
      return { 
        success: true,
        data: hebrewNames 
      };
    } catch (error) {
      console.error('Error loading Hebrew names:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to load Hebrew names' 
      };
    }
  }

  static async scrapeWithPagination(baseUrl: string): Promise<{ success: boolean; error?: string; data?: HebrewName[] }> {
    try {
      let allNames: HebrewName[] = [];
      let pageNum = 1;
      let maxPages = 50; // Safety limit
      let hasMorePages = true;

      console.log('Starting pagination crawl from:', baseUrl);

      while (hasMorePages && pageNum <= maxPages) {
        console.log(`Crawling page ${pageNum}...`);
        
        // Build URL with page parameter
        const pageUrl = this.buildPageUrl(baseUrl, pageNum);
        console.log('Fetching:', pageUrl);
        
        const pageResult = await this.scrapeSinglePage(pageUrl);
        
        if (!pageResult.success) {
          console.log(`Failed to scrape page ${pageNum}:`, pageResult.error);
          if (pageNum === 1) {
            // If first page fails, return the error
            return pageResult;
          } else {
            // If subsequent pages fail, might have reached the end
            break;
          }
        }

        if (pageResult.data && pageResult.data.length > 0) {
          console.log(`Found ${pageResult.data.length} names on page ${pageNum}`);
          allNames.push(...pageResult.data);
          pageNum++;
          
          // Small delay to be respectful
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          console.log(`No names found on page ${pageNum}, stopping pagination`);
          hasMorePages = false;
        }
      }

      // Remove duplicates
      const uniqueNames = allNames.filter((name, index, self) => 
        index === self.findIndex(n => n.name === name.name && n.gender === name.gender)
      );

      console.log(`Total unique names found across ${pageNum - 1} pages: ${uniqueNames.length}`);

      return {
        success: true,
        data: uniqueNames
      };
    } catch (error) {
      console.error('Error in pagination crawl:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to crawl with pagination'
      };
    }
  }

  static buildPageUrl(baseUrl: string, pageNum: number): string {
    const url = new URL(baseUrl);
    
    // Check if URL already has pageID parameter
    if (url.searchParams.has('pageID')) {
      url.searchParams.set('pageID', pageNum.toString());
    } else {
      // Add pageID parameter
      url.searchParams.set('pageID', pageNum.toString());
    }
    
    return url.toString();
  }

  static async scrapeSinglePage(url: string): Promise<{ success: boolean; error?: string; data?: HebrewName[] }> {
    try {
      console.log('Fetching single page:', url);
      
      // Try multiple CORS proxies
      const proxies = [
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
        `https://corsproxy.io/?${encodeURIComponent(url)}`,
        `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
        `https://thingproxy.freeboard.io/fetch/${url}`
      ];

      let htmlContent = '';
      let lastError = null;

      for (const proxyUrl of proxies) {
        try {
          console.log('Trying proxy:', proxyUrl);
          const response = await fetch(proxyUrl);
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const data = await response.text();
          
          // Different proxies return data in different formats
          if (proxyUrl.includes('allorigins.win')) {
            const jsonData = JSON.parse(data);
            htmlContent = jsonData.contents || '';
          } else {
            htmlContent = data;
          }

          if (htmlContent && htmlContent.length > 100) {
            console.log('Successfully fetched content with proxy:', proxyUrl);
            break;
          }
        } catch (error) {
          console.log('Proxy failed:', proxyUrl, error);
          lastError = error;
          continue;
        }
      }

      if (!htmlContent || htmlContent.length < 100) {
        throw new Error('No content received from any proxy service');
      }

      // Parse the HTML content
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');
      
      const names: HebrewName[] = [];

      // Try different selectors to find the names table
      const tableSelectors = [
        '#namesTable',
        'table[id*="name"]',
        'table[class*="name"]',
        'table:has(td:contains("כ"))', // Hebrew character
        'table',
        '.names-table'
      ];

      let table = null;
      for (const selector of tableSelectors) {
        try {
          table = doc.querySelector(selector);
          if (table) {
            console.log('Found table with selector:', selector);
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (!table) {
        // Try to find any table with Hebrew content
        const tables = doc.querySelectorAll('table');
        for (const t of tables) {
          const text = t.textContent || '';
          if (/[\u0590-\u05FF]/.test(text)) {
            table = t;
            console.log('Found Hebrew table by content search');
            break;
          }
        }
      }

      if (!table) {
        throw new Error('No suitable table found on the page');
      }

      const rows = table.querySelectorAll('tr');
      console.log(`Found ${rows.length} rows in table`);
      
      for (let i = 1; i < rows.length; i++) { // Skip header row
        const cells = rows[i].querySelectorAll('td, th');
        if (cells.length >= 1) {
          const nameText = cells[0]?.textContent?.trim();
          
          // Extract gender from various possible columns
          let genderText = '';
          if (cells.length > 1) {
            genderText = cells[1]?.textContent?.trim()?.toLowerCase() || '';
          }
          
          // Extract meaning if available
          let meaningText = '';
          if (cells.length > 2) {
            meaningText = cells[2]?.textContent?.trim() || '';
          }
          
          if (nameText && /[\u0590-\u05FF]/.test(nameText)) { // Check for Hebrew characters
            let gender: 'male' | 'female' | 'unisex' = 'unisex';
            
            // Hebrew gender detection
            if (genderText?.includes('זכר') || genderText?.includes('בן') || 
                genderText?.includes('male') || genderText?.includes('זכרי')) {
              gender = 'male';
            } else if (genderText?.includes('נקבה') || genderText?.includes('בת') || 
                       genderText?.includes('female') || genderText?.includes('נקבי')) {
              gender = 'female';
            }
            
            // Clean the name (remove extra spaces, punctuation)
            const cleanName = nameText.replace(/[^\u0590-\u05FF\s]/g, '').trim();
            
            if (cleanName && cleanName.length > 0) {
              names.push({
                name: cleanName,
                gender,
                meaning: meaningText || undefined
              });
            }
          }
        }
      }
      
      console.log(`Extracted ${names.length} Hebrew names from single page`);
      
      return {
        success: true,
        data: names
      };
    } catch (error) {
      console.error('Error scraping single page:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to scrape page'
      };
    }
  }
}