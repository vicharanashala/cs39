const { FAQThread, Answer } = require('../models/Schemas');

// 1. NLP Helpers: Tokenizer, Synonyms, Stopwords
const STOPWORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'arent', 'as', 'at', 
  'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'can', 'cant', 'cannot', 
  'co', 'could', 'couldnt', 'did', 'didnt', 'do', 'does', 'doesnt', 'doing', 'dont', 'down', 'during', 'each', 
  'few', 'for', 'from', 'further', 'had', 'hadnt', 'has', 'hasnt', 'have', 'havent', 'having', 'he', 'hed', 
  'hell', 'hes', 'her', 'here', 'heres', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'hows', 'i', 'id', 
  'ill', 'im', 'ive', 'if', 'in', 'into', 'is', 'isnt', 'it', 'its', 'itself', 'lets', 'me', 'more', 'most', 
  'mustnt', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 
  'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'she', 'shed', 'shell', 'shes', 
  'should', 'shouldnt', 'so', 'some', 'such', 'than', 'that', 'thats', 'the', 'their', 'theirs', 'them', 
  'themselves', 'then', 'there', 'theres', 'these', 'they', 'theyd', 'theyll', 'theyre', 'theyve', 'this', 
  'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'wasnt', 'we', 'wed', 'well', 
  'were', 'weve', 'werent', 'what', 'whats', 'when', 'whens', 'where', 'wheres', 'which', 'while', 'who', 
  'whos', 'whom', 'why', 'whys', 'with', 'wont', 'would', 'wouldnt', 'you', 'youd', 'youll', 'youre', 
  'youve', 'your', 'yours', 'yourself', 'yourselves'
]);

const SYNONYMS = {
  'leave': ['holiday', 'absent', 'exemption', 'break', 'sick', 'vacation', 'missing', 'exam', 'exams'],
  'noc': ['no objection certificate', 'letter', 'permission', 'approval', 'sign', 'stamp', 'hod'],
  'stipend': ['money', 'paid', 'salary', 'payment', 'fee', 'unpaid'],
  'vibe': ['platform', 'lms', 'login', 'portal', 'course', 'courses'],
  'attendance': ['miss', 'absent', 'present', 'leave', 'class', 'standup', 'standups', 'meeting'],
  'certificate': ['proof', 'completion', 'document', 'graduating', 'graduation', 'alumni'],
  'team': ['group', 'partner', 'teammate', 'member']
};

const DISPLAY_GROUPS = [
  { title: 'Getting Started', categories: ['Internship', 'Selection Process', 'Announcements'] },
  { title: 'Documents & Dates', categories: ['Certificates', 'Deadlines', 'Payments'] },
  { title: 'Learning & Work', categories: ['Attendance', 'Assignments', 'Mentorship', 'Projects'] },
  { title: 'Platform & Help', categories: ['Technical Issues', 'General Queries', 'Others'] }
];

function getDisplayGroup(category) {
  return DISPLAY_GROUPS.find(group => group.categories.includes(category))?.title || 'Platform & Help';
}

function compactAnswer(text, maxLength = 360) {
  const compact = text.replace(/\s+/g, ' ').trim();
  if (compact.length <= maxLength) return compact;
  const clipped = compact.slice(0, maxLength);
  const lastSentence = clipped.lastIndexOf('. ');
  const safeEnd = lastSentence > 140 ? lastSentence + 1 : clipped.lastIndexOf(' ');
  return `${compact.slice(0, safeEnd)}...`;
}

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(token => token.length > 1 && !STOPWORDS.has(token));
}

// 2. Levenshtein Distance for Spelling Correction
function levenshteinDistance(s1, s2) {
  if (s1 === s2) return 0;
  const len1 = s1.length;
  const len2 = s2.length;
  if (len1 === 0) return len2;
  if (len2 === 0) return len1;

  const matrix = Array.from({ length: len1 + 1 }, () => Array(len2 + 1).fill(0));

  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  return matrix[len1][len2];
}

