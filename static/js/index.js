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
        await this.loadPage({ initial: true });
    }

    async loadMoreImages() {
        await this.loadPage({ initial: false });
    }

    async loadPage({ initial }) {
        if (this.loading || !this.hasMore) return;
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
                return;
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
        } catch (err) {
            if (err.name === 'AbortError') return;
            console.error('載入圖片失敗:', err);
            this.removeSkeletons(skeletons);
            this.renderRetryButton();
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
