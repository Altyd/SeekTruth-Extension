chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'openPopup') {
    chrome.windows.create({
      url: 'popup.html',  // The URL of the popup HTML file
      type: 'popup',
      width: 400,
      height: 600
    });
  }
});