// Builds a dynamic domain-specific vocabulary list from FAQ threads and synonyms
function buildVocabulary(threads) {
  const vocab = new Set();
  
  const commonWords = [
    'what', 'when', 'where', 'how', 'who', 'why', 'which', 'is', 'are', 'was', 'were',
    'internship', 'intern', 'vins', 'vise', 'vicharanashala', 'stipend', 'salary', 'pay',
    'certificate', 'certificates', 'bonafide', 'noc', 'clearance', 'signing', 'sign',
    'authority', 'attendance', 'leave', 'miss', 'class', 'absent', 'assignment', 'assignments',
    'lab', 'homework', 'task', 'weekly', 'mentor', 'guide', 'project', 'code', 'github', 'repo',
    'deadline', 'due', 'date', 'last', 'when', 'wifi', 'internet', 'lan', 'login', 'connect',
    'bug', 'technical', 'error', 'server', 'payments', 'fee', 'money', 'bank', 'announce',
    'news', 'update', 'portal', 'samagama', 'vled', 'yasha', 'yaksha', 'rosetta', 'journal',
    'thinking', 'routine', 'vibe', 'lms', 'course', 'courses', 'registration', 'register',
    'orientation', 'kickoff', 'zoom', 'standup', 'standups', 'meeting', 'team', 'group',
    'partner', 'teammate', 'member', 'appeal', 'reconsider', 'withdrawal', 'withdraw',
    'academics', 'registrar', 'office', 'credits', 'grade', 'evaluation', 'proctoring'
  ];
  
  commonWords.forEach(w => vocab.add(w.toLowerCase()));
  
  Object.keys(SYNONYMS).forEach(k => vocab.add(k.toLowerCase()));
  Object.values(SYNONYMS).flat().forEach(v => vocab.add(v.toLowerCase()));
  
  threads.forEach(thread => {
    const text = `${thread.title} ${thread.category} ${thread.body || ''}`.toLowerCase();
    const words = text.replace(/[^\w\s]/g, '').split(/\s+/);
    words.forEach(w => {
      if (w.length > 2) {
        vocab.add(w);
      }
    });
  });
  
  return vocab;
}

// Performs spelling correction using distance comparison against vocabulary
function correctSpelling(query, vocab) {
  const words = query.split(/\s+/);
  const correctedWords = [];
  const corrections = [];

  for (let word of words) {
    const match = word.match(/^([^\w]*)(.*?)([^\w]*)$/);
    if (!match) {
      correctedWords.push(word);
      continue;
    }
    const leadPunct = match[1];
    const cleanWord = match[2].toLowerCase();
    const trailPunct = match[3];

    // Skip short words, numbers, stopwords, or words already in the vocabulary
    if (cleanWord.length <= 3 || /^\d+$/.test(cleanWord) || STOPWORDS.has(cleanWord) || vocab.has(cleanWord)) {
      correctedWords.push(word);
      continue;
    }

    let bestMatch = null;
    let minDistance = 3; 

    for (const vocabWord of vocab) {
      if (Math.abs(vocabWord.length - cleanWord.length) >= minDistance) continue;
      
      const dist = levenshteinDistance(cleanWord, vocabWord);
      if (dist < minDistance) {
        minDistance = dist;
        bestMatch = vocabWord;
      }
    }

    if (bestMatch && minDistance <= 2) {
      let correctedClean = bestMatch;
      if (match[2][0] === match[2][0].toUpperCase()) {
        correctedClean = bestMatch.charAt(0).toUpperCase() + bestMatch.slice(1);
      }
      correctedWords.push(leadPunct + correctedClean + trailPunct);
      corrections.push({ original: cleanWord, corrected: bestMatch });
    } else {
      correctedWords.push(word);
    }
  }

  return {
    correctedQuery: correctedWords.join(' '),
    corrections
  };
}

