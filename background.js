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

//
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "analyzeText",
    title: "Analyze Highlighted Text",
    contexts: ["selection"], // Only show when text is highlighted
  });
});

//

async function checkLoginCookie() {
  console.warn("starting")
  return new Promise((resolve, reject) => {
    chrome.cookies.get({ url: "https://auth.seektruth.co.za", name: "a_session_66fbaec80033432c3451" }, async (cookie) => {
      if (cookie && cookie.value) {
        try {
          const sessionCookieHeader = `a_session_66fbaec80033432c3451=${cookie.value}`;
          
          const response2 = await fetch("https://auth.seektruth.co.za/v1/account", {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "Cookie": sessionCookieHeader, // Send cookies in the Cookie header
              "X-Appwrite-Project": "66fbaec80033432c3451" // Replace with your Appwrite project ID
            },
          });

          if (!response2.ok) {
            throw new Error(`Failed to fetch user details. Status: ${response2.status}`);
          }

          const userData = await response2.json();
          console.log("User Email:", userData.email); // Logging the email
            
          const hashedEmail = await hashEmail(userData.email);
          emailHash = hashedEmail;
          emailclean = userData.email;
          console.log("Hashed:", emailHash)
          // Assuming you want to set the email in an element

          resolve(true);
        } catch (error) {
          console.error("Error fetching user details:", error);
          resolve(false);
        }
      } else {
        resolve(false);
      }
    });
  });
}
async function hashEmail(email) {
  const encoder = new TextEncoder();
  const data = encoder.encode(email);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(byte => byte.toString(16).padStart(2, "0")).join("");
  return hashHex;
}

//

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  console.log("Phase 1");
  if (info.menuItemId === "analyzeText" && info.selectionText) {
    const selectedText = info.selectionText;
    console.warn("Analysis initial")
    // Get login cookie and email hash
    const loggedIn = await checkLoginCookie();
    if (!loggedIn) {
      alert("Please log in to analyze the text.");
      return;
    }
    console.log("Phase 2");
    const currentUrl = tab.url || "n/a";
    // Call your analysis API
    const response = await fetch('https://www.seektruth.co.za/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        article: selectedText,
        emailHash: emailHash,
        checkthis: emailclean,
        urlInput: currentUrl,
      }),
    });
    
    // Check response status
    if (!response.ok) {
      console.error(`API call failed. Status: ${response.status}`);
      throw new Error(`API call failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log("API Response:", data);
    // DO SOMETHING HERE
    chrome.tabs.sendMessage(tab.id, {
      action: "displayAnalysis",
      selectedText: selectedText,
      analysisData: data
    });
  }
    //
});
//
// Add this to your existing message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "analyzeParagraph") {
    analyzeParagraph(request.text)
      .then(analysisData => sendResponse({ analysisData }))
      .catch(error => sendResponse({ error: error.message }));
    return true; // Keep message channel open for async response
  }
});

async function analyzeParagraph(text) {
  const loggedIn = await checkLoginCookie();
  if (!loggedIn) throw new Error('Not logged in');
  
  const response = await fetch('https://www.seektruth.co.za/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      article: text,
      emailHash: emailHash,
      checkthis: emailclean,
      urlInput: "n/a"
    })
  });
  console.log("wtf")

  if (!response.ok) throw new Error('Analysis failed');
  return response.json();
}