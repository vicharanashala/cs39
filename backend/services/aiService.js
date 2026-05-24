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
  score += phraseBonus;

  return Math.min(1.0, score);
}

/**
 * Checks a title against active FAQ threads for similarity.
 * Returns sorted list of potential duplicate threads with score.
 */
async function checkSemanticSimilarity(newTitle, category = null) {
  try {
    const query = { status: { $ne: 'spam' }, isMerged: false };
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
  const toxicWords = ['spammy', 'idiot', 'stupid', 'bastard', 'cheat', 'fuck', 'shit', 'scam', 'fraud', 'useless', 'garbage', 'crap'];
  let toxicCount = 0;
  toxicWords.forEach(word => {
    if (combinedText.includes(word)) {
      toxicCount++;
    }
  });
  
  // CAPS LOCK filter increases toxicity slightly (represents shouting)
  const isCaps = text.length > 10 && text === text.toUpperCase();
  const toxicityScore = Math.min(1.0, (toxicCount * 0.3) + (isCaps ? 0.2 : 0));
  
  // Spam probability heuristics
  const repetitiveText = text.length > 20 && /(.)\1{4,}/.test(combinedText); // e.g. "aaaaa"
  const excessiveLinks = (combinedText.match(/https?:\/\//g) || []).length > 2;
  const wordCount = text.split(/\s+/).length;
  const isTooShort = wordCount < 3;
  const spamProbability = Math.min(1.0, 
    (repetitiveText ? 0.6 : 0) + 
    (excessiveLinks ? 0.3 : 0) + 
    (isTooShort ? 0.4 : 0)
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

  return {
    spamProbability: Math.round(spamProbability * 100) / 100,
    toxicityScore: Math.round(toxicityScore * 100) / 100,
    relevanceScore: 1.0, // base relevance, modified dynamically during RAG
    confidenceScore: Math.round((1 - toxicityScore) * 100) / 100,
    qualityScore: Math.max(0.0, Math.round(qualityScore * 100) / 100)
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
    const threads = await FAQThread.find({ status: 'active', isMerged: false });
    
    // Spelling correction and category detection
    const vocab = buildVocabulary(threads);
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
    
    let bestMatch = null;
    let highestScore = 0;

    threads.forEach(thread => {
      const score = computeSemanticScore(queryTokens, queryClean, thread, queryCategory);
      if (score > highestScore) {
        highestScore = score;
        bestMatch = thread;
      }
    });

    // Score threshold: 0.25 (lenient for fuzzy search match)
    if (bestMatch && highestScore > 0.25) {
      const answers = await Answer.find({ threadId: bestMatch._id });
      let chosenAnswer = null;

      if (answers.length > 0) {
        answers.sort((a, b) => {
          if (a.isVerified && !b.isVerified) return -1;
          if (!a.isVerified && b.isVerified) return 1;
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return b.upvotes.length - a.upvotes.length;
        });
        chosenAnswer = answers[0];
      }

      const chatbotAnswer = chosenAnswer 
        ? chosenAnswer.body 
        : `It looks like the thread "${bestMatch.title}" matches your query, but there are no verified answers there yet. You can check it out or add your own thoughts!`;

      // Build spelling correction prefix if corrections were made
      let spellingCorrectionNotice = "";
      if (corrections.length > 0) {
        const correctionMsg = corrections.map(c => `"${c.original}" ➔ "${c.corrected}"`).join(', ');
        spellingCorrectionNotice = `*(Spelling corrected: ${correctionMsg})*\n\n`;
      }

      return {
        answer: `${spellingCorrectionNotice}Based on your question, I found a matching thread: **"${bestMatch.title}"** (Category: *${bestMatch.category}*).\n\n${chatbotAnswer}`,
        confidence: Math.round(highestScore * 100),
        threadId: bestMatch._id,
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
      answer: `${spellingCorrectionNotice}I checked the IIT Ropar FAQ base, but couldn't find a high-confidence match for your query. We recommend creating a new FAQ thread in the community so other students or admins can help you!`,
      confidence: Math.round(highestScore * 100),
      threadId: null,
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

module.exports = {
  checkSemanticSimilarity,
  scoreContentModeration,
  retrieveRAGResponse,
  classifyQueryCategory
};
