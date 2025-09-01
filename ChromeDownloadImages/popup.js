document.addEventListener('DOMContentLoaded', async () => {
  const urlBaseInput = document.getElementById('urlBase');
  const extTypeInput = document.getElementById('extType');
  const mediaList = document.getElementById('mediaList');

  let mediaCountLabel = document.createElement('p');
  mediaCountLabel.style.fontWeight = "bold";
  mediaList.parentNode.insertBefore(mediaCountLabel, mediaList);

  // Function to filter media by extension and URL base
  function filterMedia(urls) {
    const urlBase = urlBaseInput.value.trim();
    const extType = extTypeInput.value.trim().toLowerCase();

    return urls.filter(url => {
      if (!url) return false;
      if (urlBase && !url.includes(urlBase)) return false;

      if (extType) {
        // Check extension with regex (handles ?query or #hash too)
        const regex = new RegExp(`\\.${extType}(\\?|#|$)`, "i");
        if (!regex.test(url)) return false;
      }
      return true;
    });
  }

  // Function to render media to the popup
  function renderMedia(filteredUrls) {
    mediaList.innerHTML = ''; // Clear list
    mediaCountLabel.textContent = `Media Found: ${filteredUrls.length}`;

    filteredUrls.forEach((url, index) => {
      const div = document.createElement('div');
      div.className = 'media-item';

      const lowerUrl = url.toLowerCase();
      const isImage = /\.(jpg|jpeg|png|gif|webp|bmp|tiff|svg|avif|ico)(\?|#|$)/.test(lowerUrl);
      const isVideo = /\.(mp4|webm|avi|mkv|mov|flv|wmv)(\?|#|$)/.test(lowerUrl);

      let preview = '';
      let details = '';

      if (isImage) {
        preview = `<img id="img_${index}" src="${url}" alt="Image ${index + 1}" style="max-width: 100px; max-height: 100px; display:block; margin-bottom:5px;">`;

        // Load image to get dimensions
        const img = new Image();
        img.onload = () => {
          const w = img.naturalWidth;
          const h = img.naturalHeight;

          // Fetch size in KB/MB
          fetch(url, { method: 'HEAD' })
            .then(res => {
              const size = res.headers.get("content-length");
              let sizeText = size ? (size / 1024).toFixed(1) + " KB" : "Unknown size";
              if (size && size > 1024 * 1024) sizeText = (size / (1024 * 1024)).toFixed(2) + " MB";

              document.getElementById(`details_${index}`).textContent = `${w}x${h}, ${sizeText}`;
            })
            .catch(() => {
              document.getElementById(`details_${index}`).textContent = `${w}x${h}, size unknown`;
            });
        };
        img.src = url;

        details = `<div id="details_${index}" style="font-size:11px; color:gray;">Loading info...</div>`;
      } else if (isVideo) {
        preview = `<video src="${url}" controls style="max-width: 150px; max-height: 100px; display:block; margin-bottom:5px;"></video>`;
      }

      // Always show link
      const link = `<a href="${url}" target="_blank" style="word-break: break-all; font-size: 12px;">${url}</a>`;

      div.innerHTML = `
        <input type="checkbox" id="media_${index}" data-url="${url}">
        <label for="media_${index}">
          ${preview}
          ${link}
          ${details}
        </label>
      `;
      mediaList.appendChild(div);
    });
  }

  // Inject into active tab to collect media
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      const urls = new Set();

      // Collect <img> sources
      document.querySelectorAll('img').forEach(img => {
        if (img.src) urls.add(img.src);
        if (img.srcset) {
          img.srcset.split(',').forEach(src => {
            const cleanSrc = src.trim().split(' ')[0];
            if (cleanSrc) urls.add(cleanSrc);
          });
        }
      });

      // Collect CSS background images
      document.querySelectorAll('*').forEach(el => {
        const bg = window.getComputedStyle(el).backgroundImage;
        if (bg && bg.startsWith('url')) {
          const match = bg.match(/url\(["']?(.*?)["']?\)/);
          if (match && match[1]) urls.add(match[1]);
        }
      });

      // Collect video sources
      document.querySelectorAll('video').forEach(v => {
        if (v.src) urls.add(v.src);
        v.querySelectorAll('source').forEach(s => {
          if (s.src) urls.add(s.src);
        });
      });

      return Array.from(urls);
    }
  }, (results) => {
    const urls = results[0]?.result || [];

    function updateMediaList() {
      renderMedia(filterMedia(urls));
    }

    // Initial render
    updateMediaList();

    // React to filter changes
    urlBaseInput.addEventListener('input', updateMediaList);
    extTypeInput.addEventListener('change', updateMediaList);

    // Select all
    document.getElementById('selectAll').addEventListener('click', () => {
      document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = true);
    });

    // Download selected
    document.getElementById('downloadSelected').addEventListener('click', () => {
      document.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => {
        const url = cb.getAttribute('data-url');
        chrome.runtime.sendMessage({ url });
      });
    });
  });
});
