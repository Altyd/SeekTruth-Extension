if (window.location.hostname.includes('news')) {
  const button = document.createElement('button');
  button.textContent = 'Analyze This Article';
  button.style.position = 'fixed';
  button.style.top = '10px';  // Move it to the top
  button.style.right = '10px';  // Keep it on the right
  button.style.zIndex = '10000';
  button.style.padding = '10px 20px';
  button.style.backgroundColor = '#2a9d8f';
  button.style.color = 'white';
  button.style.border = 'none';
  button.style.borderRadius = '5px';
  button.style.cursor = 'pointer';
  document.body.appendChild(button);

  button.addEventListener('click', () => {
    // Open the popup
    chrome.runtime.sendMessage({ action: 'openPopup' });
  });
}
// Listen for messages from the popup script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'highlight') {
    highlightText(message.biasContent);
  }
});
//
function highlightText(biasContent) {
  const contentParts = biasContent.split(';');

  contentParts.forEach(part => {
    let [text, label] = part.split(':').map(s => s.trim());
    text = text.replace(/^"|"$/g, ''); // Remove quotes
    const normalizedText = text.toLowerCase().replace(/\s+/g, ' ').trim();
    const color = label === 'Neutral' ? 'green' : label === 'Bias' ? 'red' : 'orange';

    console.log(`Searching for: "${text}" (normalized: "${normalizedText}")`);

    const treeWalker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      { 
        acceptNode: (node) => {
          const parentTag = node.parentNode.nodeName.toLowerCase();
          return (parentTag !== 'script' && parentTag !== 'style') ?
            NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
      }
    );

    let found = false;

    while (treeWalker.nextNode()) {
      const node = treeWalker.currentNode;
      const nodeText = node.nodeValue;
      const normalizedNodeText = nodeText.toLowerCase().replace(/\s+/g, ' ').trim();

      if (normalizedNodeText.includes(normalizedText)) {
        const regex = new RegExp(`(${escapeRegExp(text)})`, 'gi');
        const newSpan = document.createElement('span');
        newSpan.innerHTML = nodeText.replace(regex, `<span style="background-color: ${color};" title="${label}">$1</span>`);
        node.parentNode.replaceChild(newSpan, node);
        found = true;
        break; // Adjust if multiple matches are needed
      }
    }

    if (!found) {
      console.warn(`Text not found: "${text}"`);
    }
  });
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Handle messages from background script
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "displayAnalysis") {
    displayAnalysis(message.selectedText, message.analysisData);
  }
});

// Create and insert analysis UI
function displayAnalysis(selectedText, analysisData) {
  const selection = window.getSelection();
  if (!selection.rangeCount) return;

  const range = selection.getRangeAt(0);
  const analysisElement = createAnalysisElement(selectedText, analysisData);
  
  // Insert after selection
  range.collapse(false);
  range.insertNode(analysisElement);

  // Clear the original selection
  selection.removeAllRanges();
  
  // Optional: Remove visual highlight
  document.getSelection().empty();
}

// Generate analysis UI components
function createAnalysisElement(selectedText, analysisData) {
  const container = document.createElement('div');
  container.className = 'st-analysis-container';

  // Scanned text
  const scannedText = document.createElement('div');
  scannedText.className = 'st-scanned-text';
  scannedText.textContent = selectedText;
  
  // Toggle header
  const header = document.createElement('div');
  header.className = 'st-toggle-header';
  header.innerHTML = `
    <span class="st-arrow">▼</span>
    <span class="st-toggle-text">Analysis</span>
  `;

  // Analysis details
  const details = document.createElement('div');
  details.className = 'st-analysis-details';
  details.innerHTML = `
    <div><strong>Bias:</strong> ${analysisData.bias}</div>
    <div><strong>Political Leaning:</strong> ${analysisData.politicalLeaning}</div>
    <div><strong>Reasoning:</strong> ${analysisData.biasReasoning}</div>
  `;

  // Toggle functionality
  header.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent event bubbling
    details.classList.toggle('st-hidden');
    header.querySelector('.st-arrow').textContent = 
      details.classList.contains('st-hidden') ? '▶' : '▼';
  });

  // Assemble components
  container.append(header, details);
  return container;
}
//


