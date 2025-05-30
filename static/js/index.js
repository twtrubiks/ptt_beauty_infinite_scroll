class ImageGallery {
    constructor() {
        this.images = [];
        this.loading = false;
        this.currentPage = 1;
        this.hasMore = true;
        this.loadMoreObserver = null;

        this.galleryGrid = document.getElementById('galleryGrid');
        this.loadingIndicator = document.getElementById('loadingIndicator'); // Global loading indicator
        this.loadingText = document.getElementById('loadingText');
        this.loadMoreTrigger = document.getElementById('loadMoreTrigger');

        if (!this.galleryGrid || !this.loadMoreTrigger) {
            console.error('Required HTML elements for ImageGallery (galleryGrid, loadMoreTrigger) are missing.');
            return;
        }
        // loadingIndicator and loadingText are optional if not found, but features might be limited.
        if (!this.loadingIndicator || !this.loadingText) {
            console.warn('Optional HTML elements for ImageGallery (loadingIndicator, loadingText) are missing. Global loading spinner will not function.');
        }


        this.init();
    }

    init() {
        this.setupInfiniteScroll();
        this.loadInitialImages();
    }

    getCsrfToken() {
        let csrfToken = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, 'csrftoken'.length + 1) === ('csrftoken=')) {
                    csrfToken = decodeURIComponent(cookie.substring('csrftoken'.length + 1));
                    break;
                }
            }
        }
        return csrfToken;
    }

    async fetchImages(page) {
        // Using existing jQuery AJAX call
        return new Promise((resolve, reject) => {
            $.ajax({
                url: '/api/image/randoms/',
                type: 'GET',
                data: { 'page': page },
                dataType: 'json',
                success: (data) => {
                    if (data && data.length === 0) {
                        this.hasMore = false; // API indicates no more images
                    }
                    resolve(data);
                },
                error: (jqXHR, textStatus, errorThrown) => {
                    console.error('Failed to fetch images:', textStatus, errorThrown);
                    this.hasMore = false; // Stop trying if there's an error
                    reject(errorThrown);
                }
            });
        });
    }

    showLoading(text = '載入中...') {
        console.log('showLoading called with:', text);
        if (this.loadingIndicator && this.loadingText) {
            this.loadingText.textContent = text;
            this.loadingIndicator.classList.add('show');
        }
    }

    hideLoading() {
        console.log('hideLoading called');
        if (this.loadingIndicator) {
            this.loadingIndicator.classList.remove('show');
        }
    }

    async loadInitialImages() {
        if (this.loading) return;
        this.loading = true;
        this.showLoading('載入中...');
        const startTime = Date.now(); // Record start time

        // Ensure initial text is set if there's potentially more to load
        if (this.hasMore && this.loadMoreTrigger) {
            this.loadMoreTrigger.textContent = '滾動載入更多';
        }

        try {
            const newImages = await this.fetchImages(this.currentPage);
            if (newImages && newImages.length > 0) {
                this.images = newImages;
                this.renderImages(newImages, true); // true to clear existing
                this.currentPage++;
            } else {
                this.hasMore = false;
                if (this.loadMoreTrigger) this.loadMoreTrigger.textContent = '沒有更多圖片了';
            }
        } catch (error) {
            console.error('載入初始圖片失敗:', error);
            if (this.loadMoreTrigger) this.loadMoreTrigger.textContent = '載入圖片失敗';
        } finally {
            const elapsedTime = Date.now() - startTime;
            const minDisplayTime = 800; // Minimum display time in milliseconds

            const hideLoaderAction = () => {
                this.loading = false;
                this.hideLoading();
            };

            if (elapsedTime < minDisplayTime) {
                setTimeout(hideLoaderAction, minDisplayTime - elapsedTime);
            } else {
                hideLoaderAction();
            }
        }
    }

    async loadMoreImages() {
        if (this.loading || !this.hasMore) return;

        this.loading = true;
        this.showLoading('載入更多圖片...');
        const startTime = Date.now(); // Record start time

        try {
            const newImages = await this.fetchImages(this.currentPage);
            if (newImages && newImages.length > 0) {
                this.images = [...this.images, ...newImages];
                this.renderImages(newImages); // Append new images
                this.currentPage++;
            } else {
                this.hasMore = false;
                if (this.loadMoreTrigger) this.loadMoreTrigger.textContent = '已載入所有圖片';
            }
        } catch (error) {
            console.error('載入更多圖片失敗:', error);
            if (this.loadMoreTrigger) this.loadMoreTrigger.textContent = '載入更多圖片失敗';
        } finally {
            const elapsedTime = Date.now() - startTime;
            const minDisplayTime = 800; // Minimum display time in milliseconds

            const hideLoaderAction = () => {
                this.loading = false;
                this.hideLoading();
            };

            if (elapsedTime < minDisplayTime) {
                setTimeout(hideLoaderAction, minDisplayTime - elapsedTime);
            } else {
                hideLoaderAction();
            }
        }
    }

    renderImages(imagesToRender, clearFirst = false) {
        if (clearFirst && this.galleryGrid) {
            this.galleryGrid.innerHTML = '';
        }
        imagesToRender.forEach((image, index) => {
            setTimeout(() => { // Stagger animation as in ref.html
                const imageElement = this.createImageElement(image);
                if (this.galleryGrid) this.galleryGrid.appendChild(imageElement);
            }, index * 100); // Stagger time
        });
    }

    createImageElement(image) {
        const div = document.createElement('div');
        div.className = 'image-item';
        div.dataset.imageId = image.id;

        const imageUrl = image.Url || 'placeholder.jpg'; // API field for image URL
        const imageTitle = image.title || `圖片 ${image.id}`;
        const imageAuthor = image.author || '未知作者'; // Assuming API might provide author

        div.innerHTML = `
            <div class="image-wrapper">
                <div class="image-loading"></div>
                <img src="${imageUrl}" alt="${imageTitle}" loading="lazy" style="opacity: 0;">
                <button class="delete-btn" title="刪除圖片">×</button>
            </div>
            <div class="image-info">
                <div class="image-title">${imageTitle}</div>
                <div class="image-id">ID: ${image.id} | ${imageAuthor}</div>
            </div>
        `;

        const img = div.querySelector('img');
        const loadingDiv = div.querySelector('.image-loading');

        img.onload = () => {
            img.style.opacity = '1';
            if (loadingDiv) loadingDiv.style.display = 'none';
        };
        img.onerror = () => {
            if (loadingDiv) {
                loadingDiv.innerHTML = '<div style="color: #999; font-size: 0.8em;">載入失敗</div>';
                // Keep loadingDiv visible to show error
            }
            img.style.opacity = '1'; // Show broken image icon or alt text
        };

        const deleteBtn = div.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.confirmDeleteImage(image.id, div); // Using existing confirm/delete logic
        });

        return div;
    }

    // Existing delete functionality with SweetAlert and AJAX
    confirmDeleteImage(imageId, element) {
        Swal.fire({
            title: "你確定要刪除嗎?",
            text: `你將要刪除 ID: ${imageId} 這張圖片`,
            icon: "warning", // SweetAlert2 uses 'icon' not 'type'
            showCancelButton: true,
            confirmButtonColor: "#d33", // Standard danger color
            cancelButtonColor: "#3085d6",
            confirmButtonText: "是的，刪除它!",
            cancelButtonText: "取消"
        }).then((result) => {
            if (result.isConfirmed) {
                this.performDeleteImage(imageId, element);
            }
        });
    }

    async performDeleteImage(imageId, element) {
        const csrfToken = this.getCsrfToken();
        this.showLoading('刪除中...'); // Show loading indicator for delete operation
        $.ajax({
            url: `/api/image/${imageId}/`,
            type: 'DELETE',
            headers: {
                'X-CSRFToken': csrfToken
            },
            success: () => {
                Swal.fire("已刪除!", "圖片已成功刪除。", "success");
                element.classList.add('delete-animation');
                setTimeout(() => {
                    element.remove();
                    this.images = this.images.filter(img => img.id !== imageId);
                }, 300);
            },
            error: (jqXHR, textStatus, errorThrown) => {
                console.error('刪除圖片失敗:', textStatus, errorThrown);
                Swal.fire("錯誤!", "刪除圖片失敗，請稍後再試。", "error");
            },
            complete: () => {
                this.hideLoading(); // Hide loading indicator after success or error
            }
        });
    }

    setupInfiniteScroll() {
        if (!this.loadMoreTrigger) return;

        this.loadMoreObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                console.log('IntersectionObserver entry:', entry.isIntersecting, 'loading:', this.loading, 'hasMore:', this.hasMore);
                if (entry.isIntersecting && !this.loading && this.hasMore) {
                    console.log('Triggering loadMoreImages...');
                    this.loadMoreImages();
                }
            });
        }, {
            threshold: 0.1 // Match ref.html options
        });

        this.loadMoreObserver.observe(this.loadMoreTrigger);
    }
}

$(document).ready(function() {
    // Check if the required elements are present before initializing
    if (document.getElementById('galleryGrid') && document.getElementById('loadMoreTrigger')) {
        // Ensure SweetAlert is loaded if it's a dependency for delete
        if (typeof Swal === 'undefined') {
            console.error('SweetAlert (Swal) is not loaded. Delete functionality will be affected.');
        }
        new ImageGallery();
    } else {
        console.warn("ImageGallery not initialized: galleryGrid or loadMoreTrigger not found.");
    }
});