// Moved from chatbot.js to consolidate NLP logic
function classifyQueryCategory(query) {
  const text = query.toLowerCase();
  if (text.includes('intern') || text.includes('vins') || text.includes('vicharanashala') || text.includes('stipend')) {
    return 'Internship';
  }
  if (text.includes('select') || text.includes('round') || text.includes('interview') || text.includes('test') || text.includes('eligib')) {
    return 'Selection Process';
  }
  if (text.includes('cert') || text.includes('bonafide') || text.includes('clearance') || text.includes('sign') || text.includes('letter') || text.includes('noc')) {
    return 'Certificates';
  }
  if (text.includes('attend') || text.includes('leave') || text.includes('miss') || text.includes('class') || text.includes('absent')) {
    return 'Attendance';
  }
  if (text.includes('assign') || text.includes('lab') || text.includes('homework') || text.includes('task') || text.includes('weekly')) {
    return 'Assignments';
  }
  if (text.includes('mentor') || text.includes('guide')) {
    return 'Mentorship';
  }
  if (text.includes('project') || text.includes('code') || text.includes('github') || text.includes('repo')) {
    return 'Projects';
  }
  if (text.includes('deadline') || text.includes('due') || text.includes('date') || text.includes('last date') || text.includes('when')) {
    return 'Deadlines';
  }
  if (text.includes('wifi') || text.includes('internet') || text.includes('lan') || text.includes('login') || text.includes('connect') || text.includes('bug') || text.includes('technical') || text.includes('error') || text.includes('server')) {
    return 'Technical Issues';
  }
  if (text.includes('pay') || text.includes('money') || text.includes('stipend') || text.includes('bank') || text.includes('fee')) {
    return 'Payments';
  }
  if (text.includes('announce') || text.includes('news') || text.includes('update')) {
    return 'Announcements';
  }
  return 'General Queries';
}

// Computes a semantic matching score using token Jaccard similarity, soft synonym matching, category alignment, and consecutive word phrase bonuses
function computeSemanticScore(queryTokens, queryClean, thread, queryCategory) {
  const threadTitleTokens = tokenize(thread.title);
  const threadCategory = thread.category;
  
  const threadTitleClean = thread.title.toLowerCase().replace(/[^\w\s]/g, '').trim();
  if (queryClean === threadTitleClean) {
    return 1.0;
  }

  const qSet = new Set(queryTokens);
  const tSet = new Set(threadTitleTokens);
  
  let intersectionCount = 0;
  qSet.forEach(token => {
    if (tSet.has(token)) {
      intersectionCount++;
    }
  });
  
  let synonymMatches = 0;
  qSet.forEach(qToken => {
    if (!tSet.has(qToken)) {
      let foundSyn = false;
      for (const tToken of tSet) {
        for (const base of Object.keys(SYNONYMS)) {
          const syns = [base, ...SYNONYMS[base]];
          if (syns.includes(qToken) && syns.includes(tToken)) {
            synonymMatches += 0.5;
            foundSyn = true;
            break;
          }
        }
        if (foundSyn) break;
      }
    }
  });

  const unionCount = qSet.size + tSet.size - intersectionCount;
  if (unionCount === 0) return 0;
  
  let score = (intersectionCount + synonymMatches) / unionCount;

  // Category matching boost
  if (threadCategory && queryCategory && threadCategory.toLowerCase() === queryCategory.toLowerCase()) {
    score += 0.15;
  }

  // Phrase (consecutive word sequence) matching
  const queryWords = queryClean.split(/\s+/).filter(w => !STOPWORDS.has(w) && w.length > 2);
  const titleClean = thread.title.toLowerCase();

  let phraseBonus = 0;
  for (let i = 0; i < queryWords.length - 1; i++) {
    const bigram = `${queryWords[i]} ${queryWords[i+1]}`;
    if (titleClean.includes(bigram)) {
      phraseBonus += 0.1;
    }
  }

  // Substring match bonus: query keywords that appear as substrings in the title
  // Handles natural language questions ("how do i join") vs keyword titles ("How to join VINS")
  let substringBonus = 0;
  for (const token of queryTokens) {
    if (!STOPWORDS.has(token) && token.length > 1 && token.length < 10 && titleClean.includes(token)) {
      substringBonus += 0.25;
    }
  }

  score += phraseBonus + Math.min(0.55, substringBonus);

  return Math.min(1.0, score);
}

/**
 * Checks a title against active FAQ threads for similarity.
 * Returns sorted list of potential duplicate threads with score.
 */