//ANAYLSIS OF PARAGRAPH
// Add this at the top of the file
const ANALYZE_TRIGGER_WORDS = 3; // Number of words to highlight

// Initialize paragraph observers
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// Optimized paragraph observer
function initParagraphObserver() {
  const observer = new MutationObserver(debounce((mutations) => {
    const paragraphs = new Set();
    
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach(node => {
        // Direct paragraph nodes
        if (node.nodeType === 1 && node.matches('p')) {
          paragraphs.add(node);
        }
        // Nested paragraphs
        if (node.nodeType === 1 && node.querySelectorAll) {
          node.querySelectorAll('p').forEach(p => paragraphs.add(p));
        }
      });
    });

    paragraphs.forEach(processParagraph);
  }, 100)); // 100ms debounce window

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Process existing paragraphs in chunks
  const existingParas = [...document.querySelectorAll('p')];
  const processChunk = () => {
    const batch = existingParas.splice(0, 10); // Process 10 at a time
    batch.forEach(processParagraph);
    if (existingParas.length > 0) {
      requestIdleCallback(processChunk, { timeout: 500 });
    }
  };
  requestIdleCallback(processChunk, { timeout: 500 });
}


function processParagraph(paragraph) {
  if (paragraph.dataset.stProcessed) return;
  paragraph.dataset.stProcessed = "true";
  
  // Create wrapper and preserve original positioning
  const wrapper = document.createElement('div');
  wrapper.className = 'st-paragraph-wrapper';
  paragraph.parentNode.insertBefore(wrapper, paragraph);
  wrapper.appendChild(paragraph);

  // Create analysis trigger button
  const trigger = document.createElement('div');
  trigger.className = 'st-analysis-trigger';
  trigger.innerHTML = `
    <svg class="st-search-icon" viewBox="0 0 512 512" width="16" height="16">
      <path d="M416 208c0 45.9-14.9 88.3-40 122.7L502.6 457.4c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L330.7 376c-34.4 25.2-76.8 40-122.7 40C93.1 416 0 322.9 0 208S93.1 0 208 0S416 93.1 416 208zM208 352a144 144 0 1 0 0-288 144 144 0 1 0 0 288z"/>
    </svg>
  `;
  wrapper.appendChild(trigger);

  // Process text content without breaking HTML
  const fullText = paragraph.textContent;
  const triggerWordCount = ANALYZE_TRIGGER_WORDS;

  // Find end index of trigger words using original whitespace
  const wordRegex = /\S+\s*/g;
  let match;
  let wordCounter = 0;
  let endIndex = 0;

  while ((match = wordRegex.exec(fullText)) !== null) {
    wordCounter++;
    endIndex = match.index + match[0].length;
    if (wordCounter === triggerWordCount) break;
  }

  if (wordCounter < triggerWordCount) return;

  // Locate the range in the DOM nodes
  const treeWalker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);
  let accumulatedLength = 0;
  let startNode = null, startOffset = 0, endNode = null, endOffset = 0;

  while (treeWalker.nextNode()) {
    const node = treeWalker.currentNode;
    const nodeLength = node.textContent.length;
    if (accumulatedLength <= endIndex && accumulatedLength + nodeLength >= endIndex) {
      startNode = node;
      startOffset = 0;
      endNode = node;
      endOffset = endIndex - accumulatedLength;
      break;
    }
    accumulatedLength += nodeLength;
  }

  if (!startNode) return;

  // Create and apply highlight span
  const range = document.createRange();
  range.setStart(startNode, startOffset);
  range.setEnd(endNode, endOffset);

  const highlightSpan = document.createElement('span');
  highlightSpan.className = 'st-highlight-words';

  try {
    range.surroundContents(highlightSpan);
  } catch (e) {
    console.error('Could not highlight text:', e);
    return;
  }

  // Add click handler
  wrapper.addEventListener('click', async (e) => {
    if (e.target.closest('.st-analysis-trigger')) {
      trigger.style.opacity = '0.5';
      try {
        const response = await chrome.runtime.sendMessage({
          action: "analyzeParagraph",
          text: fullText
        });
        if (response?.analysisData) {
          displayAnalysis(fullText, response.analysisData, wrapper);
        }
      } finally {
        trigger.style.opacity = '';
      }
    }
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initParagraphObserver);
} else {
  initParagraphObserver();
}

