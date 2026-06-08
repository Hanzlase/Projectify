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
 * Scrapes the faculty page, matches the email, finds supervisor sub-links, and parses details via AI.
 */
export async function scrapeAndParseFaculty(
  facultyUrl: string,
  email: string
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

    const html = await response.text();
    const emailLower = email.toLowerCase().trim();
    const emailIndex = html.toLowerCase().indexOf(emailLower);

    if (emailIndex === -1) {
      console.warn(`Email ${email} not found on page ${facultyUrl}`);
      return null;
    }

    // Capture ±15000 character window surrounding the matched email
    const start = Math.max(0, emailIndex - 15000);
    const end = Math.min(html.length, emailIndex + 15000);
    const contextWindow = html.substring(start, end);

    // Extract potential sub-profile URLs in this card/block context
    const relativeLinks = extractLinks(contextWindow, facultyUrl);
    
    // Find the link that most likely points to their personal profile
    let detailPageText = '';
    const namePart = emailLower.split('@')[0];
    const candidateLink = relativeLinks.find(link => 
      link.toLowerCase().includes(namePart) || 
      /profile|faculty|teacher|member|staff/i.test(link)
    ) || (relativeLinks.length > 0 ? relativeLinks[0] : null);

    if (candidateLink && candidateLink !== facultyUrl) {
      try {
        console.log(`Found candidate profile sub-link: ${candidateLink}. Fetching detailed page...`);
        const subPageRes = await fetch(candidateLink, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Safari/537.36',
          },
        });
        if (subPageRes.ok) {
          const subPageHtml = await subPageRes.text();
          detailPageText = cleanHtmlText(subPageHtml);
        }
      } catch (err) {
        console.error(`Failed to fetch supervisor subpage: ${candidateLink}`, err);
      }
    }

    // Clean html window text
    const directoryWindowText = cleanHtmlText(contextWindow);
    const combinedText = `
DIRECTORY CARD DATA:
${directoryWindowText.substring(0, 10000)}

DETAILED PROFILE PAGE DATA:
${detailPageText.substring(0, 20000)}
    `.trim();

    return await parseProfileWithAI(combinedText);
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