async function checkSemanticSimilarity(newTitle, category = null) {
  try {
    const query = { status: 'active', isMerged: false };
    if (category) {
      query.category = category;
    }
    const threads = await FAQThread.find(query);
    
    // Spelling correction and category detection for comparison
    const vocab = buildVocabulary(threads);
    const { correctedQuery } = correctSpelling(newTitle, vocab);
    
    const queryTokens = tokenize(correctedQuery);
    const queryClean = correctedQuery.toLowerCase().replace(/[^\w\s]/g, '').trim();
    const queryCategory = category || classifyQueryCategory(correctedQuery);
    
    if (queryTokens.length === 0) return [];

    const suggestions = threads.map(thread => {
      const score = computeSemanticScore(queryTokens, queryClean, thread, queryCategory);
      return {
        thread,
        score: Math.round(score * 100) / 100
      };
    });

    // Filter threads with a similarity score > 0.15 and sort descending
    return suggestions
      .filter(item => item.score > 0.15)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5); // top 5 suggestions
  } catch (error) {
    console.error('Similarity check error:', error.message);
    return [];
  }
}

/**
 * Scores questions/answers content for quality, spam, toxicity, and relevance.
 */
function scoreContentModeration(text, title = '') {
  const combinedText = `${title} ${text}`.toLowerCase();
  
  // Toxicity detection
  const toxicWords = ['spammy', 'idiot', 'stupid', 'bastard', 'cheat', 'fuck', 'shit', 'scam', 'fraud', 'useless', 'garbage', 'crap', 'wtf', 'moron'];
  const tokens = combinedText.replace(/[^\w\s]/g, '').split(/\s+/);
  let toxicCount = 0;
  const toxicWordsFound = [];
  toxicWords.forEach(word => {
    if (tokens.includes(word)) {
      toxicCount++;
      toxicWordsFound.push(word);
    }
  });
  
  // CAPS LOCK filter increases toxicity slightly (represents shouting)
  const isCaps = text.length > 10 && text === text.toUpperCase();
  const toxicityScore = Math.min(1.0, (toxicCount * 0.4) + (isCaps ? 0.2 : 0));
  
  // Spam probability heuristics
  const repetitiveText = text.length > 20 && /(.)\1{4,}/.test(combinedText); // e.g. "aaaaa"
  const excessiveLinks = (combinedText.match(/https?:\/\//g) || []).length > 2;
  const wordCount = text.split(/\s+/).length;
  const isTooShort = wordCount < 3;
  const spamProbability = Math.min(1.0, 
    (repetitiveText ? 0.6 : 0) + 
    (excessiveLinks ? 0.3 : 0) + 
    (isTooShort ? 0.2 : 0)
  );

  // Quality score: encourages well-written, longer texts, code-formatting, bullet points
  const hasCode = text.includes('`') || text.includes('code');
  const hasBullets = text.includes('-') || text.includes('*') || text.includes('\n');
  const wordLengthBonus = Math.min(0.4, wordCount / 100);
  const qualityScore = Math.min(1.0, 
    0.2 + 
    wordLengthBonus + 
    (hasCode ? 0.2 : 0) + 
    (hasBullets ? 0.2 : 0) - 
    (toxicityScore * 0.4) - 
    (spamProbability * 0.4)
  );

  const flaggedReasons = [];
  if (toxicityScore >= 0.4) {
    let reason = `Toxicity score of ${(toxicityScore * 100).toFixed(0)}% exceeds the safety limit (40%).`;
    if (toxicWordsFound.length > 0) {
      reason += ` Flagged terms: ${toxicWordsFound.map(w => `"${w}"`).join(', ')}.`;
    }
    if (isCaps) {
      reason += ` Excessive capitalized words (shouting pattern).`;
    }
    flaggedReasons.push(reason);
  }
  if (spamProbability >= 0.3) {
    let spamDetails = [];
    if (repetitiveText) spamDetails.push('repetitive character patterns');
    if (excessiveLinks) spamDetails.push('too many external links');
    if (isTooShort) spamDetails.push('text is too short (must be at least 3 words)');
    flaggedReasons.push(`Spam probability of ${(spamProbability * 100).toFixed(0)}% exceeds the safety limit (30%). Triggered rules: ${spamDetails.join(', ') || 'suspicious activity'}.`);
  }

  return {
    spamProbability: Math.round(spamProbability * 100) / 100,
    toxicityScore: Math.round(toxicityScore * 100) / 100,
    relevanceScore: 1.0, // base relevance, modified dynamically during RAG
    confidenceScore: Math.round((1 - toxicityScore) * 100) / 100,
    qualityScore: Math.max(0.0, Math.round(qualityScore * 100) / 100),
    flaggedReasons
  };
}

/**
 * Basic RAG Chatbot:
 * 1. Takes user natural query.
 * 2. Compiles dynamic vocabulary and corrects spelling.
 * 3. Matches against FAQThread schema using semantic overlap.
 * 4. Finds top answer from the best matching thread.
 * 5. If similarity is low, fallback recommendation to ask a community question.
 */
async function retrieveRAGResponse(userQuery) {
  try {
    // Two-pass search: first check official FAQs (authoritative), then fall back to all threads
    const [officialThreads, allThreads] = await Promise.all([
      FAQThread.find({ status: 'active', isMerged: false, isOfficial: true })
        .select('title body category faqNumber')
        .lean(),
      FAQThread.find({ status: 'active', isMerged: false })
        .select('title body category faqNumber')
        .lean()
    ]);

    // Build vocab from all threads for spell correction
    const vocab = buildVocabulary(allThreads);
    const { correctedQuery, corrections } = correctSpelling(userQuery, vocab);
    
    const queryTokens = tokenize(correctedQuery);
    if (queryTokens.length === 0) {
      return {
        answer: "I couldn't identify any clear topics in your query. Could you please specify your question in more detail? (e.g., 'What is the attendance policy?' or 'How do I submit certificates?')",
        confidence: 0,
        threadId: null,
        suggestThread: true
      };
    }
    
    const queryClean = correctedQuery.toLowerCase().replace(/[^\w\s]/g, '').trim();
    const queryCategory = classifyQueryCategory(correctedQuery);
    
    // PASS 1: Search official FAQs first (authoritative, should be consulted first)
    const officialMatches = officialThreads
      .map(thread => ({ thread, score: computeSemanticScore(queryTokens, queryClean, thread, queryCategory) }))
      .filter(match => match.score > 0.15)
      .sort((a, b) => b.score - a.score);

    let bestMatch = officialMatches[0]?.thread || null;
    let highestScore = officialMatches[0]?.score || 0;
    let suggestions = officialMatches.slice(0, 2).map(match => ({
      threadId: match.thread._id,
      title: match.thread.title,
      category: getDisplayGroup(match.thread.category),
      confidence: Math.round(match.score * 100)
    }));

    // PASS 2: Fall back to all threads if no good official match (score < 0.2)
    if (!bestMatch || highestScore < 0.2) {
      const allMatches = allThreads
        .map(thread => ({ thread, score: computeSemanticScore(queryTokens, queryClean, thread, queryCategory) }))
        .filter(match => match.score > 0.15)
        .sort((a, b) => b.score - a.score);
      if (allMatches.length > 0) {
        bestMatch = allMatches[0].thread;
        highestScore = allMatches[0].score;
        suggestions = allMatches.slice(0, 2).map(match => ({
          threadId: match.thread._id,
          title: match.thread.title,
          category: getDisplayGroup(match.thread.category),
          confidence: Math.round(match.score * 100)
        }));
      }
    }

    // RAG confidence threshold: 0.2 for official FAQs, 0.35 for community fallback
    const activeThreshold = bestMatch?.isOfficial ? 0.2 : 0.35;
    if (bestMatch && highestScore >= activeThreshold) {
      const chosenAnswer = await Answer.findOne({ threadId: bestMatch._id })
        .sort({ isVerified: -1, isPinned: -1, createdAt: 1 })
        .select('body')
        .lean();

      const chatbotAnswer = chosenAnswer
        ? compactAnswer(chosenAnswer.body)
        : 'A related question exists, but it does not have an answer yet.';

      // Build spelling correction prefix if corrections were made
      let spellingCorrectionNotice = "";
      if (corrections.length > 0) {
        const correctionMsg = corrections.map(c => `"${c.original}" ➔ "${c.corrected}"`).join(', ');
        spellingCorrectionNotice = `*(Spelling corrected: ${correctionMsg})*\n\n`;
      }

      return {
        answer: `${spellingCorrectionNotice}${chatbotAnswer}`,
        confidence: Math.round(highestScore * 100),
        threadId: bestMatch._id,
        faqNumber: bestMatch.faqNumber || null,
        category: getDisplayGroup(bestMatch.category),
        sourceTitle: bestMatch.title,
        suggestions,
        suggestThread: highestScore < 0.45
      };
    }

    // Default Fallback
    let spellingCorrectionNotice = "";
    if (corrections.length > 0) {
      const correctionMsg = corrections.map(c => `"${c.original}" ➔ "${c.corrected}"`).join(', ');
      spellingCorrectionNotice = `*(Spelling corrected: ${correctionMsg})*\n\n`;
    }

    return {
      answer: `${spellingCorrectionNotice}No confident answer found. Try a related FAQ or ask the community.`,
      confidence: Math.round(highestScore * 100),
      threadId: null,
      faqNumber: null,
      suggestions,
      suggestThread: true
    };
  } catch (error) {
    console.error('RAG chatbot error:', error.message);
    return {
      answer: "An error occurred while processing your request. Please try again later.",
      confidence: 0,
      threadId: null,
      suggestThread: false
    };
  }
}

/**
 * Auto-Analyzer: Analyzes a newly submitted or edited FAQ and generates
 * smart metadata — category, priority, tags, keywords, summary,
 * and structured body formatting.
 */
function analyzeFAQ(title, body) {
  const text = `${title} ${body}`.toLowerCase();

  // ── 1. Keywords ───────────────────────────────────────────────────────
  const vocab = new Set([
    'internship', 'vins', 'vicharanashala', 'noc', 'certificate', 'bonafide', 'attendance',
    'leave', 'stipend', 'payment', 'deadline', 'assignment', 'lab', 'mentor', 'project',
    'github', 'wifi', 'technical', 'bug', 'error', 'login', 'selection', 'interview',
    'offer', 'stipend', ' Joining ', 'joining', 'joining date', 'start date', 'profile',
    'resume', 'portfolio', 'salary', 'recruiter', 'vibe', 'portal', 'vled', 'samagama',
    'announcement', 'meeting', 'standup', 'stand-ups', 'schedule', 'timing', 'code',
    'repo', 'branch', 'commit', 'pull request', 'review', 'feedback', 'evaluation',
    'grade', 'marks', 'credit', 'report', 'submission', 'upload', 'download', 'file',
    'document', 'pdf', 'screenshot', 'form', 'google', 'form', 'link', 'zoom', 'meet',
    'doubt', 'question', 'help', 'support', 'issue', 'problem', 'clarification',
    'important', 'urgent', 'asap', 'emergency', 'immediately', 'critical'
  ]);

  const keywordCandidates = new Set();
  const allWords = text.replace(/[^\w\s]/g, '').split(/\s+/);
  allWords.forEach(w => {
    if (w.length > 3 && vocab.has(w)) keywordCandidates.add(w);
  });

  const keywords = [...keywordCandidates].slice(0, 10);

  // ── 2. Category Hint (override from classifyQueryCategory) ────────────
  const categoryHint = classifyQueryCategory(`${title} ${body}`);

  // ── 3. Priority Detection ─────────────────────────────────────────────
  const urgencySignals = [
    { pattern: /urgent|asap|immediately|emergency|critical|important|deadline/i, score: 3 },
    { pattern: /how long|when will|by when|within|before|today|tonight|tomorrow/i, score: 2 },
    { pattern: /can i|am i allowed|permission|approval|sign|clearance/i, score: 1 },
    { pattern: /what is|how do|how to|where is|why|i need/i, score: 0 }
  ];

  let priorityScore = urgencySignals.reduce((acc, s) => {
    return acc + (s.pattern.test(text) ? s.score : 0);
  }, 0);

  let priority = 'medium';
  if (priorityScore >= 4) priority = 'urgent';
  else if (priorityScore >= 2) priority = 'high';
  else if (priorityScore <= 0 && /what is|how do|explain|describe/i.test(text)) priority = 'low';

  // ── 4. Summary ─────────────────────────────────────────────────────────
  const questionWords = /\b(how|what|when|where|why|who|which|can|could|should|would|is|are|do|does)\b/;
  const firstQuestionMatch = body.match(questionWords);
  const bodyClean = body.replace(/\s+/g, ' ').trim();
  let summary = '';
  if (firstQuestionMatch) {
    const qidx = body.indexOf(firstQuestionMatch[0]);
    const afterQ = bodyClean.slice(qidx);
    const endPunct = afterQ.search(/[.!?] /);
    summary = endPunct > 10 && endPunct < 200
      ? afterQ.slice(0, endPunct + 1).trim()
      : bodyClean.slice(0, Math.min(150, bodyClean.length)).trim();
  } else {
    summary = bodyClean.slice(0, Math.min(150, bodyClean.length)).trim();
  }

  // ── 5. Structured Body Parsing ────────────────────────────────────────
  const lines = body.split('\n').map(l => l.trim()).filter(Boolean);
  const steps = [];
  let instruction = null;
  let note = null;

  const instructionRx = /^(how to|how do i|steps? to|process|to|simply|just|here'?s|follow these|here are)/i;
  const noteRx = /^(note|important|note:|important:|warning|caution|tip|pro tip|hint|note -)/i;

  const instructionCandidates = lines.filter(l => instructionRx.test(l));
  if (instructionCandidates.length > 0) {
    instruction = instructionCandidates[0].replace(/^[\d.)*-]+\s*/, '').trim();
    lines.splice(lines.indexOf(instructionCandidates[0]), 1);
  }

  const noteCandidates = lines.filter(l => noteRx.test(l));
  if (noteCandidates.length > 0) {
    note = noteCandidates[0].replace(/^[\d.)*-]+\s*/, '').trim();
    lines.splice(lines.indexOf(noteCandidates[0]), 1);
  }

  lines.forEach(line => {
    const cleaned = line.replace(/^[\d.)*-]+\s*/, '').trim();
    if (cleaned.length > 10) steps.push(cleaned);
  });

  // ── 6. Tags ───────────────────────────────────────────────────────────
  const tagRules = [
    { keywords: ['noc', 'certificate', 'bonafide', 'signing', 'clearance'], tag: 'NOC & Certificates' },
    { keywords: ['stipend', 'payment', 'salary', 'bank', 'fee'], tag: 'Payments & Salary' },
    { keywords: ['attendance', 'leave', 'absent', 'exemption', 'class', 'standup'], tag: 'Attendance' },
    { keywords: ['deadline', 'due date', 'last date', 'submit', 'submission'], tag: 'Deadlines' },
    { keywords: ['assignment', 'lab', 'homework', 'task', 'weekly'], tag: 'Assignments' },
    { keywords: ['project', 'github', 'code', 'repo', 'pull request'], tag: 'Projects & Code' },
    { keywords: ['mentor', 'guide', 'supervisor'], tag: 'Mentorship' },
    { keywords: ['wifi', 'technical', 'bug', 'error', 'server', 'login', 'portal'], tag: 'Technical Support' },
    { keywords: ['internship', 'intern', 'joining', 'start date', 'profile'], tag: 'Internship' },
    { keywords: ['selection', 'interview', 'offer', 'process'], tag: 'Selection Process' },
    { keywords: ['announcement', 'news', 'update', 'notice'], tag: 'Announcements' },
    { keywords: ['vibe', 'vled', 'portal', 'lms', 'course'], tag: 'Platform' },
    { keywords: ['doubt', 'help', 'support', 'question'], tag: 'Help & Support' }
  ];

  const tags = [];
  tagRules.forEach(rule => {
    if (rule.keywords.some(k => text.includes(k))) tags.push(rule.tag);
  });

  // Add category as a tag
  if (categoryHint !== 'General Queries') tags.push(categoryHint);

  // ── 7. Confidence Score ────────────────────────────────────────────────
  const hasTitle = title.trim().length > 5;
  const hasBody = body.trim().length > 20;
  const hasSteps = steps.length > 0;
  const hasKeywords = keywords.length > 0;
  const isQuestion = /^(what|how|why|when|where|who|can|should|is|do)/i.test(title.trim());
  const confidence = Math.min(1.0, (
    (hasTitle ? 0.1 : 0) +
    (hasBody ? 0.2 : 0) +
    (hasSteps ? 0.15 : 0) +
    (hasKeywords ? 0.15 : 0) +
    (isQuestion ? 0.1 : 0) +
    (tags.length > 0 ? 0.15 : 0) +
    (priority !== 'medium' ? 0.15 : 0)
  ));

  return {
    categoryHint,
    priority,
    priorityScore,
    keywords,
    tags: [...new Set(tags)].slice(0, 8),
    summary: summary || bodyClean.slice(0, 150).trim(),
    structuredBody: {
      instruction: instruction || null,
      steps: steps.slice(0, 10),
      note: note || null
    },
    analysisMetadata: {
      analyzedAt: new Date(),
      confidence: Math.round(confidence * 100) / 100,
      categoryHint,
      priorityScore,
      keywords
    }
  };
}

