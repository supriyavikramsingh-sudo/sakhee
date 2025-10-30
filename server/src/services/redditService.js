// server/src/services/redditService.js
import axios from 'axios';
import { env } from '../config/env.js';
import { Logger } from '../utils/logger.js';

const logger = new Logger('RedditService');

class RedditService {
  constructor() {
    this.accessToken = null;
    this.tokenExpiry = null;
    this.baseURL = 'https://oauth.reddit.com';

    // Subreddits to monitor (in order of priority) - PCOS-focused first
    this.targetSubreddits = [
      // PRIMARY PCOS Communities
      'PCOS', // PRIMARY - Most relevant
      'PCOSIndia', // PRIMARY - India-specific
      'PCOS_Folks', // Secondary PCOS community
      'PCOSWeightLoss', // Specific PCOS topic
      'PCOSloseit', // PCOS weight loss focused
      'PCOS_CICO', // PCOS calories in/calories out
      'PCOS_management', // PCOS management strategies
      'PCOSandPregnant', // PCOS and pregnancy
      'LeanPCOS', // Lean PCOS specific
      'TTC_PCOS', // Trying to conceive with PCOS
      'PcosIndia', // Alternative India PCOS community
      
      // FERTILITY & REPRODUCTIVE HEALTH
      'TryingForABaby', // Fertility-focused (include PCOS posts only)
      'infertility', // Fertility-focused (include PCOS posts only)
      'obgyn', // OB/GYN medical discussions
      
      // SYMPTOM-SPECIFIC COMMUNITIES
      'FemaleHairLoss', // Hair loss/hirsutism related
      'SkincareAddiction', // Acne and skin issues
      'acne', // Acne-specific community
      'IndianSkincareAddicts', // Indian skincare community
      
      // LIFESTYLE & DIET
      'keto', // Ketogenic diet (popular for PCOS)
    ];

    // Keywords to filter relevant posts - EXPANDED for better PCOS detection
    this.relevantKeywords = [
      'pcos',
      'pcod',
      'polycystic ovary',
      'polycystic ovarian',
      'irregular periods',
      'insulin resistance',
      'hirsutism',
      'metformin',
      'birth control',
      'ovulation',
      'hormones',
      'acne',
      'weight loss',
      'diet',
      'exercise',
      'inositol',
      'spearmint tea',
      'fertility',
      'pregnancy',
      'trying to conceive',
      'ttc',
      'ovulate',
      'anovulation',
      'clomid',
      'letrozole',
    ];

    // Negative filters (exclude posts with these)
    this.negativeFilters = [
      'suicide',
      'self-harm',
      'severely depressed',
      'want to die',
      'hate myself',
      'giving up',
      'hopeless',
      'worthless',
    ];
  }

  /**
   * Authenticate with Reddit API (Application-Only OAuth)
   */
  async authenticate() {
    try {
      // Check if token is still valid
      if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
        return this.accessToken;
      }

      logger.info('Authenticating with Reddit API...');

      const auth = Buffer.from(`${env.REDDIT_CLIENT_ID}:${env.REDDIT_CLIENT_SECRET}`).toString(
        'base64'
      );

      const response = await axios.post(
        'https://www.reddit.com/api/v1/access_token',
        'grant_type=client_credentials',
        {
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Sakhee/1.0.0 (PCOS Health Assistant)',
          },
        }
      );

      this.accessToken = response.data.access_token;
      // Reddit tokens typically expire in 3600 seconds (1 hour)
      this.tokenExpiry = Date.now() + response.data.expires_in * 1000;

