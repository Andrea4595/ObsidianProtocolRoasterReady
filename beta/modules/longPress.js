let pressTimer;
let longPress = false;

const startPress = (callback) => {
    longPress = false;
    pressTimer = window.setTimeout(() => {
        longPress = true;
        callback();
    }, 500); // 500ms for long press
};

const cancelPress = () => {
    clearTimeout(pressTimer);
};

export function setupLongPress(element, callback, clickCallback) {
    element.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return; // Only for left click
        startPress(callback);
    });

    element.addEventListener('mouseup', (e) => {
        if (e.button !== 0) return;
        cancelPress();
        if (!longPress && clickCallback) {
            clickCallback(e);
        }
    });

    element.addEventListener('mouseleave', cancelPress);

    element.addEventListener('touchstart', (e) => {
        startPress(callback);
    }, { passive: true });

    element.addEventListener('touchend', () => {
        cancelPress();
        if (!longPress && clickCallback) {
            clickCallback();
        }
    });

    element.addEventListener('touchcancel', cancelPress);

    // Prevent context menu on long press
    element.addEventListener('contextmenu', (e) => {
        if (longPress) {
            e.preventDefault();
        }
    });
}
