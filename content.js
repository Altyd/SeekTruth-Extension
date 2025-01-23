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
// Add this at the top of the file
const ANALYZE_TRIGGER_WORDS = 3; // Number of words to highlight

// Initialize paragraph observers
function initParagraphObserver() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.addedNodes) {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1 && node.matches('p')) {
            processParagraph(node);
          }
        });
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Process existing paragraphs
  document.querySelectorAll('p').forEach(processParagraph);
}

function processParagraph(paragraph) {
  if (paragraph.dataset.stProcessed) return;
  paragraph.dataset.stProcessed = "true";
  
  // Create wrapper and preserve original positioning
  const wrapper = document.createElement('div');
  wrapper.className = 'st-paragraph-wrapper';
  
  // Insert wrapper before paragraph and move paragraph into wrapper
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

  // Process text content
  const words = paragraph.textContent.split(/\s+/);
  if (words.length < ANALYZE_TRIGGER_WORDS) return;
  
  const firstWords = words.slice(0, ANALYZE_TRIGGER_WORDS).join(' ');
  const remainingText = words.slice(ANALYZE_TRIGGER_WORDS).join(' ');

  // Create highlight span
  const highlightSpan = document.createElement('span');
  highlightSpan.className = 'st-highlight-words';
  highlightSpan.textContent = firstWords + ' ';

  // Replace paragraph content
  const newContent = document.createDocumentFragment();
  newContent.append(highlightSpan, remainingText);
  paragraph.innerHTML = '';
  paragraph.appendChild(newContent);

  // Add click handler to wrapper instead of paragraph
  wrapper.addEventListener('click', async (e) => {
    // Only respond to clicks directly on the trigger
    if (e.target.closest('.st-analysis-trigger')) {
      // Handle analysis click
      trigger.style.opacity = '0.5';
      try {
        const fullText = paragraph.textContent;
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