      logger.info('Reddit authentication successful');
      return this.accessToken;
    } catch (error) {
      logger.error('Reddit authentication failed', { error: error.message });
      throw new Error('Failed to authenticate with Reddit API');
    }
  }

  /**
   * Fetch posts from a specific subreddit
   */
  async fetchSubredditPosts(subreddit, timeFilter = 'month', limit = 50) {
    try {
      const token = await this.authenticate();

      const response = await axios.get(`${this.baseURL}/r/${subreddit}/top`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'User-Agent': 'Sakhee/1.0.0 (PCOS Health Assistant)',
        },
        params: {
          t: timeFilter, // hour, day, week, month, year, all
          limit: limit,
        },
      });

      const posts = response.data.data.children.map((child) => child.data);

      logger.info(`Fetched ${posts.length} posts from r/${subreddit}`);
      return posts;
    } catch (error) {
      logger.error(`Failed to fetch from r/${subreddit}`, { error: error.message });
      return [];
    }
  }

  /**
   * Fetch top comments from a post
   */
  async fetchPostComments(subreddit, postId, limit = 10) {
    try {
      const token = await this.authenticate();

      const response = await axios.get(`${this.baseURL}/r/${subreddit}/comments/${postId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'User-Agent': 'Sakhee/1.0.0 (PCOS Health Assistant)',
        },
        params: {
          limit: limit,
          depth: 2, // Don't go too deep in comment threads
          sort: 'top',
        },
      });

      // Second element contains comments
      const comments = response.data[1].data.children
        .map((child) => child.data)
        .filter((comment) => comment.body && comment.body !== '[deleted]');

      return comments;
    } catch (error) {
      logger.error(`Failed to fetch comments for post ${postId}`, { error: error.message });
      return [];
    }
  }

  /**
   * Check if post content is relevant to PCOS
   */
  isRelevantPost(post) {
    const text = `${post.title} ${post.selftext || ''}`.toLowerCase();
    const subreddit = post.subreddit.toLowerCase();

    // If from primary PCOS subreddits, automatically relevant
    if (['pcos', 'pcosindia', 'pcos_folks', 'pcosweightloss'].includes(subreddit)) {
      // Still check for negative content
      const hasNegative = this.negativeFilters.some((filter) =>
        text.includes(filter.toLowerCase())
      );

      const hasGoodEngagement = post.upvote_ratio >= 0.6;
      const isSafe = !post.over_18 && !post.spoiler;

      return !hasNegative && hasGoodEngagement && isSafe;
    }

    // For other subreddits, MUST contain PCOS keywords
    const hasPCOSKeyword = ['pcos', 'pcod', 'polycystic ovary'].some((keyword) =>
      text.includes(keyword)
    );

    if (!hasPCOSKeyword) {
      return false; // Reject if no PCOS mention
    }

    // Must not contain negative filters
    const hasNegative = this.negativeFilters.some((filter) => text.includes(filter.toLowerCase()));

    // Must have positive engagement
    const hasGoodEngagement = post.upvote_ratio >= 0.6;

    // Not NSFW or spoiler
    const isSafe = !post.over_18 && !post.spoiler;

    return !hasNegative && hasGoodEngagement && isSafe;
  }

  /**
   * Anonymize post data - CRITICAL for privacy
   */
  anonymizePost(post) {
    return {
      id: post.id,
      title: post.title,
      content: post.selftext || '',
      subreddit: post.subreddit,
      upvotes: post.ups,
      upvoteRatio: post.upvote_ratio,
      numComments: post.num_comments,
      createdAt: new Date(post.created_utc * 1000),
      url: `https://reddit.com${post.permalink}`, // Link to post, not user
      flair: post.link_flair_text,
      // NEVER include: author, author_fullname, etc.
    };
  }

  /**
   * Anonymize comment data
   */
  anonymizeComment(comment) {
    return {
      id: comment.id,
      content: comment.body,
      upvotes: comment.ups,
      createdAt: new Date(comment.created_utc * 1000),
      // NEVER include: author, author_fullname, etc.
    };
  }

  /**
   * Aggregate insights from multiple subreddits
   */
  async aggregateInsights(topic = null, timeFilter = 'month') {
    try {
      logger.info('Aggregating Reddit insights', { topic, timeFilter });

      const allInsights = [];

      // Fetch from all target subreddits
      for (const subreddit of this.targetSubreddits) {
        const posts = await this.fetchSubredditPosts(subreddit, timeFilter, 50);

        // Filter for relevance
        const relevantPosts = posts.filter((post) => this.isRelevantPost(post));

        // Filter by specific topic if provided
        const topicFiltered = topic
          ? relevantPosts.filter((post) => {
              const text = `${post.title} ${post.selftext || ''}`.toLowerCase();
              return text.includes(topic.toLowerCase());
            })
          : relevantPosts;

        // Anonymize and add to insights
        for (const post of topicFiltered.slice(0, 10)) {
          // Top 10 per subreddit
          const anonymizedPost = this.anonymizePost(post);

          // Fetch top comments if highly upvoted
          if (post.ups > 50) {
            const comments = await this.fetchPostComments(subreddit, post.id, 5);
            anonymizedPost.topComments = comments.map((c) => this.anonymizeComment(c));
          }

          allInsights.push(anonymizedPost);
        }

        // Rate limiting - be respectful to Reddit API
        await this.sleep(2000); // 2 seconds between subreddits
      }

      // Sort by engagement (upvotes)
      allInsights.sort((a, b) => b.upvotes - a.upvotes);

      logger.info(`Aggregated ${allInsights.length} insights`);

      return {
        insights: allInsights,
        fetchedAt: new Date(),
        topic: topic || 'general',
        timeFilter,
        totalCount: allInsights.length,
      };
    } catch (error) {
      logger.error('Failed to aggregate insights', { error: error.message });
      throw error;
    }
  }

  /**
   * Search across subreddits for specific query - IMPROVED RELEVANCE
   */
  async searchPosts(query, limit = 20) {
    try {
      const token = await this.authenticate();

      const allResults = [];

      // Extract specific topic keywords from query for better filtering
      const queryKeywords = this.extractQueryKeywords(query);
      logger.info('Search keywords extracted', { query, keywords: queryKeywords });

      // Prioritize PCOS-specific subreddits
      const pcosSubreddits = ['PCOS', 'PCOSIndia', 'PCOS_Folks', 'PCOSWeightLoss'];
      const otherSubreddits = this.targetSubreddits.filter((s) => !pcosSubreddits.includes(s));

      // Search PCOS subreddits first (more results)
      for (const subreddit of pcosSubreddits) {
        const response = await axios.get(`${this.baseURL}/r/${subreddit}/search`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'User-Agent': 'Sakhee/1.0.0 (PCOS Health Assistant)',
          },
          params: {
            q: query, // Use original query, not modified
            restrict_sr: true,
            sort: 'relevance', // Relevance, not just top
            t: 'all',
            limit: 25, // Get more to filter
          },
        });

        const posts = response.data.data.children
          .map((child) => child.data)
          .filter((post) => this.isRelevantPost(post))
          .filter((post) => this.matchesQueryKeywords(post, queryKeywords)) // NEW: Filter by query keywords
          .map((post) => this.anonymizePost(post));

        allResults.push(...posts);

        await this.sleep(2000);
      }

      // Search other subreddits if needed (fewer results)
      if (allResults.length < limit) {
        for (const subreddit of otherSubreddits) {
          const response = await axios.get(`${this.baseURL}/r/${subreddit}/search`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'User-Agent': 'Sakhee/1.0.0 (PCOS Health Assistant)',
            },
            params: {
              q: `${query} PCOS`, // Add PCOS for non-PCOS subs
              restrict_sr: true,
              sort: 'relevance',
              t: 'all',
              limit: 10,
            },
          });

          const posts = response.data.data.children
            .map((child) => child.data)
            .filter((post) => this.isRelevantPost(post))
            .filter((post) => this.matchesQueryKeywords(post, queryKeywords)) // NEW: Filter by query keywords
            .map((post) => this.anonymizePost(post));

          allResults.push(...posts);

          await this.sleep(2000);
        }
      }

      // NEW: Sort by query relevance FIRST, then engagement
      allResults.sort((a, b) => {
        // Calculate relevance score
        const aScore = this.calculateRelevanceScore(a, queryKeywords);
        const bScore = this.calculateRelevanceScore(b, queryKeywords);

        if (aScore !== bScore) {
          return bScore - aScore; // Higher score first
        }

        // If same relevance, sort by upvotes
        return b.upvotes - a.upvotes;
      });

      logger.info(`Found ${allResults.length} query-relevant results`, {
        query,
        keywords: queryKeywords,
      });

      return allResults.slice(0, limit);
    } catch (error) {
      logger.error('Reddit search failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Extract specific keywords from user query for relevance matching
   */
  extractQueryKeywords(query) {
    const lowerQuery = query.toLowerCase();

    // Specific medical/symptom keywords to look for
    const specificKeywords = [
      // Conditions
      'hypothyroid',
      'thyroid',
      'diabetes',
      'endometriosis',
      'adhd',
      'anxiety',
      'depression',

      // Pregnancy/Fertility specific
      'miscarriage',
      'miscarry',
      'pregnancy loss',
      'chemical pregnancy',
      'trying to conceive',
      'ttc',
      'pregnant',
      'pregnancy',
      'conceive',
      'conception',
      'ivf',
      'iui',
      'fertility treatment',
      'ovulation',
      'clomid',
      'letrozole',

      // Symptoms
      'hair loss',
      'hair thinning',
      'facial hair',
      'hirsutism',
      'acne',
      'weight gain',
      'weight loss',
      'insulin resistance',
      'irregular period',
      'missing period',
      'amenorrhea',
      'heavy bleeding',

      // Treatments
      'metformin',
      'inositol',
      'birth control',
      'spironolactone',
      'spearmint',
      'berberine',

      // Lifestyle
      'diet',
      'keto',
      'low carb',
      'intermittent fasting',
      'exercise',
      'gym',
      'workout',
      'running',
      'yoga',
    ];

    // Find which keywords appear in the query
    const foundKeywords = specificKeywords.filter((keyword) => lowerQuery.includes(keyword));

    // Also extract any capitalized words (likely important topics)
    const words = query.split(' ');
    const importantWords = words.filter(
      (word) =>
        word.length > 4 &&
        !['which', 'reddit', 'threads', 'women', 'about', 'suffer', 'suffering'].includes(
          word.toLowerCase()
        )
    );

    // Combine and deduplicate
    const allKeywords = [
      ...new Set([...foundKeywords, ...importantWords.map((w) => w.toLowerCase())]),
    ];

    return allKeywords;
  }

  /**
   * Check if post matches specific query keywords
   */
  matchesQueryKeywords(post, queryKeywords) {
    // If no specific keywords, allow all posts (generic PCOS query)
    if (queryKeywords.length === 0) {
      return true;
    }

    const postText = `${post.title} ${post.content || ''}`.toLowerCase();

    // Post must match at least ONE keyword from the query
    const matchCount = queryKeywords.filter((keyword) =>
      postText.includes(keyword.toLowerCase())
    ).length;

    // At least 1 keyword match required (or more for very specific queries)
    return matchCount >= 1;
  }

  /**
   * Calculate relevance score for sorting
   */
  calculateRelevanceScore(post, queryKeywords) {
    if (queryKeywords.length === 0) {
      return 0; // No specific query, use default sorting
    }

    const titleLower = post.title.toLowerCase();
    const contentLower = (post.content || '').toLowerCase();

    let score = 0;

    queryKeywords.forEach((keyword) => {
      const keywordLower = keyword.toLowerCase();

      // Title matches worth more
      if (titleLower.includes(keywordLower)) {
        score += 10;
      }

      // Content matches worth less
      if (contentLower.includes(keywordLower)) {
        score += 3;
      }

      // Exact title match worth even more
      if (titleLower === keywordLower || titleLower.includes(` ${keywordLower} `)) {
        score += 20;
      }
    });

    // Bonus for multiple keyword matches (compound topics)
    const matchCount = queryKeywords.filter(
      (k) => titleLower.includes(k.toLowerCase()) || contentLower.includes(k.toLowerCase())
    ).length;

    if (matchCount >= 2) {
      score += matchCount * 5; // Bonus for matching multiple keywords
    }

    return score;
  }

  /**
   * Get trending topics from PCOS communities
   */
  async getTrendingTopics(limit = 10) {
    try {
      const insights = await this.aggregateInsights(null, 'week');

      // Extract keywords from titles
      const wordFrequency = {};
      const stopWords = new Set([
        'the',
        'a',
        'an',
        'and',
        'or',
        'but',
        'in',
        'on',
        'at',
        'to',
        'for',
        'of',
        'with',
        'is',
        'was',
        'has',
        'have',
        'been',
      ]);

      insights.insights.forEach((post) => {
        const words = post.title
          .toLowerCase()
          .replace(/[^\w\s]/g, '')
          .split(/\s+/)
          .filter((word) => word.length > 3 && !stopWords.has(word));

        words.forEach((word) => {
          wordFrequency[word] = (wordFrequency[word] || 0) + 1;
        });
      });

      // Sort by frequency
      const trending = Object.entries(wordFrequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([topic, count]) => ({ topic, mentions: count }));

      return trending;
    } catch (error) {
      logger.error('Failed to get trending topics', { error: error.message });
      return [];
    }
  }

  /**
   * Helper: Sleep function for rate limiting
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Format insights for chat context - ENHANCED with direct links
   */
  formatInsightsForChat(insights, maxInsights = 5) {
    if (!insights || insights.length === 0) {
      return 'No relevant community insights found.';
    }

    let formatted = '🔥 REAL REDDIT POSTS ABOUT PCOS - USE THESE SPECIFIC EXAMPLES:\n\n';
    formatted += `Found ${insights.length} relevant discussions. HERE ARE THE TOP ${Math.min(
      maxInsights,
      insights.length
    )} POSTS:\n\n`;

    insights.slice(0, maxInsights).forEach((insight, index) => {
      formatted += `━━━ POST #${index + 1} ━━━\n`;
      formatted += `📍 SUBREDDIT: r/${insight.subreddit}\n`;
      formatted += `📝 TITLE: "${insight.title}"\n`;
      formatted += `🔗 DIRECT LINK: ${insight.url}\n`;
      formatted += `📊 ENGAGEMENT: ${insight.upvotes} upvotes (${Math.round(
        insight.upvoteRatio * 100
      )}% upvote ratio) | ${insight.numComments} comments\n`;

      if (insight.content && insight.content.length > 0) {
        // Show more content for better context
        const truncatedContent =
          insight.content.length > 800
            ? insight.content.substring(0, 800) + '...[see full post at link above]'
            : insight.content;
        formatted += `\n💬 POST CONTENT:\n${truncatedContent}\n`;
      } else {
        formatted += `\n💬 POST CONTENT: (Title only - check comments below or visit link)\n`;
      }

      if (insight.topComments && insight.topComments.length > 0) {
        formatted += `\n🗨️ TOP COMMUNITY RESPONSES:\n`;
        insight.topComments.slice(0, 3).forEach((comment, cidx) => {
          const truncatedComment =
            comment.content.length > 300
              ? comment.content.substring(0, 300) + '...'
              : comment.content;
          formatted += `   ${cidx + 1}. (${comment.upvotes} upvotes) "${truncatedComment}"\n`;
        });
      }

      formatted += `\n`;
    });

    formatted += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
    formatted += '⚠️ CRITICAL INSTRUCTIONS FOR YOUR RESPONSE:\n';
    formatted += '1. CITE SPECIFIC POST TITLES when referencing discussions\n';
    formatted += '2. INCLUDE THE REDDIT LINKS in your response so users can click through\n';
    formatted += '3. QUOTE or PARAPHRASE actual content from posts/comments above\n';
    formatted += '4. SAY which subreddit each insight is from (r/PCOS, r/PCOSIndia, etc.)\n';
    formatted += '5. DO NOT give generic advice - use the ACTUAL POSTS shown above\n\n';
    formatted +=
      '⚠️ Disclaimer: Community insights are personal experiences from Reddit, not medical advice.\n';

    return formatted;
  }
}

export const redditService = new RedditService();
export default redditService;
