/**
 * AI Fashion Editor — Main Application Logic
 * Handles UI interactions, image uploads, state management, and API calls
 */
import { generateFashionImage } from './gemini-api.js';

// ============================================
// State
// ============================================
const state = {
  modelImage: null,      // { base64, mime, file, url }
  clothingImage: null,    // { base64, mime, file, url }
  selectedMode: 1,
  isLoading: false,
  resultImageBase64: null,
  resultImageMime: null,
};

// ============================================
// DOM References
// ============================================
const $ = (sel) => document.querySelector(sel);
const elements = {};

function cacheDom() {
  elements.settingsToggle = $('#settings-toggle');
  elements.settingsPanel = $('#settings-panel');
  elements.apiKeyInput = $('#api-key-input');
  elements.apiKeyToggle = $('#api-key-toggle');
  elements.modelSelect = $('#model-select');
  elements.qualitySelect = $('#quality-select');

  elements.modelDropZone = $('#model-drop-zone');
  elements.modelFileInput = $('#model-file-input');
  elements.modelPlaceholder = $('#model-placeholder');
  elements.modelPreview = $('#model-preview');
  elements.modelPreviewImg = $('#model-preview-img');
  elements.modelRemove = $('#model-remove');

  elements.clothingDropZone = $('#clothing-drop-zone');
  elements.clothingFileInput = $('#clothing-file-input');
  elements.clothingPlaceholder = $('#clothing-placeholder');
  elements.clothingPreview = $('#clothing-preview');
  elements.clothingPreviewImg = $('#clothing-preview-img');
  elements.clothingRemove = $('#clothing-remove');

  elements.modeBtns = document.querySelectorAll('.mode-btn');
  elements.generateBtn = $('#generate-btn');
  elements.generateBtnText = $('.generate-btn-text');
  elements.generateBtnLoading = $('.generate-btn-loading');

  elements.errorMessage = $('#error-message');
  elements.errorText = $('#error-text');

  elements.resultSection = $('#result-section');
  elements.resultOriginalImg = $('#result-original-img');
  elements.resultOutputImg = $('#result-output-img');
  elements.downloadBtn = $('#download-btn');
  elements.retryBtn = $('#retry-btn');

  // Lightbox
  elements.lightboxOverlay = $('#lightbox-overlay');
  elements.lightboxImg = $('#lightbox-img');
  elements.lightboxTitle = $('#lightbox-title');
  elements.lightboxClose = $('#lightbox-close');
  elements.lightboxDownload = $('#lightbox-download');
}

// ============================================
// Settings
// ============================================
function initSettings() {
  // Load saved API key
  const savedKey = localStorage.getItem('gemini-api-key');
  if (savedKey) {
    elements.apiKeyInput.value = savedKey;
  }

  // Load saved model
  const savedModel = localStorage.getItem('gemini-model');
  if (savedModel) {
    elements.modelSelect.value = savedModel;
  }

  // Load saved quality
  const savedQuality = localStorage.getItem('gemini-quality');
  if (savedQuality) {
    elements.qualitySelect.value = savedQuality;
  }

  // Toggle settings panel
  elements.settingsToggle.addEventListener('click', () => {
    elements.settingsPanel.classList.toggle('open');
    elements.settingsToggle.classList.toggle('active');
  });

  // Save API key on change
  elements.apiKeyInput.addEventListener('input', () => {
    localStorage.setItem('gemini-api-key', elements.apiKeyInput.value.trim());
  });

  // Toggle API key visibility
  elements.apiKeyToggle.addEventListener('click', () => {
    const input = elements.apiKeyInput;
    input.type = input.type === 'password' ? 'text' : 'password';
  });

  // Save model on change
  elements.modelSelect.addEventListener('change', () => {
    localStorage.setItem('gemini-model', elements.modelSelect.value);
  });

  // Save quality on change
  elements.qualitySelect.addEventListener('change', () => {
    localStorage.setItem('gemini-quality', elements.qualitySelect.value);
  });
}

