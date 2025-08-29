document.addEventListener('DOMContentLoaded', async () => {
  const urlBaseInput = document.getElementById('urlBase');
  const extTypeInput = document.getElementById('extType');
  const mediaList = document.getElementById('mediaList');
  
  // Function to filter media by extension and URL base
  function filterMedia(urls) {
    const urlBase = urlBaseInput.value.trim();
    const extType = extTypeInput.value.trim();
    
    // Apply URL base filtering if provided
    const filteredUrls = urls.filter(url => {
      if (urlBase && !url.includes(urlBase)) {
        return false;
      }
      if (extType && !url.toLowerCase().endsWith(`.${extType.toLowerCase()}`)) {
        return false;
      }
      return true;
    });
    
    return filteredUrls;
  }

  // Function to render media to the popup
  function renderMedia(filteredUrls) {
    mediaList.innerHTML = '';  // Clear the previous list
    filteredUrls.forEach((url, index) => {
      const div = document.createElement('div');
      div.className = 'media-item';
      div.innerHTML = `
        <input type="checkbox" id="media_${index}" data-url="${url}">
        <label for="media_${index}">
          ${url.match(/\.(jpg|jpeg|png|gif|webp|bmp|tiff|svg|avif|ico)$/i)
            ? `<img src="${url}" alt="Media ${index + 1}" style="max-width: 100px;">`
            : `<p>[Video] ${url}</p>`}
        </label>
      `;
      mediaList.appendChild(div);
    });
  }

  // Get images and videos from the active tab
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      const images = Array.from(document.images).map(img => img.src);

      // Get video URLs from <video> tags
      const videoTags = Array.from(document.querySelectorAll('video'))
        .map(v => v.src)
        .filter(Boolean);

      // Get video URLs from <source> tags inside <video>
      const sourceTags = Array.from(document.querySelectorAll('video source'))
        .map(s => s.src)
        .filter(Boolean);

      return [...images, ...videoTags, ...sourceTags];
    }
  }, (results) => {
    const urls = results[0].result || [];

    // Function to update the media list after any filter change
    function updateMediaList() {
      const filteredUrls = filterMedia(urls);
      renderMedia(filteredUrls);
    }

    // Initialize with filtered media based on current inputs
    updateMediaList();

    // Add event listeners to update the list when filters change
    urlBaseInput.addEventListener('input', updateMediaList);
    extTypeInput.addEventListener('change', updateMediaList);

    // Select all media
    document.getElementById('selectAll').addEventListener('click', () => {
      document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = true);
    });

    // Download selected media
    document.getElementById('downloadSelected').addEventListener('click', () => {
      document.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => {
        const url = cb.getAttribute('data-url');
        chrome.runtime.sendMessage({ url });
      });
    });
  });
});
