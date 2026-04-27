// 僅作為 skeleton 數量的 UI hint；尾頁判定改以後端回傳的 next === null 為準。
const PAGE_SIZE = 10;
const RETRY_DELAYS_MS = [500, 1500, 4500];
const PRELOAD_MARGIN = '400px 0px';
const SCROLL_THROTTLE_MS = 100;

const prefersReducedMotion = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

class ImageGallery {
    constructor() {
        this.images = [];
        this.loading = false;
        this.currentPage = 1;
        this.hasMore = true;
        this.totalLoaded = 0;
        this.retryCount = 0;
        this.abortController = null;
        this.loadMoreObserver = null;

        this.galleryGrid = document.getElementById('galleryGrid');
        this.loadingIndicator = document.getElementById('loadingIndicator');
        this.loadingText = document.getElementById('loadingText');
        this.loadMoreTrigger = document.getElementById('loadMoreTrigger');
        this.backToTopBtn = document.getElementById('backToTop');

        if (!this.galleryGrid || !this.loadMoreTrigger) {
            console.error('ImageGallery 缺少必要元素 (galleryGrid / loadMoreTrigger)');
            return;
        }

        this.init();
    }

    init() {
        this.lightbox = new Lightbox(this);
        this.setupInfiniteScroll();
        this.setupBackToTop();
        this.setupBeforeUnload();
        this.loadInitialImages();
    }

    getCsrfToken() {
        if (!document.cookie) return null;
        const match = document.cookie
            .split(';')
            .map(c => c.trim())
            .find(c => c.startsWith('csrftoken='));
        return match ? decodeURIComponent(match.slice('csrftoken='.length)) : null;
    }

    showLoading(text = '載入中...') {
        if (this.loadingIndicator && this.loadingText) {
            this.loadingText.textContent = text;
            this.loadingIndicator.classList.add('show');
        }
    }

    hideLoading() {
        if (this.loadingIndicator) {
            this.loadingIndicator.classList.remove('show');
        }
    }

    async fetchImages(page) {
        this.abortController = new AbortController();
        const response = await fetch(`/api/image/list/?page=${page}`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            signal: this.abortController.signal,
        });

        if (!response.ok) {
            const err = new Error(`HTTP ${response.status}`);
            err.status = response.status;
            throw err;
        }

