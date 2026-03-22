/**
 * AI Fashion Editor — Main Application Logic
 * Handles sidebar tabs, image uploads, state management, and API calls
 */
import { generateFashionImage, generateImageEdit } from './gemini-api.js';

// ============================================
// Feature Tab Definitions
// ============================================
const FEATURE_TABS = ['upscale', 'restore', 'skinRetouch', 'removeDefects', 'brighten', 'changeBg', 'fullUpgrade'];
const ALL_TABS = ['fashion', ...FEATURE_TABS];

// ============================================
// State
// ============================================
const state = {
  activeTab: 'fashion',
  // Fashion tab (Tab 1)
  modelImage: null,
  clothingImage: null,
  selectedMode: 1,
  // Feature tabs (Tab 2–8) — per-tab uploaded image
  featureImages: {},
  // Shared
  isLoading: false,
  resultImageBase64: null,
  resultImageMime: null,
  // Store the original image URL for result display
  currentOriginalUrl: null,
};

// ============================================
// DOM References
// ============================================
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);
const elements = {};

function cacheDom() {
  // Settings
  elements.settingsToggle = $('#settings-toggle');
  elements.settingsPanel = $('#settings-panel');
  elements.apiKeyInput = $('#api-key-input');
  elements.apiKeyToggle = $('#api-key-toggle');
  elements.modelSelect = $('#model-select');
  elements.qualitySelect = $('#quality-select');

  // Tab 1: Fashion
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

  elements.modeBtns = $$('.mode-btn');
  elements.generateBtnFashion = $('#generate-btn-fashion');

  // Shared result
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

  // Sidebar
  elements.sidebar = $('#sidebar');
  elements.navItems = $$('.nav-item');
  elements.tabContents = $$('.tab-content');
  elements.mobileMenuToggle = $('#mobile-menu-toggle');
}

// ============================================
// Settings
// ============================================
function initSettings() {
  const savedKey = localStorage.getItem('gemini-api-key');
  if (savedKey) elements.apiKeyInput.value = savedKey;

  const savedModel = localStorage.getItem('gemini-model');
  if (savedModel) elements.modelSelect.value = savedModel;

  const savedQuality = localStorage.getItem('gemini-quality');
  if (savedQuality) elements.qualitySelect.value = savedQuality;

  elements.settingsToggle.addEventListener('click', () => {
    elements.settingsPanel.classList.toggle('open');
    elements.settingsToggle.classList.toggle('active');
  });

  elements.apiKeyInput.addEventListener('input', () => {
    localStorage.setItem('gemini-api-key', elements.apiKeyInput.value.trim());
  });

  elements.apiKeyToggle.addEventListener('click', () => {
    const input = elements.apiKeyInput;
    input.type = input.type === 'password' ? 'text' : 'password';
  });

  elements.modelSelect.addEventListener('change', () => {
    localStorage.setItem('gemini-model', elements.modelSelect.value);
  });

  elements.qualitySelect.addEventListener('change', () => {
    localStorage.setItem('gemini-quality', elements.qualitySelect.value);
  });
}

// ============================================
// Tab Switching
// ============================================
function initTabs() {
  elements.navItems.forEach((item) => {
    item.addEventListener('click', () => {
      const tabId = item.dataset.tab;
      switchTab(tabId);
      // Close mobile sidebar
      closeMobileSidebar();
    });
  });

  // Mobile menu toggle
  if (elements.mobileMenuToggle) {
    elements.mobileMenuToggle.addEventListener('click', () => {
      toggleMobileSidebar();
    });
  }
}

function switchTab(tabId) {
  if (tabId === state.activeTab) return;
  state.activeTab = tabId;

  // Update nav items
  elements.navItems.forEach((item) => {
    item.classList.toggle('active', item.dataset.tab === tabId);
  });

  // Update tab content — animate
  elements.tabContents.forEach((content) => {
    content.classList.remove('active');
  });
  const target = $(`#tab-${tabId}`);
  if (target) {
    target.classList.add('active');
  }

  // Hide result and error when switching tabs
  hideError();
  elements.resultSection.style.display = 'none';
}

function toggleMobileSidebar() {
  elements.sidebar.classList.toggle('open');
  let overlay = $('.sidebar-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', closeMobileSidebar);
  }
  overlay.classList.toggle('active', elements.sidebar.classList.contains('open'));
}

function closeMobileSidebar() {
  elements.sidebar.classList.remove('open');
  const overlay = $('.sidebar-overlay');
  if (overlay) overlay.classList.remove('active');
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
  if (!dropZone) return;

  dropZone.addEventListener('click', (e) => {
    if (e.target.closest('.remove-btn')) return;
    fileInput.click();
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
      handleFile(fileInput.files[0], placeholder, preview, previewImg, stateKey);
    }
  });

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

  removeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (stateKey === 'modelImage' || stateKey === 'clothingImage') {
      if (state[stateKey]?.url) URL.revokeObjectURL(state[stateKey].url);
      state[stateKey] = null;
    } else {
      // Feature tab image
      if (state.featureImages[stateKey]?.url) URL.revokeObjectURL(state.featureImages[stateKey].url);
      delete state.featureImages[stateKey];
    }
    preview.style.display = 'none';
    placeholder.style.display = '';
    fileInput.value = '';
  });
}

