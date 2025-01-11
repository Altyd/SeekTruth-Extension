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
