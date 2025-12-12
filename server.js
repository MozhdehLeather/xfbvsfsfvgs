const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

const PHOTOS_DIR = path.join(__dirname, 'photos');
const PORT = 2210;
const ADMIN_PASSWORD = "kk123";

app.use(express.json());
app.use(express.static('public')); // For serving static files

// Password check middleware
app.use((req, res, next) => {
    if (req.query.key !== ADMIN_PASSWORD && !req.path.includes('/login')) {
        return res.redirect(`/login?redirect=${encodeURIComponent(req.originalUrl)}`);
    }
    next();
});

// Login page
app.get('/login', (req, res) => {
    const redirectUrl = req.query.redirect || '/';
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>KK Photo Manager - Login</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    background: #0a0a0a;
                    color: #f5f5f5;
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                }
                .login-container {
                    background: #1a1a1a;
                    padding: 40px 30px;
                    border-radius: 20px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                    width: 100%;
                    max-width: 400px;
                    border: 1px solid #333;
                }
                h1 {
                    text-align: center;
                    margin-bottom: 30px;
                    font-size: 28px;
                    font-weight: 300;
                    letter-spacing: 2px;
                }
                .input-group {
                    margin-bottom: 25px;
                    position: relative;
                }
                input {
                    width: 100%;
                    padding: 15px;
                    background: #252525;
                    border: 1px solid #333;
                    border-radius: 10px;
                    color: #fff;
                    font-size: 16px;
                    transition: all 0.3s;
                }
                input:focus {
                    outline: none;
                    border-color: #666;
                    box-shadow: 0 0 0 2px rgba(255,255,255,0.1);
                }
                button {
                    width: 100%;
                    padding: 15px;
                    background: #333;
                    color: white;
                    border: none;
                    border-radius: 10px;
                    font-size: 16px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.3s;
                    letter-spacing: 1px;
                }
                button:hover {
                    background: #444;
                    transform: translateY(-1px);
                }
                .error {
                    color: #ff6b6b;
                    text-align: center;
                    margin-top: 15px;
                    font-size: 14px;
                }
            </style>
        </head>
        <body>
            <div class="login-container">
                <h1>KK PHOTO MANAGER</h1>
                <form id="loginForm" onsubmit="return handleLogin(event)">
                    <div class="input-group">
                        <input type="password" id="password" placeholder="Enter Access Key" required autofocus>
                    </div>
                    <button type="submit">ACCESS</button>
                </form>
                <div id="error" class="error"></div>
            </div>
            <script>
                function handleLogin(e) {
                    e.preventDefault();
                    const password = document.getElementById('password').value;
                    const redirectUrl = new URLSearchParams(window.location.search).get('redirect') || '/';
                    window.location.href = redirectUrl + (redirectUrl.includes('?') ? '&' : '?') + 'key=' + encodeURIComponent(password);
                    return false;
                }
                
                // Check for error in URL
                const urlParams = new URLSearchParams(window.location.search);
                if (urlParams.get('error')) {
                    document.getElementById('error').textContent = 'Invalid access key';
                }
            </script>
        </body>
        </html>
    `);
});

// Main gallery with improved UI
app.get('/', (req, res) => {
    try {
        const files = fs.readdirSync(PHOTOS_DIR);
        
        // Sort by modification time (newest first)
        files.sort((a, b) => {
            const statA = fs.statSync(path.join(PHOTOS_DIR, a));
            const statB = fs.statSync(path.join(PHOTOS_DIR, b));
            return statB.mtimeMs - statA.mtimeMs;
        });

        const fileCount = files.length;
        const totalSize = files.reduce((acc, file) => {
            const stats = fs.statSync(path.join(PHOTOS_DIR, file));
            return acc + stats.size;
        }, 0);
        const sizeInMB = (totalSize / (1024 * 1024)).toFixed(2);

        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                <title>KK Photo Manager</title>
                <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                        -webkit-tap-highlight-color: transparent;
                    }

                    :root {
                        --bg-primary: #0a0a0a;
                        --bg-secondary: #1a1a1a;
                        --bg-tertiary: #252525;
                        --border: #333;
                        --text-primary: #f5f5f5;
                        --text-secondary: #aaa;
                        --accent: #666;
                        --danger: #ff6b6b;
                        --success: #4CAF50;
                    }

                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
                        background: var(--bg-primary);
                        color: var(--text-primary);
                        min-height: 100vh;
                        overflow-x: hidden;
                        padding-bottom: 80px;
                    }

                    /* Header */
                    .header {
                        background: var(--bg-secondary);
                        padding: 20px;
                        border-bottom: 1px solid var(--border);
                        position: sticky;
                        top: 0;
                        z-index: 100;
                        backdrop-filter: blur(10px);
                        background: rgba(26, 26, 26, 0.95);
                    }

                    .header-content {
                        max-width: 1200px;
                        margin: 0 auto;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }

                    .logo {
                        display: flex;
                        align-items: center;
                        gap: 12px;
                    }

                    .logo-icon {
                        font-size: 24px;
                        color: var(--text-primary);
                    }

                    .logo-text {
                        font-size: 20px;
                        font-weight: 300;
                        letter-spacing: 1px;
                    }

                    .stats {
                        display: flex;
                        gap: 20px;
                        font-size: 14px;
                        color: var(--text-secondary);
                    }

                    .stat-item {
                        display: flex;
                        align-items: center;
                        gap: 6px;
                    }

                    /* Gallery Grid */
                    .gallery-container {
                        max-width: 1200px;
                        margin: 0 auto;
                        padding: 20px;
                    }

                    .empty-state {
                        text-align: center;
                        padding: 60px 20px;
                        color: var(--text-secondary);
                    }

                    .empty-state i {
                        font-size: 48px;
                        margin-bottom: 20px;
                        opacity: 0.5;
                    }

                    .grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
                        gap: 15px;
                        padding: 10px 0;
                    }

                    @media (max-width: 768px) {
                        .grid {
                            grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
                            gap: 12px;
                        }
                        
                        .stats {
                            display: none;
                        }
                    }

                    /* Image Card */
                    .image-card {
                        position: relative;
                        background: var(--bg-tertiary);
                        border-radius: 12px;
                        overflow: hidden;
                        aspect-ratio: 1;
                        cursor: pointer;
                        border: 1px solid var(--border);
                        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    }

                    .image-card:hover {
                        transform: translateY(-4px);
                        border-color: var(--accent);
                        box-shadow: 0 8px 25px rgba(0,0,0,0.3);
                    }

                    .image-card img {
                        width: 100%;
                        height: 100%;
                        object-fit: cover;
                        display: block;
                        transition: transform 0.5s ease;
                    }

                    .image-card:hover img {
                        transform: scale(1.05);
                    }

                    .image-overlay {
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: linear-gradient(to bottom, transparent 60%, rgba(0,0,0,0.8));
                        opacity: 0;
                        transition: opacity 0.3s;
                        display: flex;
                        align-items: flex-end;
                        justify-content: flex-end;
                        padding: 12px;
                    }

                    .image-card:hover .image-overlay {
                        opacity: 1;
                    }

                    .delete-btn {
                        background: var(--danger);
                        color: white;
                        border: none;
                        width: 36px;
                        height: 36px;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        cursor: pointer;
                        transition: all 0.3s;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                    }

                    .delete-btn:hover {
                        transform: scale(1.1);
                        background: #ff5252;
                    }

                    /* Modal */
                    .modal {
                        display: none;
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: rgba(0,0,0,0.95);
                        z-index: 1000;
                        align-items: center;
                        justify-content: center;
                        padding: 20px;
                    }

                    .modal-content {
                        position: relative;
                        max-width: 90vw;
                        max-height: 90vh;
                    }

                    .modal img {
                        max-width: 100%;
                        max-height: 90vh;
                        object-fit: contain;
                        border-radius: 8px;
                    }

                    .modal-close {
                        position: absolute;
                        top: -40px;
                        right: 0;
                        background: none;
                        border: none;
                        color: white;
                        font-size: 24px;
                        cursor: pointer;
                        opacity: 0.7;
                        transition: opacity 0.3s;
                    }

                    .modal-close:hover {
                        opacity: 1;
                    }

                    /* Toast Notification */
                    .toast {
                        position: fixed;
                        bottom: 20px;
                        left: 50%;
                        transform: translateX(-50%) translateY(100px);
                        background: var(--bg-secondary);
                        border: 1px solid var(--border);
                        padding: 16px 24px;
                        border-radius: 12px;
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        z-index: 1001;
                        opacity: 0;
                        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                        max-width: 90vw;
                    }

                    .toast.show {
                        opacity: 1;
                        transform: translateX(-50%) translateY(0);
                    }

                    .toast-icon {
                        font-size: 20px;
                    }

                    .toast.success .toast-icon {
                        color: var(--success);
                    }

                    .toast.error .toast-icon {
                        color: var(--danger);
                    }

                    /* Loading */
                    .loading {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        padding: 40px;
                        gap: 20px;
                    }

                    .spinner {
                        width: 40px;
                        height: 40px;
                        border: 3px solid var(--border);
                        border-top-color: var(--accent);
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                    }

                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }

                    /* Bottom Bar */
                    .bottom-bar {
                        position: fixed;
                        bottom: 0;
                        left: 0;
                        right: 0;
                        background: var(--bg-secondary);
                        border-top: 1px solid var(--border);
                        padding: 15px 20px;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        z-index: 99;
                    }

                    .footer-text {
                        font-size: 12px;
                        color: var(--text-secondary);
                    }

                    .refresh-btn {
                        background: var(--bg-tertiary);
                        border: 1px solid var(--border);
                        color: var(--text-primary);
                        padding: 10px 20px;
                        border-radius: 8px;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        transition: all 0.3s;
                    }

                    .refresh-btn:hover {
                        background: var(--accent);
                    }

                    /* Confirmation Dialog */
                    .confirm-dialog {
                        display: none;
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: rgba(0,0,0,0.8);
                        z-index: 1002;
                        align-items: center;
                        justify-content: center;
                        padding: 20px;
                    }

                    .confirm-content {
                        background: var(--bg-secondary);
                        padding: 30px;
                        border-radius: 16px;
                        max-width: 400px;
                        width: 100%;
                        border: 1px solid var(--border);
                    }

                    .confirm-title {
                        font-size: 20px;
                        margin-bottom: 15px;
                        color: var(--text-primary);
                    }

                    .confirm-message {
                        color: var(--text-secondary);
                        margin-bottom: 25px;
                        line-height: 1.5;
                    }

                    .confirm-buttons {
                        display: flex;
                        gap: 12px;
                        justify-content: flex-end;
                    }

                    .confirm-btn {
                        padding: 10px 24px;
                        border-radius: 8px;
                        border: 1px solid var(--border);
                        background: var(--bg-tertiary);
                        color: var(--text-primary);
                        cursor: pointer;
                        transition: all 0.3s;
                    }

                    .confirm-btn:hover {
                        background: var(--accent);
                    }

                    .confirm-btn.danger {
                        background: var(--danger);
                        border-color: var(--danger);
                    }

                    .confirm-btn.danger:hover {
                        background: #ff5252;
                    }

                    /* Selection Mode */
                    .selection-mode .image-card {
                        cursor: default;
                    }

                    .selection-mode .delete-btn {
                        display: none;
                    }

                    .checkbox-container {
                        position: absolute;
                        top: 12px;
                        left: 12px;
                        z-index: 2;
                    }

                    .custom-checkbox {
                        width: 24px;
                        height: 24px;
                        background: var(--bg-secondary);
                        border: 2px solid var(--border);
                        border-radius: 6px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        cursor: pointer;
                        transition: all 0.3s;
                    }

                    .custom-checkbox.checked {
                        background: var(--accent);
                        border-color: var(--accent);
                    }

                    .custom-checkbox i {
                        color: white;
                        font-size: 14px;
                        opacity: 0;
                        transition: opacity 0.3s;
                    }

                    .custom-checkbox.checked i {
                        opacity: 1;
                    }
                </style>
            </head>
            <body>
                <!-- Header -->
                <header class="header">
                    <div class="header-content">
                        <div class="logo">
                            <div class="logo-icon">📷</div>
                            <div class="logo-text">KK PHOTOS</div>
                        </div>
                        <div class="stats">
                            <div class="stat-item">
                                <i class="fas fa-images"></i>
                                <span>${fileCount} images</span>
                            </div>
                            <div class="stat-item">
                                <i class="fas fa-database"></i>
                                <span>${sizeInMB} MB</span>
                            </div>
                        </div>
                    </div>
                </header>

                <!-- Gallery -->
                <main class="gallery-container">
                    ${files.length === 0 ? `
                        <div class="empty-state">
                            <i class="fas fa-camera"></i>
                            <h2>No Photos Yet</h2>
                            <p>Upload photos to get started</p>
                        </div>
                    ` : `
                        <div class="grid" id="galleryGrid">
                            ${files.map(file => `
                                <div class="image-card" data-filename="${file}" onclick="viewImage('${file}')">
                                    <img 
                                        src="/img/${file}?key=${ADMIN_PASSWORD}&thumb=true" 
                                        loading="lazy"
                                        alt="${file}"
                                        onerror="this.src='data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\"><rect width=\"100\" height=\"100\" fill=\"%23252525\"/><text x=\"50\" y=\"50\" font-family=\"sans-serif\" font-size=\"10\" fill=\"%23666\" text-anchor=\"middle\" dy=\".3em\">Image</text></svg>'"
                                    >
                                    <div class="image-overlay">
                                        <button class="delete-btn" onclick="confirmDelete(event, '${file}')">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `}
                </main>

                <!-- Image Modal -->
                <div class="modal" id="imageModal" onclick="closeModal()">
                    <div class="modal-content" onclick="event.stopPropagation()">
                        <button class="modal-close" onclick="closeModal()">
                            <i class="fas fa-times"></i>
                        </button>
                        <img id="modalImage" src="" alt="">
                    </div>
                </div>

                <!-- Confirmation Dialog -->
                <div class="confirm-dialog" id="confirmDialog">
                    <div class="confirm-content">
                        <div class="confirm-title">
                            <i class="fas fa-exclamation-triangle"></i> Confirm Delete
                        </div>
                        <div class="confirm-message" id="confirmMessage">
                            Are you sure you want to delete this image?
                        </div>
                        <div class="confirm-buttons">
                            <button class="confirm-btn" onclick="hideConfirmDialog()">Cancel</button>
                            <button class="confirm-btn danger" onclick="performDelete()">Delete</button>
                        </div>
                    </div>
                </div>

                <!-- Toast Notification -->
                <div class="toast" id="toast">
                    <div class="toast-icon"></div>
                    <div class="toast-message"></div>
                </div>

                <!-- Bottom Bar -->
                <div class="bottom-bar">
                    <div class="footer-text">
                        © ${new Date().getFullYear()} KK Photo Manager
                    </div>
                    <button class="refresh-btn" onclick="refreshGallery()">
                        <i class="fas fa-redo"></i> Refresh
                    </button>
                </div>

                <script>
                    // GSAP Animations
                    gsap.registerEffect({
                        name: "fadeIn",
                        effect: (targets, config) => {
                            return gsap.from(targets, {
                                duration: config.duration || 0.6,
                                opacity: 0,
                                y: config.y || 20,
                                stagger: config.stagger || 0.1,
                                ease: "power2.out"
                            });
                        },
                        defaults: { duration: 0.6 }
                    });

                    gsap.registerEffect({
                        name: "shake",
                        effect: (targets) => {
                            return gsap.to(targets, {
                                duration: 0.5,
                                x: [0, 10, -10, 10, -10, 0],
                                ease: "power2.out"
                            });
                        }
                    });

                    // Initialize animations
                    document.addEventListener('DOMContentLoaded', () => {
                        // Animate cards on load
                        gsap.effects.fadeIn('.image-card', { stagger: 0.05 });
                        
                        // Animate stats
                        gsap.from('.stat-item', {
                            duration: 0.8,
                            opacity: 0,
                            y: 20,
                            stagger: 0.2,
                            delay: 0.3
                        });
                    });

                    // State variables
                    let currentDeleteFile = null;
                    let selectedImages = new Set();

                    // View image in modal
                    function viewImage(filename) {
                        const modal = document.getElementById('imageModal');
                        const modalImg = document.getElementById('modalImage');
                        
                        modalImg.src = \`/img/\${filename}?key=${ADMIN_PASSWORD}\`;
                        modal.style.display = 'flex';
                        
                        // Animate modal in
                        gsap.fromTo(modal,
                            { opacity: 0 },
                            { opacity: 1, duration: 0.3 }
                        );
                        
                        gsap.fromTo('.modal-content',
                            { scale: 0.8, opacity: 0 },
                            { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(1.7)" }
                        );
                    }

                    // Close modal
                    function closeModal() {
                        const modal = document.getElementById('imageModal');
                        gsap.to(modal, {
                            opacity: 0,
                            duration: 0.2,
                            onComplete: () => {
                                modal.style.display = 'none';
                            }
                        });
                    }

                    // Confirm delete
                    function confirmDelete(event, filename) {
                        event.stopPropagation();
                        currentDeleteFile = filename;
                        
                        const dialog = document.getElementById('confirmDialog');
                        const message = document.getElementById('confirmMessage');
                        
                        message.textContent = \`Are you sure you want to delete "\${filename}"?\`;
                        dialog.style.display = 'flex';
                        
                        // Animate dialog in
                        gsap.fromTo(dialog,
                            { opacity: 0 },
                            { opacity: 1, duration: 0.3 }
                        );
                        
                        gsap.fromTo('.confirm-content',
                            { y: 50, opacity: 0 },
                            { y: 0, opacity: 1, duration: 0.4, ease: "back.out(1.7)" }
                        );
                    }

                    // Hide confirmation dialog
                    function hideConfirmDialog() {
                        const dialog = document.getElementById('confirmDialog');
                        gsap.to(dialog, {
                            opacity: 0,
                            duration: 0.2,
                            onComplete: () => {
                                dialog.style.display = 'none';
                                currentDeleteFile = null;
                            }
                        });
                    }

                    // Perform delete
                    function performDelete() {
                        if (!currentDeleteFile) return;
                        
                        fetch(\`/delete?file=\${currentDeleteFile}&key=${ADMIN_PASSWORD}\`, {
                            method: 'DELETE'
                        })
                        .then(response => response.text())
                        .then(message => {
                            hideConfirmDialog();
                            showToast('success', \`Deleted: \${currentDeleteFile}\`);
                            
                            // Remove card with animation
                            const card = document.querySelector(\`[data-filename="\${currentDeleteFile}"]\`);
                            if (card) {
                                gsap.to(card, {
                                    opacity: 0,
                                    scale: 0.8,
                                    duration: 0.3,
                                    onComplete: () => {
                                        card.remove();
                                        // Refresh page if no images left
                                        if (document.querySelectorAll('.image-card').length === 0) {
                                            setTimeout(() => location.reload(), 500);
                                        }
                                    }
                                });
                            }
                        })
                        .catch(error => {
                            showToast('error', 'Failed to delete image');
                            console.error('Delete error:', error);
                        });
                    }

                    // Show toast notification
                    function showToast(type, message) {
                        const toast = document.getElementById('toast');
                        const icon = toast.querySelector('.toast-icon');
                        const messageEl = toast.querySelector('.toast-message');
                        
                        toast.className = 'toast ' + type;
                        icon.className = 'toast-icon fas ' + (type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle');
                        messageEl.textContent = message;
                        
                        toast.classList.add('show');
                        
                        // Animate in
                        gsap.fromTo(toast,
                            { y: 100, opacity: 0 },
                            { y: 0, opacity: 1, duration: 0.4, ease: "back.out(1.7)" }
                        );
                        
                        // Auto hide after 3 seconds
                        setTimeout(() => {
                            gsap.to(toast, {
                                y: 100,
                                opacity: 0,
                                duration: 0.3,
                                onComplete: () => toast.classList.remove('show')
                            });
                        }, 3000);
                    }

                    // Refresh gallery
                    function refreshGallery() {
                        const refreshBtn = document.querySelector('.refresh-btn');
                        const icon = refreshBtn.querySelector('i');
                        
                        // Animate refresh icon
                        gsap.to(icon, {
                            rotation: 360,
                            duration: 0.6,
                            ease: "power2.out",
                            onComplete: () => {
                                location.reload();
                            }
                        });
                    }

                    // Keyboard shortcuts
                    document.addEventListener('keydown', (e) => {
                        // Escape to close modal
                        if (e.key === 'Escape') {
                            closeModal();
                            hideConfirmDialog();
                        }
                        
                        // R to refresh
                        if (e.key === 'r' && !e.ctrlKey) {
                            refreshGallery();
                        }
                    });

                    // Handle image loading errors
                    document.addEventListener('error', (e) => {
                        if (e.target.tagName === 'IMG') {
                            e.target.style.backgroundColor = '#252525';
                            e.target.style.display = 'flex';
                            e.target.style.alignItems = 'center';
                            e.target.style.justifyContent = 'center';
                            e.target.innerHTML = '<i class="fas fa-image" style="font-size: 2em; color: #666;"></i>';
                        }
                    }, true);
                </script>
            </body>
            </html>
        `);
    } catch (error) {
        console.error('Error reading photos directory:', error);
        res.status(500).send(`
            <html>
            <body style="background:#0a0a0a;color:#f5f5f5;padding:40px;font-family:sans-serif;">
                <h1>Error</h1>
                <p>Unable to load photos. Please check the directory path.</p>
                <pre style="background:#1a1a1a;padding:20px;border-radius:8px;margin-top:20px;">${error.message}</pre>
            </body>
            </html>
        `);
    }
});

// Serve images with optional thumbnail support
app.get('/img/:file', (req, res) => {
    const filePath = path.join(PHOTOS_DIR, req.params.file);
    
    if (req.query.thumb) {
        // For thumbnail requests, we could implement image resizing here
        // For now, we'll just serve the original
        res.sendFile(filePath);
    } else {
        res.sendFile(filePath);
    }
});

// Update delete endpoint to use DELETE method
app.delete('/delete', (req, res) => {
    const file = req.query.file;
    const fullPath = path.join(PHOTOS_DIR, file);

    try {
        if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
            res.json({ success: true, message: `Deleted: ${file}` });
        } else {
            res.status(404).json({ success: false, message: 'File not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Fallback for GET delete (backward compatibility)
app.get('/delete', (req, res) => {
    const file = req.query.file;
    const fullPath = path.join(PHOTOS_DIR, file);

    if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        return res.send("Deleted: " + file);
    }
    res.status(404).send("File not found");
});

app.listen(PORT, () => {
    console.log(`📸 KK Photo Manager running on port ${PORT}`);
    console.log(`🔗 http://localhost:${PORT}`);
    console.log(`📁 Photos directory: ${PHOTOS_DIR}`);
});