// ============================================
// Image Upload
// ============================================
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const base64 = dataUrl.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function setupUploadZone(dropZone, fileInput, placeholder, preview, previewImg, removeBtn, stateKey) {
  // Click to upload
  dropZone.addEventListener('click', (e) => {
    if (e.target.closest('.remove-btn')) return;
    fileInput.click();
  });

  // File input change
  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
      handleFile(fileInput.files[0], placeholder, preview, previewImg, stateKey);
    }
  });

  // Drag & Drop
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
      handleFile(files[0], placeholder, preview, previewImg, stateKey);
    }
  });

  // Remove button
  removeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    state[stateKey] = null;
    preview.style.display = 'none';
    placeholder.style.display = '';
    fileInput.value = '';
    if (state[stateKey + 'Url']) {
      URL.revokeObjectURL(state[stateKey + 'Url']);
    }
  });
}

async function handleFile(file, placeholder, preview, previewImg, stateKey) {
  if (!file.type.startsWith('image/')) {
    showError('Vui lòng chọn file ảnh (JPG, PNG, WebP).');
    return;
  }

  // Max 20MB
  if (file.size > 20 * 1024 * 1024) {
    showError('File ảnh quá lớn. Tối đa 20MB.');
    return;
  }

  try {
    const base64 = await fileToBase64(file);
    const url = URL.createObjectURL(file);

    state[stateKey] = {
      base64,
      mime: file.type,
      file,
      url,
    };

    previewImg.src = url;
    placeholder.style.display = 'none';
    preview.style.display = '';
    hideError();
  } catch (err) {
    showError('Không thể đọc file ảnh. Vui lòng thử lại.');
    console.error(err);
  }
}

function initUploads() {
  setupUploadZone(
    elements.modelDropZone,
    elements.modelFileInput,
    elements.modelPlaceholder,
    elements.modelPreview,
    elements.modelPreviewImg,
    elements.modelRemove,
    'modelImage'
  );

  setupUploadZone(
    elements.clothingDropZone,
    elements.clothingFileInput,
    elements.clothingPlaceholder,
    elements.clothingPreview,
    elements.clothingPreviewImg,
    elements.clothingRemove,
    'clothingImage'
  );
}

// ============================================
// Mode Selector
// ============================================
function initModeSelector() {
  elements.modeBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      elements.modeBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.selectedMode = parseInt(btn.dataset.mode);
    });
  });
}

// ============================================
// Error Handling
// ============================================
function showError(message) {
  elements.errorText.textContent = message;
  elements.errorMessage.style.display = 'flex';
  // Auto-hide after 8 seconds
  setTimeout(() => hideError(), 8000);
}

function hideError() {
  elements.errorMessage.style.display = 'none';
}

// ============================================
// Generate
// ============================================
function setLoading(loading) {
  state.isLoading = loading;
  elements.generateBtn.disabled = loading;

  if (loading) {
    elements.generateBtnText.style.display = 'none';
    elements.generateBtnLoading.style.display = 'flex';
  } else {
    elements.generateBtnText.style.display = 'flex';
    elements.generateBtnLoading.style.display = 'none';
  }
}

async function handleGenerate() {
  hideError();

  // Validate
  const apiKey = elements.apiKeyInput.value.trim();
  if (!apiKey) {
    showError('Vui lòng nhập Gemini API Key. Nhấn ⚙️ để mở cài đặt.');
    elements.settingsPanel.classList.add('open');
    elements.settingsToggle.classList.add('active');
    elements.apiKeyInput.focus();
    return;
  }

  if (!state.modelImage) {
    showError('Vui lòng tải lên ảnh người mẫu.');
    return;
  }

  if (!state.clothingImage) {
    showError('Vui lòng tải lên ảnh trang phục.');
    return;
  }

  setLoading(true);

  try {
    const result = await generateFashionImage({
      apiKey,
      model: elements.modelSelect.value,
      mode: state.selectedMode,
      quality: elements.qualitySelect.value,
      modelImageBase64: state.modelImage.base64,
      modelImageMime: state.modelImage.mime,
      clothingImageBase64: state.clothingImage.base64,
      clothingImageMime: state.clothingImage.mime,
    });

    state.resultImageBase64 = result.imageBase64;
    state.resultImageMime = result.mimeType;

    // Display result
    showResult();
  } catch (err) {
    console.error('Generation error:', err);

    let errorMsg = 'Có lỗi xảy ra khi tạo ảnh. ';
    if (err.message) {
      if (err.message.includes('API key')) {
        errorMsg += 'API Key không hợp lệ. Vui lòng kiểm tra lại.';
      } else if (err.message.includes('quota') || err.message.includes('rate')) {
        errorMsg += 'Đã vượt quá giới hạn API. Vui lòng thử lại sau.';
      } else if (err.message.includes('safety') || err.message.includes('blocked')) {
        errorMsg += 'Nội dung bị chặn bởi bộ lọc an toàn. Vui lòng thử ảnh khác.';
      } else {
        errorMsg += err.message;
      }
    }

    showError(errorMsg);
  } finally {
    setLoading(false);
  }
}

