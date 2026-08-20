const revealItems = document.querySelectorAll('[data-reveal], .reveal-item');
const openingSequence = document.querySelector('.opening-sequence');
const openingSkip = document.querySelector('.opening-skip');

if (openingSequence && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  if (location.hash) history.replaceState(null, '', `${location.pathname}${location.search}`);
  scrollTo(0, 0);
  document.body.classList.add('intro-playing');
  const openingDuration = 7200;
  const openingAnimations = openingSequence.getAnimations({ subtree: true });
  let openingTarget = 0;
  let openingCurrent = 0;
  let openingFrame = 0;
  let openingTouchY = null;

  openingAnimations.forEach((animation) => {
    animation.pause();
    animation.currentTime = 0;
  });

  const finishOpening = () => {
    document.body.classList.remove('intro-playing');
    document.body.classList.remove('intro-scroll');
    openingSequence.setAttribute('hidden', '');
    removeEventListener('keydown', handleOpeningKey);
  };

  const renderOpening = () => {
    openingCurrent += (openingTarget - openingCurrent) * 0.22;
    if (Math.abs(openingTarget - openingCurrent) < 0.0005) openingCurrent = openingTarget;
    openingAnimations.forEach((animation) => {
      animation.currentTime = openingCurrent * openingDuration;
    });
    if (openingTarget === 1 && openingCurrent > 0.995) {
      finishOpening();
      openingFrame = 0;
      return;
    }
    if (openingCurrent !== openingTarget) openingFrame = requestAnimationFrame(renderOpening);
    else openingFrame = 0;
  };

  const setOpeningTarget = (nextTarget) => {
    openingTarget = Math.min(1, Math.max(0, nextTarget));
    if (!openingFrame) openingFrame = requestAnimationFrame(renderOpening);
  };

  openingSequence.addEventListener('wheel', (event) => {
    event.preventDefault();
    const delta = event.deltaMode === 1 ? event.deltaY * 18 : event.deltaY;
    setOpeningTarget(openingTarget + Math.max(-0.14, Math.min(0.14, delta / 1000)));
  }, { passive: false });

  openingSequence.addEventListener('touchstart', (event) => {
    openingTouchY = event.touches[0]?.clientY ?? null;
  }, { passive: true });

  openingSequence.addEventListener('touchmove', (event) => {
    if (openingTouchY === null || !event.touches[0]) return;
    event.preventDefault();
    const nextY = event.touches[0].clientY;
    setOpeningTarget(openingTarget + (openingTouchY - nextY) / 520);
    openingTouchY = nextY;
  }, { passive: false });

  function handleOpeningKey(event) {
    if (event.key === 'ArrowDown' || event.key === 'PageDown' || event.key === ' ') {
      event.preventDefault();
      setOpeningTarget(openingTarget + 0.12);
    } else if (event.key === 'ArrowUp' || event.key === 'PageUp') {
      event.preventDefault();
      setOpeningTarget(openingTarget - 0.12);
    }
  }

  addEventListener('keydown', handleOpeningKey);
  if (openingSkip) openingSkip.tabIndex = 0;
  openingSkip?.addEventListener('click', () => {
    const skipAnimation = openingSequence.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 420, easing: 'ease', fill: 'forwards' });
    skipAnimation.finished.then(finishOpening);
  });
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
      const shouldMute = button.dataset.previewMuted !== 'false';
      media.controls = true;
      media.autoplay = true;
      media.muted = shouldMute;
      media.defaultMuted = shouldMute;
      media.playsInline = true;
      media.setAttribute('aria-label', `${title}视频预览`);
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

const wechatCopyButton = document.querySelector('.wechat-copy');
const wechatCopyLabel = wechatCopyButton?.querySelector('[data-wechat-label]');
const contactFeedback = document.querySelector('.contact-feedback');
let wechatFeedbackTimer;

wechatCopyButton?.addEventListener('click', async () => {
  const wechatId = wechatCopyButton.dataset.wechat;
  if (!wechatId) return;

  try {
    await navigator.clipboard.writeText(wechatId);
  } catch {
    const temporaryInput = document.createElement('textarea');
    temporaryInput.value = wechatId;
    temporaryInput.setAttribute('readonly', '');
    temporaryInput.style.position = 'fixed';
    temporaryInput.style.opacity = '0';
    document.body.append(temporaryInput);
    temporaryInput.select();
    document.execCommand('copy');
    temporaryInput.remove();
  }

  clearTimeout(wechatFeedbackTimer);
  wechatCopyButton.classList.add('is-copied');
  if (wechatCopyLabel) wechatCopyLabel.textContent = '已复制微信号';
  if (contactFeedback) contactFeedback.textContent = '微信号已复制，可以前往微信添加。';
  wechatFeedbackTimer = setTimeout(() => {
    wechatCopyButton.classList.remove('is-copied');
    if (wechatCopyLabel) wechatCopyLabel.textContent = '复制微信号';
    if (contactFeedback) contactFeedback.textContent = '';
  }, 2600);
});

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

if (!reduceMotion.matches) {
  const rootStyle = document.documentElement.style;
  let pointerFrame = 0;
  let pointerX = innerWidth / 2;
  let pointerY = innerHeight / 2;

  const renderBackgroundCanvas = () => {
    const normalizedX = (pointerX / innerWidth - 0.5) * 2;
    const normalizedY = (pointerY / innerHeight - 0.5) * 2;
    rootStyle.setProperty('--canvas-x', `${normalizedX * 58}px`);
    rootStyle.setProperty('--canvas-y', `${normalizedY * 20}px`);
    rootStyle.setProperty('--canvas-x-soft', `${normalizedX * 28}px`);
    rootStyle.setProperty('--canvas-y-soft', `${normalizedY * 10}px`);
    rootStyle.setProperty('--canvas-x-reverse', `${normalizedX * -40}px`);
    rootStyle.setProperty('--space-x', `${normalizedX * 36}px`);
    rootStyle.setProperty('--space-y', `${normalizedY * 14}px`);
    rootStyle.setProperty('--space-x-soft', `${normalizedX * 18}px`);
    rootStyle.setProperty('--space-y-soft', `${normalizedY * 7}px`);
    pointerFrame = 0;
  };

  addEventListener('mousemove', (event) => {
    pointerX = event.clientX;
    pointerY = event.clientY;
    if (!pointerFrame) pointerFrame = requestAnimationFrame(renderBackgroundCanvas);
  }, { passive: true });

  document.documentElement.addEventListener('mouseleave', () => {
    pointerX = innerWidth / 2;
    pointerY = innerHeight / 2;
    if (!pointerFrame) pointerFrame = requestAnimationFrame(renderBackgroundCanvas);
  });
}