        return response.json();
    }

    async fetchWithRetry(page) {
        let attempt = 0;
        while (true) {
            try {
                return await this.fetchImages(page);
            } catch (err) {
                if (err.name === 'AbortError') throw err;
                if (err.status && err.status >= 400 && err.status < 500) {
                    throw err;
                }
                if (attempt >= RETRY_DELAYS_MS.length) {
                    throw err;
                }
                await new Promise(r => setTimeout(r, RETRY_DELAYS_MS[attempt]));
                attempt += 1;
            }
        }
    }

    addSkeletons(count) {
        const skeletons = [];
        for (let i = 0; i < count; i += 1) {
            const sk = document.createElement('div');
            sk.className = 'image-item--skeleton';
            const h = 200 + Math.floor(Math.random() * 200);
            sk.style.setProperty('--skeleton-h', `${h}px`);
            this.galleryGrid.appendChild(sk);
            skeletons.push(sk);
        }
        return skeletons;
    }

    removeSkeletons(skeletons) {
        skeletons.forEach(s => s.remove());
    }

    async loadInitialImages() {
        return this.loadPage({ initial: true });
    }

    async loadMoreImages() {
        return this.loadPage({ initial: false });
    }

    async loadPage({ initial }) {
        if (this.loading || !this.hasMore) {
            return { ok: true, added: 0, skipped: true };
        }
        this.loading = true;
        this.showLoading(initial ? '載入中...' : '載入更多圖片...');

        const skeletons = this.addSkeletons(PAGE_SIZE);

        try {
            const data = await this.fetchWithRetry(this.currentPage);
            this.removeSkeletons(skeletons);

            const newImages = (data && data.results) || [];

            if (newImages.length === 0) {
                this.hasMore = false;
                this.renderEndState();
                return { ok: true, added: 0 };
            }

            if (initial) {
                this.images = newImages;
                this.galleryGrid.innerHTML = '';
            } else {
                this.images = this.images.concat(newImages);
            }

            this.renderImages(newImages);
            this.totalLoaded += newImages.length;
            this.currentPage += 1;
            this.retryCount = 0;

            if (data.next === null) {
                this.hasMore = false;
                this.renderEndState();
            } else {
                this.rearmObserver();
            }
            return { ok: true, added: newImages.length };
        } catch (err) {
            if (err.name === 'AbortError') {
                return { ok: false, aborted: true };
            }
            console.error('載入圖片失敗:', err);
            this.removeSkeletons(skeletons);
            this.renderRetryButton();
            return { ok: false, error: err };
        } finally {
            this.loading = false;
            this.hideLoading();
        }
    }

    // 強迫 IntersectionObserver 重新評估 trigger 的可見狀態。
    // 桌機上一頁 10 張可能不足以把 trigger 推出 preload 範圍，
    // observer 會卡在 isIntersecting === true 不再觸發 callback。
    rearmObserver() {
        if (!this.loadMoreObserver || !this.loadMoreTrigger) return;
        this.loadMoreObserver.unobserve(this.loadMoreTrigger);
        requestAnimationFrame(() => {
            if (this.loadMoreObserver && this.loadMoreTrigger) {
                this.loadMoreObserver.observe(this.loadMoreTrigger);
            }
        });
    }

    renderImages(imagesToRender) {
        const fragment = document.createDocumentFragment();
        imagesToRender.forEach((image, index) => {
            const el = this.createImageElement(image, index);
            fragment.appendChild(el);
        });
        this.galleryGrid.appendChild(fragment);
    }

    createImageElement(image, index) {
        const div = document.createElement('div');
        div.className = 'image-item';
        div.dataset.imageId = image.id;
        div.style.setProperty('--stagger', String(index));

        const wrapper = document.createElement('div');
        wrapper.className = 'image-wrapper';
        wrapper.tabIndex = 0;
        wrapper.setAttribute('role', 'button');
        wrapper.setAttribute('aria-label', `檢視圖片 ${image.id}`);
        const openLightbox = () => {
            const idx = this.images.findIndex(i => i.id === image.id);
            if (idx >= 0 && this.lightbox) this.lightbox.open(idx);
        };
        wrapper.addEventListener('click', openLightbox);
        wrapper.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openLightbox();
            }
        });

        const img = document.createElement('img');
        img.src = image.url || '';
        img.alt = `圖片 ${image.id}`;
        img.loading = 'lazy';
        img.decoding = 'async';
        img.style.opacity = '0';
        img.addEventListener('load', () => { img.style.opacity = '1'; });
        img.addEventListener('error', () => {
            const fallback = document.createElement('div');
            fallback.className = 'image-error';
            fallback.textContent = '圖片無法顯示';
            wrapper.replaceChild(fallback, img);
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'delete-btn';
        deleteBtn.title = '刪除圖片';
        deleteBtn.textContent = '×';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.confirmDeleteImage(image.id, div);
        });

        wrapper.appendChild(img);
        wrapper.appendChild(deleteBtn);

        const info = document.createElement('div');
        info.className = 'image-info';
        const idLine = document.createElement('div');
        idLine.className = 'image-id';
        const idSpan = document.createElement('span');
        idSpan.textContent = `ID: ${image.id}`;
        const dateSpan = document.createElement('span');
        dateSpan.className = 'image-date';
        dateSpan.textContent = this.formatDate(image.createdAt);
        idLine.appendChild(idSpan);
        idLine.appendChild(dateSpan);
        info.appendChild(idLine);

        div.appendChild(wrapper);
        div.appendChild(info);
        return div;
    }

    formatDate(iso) {
        if (!iso) return '';
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return '';
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }

    renderEndState() {
        if (!this.loadMoreTrigger) return;
        const end = document.createElement('div');
        end.className = 'gallery-end';
        const hr = document.createElement('hr');
        const text = document.createElement('span');
        text.textContent = `已載入全部 ${this.totalLoaded} 張圖片`;
        end.appendChild(hr);
        end.appendChild(text);
        this.loadMoreTrigger.replaceWith(end);
        this.loadMoreTrigger = null;
        if (this.loadMoreObserver) {
            this.loadMoreObserver.disconnect();
            this.loadMoreObserver = null;
        }
    }

    renderRetryButton() {
        if (!this.loadMoreTrigger) return;
        this.loadMoreTrigger.innerHTML = '';
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'retry-button';
        btn.textContent = '載入失敗，點此重試';
        btn.addEventListener('click', () => {
            this.retryCount = 0;
            this.loadMoreTrigger.innerHTML = '';
            const spinner = document.createElement('div');
            spinner.className = 'trigger-spinner';
            spinner.setAttribute('aria-hidden', 'true');
            this.loadMoreTrigger.appendChild(spinner);
            this.loadMoreImages();
        });
        this.loadMoreTrigger.appendChild(btn);
    }

    confirmDeleteImage(imageId, element) {
        Swal.fire({
            title: '你確定要刪除嗎?',
            text: `你將要刪除 ID: ${imageId} 這張圖片`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: '是的，刪除它!',
            cancelButtonText: '取消',
        }).then((result) => {
            if (result.isConfirmed) {
                this.performDeleteImage(imageId, element);
            }
        });
    }

    async performDeleteImage(imageId, element) {
        const csrfToken = this.getCsrfToken();
        this.showLoading('刪除中...');
        try {
            const response = await fetch(`/api/image/${imageId}/`, {
                method: 'DELETE',
                headers: csrfToken ? { 'X-CSRFToken': csrfToken } : {},
            });
            if (!response.ok && response.status !== 204) {
                throw new Error(`HTTP ${response.status}`);
            }
            Swal.fire('已刪除!', '圖片已成功刪除。', 'success');
            element.classList.add('delete-animation');
            setTimeout(() => {
                element.remove();
                this.images = this.images.filter(img => img.id !== imageId);
            }, 300);
        } catch (err) {
            console.error('刪除圖片失敗:', err);
            Swal.fire('錯誤!', '刪除圖片失敗，請稍後再試。', 'error');
        } finally {
            this.hideLoading();
        }
    }

    setupInfiniteScroll() {
        if (!this.loadMoreTrigger) return;
        this.loadMoreObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !this.loading && this.hasMore) {
                    this.loadMoreImages();
                }
            });
        }, {
            root: null,
            rootMargin: PRELOAD_MARGIN,
            threshold: 0,
        });
        this.loadMoreObserver.observe(this.loadMoreTrigger);
    }

    setupBackToTop() {
        if (!this.backToTopBtn) return;

        let ticking = false;
        const onScroll = () => {
            if (ticking) return;
            ticking = true;
            setTimeout(() => {
                if (window.scrollY >= window.innerHeight) {
                    this.backToTopBtn.classList.add('show');
                } else {
                    this.backToTopBtn.classList.remove('show');
                }
                ticking = false;
            }, SCROLL_THROTTLE_MS);
        };
        window.addEventListener('scroll', onScroll, { passive: true });

        this.backToTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: prefersReducedMotion() ? 'auto' : 'smooth',
            });
        });
    }

    setupBeforeUnload() {
        window.addEventListener('beforeunload', () => {
            if (this.abortController) {
                this.abortController.abort();
            }
        });
    }
}