function showResult() {
  // Show original model image
  elements.resultOriginalImg.src = state.modelImage.url;

  // Show AI result
  const resultUrl = `data:${state.resultImageMime};base64,${state.resultImageBase64}`;
  elements.resultOutputImg.src = resultUrl;

  elements.resultSection.style.display = '';

  // Scroll to result
  setTimeout(() => {
    elements.resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

function initGenerate() {
  elements.generateBtn.addEventListener('click', handleGenerate);

  elements.retryBtn.addEventListener('click', () => {
    elements.resultSection.style.display = 'none';
    handleGenerate();
  });

  elements.downloadBtn.addEventListener('click', () => {
    downloadResultImage();
  });
}

// ============================================
// Download Helper
// ============================================
function downloadResultImage() {
  if (!state.resultImageBase64) return;

  try {
    // Convert base64 to Blob for reliable download
    const byteChars = atob(state.resultImageBase64);
    const byteArrays = [];
    for (let offset = 0; offset < byteChars.length; offset += 512) {
      const slice = byteChars.slice(offset, offset + 512);
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      byteArrays.push(new Uint8Array(byteNumbers));
    }
    const blob = new Blob(byteArrays, { type: state.resultImageMime });
    const blobUrl = URL.createObjectURL(blob);

    const ext = state.resultImageMime.includes('png') ? 'png' : 'jpg';
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `fashion-editor-result-${Date.now()}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up blob URL after a delay
    setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
  } catch (err) {
    console.error('Download error:', err);
    showError('Không thể tải xuống ảnh. Vui lòng thử lại.');
  }
}

// ============================================
// Lightbox
// ============================================
function openLightbox(imgSrc, title) {
  elements.lightboxImg.src = imgSrc;
  elements.lightboxTitle.textContent = title || 'Xem ảnh';
  elements.lightboxOverlay.style.display = 'flex';
  // Trigger animation
  requestAnimationFrame(() => {
    elements.lightboxOverlay.classList.add('active');
  });
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  elements.lightboxOverlay.classList.remove('active');
  document.body.style.overflow = '';
  setTimeout(() => {
    elements.lightboxOverlay.style.display = 'none';
    elements.lightboxImg.src = '';
  }, 300);
}

function initLightbox() {
  // Click result images to open lightbox
  elements.resultOriginalImg.addEventListener('click', () => {
    if (elements.resultOriginalImg.src) {
      openLightbox(elements.resultOriginalImg.src, 'Ảnh gốc');
    }
  });

  elements.resultOutputImg.addEventListener('click', () => {
    if (elements.resultOutputImg.src) {
      openLightbox(elements.resultOutputImg.src, 'Kết quả AI');
    }
  });

  // Close lightbox
  elements.lightboxClose.addEventListener('click', closeLightbox);

  // Close on overlay click (not on image)
  elements.lightboxOverlay.addEventListener('click', (e) => {
    if (e.target === elements.lightboxOverlay || e.target.classList.contains('lightbox-body')) {
      closeLightbox();
    }
  });

  // Close on ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && elements.lightboxOverlay.classList.contains('active')) {
      closeLightbox();
    }
  });

  // Download from lightbox
  elements.lightboxDownload.addEventListener('click', () => {
    downloadResultImage();
  });
}

// ============================================
// Init
// ============================================
function init() {
  cacheDom();
  initSettings();
  initUploads();
  initModeSelector();
  initGenerate();
  initLightbox();
}

// Run
document.addEventListener('DOMContentLoaded', init);
