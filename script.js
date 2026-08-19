const revealItems = document.querySelectorAll('[data-reveal], .reveal-item');
const openingSequence = document.querySelector('.opening-sequence');
const openingSkip = document.querySelector('.opening-skip');

if (openingSequence && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  if (location.hash) history.replaceState(null, '', `${location.pathname}${location.search}`);
  scrollTo(0, 0);
  document.body.classList.add('intro-playing');
  const finishOpening = () => {
    document.body.classList.remove('intro-playing');
    openingSequence.setAttribute('hidden', '');
  };
  openingSequence.addEventListener('animationend', (event) => {
    if (event.animationName === 'opening-exit' || event.animationName === 'skip-opening') finishOpening();
  });
  openingSkip?.addEventListener('click', () => openingSequence.classList.add('is-skipped'));
}
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

revealItems.forEach((item) => observer.observe(item));

const sections = [...document.querySelectorAll('main section[id]')];
const navLinks = [...document.querySelectorAll('nav a')];
const progress = document.querySelector('.progress span');

function updateScrollState() {
  const scrollable = document.documentElement.scrollHeight - innerHeight;
  progress.style.width = `${scrollable > 0 ? (scrollY / scrollable) * 100 : 0}%`;

  let current = '';
  sections.forEach((section) => {
    if (scrollY >= section.offsetTop - 180) current = section.id;
  });
  navLinks.forEach((link) => link.classList.toggle('active', link.getAttribute('href') === `#${current}`));
}

addEventListener('scroll', updateScrollState, { passive: true });
updateScrollState();

const identityPanel = document.querySelector('.identity-panel');
const orbit = identityPanel?.querySelector('.orbit');

if (identityPanel && orbit && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  identityPanel.addEventListener('pointermove', (event) => {
    const rect = identityPanel.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    orbit.style.transform = `perspective(760px) rotateX(${-y * 11}deg) rotateY(${x * 14}deg) translate3d(${x * 8}px, ${y * 6}px, 12px)`;
    identityPanel.style.setProperty('--glow-x', `${(x + 1) * 50}%`);
    identityPanel.style.setProperty('--glow-y', `${(y + 1) * 50}%`);
  });

  identityPanel.addEventListener('pointerleave', () => {
    orbit.style.transform = 'perspective(760px) rotateX(0deg) rotateY(0deg) translate3d(0, 0, 0)';
    identityPanel.style.setProperty('--glow-x', '50%');
    identityPanel.style.setProperty('--glow-y', '55%');
  });
}

const mediaViewer = document.querySelector('.media-viewer');
const mediaViewerStage = mediaViewer?.querySelector('.media-viewer-stage');
const mediaViewerTitle = mediaViewer?.querySelector('#media-viewer-title');
const mediaViewerClose = mediaViewer?.querySelector('.media-viewer-close');
const mediaPreviewButtons = document.querySelectorAll('[data-preview-src]');
let activeMediaTrigger = null;

function closeMediaViewer() {
  if (!mediaViewer || mediaViewer.hidden) return;
  mediaViewerStage?.querySelector('video')?.pause();
  mediaViewer.classList.remove('is-open');
  document.body.classList.remove('media-preview-open');
  setTimeout(() => {
    if (mediaViewer.classList.contains('is-open')) return;
    mediaViewer.hidden = true;
    mediaViewerStage?.replaceChildren();
    activeMediaTrigger?.focus();
  }, 350);
}

mediaPreviewButtons.forEach((button) => {
  button.addEventListener('click', () => {
    if (!mediaViewer || !mediaViewerStage || !mediaViewerTitle) return;
    activeMediaTrigger = button;
    const type = button.dataset.previewType;
    const source = button.dataset.previewSrc;
    const title = button.dataset.previewTitle || '作品预览';
    const media = document.createElement(type === 'video' ? 'video' : 'img');

    if (media instanceof HTMLVideoElement) {
      media.controls = true;
      media.autoplay = true;
      media.muted = true;
      media.defaultMuted = true;
      media.playsInline = true;
      media.setAttribute('aria-label', `${title}静音视频预览`);
    } else {
      media.alt = title;
    }

    media.src = source;
    mediaViewerStage.replaceChildren(media);
    mediaViewerTitle.textContent = title;
    mediaViewer.hidden = false;
    document.body.classList.add('media-preview-open');
    requestAnimationFrame(() => mediaViewer.classList.add('is-open'));
    mediaViewerClose?.focus();
  });
});

mediaViewerClose?.addEventListener('click', closeMediaViewer);
mediaViewer?.addEventListener('click', (event) => {
  if (event.target === mediaViewer || event.target === mediaViewerStage) closeMediaViewer();
});
addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeMediaViewer();
});
