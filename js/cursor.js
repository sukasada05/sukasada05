/**
 * CURSOR DUKOPS - SIAP PAKAI
 * Auto Detect Desktop & Android
 */

(function() {
    'use strict';
    
    // ========== DETEKSI ==========
    const isTouch = 'ontouchstart' in window || 
                    navigator.maxTouchPoints > 0 ||
                    window.matchMedia('(hover: none)').matches;
    
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isDesktop = !isTouch && !isAndroid;
    let downloadCursor = null;
    let lastTouchPosition = { x: 0, y: 0 };
    
    // ========== LOAD CURSOR (DESKTOP) ==========
    function loadCursors() {
        if (!isDesktop) return;
        
        const style = document.createElement('style');
        style.id = 'cursor-style';
        style.textContent = `
            :root {
                --cursor-default: url('../cursor/1.cur'), auto;
                --cursor-pointer: url('../cursor/2.cur'), pointer;
                --cursor-text: url('../cursor/7.cur'), text;
                --cursor-wait: wait;
                --cursor-progress: progress;
                --cursor-help: url('../cursor/8.cur'), help;
                --cursor-grab: grab;
                --cursor-grabbing: grabbing;
                --cursor-not-allowed: url('../cursor/10.cur'), not-allowed;
                --cursor-zoom-in: zoom-in;
            }
        `;
        document.head.appendChild(style);
    }
    
    // ========== TOUCH FEEDBACK (ANDROID) ==========
    function enableTouchFeedback() {
        if (!isTouch && !isAndroid) return;
        
        document.documentElement.classList.add('touch-device');

        downloadCursor = document.createElement('div');
        downloadCursor.className = 'download-cursor';
        downloadCursor.setAttribute('aria-hidden', 'true');
        downloadCursor.innerHTML = '<span class="download-cursor-ring"></span><img src="icons/favicon-96x96.png" alt="">';
        document.body.appendChild(downloadCursor);

        document.addEventListener('touchstart', function(e) {
            const touch = e.touches[0];
            if (touch) {
                lastTouchPosition = { x: touch.clientX, y: touch.clientY };
            }
        }, { passive: true });
        
        // Ripple effect
        document.querySelectorAll('button, .btn, [onclick], .nav-btn, .tab').forEach(el => {
            el.classList.add('ripple');
        });
        
        // Haptic vibrate untuk Android
        if (isAndroid && navigator.vibrate) {
            document.addEventListener('touchstart', function(e) {
                const target = e.target.closest('button, .btn, [onclick], a');
                if (target) {
                    navigator.vibrate(10);
                }
            }, { passive: true });
        }
    }
    
    // ========== FUNGSI GLOBAL ==========
    window.setCursor = function(element, type) {
        if (!isDesktop) return;
        
        const cursors = {
            'default': '1.cur',
            'pointer': '2.cur',
            'text': '7.cur',
            'wait': null,
            'progress': null,
            'help': '8.cur',
            'grab': null,
            'grabbing': null,
            'not-allowed': '10.cur',
            'zoom-in': null
        };
        const fallbackCursors = ['wait', 'progress', 'grab', 'grabbing', 'zoom-in'];
        
        const el = typeof element === 'string' ? document.querySelector(element) : element;
        if (el && cursors[type]) {
            el.style.cursor = `url('cursor/${cursors[type]}'), ${type}`;
        } else if (el && fallbackCursors.includes(type)) {
            el.style.cursor = type;
        }
    };
    
    window.resetCursor = function(element) {
        if (!isDesktop) return;
        const el = typeof element === 'string' ? document.querySelector(element) : element;
        if (el) {
            el.style.cursor = '';
        }
    };
    
    window.showLoading = function() {
        if (isDesktop) document.body.style.cursor = 'wait';
        document.body.classList.add('loading');
        if (downloadCursor && (isAndroid || isTouch)) {
            downloadCursor.style.left = `${lastTouchPosition.x}px`;
            downloadCursor.style.top = `${lastTouchPosition.y}px`;
            downloadCursor.classList.add('is-visible');
        }
    };
    
    window.hideLoading = function() {
        if (isDesktop) document.body.style.cursor = '';
        document.body.classList.remove('loading');
        if (downloadCursor) downloadCursor.classList.remove('is-visible');
    };
    
    // ========== INISIALISASI ==========
    function init() {
        loadCursors();
        enableTouchFeedback();
        
        // Export status
        window.isTouchDevice = isTouch;
        window.isAndroidDevice = isAndroid;
        window.isDesktopDevice = isDesktop;
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();