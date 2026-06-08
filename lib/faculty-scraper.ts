// Trigger redeploy: Faculty profile scraping & AI matching pipeline v1.0.1
import { CohereClient } from 'cohere-ai';

const cohere = new CohereClient({
  token: process.env.cohere_api_key || '',
});

const COHERE_MODEL = process.env.COHERE_MODEL || 'command-r7b-12-2024';

function cleanHtmlText(htmlStr: string): string {
  if (!htmlStr) return '';
  return htmlStr
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeCfEmail(encodedString: string): string {
  try {
    let email = '';
    const r = parseInt(encodedString.substring(0, 2), 16);
    for (let n = 2; n < encodedString.length; n += 2) {
      const c = parseInt(encodedString.substring(n, n + 2), 16) ^ r;
      email += String.fromCharCode(c);
    }
    return email;
  } catch (e) {
    return '';
  }
}

function preprocessHtmlEmails(html: string): string {
  let processed = html;
  
  // Replace data-cfemail attributes
  const cfEmailRegex = /data-cfemail="([a-f0-9]+)"/gi;
  processed = processed.replace(cfEmailRegex, (match, hex) => {
    const decoded = decodeCfEmail(hex);
    return decoded ? `data-cfemail="${hex}" data-decoded="${decoded}" href="mailto:${decoded}"` : match;
  });

  // Replace href="/cdn-cgi/l/email-protection#hex" links
  const cfHrefRegex = /\/cdn-cgi\/l\/email-protection#([a-f0-9]+)/gi;
  processed = processed.replace(cfHrefRegex, (match, hex) => {
    const decoded = decodeCfEmail(hex);
    return decoded ? `mailto:${decoded}` : match;
  });

  return processed;
}

interface ExtractedLink {
  href: string;
  text: string;
}

function extractLinksWithText(html: string, baseUrlStr: string): ExtractedLink[] {
  const links: ExtractedLink[] = [];
  const aTagRegex = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  const hrefRegex = /href=["']([^"']+)["']/i;
  let match;
  
  while ((match = aTagRegex.exec(html)) !== null) {
    const attrs = match[1];
    const text = cleanHtmlText(match[2]);
    const hrefMatch = hrefRegex.exec(attrs);
    
    if (hrefMatch) {
      const url = hrefMatch[1];
      if (
        url &&
        !url.startsWith('mailto:') &&
        !url.startsWith('javascript:') &&
        !url.startsWith('#') &&
        !/\.(png|jpe?g|gif|css|js|pdf|svg|ico)$/i.test(url) &&
        !url.includes('facebook.com') &&
        !url.includes('twitter.com') &&
        !url.includes('linkedin.com')
      ) {
        try {
          const absoluteUrl = new URL(url, baseUrlStr).toString();
          if (!links.some(l => l.href === absoluteUrl)) {
            links.push({ href: absoluteUrl, text });
          }
        } catch (e) {
          // ignore invalid urls
        }
      }
    }
  }
  
  return links;
}

function extractLinks(htmlWindow: string, baseUrlStr: string): string[] {
  const links: string[] = [];
  const hrefRegex = /href=["']([^"']+)["']/gi;
  let match;
  
  while ((match = hrefRegex.exec(htmlWindow)) !== null) {
    const url = match[1];
    // Exclude static assets, mailto links, social media, and jump hashes
    if (
      url &&
      !url.startsWith('mailto:') &&
      !url.startsWith('javascript:') &&
      !url.startsWith('#') &&
      !/\.(png|jpe?g|gif|css|js|pdf|svg|ico)$/i.test(url) &&
      !url.includes('facebook.com') &&
      !url.includes('twitter.com') &&
      !url.includes('linkedin.com')
    ) {
      try {
        const absoluteUrl = new URL(url, baseUrlStr).toString();
        if (!links.includes(absoluteUrl)) {
          links.push(absoluteUrl);
        }
      } catch (e) {
        // ignore invalid urls
      }
    }
  }
  
  return links;
}

export interface ScrapedProfile {
  specialization: string;
  description: string;
  domains: string;
  skills: string;
  achievements: string;
}

/**
 * Scrapes the faculty page, matches the email (or name as fallback), finds supervisor sub-links, and parses details via AI.
 */
export async function scrapeAndParseFaculty(
  facultyUrl: string,
  email: string,
  name?: string
): Promise<ScrapedProfile | null> {
  try {
    console.log(`Fetching faculty page: ${facultyUrl}`);
    const response = await fetch(facultyUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch faculty directory page: Status ${response.status}`);
    }

    let html = await response.text();
    html = preprocessHtmlEmails(html);
    
    const emailLower = email.toLowerCase().trim();
    let emailIndex = html.toLowerCase().indexOf(emailLower);
    let matchedProfileLink: string | null = null;
    let detailPageText = '';

    if (emailIndex !== -1) {
      console.log(`Found email ${email} on directory page.`);
      // Capture ±15000 character window surrounding the matched email
      const start = Math.max(0, emailIndex - 15000);
      const end = Math.min(html.length, emailIndex + 15000);
      const contextWindow = html.substring(start, end);

      // Extract potential sub-profile URLs in this card/block context
      const relativeLinks = extractLinks(contextWindow, facultyUrl);
      
      // Find the link that most likely points to their personal profile
      const namePart = emailLower.split('@')[0];
      matchedProfileLink = relativeLinks.find(link => 
        link.toLowerCase().includes(namePart) || 
        /profile|faculty|teacher|member|staff/i.test(link)
      ) || (relativeLinks.length > 0 ? relativeLinks[0] : null);
    } else {
      console.warn(`Email ${email} not found on directory page ${facultyUrl}. Trying name-based search fallback...`);
      if (name) {
        const cleanedName = name.toLowerCase().trim();
        const nameTokens = cleanedName.split(/\s+/).filter(t => t.length >= 2);
        
        // Extract all links with text from the directory page
        const extractedLinks = extractLinksWithText(html, facultyUrl);
        
        // Score each link
        const scoredLinks = extractedLinks.map(link => {
          let score = 0;
          const hrefLower = link.href.toLowerCase();
          const textLower = link.text.toLowerCase();
          
          // Match full name
          if (textLower.includes(cleanedName)) {
            score += 15;
          }
          
          // Match name tokens
          let tokenTextMatches = 0;
          let tokenHrefMatches = 0;
          nameTokens.forEach(token => {
            if (textLower.includes(token)) tokenTextMatches++;
            if (hrefLower.includes(token)) tokenHrefMatches++;
          });
          
          score += tokenTextMatches * 5;
          score += tokenHrefMatches * 3;
          
          // Match email prefix
          const emailPrefix = emailLower.split('@')[0];
          if (hrefLower.includes(emailPrefix)) {
            score += 10;
          }
          
          // Subprofile indicator keywords in URL
          if (/profile|faculty|teacher|member|staff/i.test(hrefLower)) {
            score += 1;
          }
          
          return { ...link, score };
        });
        
        // Filter candidate links with a positive score
        const candidates = scoredLinks
          .filter(c => c.score > 0 && c.href !== facultyUrl)
          .sort((a, b) => b.score - a.score);
          
        console.log(`Found ${candidates.length} name-based profile candidates:`, candidates.slice(0, 5));
        
        // Try candidate pages sequentially to verify email
        for (const candidate of candidates.slice(0, 4)) {
          try {
            console.log(`Checking candidate link: ${candidate.href} (score: ${candidate.score})`);
            const subPageRes = await fetch(candidate.href, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Safari/537.36',
              },
            });
            
            if (subPageRes.ok) {
              let subPageHtml = await subPageRes.text();
              subPageHtml = preprocessHtmlEmails(subPageHtml);
              
              if (subPageHtml.toLowerCase().includes(emailLower)) {
                console.log(`Successfully verified email ${email} on candidate page ${candidate.href}!`);
                matchedProfileLink = candidate.href;
                detailPageText = cleanHtmlText(subPageHtml);
                break;
              } else {
                console.log(`Email not found on candidate page ${candidate.href}.`);
              }
            }
          } catch (err) {
            console.error(`Error checking candidate link ${candidate.href}:`, err);
          }
        }
        
        // Fallback: If we couldn't verify the email but have a highly-scored candidate
        if (!matchedProfileLink && candidates.length > 0 && candidates[0].score >= 15) {
          const fallbackCandidate = candidates[0];
          console.warn(`Could not verify email on any candidate page. Using highest-score fallback candidate: ${fallbackCandidate.href}`);
          try {
            const subPageRes = await fetch(fallbackCandidate.href, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Safari/537.36',
              },
            });
            if (subPageRes.ok) {
              let subPageHtml = await subPageRes.text();
              subPageHtml = preprocessHtmlEmails(subPageHtml);
              matchedProfileLink = fallbackCandidate.href;
              detailPageText = cleanHtmlText(subPageHtml);
            }
          } catch (err) {
            console.error(`Error fetching fallback candidate ${fallbackCandidate.href}:`, err);
          }
        }
      }
    }

    // Fetch detail page text if we have matched link but didn't fetch it yet
    if (matchedProfileLink && matchedProfileLink !== facultyUrl && !detailPageText) {
      try {
        console.log(`Fetching verified profile sub-link details: ${matchedProfileLink}`);
        const subPageRes = await fetch(matchedProfileLink, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Safari/537.36',
          },
        });
        if (subPageRes.ok) {
          const subPageHtml = await subPageRes.text();
          detailPageText = cleanHtmlText(preprocessHtmlEmails(subPageHtml));
        }
      } catch (err) {
        console.error(`Failed to fetch supervisor subpage: ${matchedProfileLink}`, err);
      }
    }

    // Grab directory text window if email is present
    let directoryWindowText = '';
    if (emailIndex !== -1) {
      const start = Math.max(0, emailIndex - 15000);
      const end = Math.min(html.length, emailIndex + 15000);
      directoryWindowText = cleanHtmlText(html.substring(start, end));
    } else {
      directoryWindowText = cleanHtmlText(html).substring(0, 15000);
    }

    const combinedText = `
DIRECTORY CARD DATA:
${directoryWindowText.substring(0, 10000)}

DETAILED PROFILE PAGE DATA:
${detailPageText.substring(0, 20000)}
    `.trim();

    if (!detailPageText && emailIndex === -1) {
      console.warn('No details scraped or matched.');
      return null;
    } return await parseProfileWithAI(combinedText);
  } catch (error) {
    console.error('Error in scrapeAndParseFaculty:', error);
    return null;
  }
}

/**
 * Call Cohere AI to structure the unstructured text window into fields
 */
async function parseProfileWithAI(rawText: string): Promise<ScrapedProfile | null> {
  try {
    const prompt = `You are an expert profile extraction assistant. Analyze the unstructured faculty web page text provided below and extract the profile details for the supervisor.

UNSTRUCTURED PROFILE DATA:
${rawText}

Extract and structure the following fields:
1. Specialization: A single phrase or domain of primary expertise (e.g. "Software Engineering", "Artificial Intelligence & NLP", "Cloud Computing"). Max 80 characters.
2. Description: An elegant, professional biography / "About Me" summary (3-4 sentences, max 120 words). Write in third person (e.g., "Dr. Someone is a ...").
3. Domains: A comma-separated list of 3-5 specific research domains/interests (e.g. "Distributed Systems, Machine Learning, Web Technologies").
4. Skills: A comma-separated list of 4-6 specific technical skills or programming languages mentioned (e.g. "Python, PyTorch, Java, Docker, REST APIs").
5. Achievements: A list of 2-4 key achievements, publications, research awards or academic credentials. Write each achievement on a separate line (no bullet symbols).

CRITICAL: Return ONLY a valid JSON object matching the schema below. Do not add markdown backticks or extra explanation text.

Expected JSON format:
{
  "specialization": "primary domain of expertise",
  "description": "professional biography summary",
  "domains": "Domain1, Domain2, Domain3",
  "skills": "Skill1, Skill2, Skill3",
  "achievements": "First achievement\\nSecond achievement\\nThird achievement"
}`;

    const response = await cohere.chat({
      model: COHERE_MODEL,
      message: prompt,
      temperature: 0.3,
    });

    const text = response.text || '';
    
    // Safely extract the JSON object
    const startIdx = text.indexOf('{');
    const endIdx = text.lastIndexOf('}');
    if (startIdx !== -1 && endIdx !== -1) {
      const jsonStr = text.substring(startIdx, endIdx + 1);
      const parsed = JSON.parse(jsonStr);
      return {
        specialization: (parsed.specialization || '').trim(),
        description: (parsed.description || '').trim(),
        domains: (parsed.domains || '').trim(),
        skills: (parsed.skills || '').trim(),
        achievements: (parsed.achievements || '').trim(),
      };
    }

    throw new Error('Valid JSON block not found in Cohere response');
  } catch (error) {
    console.error('Error parsing profile with Cohere:', error);
    return null;
  }
}
