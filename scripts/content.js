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

function highlightText(biasContent) {
  const contentParts = biasContent.split(';');

  contentParts.forEach(part => {
    let [text, label] = part.split(':');
    text = text.trim().replace(/^"|"$/g, ''); // Remove leading and trailing quotes
    const normalizedText = text.toLowerCase().replace(/\s+/g, ' ').trim(); // Normalize text
    const color = label === 'Neutral' ? 'green' : label === 'Bias' ? 'red' : 'orange';

    console.warn(`Attempting to highlight: "${text}" with label: "${label}" and normalized text: "${normalizedText}"`);

    const elements = document.querySelectorAll('body *:not(script):not(style)'); // Exclude unwanted tags
    let found = false;

    elements.forEach(el => {
      if (el.children.length === 0) {
        const elText = el.textContent.toLowerCase().replace(/\s+/g, ' ').trim(); // Normalize
        console.warn(`EL TEXT "${elText}" $\n normalized: ${normalizedText}`);
        if (elText.includes(normalizedText)) {
          const regex = new RegExp('(' + text + ')', 'gi'); // Case-insensitive regex
          el.innerHTML = el.innerHTML.replace(regex, `<span style="background-color: ${color}" title="This text is ${label}">$1</span>`);
          found = true;
        }
      }
    });

    if (!found) {
      console.warn(`Text not found for highlighting: "${text}"`);
    }
  });
}
