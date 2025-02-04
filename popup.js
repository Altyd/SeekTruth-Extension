let emailHash = ""; // This will store the email hashed with SHA256
let emailclean = ""; // This will store the clean email

document.addEventListener("DOMContentLoaded", async () => {
  const isLoggedIn = await checkLoginCookie();
  if (!isLoggedIn) {
    showLoginMessage();
    return; // Stop further execution if not logged in
  }

  try {
    const serverUrl = "https://www.seektruth.co.za/api/get-subscription-details";

    if (typeof emailHash === "undefined") {
      throw new Error("Email hash is not defined.");
    }

    const response = await fetch(serverUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ emailHash: emailHash }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Server Response:", data);

    const subscriptionElement = document.getElementById("subscription");
    if (subscriptionElement) {
      subscriptionElement.textContent = data.subscriptionType || "Free";
    }

    const rankElement = document.getElementById("rank");
    if (rankElement) {
      const pointsScore = data.totalScore * 10;
      let rank;
      if (pointsScore >= 200) {
        rank = "TruthSeeker";
      } else if (pointsScore >= 150) {
        rank = "Sherlock";
      } else if (pointsScore >= 100) {
        rank = "Peralta";
      } else {
        rank = "Starter";
      }
      rankElement.textContent = rank;
    }

    const scannedElement = document.getElementById("scanned");
    if (scannedElement) {
      scannedElement.textContent = String(data.analysesLeft);
    }
  } catch (error) {
    console.error("Error fetching data from server:", error);
  }
});

async function checkLoginCookie() {
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

function showLoginMessage() {
  // Hide all the existing HTML elements
  const allElements = document.body.children;
  for (let i = 0; i < allElements.length; i++) {
    allElements[i].style.display = "none";
  }

  // Create the login button and message
  const loginMessage = document.createElement("div");
  loginMessage.innerHTML = `
    <p>To use this extension, you need to log in.</p>
    <button id="loginButton">Log In</button>
  `;
  document.body.appendChild(loginMessage);

  // Add the custom CSS styles for the button
  const style = document.createElement("style");
  style.innerHTML = `
    #loginButton {
      margin-top: 10px;
      padding: 10px 20px;
      color: white;
      border: 2px solid #3e486a;
      background: none;
      cursor: pointer;
      font-size: 1rem;
      transition: 0.3s;
      border-radius: 6px;
    }

    #loginButton:hover {
      background-color: #424d71;
      border-color: #424d71;
    }
  `;
  document.head.appendChild(style);

  // Attach the event listener for the login button here
  const loginButton = document.getElementById("loginButton");
  if (loginButton) {
    loginButton.addEventListener("click", redirectToLogin);
  }
}

function redirectToLogin() {
  chrome.tabs.create({ url: "https://www.seektruth.co.za/profile" });
}

async function hashEmail(email) {
  const encoder = new TextEncoder();
  const data = encoder.encode(email);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(byte => byte.toString(16).padStart(2, "0")).join("");
  return hashHex;
}



document.getElementById('analyzeButton').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.scripting.executeScript(
    {
      target: { tabId: tab.id },
      func: scrapeArticle,
    },
    async (results) => {
      const { url, articleText, country } = results[0].result;

      const response = await fetch('https://www.seektruth.co.za/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ article: articleText, urlInput: url, emailHash: emailHash, checkthis: emailclean, country: country }),
      });

      const data = await response.json();

      // Update extension popup with results
      document.getElementById('biasScore').textContent = data.bias;
      document.getElementById('politicalLeaning').textContent = data.politicalLeaning;
      document.getElementById('biasReasoning').textContent = data.biasReasoning;
      document.getElementById('resultLink').href = `https://seektruth.co.za/scanned/${data.slug}`;
      document.getElementById('results').style.display = 'block';
      // Send bias content to the content script for highlighting
      chrome.tabs.sendMessage(tab.id, { action: 'highlight', biasContent: data.biascontent });
    }
  );
});
function scrapeArticle() {
  const url = window.location.href;
  const articleText = document.body.innerText; // Simplified article scraping
  console.log(articleText);
  const hostname = new URL(url).hostname;
  const country = hostname.split('.').pop()
  return { url, articleText, country };
}

function highlightText(biasContent) {

}
