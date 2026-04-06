// ═══════════════════════════════════════════════════════════════════════════
// DocMind — Client-side PDF + PPTX Parser
// Extracts text page-by-page and images as base64
// ═══════════════════════════════════════════════════════════════════════════

const PDFJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs';
const PDFJS_WORKER_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';

let pdfjsLib = null;

async function loadPdfJs() {
  if (pdfjsLib) return pdfjsLib;
  pdfjsLib = await import(PDFJS_CDN);
  pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_CDN;
  return pdfjsLib;
}

/**
 * Parse a PDF file — extract text per page and render pages as images
 * @param {File} file
 * @param {Function} onProgress - callback(percent, statusText)
 * @returns {Promise<{pages, images, metadata}>}
 */
export async function parsePDF(file, onProgress = () => {}) {
  const pdfjs = await loadPdfJs();
  
  onProgress(5, 'Loading PDF...');
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  
  const totalPages = pdf.numPages;
  const pages = [];
  const images = [];

  for (let i = 1; i <= totalPages; i++) {
    const percent = 5 + Math.round((i / totalPages) * 80);
    onProgress(percent, `Extracting page ${i} of ${totalPages}...`);

    const page = await pdf.getPage(i);

    // Extract text
    const textContent = await page.getTextContent();
    const text = textContent.items
      .map(item => item.str)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (text.length > 0) {
      pages.push({ pageNum: i, text });
    }

    // Render page as image
    try {
      const scale = 1.5;
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');

      await page.render({ canvasContext: ctx, viewport }).promise;
      
      const base64 = canvas.toDataURL('image/jpeg', 0.65);
      
      // Create thumbnail
      const thumbCanvas = document.createElement('canvas');
      const thumbScale = 150 / viewport.width;
      thumbCanvas.width = 150;
      thumbCanvas.height = viewport.height * thumbScale;
      const thumbCtx = thumbCanvas.getContext('2d');
      thumbCtx.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
      const thumbnail = thumbCanvas.toDataURL('image/jpeg', 0.5);

      images.push({ pageNum: i, base64, thumbnail });
    } catch (err) {
      console.warn(`Failed to render page ${i} as image:`, err);
    }
  }

  onProgress(95, 'Finalizing...');

  const metadata = {
    name: file.name,
    size: file.size,
    type: 'pdf',
    pageCount: totalPages,
    imageCount: images.length,
  };

  onProgress(100, 'Ready to answer questions');
  return { pages, images, metadata };
}


/**
 * Parse a PPTX file — extract text per slide and embedded images
 * @param {File} file
 * @param {Function} onProgress
 * @returns {Promise<{pages, images, metadata}>}
 */
export async function parsePPTX(file, onProgress = () => {}) {
  onProgress(5, 'Loading PPTX...');

  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  const pages = [];
  const images = [];

  // Find slide XML files
  onProgress(15, 'Reading slides...');
  const slideFiles = Object.keys(zip.files)
    .filter(name => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
    .sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)/i)[1]);
      const numB = parseInt(b.match(/slide(\d+)/i)[1]);
      return numA - numB;
    });

  const totalSlides = slideFiles.length;

  // Extract text from each slide
  for (let i = 0; i < slideFiles.length; i++) {
    const percent = 15 + Math.round((i / totalSlides) * 50);
    onProgress(percent, `Extracting slide ${i + 1} of ${totalSlides}...`);

    const slideXml = await zip.file(slideFiles[i]).async('text');
    const text = extractTextFromSlideXml(slideXml);
    
    if (text.length > 0) {
      pages.push({ pageNum: i + 1, text });
    }
  }

  // Extract embedded images
  onProgress(70, 'Extracting images...');
  const mediaFiles = Object.keys(zip.files).filter(name =>
    /^ppt\/media\/.+\.(png|jpg|jpeg|gif|bmp|svg|emf|wmf|tiff?)$/i.test(name)
  );

  for (let i = 0; i < mediaFiles.length; i++) {
    const percent = 70 + Math.round((i / Math.max(mediaFiles.length, 1)) * 25);
    onProgress(percent, `Processing image ${i + 1} of ${mediaFiles.length}...`);

    try {
      const fileName = mediaFiles[i];
      const ext = fileName.split('.').pop().toLowerCase();
      
      // Skip EMF/WMF as they can't be displayed in browser
      if (['emf', 'wmf'].includes(ext)) continue;
      
      const blob = await zip.file(fileName).async('blob');
      const mimeType = getMimeType(ext);
      const base64 = await blobToBase64(blob, mimeType);
      
      // Create thumbnail
      const thumbnail = await createThumbnail(base64, 150);

      images.push({
        pageNum: Math.min(i + 1, totalSlides), // Approximate page association
        base64,
        thumbnail,
        fileName: fileName.split('/').pop(),
      });
    } catch (err) {
      console.warn(`Failed to extract image ${mediaFiles[i]}:`, err);
    }
  }

  onProgress(98, 'Finalizing...');

  const metadata = {
    name: file.name,
    size: file.size,
    type: 'pptx',
    pageCount: totalSlides,
    imageCount: images.length,
  };

  onProgress(100, 'Ready to answer questions');
  return { pages, images, metadata };
}

/**
 * Extract plain text from a PPTX slide XML string
 */
function extractTextFromSlideXml(xml) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');
  
  // Get all text nodes: <a:t> elements contain the actual text
  const textNodes = doc.querySelectorAll('*');
  const texts = [];
  
  for (const node of textNodes) {
    if (node.localName === 't' && node.namespaceURI?.includes('drawingml')) {
      const t = node.textContent?.trim();
      if (t) texts.push(t);
    }
  }

  return texts.join(' ').replace(/\s+/g, ' ').trim();
}

function getMimeType(ext) {
  const map = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    bmp: 'image/bmp',
    svg: 'image/svg+xml',
    tif: 'image/tiff',
    tiff: 'image/tiff',
  };
  return map[ext] || 'image/png';
}

function blobToBase64(blob, mimeType) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // Replace generic mime with correct one if needed
      let result = reader.result;
      if (!result.startsWith(`data:${mimeType}`)) {
        result = `data:${mimeType};base64,` + result.split(',')[1];
      }
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(new Blob([blob], { type: mimeType }));
  });
}

function createThumbnail(base64, maxWidth) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = maxWidth / img.width;
      const canvas = document.createElement('canvas');
      canvas.width = maxWidth;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.5));
    };
    img.onerror = () => resolve(base64); // fallback to original
    img.src = base64;
  });
}

/**
 * Detect file type and parse accordingly
 * @param {File} file
 * @param {Function} onProgress
 */
export async function parseFile(file, onProgress = () => {}) {
  const ext = file.name.split('.').pop().toLowerCase();
  
  if (ext === 'pdf') {
    return parsePDF(file, onProgress);
  } else if (['pptx', 'ppt'].includes(ext)) {
    if (ext === 'ppt') {
      throw new Error('Legacy .ppt format is not supported. Please convert to .pptx');
    }
    return parsePPTX(file, onProgress);
  } else {
    throw new Error(`Unsupported file format: .${ext}`);
  }
}

/**
 * Get the file type icon emoji
 */
export function getFileIcon(fileName) {
  const ext = fileName.split('.').pop().toLowerCase();
  switch (ext) {
    case 'pdf': return '📄';
    case 'pptx': return '📊';
    case 'ppt': return '📊';
    default: return '📁';
  }
}

/**
 * Format file size to human-readable string
 */
export function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}