async function handleFile(file, placeholder, preview, previewImg, stateKey) {
  if (!file.type.startsWith('image/')) {
    showError('Vui lòng chọn file ảnh (JPG, PNG, WebP).');
    return;
  }

  if (file.size > 20 * 1024 * 1024) {
    showError('File ảnh quá lớn. Tối đa 20MB.');
    return;
  }

  try {
    const base64 = await fileToBase64(file);
    const url = URL.createObjectURL(file);

    const imgData = { base64, mime: file.type, file, url };

    if (stateKey === 'modelImage' || stateKey === 'clothingImage') {
      state[stateKey] = imgData;
    } else {
      state.featureImages[stateKey] = imgData;
    }

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
  // Tab 1: Fashion (dual upload)
  setupUploadZone(
    elements.modelDropZone, elements.modelFileInput,
    elements.modelPlaceholder, elements.modelPreview,
    elements.modelPreviewImg, elements.modelRemove,
    'modelImage'
  );

  setupUploadZone(
    elements.clothingDropZone, elements.clothingFileInput,
    elements.clothingPlaceholder, elements.clothingPreview,
    elements.clothingPreviewImg, elements.clothingRemove,
    'clothingImage'
  );

  // Tab 2–8: Feature tabs (single upload each)
  FEATURE_TABS.forEach((feature) => {
    const dropZone = $(`#${feature}-drop-zone`);
    const fileInput = $(`#${feature}-file-input`);
    const placeholder = $(`#${feature}-placeholder`);
    const preview = $(`#${feature}-preview`);
    const previewImg = $(`#${feature}-preview-img`);
    const removeBtn = $(`#${feature}-remove`);

    setupUploadZone(dropZone, fileInput, placeholder, preview, previewImg, removeBtn, feature);
  });
}

// ============================================
// Mode Selector (Tab 1)
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
  setTimeout(() => hideError(), 8000);
}

function hideError() {
  elements.errorMessage.style.display = 'none';
}

// ============================================
// Generate / Process
// ============================================
function setButtonLoading(btn, loading) {
  if (!btn) return;
  btn.disabled = loading;
  const textEl = btn.querySelector('.generate-btn-text');
  const loadingEl = btn.querySelector('.generate-btn-loading');
  if (loading) {
    if (textEl) textEl.style.display = 'none';
    if (loadingEl) loadingEl.style.display = 'flex';
  } else {
    if (textEl) textEl.style.display = 'flex';
    if (loadingEl) loadingEl.style.display = 'none';
  }
}

// Tab 1: Fashion
async function handleFashionGenerate() {
  hideError();

  const apiKey = elements.apiKeyInput.value.trim();
  if (!apiKey) {
    showError('Vui lòng nhập Gemini API Key. Nhấn ⚙️ Cài đặt ở sidebar để mở.');
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

  const btn = elements.generateBtnFashion;
  setButtonLoading(btn, true);
  state.isLoading = true;

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
    state.currentOriginalUrl = state.modelImage.url;
    showResult();
  } catch (err) {
    handleApiError(err);
  } finally {
    setButtonLoading(btn, false);
    state.isLoading = false;
  }
}

// Tab 2–8: Feature
async function handleFeatureGenerate(featureKey) {
  hideError();

  const apiKey = elements.apiKeyInput.value.trim();
  if (!apiKey) {
    showError('Vui lòng nhập Gemini API Key. Nhấn ⚙️ Cài đặt ở sidebar để mở.');
    elements.settingsPanel.classList.add('open');
    elements.settingsToggle.classList.add('active');
    elements.apiKeyInput.focus();
    return;
  }

  const imgData = state.featureImages[featureKey];
  if (!imgData) {
    showError('Vui lòng tải lên ảnh cần xử lý.');
    return;
  }

  const btn = $(`#generate-btn-${featureKey}`);
  setButtonLoading(btn, true);
  state.isLoading = true;

  try {
    const result = await generateImageEdit({
      apiKey,
      model: elements.modelSelect.value,
      featureKey,
      quality: elements.qualitySelect.value,
      imageBase64: imgData.base64,
      imageMime: imgData.mime,
    });

    state.resultImageBase64 = result.imageBase64;
    state.resultImageMime = result.mimeType;
    state.currentOriginalUrl = imgData.url;
    showResult();
  } catch (err) {
    handleApiError(err);
  } finally {
    setButtonLoading(btn, false);
    state.isLoading = false;
  }
}

function handleApiError(err) {
  console.error('Generation error:', err);
  let errorMsg = 'Có lỗi xảy ra khi xử lý ảnh. ';
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
}

function showResult() {
  elements.resultOriginalImg.src = state.currentOriginalUrl;
  const resultUrl = `data:${state.resultImageMime};base64,${state.resultImageBase64}`;
  elements.resultOutputImg.src = resultUrl;
  elements.resultSection.style.display = '';
  setTimeout(() => {
    elements.resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

function initGenerate() {
  // Tab 1: Fashion
  if (elements.generateBtnFashion) {
    elements.generateBtnFashion.addEventListener('click', handleFashionGenerate);
  }

  // Tab 2–8: Feature buttons
  FEATURE_TABS.forEach((feature) => {
    const btn = $(`#generate-btn-${feature}`);
    if (btn) {
      btn.addEventListener('click', () => handleFeatureGenerate(feature));
    }
  });

  // Retry button
  elements.retryBtn.addEventListener('click', () => {
    elements.resultSection.style.display = 'none';
    if (state.activeTab === 'fashion') {
      handleFashionGenerate();
    } else {
      handleFeatureGenerate(state.activeTab);
    }
  });

  // Download button
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
    link.download = `ai-editor-${state.activeTab}-${Date.now()}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  elements.lightboxClose.addEventListener('click', closeLightbox);

  elements.lightboxOverlay.addEventListener('click', (e) => {
    if (e.target === elements.lightboxOverlay || e.target.classList.contains('lightbox-body')) {
      closeLightbox();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && elements.lightboxOverlay.classList.contains('active')) {
      closeLightbox();
    }
  });

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
  initTabs();
  initUploads();
  initModeSelector();
  initGenerate();
  initLightbox();
}

document.addEventListener('DOMContentLoaded', init);