class Lightbox {
    constructor(gallery) {
        this.gallery = gallery;
        this.isOpen = false;
        this.currentIndex = -1;
        this.previousFocus = null;
        this.savedBodyOverflow = '';
        this.loadingNext = false;

        this.overlayEl = null;
        this.stageEl = null;
        this.imgEl = null;
        this.spinnerEl = null;
        this.errorEl = null;
        this.prevBtn = null;
        this.nextBtn = null;
        this.closeBtn = null;

        this._onKeydown = this.handleKeydown.bind(this);
    }

    open(index) {
        if (this.isOpen) return;
        const images = this.gallery.images;
        if (index < 0 || index >= images.length) return;

        this.previousFocus = document.activeElement;
        this.buildOverlay();
        this.isOpen = true;
        this.savedBodyOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', this._onKeydown);

        this.showImage(index);
        requestAnimationFrame(() => {
            if (this.closeBtn) this.closeBtn.focus();
        });
    }

    close() {
        if (!this.isOpen) return;
        this.isOpen = false;
        document.removeEventListener('keydown', this._onKeydown);
        document.body.style.overflow = this.savedBodyOverflow || '';
        if (this.overlayEl) {
            this.overlayEl.remove();
        }
        this.overlayEl = null;
        this.stageEl = null;
        this.imgEl = null;
        this.spinnerEl = null;
        this.errorEl = null;
        this.prevBtn = null;
        this.nextBtn = null;
        this.closeBtn = null;

        const focusBack = this.previousFocus;
        this.previousFocus = null;
        if (focusBack && typeof focusBack.focus === 'function') {
            focusBack.focus();
        }
    }

    buildOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'lightbox-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-label', '圖片檢視器');

        const stage = document.createElement('div');
        stage.className = 'lightbox-stage';

        const spinner = document.createElement('div');
        spinner.className = 'lightbox-spinner';
        spinner.setAttribute('aria-hidden', 'true');

        const img = document.createElement('img');
        img.className = 'lightbox-img';
        img.alt = '';

        const error = document.createElement('div');
        error.className = 'lightbox-error';
        error.hidden = true;

        const prevBtn = document.createElement('button');
        prevBtn.type = 'button';
        prevBtn.className = 'lightbox-nav lightbox-prev';
        prevBtn.setAttribute('aria-label', '上一張');
        prevBtn.textContent = '‹';

        const nextBtn = document.createElement('button');
        nextBtn.type = 'button';
        nextBtn.className = 'lightbox-nav lightbox-next';
        nextBtn.setAttribute('aria-label', '下一張');
        nextBtn.textContent = '›';

        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'lightbox-close';
        closeBtn.setAttribute('aria-label', '關閉');
        closeBtn.textContent = '×';

        prevBtn.addEventListener('click', (e) => { e.stopPropagation(); this.prev(); });
        nextBtn.addEventListener('click', (e) => { e.stopPropagation(); this.next(); });
        closeBtn.addEventListener('click', (e) => { e.stopPropagation(); this.close(); });
        img.addEventListener('click', (e) => { e.stopPropagation(); });
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) this.close();
        });

        stage.appendChild(spinner);
        stage.appendChild(img);
        stage.appendChild(error);
        overlay.appendChild(prevBtn);
        overlay.appendChild(stage);
        overlay.appendChild(nextBtn);
        overlay.appendChild(closeBtn);
        document.body.appendChild(overlay);

        this.overlayEl = overlay;
        this.stageEl = stage;
        this.imgEl = img;
        this.spinnerEl = spinner;
        this.errorEl = error;
        this.prevBtn = prevBtn;
        this.nextBtn = nextBtn;
        this.closeBtn = closeBtn;
    }

    showImage(index) {
        const images = this.gallery.images;
        if (!this.imgEl || index < 0 || index >= images.length) return;
        this.currentIndex = index;
        const image = images[index];
        const url = image.url || '';

        this.errorEl.hidden = true;
        this.errorEl.innerHTML = '';
        this.imgEl.classList.remove('loaded');
        this.imgEl.style.display = '';
        this.spinnerEl.style.display = '';
        this.imgEl.alt = `圖片 ${image.id}`;

        const token = Symbol('imgLoad');
        this._loadToken = token;

        const cleanup = () => {
            this.imgEl.removeEventListener('load', onLoad);
            this.imgEl.removeEventListener('error', onError);
        };
        const onLoad = () => {
            if (this._loadToken !== token) return;
            cleanup();
            if (!this.isOpen) return;
            this.spinnerEl.style.display = 'none';
            this.imgEl.classList.add('loaded');
        };
        const onError = () => {
            if (this._loadToken !== token) return;
            cleanup();
            if (!this.isOpen) return;
            this.spinnerEl.style.display = 'none';
            this.imgEl.style.display = 'none';
            this.errorEl.hidden = false;
            this.errorEl.textContent = '圖片無法顯示';
        };
        this.imgEl.addEventListener('load', onLoad);
        this.imgEl.addEventListener('error', onError);

        if (!url) {
            onError();
        } else {
            this.imgEl.src = url;
            // Cached image: load event may have fired before listener attached or
            // not fire at all in some browsers. Fall back to checking complete state.
            if (this.imgEl.complete) {
                if (this.imgEl.naturalWidth > 0) onLoad();
                else onError();
            }
        }

        this.updateNavButtons();
        this.preloadAdjacent(index);
    }

    updateNavButtons() {
        if (!this.prevBtn || !this.nextBtn) return;
        const images = this.gallery.images;
        const atStart = this.currentIndex <= 0;
        const atEnd = this.currentIndex >= images.length - 1;
        this.prevBtn.disabled = atStart;
        this.nextBtn.disabled = atEnd && !this.gallery.hasMore;
        this.setNextLoading(this.loadingNext);
    }

    setNextLoading(isLoading) {
        if (!this.nextBtn) return;
        this.loadingNext = isLoading;
        if (isLoading) {
            this.nextBtn.classList.add('is-loading');
            this.nextBtn.disabled = true;
        } else {
            this.nextBtn.classList.remove('is-loading');
        }
    }

    preloadAdjacent(index) {
        const images = this.gallery.images;
        [index - 1, index + 1].forEach((i) => {
            if (i < 0 || i >= images.length) return;
            const url = images[i] && images[i].url;
            if (!url) return;
            const preloader = new Image();
            preloader.src = url;
        });
    }

    prev() {
        if (this.currentIndex <= 0) return;
        this.showImage(this.currentIndex - 1);
    }

    async next() {
        if (this.loadingNext) return;
        const images = this.gallery.images;
        if (this.currentIndex < images.length - 1) {
            this.showImage(this.currentIndex + 1);
            return;
        }
        if (!this.gallery.hasMore) return;

        this.setNextLoading(true);
        const previousLength = images.length;
        let result;
        try {
            result = await this.gallery.loadMoreImages();
        } catch (err) {
            this.setNextLoading(false);
            this.showLoadMoreError();
            return;
        }
        if (!this.isOpen) return;
        this.setNextLoading(false);

        if (result && result.ok === false && !result.aborted) {
            this.showLoadMoreError();
            return;
        }
        const newImages = this.gallery.images;
        if (newImages.length > previousLength) {
            this.showImage(this.currentIndex + 1);
        } else {
            this.updateNavButtons();
        }
    }

    showLoadMoreError() {
        if (!this.errorEl) return;
        this.errorEl.hidden = false;
        this.errorEl.innerHTML = '';
        const text = document.createElement('p');
        text.textContent = '載入下一頁失敗';
        const retry = document.createElement('button');
        retry.type = 'button';
        retry.className = 'retry-button';
        retry.textContent = '重試';
        retry.addEventListener('click', (e) => {
            e.stopPropagation();
            this.errorEl.hidden = true;
            this.errorEl.innerHTML = '';
            this.next();
        });
        this.errorEl.appendChild(text);
        this.errorEl.appendChild(retry);
    }

    handleKeydown(e) {
        if (!this.isOpen) return;
        if (e.key === 'Escape') {
            e.preventDefault();
            this.close();
            return;
        }
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            this.prev();
            return;
        }
        if (e.key === 'ArrowRight') {
            e.preventDefault();
            this.next();
            return;
        }
        if (e.key === 'Tab') {
            this.handleFocusTrap(e);
        }
    }

    handleFocusTrap(e) {
        if (!this.overlayEl) return;
        const focusables = [this.prevBtn, this.nextBtn, this.closeBtn]
            .filter((el) => el && !el.disabled);
        if (focusables.length === 0) {
            e.preventDefault();
            return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement;
        const insideOverlay = this.overlayEl.contains(active);
        if (e.shiftKey) {
            if (!insideOverlay || active === first) {
                e.preventDefault();
                last.focus();
            }
        } else {
            if (!insideOverlay || active === last) {
                e.preventDefault();
                first.focus();
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (typeof Swal === 'undefined') {
        console.error('SweetAlert (Swal) 未載入，刪除功能將受影響');
    }
    if (document.getElementById('galleryGrid') && document.getElementById('loadMoreTrigger')) {
        new ImageGallery();
    } else {
        console.warn('ImageGallery 未初始化：找不到 galleryGrid 或 loadMoreTrigger');
    }
});