/**
 * Generates paraphrased versions of a user query to improve search recall.
 * Strategy:
 *  1. Synonym canonicalisation  – "how do i get noc" → "how do i noc" (get→noc)
 *  2. Question-form flip        – "what is stipend policy" → "how do i stipend policy"
 *  3. Keyword-strip form         – removes question words & pronouns for pure keyword match
 */
function paraphraseQuery(query) {
  const clean = query.toLowerCase().replace(/[^\w\s]/g, '').trim();
  if (clean.length < 4) return [];

  const tokens = clean.split(/\s+/).filter(t => t.length > 1 && !STOPWORDS.has(t));
  const paraphrases = [];

  // ── 1. Synonym canonicalisation ───────────────────────────────────────
  let para1 = clean;
  tokens.forEach(token => {
    for (const [base, syns] of Object.entries(SYNONYMS)) {
      if (syns.includes(token) && !para1.includes(base)) {
        const re = new RegExp(`\\b${token}\\b`, 'g');
        para1 = para1.replace(re, base);
        break;
      }
    }
  });
  if (para1 !== clean) paraphrases.push(para1);

  // ── 2. Question-form flips (handles common "how ↔ what" / "can ↔ am i allowed" pairs) ──
  // These transformations are only applied when the captured fragment forms a coherent noun-phrase.
  const okNounPhrase = fragment => {
    // Fragment should not start with a bare verb that makes the flipped form nonsensical
    const badStarts = /^(get|give|take|do|make|go|come|see|know|find|submit|apply|pay|login|connect|join|leave|miss)\b/i;
    return !badStarts.test(fragment);
  };

  const starters = [
    { pattern: /^how do i (.+)/i, replacer: m => `what is ${m}`, condition: okNounPhrase },
    { pattern: /^how can i (.+)/i, replacer: m => `what is needed for ${m}`, condition: okNounPhrase },
    { pattern: /^can i (.+)/i, replacer: m => `am i allowed to ${m}` },
    { pattern: /^do i need to (.+)/i, replacer: m => `is it required to ${m}` },
    { pattern: /^where do i (.+)/i, replacer: m => `how to ${m}` },
    { pattern: /^when do i (.+)/i, replacer: m => `what is the deadline for ${m}` },
    { pattern: /^why (.+)/i, replacer: m => `reason for ${m}` },
    { pattern: /^who (.+)/i, replacer: m => `who is responsible for ${m}` },
    // Reverse flips (only if noun phrase checks pass)
    { pattern: /^what is (.+)/i, replacer: m => `how do i ${m}`, condition: okNounPhrase },
  ];

  starters.forEach(({ pattern, replacer, condition }) => {
    const match = clean.match(pattern);
    if (!match) return;
    const rest = match[1];
    if (condition && !condition(rest)) return;
    try {
      const result = replacer(rest);
      if (result && result.length > 2 && !paraphrases.includes(result)) {
        paraphrases.push(result);
      }
    } catch { /* skip */ }
  });

  // ── 3. Keyword-strip form ───────────────────────────────────────────────
  const stripped = clean
    .replace(/\b(how|what|when|where|why|who|which|can|could|should|would|do|does|is|are|was|were|am|if)\b/g, '')
    .replace(/\b(i|my|me|we|our|the|a|an|to|for|in|on|at|by)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (stripped.length > 3 && stripped !== clean && !paraphrases.includes(stripped)) {
    paraphrases.push(stripped);
  }

  return paraphrases.slice(0, 3);
}

module.exports = {
  checkSemanticSimilarity,
  scoreContentModeration,
  retrieveRAGResponse,
  classifyQueryCategory,
  tokenize,
  paraphraseQuery,
  analyzeFAQ
};
