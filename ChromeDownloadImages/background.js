chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.url) {
    chrome.downloads.download({
      url: message.url,
      conflictAction: 'uniquify',
      saveAs: false
    });
  }
});
